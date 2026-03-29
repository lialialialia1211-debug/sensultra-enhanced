// economy.js — GameEconomy: stamina, currency, gacha, daily quests
// Pure logic, no rendering. ES Module.

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STAMINA_REGEN_SECONDS = 360;     // 6 minutes per 1 stamina
const SINGLE_PULL_COST = 150;          // gems per single pull
const TEN_PULL_COST = 1500;            // gems per 10-pull
const PITY_SOFT_START = 70;            // soft pity begins at pull 70
const PITY_HARD_CAP = 80;              // guaranteed SSR at pull 80
const BASE_SSR_RATE = 0.03;            // 3% base SSR rate
const SOFT_PITY_INCREMENT = 0.05;      // +5% per pull after soft pity starts
const FEATURED_RATE_NO_GUARANTEE = 0.5;// 50% chance SSR is the featured unit
const CHARGE_NEEDED_DEFAULT = 15;

// Daily quest definitions
const DAILY_QUEST_DEFS = [
  { id: 'dq_login',     name: '登入遊戲',       target: 1,   activity: 10, reward: { gold: 1000 } },
  { id: 'dq_battles',   name: '完成 3 場戰鬥',   target: 3,   activity: 15, reward: { freeGem: 20 } },
  { id: 'dq_orbs',      name: '消除 100 顆珠子', target: 100, activity: 10, reward: { gold: 1500 } },
  { id: 'dq_combo',     name: '達成 10 COMBO',   target: 10,  activity: 15, reward: { freeGem: 20 } },
  { id: 'dq_special',   name: '使用 1 次超感技',  target: 1,   activity: 10, reward: { gold: 1000 } },
  { id: 'dq_stamina',   name: '消耗 50 體力',    target: 50,  activity: 15, reward: { freeGem: 20 } },
  { id: 'dq_enhance',   name: '強化 1 次角色',   target: 1,   activity: 10, reward: { gold: 2000 } },
  { id: 'dq_intimacy',  name: '進行 1 次親密互動', target: 1,  activity: 15, reward: { freeGem: 40 } },
];

// Activity reward tiers (cumulative thresholds)
const ACTIVITY_TIERS = [
  { tier: 1, threshold: 20,  reward: { gold: 5000 } },
  { tier: 2, threshold: 40,  reward: { freeGem: 30 } },
  { tier: 3, threshold: 60,  reward: { expMaterial: 3 } },
  { tier: 4, threshold: 80,  reward: { freeGem: 50 } },
  { tier: 5, threshold: 100, reward: { pullTicket: 1 } },
];

// Pool definition helper (caller provides poolId → pool config mapping)
// Default built-in pools for standalone use:
const DEFAULT_POOLS = {
  standard: { featured: false, featuredCharId: null },
  limited:  { featured: true,  featuredCharId: 'featured_001' },
};

// ---------------------------------------------------------------------------
// Seeded PRNG — Linear Congruential Generator (deterministic for testing)
// ---------------------------------------------------------------------------

class SeededRNG {
  /**
   * @param {number} seed — integer seed; defaults to Date.now() for live play
   */
  constructor(seed = Date.now()) {
    this.state = seed >>> 0; // 32-bit unsigned
  }

  /** Returns a float in [0, 1) */
  next() {
    // LCG constants from Numerical Recipes
    this.state = (Math.imul(1664525, this.state) + 1013904223) >>> 0;
    return this.state / 0x100000000;
  }
}

// ---------------------------------------------------------------------------
// Gacha rarity tables
// ---------------------------------------------------------------------------

// Simple rarity draw: returns 'SSR' | 'SR' | 'R'
function drawRarity(rng, pityCounter, isGuaranteedSSR) {
  if (isGuaranteedSSR) return 'SSR';

  let ssrRate = BASE_SSR_RATE;
  if (pityCounter >= PITY_SOFT_START) {
    const extra = (pityCounter - PITY_SOFT_START + 1) * SOFT_PITY_INCREMENT;
    ssrRate = Math.min(1.0, BASE_SSR_RATE + extra);
  }

  const roll = rng.next();
  if (roll < ssrRate) return 'SSR';
  if (roll < ssrRate + 0.12) return 'SR'; // 12% SR base
  return 'R';
}

// ---------------------------------------------------------------------------
// GameEconomy
// ---------------------------------------------------------------------------

export class GameEconomy {
  /**
   * @param {Object|null} saveData — Persisted economy state from SaveManager
   * @param {number}      [rngSeed] — Optional fixed seed for deterministic gacha (testing)
   * @param {Object}      [pools]   — Pool definitions override
   */
  constructor(saveData, rngSeed = undefined, pools = DEFAULT_POOLS) {
    this.freeGem              = saveData?.freeGem              ?? 500;
    this.paidGem              = saveData?.paidGem              ?? 0;
    this.gold                 = saveData?.gold                 ?? 10000;
    this.stamina              = saveData?.stamina              ?? 80;
    this.charFragments        = saveData?.charFragments        ?? {};
    this.maxStamina           = saveData?.maxStamina           ?? 80;
    this.lastStaminaTime      = saveData?.lastStaminaTime      ?? Date.now();
    this.dailyQuests          = saveData?.dailyQuests          ?? [];
    this.activityPoints       = saveData?.activityPoints       ?? 0;
    this.claimedActivityTiers = saveData?.claimedActivityTiers ?? [];
    this.pityCounter          = saveData?.pityCounter          ?? 0;
    this.guaranteedFeatured   = saveData?.guaranteedFeatured   ?? false;
    this.pools                = pools;

    // RNG — fixed seed makes gacha deterministic for unit tests
    this._rng = new SeededRNG(rngSeed ?? Date.now());

    // Auto-init daily quests if not loaded from save
    if (this.dailyQuests.length === 0) {
      this.initDailyQuests();
    }
  }

