// =============================================================
// character.js — Character runtime logic (ES Module)
// =============================================================

import {
  EXP_TABLE,
  BREAKTHROUGH_COST,
  INTIMACY_LEVELS,
  ELEMENT,
} from './data.js';

// ─────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────

/**
 * Interpolate a stat from base (Lv1) to max (Lv80) using a power curve.
 * formula: stat = base + (max - base) * ((level - 1) / 79) ^ 1.5
 */
function interpolateStat(base, max, level) {
  const t = Math.pow((level - 1) / 79, 1.5);
  return Math.round(base + (max - base) * t);
}

/**
 * Return the level that corresponds to a given cumulative EXP total.
 * Searches EXP_TABLE (index = level).
 */
function levelFromExp(totalExp) {
  let lv = 1;
  for (let i = 1; i < EXP_TABLE.length; i++) {
    if (totalExp >= EXP_TABLE[i]) {
      lv = i;
    } else {
      break;
    }
  }
  return lv;
}

// Level caps per breakthrough tier (0 = not broken through)
const LEVEL_CAPS = Object.freeze([20, 40, 60, 80]);

// ─────────────────────────────────────────────
// Character class
// ─────────────────────────────────────────────

export class Character {
  /**
   * @param {object} charData   - Static data record from CHARACTERS array
   * @param {number} level      - Current level (1–80)
   * @param {number} stars      - Current star rank (1–5)
   */
  constructor(charData, level = 1, stars = 1) {
    this._data = charData; // immutable reference to static data

    // Mutable runtime state (always treated as value snapshots)
    this._level              = Math.max(1, Math.min(80, level));
    this._stars              = Math.max(1, Math.min(5, stars));
    this._totalExp           = EXP_TABLE[this._level - 1] ?? 0;
    this._breakthroughTier   = 0; // 0=none, 1=Lv40, 2=Lv60, 3=Lv80
    this._currentCharge      = 0;
    this._intimacyPoints     = 0;
    this._intimacyLevel      = 1;
    this._unlockedContent    = [];
  }

  // ── Identity ──────────────────────────────

  get id()      { return this._data.id; }
  get name()    { return this._data.name; }
  get element() { return this._data.element; }
  get rarity()  { return this._data.rarity; }
  get level()   { return this._level; }
  get stars()   { return this._stars; }

  // ── Stats ─────────────────────────────────

  /**
   * Returns current stats accounting for level curve and star multiplier.
   * All values are immutable snapshots (new object each call).
   */
  getStats() {
    const { baseStats, maxStats } = this._data;
    const starMult = this.getStarMultiplier();
    return Object.freeze({
      hp:  Math.round(interpolateStat(baseStats.hp,  maxStats.hp,  this._level) * starMult),
      atk: Math.round(interpolateStat(baseStats.atk, maxStats.atk, this._level) * starMult),
      rcv: Math.round(interpolateStat(baseStats.rcv, maxStats.rcv, this._level) * starMult),
    });
  }

  // ── Levelling ─────────────────────────────

  /**
   * Add experience points and update level.
   * Respects the active level cap determined by breakthrough tier.
   * Returns a frozen result object describing what changed.
   */
  addExp(amount) {
    if (amount <= 0) return Object.freeze({ gained: 0, levelBefore: this._level, levelAfter: this._level, capped: false });

    const cap       = LEVEL_CAPS[this._breakthroughTier];
    const levelBefore = this._level;

    if (this._level >= cap) {
      return Object.freeze({ gained: 0, levelBefore, levelAfter: this._level, capped: true });
    }

    const newTotalExp = this._totalExp + amount;
    const rawLevel    = levelFromExp(newTotalExp);
    const newLevel    = Math.min(rawLevel, cap);

    return Object.freeze({
      gained:      amount,
      levelBefore,
      levelAfter:  newLevel,
      capped:      newLevel === cap && rawLevel > cap,
      // Apply changes — returns new character state as mutation on this instance
      _apply: () => {
        this._totalExp = newTotalExp;
        this._level    = newLevel;
      },
    });
  }

  /**
   * Convenience wrapper — apply EXP gain immediately.
   */
  gainExp(amount) {
    const result = this.addExp(amount);
    if (result._apply) result._apply();
    return Object.freeze({ gained: result.gained, levelBefore: result.levelBefore, levelAfter: result.levelAfter, capped: result.capped });
  }

