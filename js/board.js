/**
 * Match-3 Board Engine
 * Pure logic, no rendering dependencies.
 *
 * Grid coordinates: grid[row][col], row 0 = top, col 0 = left.
 * Empty cell value: -1
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const ORB_TYPES = {
  FIRE:  0,
  WATER: 1,
  WOOD:  2,
  LIGHT: 3,
  DARK:  4,
  HEART: 5,
};

export const ORB_COLORS = [
  '#FF4444', // FIRE
  '#4488FF', // WATER
  '#44BB44', // WOOD
  '#FFDD44', // LIGHT
  '#AA44FF', // DARK
  '#FF88AA', // HEART
];

export const ORB_NAMES = ['火', '水', '木', '光', '闇', '心'];

const NUM_TYPES = 6;

// ---------------------------------------------------------------------------
// Board class
// ---------------------------------------------------------------------------

export class Board {
  /**
   * @param {number} rows - Number of rows (default 5)
   * @param {number} cols - Number of columns (default 7)
   */
  constructor(rows = 5, cols = 7) {
    this.rows = rows;
    this.cols = cols;
    /** @type {number[][]} 2-D grid, values 0-5 or -1 for empty */
    this.grid = [];
    this.createBoard();
  }

  // -------------------------------------------------------------------------
  // Board generation
  // -------------------------------------------------------------------------

  /**
   * Fill the board with random orbs, guaranteeing no immediate matches exist
   * at creation time.  Cells are regenerated individually until they don't
   * form a horizontal or vertical run of 3+.
   */
  createBoard() {
    this.grid = Array.from({ length: this.rows }, () =>
      new Array(this.cols).fill(-1)
    );

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        let type;
        do {
          type = this._randomType();
        } while (this._wouldMatchAt(r, c, type));
        this.grid[r][c] = type;
      }
    }
  }

  /**
   * Returns a random orb type index 0-5.
   * @returns {number}
   */
  _randomType() {
    return Math.floor(Math.random() * NUM_TYPES);
  }

  /**
   * Check whether placing `type` at (r, c) would immediately form a run of 3+
   * horizontally or vertically, based on already-filled cells to the left / above.
   * @param {number} r
   * @param {number} c
   * @param {number} type
   * @returns {boolean}
   */
  _wouldMatchAt(r, c, type) {
    // Check horizontal: two cells to the left
    if (
      c >= 2 &&
      this.grid[r][c - 1] === type &&
      this.grid[r][c - 2] === type
    ) {
      return true;
    }
    // Check vertical: two cells above
    if (
      r >= 2 &&
      this.grid[r - 1][c] === type &&
      this.grid[r - 2][c] === type
    ) {
      return true;
    }
    return false;
  }

  // -------------------------------------------------------------------------
  // Swap
  // -------------------------------------------------------------------------

  /**
   * Attempt to swap two cells.  Only succeeds when:
   *  1. Both cells are within bounds.
   *  2. They are adjacent (including diagonals, Chebyshev distance ≤ 1).
   *  3. The swap produces at least one match.
   * If no match is produced the grid is restored.
   *
   * @param {number} r1
   * @param {number} c1
   * @param {number} r2
   * @param {number} c2
   * @returns {{ valid: boolean, matches: Array }}
   */
  trySwap(r1, c1, r2, c2) {
    if (!this._inBounds(r1, c1) || !this._inBounds(r2, c2)) {
      return { valid: false, matches: [] };
    }

    const dr = Math.abs(r2 - r1);
    const dc = Math.abs(c2 - c1);
    const isAdjacent = dr <= 1 && dc <= 1 && !(dr === 0 && dc === 0);
    if (!isAdjacent) {
      return { valid: false, matches: [] };
    }

    // Perform swap
    this._swap(r1, c1, r2, c2);

    const matches = this.findMatches();
    if (matches.length === 0) {
      // Revert
      this._swap(r1, c1, r2, c2);
      return { valid: false, matches: [] };
    }

    return { valid: true, matches };
  }

  /**
   * Swap two cells in the grid (no validation).
   * @param {number} r1
   * @param {number} c1
   * @param {number} r2
   * @param {number} c2
   */
  _swap(r1, c1, r2, c2) {
    const tmp = this.grid[r1][c1];
    this.grid[r1][c1] = this.grid[r2][c2];
    this.grid[r2][c2] = tmp;
  }

  // -------------------------------------------------------------------------
  // Match detection
  // -------------------------------------------------------------------------

  /**
   * Scan the board for horizontal and vertical runs of 3+ same-type orbs.
   * Overlapping / crossing runs are kept as separate entries.
   * Runs of 5+ have `aoe: true`.
   *
   * @returns {Array<{ type: number, positions: number[][], count: number, aoe: boolean }>}
   */
  findMatches() {
    const matches = [];

    // Horizontal scan
    for (let r = 0; r < this.rows; r++) {
      let c = 0;
      while (c < this.cols) {
        const type = this.grid[r][c];
        if (type === -1) { c++; continue; }

        let end = c + 1;
        while (end < this.cols && this.grid[r][end] === type) end++;

        const length = end - c;
        if (length >= 3) {
          const positions = [];
          for (let k = c; k < end; k++) positions.push([r, k]);
          matches.push({
            type,
            positions,
            count: length,
            aoe: length >= 5,
          });
        }
        c = end;
      }
    }

    // Vertical scan
    for (let c = 0; c < this.cols; c++) {
      let r = 0;
      while (r < this.rows) {
        const type = this.grid[r][c];
        if (type === -1) { r++; continue; }

        let end = r + 1;
        while (end < this.rows && this.grid[end][c] === type) end++;

        const length = end - r;
        if (length >= 3) {
          const positions = [];
          for (let k = r; k < end; k++) positions.push([k, c]);
          matches.push({
            type,
            positions,
            count: length,
            aoe: length >= 5,
          });
        }
        r = end;
      }
    }

    return matches;
  }

  // -------------------------------------------------------------------------
  // Match execution
  // -------------------------------------------------------------------------

  /**
   * Clear all matched cells (set to -1) and tally the destroyed orbs by type.
   * Cells referenced by multiple matches are only counted once.
   *
   * @param {Array<{ type: number, positions: number[][], count: number, aoe: boolean }>} matches
   * @returns {{ FIRE: number, WATER: number, WOOD: number, LIGHT: number, DARK: number, HEART: number }}
   */
  executeMatches(matches) {
    const destroyed = { FIRE: 0, WATER: 0, WOOD: 0, LIGHT: 0, DARK: 0, HEART: 0 };
    const typeNames = ['FIRE', 'WATER', 'WOOD', 'LIGHT', 'DARK', 'HEART'];

    // Deduplicate positions using a Set keyed by "r,c"
    const seen = new Set();
    for (const match of matches) {
      for (const [r, c] of match.positions) {
        const key = `${r},${c}`;
        if (!seen.has(key)) {
          seen.add(key);
          const type = this.grid[r][c];
          if (type !== -1) {
            destroyed[typeNames[type]]++;
            this.grid[r][c] = -1;
          }
        }
      }
    }

    return destroyed;
  }

  // -------------------------------------------------------------------------
  // Gravity & refill
  // -------------------------------------------------------------------------

  /**
   * Apply gravity: existing orbs fall downward to fill empty cells, then new
   * random orbs are generated at the top.
   *
   * @returns {Array<{ from: number[], to: number[] }>} Animation move list.
   *   `from` may have a negative row index for newly spawned orbs.
   */
  applyGravity() {
    const moves = [];

    for (let c = 0; c < this.cols; c++) {
      // Collect non-empty orbs from bottom to top
      const column = [];
      for (let r = this.rows - 1; r >= 0; r--) {
        if (this.grid[r][c] !== -1) {
          column.push({ type: this.grid[r][c], originalRow: r });
        }
      }

      // Fill the column from the bottom up
      const newColumn = new Array(this.rows).fill(-1);

      let destRow = this.rows - 1;
      for (const orb of column) {
        newColumn[destRow] = orb.type;
        if (orb.originalRow !== destRow) {
          moves.push({ from: [orb.originalRow, c], to: [destRow, c] });
        }
        destRow--;
      }

      // Spawn new orbs for empty slots at the top
      let spawnOffset = -1; // virtual rows above row 0
      for (let r = destRow; r >= 0; r--) {
        const newType = this._randomType();
        newColumn[r] = newType;
        moves.push({ from: [spawnOffset, c], to: [r, c] });
        spawnOffset--;
      }

      // Write column back to grid
      for (let r = 0; r < this.rows; r++) {
        this.grid[r][c] = newColumn[r];
      }
    }

    return moves;
  }

  // -------------------------------------------------------------------------
  // Chain resolution
  // -------------------------------------------------------------------------

  /**
   * Fully resolve the board: repeatedly find matches, clear them, apply
   * gravity, and increment the combo counter until no more matches exist.
   *
   * Each iteration's data is recorded for external animation use.
   *
   * @returns {{
   *   totalCombo: number,
   *   comboMultiplier: number,
   *   orbsDestroyed: { FIRE: number, WATER: number, WOOD: number, LIGHT: number, DARK: number, HEART: number },
   *   allMatches: Array,
   *   steps: Array<{ combo: number, matches: Array, gravityMoves: Array, orbsDestroyed: Object }>
   * }}
   */
  resolveChain() {
    const result = {
      totalCombo: 0,
      comboMultiplier: 1,
      orbsDestroyed: { FIRE: 0, WATER: 0, WOOD: 0, LIGHT: 0, DARK: 0, HEART: 0 },
      allMatches: [],
      steps: [],
    };

    const typeNames = ['FIRE', 'WATER', 'WOOD', 'LIGHT', 'DARK', 'HEART'];

    while (true) {
      const matches = this.findMatches();
      if (matches.length === 0) break;

      result.totalCombo++;
      result.allMatches.push(...matches);

      const stepDestroyed = this.executeMatches(matches);
      const gravityMoves = this.applyGravity();

      // Accumulate totals
      for (const name of typeNames) {
        result.orbsDestroyed[name] += stepDestroyed[name];
      }

      result.steps.push({
        combo: result.totalCombo,
        matches,
        gravityMoves,
        orbsDestroyed: stepDestroyed,
      });
    }

    result.comboMultiplier =
      result.totalCombo > 0
        ? this.getComboMultiplier(result.totalCombo)
        : 1;

    return result;
  }

  // -------------------------------------------------------------------------
  // Multiplier helpers
  // -------------------------------------------------------------------------

  /**
   * Combo multiplier based on the number of consecutive chains.
   * Formula: 1.25 + (combo - 1) * 0.25
   *
   * @param {number} combo - Combo count (≥ 1)
   * @returns {number}
   */
  getComboMultiplier(combo) {
    return 1.25 + (combo - 1) * 0.25;
  }

  /**
   * Match multiplier based on the number of orbs in a single run.
   * 3 → 1.0 | 4 → 1.3 | 5 → 1.6 | 6 → 2.0 | 7+ → 2.5
   *
   * @param {number} count - Number of orbs matched
   * @returns {number}
   */
  getMatchMultiplier(count) {
    if (count >= 7) return 2.5;
    if (count === 6) return 2.0;
    if (count === 5) return 1.6;
    if (count === 4) return 1.3;
    return 1.0; // 3
  }

  // -------------------------------------------------------------------------
  // Utilities
  // -------------------------------------------------------------------------

  /**
   * Check whether (r, c) is within the grid boundaries.
   * @param {number} r
   * @param {number} c
   * @returns {boolean}
   */
  _inBounds(r, c) {
    return r >= 0 && r < this.rows && c >= 0 && c < this.cols;
  }

  /**
   * Return a deep copy of the current grid state.
   * @returns {number[][]}
   */
  cloneGrid() {
    return this.grid.map(row => [...row]);
  }

  /**
   * Pretty-print the grid to the console (debug utility).
   */
  debugPrint() {
    const symbols = ['F', 'W', 'O', 'L', 'D', 'H'];
    console.log('  ' + Array.from({ length: this.cols }, (_, i) => i).join(' '));
    for (let r = 0; r < this.rows; r++) {
      const row = this.grid[r]
        .map(v => (v === -1 ? '.' : symbols[v]))
        .join(' ');
      console.log(`${r} ${row}`);
    }
  }
}
