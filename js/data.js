// =============================================================
// data.js — Static game data (ES Module)
// =============================================================

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

export const ELEMENT = Object.freeze({ FIRE: 0, WATER: 1, WOOD: 2, LIGHT: 3, DARK: 4 });
export const RARITY  = Object.freeze({ N: 0, R: 1, SR: 2, SSR: 3 });

// ─────────────────────────────────────────────
// Attribute effectiveness chart
// rows = attacker element, cols = defender element
// ─────────────────────────────────────────────

export const ELEMENT_CHART = [
  //       FIRE  WATER  WOOD  LIGHT  DARK
  /* FIRE  */ [1.0,  0.5,  1.5,  1.0,  1.0],
  /* WATER */ [1.5,  1.0,  0.5,  1.0,  1.0],
  /* WOOD  */ [0.5,  1.5,  1.0,  1.0,  1.0],
  /* LIGHT */ [1.0,  1.0,  1.0,  1.0,  1.5],
  /* DARK  */ [1.0,  1.0,  1.0,  1.5,  1.0],
];

// ─────────────────────────────────────────────
// Characters (12 total)
// SSR×4  SR×4  R×2  N×2
// ─────────────────────────────────────────────

export const CHARACTERS = [

  // ── SSR ──────────────────────────────────────────────────────────

  {
    id: 'char_001',
    name: '蘭澤塔',
    portrait: 'assets/char_01_lanzeta.png',
    icon: 'assets/char_01_lanzeta_icon.png',
    element: ELEMENT.FIRE,
    rarity: RARITY.SSR,
    baseStats: { hp: 1200, atk: 500, rcv: 120 },
    maxStats:  { hp: 8000, atk: 3000, rcv: 600 },
    skillNormal: { name: '烈焰斬', element: ELEMENT.FIRE, multiplier: 1.0 },
    skillSpecial: { name: '超感・炎獄崩天', element: ELEMENT.FIRE, multiplier: 2.5, chargeNeeded: 15 },
    leaderSkill: {
      name: '覺衛之焰',
      description: '火屬性角色 ATK 2.5 倍',
      type: 'element_atk',
      element: ELEMENT.FIRE,
      multiplier: 2.5,
    },
    intimacyDialogues: [
      '……你是誰？別靠近我。我說的話，你聽到了嗎？',
      '今天的任務結束了。你……還在這裡？意外。',
      '一起並肩作戰，我才能安心把後背交給你。',
      '只有你……只有在你面前，我才不需要那道盔甲。',
      '蘭澤塔這個名字，以後就只允許你呼喚了。',
    ],
  },

  {
    id: 'char_002',
    name: '沃爾崔',
    portrait: 'assets/char_02_voltrei.png',
    icon: 'assets/char_02_voltrei_icon.png',
    element: ELEMENT.WATER,
    rarity: RARITY.SSR,
    baseStats: { hp: 1100, atk: 480, rcv: 140 },
    maxStats:  { hp: 7600, atk: 2900, rcv: 680 },
    skillNormal: { name: '寒冰刃', element: ELEMENT.WATER, multiplier: 1.0 },
    skillSpecial: { name: '超感・深淵寒流', element: ELEMENT.WATER, multiplier: 2.5, chargeNeeded: 15 },
    leaderSkill: {
      name: '深淵王座',
      description: '水屬性角色 ATK 2.5 倍、HP 1.3 倍',
      type: 'element_atk_hp',
      element: ELEMENT.WATER,
      multiplier: 2.5,
      hpMultiplier: 1.3,
    },
    intimacyDialogues: [
      '我以為你會逃。大多數人看見我都會逃。',
      '水往低處流，而我的目光……只往你那處流。',
      '替我守秘密，我以整個艦隊作報酬。',
      '你的體溫，比我想像中的還要暖。',
      '跟著我，就算沉入最深的黑海，我也會把你帶回來。',
    ],
  },

  {
    id: 'char_003',
    name: '森羅輝',
    portrait: 'assets/char_03_morira.png',
    icon: 'assets/char_03_morira_icon.png',
    element: ELEMENT.WOOD,
    rarity: RARITY.SSR,
    baseStats: { hp: 1300, atk: 460, rcv: 160 },
    maxStats:  { hp: 8500, atk: 2800, rcv: 750 },
    skillNormal: { name: '翠葉迴旋', element: ELEMENT.WOOD, multiplier: 1.0 },
    skillSpecial: { name: '超感・千樹蒼嵐', element: ELEMENT.WOOD, multiplier: 2.5, chargeNeeded: 15 },
    leaderSkill: {
      name: '原始林守護',
      description: '木屬性角色 ATK 2.5 倍、回復 2.0 倍',
      type: 'element_atk_rcv',
      element: ELEMENT.WOOD,
      multiplier: 2.5,
      rcvMultiplier: 2.0,
    },
    intimacyDialogues: [
      '這片森林認識我比任何人都久，但它從未像你這樣對我說話。',
      '我的眼睛只追蹤獵物，直到遇見你——才明白，有些存在是用來珍視的。',
      '把手放在這棵樹上，聽到了嗎？它在替我說我說不出口的話。',
      '和你在一起時，我不再需要那片森林的寂靜。',
      '輝——這個名字是父母給的。但今後，願它只活在你的呼吸裡。',
    ],
  },

  {
    id: 'char_004',
    name: '夜鴉·茲凡',
    portrait: 'assets/char_04_yaya_zvan.png',
    icon: 'assets/char_04_yaya_zvan_icon.png',
    element: ELEMENT.DARK,
    rarity: RARITY.SSR,
    baseStats: { hp: 1000, atk: 520, rcv: 100 },
    maxStats:  { hp: 7200, atk: 3100, rcv: 520 },
    skillNormal: { name: '暗翼斬', element: ELEMENT.DARK, multiplier: 1.0 },
    skillSpecial: { name: '超感・虛空侵蝕', element: ELEMENT.DARK, multiplier: 2.8, chargeNeeded: 18 },
    leaderSkill: {
      name: '夜鴉誓約',
      description: '闇屬性角色 ATK 3.0 倍（HP 70% 以下時觸發）',
      type: 'element_atk_conditional',
      element: ELEMENT.DARK,
      multiplier: 3.0,
      condition: 'hp_below_70',
    },
    intimacyDialogues: [
      '你到底在凝視什麼？這雙眼睛裡沒有值得你看的東西。',
      '我不相信任何人……但你讓我重新考慮這個命題。',
      '黑暗讓你害怕嗎？跟著我，黑暗只會保護你。',
      '把那個名字再叫一次。只要再叫一次，我就承認我輸了。',
      '茲凡這個名字，是我用鮮血換來的。現在，我把它交給你保管。',
    ],
  },

  // ── SR ──────────────────────────────────────────────────────────

  {
    id: 'char_005',
    name: '艾理',
    portrait: 'assets/char_06_airy.png',
    icon: 'assets/char_06_airy.png',
    element: ELEMENT.FIRE,
    rarity: RARITY.SR,
    baseStats: { hp: 800,  atk: 350, rcv: 90 },
    maxStats:  { hp: 5200, atk: 1800, rcv: 420 },
    skillNormal: { name: '火焰投擲', element: ELEMENT.FIRE, multiplier: 1.0 },
    skillSpecial: { name: '超感・熾焰爆裂', element: ELEMENT.FIRE, multiplier: 2.0, chargeNeeded: 12 },
    leaderSkill: {
      name: '熾焰鬥志',
      description: '火屬性角色 ATK 2.0 倍',
      type: 'element_atk',
      element: ELEMENT.FIRE,
      multiplier: 2.0,
    },
    intimacyDialogues: [
      '哼，你看什麼看？我才不在意你！',
      '……謝謝你幫我。只說一次，不要讓我再說第二次。',
      '你知道嗎，跟你在一起時，我的火焰燒得特別旺。',
      '別讓我等太久，我火氣上來可不好收拾的。',
      '你這個笨蛋……為什麼要讓我這麼在意你。',
    ],
  },

  {
    id: 'char_006',
    name: '蘇青',
    portrait: 'assets/char_05_suqing.png',
    icon: 'assets/char_05_suqing_icon.png',
    element: ELEMENT.WATER,
    rarity: RARITY.SR,
    baseStats: { hp: 850,  atk: 340, rcv: 110 },
    maxStats:  { hp: 5500, atk: 1750, rcv: 500 },
    skillNormal: { name: '水流衝擊', element: ELEMENT.WATER, multiplier: 1.0 },
    skillSpecial: { name: '超感・碧浪連環', element: ELEMENT.WATER, multiplier: 2.0, chargeNeeded: 12 },
    leaderSkill: {
      name: '清流之心',
      description: '水屬性角色回復效果 2.0 倍',
      type: 'element_rcv',
      element: ELEMENT.WATER,
      multiplier: 2.0,
    },
    intimacyDialogues: [
      '哦？你也迷路了嗎？真湊巧，我也是……才怪。我就是在等你。',
      '水能養萬物，也能淹沒萬物。你選擇相信我哪一面？',
      '跟你說話，有種說不出的舒適感。像是泡在溫泉裡。',
      '我的心，一直是流動的。只有遇見你，它才靜下來了。',
      '蘇青……這名字是我自己取的。喜歡嗎？為了你，我可以改。',
    ],
  },

  {
    id: 'char_007',
    name: '菲洛・亞爾',
    portrait: 'assets/char_07_philo.png',
    icon: 'assets/char_07_philo.png',
    element: ELEMENT.LIGHT,
    rarity: RARITY.SR,
    baseStats: { hp: 900,  atk: 330, rcv: 130 },
    maxStats:  { hp: 5800, atk: 1700, rcv: 580 },
    skillNormal: { name: '聖光刺擊', element: ELEMENT.LIGHT, multiplier: 1.0 },
    skillSpecial: { name: '超感・曙光審判', element: ELEMENT.LIGHT, multiplier: 2.0, chargeNeeded: 12 },
    leaderSkill: {
      name: '聖衛光環',
      description: '光屬性角色 HP 1.5 倍、回復效果 1.5 倍',
      type: 'element_hp_rcv',
      element: ELEMENT.LIGHT,
      hpMultiplier: 1.5,
      rcvMultiplier: 1.5,
    },
    intimacyDialogues: [
      '光明從不偏袒任何人……但我願意，只為你偏袒一次。',
      '守護是我的職責，但守護你，是我的意願。',
      '你的眼神讓我想起了第一道晨曦。純粹而刺眼。',
      '我見過無數的黑暗，但從沒有人像你這樣，讓黑暗退散。',
      '亞爾……在古語中是「最初的光」。願我，永遠是你的光。',
    ],
  },

  {
    id: 'char_008',
    name: '奧爾泰',
    portrait: 'assets/char_08_orltai.png',
    icon: 'assets/char_08_orltai.png',
    element: ELEMENT.DARK,
    rarity: RARITY.SR,
    baseStats: { hp: 780,  atk: 360, rcv: 80 },
    maxStats:  { hp: 5000, atk: 1850, rcv: 380 },
    skillNormal: { name: '暗影穿刺', element: ELEMENT.DARK, multiplier: 1.0 },
    skillSpecial: { name: '超感・滅絕暗流', element: ELEMENT.DARK, multiplier: 2.2, chargeNeeded: 14 },
    leaderSkill: {
      name: '暗域統御',
      description: '闇屬性角色 ATK 2.2 倍',
      type: 'element_atk',
      element: ELEMENT.DARK,
      multiplier: 2.2,
    },
    intimacyDialogues: [
      '在暗處觀察人是我的習慣。觀察你，是我的嗜好。',
      '別怕那道陰影，那是我在替你遮風。',
      '我不說謊。所以當我說「我只在意你」，那就是事實。',
      '你讓我想起了某個我以為早已失去的東西。',
      '奧爾泰這個名字，帶著詛咒。但對你，我願意解咒。',
    ],
  },

  // ── R ──────────────────────────────────────────────────────────

  {
    id: 'char_009',
    name: '葛林・尤',
    portrait: null,
    icon: null,
    element: ELEMENT.WOOD,
    rarity: RARITY.R,
    baseStats: { hp: 600,  atk: 200, rcv: 70 },
    maxStats:  { hp: 3800, atk: 1000, rcv: 320 },
    skillNormal: { name: '藤蔓纏繞', element: ELEMENT.WOOD, multiplier: 1.0 },
    skillSpecial: { name: '超感・翠綠爆發', element: ELEMENT.WOOD, multiplier: 1.5, chargeNeeded: 10 },
    leaderSkill: {
      name: '綠芽成長',
      description: '木屬性角色 ATK 1.5 倍',
      type: 'element_atk',
      element: ELEMENT.WOOD,
      multiplier: 1.5,
    },
    intimacyDialogues: [
      '我只是個普通人，沒什麼特別的……但你好像並不這麼認為。',
      '一起種棵樹吧，等它長大的時候，我們還在一起就好了。',
      '你說我有一雙好眼睛。那雙眼睛，現在只看你。',
      '我不會說什麼花言巧語，但我會用行動證明一切。',
      '尤——媽媽這樣叫我。你也可以，聽你叫感覺特別不同。',
    ],
  },

  {
    id: 'char_010',
    name: '夏羽',
    portrait: null,
    icon: null,
    element: ELEMENT.LIGHT,
    rarity: RARITY.R,
    baseStats: { hp: 650,  atk: 210, rcv: 85 },
    maxStats:  { hp: 4000, atk: 1050, rcv: 380 },
    skillNormal: { name: '閃光箭', element: ELEMENT.LIGHT, multiplier: 1.0 },
    skillSpecial: { name: '超感・光明箭雨', element: ELEMENT.LIGHT, multiplier: 1.5, chargeNeeded: 10 },
    leaderSkill: {
      name: '羽翼守護',
      description: '全屬性角色 HP 1.3 倍',
      type: 'all_hp',
      multiplier: 1.3,
    },
    intimacyDialogues: [
      '咦，你在看我？我臉上有東西嗎……（臉紅）',
      '一起飛翔的感覺……你能理解嗎？和你在一起時我就明白了。',
      '我的箭從不偏離目標，就像我的心，只指向你。',
      '有你在旁邊，連光都變得不一樣了。',
      '夏羽……你叫我的方式，讓這個名字變得閃閃發光。',
    ],
  },

  // ── N ──────────────────────────────────────────────────────────

  {
    id: 'char_011',
    name: '波林',
    portrait: null,
    icon: null,
    element: ELEMENT.WATER,
    rarity: RARITY.N,
    baseStats: { hp: 400,  atk: 100, rcv: 50 },
    maxStats:  { hp: 2500, atk: 500,  rcv: 220 },
    skillNormal: { name: '水珠彈射', element: ELEMENT.WATER, multiplier: 1.0 },
    skillSpecial: { name: '超感・水球齊射', element: ELEMENT.WATER, multiplier: 1.2, chargeNeeded: 8 },
    leaderSkill: {
      name: '漣漪之力',
      description: '水屬性角色 ATK 1.2 倍',
      type: 'element_atk',
      element: ELEMENT.WATER,
      multiplier: 1.2,
    },
    intimacyDialogues: [
      '我、我沒什麼特別的地方啦……你為什麼要跟我說話？',
      '謝謝你對我這麼好，我會努力變強的！',
      '你笑起來真好看。（說完立刻低頭）',
      '如果……如果可以的話，我想一直跟著你。',
      '波林這個名字……之前從沒人這樣溫柔地叫過我。',
    ],
  },

  {
    id: 'char_012',
    name: '影切・莫',
    portrait: null,
    icon: null,
    element: ELEMENT.DARK,
    rarity: RARITY.N,
    baseStats: { hp: 380,  atk: 110, rcv: 40 },
    maxStats:  { hp: 2400, atk: 520,  rcv: 180 },
    skillNormal: { name: '暗刃投擲', element: ELEMENT.DARK, multiplier: 1.0 },
    skillSpecial: { name: '超感・影切連斬', element: ELEMENT.DARK, multiplier: 1.2, chargeNeeded: 8 },
    leaderSkill: {
      name: '影中潛行',
      description: '闇屬性角色 ATK 1.2 倍',
      type: 'element_atk',
      element: ELEMENT.DARK,
      multiplier: 1.2,
    },
    intimacyDialogues: [
      '……跟我說話？你不怕我嗎。',
      '我的刀從不留情，但對你，我願意收刀入鞘。',
      '你說你信任我？沒有人對我說過這種話。',
      '影子是黑暗的存在，但有你在，連我都覺得有點光亮了。',
      '莫——那是我給自己的名字。今天起，也是你的秘密。',
    ],
  },
];

