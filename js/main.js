// main.js — GameController: top-level orchestrator for Sensultra Enhanced
// Integrates all subsystems: Board, Renderer, UI, Battle, Economy, Character, Save
// ES Module

import { Board, ORB_TYPES } from './board.js';
import { GameRenderer } from './renderer.js';
import { UIManager } from './ui.js';
import { BattleManager } from './battle.js';
import { GameEconomy } from './economy.js';
import { Character } from './character.js';
import { SaveManager } from './save.js';
import { DialogueManager } from './dialogue.js';
import { AudioManager } from './audio.js';
import {
  CHARACTERS,
  STAGES,
  GACHA_POOLS,
  DAILY_MISSIONS as DAILY_QUESTS,   // data.js exports DAILY_MISSIONS
  ACTIVITY_NODES as ACTIVITY_REWARDS, // data.js exports ACTIVITY_NODES
  INTIMACY_LEVELS,
  DIALOGUES,
} from './data.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const INITIAL_FREE_GEMS   = 500;
const INITIAL_GOLD        = 10000;
const STARTER_CHAR_ID     = 'char_006'; // 蘇青 SR水屬性
const AUTO_SAVE_INTERVAL  = 30_000;     // 30 seconds
const ANIM_CLEAR          = 300;        // ms — orb clear animation
const ANIM_DROP           = 200;        // ms — orb drop/refill animation
const ANIM_COMBO          = 500;        // ms — combo display
const ANIM_ATTACK         = 400;        // ms — per-character attack
const ANIM_DAMAGE         = 300;        // ms — damage number display
const ANIM_ENEMY_TURN     = 500;        // ms — enemy attack animation

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

/**
 * Wait for a single animation frame (rAF-based delay shim).
 * Keeps animations in sync with the display refresh cycle.
 * @param {number} ms
 * @returns {Promise<void>}
 */
function waitFrames(ms) {
  return new Promise(resolve => {
    const start = performance.now();
    function tick(now) {
      if (now - start >= ms) {
        resolve();
      } else {
        requestAnimationFrame(tick);
      }
    }
    requestAnimationFrame(tick);
  });
}

/**
 * Show a brief toast notification via UIManager (if available).
 * Falls back to console.warn so nothing is ever silently swallowed.
 * @param {UIManager|null} ui
 * @param {string} msg
 * @param {'info'|'warn'|'error'} [level]
 */
function toast(ui, msg, level = 'info') {
  if (ui && typeof ui.showToast === 'function') {
    // Phase 10: pass type for colour coding; map level → type
    const typeMap = { info: 'info', warn: 'warn', error: 'error', success: 'success' };
    const type     = typeMap[level] ?? 'info';
    const duration = level === 'error' ? 4000 : level === 'warn' ? 3000 : 2500;
    ui.showToast(msg, duration, type);
  } else {
    console.warn('[Toast]', msg);
  }
}

// ---------------------------------------------------------------------------
// GameController
// ---------------------------------------------------------------------------

export class GameController {
  constructor() {
    this.canvas  = document.getElementById('game-canvas');
    this.renderer = new GameRenderer(this.canvas);
    this.ui       = new UIManager(document.getElementById('game-container'));

    /** @type {GameEconomy|null} */
    this.economy  = null;

    /** @type {Character[]} */
    this.ownedCharacters = [];

    /** @type {(Character|null)[]} — 5-slot active team */
    this.team = [null, null, null, null, null];

    /** @type {Board|null} */
    this.board   = null;

    /** @type {BattleManager|null} */
    this.battle  = null;

    this.progress = {
      clearedStages: new Set(),
      firstCleared:  new Set(),
    };

    /** @type {'HOME'|'BATTLE'|'GACHA'|'GACHA_RESULT'|'CHARACTERS'|'QUESTS'|'INTIMACY'} */
    this.state = 'HOME';

    /** Currently selected orb position { row, col } or null */
    this._selectedOrb    = null;

    /** rAF loop handle */
    this._rafId          = null;

    /** Auto-save interval ID */
    this._autoSaveId     = null;

    /** Prevent re-entrant battle animation sequences */
    this._animating      = false;

    /** Battle paused state (item 21) */
    this._paused         = false;

    /** New player flag for welcome dialogue (item 29) */
    this._isNewPlayer    = false;
    this._welcomeShown   = false;

    /** Last timestamp from rAF loop (for stamina delta calc) */
    this._lastTimestamp  = 0;

    /** Phase 8: FPS throttling for non-battle states */
    this._lastDrawTime   = 0;
    this._targetFps      = 60;  // default; adjusted per state

    /** Audio system */
    this.audio = new AudioManager();

    /** Dialogue system */
    this.dialogue = new DialogueManager(document.getElementById('game-container'));

    /** Track which triggerAfter dialogues have already played */
    this._playedDialogues = new Set();

    /**
     * Story progress state — persisted in save data.
     * Tracks which chapter/prologue milestones have been reached.
     */
    this._storyProgress = {
      prologueDone:    false,   // prologue_1 + prologue_2 fully played
      tutorialDone:    false,   // all 3 tutorial stages cleared
      chapter1Unlocked: false,  // prologue_3 done → chapter 1 open
      chapter1Complete: false,  // chapter1_end played
    };
  }

  // ---------------------------------------------------------------------------
  // Initialisation
  // ---------------------------------------------------------------------------

  /**
   * Entry point. Called once from index.html after DOM is ready.
   */
  async init() {
    // Item 20: show loading screen during init
    this.ui.showLoading('載入中…');

    const save = SaveManager.load();

    if (save) {
      this._loadFromSave(save);
    } else {
      this._newGame();
    }

    this._bindUIEvents();

    // Short delay so loading screen is visible, then transition to HOME
    await waitFrames(600);
    this.ui.hideLoading();
    this.navigateTo('HOME');

    // Item 29: show welcome dialogue for new players (flag set in _newGame)
    if (this._isNewPlayer && !this._welcomeShown) {
      this._welcomeShown = true;
      const starterName = this.team[0]?.name ?? '蘇青';
      this.ui.showModal(
        '歡迎來到超感穿梭！',
        `你好，旅行者！\n初始角色「${starterName}」已加入你的隊伍。\n準備好踏上超感之旅了嗎？`,
        (action) => {
          // After welcome modal is closed, show home first, then start prologue after 1s
          if (!this._playedDialogues.has('prologue_1')) {
            setTimeout(() => this._startPrologueSequence(), 1000);
          }
        },
        { confirmText: '出發！', hideCancel: true }
      );
    }

    // Auto-save every 30 s
    this._autoSaveId = SaveManager.startAutoSave(() => this.getGameState(), AUTO_SAVE_INTERVAL);

    // Start main loop
    this._rafId = requestAnimationFrame(ts => this._gameLoop(ts));

    console.info('[GameController] initialised');
  }

  // ---------------------------------------------------------------------------
  // Save / Load helpers
  // ---------------------------------------------------------------------------