  // ---------------------------------------------------------------------------
  // Stamina
  // ---------------------------------------------------------------------------

  /**
   * Recalculate stamina based on elapsed time. Call this before any stamina check.
   */
  updateStamina() {
    if (this.stamina >= this.maxStamina) {
      this.lastStaminaTime = Date.now();
      return;
    }

    const now = Date.now();
    const elapsed = Math.floor((now - this.lastStaminaTime) / 1000); // seconds
    const recovered = Math.floor(elapsed / STAMINA_REGEN_SECONDS);

    if (recovered > 0) {
      this.stamina = Math.min(this.maxStamina, this.stamina + recovered);
      // Advance timer by the portion we consumed, keep remainder
      this.lastStaminaTime += recovered * STAMINA_REGEN_SECONDS * 1000;

      if (this.stamina >= this.maxStamina) {
        this.lastStaminaTime = Date.now();
      }
    }
  }

  /**
   * Consume stamina for entering a stage.
   * @param {number} cost
   * @returns {boolean} success
   */
  useStamina(cost) {
    this.updateStamina();
    if (this.stamina < cost) return false;
    this.stamina -= cost;
    return true;
  }

  /**
   * Seconds until the next +1 stamina tick.
   * @returns {number}
   */
  getTimeToNextStamina() {
    if (this.stamina >= this.maxStamina) return 0;
    const now = Date.now();
    const elapsed = Math.floor((now - this.lastStaminaTime) / 1000);
    const remaining = STAMINA_REGEN_SECONDS - (elapsed % STAMINA_REGEN_SECONDS);
    return remaining;
  }

  // ---------------------------------------------------------------------------
  // Currency
  // ---------------------------------------------------------------------------

  /**
   * @param {number} amount
   * @param {'free'|'paid'} type
   */
  addGems(amount, type = 'free') {
    if (amount <= 0) return;
    if (type === 'paid') {
      this.paidGem += amount;
    } else {
      this.freeGem += amount;
    }
  }

  /**
   * Spend gems; free gems are consumed first.
   * @param {number} amount
   * @returns {boolean} success
   */
  spendGems(amount) {
    const total = this.freeGem + this.paidGem;
    if (total < amount) return false;

    let remaining = amount;
    const freeSpent = Math.min(this.freeGem, remaining);
    this.freeGem -= freeSpent;
    remaining -= freeSpent;

    if (remaining > 0) {
      this.paidGem -= remaining;
    }
    return true;
  }

  /** @param {number} amount */
  addGold(amount) {
    if (amount > 0) this.gold += amount;
  }

  /**
   * @param {number} amount
   * @returns {boolean} success
   */
  spendGold(amount) {
    if (this.gold < amount) return false;
    this.gold -= amount;
    return true;
  }

  // ---------------------------------------------------------------------------
  // Gacha
  // ---------------------------------------------------------------------------

  /**
   * Perform a single pull on the given pool.
   * @param {string} poolId
   * @returns {{ charId: string, rarity: string, isFeatured: boolean } | null} null if insufficient gems
   */
  pullSingle(poolId) {
    if (!this.spendGems(SINGLE_PULL_COST)) return null;
    return this._doPull(poolId);
  }

  /**
   * Perform a 10-pull on the given pool.
   * Guarantees at least 1 SR-or-above result.
   * @param {string} poolId
   * @returns {Array<{ charId: string, rarity: string, isFeatured: boolean }> | null} null if insufficient gems
   */
  pullTen(poolId) {
    if (!this.spendGems(TEN_PULL_COST)) return null;

    const results = [];
    for (let i = 0; i < 10; i++) {
      results.push(this._doPull(poolId));
    }

    // Guarantee: if no SR or SSR, replace the last R with an SR
    const hasSrOrAbove = results.some(r => r.rarity === 'SR' || r.rarity === 'SSR');
    if (!hasSrOrAbove) {
      const lastR = results.reduceRight((found, r, idx) => found ?? (r.rarity === 'R' ? idx : null), null);
      if (lastR !== null) {
        results[lastR] = this._buildResult('SR', poolId);
      }
    }

    return results;
  }

  // ---------------------------------------------------------------------------
  // Daily quests
  // ---------------------------------------------------------------------------

