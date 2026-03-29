// battle.js — BattleManager: wave-based combat system
// Pure logic, no rendering. ES Module.

// Element chart: attacker element → defender element → multiplier
// Keys are lowercase strings; also supports numeric ELEMENT constants (0-4) via helper.
const ELEMENT_CHART = {
  fire:  { fire: 1.0, water: 0.5, wood: 1.5, light: 1.0, dark: 1.0, heart: 1.0 },
  water: { fire: 1.5, water: 1.0, wood: 0.5, light: 1.0, dark: 1.0, heart: 1.0 },
  wood:  { fire: 0.5, water: 1.5, wood: 1.0, light: 1.0, dark: 1.0, heart: 1.0 },
  light: { fire: 1.0, water: 1.0, wood: 1.0, light: 1.0, dark: 1.5, heart: 1.0 },
  dark:  { fire: 1.0, water: 1.0, wood: 1.0, light: 1.5, dark: 1.0, heart: 1.0 },
  heart: { fire: 1.0, water: 1.0, wood: 1.0, light: 1.0, dark: 1.0, heart: 1.0 },
};

// Convert numeric ELEMENT constant (0-4) or uppercase string to lowercase key
const ELEMENT_NUM_TO_STR = ['fire', 'water', 'wood', 'light', 'dark'];
function normalizeElement(el) {
  if (typeof el === 'number') return ELEMENT_NUM_TO_STR[el] ?? 'fire';
  if (typeof el === 'string') return el.toLowerCase();
  return 'fire';
}

// Match size → damage multiplier
const MATCH_MULTIPLIER = {
  3: 1.0,
  4: 1.3,
  5: 1.6,
  6: 2.0,
};
const MATCH_MULTIPLIER_7PLUS = 2.5;

/**
 * Returns the match multiplier for a given number of orbs matched.
 * @param {number} count
 * @returns {number}
 */
function getMatchMultiplier(count) {
  if (count >= 7) return MATCH_MULTIPLIER_7PLUS;
  return MATCH_MULTIPLIER[count] ?? 1.0;
}

/**
 * Returns the combo multiplier for a given combo count.
 * Formula: 1.25 + (combo - 1) * 0.25
 * @param {number} combo — 1-based combo count
 * @returns {number}
 */
function getComboMultiplier(combo) {
  return 1.25 + (combo - 1) * 0.25;
}

export class BattleManager {
  /**
   * @param {Object[]} team — Array of 5 Character objects
   * @param {Object}   stageData — Stage definition including waves, rewards, etc.
   */
  constructor(team, stageData) {
    this.team = team;                  // Character[] (5 members)
    this.stage = stageData;
    this.currentWave = 0;
    this.enemies = [];                 // Enemies in the current wave
    this.turn = 0;
    this.state = 'PLAYER_TURN';        // PLAYER_TURN | ANIMATING | ENEMY_TURN | WIN | LOSE
    this.teamHp = 0;                   // Current total team HP (initialised in startBattle)
    this.teamMaxHp = 0;                // Max total team HP
    this.chargeMap = {};               // { charId: currentCharge }
    this._battleStarted = false;
  }

  // ---------------------------------------------------------------------------
  // Initialisation
  // ---------------------------------------------------------------------------

  /**
   * Initialise the battle: compute team HP and spawn the first wave of enemies.
   */
  startBattle() {
    const leaderHpMult = this._getLeaderHpMultiplier();

    this.teamMaxHp = this.team.reduce((sum, c) => sum + (c.hp ?? 0), 0) * leaderHpMult;
    this.teamHp = this.teamMaxHp;

    // Initialise charge counters
    this.chargeMap = {};
    for (const char of this.team) {
      this.chargeMap[char.id] = 0;
    }

    this.currentWave = 0;
    this.turn = 0;
    this._battleStarted = true;
    this._spawnWave(this.currentWave);
    this.state = 'PLAYER_TURN';
  }

  // ---------------------------------------------------------------------------
  // Player turn
  // ---------------------------------------------------------------------------