  _newGame() {
    this.economy = new GameEconomy(null, undefined, this._buildEconomyPools());
    // Item 30: new game gives 4500 free gems (30 pulls worth)
    this.economy.freeGem = 4500;
    this.economy.gold    = INITIAL_GOLD;

    // Item 29: flag new player for welcome dialogue
    this._isNewPlayer = true;

    // Grant starter characters — 蘇青 SR水 + 艾理 SR火 + 葛林・尤 R木
    const starterData = CHARACTERS.find(c => c.id === STARTER_CHAR_ID);
    if (starterData) {
      const starter = new Character(starterData, 1, 1);
      this.ownedCharacters = [starter];
      this.team[0] = starter;
    }
    const airyData = CHARACTERS.find(c => c.id === 'char_005');
    if (airyData) {
      const airy = new Character(airyData, 1, 1);
      this.ownedCharacters.push(airy);
      this.team[1] = airy;
    }
    const glenData = CHARACTERS.find(c => c.id === 'char_009');
    if (glenData) {
      const glen = new Character(glenData, 1, 1);
      this.ownedCharacters.push(glen);
      this.team[2] = glen;
    }

    this.progress = { clearedStages: new Set(), firstCleared: new Set() };
    // Reset story progress for new game
    this._storyProgress = {
      prologueDone:     false,
      tutorialDone:     false,
      chapter1Unlocked: false,
      chapter1Complete: false,
    };
    this._playedDialogues = new Set();
    // Grant first-day login quest progress
    this.economy.checkQuest('dq_login', 1);
    console.info('[GameController] new game created');
  }

  _loadFromSave(save) {
    this.economy = new GameEconomy(save.economy ?? null, undefined, this._buildEconomyPools());

    this.ownedCharacters = (save.characters ?? []).map(data => {
      try {
        return Character.deserialize(data, CHARACTERS);
      } catch (err) {
        console.error('[GameController] failed to deserialize character', data, err);
        return null;
      }
    }).filter(Boolean);

    // Re-link team slots by charId
    this.team = (save.team ?? [null, null, null, null, null]).map(charId => {
      if (!charId) return null;
      return this.ownedCharacters.find(c => c.id === charId) ?? null;
    });

    this.progress = {
      clearedStages: new Set(save.progress?.clearedStages ?? []),
      firstCleared:  new Set(save.progress?.firstCleared  ?? []),
    };

    // Restore story progress from save
    const sp = save.storyProgress ?? {};
    this._storyProgress = {
      prologueDone:     sp.prologueDone     ?? false,
      tutorialDone:     sp.tutorialDone     ?? false,
      chapter1Unlocked: sp.chapter1Unlocked ?? false,
      chapter1Complete: sp.chapter1Complete ?? false,
    };
    this._playedDialogues = new Set(save.playedDialogues ?? []);

    // Migration: old saves created before dialogue system → mark prologue as done
    if (this.progress.clearedStages.size > 0 && !this._storyProgress.prologueDone) {
      this._storyProgress.prologueDone = true;
      this._storyProgress.tutorialDone = true;
      this._storyProgress.chapter1Unlocked = true;
      this._playedDialogues.add('prologue_1');
      this._playedDialogues.add('prologue_2');
      this._playedDialogues.add('prologue_3');
    }

    // Daily quest reset check
    const todayDate = new Date().toISOString().split('T')[0];
    if (save.lastLoginDate !== todayDate) {
      this.economy.initDailyQuests();
      // Grant login quest progress
      this.economy.checkQuest('dq_login', 1);
    }

    console.info('[GameController] save loaded');
  }

  /**
   * Serialise the full game state for persistence.
   * @returns {Object}
   */
  getGameState() {
    return {
      economy: this.economy.serialize(),
      characters: this.ownedCharacters.map(c => c.serialize()),
      team: this.team.map(c => c?.id ?? null),   // Character.id === _data.id
      progress: {
        clearedStages: [...this.progress.clearedStages],
        firstCleared:  [...this.progress.firstCleared],
      },
      storyProgress:    { ...this._storyProgress },
      playedDialogues:  [...this._playedDialogues],
      dailyQuestState:  this.economy.dailyQuests,
      lastLoginDate:    new Date().toISOString().split('T')[0],
    };
  }

  // ---------------------------------------------------------------------------
  // Game loop
  // ---------------------------------------------------------------------------