// ─────────────────────────────────────────────
// Stage data (30 stages, 3 areas × 10 stages)
// ─────────────────────────────────────────────

function makeEnemies(names, element, hp, atk) {
  return names.map(name => ({ name, element, hp, atk }));
}

function makeWaves(waveDefs) {
  return waveDefs.map(def => ({ enemies: def }));
}

export const STAGES = [

  // ══════════════════════════════
  // Area 0 — 教學關卡 (Tutorial)
  // 免費體力、弱敵、教學用
  // ══════════════════════════════

  {
    id: 'tutorial_1', area: 0, name: '教學：消除基礎',
    staminaCost: 0,
    waves: [{ enemies: [{ name: '訓練假人', element: 0, hp: 100, atk: 0, isBoss: false }] }],
    rewards: { gold: 500, exp: 100, freeGem: 30, firstClearGem: 0 },
    isTutorial: true, tutorialType: 'match',
  },
  {
    id: 'tutorial_2', area: 0, name: '教學：屬性剋制',
    staminaCost: 0,
    waves: [{ enemies: [{ name: '水屬訓練體', element: 1, hp: 200, atk: 0, isBoss: false }] }],
    rewards: { gold: 500, exp: 100, freeGem: 30, firstClearGem: 0 },
    isTutorial: true, tutorialType: 'element',
  },
  {
    id: 'tutorial_3', area: 0, name: '教學：超感技',
    staminaCost: 0,
    waves: [{ enemies: [{ name: '強化訓練體', element: 0, hp: 500, atk: 30, isBoss: false }] }],
    rewards: { gold: 1000, exp: 200, freeGem: 40, firstClearGem: 0 },
    isTutorial: true, tutorialType: 'skill',
  },

  // ══════════════════════════════
  // Area 1 — 崩壞前哨 (1-1 ~ 1-10)
  // HP 500→5000, ATK 50→300, Stamina 8→12
  // ══════════════════════════════

  {
    id: 'stage_1_1', area: 1, name: '崩壞前哨 1',
    staminaCost: 8,
    waves: makeWaves([
      makeEnemies(['異獸・火'], ELEMENT.FIRE, 500, 50),
    ]),
    rewards: { gold: 800, exp: 300, freeGem: 0, firstClearGem: 10 },
  },
  {
    id: 'stage_1_2', area: 1, name: '崩壞前哨 2',
    staminaCost: 8,
    waves: makeWaves([
      makeEnemies(['異獸・水', '異獸・火'], ELEMENT.WATER, 700, 65),
    ]),
    rewards: { gold: 900, exp: 350, freeGem: 0, firstClearGem: 10 },
  },
  {
    id: 'stage_1_3', area: 1, name: '崩壞前哨 3',
    staminaCost: 9,
    waves: makeWaves([
      makeEnemies(['野性異獸', '野性異獸'], ELEMENT.WOOD, 900, 80),
      makeEnemies(['守衛異獸'], ELEMENT.FIRE, 1200, 90),
    ]),
    rewards: { gold: 1000, exp: 400, freeGem: 0, firstClearGem: 10 },
  },
  {
    id: 'stage_1_4', area: 1, name: '崩壞前哨 4',
    staminaCost: 9,
    waves: makeWaves([
      makeEnemies(['前哨衛兵', '前哨衛兵'], ELEMENT.WATER, 1100, 100),
      makeEnemies(['精英異獸'], ELEMENT.DARK, 1500, 110),
    ]),
    rewards: { gold: 1100, exp: 450, freeGem: 0, firstClearGem: 10 },
  },
  {
    id: 'stage_1_5', area: 1, name: '崩壞前哨 5 ★BOSS',
    staminaCost: 10,
    waves: makeWaves([
      makeEnemies(['前哨衛兵', '前哨衛兵'], ELEMENT.FIRE, 1000, 90),
      makeEnemies(['精銳護衛', '精銳護衛'], ELEMENT.FIRE, 1200, 110),
      [{ name: 'BOSS: 焰爪領主', element: ELEMENT.FIRE, hp: 8000, atk: 200, isBoss: true }],
    ]),
    rewards: { gold: 2000, exp: 800, freeGem: 0, firstClearGem: 30 },
  },
  {
    id: 'stage_1_6', area: 1, name: '崩壞前哨 6',
    staminaCost: 10,
    waves: makeWaves([
      makeEnemies(['變異異獸', '變異異獸'], ELEMENT.WOOD, 1800, 130),
      makeEnemies(['進化異獸'], ELEMENT.WATER, 2200, 150),
    ]),
    rewards: { gold: 1300, exp: 500, freeGem: 0, firstClearGem: 10 },
  },
  {
    id: 'stage_1_7', area: 1, name: '崩壞前哨 7',
    staminaCost: 10,
    waves: makeWaves([
      makeEnemies(['暗影獸'], ELEMENT.DARK, 2000, 145),
      makeEnemies(['暗影獸', '暗影獸'], ELEMENT.DARK, 1800, 135),
    ]),
    rewards: { gold: 1400, exp: 550, freeGem: 0, firstClearGem: 10 },
  },
  {
    id: 'stage_1_8', area: 1, name: '崩壞前哨 8',
    staminaCost: 11,
    waves: makeWaves([
      makeEnemies(['光翼衛士'], ELEMENT.LIGHT, 2500, 165),
      makeEnemies(['光翼衛士', '暗爪獸'], ELEMENT.DARK, 2200, 155),
      makeEnemies(['強化異獸'], ELEMENT.FIRE, 3000, 175),
    ]),
    rewards: { gold: 1600, exp: 620, freeGem: 0, firstClearGem: 10 },
  },
  {
    id: 'stage_1_9', area: 1, name: '崩壞前哨 9',
    staminaCost: 11,
    waves: makeWaves([
      makeEnemies(['前哨精銳', '前哨精銳'], ELEMENT.WATER, 3200, 200),
      makeEnemies(['前哨精銳', '進化獸'], ELEMENT.FIRE, 3500, 220),
      makeEnemies(['強化衛士'], ELEMENT.LIGHT, 4000, 250),
    ]),
    rewards: { gold: 1800, exp: 700, freeGem: 0, firstClearGem: 10 },
  },
  {
    id: 'stage_1_10', area: 1, name: '崩壞前哨 10 ★BOSS',
    staminaCost: 12,
    waves: makeWaves([
      makeEnemies(['前哨精銳', '前哨精銳'], ELEMENT.WATER, 2500, 180),
      makeEnemies(['前哨精銳', '前哨精銳'], ELEMENT.FIRE, 2800, 200),
      [{ name: 'BOSS: 混沌前哨長', element: ELEMENT.DARK, hp: 18000, atk: 300, isBoss: true }],
    ]),
    rewards: { gold: 4000, exp: 1500, freeGem: 5, firstClearGem: 50 },
  },

  // ══════════════════════════════
  // Area 2 — 侵蝕地帶 (2-1 ~ 2-10)
  // HP 3000→20000, ATK 200→600, Stamina 12→18
  // ══════════════════════════════

  {
    id: 'stage_2_1', area: 2, name: '侵蝕地帶 1',
    staminaCost: 12,
    waves: makeWaves([
      makeEnemies(['侵蝕獸'], ELEMENT.DARK, 3000, 200),
    ]),
    rewards: { gold: 2000, exp: 800, freeGem: 0, firstClearGem: 10 },
  },
  {
    id: 'stage_2_2', area: 2, name: '侵蝕地帶 2',
    staminaCost: 13,
    waves: makeWaves([
      makeEnemies(['侵蝕衛兵', '侵蝕衛兵'], ELEMENT.WATER, 3500, 230),
      makeEnemies(['強化侵蝕獸'], ELEMENT.DARK, 4000, 250),
    ]),
    rewards: { gold: 2200, exp: 900, freeGem: 0, firstClearGem: 10 },
  },
  {
    id: 'stage_2_3', area: 2, name: '侵蝕地帶 3',
    staminaCost: 13,
    waves: makeWaves([
      makeEnemies(['變種侵蝕獸', '變種侵蝕獸'], ELEMENT.FIRE, 4200, 270),
      makeEnemies(['侵蝕精英'], ELEMENT.WATER, 5000, 300),
    ]),
    rewards: { gold: 2500, exp: 1000, freeGem: 0, firstClearGem: 10 },
  },
  {
    id: 'stage_2_4', area: 2, name: '侵蝕地帶 4',
    staminaCost: 14,
    waves: makeWaves([
      makeEnemies(['侵蝕騎士'], ELEMENT.DARK, 5500, 320),
      makeEnemies(['侵蝕騎士', '侵蝕衛兵'], ELEMENT.DARK, 5000, 300),
    ]),
    rewards: { gold: 2800, exp: 1100, freeGem: 0, firstClearGem: 10 },
  },
  {
    id: 'stage_2_5', area: 2, name: '侵蝕地帶 5 ★BOSS',
    staminaCost: 14,
    waves: makeWaves([
      makeEnemies(['侵蝕騎士', '侵蝕騎士'], ELEMENT.DARK, 5000, 300),
      makeEnemies(['侵蝕精英', '侵蝕精英'], ELEMENT.FIRE, 5500, 330),
      [{ name: 'BOSS: 侵蝕將領', element: ELEMENT.WATER, hp: 40000, atk: 420, isBoss: true }],
    ]),
    rewards: { gold: 6000, exp: 2500, freeGem: 0, firstClearGem: 30 },
  },
  {
    id: 'stage_2_6', area: 2, name: '侵蝕地帶 6',
    staminaCost: 15,
    waves: makeWaves([
      makeEnemies(['深淵衛士', '深淵衛士'], ELEMENT.DARK, 8000, 380),
      makeEnemies(['深淵精英'], ELEMENT.DARK, 9000, 400),
    ]),
    rewards: { gold: 3200, exp: 1300, freeGem: 0, firstClearGem: 10 },
  },
  {
    id: 'stage_2_7', area: 2, name: '侵蝕地帶 7',
    staminaCost: 15,
    waves: makeWaves([
      makeEnemies(['深淵騎士'], ELEMENT.WATER, 9500, 420),
      makeEnemies(['深淵騎士', '深淵衛士'], ELEMENT.DARK, 8500, 400),
      makeEnemies(['深淵精英'], ELEMENT.DARK, 10000, 440),
    ]),
    rewards: { gold: 3500, exp: 1400, freeGem: 0, firstClearGem: 10 },
  },
  {
    id: 'stage_2_8', area: 2, name: '侵蝕地帶 8',
    staminaCost: 16,
    waves: makeWaves([
      makeEnemies(['深淵守衛', '深淵守衛'], ELEMENT.FIRE, 11000, 470),
      makeEnemies(['深淵守衛', '深淵騎士'], ELEMENT.WATER, 10500, 450),
      makeEnemies(['深淵精銳'], ELEMENT.DARK, 13000, 500),
    ]),
    rewards: { gold: 4000, exp: 1600, freeGem: 0, firstClearGem: 10 },
  },
  {
    id: 'stage_2_9', area: 2, name: '侵蝕地帶 9',
    staminaCost: 17,
    waves: makeWaves([
      makeEnemies(['深淵精銳', '深淵精銳'], ELEMENT.DARK, 13000, 520),
      makeEnemies(['深淵精銳', '深淵騎士'], ELEMENT.WATER, 12000, 500),
      makeEnemies(['深淵將官'], ELEMENT.DARK, 16000, 560),
    ]),
    rewards: { gold: 4500, exp: 1800, freeGem: 0, firstClearGem: 10 },
  },
  {
    id: 'stage_2_10', area: 2, name: '侵蝕地帶 10 ★BOSS',
    staminaCost: 18,
    waves: makeWaves([
      makeEnemies(['深淵精銳', '深淵精銳'], ELEMENT.DARK, 12000, 500),
      makeEnemies(['深淵精銳', '深淵精銳'], ELEMENT.WATER, 13000, 520),
      [{ name: 'BOSS: 深淵侵蝕者', element: ELEMENT.DARK, hp: 80000, atk: 600, isBoss: true }],
    ]),
    rewards: { gold: 10000, exp: 4000, freeGem: 5, firstClearGem: 50 },
  },

  // ══════════════════════════════
  // Area 3 — 崩天核心 (3-1 ~ 3-10)
  // HP 10000→60000, ATK 400→1500, Stamina 18→25
  // ══════════════════════════════

  {
    id: 'stage_3_1', area: 3, name: '崩天核心 1',
    staminaCost: 18,
    waves: makeWaves([
      makeEnemies(['核心守衛'], ELEMENT.FIRE, 10000, 400),
    ]),
    rewards: { gold: 5000, exp: 2000, freeGem: 0, firstClearGem: 10 },
  },
  {
    id: 'stage_3_2', area: 3, name: '崩天核心 2',
    staminaCost: 19,
    waves: makeWaves([
      makeEnemies(['核心衛兵', '核心衛兵'], ELEMENT.WATER, 11000, 450),
      makeEnemies(['核心精英'], ELEMENT.DARK, 13000, 480),
    ]),
    rewards: { gold: 5500, exp: 2200, freeGem: 0, firstClearGem: 10 },
  },
  {
    id: 'stage_3_3', area: 3, name: '崩天核心 3',
    staminaCost: 20,
    waves: makeWaves([
      makeEnemies(['崩天異獸', '崩天異獸'], ELEMENT.WOOD, 14000, 520),
      makeEnemies(['崩天精英'], ELEMENT.FIRE, 16000, 560),
    ]),
    rewards: { gold: 6000, exp: 2400, freeGem: 0, firstClearGem: 10 },
  },
  {
    id: 'stage_3_4', area: 3, name: '崩天核心 4',
    staminaCost: 20,
    waves: makeWaves([
      makeEnemies(['崩天騎士'], ELEMENT.DARK, 17000, 600),
      makeEnemies(['崩天騎士', '核心衛兵'], ELEMENT.DARK, 15000, 580),
      makeEnemies(['崩天精銳'], ELEMENT.FIRE, 20000, 640),
    ]),
    rewards: { gold: 7000, exp: 2800, freeGem: 0, firstClearGem: 10 },
  },
  {
    id: 'stage_3_5', area: 3, name: '崩天核心 5 ★BOSS',
    staminaCost: 21,
    waves: makeWaves([
      makeEnemies(['崩天精銳', '崩天精銳'], ELEMENT.DARK, 18000, 650),
      makeEnemies(['崩天騎士', '崩天騎士'], ELEMENT.FIRE, 17000, 620),
      [{ name: 'BOSS: 崩天守門人', element: ELEMENT.WATER, hp: 120000, atk: 900, isBoss: true }],
    ]),
    rewards: { gold: 15000, exp: 6000, freeGem: 0, firstClearGem: 30 },
  },
  {
    id: 'stage_3_6', area: 3, name: '崩天核心 6',
    staminaCost: 22,
    waves: makeWaves([
      makeEnemies(['虛空衛士', '虛空衛士'], ELEMENT.DARK, 28000, 800),
      makeEnemies(['虛空精英'], ELEMENT.DARK, 32000, 850),
    ]),
    rewards: { gold: 8000, exp: 3200, freeGem: 0, firstClearGem: 10 },
  },
  {
    id: 'stage_3_7', area: 3, name: '崩天核心 7',
    staminaCost: 22,
    waves: makeWaves([
      makeEnemies(['虛空騎士'], ELEMENT.FIRE, 33000, 900),
      makeEnemies(['虛空騎士', '虛空衛士'], ELEMENT.DARK, 30000, 870),
      makeEnemies(['虛空精銳'], ELEMENT.DARK, 38000, 950),
    ]),
    rewards: { gold: 9000, exp: 3600, freeGem: 0, firstClearGem: 10 },
  },
  {
    id: 'stage_3_8', area: 3, name: '崩天核心 8',
    staminaCost: 23,
    waves: makeWaves([
      makeEnemies(['虛空精銳', '虛空精銳'], ELEMENT.WATER, 40000, 1050),
      makeEnemies(['虛空精銳', '虛空騎士'], ELEMENT.DARK, 38000, 1000),
      makeEnemies(['虛空將官'], ELEMENT.DARK, 45000, 1100),
    ]),
    rewards: { gold: 10000, exp: 4000, freeGem: 0, firstClearGem: 10 },
  },
  {
    id: 'stage_3_9', area: 3, name: '崩天核心 9',
    staminaCost: 24,
    waves: makeWaves([
      makeEnemies(['虛空將官', '虛空將官'], ELEMENT.DARK, 48000, 1200),
      makeEnemies(['虛空將官', '虛空精銳'], ELEMENT.FIRE, 45000, 1150),
      makeEnemies(['崩天先鋒'], ELEMENT.DARK, 55000, 1350),
    ]),
    rewards: { gold: 12000, exp: 5000, freeGem: 0, firstClearGem: 10 },
  },
  {
    id: 'stage_3_10', area: 3, name: '崩天核心 10 ★BOSS',
    staminaCost: 25,
    waves: makeWaves([
      makeEnemies(['崩天先鋒', '崩天先鋒'], ELEMENT.DARK, 50000, 1300),
      makeEnemies(['崩天先鋒', '虛空將官'], ELEMENT.FIRE, 48000, 1250),
      [{ name: 'BOSS: 混沌核心・零號', element: ELEMENT.DARK, hp: 300000, atk: 1500, isBoss: true }],
    ]),
    rewards: { gold: 30000, exp: 12000, freeGem: 10, firstClearGem: 100 },
  },
];