  /**
   * Process a player turn given the chain result from Board.resolveChain().
   *
   * Expected chainResult shape:
   * {
   *   matches: [{ element: string, count: number }],  // per-match group
   *   totalCombo: number,
   *   heartCount: number,   // total heart orbs matched (optional shortcut)
   * }
   *
   * Returns:
   * {
   *   damages: [{ target: Enemy, damage: number, element: string, isCrit: boolean, isAoe: boolean }],
   *   heals: number,          // total HP healed
   *   skillsCharged: string[] // char IDs whose skill became ready this turn
   * }
   */
  processPlayerTurn(chainResult) {
    if (this.state !== 'PLAYER_TURN') {
      return { damages: [], heals: 0, skillsCharged: [] };
    }

    const { matches = [], totalCombo = 1 } = chainResult;

    const allDamages = [];
    const skillsCharged = [];
    let totalHeal = 0;

    // Accumulate charge per element across all matches
    const elementOrbCount = {};

    for (let matchIdx = 0; matchIdx < matches.length; matchIdx++) {
      const match = matches[matchIdx];
      const element = normalizeElement(match.element);
      const count   = match.count;

      // Heart orbs → healing, no damage
      if (element === 'heart') {
        totalHeal += this._calcHeal(count);
        continue;
      }

      // Track orbs per element for charging
      elementOrbCount[element] = (elementOrbCount[element] ?? 0) + count;

      // Find team members whose element matches (normalize both sides)
      let attackers = this.team.filter(c => normalizeElement(c.element) === element && (c.hp ?? 1) > 0);
      let offElementPenalty = 1.0;

      // Off-element fallback: if no matching element, strongest alive member attacks at 50%
      if (attackers.length === 0) {
        const alive = this.team.filter(c => (c.hp ?? 1) > 0);
        if (alive.length > 0) {
          attackers = [alive.reduce((best, c) => (c.atk ?? 0) > (best.atk ?? 0) ? c : best)];
          offElementPenalty = 0.5;
        }
      }
      if (attackers.length === 0) continue;

      const matchMult = getMatchMultiplier(count);
      const comboMult = getComboMultiplier(totalCombo);
      const leaderMult = this._getLeaderAtkMultiplier(element);
      const isAoe = count >= 5;

      for (const attacker of attackers) {
        const specialMult = this._getSpecialMultiplier(attacker);
        const baseAtk = attacker.atk ?? 0;

        // Determine target(s)
        const targets = isAoe
          ? this.enemies.filter(e => e.hp > 0)
          : [this._getFirstAliveEnemy()].filter(Boolean);

        for (const target of targets) {
          const targetElement = normalizeElement(target.element);
          const elemMult = (ELEMENT_CHART[element]?.[targetElement] ?? 1.0);
          const rawDamage =
            baseAtk * matchMult * comboMult * elemMult * leaderMult * specialMult * offElementPenalty;
          const damage = Math.floor(rawDamage);

          allDamages.push({
            target,
            damage,
            element,
            isCrit: false,   // crit system placeholder
            isAoe,
          });

          // Apply damage to enemy immediately so subsequent matches reflect kills
          target.hp = Math.max(0, target.hp - damage);
        }
      }
    }

    // Apply charging from orbs consumed
    for (const [element, orbCount] of Object.entries(elementOrbCount)) {
      const chargeable = this.team.filter(c => normalizeElement(c.element) === element);
      for (const char of chargeable) {
        const prev = this.chargeMap[char.id] ?? 0;
        const chargeNeeded = char.chargeNeeded ?? 15;

        if (prev < chargeNeeded) {
          const next = Math.min(prev + orbCount, chargeNeeded);
          this.chargeMap[char.id] = next;

          if (next >= chargeNeeded) {
            skillsCharged.push(char.id);
          }
        }
      }
    }

    // Heal team
    if (totalHeal > 0) {
      this.teamHp = Math.min(this.teamMaxHp, this.teamHp + totalHeal);
    }

    this.turn++;
    // Keep PLAYER_TURN state so checkWaveEnd / checkBattleEnd can evaluate correctly.
    // The caller (GameController) is responsible for transitioning to ENEMY_TURN.

    return { damages: allDamages, heals: totalHeal, skillsCharged };
  }

  // ---------------------------------------------------------------------------
  // Enemy turn
  // ---------------------------------------------------------------------------

  /**
   * Process all alive enemies attacking the team.
   * Damage model: enemy ATK (flat, no elemental variance).
   *
   * Returns:
   * { attacks: [{ enemy: Enemy, damage: number }], teamHpAfter: number }
   */
  processEnemyTurn() {
    if (this.state !== 'ENEMY_TURN') {
      return { attacks: [], teamHpAfter: this.teamHp };
    }

    const attacks = [];

    for (const enemy of this.enemies) {
      if (enemy.hp <= 0) continue;

      const damage = enemy.atk ?? 0;
      this.teamHp = Math.max(0, this.teamHp - damage);

      attacks.push({ enemy, damage });
    }

    this.state = 'PLAYER_TURN';

    return { attacks, teamHpAfter: this.teamHp };
  }

  // ---------------------------------------------------------------------------
  // Wave / battle lifecycle
  // ---------------------------------------------------------------------------

  /**
   * Check if all enemies in the current wave are dead.
   * If so, advance to the next wave or transition to WIN.
   * Returns 'NEXT_WAVE' | 'WIN' | null
   */
  checkWaveEnd() {
    const allDead = this.enemies.every(e => e.hp <= 0);
    if (!allDead) return null;

    const waves = this.stage?.waves ?? [];
    const nextWave = this.currentWave + 1;

    if (nextWave < waves.length) {
      this.currentWave = nextWave;
      this._spawnWave(this.currentWave);
      this.state = 'PLAYER_TURN';
      return 'NEXT_WAVE';
    }

    this.state = 'WIN';
    return 'WIN';
  }