  /**
   * Main rAF loop. Handles stamina regen ticks, battle animation updates,
   * and screen rendering every frame.
   * @param {number} timestamp — DOMHighResTimeStamp from rAF
   */
  _gameLoop(timestamp) {
    const delta = timestamp - this._lastTimestamp;
    this._lastTimestamp = timestamp;

    // Stamina recovery: only check once per second to avoid per-frame calculations
    this._staminaAccum = (this._staminaAccum ?? 0) + delta;
    if (this._staminaAccum >= 1000) {
      this._staminaAccum = 0;
      this.economy?.updateStamina();
      // Item 11: live update stamina countdown on HOME screen
      if (this.state === 'HOME' && this.economy) {
        this.ui.update('home', {
          stamina:         this.economy.stamina,
          maxStamina:      this.economy.maxStamina,
          nextStaminaSecs: this.economy.getTimeToNextStamina(),
          freeGem:         this.economy.freeGem,
          gold:            this.economy.gold,
        });
      }
    }

    // Phase 8: Determine target FPS based on game state
    if (this.state === 'BATTLE') {
      // Animating = 60fps, waiting for input = 30fps
      this._targetFps = this._animating ? 60 : 30;
    } else {
      // Non-battle menus = 15fps
      this._targetFps = 15;
    }
    const minFrameMs = 1000 / this._targetFps;
    const shouldDraw = (timestamp - this._lastDrawTime) >= minFrameMs;
    if (shouldDraw) this._lastDrawTime = timestamp;

    // Render current screen
    if (shouldDraw && this.state === 'BATTLE' && this.board && this.battle && this.battle._battleStarted) {
      // Build display-friendly team/enemy data for renderer
      const ELEM_STR_TO_TYPE = { fire:'FIRE', water:'WATER', wood:'WOOD', light:'LIGHT', dark:'DARK' };
      // teamHp is the shared pool; distribute proportionally across members for display
      const teamHpRatio = this.battle.teamMaxHp > 0
        ? Math.max(0, Math.min(1, this.battle.teamHp / this.battle.teamMaxHp))
        : 0;
      const teamDisplay = this.battle.team.map(c => ({
        name:      c.name   ?? c.id,
        type:      (typeof c.element === 'string')
                     ? ELEM_STR_TO_TYPE[c.element] ?? 'FIRE'
                     : (['FIRE','WATER','WOOD','LIGHT','DARK'][c.element] ?? 'FIRE'),
        hp:        Math.round((c.maxHp ?? c.hp) * teamHpRatio),
        maxHp:     c.maxHp ?? c.hp,
        charge:    this.battle.chargeMap[c.id] ?? 0,
        maxCharge: c.chargeNeeded ?? 15,
        icon:      c._data?.icon ?? c.icon ?? null,
      }));
      const ELEM_NUM_TO_TYPE = ['FIRE','WATER','WOOD','LIGHT','DARK'];
      const enemyDisplay = this.battle.enemies.map(e => ({
        name:  e.name,
        type:  typeof e.element === 'string'
                 ? (ELEM_STR_TO_TYPE[e.element.toLowerCase()] ?? 'NORMAL')
                 : (ELEM_NUM_TO_TYPE[e.element] ?? 'NORMAL'),
        hp:    e.hp,
        maxHp: e.maxHp ?? e.hp,
      }));
      const selectedCell = this._selectedOrb
        ? [this._selectedOrb.row, this._selectedOrb.col]
        : null;

      this.renderer.clear();
      this.renderer.drawBackground();
      this.renderer.drawBattle(
        teamDisplay,
        enemyDisplay,
        this.battle.currentWave + 1,
        (this.battle.stage?.waves ?? []).length,
        this.battle.turn
      );
      this.renderer.drawBoard(this.board.grid, selectedCell);
      this.renderer.drawDamageNumbers([]);
    } else if (shouldDraw) {
      this.renderer.clear();
      this.renderer.drawBackground();
    }

    this._rafId = requestAnimationFrame(ts => this._gameLoop(ts));
  }

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  /**
   * Switch active screen and refresh the corresponding UI panel.
   * @param {'HOME'|'BATTLE'|'GACHA'|'GACHA_RESULT'|'CHARACTERS'|'QUESTS'|'INTIMACY'} screen
   * @param {Object} [params] — optional data passed to the screen (e.g. stageId, results)
   */
  navigateTo(screen, params = {}) {
    this.state = screen;

    // Hide canvas whenever we leave battle (canvas is only visible during battle)
    if (screen !== 'BATTLE') {
      this.canvas.style.display = 'none';
    }

    switch (screen) {
      case 'HOME':
        this.ui.setNavVisible(true);
        this.ui._setActiveNav('home');
        this.ui.showScreen('home');
        this.economy?.updateStamina(); // ensure stamina is up to date before display
        // Find the static data entry for the lead character to get portrait path
        const leadStaticData = this.team[0]
          ? CHARACTERS.find(c => c.id === this.team[0].id) ?? null
          : null;
        this.ui.update('home', {
          leadCharName:    this.team[0]?.name ?? '（無角色）',
          leadCharPortrait: leadStaticData?.portrait ?? null,
          leadCharColor:   this.team[0]
            ? ['#FF4444','#4488FF','#44BB44','#FFDD44','#AA44FF'][this.team[0].element] ?? '#888'
            : '#888',
          stamina:          this.economy?.stamina          ?? 0,
          maxStamina:       this.economy?.maxStamina       ?? 80,
          nextStaminaSecs:  this.economy?.getTimeToNextStamina() ?? 0,
          freeGem:    this.economy?.freeGem    ?? 0,
          gold:       this.economy?.gold       ?? 0,
        });
        break;

      case 'STAGES': {
        this.ui.setNavVisible(true);
        this.ui.showScreen('stages');
        const stageList = STAGES.map(s => ({
          ...s,
          area:       s.area,
          num:        s.id.split('_').pop(),
          stamina:    s.staminaCost,
          cleared:    this.progress.clearedStages.has(s.id),
          firstCleared: this.progress.firstCleared.has(s.id),
        }));
        this.ui.update('stages', { stages: stageList });
        break;
      }

      case 'GACHA':
        this.ui.setNavVisible(true);
        this.ui.showScreen('gacha');
        this.ui.update('gacha', {
          pity: this.economy.pityCounter,
          pool: 0,
        });
        break;

      case 'GACHA_RESULT':
        this.ui.setNavVisible(false);
        this.ui.showScreen('gacha');
        this.ui.update('gacha', { results: params.results ?? [] });
        break;

      case 'CHARACTERS':
        this.ui.setNavVisible(true);
        this.ui.showScreen('characters');
        this.ui.update('characters', {
          characters: this.ownedCharacters.map(c => {
            const stats = c.getStats();
            const rarity = ['N','R','SR','SSR'][c.rarity] ?? 'R';
            return {
              id:              c.id,
              name:            c.name,
              type:            ['FIRE','WATER','WOOD','LIGHT','DARK'][c.element] ?? 'FIRE',
              rarity,
              hp:              stats.hp,
              atk:             stats.atk,
              rcv:             stats.rcv,
              level:           c.level,
              // Normal attack
              skillNormalName: c._data?.skillNormal?.name ?? '—',
              // Super sense skill
              skillName:       c._data?.skillSpecial?.name ?? '—',
              skillDesc:       c._data?.skillSpecial?.name
                                 ? `${c._data.skillSpecial.name}（充能：${c._data.skillSpecial.chargeNeeded ?? 15} 回）`
                                 : '—',
              chargeNeeded:    c._data?.skillSpecial?.chargeNeeded ?? 15,
              // Leader skill
              leaderName:      c._data?.leaderSkill?.name ?? '—',
              leader:          c._data?.leaderSkill?.description ?? '—',
              // Intimacy
              intimacyLevel:   c.getIntimacyLevel?.() ?? 1,
              // Upgrade
              canUpgrade:      c.level < (c._data?.maxLevel ?? 50),
              portrait:        c._data?.portrait ?? null,
              icon:            c._data?.icon ?? null,
            };
          }),
        });
        break;

      case 'QUESTS':
        this.ui.setNavVisible(true);
        this.ui.showScreen('quests');
        this.ui.update('quests', {
          quests: this.economy.dailyQuests.map(q => ({
            ...q,
            current:    q.progress ?? 0,
            rewardIcon: '💎',
            rewardQty:  Object.values(q.reward ?? {})[0] ?? 0,
          })),
          activity:           this.economy.activityPoints,
          // Convert tier indices (1-5) to threshold values (20,40,60,80,100) for UI
          claimedThresholds:  this.economy.claimedActivityTiers.map(tier => tier * 20),
        });
        break;

      case 'INTIMACY':
        this.ui.setNavVisible(true);
        this.ui.showScreen('intimacy');
        this.ui.update('intimacy', {
          characters: this.ownedCharacters.map(c => ({
            id:           c.id,
            name:         c.name,
            type:         ['FIRE','WATER','WOOD','LIGHT','DARK'][c.element] ?? 'FIRE',
            intimacyLevel: c.getIntimacyLevel(),
            intimacyExp:  c.getIntimacyPoints(),
            intimacyMax:  100,
            greeting:     c.getDialogue(0) ?? '',
            portrait:     c._data?.portrait ?? null,
            icon:         c._data?.icon ?? null,
          })),
        });
        break;

      default:
        console.warn('[GameController] unknown screen:', screen);
    }
  }

  // ---------------------------------------------------------------------------
  // Battle
  // ---------------------------------------------------------------------------

