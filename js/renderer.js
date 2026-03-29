// renderer.js — Canvas Renderer for Match-3 RPG
// Handles board drawing, battle scene, HUD, and effects

export class GameRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.canvas.width = 540;
    this.canvas.height = 960;

    // Layout regions
    this.boardArea   = { x: 10,  y: 500, width: 520, height: 370 };
    this.battleArea  = { x: 0,   y: 60,  width: 540, height: 440 };
    this.hudArea     = { x: 0,   y: 0,   width: 540, height: 60  };

    // Board is 7 cols x 5 rows (matches Board class default: rows=5, cols=7)
    this.COLS = 7;
    this.ROWS = 5;
    this.cellSize = Math.min(
      Math.floor(this.boardArea.width  / this.COLS),
      Math.floor(this.boardArea.height / this.ROWS)
    ); // ~74px

    // Gem colours
    this.GEM_COLORS = {
      FIRE:  '#FF4444',
      WATER: '#4488FF',
      WOOD:  '#44BB44',
      LIGHT: '#FFDD44',
      DARK:  '#AA44FF',
      HEART: '#FF88AA',
    };

    // Darker variants for gradient/shadow
    this.GEM_DARK = {
      FIRE:  '#AA1111',
      WATER: '#1144AA',
      WOOD:  '#117711',
      LIGHT: '#AA8800',
      DARK:  '#551199',
      HEART: '#AA3366',
    };

    // Active combo/damage number lists (managed externally or via drawXxx calls)
    this._comboAnim   = null;   // { count, multiplier, alpha, y, scale }
    this._damages     = [];     // [{ x, y, value, alpha, color }]
    this._matchFX     = [];     // [{ x, y, alpha }]

    // Orb shrink-fade animation: Map<id, { x, y, type, alpha, scale }>
    this._orbFadeAnim = new Map();

    // Orb bounce-drop animation: Map<id, { row, col, type, bouncePhase, progress }>
    this._orbBounceAnim = new Map();

    // Enemy shake: Map<index, { frames, dx }>
    this._enemyShake  = new Map();

    // Enemy death: Map<index, { alpha, scale, phase }>
    this._enemyDeath  = new Map();

    // Selected orb pulse timer
    this._selectedPulse = 0;

    // Particle bursts for match effects: [{x,y,vx,vy,alpha,color,r}]
    this._particles = [];

    // Victory celebration: [{x,y,vx,vy,alpha,color,r,rot,vrot}]
    this._victoryStars = [];
    this._victoryActive = false;

    // Image cache: Map<src, HTMLImageElement>  — loaded asynchronously, no startup block
    this._imgCache = new Map();

    // Battle background images (keyed by bg name)
    this._bgImages = {};
    const bgPaths = {
      base:     'assets/bg_03_base_interior.png',
      forest:   'assets/bg_02_dark_forest.png',
      default:  'assets/bg_01_main_menu.png',
      boss:     'assets/bg_04_boss_arena.png',
    };
    for (const [key, path] of Object.entries(bgPaths)) {
      const img = new Image();
      img.src = path;
      this._bgImages[key] = img;
    }

    // Current battle background key (set via setBattleBackground)
    this._battleBgKey = 'default';
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  /** Convert board [row, col] to canvas pixel centre */
  _cellCenter(row, col) {
    const { x, y } = this.boardArea;
    const cx = x + col * this.cellSize + this.cellSize / 2;
    const cy = y + row * this.cellSize + this.cellSize / 2;
    return { cx, cy };
  }

  /**
   * Load an image from src, returning cached Image if already loaded.
   * Non-blocking: returns null if not yet ready, silently loads in background.
   */
  _loadImg(src) {
    if (!src) return null;
    if (this._imgCache.has(src)) {
      const img = this._imgCache.get(src);
      return img.complete && img.naturalWidth > 0 ? img : null;
    }
    const img = new Image();
    img.src = src;
    this._imgCache.set(src, img);
    return null; // will be ready on next frame
  }

  /**
   * Preload icon images for the current team so they are ready to draw.
   * Call this whenever the team composition changes.
   */
  preloadTeamIcons(team = []) {
    for (const member of team) {
      if (member.icon) this._loadImg(member.icon);
    }
  }

  /**
   * Set the background for the current battle based on stage info.
   * stageId: string (e.g. 'area1_10'), area: number
   */
  setBattleBackground(stageId = '', area = 1) {
    if (area === 0) {
      this._battleBgKey = 'base';
    } else if (area === 1) {
      this._battleBgKey = 'forest';
    } else if (stageId && stageId.endsWith('_10')) {
      this._battleBgKey = 'boss';
    } else {
      this._battleBgKey = 'default';
    }
  }

  /** Draw rounded rectangle path */
  _roundRect(x, y, w, h, r) {
    this.ctx.beginPath();
    this.ctx.moveTo(x + r, y);
    this.ctx.lineTo(x + w - r, y);
    this.ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    this.ctx.lineTo(x + w, y + h - r);
    this.ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    this.ctx.lineTo(x + r, y + h);
    this.ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    this.ctx.lineTo(x, y + r);
    this.ctx.quadraticCurveTo(x, y, x + r, y);
    this.ctx.closePath();
  }

  /** Draw a labelled HP bar */
  _drawHpBar(x, y, w, h, current, max, color) {
    const ctx = this.ctx;
    const pct = Math.max(0, Math.min(1, current / max));

    // Background
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    this._roundRect(x, y, w, h, h / 2);
    ctx.fill();

    // Fill
    if (pct > 0) {
      ctx.fillStyle = pct > 0.5 ? color : pct > 0.25 ? '#FFAA00' : '#FF3300';
      this._roundRect(x, y, w * pct, h, h / 2);
      ctx.fill();
    }

    // Border
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    this._roundRect(x, y, w, h, h / 2);
    ctx.stroke();
  }

  // ─── Board ───────────────────────────────────────────────────────────────────

  /**
   * drawBoard(grid, selectedCell, animState)
   * grid: 2D array [row][col] = { type: 'FIRE'|..., id }
   * selectedCell: [row, col] or null
   * animState: { fading: Set<id>, falling: Map<id, {fromRow, progress}> }
   */
  /**
   * Trigger shrink-fade animation for a set of orbs before they disappear.
   * positions: [[row, col], ...]
   * grid: current board grid (to read orb type)
   */
  startOrbFadeAnim(positions, grid) {
    for (const [row, col] of positions) {
      if (!grid[row]) continue;
      const rawCell = grid[row][col];
      let type = 'FIRE';
      const ORB_NAMES = ['FIRE','WATER','WOOD','LIGHT','DARK','HEART'];
      if (typeof rawCell === 'number' && rawCell >= 0) type = ORB_NAMES[rawCell] || 'FIRE';
      else if (rawCell && typeof rawCell === 'object') type = rawCell.type || 'FIRE';
      const { cx, cy } = this._cellCenter(row, col);
      const id = `fade_${row}_${col}`;
      this._orbFadeAnim.set(id, { x: cx, y: cy, type, alpha: 1.0, scale: 1.0 });
    }
  }

  /** Trigger bounce-drop animation for new orbs that appear in given cells */
  startOrbBounceAnim(positions) {
    for (const [row, col] of positions) {
      const id = `bounce_${row}_${col}`;
      this._orbBounceAnim.set(id, { row, col, phase: 0 });
    }
  }

  /** Trigger enemy shake effect */
  shakeEnemy(index) {
    this._enemyShake.set(index, { frames: 14, dx: 0 });
  }

  /** Trigger enemy death animation */
  killEnemy(index) {
    this._enemyDeath.set(index, { alpha: 1.0, scale: 1.0, phase: 0 });
  }

  /** Start victory celebration */
  startVictory() {
    this._victoryActive = true;
    this._victoryStars = [];
    const colors = ['#FFD700','#FF4444','#44FF88','#4488FF','#AA44FF','#FF88AA'];
    for (let i = 0; i < 40; i++) {
      this._victoryStars.push({
        x: Math.random() * this.canvas.width,
        y: this.canvas.height * 0.3 + Math.random() * 200,
        vx: (Math.random() - 0.5) * 6,
        vy: -(3 + Math.random() * 5),
        alpha: 1.0,
        color: colors[Math.floor(Math.random() * colors.length)],
        r: 4 + Math.random() * 8,
        rot: Math.random() * Math.PI * 2,
        vrot: (Math.random() - 0.5) * 0.3,
      });
    }
  }

  drawBoard(grid, selectedCell = null, animState = {}) {
    const ctx  = this.ctx;
    const { x: bx, y: by, width: bw, height: bh } = this.boardArea;
    const cs   = this.cellSize;
    const fading  = animState.fading  || new Set();
    const falling = animState.falling || new Map();
    // Increment pulse timer for selected orb glow
    this._selectedPulse = (this._selectedPulse || 0) + 0.08;

    // Board background
    ctx.fillStyle = 'rgba(10, 10, 30, 0.85)';
    this._roundRect(bx, by, bw, bh, 12);
    ctx.fill();

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    for (let r = 0; r <= this.ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(bx, by + r * cs);
      ctx.lineTo(bx + this.COLS * cs, by + r * cs);
      ctx.stroke();
    }
    for (let c = 0; c <= this.COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(bx + c * cs, by);
      ctx.lineTo(bx + c * cs, by + this.ROWS * cs);
      ctx.stroke();
    }

    const ORB_TYPE_NAMES = ['FIRE', 'WATER', 'WOOD', 'LIGHT', 'DARK', 'HEART'];

    // Draw gems
    for (let r = 0; r < this.ROWS; r++) {
      for (let c = 0; c < this.COLS; c++) {
        if (!grid[r]) continue;
        const rawCell = grid[r][c];
        // rawCell can be: number (0-5), -1 (empty), or {type, id} object
        let gem;
        if (typeof rawCell === 'number') {
          if (rawCell === -1) continue; // empty cell
          gem = { type: ORB_TYPE_NAMES[rawCell] ?? 'FIRE', id: `${r}_${c}` };
        } else if (rawCell && typeof rawCell === 'object') {
          gem = rawCell;
        } else {
          continue;
        }

        const isSelected = selectedCell &&
          selectedCell[0] === r && selectedCell[1] === c;

        // Falling offset (only used when animState.falling is populated)
        let fallOffset = 0;
        if (gem.id && falling.has(gem.id)) {
          const fd = falling.get(gem.id);
          fallOffset = (fd.fromRow - r) * cs * (1 - fd.progress);
        }

        // Fading alpha (only used when animState.fading is populated)
        let alpha = 1;
        if (gem.id && fading.has(gem.id)) {
          alpha = animState.fadeAlpha !== undefined ? animState.fadeAlpha : 0.3;
        }

        const { cx, cy } = this._cellCenter(r, c);
        const drawCy = cy + fallOffset;
        const radius  = cs * 0.38;

        ctx.save();
        ctx.globalAlpha = alpha;

        // Gem glow / shadow
        const color     = this.GEM_COLORS[gem.type] || '#888888';
        const darkColor = this.GEM_DARK[gem.type]   || '#444444';

        ctx.shadowColor = color;
        ctx.shadowBlur  = isSelected ? 18 : 8;

        // Radial gradient fill
        const grad = ctx.createRadialGradient(
          cx - radius * 0.3, drawCy - radius * 0.3, radius * 0.05,
          cx, drawCy, radius
        );
        grad.addColorStop(0, '#FFFFFF');
        grad.addColorStop(0.25, color);
        grad.addColorStop(1, darkColor);

        ctx.beginPath();
        ctx.arc(cx, drawCy, radius, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // Selected highlight ring with pulse glow (item 6)
        if (isSelected) {
          const pulseAlpha = 0.5 + 0.5 * Math.sin(this._selectedPulse);
          const pulseRadius = radius + 4 + 4 * Math.sin(this._selectedPulse * 0.7);
          // Outer glow ring
          ctx.shadowColor = '#FFFFFF';
          ctx.shadowBlur  = 20 + 12 * pulseAlpha;
          ctx.strokeStyle = `rgba(255,255,255,${0.7 + 0.3 * pulseAlpha})`;
          ctx.lineWidth   = 3;
          ctx.stroke();
          // Animated pulse ring
          ctx.beginPath();
          ctx.arc(cx, drawCy, pulseRadius, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(255,255,255,${0.35 * pulseAlpha})`;
          ctx.lineWidth = 2;
          ctx.shadowBlur = 0;
          ctx.stroke();
        }

        // Gem type icon (small letter)
        ctx.shadowBlur  = 0;
        ctx.fillStyle   = 'rgba(255,255,255,0.85)';
        ctx.font        = `bold ${cs * 0.28}px sans-serif`;
        ctx.textAlign   = 'center';
        ctx.textBaseline = 'middle';
        const labels = { FIRE:'火', WATER:'水', WOOD:'木', LIGHT:'光', DARK:'暗', HEART:'心' };
        ctx.fillText(labels[gem.type] || '?', cx, drawCy);

        ctx.restore();
      }
    }

    // Match effects overlay
    this._drawMatchEffectsOnBoard();

    // Draw shrink-fade orbs (item 1)
    this._drawOrbFadeAnims();

    // Draw bounce-drop new orbs (item 2)
    this._drawOrbBounceAnims(grid);

    // Draw coloured particles from match (item 9)
    this._drawParticles();

    // Draw victory stars (item 10)
    if (this._victoryActive) this._drawVictoryStars();
  }

  _drawOrbFadeAnims() {
    const ctx = this.ctx;
    for (const [id, anim] of this._orbFadeAnim) {
      if (anim.alpha <= 0) { this._orbFadeAnim.delete(id); continue; }
      const color = this.GEM_COLORS[anim.type] || '#888';
      const darkColor = this.GEM_DARK[anim.type] || '#444';
      const radius = this.cellSize * 0.38 * anim.scale;
      ctx.save();
      ctx.globalAlpha = anim.alpha;
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
      const grad = ctx.createRadialGradient(
        anim.x - radius * 0.3, anim.y - radius * 0.3, radius * 0.05,
        anim.x, anim.y, radius
      );
      grad.addColorStop(0, '#FFFFFF');
      grad.addColorStop(0.25, color);
      grad.addColorStop(1, darkColor);
      ctx.beginPath();
      ctx.arc(anim.x, anim.y, Math.max(0, radius), 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.restore();
      anim.alpha -= 0.08;
      anim.scale -= 0.06;
    }
  }

  _drawOrbBounceAnims(grid) {
    const ctx = this.ctx;
    for (const [id, anim] of this._orbBounceAnim) {
      anim.phase = (anim.phase || 0) + 0.18;
      if (anim.phase > Math.PI) { this._orbBounceAnim.delete(id); continue; }
      const bounce = Math.abs(Math.sin(anim.phase)) * 0.3; // 0→peak→0
      const scale  = 1 + bounce;
      const { cx, cy } = this._cellCenter(anim.row, anim.col);
      const rawCell = grid[anim.row]?.[anim.col];
      let type = 'FIRE';
      const ORB_NAMES = ['FIRE','WATER','WOOD','LIGHT','DARK','HEART'];
      if (typeof rawCell === 'number' && rawCell >= 0) type = ORB_NAMES[rawCell] || 'FIRE';
      else if (rawCell && typeof rawCell === 'object') type = rawCell.type || 'FIRE';
      const color = this.GEM_COLORS[type] || '#888';
      const darkColor = this.GEM_DARK[type] || '#444';
      const radius = this.cellSize * 0.38 * scale;
      ctx.save();
      ctx.globalAlpha = 0.9;
      ctx.shadowColor = color;
      ctx.shadowBlur = 12;
      const grad = ctx.createRadialGradient(cx - radius*0.3, cy - radius*0.3, radius*0.05, cx, cy, radius);
      grad.addColorStop(0, '#FFFFFF');
      grad.addColorStop(0.25, color);
      grad.addColorStop(1, darkColor);
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.restore();
    }
  }

  _drawParticles() {
    const ctx = this.ctx;
    this._particles = this._particles.filter(p => p.alpha > 0);
    for (const p of this._particles) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.12; // gravity
      p.alpha -= 0.04;
      p.r *= 0.97;
    }
  }

  _drawVictoryStars() {
    const ctx = this.ctx;
    let anyAlive = false;
    for (const s of this._victoryStars) {
      if (s.alpha <= 0) continue;
      anyAlive = true;
      ctx.save();
      ctx.globalAlpha = s.alpha;
      ctx.translate(s.x, s.y);
      ctx.rotate(s.rot);
      ctx.fillStyle = s.color;
      ctx.shadowColor = s.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      // Draw star shape
      for (let i = 0; i < 5; i++) {
        const angle = (i * 4 * Math.PI / 5) - Math.PI / 2;
        const innerAngle = ((i * 4 + 2) * Math.PI / 5) - Math.PI / 2;
        if (i === 0) ctx.moveTo(Math.cos(angle) * s.r, Math.sin(angle) * s.r);
        else ctx.lineTo(Math.cos(angle) * s.r, Math.sin(angle) * s.r);
        ctx.lineTo(Math.cos(innerAngle) * s.r * 0.4, Math.sin(innerAngle) * s.r * 0.4);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      s.x += s.vx;
      s.y += s.vy;
      s.vy += 0.15;
      s.rot += s.vrot;
      s.alpha -= 0.018;
    }
    if (!anyAlive) this._victoryActive = false;
  }

  _drawMatchEffectsOnBoard() {
    const ctx = this.ctx;
    this._matchFX = this._matchFX.filter(fx => fx.alpha > 0);
    for (const fx of this._matchFX) {
      ctx.save();
      ctx.globalAlpha = fx.alpha;
      const baseColor = fx.color || '#FFFFFF';
      const grad = ctx.createRadialGradient(fx.x, fx.y, 0, fx.x, fx.y, fx.r || 30);
      grad.addColorStop(0, 'rgba(255,255,255,1)');
      grad.addColorStop(0.5, baseColor + '88');
      grad.addColorStop(1, baseColor + '00');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(fx.x, fx.y, fx.r || 30, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      fx.alpha -= 0.06;
    }
  }

  // ─── Battle ──────────────────────────────────────────────────────────────────

  /**
   * drawBattle(team, enemies, currentWave, totalWaves, turn)
   * team:    [{ name, type, hp, maxHp, charge, maxCharge }]  — up to 5
   * enemies: [{ name, hp, maxHp, type }]                     — up to 3
   * currentWave, totalWaves: numbers
   * turn: number
   */
  drawBattle(team = [], enemies = [], currentWave = 1, totalWaves = 1, turn = 1) {
    const ctx = this.ctx;
    const { x: bax, y: bay, width: baw, height: bah } = this.battleArea;

    // Battle background: try real image first, fallback to dark tint
    const bgImg = this._bgImages[this._battleBgKey];
    if (bgImg && bgImg.complete && bgImg.naturalWidth > 0) {
      ctx.drawImage(bgImg, bax, bay, baw, bah);
      // Semi-transparent overlay to keep readability
      ctx.fillStyle = 'rgba(0, 0, 10, 0.35)';
      ctx.fillRect(bax, bay, baw, bah);
    } else {
      ctx.fillStyle = 'rgba(5, 5, 20, 0.7)';
      ctx.fillRect(bax, bay, baw, bah);
    }

    // Wave indicator
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText(`波次 ${currentWave}/${totalWaves}  回合 ${turn}`, bax + baw - 12, bay + 8);

    // ── Enemies (top section) ──────────────────────────────────
    const enemyAreaH = bah * 0.52;
    const maxEnemies = Math.min(enemies.length, 3);

    const enemyW  = 120;
    const enemyH  = 140;
    const enemyGap = (baw - maxEnemies * enemyW) / (maxEnemies + 1);

    for (let i = 0; i < maxEnemies; i++) {
      const e  = enemies[i];

      // Enemy shake (item 4)
      let shakeOffset = 0;
      if (this._enemyShake.has(i)) {
        const sh = this._enemyShake.get(i);
        sh.frames--;
        shakeOffset = Math.sin(sh.frames * 1.8) * 5;
        if (sh.frames <= 0) this._enemyShake.delete(i);
      }

      // Enemy death animation (item 5)
      let deathAlpha = 1.0;
      let deathScale = 1.0;
      if (this._enemyDeath.has(i)) {
        const dt = this._enemyDeath.get(i);
        dt.phase += 0.06;
        dt.alpha -= 0.05;
        dt.scale -= 0.04;
        if (dt.alpha <= 0) { this._enemyDeath.delete(i); continue; }
        deathAlpha = dt.alpha;
        deathScale = Math.max(0.01, dt.scale);
      }

      const ex = bax + enemyGap + i * (enemyW + enemyGap) + shakeOffset;
      const ey = bay + 30;

      // Enemy body block (placeholder sprite)
      const typeColors = {
        FIRE: '#FF4444', WATER: '#4488FF', WOOD: '#44BB44',
        LIGHT: '#FFDD44', DARK: '#AA44FF', NORMAL: '#888888',
      };
      const eColor = typeColors[e.type] || '#888888';

      ctx.save();
      ctx.globalAlpha = deathAlpha;
      // Scale from center for death effect
      if (deathScale !== 1.0) {
        const cx = ex + enemyW / 2;
        const cy = ey + enemyH / 2;
        ctx.translate(cx, cy);
        ctx.scale(deathScale, deathScale);
        ctx.translate(-cx, -cy);
      }

      // Shadow
      ctx.shadowColor = eColor;
      ctx.shadowBlur  = 15;
      ctx.fillStyle   = eColor + '55';
      this._roundRect(ex, ey, enemyW, enemyH, 8);
      ctx.fill();
      ctx.shadowBlur  = 0;

      // Body fill
      const eGrad = ctx.createLinearGradient(ex, ey, ex + enemyW, ey + enemyH);
      eGrad.addColorStop(0, eColor + 'CC');
      eGrad.addColorStop(1, eColor + '44');
      ctx.fillStyle = eGrad;
      this._roundRect(ex, ey, enemyW, enemyH, 8);
      ctx.fill();

      // Enemy name
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(e.name || `敵人${i + 1}`, ex + enemyW / 2, ey + enemyH / 2);

      // HP bar below enemy
      const hbx = ex;
      const hby = ey + enemyH + 6;
      this._drawHpBar(hbx, hby, enemyW, 10, e.hp, e.maxHp, '#44FF88');

      // HP text
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(`${e.hp}/${e.maxHp}`, hbx + enemyW / 2, hby + 12);
      ctx.restore();
    }

    // ── Team (bottom of battle area) ─────────────────────────────
    const teamY    = bay + bah - 100;
    const avatarR  = 30;
    const teamGap  = baw / (team.length + 1);
    const attrColors = this.GEM_COLORS;

    for (let i = 0; i < Math.min(team.length, 5); i++) {
      const member = team[i];
      const ax = bax + teamGap * (i + 1);
      const ay = teamY + avatarR;

      const aColor = attrColors[member.type] || '#888888';

      // Avatar circle: try real icon image first, fallback to colour gradient
      ctx.shadowColor = aColor;
      ctx.shadowBlur  = i === 0 ? 20 : 8; // leader glow
      ctx.beginPath();
      ctx.arc(ax, ay, avatarR, 0, Math.PI * 2);

      const iconImg = member.icon ? this._loadImg(member.icon) : null;
      if (iconImg) {
        // Circular clip with real image
        ctx.save();
        ctx.clip();
        ctx.drawImage(iconImg, ax - avatarR, ay - avatarR, avatarR * 2, avatarR * 2);
        ctx.restore();
        // Re-draw circle border on top
        ctx.beginPath();
        ctx.arc(ax, ay, avatarR, 0, Math.PI * 2);
        ctx.strokeStyle = i === 0 ? '#FFD700' : aColor + 'AA';
        ctx.lineWidth = 2;
        ctx.stroke();
      } else {
        // Fallback: colour gradient fill
        const aGrad = ctx.createRadialGradient(ax, ay, 2, ax, ay, avatarR);
        aGrad.addColorStop(0, '#FFFFFF44');
        aGrad.addColorStop(0.5, aColor);
        aGrad.addColorStop(1, this.GEM_DARK[member.type] || '#333');
        ctx.fillStyle = aGrad;
        ctx.fill();
      }
      ctx.shadowBlur = 0;

      // Leader crown
      if (i === 0) {
        ctx.fillStyle = '#FFD700';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText('♛', ax, ay - avatarR - 1);
      }

      // HP bar under avatar
      const hbx = ax - avatarR;
      const hby = ay + avatarR + 4;
      this._drawHpBar(hbx, hby, avatarR * 2, 7, member.hp, member.maxHp, aColor);

      // Charge bar (super gauge)
      const cbx = ax - avatarR;
      const cby = hby + 10;
      const chargePct = Math.max(0, Math.min(1, (member.charge || 0) / (member.maxCharge || 1)));

      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      this._roundRect(cbx, cby, avatarR * 2, 5, 2.5);
      ctx.fill();
      if (chargePct > 0) {
        const chargeColor = chargePct >= 1 ? '#FFD700' : '#44AAFF';
        ctx.fillStyle = chargeColor;
        this._roundRect(cbx, cby, avatarR * 2 * chargePct, 5, 2.5);
        ctx.fill();
        if (chargePct >= 1) {
          ctx.shadowColor = '#FFD700';
          ctx.shadowBlur  = 6;
          ctx.fillStyle   = '#FFD700';
          this._roundRect(cbx, cby, avatarR * 2, 5, 2.5);
          ctx.fill();
          ctx.shadowBlur  = 0;
        }
      }

      // Name label
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      const nameLabel = (member.name || `角色${i+1}`).substring(0, 3);
      ctx.fillText(nameLabel, ax, cby + 7);
    }
  }

  // ─── HUD ─────────────────────────────────────────────────────────────────────

  /**
   * drawHUD(stamina, maxStamina, freeGem, gold, playerLevel)
   */
  drawHUD(stamina = 0, maxStamina = 100, freeGem = 0, gold = 0, playerLevel = 1) {
    const ctx = this.ctx;
    const { y: hy, width: hw, height: hh } = this.hudArea;

    // HUD background
    ctx.fillStyle = 'rgba(5, 5, 25, 0.92)';
    ctx.fillRect(0, hy, hw, hh);

    // Bottom border line
    ctx.strokeStyle = 'rgba(100, 100, 200, 0.4)';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(0, hh);
    ctx.lineTo(hw, hh);
    ctx.stroke();

    // ── Left: Player Level ─────────────────────────────────────
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Lv.${playerLevel}`, 12, hh / 2);

    // ── Centre: Stamina ────────────────────────────────────────
    const staminaLabel = '體力';
    ctx.fillStyle = '#AADDFF';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(staminaLabel, hw / 2, hh * 0.28);

    const barW = 140, barH = 12;
    const barX = hw / 2 - barW / 2;
    const barY = hh * 0.5;
    this._drawHpBar(barX, barY, barW, barH, stamina, maxStamina, '#44AAFF');

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${stamina}/${maxStamina}`, hw / 2, barY + barH + 10);

    // ── Right: Currency ────────────────────────────────────────
    // Free gems
    ctx.fillStyle = '#AA44FF';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(`💎 ${freeGem}`, hw - 12, hh * 0.35);

    // Gold
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(`🪙 ${gold.toLocaleString()}`, hw - 12, hh * 0.68);
  }

  // ─── Combo ───────────────────────────────────────────────────────────────────

  /**
   * drawCombo(comboCount, multiplier)
   * Call every frame while combo is active. Manages own fade.
   */
  drawCombo(comboCount = 0, multiplier = 1) {
    if (comboCount < 2) return;
    const ctx = this.ctx;
    const cx  = this.battleArea.x + this.battleArea.width / 2;
    const cy  = this.battleArea.y + this.battleArea.height / 2 - 20;

    if (!this._comboAnim || this._comboAnim.count !== comboCount) {
      // Item 3: pulse scale — start big (1.6) then shrink to 1.0
      this._comboAnim = { count: comboCount, multiplier, alpha: 1.0, y: cy, scale: 1.6, phase: 0 };
    }

    const anim = this._comboAnim;
    if (anim.alpha <= 0) return;

    // Pulse: scale bounces from spawn-scale down to 1.0, then slight pulse
    anim.phase += 0.1;
    if (anim.scale > 1.0) {
      anim.scale = Math.max(1.0, anim.scale - 0.06);
    } else {
      // Subtle ongoing pulse
      anim.scale = 1.0 + 0.06 * Math.abs(Math.sin(anim.phase));
    }

    ctx.save();
    ctx.globalAlpha = anim.alpha;
    ctx.translate(cx, anim.y);
    ctx.scale(anim.scale, anim.scale);

    // Outline shadow
    ctx.shadowColor = '#FF8800';
    ctx.shadowBlur  = 20;

    // COMBO label
    ctx.fillStyle   = '#FFDD44';
    ctx.font        = `bold 48px sans-serif`;
    ctx.textAlign   = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(`${comboCount} COMBO`, 0, 0);

    // Multiplier
    if (multiplier > 1) {
      ctx.fillStyle = '#FF8800';
      ctx.font      = `bold 22px sans-serif`;
      ctx.fillText(`×${multiplier.toFixed(1)}`, 0, 28);
    }

    ctx.restore();

    // Fade and float up
    anim.alpha -= 0.015;
    anim.y     -= 0.5;
  }

  // ─── Damage Numbers ──────────────────────────────────────────────────────────

  /**
   * drawDamageNumbers(damages)
   * damages: [{ x, y, value, color?, critical? }]
   * Call once to register, then drawDamageNumbersFrame() each frame.
   */
  addDamageNumbers(damages = []) {
    for (const d of damages) {
      this._damages.push({
        x:        d.x,
        y:        d.y,
        value:    d.value,
        color:    d.color || '#FFFFFF',
        critical: d.critical || false,
        alpha:    1.0,
        vy:       -(2 + Math.random()),
      });
    }
  }

  /** Legacy alias — accepts array, registers and draws in same call */
  drawDamageNumbers(damages = []) {
    if (damages.length > 0) this.addDamageNumbers(damages);
    this._renderDamageNumbers();
  }

  _renderDamageNumbers() {
    const ctx = this.ctx;
    this._damages = this._damages.filter(d => d.alpha > 0);
    for (const d of this._damages) {
      ctx.save();
      ctx.globalAlpha = d.alpha;
      ctx.shadowColor = d.color;
      ctx.shadowBlur  = d.critical ? 12 : 4;
      ctx.fillStyle   = d.critical ? '#FF4444' : d.color;
      ctx.font        = d.critical
        ? `bold ${28 + Math.floor((1 - d.alpha) * 4)}px sans-serif`
        : 'bold 20px sans-serif';
      ctx.textAlign   = 'center';
      ctx.textBaseline = 'alphabetic';

      const label = d.critical ? `💥${d.value}` : String(d.value);
      ctx.fillText(label, d.x, d.y);

      ctx.restore();

      d.y     += d.vy;
      d.alpha -= 0.025;
    }
  }

  // ─── Match Effect ─────────────────────────────────────────────────────────────

  /**
   * drawMatchEffect(positions)
   * positions: [[row, col], ...]
   */
  drawMatchEffect(positions = [], orbType = null) {
    const ORB_NAMES = ['FIRE','WATER','WOOD','LIGHT','DARK','HEART'];
    for (const [row, col, typeHint] of positions) {
      const { cx, cy } = this._cellCenter(row, col);
      const type = typeHint || orbType;
      const color = type ? (this.GEM_COLORS[type] || this.GEM_COLORS[ORB_NAMES[type]] || '#FFFFFF') : '#FFFFFF';
      this._matchFX.push({ x: cx, y: cy, alpha: 1.0, r: this.cellSize * 0.5, color });
      // Spawn colored particles (item 9)
      const numParticles = 6;
      for (let i = 0; i < numParticles; i++) {
        const angle = (i / numParticles) * Math.PI * 2 + Math.random() * 0.5;
        const speed = 1.5 + Math.random() * 2.5;
        this._particles.push({
          x: cx, y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          alpha: 0.9,
          color,
          r: 3 + Math.random() * 3,
        });
      }
    }
  }

  // ─── Coordinate Conversion ────────────────────────────────────────────────────

  /**
   * screenToBoard(x, y) → [row, col] or null
   * Converts canvas-relative pixel to board grid coordinates.
   */
  screenToBoard(x, y) {
    const { x: bx, y: by } = this.boardArea;
    const col = Math.floor((x - bx) / this.cellSize);
    const row = Math.floor((y - by) / this.cellSize);
    if (row < 0 || row >= this.ROWS || col < 0 || col >= this.COLS) return null;
    return [row, col];
  }

  // ─── Full Frame ───────────────────────────────────────────────────────────────

  /**
   * Convenience: clear the entire canvas.
   */
  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Draw full background gradient (call at start of each frame).
   * During battle, tries to draw the real background image first.
   */
  drawBackground() {
    const ctx = this.ctx;
    const w   = this.canvas.width;
    const h   = this.canvas.height;

    // Try battle background image first
    const bgImg = this._bgImages?.[this._battleBgKey];
    if (bgImg && bgImg.complete && bgImg.naturalWidth > 0) {
      ctx.drawImage(bgImg, 0, 0, w, h);
      return;
    }

    // Fallback: gradient
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0,   '#1a1a2e');
    grad.addColorStop(0.5, '#16213e');
    grad.addColorStop(1,   '#0f3460');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }
}