// ─────────────────────────────────────────────
// Gacha pools
// ─────────────────────────────────────────────

const allCharIds = CHARACTERS.map(c => c.id);

export const GACHA_POOLS = {
  standard: {
    name: '常駐池',
    characters: allCharIds,
    rates: { SSR: 0.03, SR: 0.12, R: 0.35, N: 0.50 },
  },
  limited: {
    name: '限定池・蘭澤塔',
    featured: 'char_001',
    characters: allCharIds,
    rates: { SSR: 0.03, SR: 0.12, R: 0.35, N: 0.50 },
    featuredRate: 0.5, // 50% chance the SSR is the featured character
  },
};

// ─────────────────────────────────────────────
// EXP table  (index = level 0..80, value = cumulative EXP)
// formula: exp(lv) = 100 * lv^2  →  cumulative = sum(100*i^2, i=1..lv)
// ─────────────────────────────────────────────

export const EXP_TABLE = (() => {
  const table = [0]; // level 0 → 0 cumulative
  for (let lv = 1; lv <= 80; lv++) {
    table.push(table[lv - 1] + 100 * lv * lv);
  }
  return Object.freeze(table);
})();

// ─────────────────────────────────────────────
// Breakthrough cost
// ─────────────────────────────────────────────

export const BREAKTHROUGH_COST = Object.freeze([
  { level: 40, materials: { elementStone: 5 },               gold: 50000 },
  { level: 60, materials: { elementStone: 10, rareStone: 3 }, gold: 150000 },
  { level: 80, materials: { elementStone: 20, rareStone: 10 }, gold: 500000 },
]);