  /**
   * Check stamina, initialise board and battle manager, switch to battle screen.
   * @param {string} stageId
   */
  startBattle(stageId) {
    const stageData = STAGES.find(s => s.id === stageId);
    if (!stageData) {
      toast(this.ui, `找不到關卡: ${stageId}`, 'error');
      return;
    }

    // Check for a triggerBefore dialogue — play it first, then launch battle
    const beforeDialogue = Object.values(DIALOGUES).find(
      d => d.triggerBefore === stageId && !this._playedDialogues.has(d.id)
    );
    if (beforeDialogue) {
      this._playedDialogues.add(beforeDialogue.id);
      this.dialogue.start(beforeDialogue, (result) => {
        // After dialogue ends (or triggers system action), proceed to battle
        if (!result || result.type !== 'trigger') {
          this.startBattle(stageId);
        }
        // If the dialogue itself has a system trigger (e.g. start_stage_X),
        // _handleDialogueTrigger will be called — but for triggerBefore we
        // still want to start battle after, so handle below:
        if (result?.type === 'trigger') {
          this._handleDialogueTrigger(result.trigger, stageId);
        }
      });
      return;
    }

    const cost = stageData.staminaCost ?? 10;
    if (!this.economy.useStamina(cost)) {
      // Item 24: show recovery countdown
      const secsLeft = this.economy.getTimeToNextStamina();
      const m = Math.floor(secsLeft / 60);
      const s = secsLeft % 60;
      const timeStr = secsLeft > 0 ? `（${m}:${String(s).padStart(2,'0')} 後回復 1 點）` : '';
      toast(this.ui, `體力不足！需要 ${cost} 點${timeStr}`, 'warn');
      return;
    }

    // Build team snapshot for BattleManager — filter out empty slots
    const activeTeam = this.team.filter(Boolean);
    if (activeTeam.length === 0) {
      toast(this.ui, '請先編隊！', 'warn');
      this.economy.addGems(cost, 'free'); // refund stamina (simple approach: just re-add)
      this.economy.stamina = Math.min(this.economy.maxStamina, this.economy.stamina + cost);
      return;
    }

    this.board  = new Board();
    const ELEMENT_NAMES = ['fire', 'water', 'wood', 'light', 'dark'];
    this.battle = new BattleManager(
      activeTeam.map(c => {
        const stats = c.getStats();
        return {
          id:           c.id,
          name:         c.name,
          element:      ELEMENT_NAMES[c.element] ?? 'fire',  // battle.js uses string elements
          hp:           stats.hp,
          maxHp:        stats.hp,
          atk:          stats.atk,
          rcv:          stats.rcv,
          chargeNeeded: c.chargeNeeded ?? 15,
          leaderSkill:  c._data?.leaderSkill ?? null,
          icon:         c._data?.icon ?? null,  // passed through for renderer
        };
      }),
      stageData
    );
    this.battle.startBattle();

    this._selectedOrb = null;
    this._animating   = false;

    // Set battle background based on stage area
    this.renderer.setBattleBackground(stageId, stageData.area ?? 1);

    // Preload team icon images so they are ready to draw from frame 1
    this.renderer.preloadTeamIcons(
      activeTeam.map(c => ({ icon: c._data?.icon ?? null }))
    );

    this.state = 'BATTLE';
    this.ui.setNavVisible(false);
    this.ui.showScreen('battle');

    // Move canvas into the battle-canvas-wrap div and make it visible
    const wrap = this.ui._battleCanvasWrap;
    if (wrap && !wrap.contains(this.canvas)) {
      wrap.appendChild(this.canvas);
    }
    this.canvas.style.display = 'block';

    this.ui.update('battle', {
      stageName:   stageData.name ?? '',
      staminaCost: stageData.staminaCost ?? 10,
      turn:        this.battle.turn ?? 1,
      team: activeTeam.map(c => ({
        charge:    this.battle.chargeMap[c.id] ?? 0,
        maxCharge: c.chargeNeeded ?? 15,
      })),
    });

    // Bind orb board clicks
    this.canvas.addEventListener('click', this._onCanvasClick);
  }

  /**
   * Handle click/tap on canvas during battle.
   * Stored as arrow function so removeEventListener works.
   */
  _onCanvasClick = (event) => {
    if (this.state !== 'BATTLE' || this._animating || this._paused) return;
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const cell = this.renderer.screenToBoard(x, y); // returns [row, col] or null
    if (!cell) return;
    const [row, col] = cell;
    this._onBoardClick(row, col);
  };

  /**
   * Orb selection and swap logic.
   * @param {number} row
   * @param {number} col
   */
  _onBoardClick(row, col) {
    if (!this.board || this._animating) return;

    if (!this._selectedOrb) {
      // First tap: select the orb
      this._selectedOrb = { row, col };
      this.audio.playSfx('button');
      // Visual highlight is handled by the canvas renderer (_selectedOrb is passed each frame)
      return;
    }

    const from = this._selectedOrb;
    this._selectedOrb = null;

    if (from.row === row && from.col === col) {
      // Tapped same cell — deselect
      return;
    }

    // Attempt swap — Board.trySwap validates adjacency and match existence
    const swapResult = this.board.trySwap(from.row, from.col, row, col);
    if (!swapResult.valid) {
      toast(this.ui, '只能交換相鄰的珠子', 'info');
      return;
    }

    // Kick off the full animation sequence
    this._runBattleAnimSequence();
  }