  // ── Breakthrough ──────────────────────────

  /**
   * Check whether breakthrough is currently possible.
   * @param {object} inventory  - e.g. { elementStone: 10, rareStone: 3, gold: 200000 }
   */
  canBreakthrough(inventory = {}) {
    if (this._breakthroughTier >= BREAKTHROUGH_COST.length) return false;

    const req = BREAKTHROUGH_COST[this._breakthroughTier];
    if (this._level < req.level) return false;
    if ((inventory.gold ?? 0) < req.gold) return false;

    for (const [mat, qty] of Object.entries(req.materials)) {
      if ((inventory[mat] ?? 0) < qty) return false;
    }
    return true;
  }

  /**
   * Perform breakthrough.
   * Returns frozen result with `success`, `consumed` materials, or `reason` on failure.
   * Does NOT mutate the inventory — caller must handle deduction.
   */
  breakthrough(inventory = {}) {
    if (!this.canBreakthrough(inventory)) {
      return Object.freeze({ success: false, reason: 'Requirements not met' });
    }

    const req = BREAKTHROUGH_COST[this._breakthroughTier];
    this._breakthroughTier += 1;

    return Object.freeze({
      success:  true,
      tier:     this._breakthroughTier,
      newCap:   LEVEL_CAPS[this._breakthroughTier] ?? 80,
      consumed: Object.freeze({ ...req.materials, gold: req.gold }),
    });
  }

  get breakthroughTier() { return this._breakthroughTier; }

  get levelCap() { return LEVEL_CAPS[this._breakthroughTier]; }

  // ── Stars ─────────────────────────────────

  /** All-stat multiplier: +10% per additional star above 1. */
  getStarMultiplier() {
    return 1 + (this._stars - 1) * 0.1;
  }

  /**
   * Raise star rank by 1 (max 5).
   * Returns frozen result with success flag.
   */
  upgradeStar() {
    if (this._stars >= 5) return Object.freeze({ success: false, reason: 'Already at maximum stars' });
    const before = this._stars;
    this._stars  = before + 1;
    return Object.freeze({ success: true, starsBefore: before, starsAfter: this._stars, multiplier: this.getStarMultiplier() });
  }

  // ── Special skill charge ───────────────────

  /**
   * Add charge from orb matches.
   * Each orb of the character's element counts as 1 charge; off-element counts as 0.5.
   * @param {Array<number>} orbElements - array of element values collected this turn
   */
  addCharge(orbElements) {
    const gained = orbElements.reduce((sum, el) => sum + (el === this._data.element ? 1 : 0.5), 0);
    this._currentCharge = Math.min(this._currentCharge + gained, this._data.skillSpecial.chargeNeeded);
    return Object.freeze({ gained, currentCharge: this._currentCharge });
  }

  canUseSpecial() {
    return this._currentCharge >= this._data.skillSpecial.chargeNeeded;
  }

  get currentCharge() { return this._currentCharge; }

  get chargeNeeded() { return this._data.skillSpecial.chargeNeeded; }

  /**
   * Activate special skill.
   * Returns the skill data snapshot; resets charge to 0.
   */
  useSpecial() {
    if (!this.canUseSpecial()) return Object.freeze({ success: false, reason: 'Not enough charge' });
    this._currentCharge = 0;
    return Object.freeze({
      success: true,
      skill:   Object.freeze({ ...this._data.skillSpecial }),
    });
  }

  // ── Leader skill ──────────────────────────

  /**
   * Calculate leader bonus multipliers for the whole team.
   * @param {Character[]} team - array of Character instances
   * @returns {{ atkMult: number, hpMult: number, rcvMult: number }}
   */
  getLeaderBonus(team) {
    const ls = this._data.leaderSkill;
    let atkMult = 1.0;
    let hpMult  = 1.0;
    let rcvMult = 1.0;

    switch (ls.type) {
      case 'element_atk': {
        const hasMatch = team.some(c => c.element === ls.element);
        if (hasMatch) atkMult = ls.multiplier;
        break;
      }
      case 'element_atk_hp': {
        const hasMatch = team.some(c => c.element === ls.element);
        if (hasMatch) { atkMult = ls.multiplier; hpMult = ls.hpMultiplier ?? 1.0; }
        break;
      }
      case 'element_atk_rcv': {
        const hasMatch = team.some(c => c.element === ls.element);
        if (hasMatch) { atkMult = ls.multiplier; rcvMult = ls.rcvMultiplier ?? 1.0; }
        break;
      }
      case 'element_hp_rcv': {
        const hasMatch = team.some(c => c.element === ls.element);
        if (hasMatch) { hpMult = ls.hpMultiplier ?? 1.0; rcvMult = ls.rcvMultiplier ?? 1.0; }
        break;
      }
      case 'all_hp': {
        hpMult = ls.multiplier;
        break;
      }
      case 'element_atk_conditional': {
        // Conditional bonuses are resolved by the battle engine; return base here.
        const hasMatch = team.some(c => c.element === ls.element);
        if (hasMatch) atkMult = ls.multiplier;
        break;
      }
      default:
        break;
    }

    return Object.freeze({ atkMult, hpMult, rcvMult });
  }