  /**
   * (Re-)initialise 8 daily quests. Resets progress and claim status.
   */
  initDailyQuests() {
    this.dailyQuests = DAILY_QUEST_DEFS.map(def => ({
      ...def,
      progress: 0,
      completed: false,
      claimed: false,
    }));
    this.activityPoints = 0;
    this.claimedActivityTiers = [];
  }

  /**
   * Update the progress of a specific quest.
   * @param {string} questId
   * @param {number} progress — incremental amount (added to current)
   * @returns {{ quest: Object, justCompleted: boolean }}
   */
  checkQuest(questId, progress) {
    const quest = this.dailyQuests.find(q => q.id === questId);
    if (!quest || quest.completed) return { quest, justCompleted: false };

    quest.progress = Math.min(quest.target, quest.progress + progress);
    const justCompleted = quest.progress >= quest.target;
    if (justCompleted) quest.completed = true;

    return { quest, justCompleted };
  }

  /**
   * Claim the reward for a completed quest.
   * @param {string} questId
   * @returns {{ success: boolean, reward: Object, activityPoints: number } | null}
   */
  claimQuestReward(questId) {
    const quest = this.dailyQuests.find(q => q.id === questId);
    if (!quest || !quest.completed || quest.claimed) return null;

    quest.claimed = true;
    this._applyReward(quest.reward);
    this.activityPoints += quest.activity;

    return {
      success: true,
      reward: quest.reward,
      activityPoints: this.activityPoints,
    };
  }

  /**
   * Claim an activity tier reward.
   * @param {number} tier — 1-based tier index
   * @returns {{ success: boolean, reward: Object } | null}
   */
  claimActivityReward(tier) {
    const tierDef = ACTIVITY_TIERS.find(t => t.tier === tier);
    if (!tierDef) return null;
    if (this.activityPoints < tierDef.threshold) return null;
    if (this.claimedActivityTiers.includes(tier)) return null;

    this.claimedActivityTiers = [...this.claimedActivityTiers, tier];
    this._applyReward(tierDef.reward);

    return { success: true, reward: tierDef.reward };
  }

  // ---------------------------------------------------------------------------
  // Serialisation
  // ---------------------------------------------------------------------------

  serialize() {
    return {
      freeGem:              this.freeGem,
      paidGem:              this.paidGem,
      gold:                 this.gold,
      stamina:              this.stamina,
      charFragments:        this.charFragments ?? {},
      maxStamina:           this.maxStamina,
      lastStaminaTime:      this.lastStaminaTime,
      dailyQuests:          this.dailyQuests,
      activityPoints:       this.activityPoints,
      claimedActivityTiers: this.claimedActivityTiers,
      pityCounter:          this.pityCounter,
      guaranteedFeatured:   this.guaranteedFeatured,
    };
  }

  static deserialize(data) {
    return new GameEconomy(data);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Core single-pull logic. Mutates pity state.
   * @param {string} poolId
   * @returns {{ charId: string, rarity: string, isFeatured: boolean }}
   */
  _doPull(poolId) {
    this.pityCounter++;

    const isHardPity = this.pityCounter >= PITY_HARD_CAP;
    const rarity = drawRarity(this._rng, this.pityCounter, isHardPity);

    if (rarity === 'SSR') {
      this.pityCounter = 0;
    }

    return this._buildResult(rarity, poolId);
  }

  /**
   * Build a result object for a given rarity.
   * Handles featured / guarantee logic for SSR.
   * @param {string} rarity
   * @param {string} poolId
   * @returns {{ charId: string, rarity: string, isFeatured: boolean }}
   */
  _buildResult(rarity, poolId) {
    const pool = this.pools[poolId] ?? this.pools.standard;
    let isFeatured = false;
    let charId;

    if (rarity === 'SSR' && pool.featured) {
      if (this.guaranteedFeatured || this._rng.next() < FEATURED_RATE_NO_GUARANTEE) {
        isFeatured = true;
        charId = pool.featuredCharId ?? `${poolId}_ssr_featured`;
        this.guaranteedFeatured = false;
      } else {
        // Off-banner SSR → next SSR guaranteed featured
        isFeatured = false;
        charId = `${poolId}_ssr_offbanner`;
        this.guaranteedFeatured = true;
      }
    } else if (rarity === 'SSR') {
      charId = `${poolId}_ssr_${Math.floor(this._rng.next() * 10)}`;
    } else if (rarity === 'SR') {
      charId = `${poolId}_sr_${Math.floor(this._rng.next() * 20)}`;
    } else {
      charId = `${poolId}_r_${Math.floor(this._rng.next() * 30)}`;
    }

    return { charId, rarity, isFeatured };
  }

  /**
   * Apply a reward object to the economy state.
   * @param {Object} reward
   */
  _applyReward(reward) {
    if (!reward) return;
    if (reward.gold)        this.addGold(reward.gold);
    if (reward.freeGem)     this.addGems(reward.freeGem, 'free');
    if (reward.paidGem)     this.addGems(reward.paidGem, 'paid');
    if (reward.pullTicket)  this.addGems(reward.pullTicket * SINGLE_PULL_COST, 'free');
    // expMaterial and other item rewards are returned as-is; inventory handles them
  }
}