  /**
   * Full battle animation sequence after a swap.
   * Uses rAF-based waits to keep animations on-beat without blocking the loop.
   */
  async _runBattleAnimSequence() {
    if (this._animating) return;
    this._animating = true;

    try {
      let chainResult = null;
      let combo       = 0;

      // --- Chain loop: Board.resolveChain() internally calls findMatches+executeMatches+applyGravity ---
      // Peek at the first set of matches to trigger the match-effect particle burst,
      // then call resolveChain() which processes the full chain synchronously.
      const previewMatches = this.board.findMatches();
      if (previewMatches.length > 0) {
        // Item 1: trigger orb shrink-fade for matched cells (plain [row,col] tuples)
        const effectPositions = previewMatches.flatMap(m => m.positions.map(p => [p[0], p[1]]));
        this.renderer.startOrbFadeAnim(effectPositions, this.board.grid);
        // Item 9: pass element type for colored particles
        const ORB_TYPES_NAMES = ['FIRE','WATER','WOOD','LIGHT','DARK','HEART'];
        const positionsWithType = previewMatches.flatMap(m =>
          m.positions.map(([r, c]) => [r, c, ORB_TYPES_NAMES[m.type] ?? null])
        );
        this.renderer.drawMatchEffect(positionsWithType);
        // Play match sfx for the first match element type
        this.audio.playMatchSfx(previewMatches[0].type ?? 0);
      }

      const chainData = this.board.resolveChain();
      if (chainData && chainData.totalCombo > 0) {
        combo = chainData.totalCombo;
        chainResult = chainData;
        // Wait for clear animation
        await waitFrames(ANIM_CLEAR);
        // Item 2: trigger bounce-drop for all cells (newly filled orbs)
        const allCells = [];
        for (let r = 0; r < this.board.rows; r++) {
          for (let c = 0; c < this.board.cols; c++) {
            allCells.push([r, c]);
          }
        }
        this.renderer.startOrbBounceAnim(allCells);
        await waitFrames(ANIM_DROP);
      }

      if (!chainResult) {
        // No matches at all — just end the player turn silently
        this._animating = false;
        return;
      }

      // 3. Combo display via renderer
      if (combo >= 2) {
        this.renderer.drawCombo(combo, chainResult.comboMultiplier ?? 1);
        this.audio.playComboSfx(combo);
      }
      await waitFrames(ANIM_COMBO);

      // 4. Convert chainResult to BattleManager's expected format
      // BattleManager.processPlayerTurn expects: { matches: [{element, count}], totalCombo }
      const matchesForBattle = (chainResult.allMatches ?? []).map(m => {
        const elementNames = ['fire','water','wood','light','dark','heart'];
        return { element: elementNames[m.type] ?? 'fire', count: m.count };
      });
      const battleChainResult = { matches: matchesForBattle, totalCombo: chainResult.totalCombo };
      const turnResult = this.battle.processPlayerTurn(battleChainResult);

      // Quest tracking: orbs destroyed and combo count
      const totalOrbsDestroyed = Object.values(chainResult.orbsDestroyed ?? {}).reduce((s, v) => s + v, 0);
      if (totalOrbsDestroyed > 0) {
        this.economy.checkQuest('dq_orbs', totalOrbsDestroyed);
      }
      if (chainResult.totalCombo >= 10) {
        this.economy.checkQuest('dq_combo', 1);
      }
      // Track special skill usage
      if (turnResult.skillsCharged?.length > 0) {
        this.economy.checkQuest('dq_special', 1);
      }

      // Update skill button charge bars and turn counter in the DOM overlay
      this.ui.update('battle', {
        turn: this.battle.turn ?? 1,
        team: this.battle.team.map(c => ({
          charge:    this.battle.chargeMap[c.id] ?? 0,
          maxCharge: c.chargeNeeded ?? 15,
        })),
      });

      // Play heal sfx if heart orbs were matched
      if ((turnResult.heals ?? 0) > 0) {
        this.audio.playSfx('heal');
      }

      // 5. Show damage numbers via renderer (show one aggregated number per enemy hit)
      const damageByEnemy = new Map();
      for (const dmgEntry of turnResult.damages) {
        const prev = damageByEnemy.get(dmgEntry.target) ?? 0;
        damageByEnemy.set(dmgEntry.target, prev + dmgEntry.damage);
      }
      if (damageByEnemy.size > 0) {
        this.audio.playSfx('attack');
        await waitFrames(ANIM_ATTACK);
        let col = 0;
        const enemyCount = Math.max(1, damageByEnemy.size);
        for (const [target, dmgTotal] of damageByEnemy) {
          // Item 4: shake enemy on hit
          const enemyIdx = this.battle.enemies.indexOf(target);
          if (enemyIdx !== -1) this.renderer.shakeEnemy(enemyIdx);

          // Item 5: death animation if enemy HP reached 0
          if (target.hp <= 0 && enemyIdx !== -1) {
            this.renderer.killEnemy(enemyIdx);
          }

          const ex = this.renderer.battleArea.x + this.renderer.battleArea.width * ((col + 0.5) / enemyCount);
          this.renderer.addDamageNumbers([{
            x:        ex,
            y:        this.renderer.battleArea.y + 100,
            value:    dmgTotal,
            color:    '#FF4444',
            critical: false,
          }]);
          col++;
        }
        await waitFrames(ANIM_DAMAGE);
      }

      // Check wave end (advances wave or sets state to WIN)
      this.battle.checkWaveEnd();

      // Check if battle ended after player turn (WIN = all waves cleared, LOSE = team dead)
      const battleEndAfterPlayer = this.battle.checkBattleEnd();
      if (battleEndAfterPlayer) {
        await this._finishBattle();
        return;
      }

      // 7. Enemy turn — set state to ENEMY_TURN so BattleManager processes it
      this.battle.state = 'ENEMY_TURN';
      await waitFrames(ANIM_ENEMY_TURN);
      const enemyResult = this.battle.processEnemyTurn();
      // Show enemy damage to team as a damage number
      for (const atk of (enemyResult.attacks ?? [])) {
        this.renderer.addDamageNumbers([{
          x: this.renderer.battleArea.x + this.renderer.battleArea.width / 2,
          y: this.renderer.battleArea.y + this.renderer.battleArea.height - 120,
          value: atk.damage,
          color: '#FF8800',
          critical: false,
        }]);
      }
      await waitFrames(ANIM_ENEMY_TURN);

      // Update battle end state (teamHp check)
      const postEnemyEnd = this.battle.checkBattleEnd();

      // Check if battle ended after enemy turn
      if (postEnemyEnd === 'WIN' || postEnemyEnd === 'LOSE') {
        await this._finishBattle();
        return;
      }

      // 8. Back to player turn
      this.battle.state = 'PLAYER_TURN';

    } catch (err) {
      console.error('[GameController] battle animation error:', err);
    } finally {
      this._animating = false;
    }
  }

  /**
   * Handle win/lose state at the end of a battle sequence.
   */
  async _finishBattle() {
    this.canvas.removeEventListener('click', this._onCanvasClick);

    if (this.battle.state === 'WIN') {
      await this._processBattleResult({ won: true });
    } else {
      await this._processBattleResult({ won: false });
    }
  }