// ─────────────────────────────────────────────
// Daily missions
// ─────────────────────────────────────────────

export const DAILY_MISSIONS = Object.freeze([
  { id: 'dm_001', name: '完成3場關卡',    description: '完成任意3場關卡戰鬥',         target: 3,  rewardType: 'exp',   rewardAmount: 500,   activityPoints: 10 },
  { id: 'dm_002', name: '消耗30體力',     description: '累計消耗體力 30 點',           target: 30, rewardType: 'gold',  rewardAmount: 2000,  activityPoints: 10 },
  { id: 'dm_003', name: '進行1次好感互動', description: '與任意角色進行一次好感互動',   target: 1,  rewardType: 'intimacyPoint', rewardAmount: 30, activityPoints: 10 },
  { id: 'dm_004', name: '登入遊戲',        description: '今日登入遊戲',                 target: 1,  rewardType: 'gem',   rewardAmount: 5,     activityPoints: 20 },
  { id: 'dm_005', name: '強化角色1次',     description: '對任意角色進行1次升級強化',    target: 1,  rewardType: 'gold',  rewardAmount: 1000,  activityPoints: 10 },
  { id: 'dm_006', name: '完成1場BOSS關',  description: '完成任意BOSS關卡（★BOSS標記）', target: 1,  rewardType: 'gem',   rewardAmount: 3,     activityPoints: 20 },
  { id: 'dm_007', name: '抽卡1次',         description: '在任意卡池進行1次抽取',        target: 1,  rewardType: 'exp',   rewardAmount: 200,   activityPoints: 10 },
  { id: 'dm_008', name: '突破角色或升星', description: '對任意角色進行突破或升星操作',  target: 1,  rewardType: 'rareStone', rewardAmount: 1, activityPoints: 20 },
]);