  /**
   * Check overall battle end conditions.
   * Returns 'WIN' | 'LOSE' | null
   */
  checkBattleEnd() {
    if (this.teamHp <= 0) {
      this.state = 'LOSE';
      return 'LOSE';
    }
    if (this.state === 'WIN') return 'WIN';
    return null;
  }

  /**
   * Get battle rewards upon victory.
   * Returns { gold, exp, materials, firstClearBonus }
   */
  getBattleResult() {
    const rewards = this.stage?.rewards ?? {};
    const isFirstClear = this.stage?.firstClearBonus && !this.stage?.alreadyCleared;

    return {
      gold: rewards.gold ?? 0,
      exp: rewards.exp ?? 0,
      materials: rewards.materials ?? [],
      firstClearBonus: isFirstClear
        ? (this.stage.firstClearBonus ?? {})
        : null,
    };
  }

  // ---------------------------------------------------------------------------
  // Special (超感技) activation
  // ---------------------------------------------------------------------------

  /**
   * Attempt to trigger a character's special skill.
   * Resets the charge counter on success.
   * @param {string} charId
   * @returns {boolean} Whether the skill was triggered
   */
  triggerSpecial(charId) {
    const char = this.team.find(c => c.id === charId);
    if (!char) return false;

    const chargeNeeded = char.chargeNeeded ?? 15;
    if ((this.chargeMap[charId] ?? 0) < chargeNeeded) return false;

    // Mark as active for this turn; caller handles effect resolution
    this.chargeMap[charId] = 0;
    char._specialActive = true;
    return true;
  }

  /**
   * Clear the active-special flag after damage is calculated.
   * @param {string} charId
   */
  clearSpecialFlag(charId) {
    const char = this.team.find(c => c.id === charId);
    if (char) char._specialActive = false;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  _spawnWave(waveIndex) {
    const waves = this.stage?.waves ?? [];
    const waveDef = waves[waveIndex];
    if (!waveDef) {
      this.enemies = [];
      return;
    }
    // Deep-copy enemies so HP mutations don't affect stage definition
    this.enemies = (waveDef.enemies ?? []).map(e => ({ ...e }));
  }

  _getFirstAliveEnemy() {
    return this.enemies.find(e => e.hp > 0) ?? null;
  }

  /**
   * Compute heal amount from heart orbs.
   * Formula: sum of all team members' RCV × heartCount
   * @param {number} heartCount
   * @returns {number}
   */
  _calcHeal(heartCount) {
    const totalRcv = this.team.reduce((sum, c) => sum + (c.rcv ?? 0), 0);
    return Math.floor(totalRcv * heartCount);
  }

  /**
   * Leader HP multiplier.
   * First team member is treated as leader.
   * @returns {number}
   */
  _getLeaderHpMultiplier() {
    const leader = this.team[0];
    if (!leader?.leaderSkill) return 1.0;
    const ls = leader.leaderSkill;
    // data.js format: { type, hpMultiplier } or { type: 'all_hp', multiplier }
    if (ls.hpMultiplier) return ls.hpMultiplier;
    if (ls.type === 'all_hp' && ls.multiplier) return ls.multiplier;
    return 1.0;
  }

  /**
   * Leader ATK multiplier for a given element.
   * Only one leader (team[0]) is used.
   * @param {string} element
   * @returns {number}
   */
  _getLeaderAtkMultiplier(element) {
    const leader = this.team[0];
    if (!leader?.leaderSkill) return 1.0;
    const ls = leader.leaderSkill;

    // Support data.js leaderSkill format: { type, element (numeric), multiplier }
    const leaderElemStr = normalizeElement(ls.element ?? -1);

    switch (ls.type) {
      case 'element_atk':
      case 'element_atk_hp':
      case 'element_atk_rcv':
        // ATK bonus applies when the attacker's element matches the leader skill element
        if (element === leaderElemStr && ls.multiplier) return ls.multiplier;
        break;
      case 'element_atk_conditional':
        // Simplified: apply multiplier (full condition check handled by battle engine)
        if (element === leaderElemStr && ls.multiplier) return ls.multiplier;
        break;
      default:
        break;
    }

    // Legacy flat fields (for future extensibility)
    if (ls.atkMultiplier) return ls.atkMultiplier;
    if (ls.elementBonuses?.[element]) return ls.elementBonuses[element];
    return 1.0;
  }

  /**
   * Special skill damage multiplier for a character.
   * Returns the skill's multiplier if the special is active, otherwise 1.0.
   * @param {Object} char
   * @returns {number}
   */
  _getSpecialMultiplier(char) {
    if (!char._specialActive) return 1.0;
    const mult = char.specialSkill?.multiplier ?? 1.5;
    // Clamp to valid range 1.5–3.0
    return Math.min(3.0, Math.max(1.5, mult));
  }
}