  /**
   * Apply rewards, update progress, and show the result screen.
   * @param {{ won: boolean }} result
   */
  async _processBattleResult({ won }) {
    const stageData = this.battle?.stage;
    // Save stageId before clearing battle state so retry can use it
    this._lastBattleStageId = stageData?.id ?? null;

    if (won && stageData) {
      const stageId = stageData.id;
      const isFirst = !this.progress.clearedStages.has(stageId);

      this.progress.clearedStages.add(stageId);
      if (isFirst) this.progress.firstCleared.add(stageId);

      // Apply base rewards (data.js uses freeGem and firstClearGem, not gems)
      const rewards = stageData.rewards ?? {};
      if (rewards.gold)    this.economy.addGold(rewards.gold);
      if (rewards.freeGem) this.economy.addGems(rewards.freeGem, 'free');

      // First-clear gem bonus
      if (isFirst && rewards.firstClearGem) {
        this.economy.addGems(rewards.firstClearGem, 'free');
      }

      // Item 22: Grant battle EXP to team members, show level-up toast if levelled
      const expGain = rewards.exp ?? 100;
      for (const c of this.team.filter(Boolean)) {
        const lvResult = c.gainExp(expGain);
        if (lvResult.levelAfter > lvResult.levelBefore) {
          toast(this.ui, `${c.name} 升至 Lv${lvResult.levelAfter}！`, 'info');
        }
      }

      // Quest progress
      this.economy.checkQuest('dq_battles', 1);
      this.economy.checkQuest('dq_stamina', stageData.staminaCost ?? 10);

      // Item 27: intimacy +2 per carried character per battle
      for (const c of this.team.filter(Boolean)) {
        const owned = this.ownedCharacters.find(oc => oc.id === c.id);
        if (owned) owned.addIntimacy(2);
      }

      // Build reward list for result panel
      const rewardList = [];
      if (rewards.gold)  rewardList.push({ icon: '🪙', name: '金幣',   qty: rewards.gold });
      if (rewards.exp)   rewardList.push({ icon: '⭐', name: '經驗值', qty: rewards.exp });
      if (rewards.freeGem) rewardList.push({ icon: '💎', name: '魔法石', qty: rewards.freeGem });
      if (isFirst && rewards.firstClearGem) {
        rewardList.push({ icon: '🎁', name: '初通獎勵', qty: rewards.firstClearGem });
      }

      // Item 10: victory celebration stars
      this.renderer.startVictory();
      this.audio.playSfx('victory');

      // Item 28: auto-save on battle victory
      SaveManager.save(this.getGameState());

      this.ui.update('battle', {
        showResult: true,
        result: { win: true, stars: 3, rewards: rewardList },
      });

    } else {
      this.audio.playSfx('defeat');
      this.ui.update('battle', {
        showResult: true,
        result: { win: false, stars: 0, rewards: [] },
      });
    }

    // Clean up battle state but keep canvas visible so result panel can be seen
    this.board  = null;
    this.battle = null;
    this.state  = 'BATTLE_RESULT'; // Prevent game loop from rendering battle scene

    // Check for triggerAfter dialogues and tutorial completion (only on win)
    if (won && stageData) {
      const stageId = stageData.id;

      // Tutorial completion check — after any tutorial stage win
      if (stageData.isTutorial) {
        // Delay so victory screen shows first, then check tutorial completion
        setTimeout(() => this._checkTutorialComplete(), 1200);
        return;
      }

      // triggerAfter dialogue check for non-tutorial stages
      const afterDialogue = Object.values(DIALOGUES).find(
        d => d.triggerAfter === stageId && !this._playedDialogues.has(d.id)
      );
      if (afterDialogue) {
        this._playedDialogues.add(afterDialogue.id);
        // Delay slightly so victory screen renders first
        setTimeout(() => {
          this.dialogue.start(afterDialogue, (result) => {
            if (result?.type === 'trigger') {
              this._handleDialogueTrigger(result.trigger, null);
            } else if (result?.type === 'jump') {
              this.playDialogue(result.target);
            }
          });
        }, 800);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Gacha
  // ---------------------------------------------------------------------------

  /**
   * Perform a gacha pull and integrate results into the roster.
   * @param {string} poolId — e.g. 'standard' | 'limited'
   * @param {1|10}   count
   */
  doPull(poolId, count) {
    const rawResults = count === 10
      ? this.economy.pullTen(poolId)
      : [this.economy.pullSingle(poolId)];

    if (!rawResults || rawResults.some(r => r === null)) {
      toast(this.ui, '魔法石不足，無法進行抽卡', 'warn');
      return;
    }

    // Filter characters by rarity for random selection
    const charsByRarity = {
      SSR: CHARACTERS.filter(c => c.rarity === 3),
      SR:  CHARACTERS.filter(c => c.rarity === 2),
      R:   CHARACTERS.filter(c => c.rarity === 1),
      N:   CHARACTERS.filter(c => c.rarity === 0),
    };

    const displayResults = rawResults.map(result => {
      // Map economy charId to a real CHARACTERS entry
      // Economy generates synthetic IDs; we resolve to a random char of the correct rarity
      let charData = CHARACTERS.find(c => c.id === result.charId);
      if (!charData) {
        // Pick a random real character of the correct rarity
        const pool = charsByRarity[result.rarity] ?? charsByRarity.R;
        charData = pool[Math.floor(Math.random() * pool.length)] ?? CHARACTERS[0];
      }

      const resolvedCharId = charData.id;
      const alreadyOwned = this.ownedCharacters.find(c => c.id === resolvedCharId);
      let isDuplicate = false;

      if (alreadyOwned) {
        // Item 25: convert duplicate to character fragments (10 = 1 star up material)
        const fragCount = charData.rarity === 3 ? 5 : charData.rarity === 2 ? 3 : 1;
        const prevFrags = this.economy.charFragments[resolvedCharId] ?? 0;
        this.economy.charFragments[resolvedCharId] = prevFrags + fragCount;
        // Check if enough for star upgrade (10 fragments)
        if (this.economy.charFragments[resolvedCharId] >= 10) {
          this.economy.charFragments[resolvedCharId] -= 10;
          alreadyOwned.upgradeStar();
          toast(this.ui, `${charData.name} 碎片達 10 個，星級提升！`, 'info');
        }
        isDuplicate = true;
      } else {
        const newChar = new Character(charData, 1, 1);
        this.ownedCharacters = [...this.ownedCharacters, newChar];
      }

      const fragCount = isDuplicate
        ? (charData.rarity === 3 ? 5 : charData.rarity === 2 ? 3 : 1)
        : 0;
      return {
        ...result,
        charId: resolvedCharId,
        isDuplicate,
        charData,
        name:      charData.name,
        type:      ['FIRE','WATER','WOOD','LIGHT','DARK'][charData.element] ?? 'FIRE',
        rarity:    ['N','R','SR','SSR'][charData.rarity] ?? 'R',
        isNew:     !isDuplicate,
        fragCount,
        portrait:  charData.portrait ?? null,
        icon:      charData.icon ?? null,
      };
    });

    // Gacha draw sound (low-pitch combo sfx)
    this.audio.playSfx('combo', 0.8);

    // No dedicated gacha quest in daily quest defs — no-op here
    this.navigateTo('GACHA_RESULT', { results: displayResults });
  }

  // ---------------------------------------------------------------------------
  // Intimacy
  // ---------------------------------------------------------------------------

  /**
   * Trigger an intimacy dialogue scene for the given character.
   * @param {string} charId
   */
  doIntimacy(charId) {
    const char = this.ownedCharacters.find(c => c.id === charId);
    if (!char) {
      toast(this.ui, '找不到該角色', 'error');
      return;
    }

    const intimacyResult = char.addIntimacy(10);

    // Quest progress
    this.economy.checkQuest('dq_intimacy', 1);

    const dialogues = char._data?.intimacyDialogues ?? [];
    const lineIndex = Math.min(intimacyResult.levelAfter - 1, dialogues.length - 1);
    const dialogue  = dialogues[lineIndex] ?? '';

    // Open the interact panel directly via the intimacy screen's internal method
    this.ui.openIntimacyScene({
      id:           char.id,
      name:         char.name,
      type:         ['FIRE','WATER','WOOD','LIGHT','DARK'][char.element] ?? 'FIRE',
      intimacyLevel: intimacyResult.levelAfter,
      intimacyExp:  char.getIntimacyPoints(),
      intimacyMax:  100,
      greeting:     dialogue,
      portrait:     char._data?.portrait ?? null,
      icon:         char._data?.icon ?? null,
    });

    // Refresh the intimacy list to reflect updated progress bars
    this.ui.update('intimacy', {
      characters: this.ownedCharacters.map(c => ({
        id:           c.id,
        name:         c.name,
        type:         ['FIRE','WATER','WOOD','LIGHT','DARK'][c.element] ?? 'FIRE',
        intimacyLevel: c.getIntimacyLevel(),
        intimacyExp:  c.getIntimacyPoints(),
        intimacyMax:  100,
        greeting:     c.getDialogue(0) ?? '',
        portrait:     c._data?.portrait ?? null,
        icon:         c._data?.icon ?? null,
      })),
    });
  }

  // ---------------------------------------------------------------------------
  // Character management
  // ---------------------------------------------------------------------------

  /**
   * Upgrade a character using EXP materials and gold.
   * @param {string} charId
   * @param {number} expAmount — EXP to grant
   */
  upgradeCharacter(charId, expAmount) {
    const char = this.ownedCharacters.find(c => c.id === charId);
    if (!char) return;

    const goldCost = expAmount; // 1 gold per 1 EXP (simple formula)
    if (!this.economy.spendGold(goldCost)) {
      toast(this.ui, `金幣不足，需要 ${goldCost} 金`, 'warn');
      return;
    }

    const result = char.gainExp(expAmount);
    this.economy.checkQuest('dq_enhance', 1);

    // Level-up sound (high-pitch victory sfx)
    this.audio.playSfx('victory', 1.2);
    toast(this.ui, `${char.name} 升至 Lv${result.levelAfter}！`, 'info');
    this.navigateTo('CHARACTERS');
  }

  /**
   * Claim a daily quest reward.
   * @param {string} questId
   */
  claimReward(questId) {
    const result = this.economy.claimQuestReward(questId);
    if (!result) {
      toast(this.ui, '任務尚未完成或已領取', 'warn');
      return;
    }
    const rewardText = Object.entries(result.reward)
      .map(([k, v]) => `${k}×${v}`)
      .join('、');
    toast(this.ui, `領取成功：${rewardText}`, 'info');
    this.navigateTo('QUESTS');
  }

  /**
   * Claim an activity point tier reward.
   * @param {number} tier — 1-based
   */
  claimActivityReward(tier) {
    const result = this.economy.claimActivityReward(tier);
    if (!result) {
      toast(this.ui, '活躍度不足或已領取', 'warn');
      return;
    }
    const rewardText = Object.entries(result.reward)
      .map(([k, v]) => `${k}×${v}`)
      .join('、');
    toast(this.ui, `活躍度獎勵領取：${rewardText}`, 'info');
    this.navigateTo('QUESTS');
  }

  /**
   * Update the active team composition.
   * @param {number}       slot   — 0-4
   * @param {string|null}  charId — null to clear the slot
   */
  setTeamSlot(slot, charId) {
    if (slot < 0 || slot > 4) return;

    if (!charId) {
      this.team = this.team.map((c, i) => i === slot ? null : c);
      return;
    }

    const char = this.ownedCharacters.find(c => c.id === charId);
    if (!char) return;

    // Prevent duplicates in team
    const existingSlot = this.team.findIndex(c => c?.id === charId);
    if (existingSlot !== -1 && existingSlot !== slot) {
      this.team = this.team.map((c, i) => {
        if (i === slot)          return char;
        if (i === existingSlot)  return null;
        return c;
      });
    } else {
      this.team = this.team.map((c, i) => i === slot ? char : c);
    }
  }

  // ---------------------------------------------------------------------------
  // UI event binding
  // ---------------------------------------------------------------------------

  /**
   * Wire all UI callbacks to GameController methods.
   * UIManager._emit(event, data) is called internally; we use ui.on(event, handler) to listen.
   */
  _bindUIEvents() {
    // Audio mute toggle from home screen button
    this.ui.on('audio:toggleMute', () => {
      const muted = this.audio.toggleMute();
      // Update the mute button icon via UIManager helper
      if (this.ui._muteBtnEl) {
        this.ui._muteBtnEl.textContent = muted ? '🔇' : '🔊';
      }
    });

    // Navigation bar clicks → navigate to corresponding screen
    this.ui.on('nav:home',       () => { this.audio.playSfx('button'); this.navigateTo('HOME'); });
    this.ui.on('nav:characters', () => { this.audio.playSfx('button'); this.navigateTo('CHARACTERS'); });
    this.ui.on('nav:gacha',      () => { this.audio.playSfx('button'); this.navigateTo('GACHA'); });
    this.ui.on('nav:quests',     () => { this.audio.playSfx('button'); this.navigateTo('QUESTS'); });
    this.ui.on('nav:intimacy',   () => { this.audio.playSfx('button'); this.navigateTo('INTIMACY'); });

    // Home screen buttons
    this.ui.on('nav:stages', () => this.navigateTo('STAGES'));
    this.ui.on('nav:team',   () => {
      this.ui.showScreen('team');
      this.ui.update('team', {
        team: this.team.map(c => c ? {
          name:    c.name,
          type:    ['FIRE','WATER','WOOD','LIGHT','DARK'][c.element] ?? 'FIRE',
          icon:    c._data?.icon ?? null,
          portrait: c._data?.portrait ?? null,
        } : null),
        characters: this.ownedCharacters.map(c => ({
          id:      c.id,
          name:    c.name,
          type:    ['FIRE','WATER','WOOD','LIGHT','DARK'][c.element] ?? 'FIRE',
          rarity:  ['N','R','SR','SSR'][c.rarity] ?? 'R',
          icon:    c._data?.icon ?? null,
          portrait: c._data?.portrait ?? null,
        })),
      });
    });

    // Stage start
    this.ui.on('stage:start', ({ stage }) => {
      if (stage?.id) this.startBattle(stage.id);
    });

    // Gacha pull: pool 0 = 'standard', pool 1 = 'limited'
    this.ui.on('gacha:pull', ({ pool, count }) => {
      const poolId = pool === 1 ? 'limited' : 'standard';
      this.doPull(poolId, count);
    });

    // Quest reward claim
    this.ui.on('quest:claim', ({ id }) => this.claimReward(id));

    // Intimacy: clicking the "互動" button triggers point gain + dialogue
    this.ui.on('intimacy:interact', ({ char }) => {
      if (char?.id) this.doIntimacy(char.id);
    });

    // Intimacy choice: selecting a dialogue option also grants bonus points
    this.ui.on('intimacy:choice', ({ char }) => {
      if (char?.id) {
        const c = this.ownedCharacters.find(ch => ch.id === char.id);
        if (c) {
          c.addIntimacy(5); // +5 bonus for engaging with a dialogue choice
          this.economy.checkQuest('dq_intimacy', 1);
        }
      }
    });

    // Team editing
    this.ui.on('team:slotClick', ({ index }) => {
      // Show available characters for the clicked slot
      this._pendingTeamSlot = index;
    });
    this.ui.on('team:pickChar', ({ char }) => {
      if (!char?.id) return;
      // If char is already in team, remove them
      const existingIdx = this.team.findIndex(c => c?.id === char.id);
      if (existingIdx !== -1) {
        this.setTeamSlot(existingIdx, null);
        this._pendingTeamSlot = undefined;
        this.ui._emit('nav:team', {});
        return;
      }
      // Use pending slot if set, otherwise find first empty slot
      let targetSlot = this._pendingTeamSlot;
      if (targetSlot === undefined || targetSlot === null) {
        targetSlot = this.team.findIndex(c => c === null);
      }
      if (targetSlot === -1 || targetSlot === undefined) {
        toast(this.ui, '隊伍已滿（5/5），請先移除一名成員', 'warn');
        return;
      }
      this.setTeamSlot(targetSlot, char.id);
      this._pendingTeamSlot = undefined;
      this.ui._emit('nav:team', {});
    });
    // Item 13: remove character from slot by clicking filled slot
    this.ui.on('team:removeChar', ({ index }) => {
      this.setTeamSlot(index, null);
      this._pendingTeamSlot = undefined;
      this.ui._emit('nav:team', {});
    });
    this.ui.on('team:confirm', () => this.navigateTo('HOME'));

    // Battle events
    this.ui.on('battle:exit',  () => {
      this.board  = null;
      this.battle = null;
      this.navigateTo('HOME');
    });
    this.ui.on('battle:retry', () => {
      const stageId = this._lastBattleStageId ?? this.battle?.stage?.id;
      this.board  = null;
      this.battle = null;
      this.canvas.removeEventListener('click', this._onCanvasClick);
      this.navigateTo('HOME');
      if (stageId) this.startBattle(stageId);
    });
    // Item 21: wire pause/resume properly
    this.ui.on('battle:pause', () => {
      this._paused = true;
      this.ui.update('battle', { showPause: true });
    });
    this.ui.on('battle:resume', () => {
      this._paused = false;
      this.ui.update('battle', { showPause: false });
    });
    this.ui.on('battle:skill', ({ index }) => {
      const char = this.team.filter(Boolean)[index];
      if (char && this.battle?.triggerSpecial(char.id)) {
        this.economy.checkQuest('dq_special', 1);
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Economy pool adapter
  // ---------------------------------------------------------------------------

  /**
   * Convert data.js GACHA_POOLS structure to the format GameEconomy expects:
   * { [poolId]: { featured: boolean, featuredCharId: string|null } }
   */
  _buildEconomyPools() {
    const result = {};
    for (const [id, pool] of Object.entries(GACHA_POOLS)) {
      // data.js: { featured: 'char_001', ... } for limited pool (string = featured char id)
      //          { name, characters, rates } for standard pool (no featured key)
      const hasFeatured = typeof pool.featured === 'string';
      result[id] = {
        featured:       hasFeatured,
        featuredCharId: hasFeatured ? pool.featured : null,
      };
    }
    return result;
  }

  // ---------------------------------------------------------------------------
  // Dialogue helpers
  // ---------------------------------------------------------------------------

  /**
   * Play a dialogue by id from the DIALOGUES map.
   * onDone is called with the result when the dialogue finishes.
   * @param {string}   dialogueId
   * @param {Function} [onDone]
   */
  playDialogue(dialogueId, onDone = null) {
    const data = DIALOGUES[dialogueId];
    if (!data) { if (onDone) onDone(null); return; }
    this._playedDialogues.add(dialogueId);
    this.dialogue.start(data, (result) => {
      if (result?.type === 'trigger') {
        this._handleDialogueTrigger(result.trigger, null);
      } else if (result?.type === 'jump') {
        this.playDialogue(result.target, onDone);
        return;
      }
      if (onDone) onDone(result);
    });
  }

  /**
   * Start the prologue sequence for new players.
   * Plays prologue_1, then prologue_2 chains automatically.
   * prologue_2 ends with a system trigger 'start_tutorial' which launches tutorial_1.
   */
  _startPrologueSequence() {
    if (this._playedDialogues.has('prologue_1')) return;
    this._storyProgress.prologueDone = false;

    // Hide nav so player can't switch screens during prologue
    this.ui.setNavVisible(false);

    this._playedDialogues.add('prologue_1');
    this.dialogue.start(DIALOGUES.prologue_1, (result) => {
      if (result?.type === 'jump') {
        // User chose an option that jumps to prologue_2
        this._playPrologue2();
        return;
      }
      if (result?.type === 'trigger') {
        this.ui.setNavVisible(true);
        this._handleDialogueTrigger(result.trigger, null);
        return;
      }
      // Natural end of prologue_1 → continue to prologue_2
      this._playPrologue2();
    });
    // Add skip button after dialogue.start() has built the overlay
    this._addDialogueSkipBtn(() => {
      this.dialogue.close();
      this.ui.setNavVisible(true);
    });
  }

  /**
   * Add a skip button to the currently active dialogue overlay.
   * @param {Function} onSkip — called when player presses skip
   */
  _addDialogueSkipBtn(onSkip) {
    // Defer one frame so the overlay element is in the DOM
    requestAnimationFrame(() => {
      const overlay = document.querySelector('.dialogue-overlay');
      if (!overlay) return;
      // Don't add twice
      if (overlay.querySelector('.dialogue-skip-btn')) return;
      const btn = document.createElement('button');
      btn.className = 'dialogue-skip-btn';
      btn.textContent = '跳過';
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        btn.remove();
        onSkip();
      });
      overlay.appendChild(btn);
    });
  }

  /**
   * Play prologue_2 as part of the prologue sequence.
   * Ends with system trigger 'start_tutorial'.
   */
  _playPrologue2() {
    if (this._playedDialogues.has('prologue_2')) return;
    this._playedDialogues.add('prologue_2');
    this.dialogue.start(DIALOGUES.prologue_2, (result) => {
      this._storyProgress.prologueDone = true;
      this.ui.setNavVisible(true); // restore nav after prologue ends
      if (result?.type === 'trigger') {
        this._handleDialogueTrigger(result.trigger, null);
        return;
      }
      if (result?.type === 'jump') {
        this._handleDialogueTrigger(null, null);
        return;
      }
      // Fallback: go to tutorial
      this.startBattle('tutorial_1');
    });
    // Add skip button after dialogue.start() has built the overlay
    this._addDialogueSkipBtn(() => {
      this.dialogue.close();
      this.ui.setNavVisible(true);
    });
  }

  /**
   * Check if all tutorial stages are cleared; if so, play prologue_3.
   * Called after each tutorial stage victory.
   */
  _checkTutorialComplete() {
    const tutorialIds = ['tutorial_1', 'tutorial_2', 'tutorial_3'];
    const allDone = tutorialIds.every(id => this.progress.clearedStages.has(id));
    if (!allDone || this._storyProgress.tutorialDone) return;

    this._storyProgress.tutorialDone = true;
    // Navigate to stages screen first, then play prologue_3
    this.navigateTo('STAGES');
    setTimeout(() => {
      if (!this._playedDialogues.has('prologue_3')) {
        this._playedDialogues.add('prologue_3');
        this.dialogue.start(DIALOGUES.prologue_3, (result) => {
          if (result?.type === 'trigger') {
            this._handleDialogueTrigger(result.trigger, null);
          } else {
            // prologue_3 ends naturally → unlock chapter 1
            this._storyProgress.chapter1Unlocked = true;
            this.navigateTo('STAGES');
          }
        });
      }
    }, 500);
  }

  /**
   * Handle system trigger strings emitted from dialogue lines.
   * @param {string|null} trigger
   * @param {string|null} [pendingStageId] — if set, launch this stage after handling
   */
  _handleDialogueTrigger(trigger, pendingStageId = null) {
    if (!trigger) {
      if (pendingStageId) this.startBattle(pendingStageId);
      return;
    }

    // start_tutorial → navigate to stages (tutorial area) and launch tutorial_1
    if (trigger === 'start_tutorial') {
      this._storyProgress.prologueDone = true;
      this.navigateTo('STAGES');
      setTimeout(() => this.startBattle('tutorial_1'), 300);
      return;
    }

    // start_stage_X_Y → launch that stage directly
    if (trigger.startsWith('start_stage_')) {
      const sid = trigger.replace('start_stage_', 'stage_');
      this.startBattle(sid);
      return;
    }

    // unlock_chapter_1 → set chapter1Unlocked, navigate to stages
    if (trigger === 'unlock_chapter_1') {
      this._storyProgress.chapter1Unlocked = true;
      toast(this.ui, '第一章「崩壞前哨」已解鎖！', 'info');
      this.navigateTo('STAGES');
      return;
    }

    // Generic unlock_chapter_N → navigate to stages screen
    if (trigger.startsWith('unlock_chapter')) {
      this.navigateTo('STAGES');
      return;
    }

    // chapter_1_complete → mark complete, show toast, go home
    if (trigger === 'chapter_1_complete') {
      this._storyProgress.chapter1Complete = true;
      toast(this.ui, '第一章完結！「深淵的呼喚」即將開啟……', 'info');
      this.navigateTo('HOME');
      return;
    }

    // Generic complete trigger
    if (trigger.includes('complete')) {
      toast(this.ui, '章節完結！', 'info');
      this.navigateTo('HOME');
      return;
    }

    // Fallback: if there was a pending stage, start it now
    if (pendingStageId) {
      this.startBattle(pendingStageId);
    }
  }

  // ---------------------------------------------------------------------------
  // Cleanup (optional, useful for hot-reload / test teardown)
  // ---------------------------------------------------------------------------

  destroy() {
    if (this._rafId)      cancelAnimationFrame(this._rafId);
    if (this._autoSaveId) clearInterval(this._autoSaveId);
    this.canvas.removeEventListener('click', this._onCanvasClick);
  }
}
