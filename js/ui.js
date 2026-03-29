// ui.js — DOM UI Manager for Match-3 RPG
// All screens are built dynamically; no HTML templates required.

export class UIManager {
  constructor(container) {
    this.container     = container;  // #game-container
    this.currentScreen = null;
    this.overlay       = null;

    // Screen registry
    this._screens = {};

    // Callback registry
    this._handlers = {};

    this._buildAll();
  }

  // ─── Public API ──────────────────────────────────────────────────────────────

  /** Show a named screen, hide the previous one. */
  showScreen(name) {
    if (this.currentScreen) {
      this._screens[this.currentScreen]?.el?.classList.remove('active');
    }
    this.currentScreen = name;
    this._screens[name]?.el?.classList.add('active');
  }

  /** Register an event handler by key (e.g. 'nav:battle', 'gacha:pull'). */
  on(event, handler) {
    this._handlers[event] = handler;
  }

  /** Trigger an event handler */
  _emit(event, data) {
    if (this._handlers[event]) this._handlers[event](data);
  }

  /** Update a screen's dynamic content */
  update(screenName, data) {
    this._screens[screenName]?.update?.(data);
  }

  // ─── Element Factory ─────────────────────────────────────────────────────────

  /**
   * _createElement(tag, className, text, parent) → HTMLElement
   */
  _createElement(tag, className = '', text = '', parent = null) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text)      el.textContent = text;
    if (parent)    parent.appendChild(el);
    return el;
  }

  // ─── Build All ───────────────────────────────────────────────────────────────

  _buildAll() {
    this._buildNav();
    this._buildHomeScreen();
    this._buildCharactersScreen();
    this._buildTeamScreen();
    this._buildStagesScreen();
    this._buildBattleScreen();
    this._buildGachaScreen();
    this._buildQuestsScreen();
    this._buildIntimacyScreen();
    this._buildShopScreen();
    this._buildModal();
    this._buildToast();
    this._buildLoading();
  }

  // ─── Navigation Bar ──────────────────────────────────────────────────────────

  _buildNav() {
    const nav = this._createElement('nav', 'bottom-nav', '', this.container);
    const items = [
      { key: 'home',      label: '首頁',  icon: '🏠' },
      { key: 'characters',label: '角色',  icon: '👤' },
      { key: 'gacha',     label: '抽卡',  icon: '🎲' },
      { key: 'quests',    label: '任務',  icon: '📋' },
      { key: 'intimacy',  label: '親密',  icon: '💖' },
    ];
    this._navEl = nav;
    this._navItems = {};
    for (const item of items) {
      const btn = this._createElement('button', 'nav-btn', '', nav);
      this._createElement('span', 'nav-icon', item.icon, btn);
      this._createElement('span', 'nav-label', item.label, btn);
      btn.dataset.screen = item.key;
      this._navItems[item.key] = btn;
      btn.addEventListener('click', () => {
        this._setActiveNav(item.key);
        this.showScreen(item.key);
        this._emit(`nav:${item.key}`, {});
      });
    }
  }

  _setActiveNav(key) {
    Object.values(this._navItems).forEach(b => b.classList.remove('active'));
    if (this._navItems[key]) this._navItems[key].classList.add('active');
  }

  /** Hide / show navigation bar (hidden during battle) */
  setNavVisible(visible) {
    if (this._navEl) this._navEl.style.display = visible ? '' : 'none';
  }

  // ─── 1. Home Screen ──────────────────────────────────────────────────────────

  _buildHomeScreen() {
    const screen = this._makeScreen('home');

    // Top info bar
    const topBar = this._createElement('div', 'home-topbar', '', screen.el);
    this._createElement('span', 'home-title', 'センスウルトラ', topBar);
    const topBtnGroup = this._createElement('div', 'home-topbar-btns', '', topBar);
    const muteBtn = this._createElement('button', 'btn-icon home-mute-btn', '🔊', topBtnGroup);
    muteBtn.title = '靜音切換';
    muteBtn.addEventListener('click', () => {
      this._emit('audio:toggleMute', {});
    });
    this._muteBtnEl = muteBtn;
    const shopBtn = this._createElement('button', 'btn-icon', '🛒', topBtnGroup);
    shopBtn.addEventListener('click', () => {
      this._setActiveNav('');
      this.showScreen('shop');
    });

    // Resource bar (stamina, gems, gold)
    const resBar = this._createElement('div', 'home-resource-bar', '', screen.el);
    const stamEl = this._createElement('div', 'home-res-item', '', resBar);
    this._createElement('span', 'home-res-icon', '⚡', stamEl);
    const stamVal = this._createElement('span', 'home-res-val', '80/80', stamEl);
    const gemEl  = this._createElement('div', 'home-res-item', '', resBar);
    this._createElement('span', 'home-res-icon', '💎', gemEl);
    const gemVal  = this._createElement('span', 'home-res-val', '500', gemEl);
    const goldEl = this._createElement('div', 'home-res-item', '', resBar);
    this._createElement('span', 'home-res-icon', '🪙', goldEl);
    const goldVal = this._createElement('span', 'home-res-val', '10000', goldEl);

    // Character showcase with real artwork
    const showcase = this._createElement('div', 'home-showcase', '', screen.el);
    // Background image layer
    const bgLayer = this._createElement('div', 'home-bg-layer', '', showcase);
    bgLayer.style.backgroundImage = "url('assets/bg_01_main_menu.png')";
    bgLayer.style.backgroundSize = 'cover';
    bgLayer.style.backgroundPosition = 'center';
    // Character portrait: use <img> when portrait path is available, fallback to colour block
    const charArt  = this._createElement('div', 'home-char-art', '', showcase);
    const charImg  = document.createElement('img');
    charImg.className = 'home-char-img';
    charImg.alt = '';
    charImg.style.display = 'none';
    charArt.appendChild(charImg);
    const charName = this._createElement('div', 'home-char-name', '', showcase);

    // Quick actions
    const actions = this._createElement('div', 'home-actions', '', screen.el);
    const stagesBtn = this._createElement('button', 'btn-primary home-action-btn', '⚔️ 出擊', actions);
    const teamBtn   = this._createElement('button', 'btn-secondary home-action-btn', '👥 編隊', actions);

    stagesBtn.addEventListener('click', () => {
      this._setActiveNav('');
      this.showScreen('stages');
      this._emit('nav:stages', {});
    });
    teamBtn.addEventListener('click', () => {
      this._setActiveNav('');
      this.showScreen('team');
      this._emit('nav:team', {});
    });

    // Item 11: stamina recovery countdown display
    const stamCountdown = this._createElement('span', 'home-stam-countdown', '', stamEl);
    this._stamCountdownEl = stamCountdown;

    screen.update = (data = {}) => {
      if (data.leadCharName !== undefined) charName.textContent = data.leadCharName;
      if (data.leadCharPortrait) {
        // Show real portrait image
        charImg.src = data.leadCharPortrait;
        charImg.style.display = '';
        charArt.style.background = '';
      } else if (data.leadCharColor) {
        // Fallback to colour block
        charImg.style.display = 'none';
        charArt.style.background = data.leadCharColor;
      } else if (data.leadCharColor === undefined && !data.leadCharPortrait) {
        // Only apply colour if no portrait info at all
        if (data.leadCharColor) charArt.style.background = data.leadCharColor;
      }
      if (data.stamina !== undefined && data.maxStamina !== undefined) {
        stamVal.textContent = `${data.stamina}/${data.maxStamina}`;
      }
      if (data.nextStaminaSecs !== undefined) {
        if (data.stamina >= data.maxStamina) {
          stamCountdown.textContent = ' (MAX)';
          stamCountdown.style.color = '#44FF88';
        } else {
          const secs = data.nextStaminaSecs;
          const m = String(Math.floor(secs / 60)).padStart(2, '0');
          const s = String(secs % 60).padStart(2, '0');
          stamCountdown.textContent = ` · 恢復中 ${m}:${s}`;
          stamCountdown.style.color = '#88BBFF';
        }
      }
      if (data.freeGem !== undefined) gemVal.textContent = Number(data.freeGem).toLocaleString();
      if (data.gold    !== undefined) goldVal.textContent = data.gold.toLocaleString();
    };

    this._screens.home = screen;
  }

  // ─── 2. Characters Screen ────────────────────────────────────────────────────

  _buildCharactersScreen() {
    const screen = this._makeScreen('characters');

    const header = this._createElement('div', 'screen-header', '', screen.el);
    this._createElement('h2', 'screen-title', '角色圖鑑', header);
    const filterRow = this._createElement('div', 'char-filter-row', '', screen.el);
    const types = ['全部','火','水','木','光','暗','心'];
    let activeFilter = '全部';
    const filterBtns = {};
    for (const t of types) {
      const fb = this._createElement('button', 'filter-btn', t, filterRow);
      filterBtns[t] = fb;
      fb.addEventListener('click', () => {
        Object.values(filterBtns).forEach(b => b.classList.remove('active'));
        fb.classList.add('active');
        activeFilter = t;
        this._emit('characters:filter', { type: t });
      });
    }
    filterBtns['全部'].classList.add('active');

    const grid = this._createElement('div', 'char-grid', '', screen.el);
    this._charGrid = grid;

    // Detail panel (hidden by default)
    const detailPanel = this._createElement('div', 'char-detail-panel hidden', '', screen.el);
    this._buildCharDetailPanel(detailPanel);
    this._charDetailPanel = detailPanel;

    screen.update = (data = {}) => {
      if (!data.characters) return;
      grid.innerHTML = '';
      for (const char of data.characters) {
        const card = this._buildCharCard(char);
        grid.appendChild(card);
        card.addEventListener('click', () => {
          this._showCharDetail(char);
        });
      }
    };

    this._screens.characters = screen;
  }

  _buildCharCard(char) {
    const rarityClass = { SSR: 'rarity-ssr', SR: 'rarity-sr', R: 'rarity-r', N: 'rarity-n' };
    const card = document.createElement('div');
    card.className = `char-card ${rarityClass[char.rarity] || 'rarity-r'}`;

    const typeColors = {
      FIRE:'#FF4444',WATER:'#4488FF',WOOD:'#44BB44',
      LIGHT:'#FFDD44',DARK:'#AA44FF',HEART:'#FF88AA',
    };
    const art = this._createElement('div', 'char-card-art', '', card);

    if (char.icon) {
      // Use real icon image
      const img = document.createElement('img');
      img.src = char.icon;
      img.alt = char.name || '';
      img.className = 'char-card-icon-img';
      img.onerror = () => {
        // Fallback to colour block on load error
        img.style.display = 'none';
        art.style.background = typeColors[char.type] || '#555';
        art.textContent = (char.name || '?').substring(0, 1);
      };
      art.appendChild(img);
    } else {
      // No icon: colour block + first character of name
      art.style.background = typeColors[char.type] || '#555';
      art.textContent = (char.name || '?').substring(0, 1);
    }

    const rarityLabel = this._createElement('div', 'char-card-rarity', char.rarity || 'R', card);
    const nameEl      = this._createElement('div', 'char-card-name', (char.name || '???').substring(0,4), card);

    if (char.isNew) {
      this._createElement('div', 'char-card-badge', 'NEW', card);
    }
    return card;
  }

  _buildCharDetailPanel(panel) {
    panel.innerHTML = '';
    const closeBtn = this._createElement('button', 'btn-icon panel-close', '✕', panel);
    closeBtn.addEventListener('click', () => {
      panel.classList.add('hidden');
    });

    this._charDetailName   = this._createElement('h3', 'detail-name',  '', panel);
    this._charDetailArt    = this._createElement('div','detail-art',   '', panel);
    this._charDetailRarity = this._createElement('div','detail-rarity','', panel);

    // Stats (item 12: show all 4 stats including level)
    const statsRow = this._createElement('div', 'detail-stats', '', panel);
    this._charStatLv  = this._makeStatItem(statsRow, 'Lv',  '1');
    this._charStatHP  = this._makeStatItem(statsRow, 'HP',  '0');
    this._charStatATK = this._makeStatItem(statsRow, '攻擊','0');
    this._charStatRCV = this._makeStatItem(statsRow, '回復','0');

    // Skills
    const skillSection = this._createElement('div', 'detail-section', '', panel);
    this._createElement('h4', 'detail-section-title', '技能', skillSection);
    this._charSkillEl = this._createElement('p', 'detail-skill-text', '', skillSection);

    const leaderSection = this._createElement('div', 'detail-section', '', panel);
    this._createElement('h4', 'detail-section-title', '隊長技', leaderSection);
    this._charLeaderEl = this._createElement('p', 'detail-skill-text', '', leaderSection);
  }

  _makeStatItem(parent, label, value) {
    const item  = this._createElement('div', 'stat-item', '', parent);
    this._createElement('span', 'stat-label', label, item);
    const val   = this._createElement('span', 'stat-value', value, item);
    return val;
  }

  _showCharDetail(char) {
    const panel = this._charDetailPanel;
    const typeColors = {
      FIRE:'#FF4444',WATER:'#4488FF',WOOD:'#44BB44',
      LIGHT:'#FFDD44',DARK:'#AA44FF',HEART:'#FF88AA',
    };
    this._charDetailName.textContent = char.name || '???';

    // Use portrait if available, otherwise colour block
    this._charDetailArt.innerHTML = '';
    if (char.portrait) {
      const img = document.createElement('img');
      img.src = char.portrait;
      img.alt = char.name || '';
      img.className = 'detail-art-img';
      img.onerror = () => {
        img.remove();
        this._charDetailArt.style.background = typeColors[char.type] || '#555';
      };
      this._charDetailArt.style.background = '';
      this._charDetailArt.appendChild(img);
    } else {
      this._charDetailArt.style.background = typeColors[char.type] || '#555';
    }

    this._charDetailRarity.textContent = char.rarity || 'R';
    this._charDetailRarity.className   = `detail-rarity rarity-text-${(char.rarity||'r').toLowerCase()}`;
    if (this._charStatLv)  this._charStatLv.textContent  = char.level  || '1';
    this._charStatHP.textContent       = char.hp     || '0';
    this._charStatATK.textContent      = char.atk    || '0';
    this._charStatRCV.textContent      = char.rcv    || '0';
    this._charSkillEl.textContent      = char.skill  || '—';
    this._charLeaderEl.textContent     = char.leader || '—';
    panel.classList.remove('hidden');
  }

  // ─── 3. Team Screen ──────────────────────────────────────────────────────────

  _buildTeamScreen() {
    const screen = this._makeScreen('team');

    const header = this._createElement('div', 'screen-header', '', screen.el);
    this._createElement('h2', 'screen-title', '編隊', header);

    // Team slots
    const teamRow = this._createElement('div', 'team-slots', '', screen.el);
    this._teamSlots = [];
    for (let i = 0; i < 5; i++) {
      const slot = this._createElement('div', `team-slot${i === 0 ? ' leader-slot' : ''}`, '', teamRow);
      // Item 13: crown icon for leader slot
      const idx  = this._createElement('div', 'slot-index', i === 0 ? '♛ 隊長' : `${i + 1}`, slot);
      if (i === 0) idx.classList.add('slot-leader-label');
      const art  = this._createElement('div', 'slot-art empty', '+', slot);
      const name = this._createElement('div', 'slot-name', '空', slot);
      this._teamSlots.push({ slot, art, name, char: null });

      slot.addEventListener('click', () => {
        // Item 13: if slot has character, clicking removes them (toggle behavior)
        if (this._teamSlots[i].char) {
          this._emit('team:removeChar', { index: i });
        } else {
          this._emit('team:slotClick', { index: i });
        }
      });
    }

    // Confirm button
    const confirmBtn = this._createElement('button', 'btn-primary team-confirm', '確認編隊', screen.el);
    confirmBtn.addEventListener('click', () => this._emit('team:confirm', {}));

    // Available characters list
    this._createElement('h3', 'section-title', '持有角色', screen.el);
    const charList = this._createElement('div', 'team-char-list', '', screen.el);
    this._teamCharList = charList;

    screen.update = (data = {}) => {
      // Update slots
      if (data.team) {
        for (let i = 0; i < 5; i++) {
          const s = this._teamSlots[i];
          const c = data.team[i];
          const typeColors = {
            FIRE:'#FF4444',WATER:'#4488FF',WOOD:'#44BB44',
            LIGHT:'#FFDD44',DARK:'#AA44FF',HEART:'#FF88AA',
          };
          if (c) {
            s.art.innerHTML = '';
            s.art.classList.remove('empty');
            if (c.icon) {
              const img = document.createElement('img');
              img.src = c.icon;
              img.alt = c.name || '';
              img.className = 'slot-icon-img';
              img.onerror = () => {
                img.remove();
                s.art.style.background = typeColors[c.type] || '#555';
              };
              s.art.style.background = '';
              s.art.appendChild(img);
            } else {
              s.art.style.background = typeColors[c.type] || '#555';
            }
            s.name.textContent = (c.name || '???').substring(0, 3);
            s.char = c; // item 13: track current char for remove toggle
          } else {
            s.art.innerHTML = '+';
            s.art.style.background = '';
            s.art.classList.add('empty');
            s.name.textContent = '空';
            s.char = null;
          }
        }
      }
      // Update available characters
      if (data.characters) {
        charList.innerHTML = '';
        for (const char of data.characters) {
          const card = this._buildCharCard(char);
          card.classList.add('team-pick');
          card.addEventListener('click', () => {
            this._emit('team:pickChar', { char });
          });
          charList.appendChild(card);
        }
      }
    };

    this._screens.team = screen;
  }

  // ─── 4. Stages Screen ────────────────────────────────────────────────────────

  _buildStagesScreen() {
    const screen = this._makeScreen('stages');

    const header = this._createElement('div', 'screen-header', '', screen.el);
    this._createElement('h2', 'screen-title', '關卡選擇', header);

    // Area tabs — index 0 = tutorial (area 0), indices 1-3 = areas 1-3
    const tabRow  = this._createElement('div', 'stage-tabs', '', screen.el);
    const areaLabels = ['序章', 'Area 1', 'Area 2', 'Area 3'];
    // areaIndex[i] = the actual area number in stage data (0, 1, 2, 3)
    const areaNumbers = [0, 1, 2, 3];
    let activeTab = 0;
    const areaLists = [];
    const tabBtns   = [];

    const listContainer = this._createElement('div', 'stage-list-container', '', screen.el);

    for (let i = 0; i < areaLabels.length; i++) {
      const tab = this._createElement('button', 'stage-tab', areaLabels[i], tabRow);
      tabBtns.push(tab);
      const list = this._createElement('div', 'stage-list hidden', '', listContainer);
      areaLists.push(list);

      tab.addEventListener('click', () => {
        tabBtns.forEach(t => t.classList.remove('active'));
        areaLists.forEach(l => l.classList.add('hidden'));
        tab.classList.add('active');
        list.classList.remove('hidden');
        activeTab = i;
      });
    }
    tabBtns[0].classList.add('active');
    areaLists[0].classList.remove('hidden');

    this._areaLists = areaLists;

    screen.update = (data = {}) => {
      const stages = data.stages || [];
      for (let i = 0; i < areaLists.length; i++) {
        areaLists[i].innerHTML = '';
        const areaNum = areaNumbers[i];
        const titleText = areaNum === 0
          ? '序章 — 教學關卡'
          : `Area ${areaNum}`;
        this._createElement('div', 'area-title', titleText, areaLists[i]);
        const areaStages = stages.filter(s => s.area === areaNum);
        for (const stage of areaStages) {
          this._buildStageRow(areaLists[i], stage);
        }
        // Show placeholder text when no stages yet (areas 2-3 not yet implemented)
        if (areaStages.length === 0 && areaNum > 1) {
          this._createElement('div', 'stage-placeholder', '（即將開放）', areaLists[i]);
        }
      }
    };

    this._screens.stages = screen;
  }

  _buildStageRow(parent, stage) {
    const row = this._createElement('div', `stage-row ${stage.cleared ? 'cleared' : ''} ${stage.isTutorial ? 'tutorial-stage' : ''}`, '', parent);

    const info = this._createElement('div', 'stage-info', '', row);
    const stageNumLabel = stage.area === 0
      ? `教`
      : `${stage.area}-${stage.num}`;
    this._createElement('span', 'stage-num',   stageNumLabel, info);
    this._createElement('span', 'stage-name',  stage.name || '???', info);
    const stamLabel = (stage.stamina === 0 || stage.staminaCost === 0) ? '⚡免費' : `⚡${stage.stamina || stage.staminaCost || 10}`;
    this._createElement('span', 'stage-stam',  stamLabel, info);

    const meta = this._createElement('div', 'stage-meta', '', row);
    if (stage.cleared) {
      this._createElement('span', 'stage-cleared-badge', '✓', meta);
    }
    if (stage.firstClearGem && !stage.firstCleared) {
      this._createElement('span', 'stage-reward', `初通 💎${stage.firstClearGem}`, meta);
    }

    const startBtn = this._createElement('button', 'btn-primary btn-sm stage-start', '出發', row);
    startBtn.addEventListener('click', () => {
      this._emit('stage:start', { stage });
    });
  }

  // ─── 5. Battle Screen ────────────────────────────────────────────────────────

  _buildBattleScreen() {
    const screen = this._makeScreen('battle');
    screen.el.classList.add('battle-screen');

    // Canvas will be inserted here by game core
    const canvasWrap = this._createElement('div', 'battle-canvas-wrap', '', screen.el);
    this._battleCanvasWrap = canvasWrap;

    // DOM overlay (on top of canvas)
    const overlay = this._createElement('div', 'battle-overlay', '', screen.el);

    // Pause button
    const pauseBtn = this._createElement('button', 'btn-icon battle-pause', '⏸', overlay);
    pauseBtn.addEventListener('click', () => this._emit('battle:pause', {}));

    // Super skill buttons (up to 5)
    const skillBar = this._createElement('div', 'battle-skill-bar', '', overlay);
    this._skillBtns = [];
    for (let i = 0; i < 5; i++) {
      const btn = this._createElement('button', 'skill-btn disabled', '', skillBar);
      this._createElement('span', 'skill-btn-icon', '✦', btn);
      this._createElement('span', 'skill-btn-label', `超感${i+1}`, btn);
      const chargeBar = this._createElement('div', 'skill-charge-bar', '', btn);
      const chargeFill = this._createElement('div', 'skill-charge-fill', '', chargeBar);
      btn.dataset.index = i;
      btn.addEventListener('click', () => {
        if (!btn.classList.contains('disabled')) {
          this._emit('battle:skill', { index: i });
        }
      });
      this._skillBtns.push({ btn, chargeFill });
    }

    // Result panel (hidden)
    const resultPanel = this._createElement('div', 'battle-result hidden', '', screen.el);
    this._buildResultPanel(resultPanel);
    this._resultPanel = resultPanel;

    // Pause menu (hidden)
    const pauseMenu = this._createElement('div', 'battle-pause-menu hidden', '', screen.el);
    this._buildPauseMenu(pauseMenu);
    this._pauseMenu = pauseMenu;

    screen.update = (data = {}) => {
      // Update skill buttons charge — hide slots beyond active team size
      if (data.team) {
        const activeCount = data.team.length;
        this._skillBtns.forEach(({ btn }, idx) => {
          btn.style.display = idx < activeCount ? '' : 'none';
        });
        data.team.forEach((c, i) => {
          if (!this._skillBtns[i]) return;
          const { btn, chargeFill } = this._skillBtns[i];
          const pct = Math.min(1, (c.charge || 0) / (c.maxCharge || 1));
          chargeFill.style.width = `${pct * 100}%`;
          if (pct >= 1) {
            btn.classList.remove('disabled');
            btn.classList.add('ready');
          } else {
            btn.classList.add('disabled');
            btn.classList.remove('ready');
          }
        });
      }
      if (data.showResult) this._showResult(data.result);
      if (data.showPause !== undefined) {
        this._pauseMenu.classList.toggle('hidden', !data.showPause);
      }
    };

    /** Allow game core to inject the canvas element */
    screen.mountCanvas = (canvasEl) => {
      canvasWrap.innerHTML = '';
      canvasWrap.appendChild(canvasEl);
    };

    this._screens.battle = screen;
  }

  _buildResultPanel(panel) {
    panel.innerHTML = '';
    this._resultTitle   = this._createElement('h2', 'result-title', '', panel);
    this._resultStars   = this._createElement('div', 'result-stars', '', panel);
    this._resultRewards = this._createElement('div', 'result-rewards', '', panel);

    const btns = this._createElement('div', 'result-btns', '', panel);
    const retryBtn = this._createElement('button', 'btn-primary', '再挑戰', btns);
    const homeBtn  = this._createElement('button', 'btn-secondary', '回大廳', btns);

    retryBtn.addEventListener('click', () => this._emit('battle:retry', {}));
    homeBtn.addEventListener('click',  () => {
      this._resultPanel.classList.add('hidden');
      // Hide canvas (battle screen leaves it visible; we must hide it here)
      const canvas = document.getElementById('game-canvas');
      if (canvas) canvas.style.display = 'none';
      this.setNavVisible(true);
      this.showScreen('home');
      this._setActiveNav('home');
      this._emit('battle:exit', {});
    });
  }

  _showResult(result = {}) {
    const panel = this._resultPanel;
    panel.classList.remove('hidden');

    this._resultTitle.textContent = result.win ? '勝利！' : '敗北';
    this._resultTitle.className   = `result-title ${result.win ? 'win' : 'lose'}`;

    // Stars
    this._resultStars.innerHTML = '';
    const stars = result.stars || 0;
    for (let i = 0; i < 3; i++) {
      const s = this._createElement('span', `result-star ${i < stars ? 'lit' : ''}`, '★', this._resultStars);
    }

    // Rewards
    this._resultRewards.innerHTML = '';
    if (result.rewards) {
      for (const r of result.rewards) {
        const row = this._createElement('div', 'reward-row', '', this._resultRewards);
        this._createElement('span', 'reward-icon', r.icon || '🎁', row);
        this._createElement('span', 'reward-name', r.name, row);
        this._createElement('span', 'reward-qty',  `×${r.qty}`, row);
      }
    }
  }

  _buildPauseMenu(menu) {
    menu.innerHTML = '';
    this._createElement('h3', 'pause-title', '暫停', menu);
    const resumeBtn = this._createElement('button', 'btn-primary', '繼續', menu);
    const retryBtn  = this._createElement('button', 'btn-secondary', '再試一次', menu);
    const homeBtn   = this._createElement('button', 'btn-danger',   '放棄', menu);

    resumeBtn.addEventListener('click', () => this._emit('battle:resume', {}));
    retryBtn.addEventListener('click',  () => this._emit('battle:retry',  {}));
    homeBtn.addEventListener('click',   () => {
      menu.classList.add('hidden');
      const canvas = document.getElementById('game-canvas');
      if (canvas) canvas.style.display = 'none';
      this.setNavVisible(true);
      this.showScreen('home');
      this._setActiveNav('home');
      this._emit('battle:exit', {});
    });
  }

  // ─── 6. Gacha Screen ─────────────────────────────────────────────────────────

  _buildGachaScreen() {
    const screen = this._makeScreen('gacha');

    const header = this._createElement('div', 'screen-header', '', screen.el);
    this._createElement('h2', 'screen-title', '召喚', header);

    // Pool tabs
    const poolTabs = this._createElement('div', 'gacha-pool-tabs', '', screen.el);
    const poolNames = ['常駐池', '限定池'];
    const poolBtns  = [];
    let activePool  = 0;

    const poolDetails = [];

    for (let p = 0; p < poolNames.length; p++) {
      const tab = this._createElement('button', 'gacha-pool-tab', poolNames[p], poolTabs);
      poolBtns.push(tab);
      const detail = this._createElement('div', `gacha-pool-detail ${p === 0 ? '' : 'hidden'}`, '', screen.el);
      poolDetails.push(detail);

      // Pool banner
      const banner = this._createElement('div', 'gacha-banner', '', detail);
      this._createElement('div', 'gacha-banner-img', p === 0 ? '常駐' : '限定', banner);
      this._createElement('p', 'gacha-banner-sub', p === 0 ? '基礎角色池' : '期間限定角色', banner);

      // Item 14: Pity counter with progress bar
      const pityWrap = this._createElement('div', 'gacha-pity-wrap', '', detail);
      const pity = this._createElement('div', 'gacha-pity', '', pityWrap);
      this._createElement('span', 'gacha-pity-label', '保底計數：', pity);
      const pityNum = this._createElement('span', 'gacha-pity-num', '0/80', pity);
      const pityBar = this._createElement('div', 'gacha-pity-bar', '', pityWrap);
      const pityFill = this._createElement('div', 'gacha-pity-fill', '', pityBar);
      // store fill element reference
      detail._pityFill = pityFill;

      // Buttons
      const btns = this._createElement('div', 'gacha-btns', '', detail);
      const singleBtn = this._createElement('button', 'btn-primary gacha-single', '單抽 💎150', btns);
      const tenBtn    = this._createElement('button', 'btn-primary gacha-ten',    '十連 💎1500', btns);

      singleBtn.addEventListener('click', () => this._emit('gacha:pull', { pool: p, count: 1 }));
      tenBtn.addEventListener('click',    () => this._emit('gacha:pull', { pool: p, count: 10 }));

      tab.addEventListener('click', () => {
        poolBtns.forEach(b => b.classList.remove('active'));
        poolDetails.forEach(d => d.classList.add('hidden'));
        tab.classList.add('active');
        detail.classList.remove('hidden');
        activePool = p;
      });
    }
    poolBtns[0].classList.add('active');

    this._gachaPoolDetails = poolDetails;
    this._gachaPityNums    = poolDetails.map(d => d.querySelector('.gacha-pity-num'));

    // Result panel
    const resultPanel = this._createElement('div', 'gacha-result hidden', '', screen.el);
    const resultTitle = this._createElement('h3', 'gacha-result-title', '召喚結果', resultPanel);
    const resultGrid  = this._createElement('div', 'gacha-result-grid',  '', resultPanel);
    const closeRes    = this._createElement('button', 'btn-secondary', '關閉', resultPanel);
    closeRes.addEventListener('click', () => {
      resultPanel.classList.add('hidden');
      this.setNavVisible(true);
      this._setActiveNav('gacha');
    });

    this._gachaResultPanel = resultPanel;
    this._gachaResultGrid  = resultGrid;

    screen.update = (data = {}) => {
      if (data.pity !== undefined) {
        const poolIdx = data.pool ?? 0;
        if (this._gachaPityNums[poolIdx]) {
          this._gachaPityNums[poolIdx].textContent = `${data.pity}/80`;
        }
        // Item 14: update pity bar
        const fill = poolDetails[poolIdx]?._pityFill;
        if (fill) {
          const pct = Math.min(1, data.pity / 80);
          fill.style.width = `${pct * 100}%`;
          fill.style.background = pct > 0.875 ? '#FF4444' : pct > 0.5 ? '#FF8800' : '#4488FF';
        }
      }
      if (data.results) {
        this._showGachaResult(data.results);
      }
    };

    this._screens.gacha = screen;
  }

  _showGachaResult(results = []) {
    const panel = this._gachaResultPanel;
    const grid  = this._gachaResultGrid;
    panel.classList.remove('hidden');
    grid.innerHTML = '';

    const rarityClass = { SSR: 'rarity-ssr', SR: 'rarity-sr', R: 'rarity-r', N: 'rarity-n' };
    const typeColors  = {
      FIRE:'#FF4444',WATER:'#4488FF',WOOD:'#44BB44',
      LIGHT:'#FFDD44',DARK:'#AA44FF',HEART:'#FF88AA',
    };

    for (const char of results) {
      const card = this._createElement('div', `gacha-card ${rarityClass[char.rarity] || 'rarity-r'}`, '', grid);
      const art  = this._createElement('div', 'gacha-card-art', '', card);
      const imgSrc = char.portrait || char.icon || null;
      if (imgSrc) {
        const img = document.createElement('img');
        img.src = imgSrc;
        img.alt = char.name || '';
        img.className = 'gacha-card-portrait';
        img.onerror = () => {
          img.remove();
          art.style.background = typeColors[char.type] || '#555';
        };
        art.style.background = 'transparent';
        art.appendChild(img);
      } else {
        art.style.background = typeColors[char.type] || '#555';
      }
      this._createElement('div', 'gacha-card-rarity', char.rarity || 'R', card);
      this._createElement('div', 'gacha-card-name', (char.name || '???').substring(0, 4), card);
      if (char.isNew) {
        this._createElement('div', 'gacha-card-new', 'NEW', card);
      }
      // Item 25: show fragment count for duplicates
      if (char.isDuplicate && char.fragCount > 0) {
        this._createElement('div', 'gacha-card-frag', `碎片+${char.fragCount}`, card);
      }
    }
  }

  // ─── 7. Quests Screen ────────────────────────────────────────────────────────

  _buildQuestsScreen() {
    const screen = this._makeScreen('quests');

    const header = this._createElement('div', 'screen-header', '', screen.el);
    this._createElement('h2', 'screen-title', '每日任務', header);

    // Daily quests
    const questSection = this._createElement('div', 'quest-section', '', screen.el);
    this._createElement('h3', 'section-title', '每日任務', questSection);
    const questList = this._createElement('div', 'quest-list', '', questSection);
    this._questList = questList;

    // Activity meter
    const actSection = this._createElement('div', 'quest-section', '', screen.el);
    this._createElement('h3', 'section-title', '活躍度', actSection);
    const actBar = this._createElement('div', 'activity-bar', '', actSection);
    this._activityNodes = [];
    const thresholds = [20, 40, 60, 80, 100];
    for (const t of thresholds) {
      const node = this._createElement('div', 'activity-node', `${t}`, actBar);
      this._activityNodes.push({ node, threshold: t });
    }

    this._activityScore = this._createElement('div', 'activity-score', '活躍度：0/100', actSection);

    screen.update = (data = {}) => {
      if (data.quests) {
        questList.innerHTML = '';
        for (const q of data.quests) {
          this._buildQuestRow(questList, q);
        }
      }
      if (data.activity !== undefined) {
        this._activityScore.textContent = `活躍度：${data.activity}/100`;
        for (const { node, threshold } of this._activityNodes) {
          node.classList.toggle('reached', data.activity >= threshold);
          node.classList.toggle('claimed', data.claimedThresholds?.includes(threshold));
        }
      }
    };

    this._screens.quests = screen;
  }

  _buildQuestRow(parent, quest) {
    const row  = this._createElement('div', `quest-row ${quest.completed ? 'completed' : ''}`, '', parent);
    const info = this._createElement('div', 'quest-info', '', row);
    this._createElement('div', 'quest-name', quest.name, info);

    const progressWrap  = this._createElement('div', 'quest-progress-wrap', '', info);
    const progressTrack = this._createElement('div', 'quest-progress-track', '', progressWrap);
    const progressFill  = this._createElement('div', 'quest-progress-fill',  '', progressTrack);
    const pct = Math.min(1, (quest.current || 0) / (quest.target || 1));
    progressFill.style.width = `${pct * 100}%`;
    this._createElement('span', 'quest-progress-text',
      `${quest.current || 0}/${quest.target || 1}`, progressWrap);

    // Reward
    const rewardEl = this._createElement('div', 'quest-reward', '', row);
    this._createElement('span', 'quest-reward-icon', quest.rewardIcon || '💎', rewardEl);
    this._createElement('span', 'quest-reward-qty',  `×${quest.rewardQty || 10}`, rewardEl);

    // Claim button
    const claimBtn = this._createElement('button',
      `btn-sm ${quest.completed && !quest.claimed ? 'btn-primary' : 'btn-disabled'}`,
      quest.claimed ? '已領取' : quest.completed ? '領取' : '進行中', row);

    if (quest.completed && !quest.claimed) {
      claimBtn.addEventListener('click', () => {
        // Item 15: animate button and show reward popup
        claimBtn.classList.add('claim-anim');
        claimBtn.textContent = '✓ 已領取';
        setTimeout(() => claimBtn.classList.remove('claim-anim'), 600);
        this._emit('quest:claim', { id: quest.id });
      });
    }
  }

  // ─── 8. Intimacy Screen ──────────────────────────────────────────────────────

  _buildIntimacyScreen() {
    const screen = this._makeScreen('intimacy');

    const header = this._createElement('div', 'screen-header', '', screen.el);
    this._createElement('h2', 'screen-title', '親密互動', header);

    const charList = this._createElement('div', 'intimacy-list', '', screen.el);
    this._intimacyList = charList;

    // Interaction panel (fullscreen overlay)
    const interactPanel = this._createElement('div', 'interact-panel hidden', '', screen.el);
    this._buildInteractPanel(interactPanel);
    this._interactPanel = interactPanel;

    screen.update = (data = {}) => {
      if (data.characters) {
        charList.innerHTML = '';
        for (const char of data.characters) {
          this._buildIntimacyRow(charList, char);
        }
      }
    };

    this._screens.intimacy = screen;
  }

  _buildIntimacyRow(parent, char) {
    const typeColors = {
      FIRE:'#FF4444',WATER:'#4488FF',WOOD:'#44BB44',
      LIGHT:'#FFDD44',DARK:'#AA44FF',HEART:'#FF88AA',
    };
    const row = this._createElement('div', 'intimacy-row', '', parent);
    const art = this._createElement('div', 'intimacy-avatar', '', row);
    if (char.icon) {
      const img = document.createElement('img');
      img.src = char.icon;
      img.alt = char.name || '';
      img.className = 'intimacy-avatar-img';
      img.onerror = () => {
        img.remove();
        art.style.background = typeColors[char.type] || '#555';
        art.textContent = (char.name || '?').substring(0, 2);
      };
      art.appendChild(img);
    } else {
      art.style.background = typeColors[char.type] || '#555';
      this._createElement('span', 'intimacy-avatar-name', (char.name || '???').substring(0, 2), art);
    }

    const info = this._createElement('div', 'intimacy-info', '', row);
    this._createElement('div', 'intimacy-char-name', char.name || '???', info);
    this._createElement('div', 'intimacy-level', `親密度 Lv.${char.intimacyLevel || 1}`, info);

    const barWrap = this._createElement('div', 'intimacy-bar-wrap', '', info);
    const barFill = this._createElement('div', 'intimacy-bar-fill', '', barWrap);
    const pct = Math.min(1, (char.intimacyExp || 0) / (char.intimacyMax || 100));
    barFill.style.width = `${pct * 100}%`;

    const talkBtn = this._createElement('button', 'btn-primary btn-sm', '互動', row);
    talkBtn.addEventListener('click', () => {
      // Notify GameController first (it handles intimacy point gain and determines dialogue)
      this._emit('intimacy:interact', { char });
    });
  }

  _buildInteractPanel(panel) {
    panel.innerHTML = '';
    // Background
    const bg = this._createElement('div', 'interact-bg', '', panel);
    this._interactBg = bg;

    // Character art
    const charArt = this._createElement('div', 'interact-char-art', '', panel);
    this._interactCharArt = charArt;

    // Close button
    const closeBtn = this._createElement('button', 'btn-icon interact-close', '✕', panel);
    closeBtn.addEventListener('click', () => {
      panel.classList.add('hidden');
    });

    // Dialogue box
    const dialogBox = this._createElement('div', 'interact-dialog', '', panel);
    const charName  = this._createElement('div', 'interact-char-name', '', dialogBox);
    const dialogText = this._createElement('p', 'interact-text', '', dialogBox);
    this._interactCharName = charName;
    this._interactText     = dialogText;

    // Choices
    const choicesBox = this._createElement('div', 'interact-choices', '', panel);
    this._interactChoices = choicesBox;

    // Date event area
    const dateEvent = this._createElement('div', 'interact-date hidden', '', panel);
    this._createElement('div', 'interact-date-img', '約會中…', dateEvent);
    const dateTxt = this._createElement('p', 'interact-date-text', '', dateEvent);
    this._interactDate    = dateEvent;
    this._interactDateTxt = dateTxt;

    this._interactBg = bg;
  }

  _openInteract(char) {
    const panel = this._interactPanel;
    const typeColors = {
      FIRE:'#FF4444',WATER:'#4488FF',WOOD:'#44BB44',
      LIGHT:'#FFDD44',DARK:'#AA44FF',HEART:'#FF88AA',
    };
    const c = typeColors[char.type] || '#555';
    this._interactBg.style.background = `linear-gradient(135deg, ${c}33, #1a1a2e)`;

    // Use portrait if available, otherwise colour block
    this._interactCharArt.innerHTML = '';
    if (char.portrait) {
      const img = document.createElement('img');
      img.src = char.portrait;
      img.alt = char.name || '';
      img.className = 'interact-portrait-img';
      img.onerror = () => {
        img.remove();
        this._interactCharArt.style.background = c;
      };
      this._interactCharArt.style.background = '';
      this._interactCharArt.appendChild(img);
    } else {
      this._interactCharArt.style.background = c;
    }
    this._interactCharName.textContent       = char.name || '???';
    this._interactText.textContent           = char.greeting || `你好，${char.name || '旅行者'}…`;

    // Default choices
    this._interactChoices.innerHTML = '';
    const choices = char.choices || [
      { label: '好久不見', reply: '是啊，我也一直在想你…' },
      { label: '約個會吧', reply: '真的嗎！我等這天很久了！', date: true },
      { label: '再見',     reply: null, close: true },
    ];
    for (const choice of choices) {
      const btn = this._createElement('button', 'btn-choice', choice.label, this._interactChoices);
      btn.addEventListener('click', () => {
        if (choice.close) {
          panel.classList.add('hidden');
          return;
        }
        if (choice.reply) {
          this._interactText.textContent = choice.reply;
          this._emit('intimacy:choice', { char, choice });
        }
        if (choice.date) {
          this._interactDate.classList.remove('hidden');
          this._interactDateTxt.textContent = char.dateText || '在星光下的街道上，兩人並肩而行…';
        }
      });
    }

    panel.classList.remove('hidden');
  }

  // ─── 9. Shop Screen ──────────────────────────────────────────────────────────

  _buildShopScreen() {
    const screen = this._makeScreen('shop');

    const header = this._createElement('div', 'screen-header', '', screen.el);
    this._createElement('h2', 'screen-title', '商店', header);
    const backBtn = this._createElement('button', 'btn-icon shop-back', '←', header);
    backBtn.addEventListener('click', () => {
      this.showScreen('home');
      this._setActiveNav('home');
    });

    // Stamina section
    const stamSection = this._createElement('div', 'shop-section', '', screen.el);
    this._createElement('h3', 'section-title', '體力補充', stamSection);
    const stamItems = [
      { name: '體力 +50',  cost: '💎60',  qty: 50  },
      { name: '體力 +100', cost: '💎120', qty: 100 },
      { name: '體力滿充',  cost: '💎200', qty: -1  },
    ];
    for (const item of stamItems) {
      this._buildShopItem(stamSection, item, 'stam');
    }

    // Items section
    const itemSection = this._createElement('div', 'shop-section', '', screen.el);
    this._createElement('h3', 'section-title', '強化道具', itemSection);
    const shopItems = [
      { name: '強化石 ×10',    cost: '💎30',   id: 'evo10'   },
      { name: '覺醒結晶 ×3',   cost: '💎50',   id: 'awa3'    },
      { name: '100萬金幣',      cost: '💎20',   id: 'gold1m'  },
    ];
    for (const item of shopItems) {
      this._buildShopItem(itemSection, item, 'item');
    }

    this._screens.shop = screen;
  }

  _buildShopItem(parent, item, category) {
    const row   = this._createElement('div', 'shop-item', '', parent);
    const info  = this._createElement('div', 'shop-item-info', '', row);
    this._createElement('div', 'shop-item-name', item.name, info);
    this._createElement('div', 'shop-item-cost', item.cost, info);
    const buyBtn = this._createElement('button', 'btn-primary btn-sm', '購買', row);
    buyBtn.addEventListener('click', () => this._emit('shop:buy', { item, category }));
  }

  // ─── Modal ───────────────────────────────────────────────────────────────────

  _buildModal() {
    const overlay = this._createElement('div', 'modal-overlay hidden', '', this.container);
    const modal   = this._createElement('div', 'modal-box', '', overlay);
    const title   = this._createElement('h3', 'modal-title', '', modal);
    const body    = this._createElement('p',  'modal-body',  '', modal);
    const btnRow  = this._createElement('div', 'modal-btns', '', modal);
    const confirmBtn = this._createElement('button', 'btn-primary',   '確認', btnRow);
    const cancelBtn  = this._createElement('button', 'btn-secondary', '取消', btnRow);

    overlay.addEventListener('click', e => {
      if (e.target === overlay) this.closeModal();
    });
    confirmBtn.addEventListener('click', () => {
      this._modalCallback?.('confirm');
      this.closeModal();
    });
    cancelBtn.addEventListener('click', () => {
      this._modalCallback?.('cancel');
      this.closeModal();
    });

    this._modalOverlay  = overlay;
    this._modalTitle    = title;
    this._modalBody     = body;
    this._modalConfirm  = confirmBtn;
    this._modalCancel   = cancelBtn;
  }

  /** Show a modal dialog. callback: ('confirm'|'cancel') => void */
  showModal(titleText, bodyText, callback, opts = {}) {
    this._modalTitle.textContent   = titleText;
    this._modalBody.textContent    = bodyText;
    this._modalCallback            = callback;
    this._modalConfirm.textContent = opts.confirmText || '確認';
    this._modalCancel.textContent  = opts.cancelText  || '取消';
    if (opts.hideCancel) this._modalCancel.classList.add('hidden');
    else                 this._modalCancel.classList.remove('hidden');
    this._modalOverlay.classList.remove('hidden');
  }

  closeModal() {
    this._modalOverlay.classList.add('hidden');
    this._modalCallback = null;
  }

  // ─── Toast ───────────────────────────────────────────────────────────────────

  _buildToast() {
    const toast = this._createElement('div', 'toast hidden', '', this.container);
    this._toastEl      = toast;
    this._toastTimeout = null;
  }

  /** Show a toast notification. duration in ms (default 2500). */
  showToast(message, duration = 2500) {
    clearTimeout(this._toastTimeout);
    clearTimeout(this._toastFadeTimeout);
    this._toastEl.textContent = message;
    // Item 17: slide-in from bottom, then fade-out
    this._toastEl.classList.remove('hidden', 'show', 'toast-exit');
    // Force reflow to restart animation
    void this._toastEl.offsetWidth;
    this._toastEl.classList.add('show');
    this._toastTimeout = setTimeout(() => {
      // Fade out exit
      this._toastEl.classList.add('toast-exit');
      this._toastFadeTimeout = setTimeout(() => {
        this._toastEl.classList.remove('show', 'toast-exit');
        this._toastEl.classList.add('hidden');
      }, 300);
    }, duration);
  }

  // ─── Loading Screen ──────────────────────────────────────────────────────────

  _buildLoading() {
    const el = this._createElement('div', 'loading-screen hidden', '', this.container);
    // Item 20: game title + loading text
    this._createElement('div', 'loading-title', 'センスウルトラ', el);
    this._createElement('div', 'loading-subtitle', '超感穿梭', el);
    this._createElement('div', 'loading-spinner', '', el);
    this._createElement('p',   'loading-text', '載入中…', el);
    this._loadingEl = el;
  }

  showLoading(text = 'Loading…') {
    this._loadingEl.querySelector('.loading-text').textContent = text;
    this._loadingEl.classList.remove('hidden');
  }

  hideLoading() {
    this._loadingEl.classList.add('hidden');
  }

  // ─── Screen Factory ──────────────────────────────────────────────────────────

  /** Create a screen DOM element and register it. Returns { el, update }. */
  _makeScreen(name) {
    const el = this._createElement('div', `screen screen-${name}`, '', this.container);
    const obj = { el, name, update: () => {} };
    this._screens[name] = obj;
    return obj;
  }

  // ─── Public Helpers (called from GameController) ──────────────────────────────

  /**
   * Open the intimacy interact panel for a given character data object.
   * charData: { id, name, type, greeting, intimacyLevel, ... }
   */
  openIntimacyScene(charData) {
    // Navigate to intimacy screen first if not active
    if (this.currentScreen !== 'intimacy') {
      this.showScreen('intimacy');
      this._setActiveNav('intimacy');
    }
    // Delegate to the internal _openInteract method
    this._openInteract(charData);
  }
}