// Activity reward nodes (cumulative activity points thresholds)
export const ACTIVITY_NODES = Object.freeze([
  { threshold: 20,  reward: { type: 'gold',  amount: 2000  } },
  { threshold: 40,  reward: { type: 'gem',   amount: 5     } },
  { threshold: 60,  reward: { type: 'exp',   amount: 1000  } },
  { threshold: 80,  reward: { type: 'gem',   amount: 10    } },
  { threshold: 100, reward: { type: 'rareStone', amount: 1 } },
]);

// ─────────────────────────────────────────────
// Intimacy levels
// ─────────────────────────────────────────────

export const INTIMACY_LEVELS = Object.freeze([
  { level: 1,  pointsNeeded: 0,    unlock: null },
  { level: 2,  pointsNeeded: 50,   unlock: 'dialogue_2' },
  { level: 3,  pointsNeeded: 130,  unlock: 'dialogue_3' },
  { level: 4,  pointsNeeded: 250,  unlock: 'date_1' },
  { level: 5,  pointsNeeded: 420,  unlock: 'dialogue_5' },
  { level: 6,  pointsNeeded: 650,  unlock: 'date_2' },
  { level: 7,  pointsNeeded: 950,  unlock: 'dialogue_7' },
  { level: 8,  pointsNeeded: 1330, unlock: 'special_scene_1' },
  { level: 9,  pointsNeeded: 1800, unlock: 'date_3' },
  { level: 10, pointsNeeded: 2400, unlock: 'r18_cg_1' },
]);