  // ── Intimacy ──────────────────────────────

  /**
   * Add intimacy points and advance intimacy level if thresholds are crossed.
   * Returns a frozen result with newly unlocked content (if any).
   */
  addIntimacy(points) {
    if (points <= 0) return Object.freeze({ gained: 0, levelBefore: this._intimacyLevel, levelAfter: this._intimacyLevel, newUnlocks: [] });

    const levelBefore  = this._intimacyLevel;
    this._intimacyPoints += points;
    const newUnlocks   = [];

    for (const node of INTIMACY_LEVELS) {
      if (node.level > this._intimacyLevel && this._intimacyPoints >= node.pointsNeeded) {
        this._intimacyLevel = node.level;
        if (node.unlock && !this._unlockedContent.includes(node.unlock)) {
          this._unlockedContent = [...this._unlockedContent, node.unlock];
          newUnlocks.push(node.unlock);
        }
      }
    }

    return Object.freeze({
      gained:        points,
      totalPoints:   this._intimacyPoints,
      levelBefore,
      levelAfter:    this._intimacyLevel,
      newUnlocks:    Object.freeze(newUnlocks),
    });
  }

  getIntimacyLevel() {
    return this._intimacyLevel;
  }

  getIntimacyPoints() {
    return this._intimacyPoints;
  }

  /**
   * Returns a frozen copy of all currently unlocked content keys.
   */
  getUnlockedContent() {
    return Object.freeze([...this._unlockedContent]);
  }

  /**
   * Returns the dialogue string for the given dialogue index (0-based),
   * or null if not yet unlocked.
   */
  getDialogue(index) {
    const dialogues = this._data.intimacyDialogues;
    if (index < 0 || index >= dialogues.length) return null;
    return dialogues[index];
  }

  // ── Serialization ─────────────────────────

  /**
   * Produces a plain JSON-compatible object that fully represents runtime state.
   * Static data is referenced by id only (not duplicated).
   */
  serialize() {
    return {
      charId:           this._data.id,
      level:            this._level,
      stars:            this._stars,
      totalExp:         this._totalExp,
      breakthroughTier: this._breakthroughTier,
      currentCharge:    this._currentCharge,
      intimacyPoints:   this._intimacyPoints,
      intimacyLevel:    this._intimacyLevel,
      unlockedContent:  [...this._unlockedContent],
    };
  }

  /**
   * Reconstruct a Character from a serialized snapshot.
   * @param {object} data       - Output of serialize()
   * @param {object[]} charDb   - The CHARACTERS array from data.js
   */
  static deserialize(data, charDb) {
    const charData = charDb.find(c => c.id === data.charId);
    if (!charData) throw new Error(`Character not found: ${data.charId}`);

    const instance = new Character(charData, data.level, data.stars);
    instance._totalExp         = data.totalExp         ?? EXP_TABLE[data.level - 1] ?? 0;
    instance._breakthroughTier = data.breakthroughTier ?? 0;
    instance._currentCharge    = data.currentCharge    ?? 0;
    instance._intimacyPoints   = data.intimacyPoints   ?? 0;
    instance._intimacyLevel    = data.intimacyLevel    ?? 1;
    instance._unlockedContent  = Array.isArray(data.unlockedContent) ? [...data.unlockedContent] : [];
    return instance;
  }

  // ── Debug helpers ─────────────────────────

  toString() {
    const s = this.getStats();
    return `[${this.id}] ${this.name} Lv${this._level}★${this._stars} HP:${s.hp} ATK:${s.atk} RCV:${s.rcv}`;
  }
}
