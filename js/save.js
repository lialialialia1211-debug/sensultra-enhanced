// save.js — SaveManager: localStorage persistence layer
// Pure logic, no rendering. ES Module.

const SAVE_KEY = 'sensultra_save';

export class SaveManager {
  /**
   * Persist the full game state to localStorage.
   *
   * Expected gameState shape:
   * {
   *   economy:    GameEconomy.serialize()  — currency, stamina, gacha state
   *   characters: CharacterRoster data     — owned characters and levels
   *   inventory:  InventoryData            — materials, items
   *   intimacy:   IntimacyData             — per-character intimacy progress
   *   progress:   ProgressData             — cleared stages, story flags
   *   settings:   SettingsData             — sound, display, locale prefs
   * }
   *
   * @param {Object} gameState
   */
  static save(gameState) {
    try {
      const payload = JSON.stringify(gameState);
      localStorage.setItem(SAVE_KEY, payload);
      return true;
    } catch (err) {
      // e.g. localStorage quota exceeded
      console.error('[SaveManager] save failed:', err);
      return false;
    }
  }

  /**
   * Load and parse the saved game state.
   * Returns null if no save exists or if the data is corrupt.
   *
   * @returns {Object|null}
   */
  static load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw === null) return null;
      return JSON.parse(raw);
    } catch (err) {
      console.error('[SaveManager] load failed (corrupt save?):', err);
      return null;
    }
  }

  /**
   * Delete the save from localStorage.
   * Use with caution — no undo.
   */
  static deleteSave() {
    localStorage.removeItem(SAVE_KEY);
  }

  /**
   * Check whether a save slot exists without loading it.
   * @returns {boolean}
   */
  static hasSave() {
    return localStorage.getItem(SAVE_KEY) !== null;
  }

  /**
   * Convenience: auto-save on a fixed interval.
   * Returns the interval ID so the caller can clearInterval() later.
   *
   * @param {Function} getGameState — called each tick to obtain the current state snapshot
   * @param {number}   [intervalMs=30000] — default 30 seconds
   * @returns {number} interval ID
   */
  static startAutoSave(getGameState, intervalMs = 30000) {
    return setInterval(() => {
      const state = getGameState();
      if (state) SaveManager.save(state);
    }, intervalMs);
  }
}