// ─────────────────────────────────────────────
// Story dialogues
// ─────────────────────────────────────────────

export const DIALOGUES = {
  // Prologue scene 1: Awakening
  prologue_1: {
    id: 'prologue_1',
    title: '覺醒',
    bgm: 'story',
    background: 'bg_03_base_interior',
    lines: [
      { speaker: null, text: '——你聽見了嗎？那個聲音。', type: 'narration' },
      { speaker: null, text: '不是耳朵聽見的。是從意識深處，像水波一樣擴散開的震動。', type: 'narration' },
      { speaker: '蘇青', text: '……什麼聲音？', avatar: 'char_05_suqing' },
      { speaker: null, text: '你睜開眼，發現自己躺在醫療區的床上。白色天花板，消毒水的氣味。', type: 'narration' },
      { speaker: null, text: '一個金髮男人坐在床邊，手裡拿著資料板。他注意到你的目光，露出一個專業而溫和的笑容。', type: 'narration' },
      { speaker: '菲洛·亞爾', text: '你醒了。感覺怎麼樣？', avatar: 'char_07_philo' },
      { speaker: '蘇青', text: '……頭很痛。我為什麼會在這裡？', avatar: 'char_05_suqing' },
      { speaker: '菲洛·亞爾', text: '你在曉城第七區的裂縫突發事件中暴露了。記得嗎？', avatar: 'char_07_philo' },
      { speaker: '蘇青', text: '裂縫……對，我記得。地面突然裂開，紫色的光——然後那些東西從裡面爬出來……', avatar: 'char_05_suqing' },
      { speaker: '菲洛·亞爾', text: '異獸。牠們是幽界的產物。一般人遇到異獸，通常不會有機會躺在這裡回憶。', avatar: 'char_07_philo' },
      { speaker: '菲洛·亞爾', text: '但你不是一般人。', avatar: 'char_07_philo' },
      { speaker: '蘇青', text: '什麼意思？', avatar: 'char_05_suqing' },
      { speaker: '菲洛·亞爾', text: '在裂縫前，你的身體釋放了一種特殊的能量頻率。我們的監測站捕捉到了。', avatar: 'char_07_philo' },
      { speaker: '菲洛·亞爾', text: '那個頻率，讓附近的一位哨兵——我們的蘭隊長——感官過載的症狀暫時得到了壓制。', avatar: 'char_07_philo' },
      { speaker: '菲洛·亞爾', text: '簡單來說……你是超感者。嚮導型。', avatar: 'char_07_philo' },
      { speaker: '蘇青', text: '……超感者？', avatar: 'char_05_suqing' },
      {
        speaker: null, type: 'choice',
        choices: [
          { text: '我能問問……我到底是什麼嗎？', next: null },
          { text: '這跟我有什麼關係？', next: null },
        ],
      },
      { speaker: '菲洛·亞爾', text: '超感者有三種類型：哨兵、嚮導、越域者。你屬於第二種。', avatar: 'char_07_philo' },
      { speaker: '菲洛·亞爾', text: '嚮導的能力，不是攻擊，而是——穩定。', avatar: 'char_07_philo' },
      { speaker: '菲洛·亞爾', text: '你的共鳴頻率非常特殊。一般嚮導只能與特定屬性的哨兵進行共鳴——你的頻率，是全屬性相容的。', avatar: 'char_07_philo' },
      { speaker: '菲洛·亞爾', text: '這在我們的記錄裡，只出現過兩次。', avatar: 'char_07_philo' },
      { speaker: '蘇青', text: '……那第一次是誰？', avatar: 'char_05_suqing' },
      { speaker: '菲洛·亞爾', text: '這個，等你正式加入我們之後，再說吧。', avatar: 'char_07_philo' },
      {
        speaker: null, type: 'choice',
        choices: [
          { text: '我加入。', next: 'prologue_2' },
          { text: '我需要時間考慮。', next: 'prologue_2' },
        ],
      },
    ],
  },

  // Prologue scene 2: First meeting with Lanzeta
  prologue_2: {
    id: 'prologue_2',
    title: '火焰大隊',
    bgm: 'story',
    background: 'bg_03_base_interior',
    lines: [
      { speaker: null, text: '菲洛帶你穿過基地走廊，來到一間訓練室前。', type: 'narration' },
      { speaker: null, text: '門是開的。裡面，一個銀白短髮的男人正獨自站在訓練場中央，右眼的傷疤在冷光下格外醒目。', type: 'narration' },
      { speaker: '菲洛·亞爾', text: '蘭隊長，新的嚮導候補生到了。', avatar: 'char_07_philo' },
      { speaker: null, text: '那個男人——蘭澤塔——轉過頭，冰冷的視線掃過你。', type: 'narration' },
      { speaker: '蘭澤塔', text: '……', avatar: 'char_01_lanzeta' },
      { speaker: '蘭澤塔', text: '又一個。', avatar: 'char_01_lanzeta' },
      { speaker: '菲洛·亞爾', text: '這位是蘇青。就是那天在第七區——', avatar: 'char_07_philo' },
      { speaker: '蘭澤塔', text: '我知道。', avatar: 'char_01_lanzeta' },
      { speaker: null, text: '他的語氣像是在確認一個不重要的事實。', type: 'narration' },
      { speaker: '蘭澤塔', text: '新人留在基地訓練。別跟著出任務。礙事。', avatar: 'char_01_lanzeta' },
      { speaker: null, text: '說完，他拿起外套轉身離開。擦過你肩膀時，你感覺到了——', type: 'narration' },
      { speaker: null, text: '那個頻率。', type: 'narration' },
      { speaker: null, text: '他的感官在過載的邊緣掙扎。像是收音機被調到了最大音量，所有頻道同時湧入。', type: 'narration' },
      { speaker: null, text: '你什麼都沒做。但你能感覺到。', type: 'narration' },
      { speaker: '菲洛·亞爾', text: '……你感覺到了，對吧。', avatar: 'char_07_philo' },
      { speaker: '菲洛·亞爾', text: '他不承認，但他需要一個嚮導。非常需要。', avatar: 'char_07_philo' },
      { speaker: '菲洛·亞爾', text: '別在意他的態度。他對所有新人都這樣。', avatar: 'char_07_philo' },
      {
        speaker: null, type: 'choice',
        choices: [
          { text: '他看起來很痛苦。', next: null },
          { text: '他是不是很討厭我？', next: null },
          { text: '……我想幫他。', next: null },
        ],
      },
      { speaker: '菲洛·亞爾', text: '好了，先去訓練場熟悉一下基本操作吧。', avatar: 'char_07_philo' },
      { speaker: null, text: '【進入教學關卡】', type: 'system', trigger: 'start_tutorial' },
    ],
  },

  // Prologue scene 3: Night before mission
  prologue_3: {
    id: 'prologue_3',
    title: '前夜',
    bgm: 'intimate',
    background: 'bg_03_base_interior',
    lines: [
      { speaker: null, text: '基地宿舍。你的房間。窗外能看見遠處天際線的裂縫殘光。', type: 'narration' },
      { speaker: null, text: '門口傳來腳步聲。蘭澤塔站在那裡，手裡拿著一個包裹。', type: 'narration' },
      { speaker: '蘭澤塔', text: '明天的任務裝備。', avatar: 'char_01_lanzeta' },
      { speaker: '蘇青', text: '……謝謝？', avatar: 'char_05_suqing' },
      { speaker: '蘭澤塔', text: '不是謝我。這是規定程序。', avatar: 'char_01_lanzeta' },
      { speaker: null, text: '他轉身要走。', type: 'narration' },
      { speaker: '蘇青', text: '……你的感官，現在怎樣了？', avatar: 'char_05_suqing' },
      { speaker: null, text: '他的腳步停住了。沒有回頭。', type: 'narration' },
      { speaker: '蘭澤塔', text: '……比昨天好。', avatar: 'char_01_lanzeta' },
      { speaker: '蘇青', text: '是因為我嗎？', avatar: 'char_05_suqing' },
      { speaker: '蘭澤塔', text: '……數據顯示，嚮導的共鳴能量在 24 小時內有殘留效果。', avatar: 'char_01_lanzeta' },
      { speaker: '蘭澤塔', text: '是「數據」說的。', avatar: 'char_01_lanzeta' },
      { speaker: '蘇青', text: '好，是數據說的。', avatar: 'char_05_suqing' },
      { speaker: null, text: '他離去前，低聲說：', type: 'narration' },
      { speaker: '蘭澤塔', text: '明天，跟緊我。', avatar: 'char_01_lanzeta' },
      { speaker: '蘭澤塔', text: '別亂跑。', avatar: 'char_01_lanzeta' },
      { speaker: null, text: '他消失在走廊。', type: 'narration' },
      { speaker: null, text: '「跟緊我」——不知道為什麼，這句話讓你安心到想笑。', type: 'narration' },
      { speaker: null, text: '【序章結束。第一章：幽闇森林 開啟】', type: 'system', trigger: 'unlock_chapter_1' },
    ],
  },

  // Chapter 1 scene 1: Departure
  chapter1_1: {
    id: 'chapter1_1',
    title: '幽闇森林',
    bgm: 'battle',
    background: 'bg_02_dark_forest',
    triggerBefore: 'stage_1_1',
    lines: [
      { speaker: null, text: '幽闇森林。曉城外圍最近的侵蝕地帶。', type: 'narration' },
      { speaker: null, text: '巨大的扭曲樹木遮蔽了天空，菌類在樹幹上發出幽藍微光。空氣潮濕而沉重，帶著泥土和不屬於陽界的甜腐氣息。', type: 'narration' },
      { speaker: '蘭澤塔', text: '保持警戒。這裡的裂縫密度比預報高。', avatar: 'char_01_lanzeta' },
      { speaker: '艾理', text: '哼，區區幽闇森林，我自己就能——', avatar: 'char_06_airy' },
      { speaker: '蘭澤塔', text: '艾理。', avatar: 'char_01_lanzeta' },
      { speaker: '艾理', text: '……是。', avatar: 'char_06_airy' },
      { speaker: null, text: '艾理瞪了你一眼。那眼神很複雜——不全是敵意，更像是……不甘心。', type: 'narration' },
      { speaker: '蘇青', text: '（她好像不太喜歡我……）', avatar: 'char_05_suqing' },
      { speaker: '蘭澤塔', text: '前方偵測到異獸反應。準備戰鬥。', avatar: 'char_01_lanzeta' },
      { speaker: null, text: '【進入關卡 1-1】', type: 'system', trigger: 'start_stage_1_1' },
    ],
  },

  // Chapter 1 scene 2: First encounter with Morira (triggers after 1-3)
  chapter1_2: {
    id: 'chapter1_2',
    title: '林間的他',
    bgm: 'story',
    background: 'bg_02_dark_forest',
    triggerAfter: 'stage_1_3',
    lines: [
      { speaker: null, text: '連續清除了幾波異獸後，隊伍在一處相對安全的空地休息。', type: 'narration' },
      { speaker: null, text: '你注意到樹叢裡有動靜——不是異獸。是人。', type: 'narration' },
      { speaker: null, text: '一個黑色長髮的男人從林間走出，手上沾著泥土，像是從森林深處走了很久。', type: 'narration' },
      { speaker: '蘭澤塔', text: '……森羅輝。', avatar: 'char_01_lanzeta' },
      { speaker: '森羅輝', text: '……嗯。', avatar: 'char_03_morira' },
      { speaker: null, text: '他的眼神從蘭澤塔移到你身上，停留了幾秒。', type: 'narration' },
      { speaker: '森羅輝', text: '新人？', avatar: 'char_03_morira' },
      { speaker: '蘭澤塔', text: '嚮導。全頻共鳴型。', avatar: 'char_01_lanzeta' },
      { speaker: null, text: '森羅輝的表情變了——非常微小，但你能感覺到，他的注意力整個聚焦在你身上。', type: 'narration' },
      { speaker: '森羅輝', text: '……有意思。', avatar: 'char_03_morira' },
      { speaker: '森羅輝', text: '這片森林的深處有一條舊裂縫。最近的活動異常。你們是來調查的？', avatar: 'char_03_morira' },
      { speaker: '蘭澤塔', text: '你一個人在這裡多久了？', avatar: 'char_01_lanzeta' },
      { speaker: '森羅輝', text: '三天。', avatar: 'char_03_morira' },
      { speaker: '森羅輝', text: '這裡的樹說——有什麼東西要醒了。', avatar: 'char_03_morira' },
      { speaker: '艾理', text: '……樹不會說話吧？', avatar: 'char_06_airy' },
      { speaker: '森羅輝', text: '你聽。', avatar: 'char_03_morira' },
      { speaker: null, text: '所有人安靜下來。風穿過扭曲的枝幹，發出低沉的嗚咽。', type: 'narration' },
      { speaker: null, text: '然後你感覺到了——地底深處，某種巨大的東西在翻動。', type: 'narration' },
      { speaker: '蘭澤塔', text: '……全員，繼續深入。森羅輝，你帶路。', avatar: 'char_01_lanzeta' },
      { speaker: '森羅輝', text: '……嗯。', avatar: 'char_03_morira' },
    ],
  },

  // Chapter 1 scene 3: Before boss (triggers after 1-9)
  chapter1_3: {
    id: 'chapter1_3',
    title: '幽森之心',
    bgm: 'boss',
    background: 'bg_04_boss_arena',
    triggerAfter: 'stage_1_9',
    lines: [
      { speaker: null, text: '森林的最深處。一棵巨大到遮蔽整片天空的古樹。', type: 'narration' },
      { speaker: null, text: '它的根系深入地底數百米，枝幹上纏繞著發光的幽界能量——紫色的脈絡像血管一樣在樹皮下搏動。', type: 'narration' },
      { speaker: '森羅輝', text: '……就是這裡。', avatar: 'char_03_morira' },
      { speaker: '森羅輝', text: '這棵樹曾經是守護這片森林的古靈。大崩之後，裂縫的能量侵蝕了它。它不再是守護者了。', avatar: 'char_03_morira' },
      { speaker: '蘭澤塔', text: '目標確認。異獸核心體——「幽森主」。', avatar: 'char_01_lanzeta' },
      { speaker: '艾理', text: '這傢伙好大……我們真的打得贏嗎？', avatar: 'char_06_airy' },
      { speaker: '蘭澤塔', text: '蘇青。', avatar: 'char_01_lanzeta' },
      { speaker: '蘇青', text: '……在。', avatar: 'char_05_suqing' },
      { speaker: '蘭澤塔', text: '我需要你的共鳴。全力。', avatar: 'char_01_lanzeta' },
      { speaker: null, text: '他第一次正面看著你。那雙金色的眼睛裡，有你從未見過的東西——信任。', type: 'narration' },
      {
        speaker: null, type: 'choice',
        choices: [
          { text: '交給我。', next: null },
          { text: '我會保護好你。', next: null },
        ],
      },
      { speaker: '蘭澤塔', text: '……走。', avatar: 'char_01_lanzeta' },
      { speaker: null, text: '【進入 Boss 關卡 1-10】', type: 'system', trigger: 'start_stage_1_10' },
    ],
  },

  // Chapter 1 ending (triggers after 1-10)
  chapter1_end: {
    id: 'chapter1_end',
    title: '認可',
    bgm: 'story',
    background: 'bg_02_dark_forest',
    triggerAfter: 'stage_1_10',
    lines: [
      { speaker: null, text: '幽森主倒下了。扭曲的古樹轟然崩塌，幽界的紫色能量像潮水一樣退去。', type: 'narration' },
      { speaker: null, text: '陽光第一次穿透樹冠，照進了這片被侵蝕百年的森林。', type: 'narration' },
      { speaker: '艾理', text: '我們……贏了？', avatar: 'char_06_airy' },
      { speaker: '森羅輝', text: '……嗯。森林在說謝謝。', avatar: 'char_03_morira' },
      { speaker: '艾理', text: '好啦我知道樹不會說話——但這次我好像真的聽到了什麼。', avatar: 'char_06_airy' },
      { speaker: null, text: '蘭澤塔走到你面前。他的呼吸還有些急促，右手微微顫抖——戰鬥中感官過載的後遺症。', type: 'narration' },
      { speaker: null, text: '他看著你。然後，做了一件所有人都沒預料到的事。', type: 'narration' },
      { speaker: null, text: '他伸出右手。', type: 'narration' },
      { speaker: '蘭澤塔', text: '……做得不錯。', avatar: 'char_01_lanzeta' },
      { speaker: null, text: '艾理張大了嘴。菲洛在通訊頻道那頭輕笑。', type: 'narration' },
      { speaker: null, text: '你握住他的手。他的手很燙，帶著戰鬥殘留的火焰能量餘溫。', type: 'narration' },
      { speaker: '蘭澤塔', text: '下次任務，你繼續跟隊。', avatar: 'char_01_lanzeta' },
      { speaker: '蘭澤塔', text: '不是命令。是——', avatar: 'char_01_lanzeta' },
      { speaker: null, text: '他頓了一下。', type: 'narration' },
      { speaker: '蘭澤塔', text: '……請求。', avatar: 'char_01_lanzeta' },
      { speaker: null, text: '你笑了。第一次，在這個崩壞的世界裡，你找到了留下來的理由。', type: 'narration' },
      { speaker: null, text: '【第一章完結】', type: 'system', trigger: 'chapter_1_complete' },
      { speaker: null, text: '第二章「深淵的呼喚」即將開啟……', type: 'narration' },
    ],
  },
};
