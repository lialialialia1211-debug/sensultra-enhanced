// dialogue.js — DialogueManager: story dialogue playback system
// Supports: narration, character lines, choices, system triggers, typewriter effect
// ES Module

export class DialogueManager {
  /**
   * @param {HTMLElement} container — the #game-container element
   */
  constructor(container) {
    this.container       = container;
    this.currentDialogue = null;
    this.lineIndex       = 0;
    this.onComplete      = null;
    this._panel          = null;
    this._typing         = false;
    this._typeCancel     = null;

    // Bound handler refs for cleanup
    this._onKeyDown  = this._onKeyDown.bind(this);
    this._onPanelClick = this._onPanelClick.bind(this);
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Start playing a dialogue sequence.
   * @param {Object} dialogueData — one entry from DIALOGUES
   * @param {Function} [onComplete] — called when dialogue finishes or a trigger fires
   */
  start(dialogueData, onComplete = null) {
    this.currentDialogue = dialogueData;
    this.lineIndex       = 0;
    this.onComplete      = onComplete;

    this._buildPanel();
    this._showLine(this.lineIndex);

    document.addEventListener('keydown', this._onKeyDown);
  }

  /**
   * Advance to the next dialogue line.
   * If text is still typing, complete it instantly instead.
   */
  next() {
    if (!this.currentDialogue) return;

    // If still typing, complete the current line instantly
    if (this._typing) {
      this._cancelTyping();
      return;
    }

    this.lineIndex++;
    const lines = this.currentDialogue.lines ?? [];
    if (this.lineIndex >= lines.length) {
      this.close();
      return;
    }

    this._showLine(this.lineIndex);
  }

  /**
   * Close the dialogue panel and clean up.
   */
  close() {
    document.removeEventListener('keydown', this._onKeyDown);
    if (this._panel) {
      this._panel.remove();
      this._panel = null;
    }
    this.currentDialogue = null;
    this.lineIndex       = 0;
    this._typing         = false;
    if (this.onComplete) {
      const cb = this.onComplete;
      this.onComplete = null;
      cb(null); // null trigger = natural end
    }
  }

  // ---------------------------------------------------------------------------
  // Panel construction
  // ---------------------------------------------------------------------------

  _buildPanel() {
    // Remove any existing panel
    if (this._panel) this._panel.remove();

    const overlay = document.createElement('div');
    overlay.className = 'dialogue-overlay';

    // --- Avatar area (top 60%) ---
    const avatarEl = document.createElement('div');
    avatarEl.className = 'dialogue-avatar-wrap side-left'; // default; updated per-line
    const avatarImg = document.createElement('div');
    avatarImg.className = 'dialogue-avatar';
    const avatarDot = document.createElement('div');
    avatarDot.className = 'dialogue-avatar-dot';
    avatarEl.appendChild(avatarImg);
    avatarEl.appendChild(avatarDot);

    // Narration display area (centred in upper 60%)
    const narrationArea = document.createElement('div');
    narrationArea.className = 'dialogue-narration-area';
    narrationArea.style.display = 'none';

    overlay.appendChild(avatarEl);
    overlay.appendChild(narrationArea);

    // --- Bottom box (bottom 40%) ---
    const box = document.createElement('div');
    box.className = 'dialogue-box';

    // Text area (speaker row + body text)
    const textArea = document.createElement('div');
    textArea.className = 'dialogue-text-area';

    const speakerRow = document.createElement('div');
    speakerRow.className = 'dialogue-speaker-row';

    const speakerEl = document.createElement('div');
    speakerEl.className = 'dialogue-speaker';

    const speakerBadge = document.createElement('div');
    speakerBadge.className = 'dialogue-speaker-badge hidden';

    speakerRow.appendChild(speakerEl);
    speakerRow.appendChild(speakerBadge);

    const textEl = document.createElement('div');
    textEl.className = 'dialogue-text';

    textArea.appendChild(speakerRow);
    textArea.appendChild(textEl);

    // Choices container (hidden by default)
    const choicesEl = document.createElement('div');
    choicesEl.className = 'dialogue-choices hidden';

    // Click-to-continue hint
    const indicator = document.createElement('div');
    indicator.className = 'dialogue-indicator';
    indicator.textContent = '點擊繼續';

    box.appendChild(textArea);
    box.appendChild(choicesEl);
    box.appendChild(indicator);
    overlay.appendChild(box);

    // Click to advance (but not on choice buttons)
    overlay.addEventListener('click', this._onPanelClick);

    this.container.appendChild(overlay);
    this._panel          = overlay;
    this._avatarEl       = avatarEl;
    this._avatarImg      = avatarImg;
    this._avatarDot      = avatarDot;
    this._narrationArea  = narrationArea;
    this._speakerEl      = speakerEl;
    this._speakerBadge   = speakerBadge;
    this._textEl         = textEl;
    this._choicesEl      = choicesEl;
    this._indicator      = indicator;
  }

  // ---------------------------------------------------------------------------
  // Line rendering
  // ---------------------------------------------------------------------------

  // Element colours matching the game's 5 elements (fire/water/wood/light/dark)
  // Keyed by the avatar id suffix pattern: char_01 → fire, char_02 → water, etc.
  static ELEMENT_COLORS = {
    fire:  '#FF5533',
    water: '#3399FF',
    wood:  '#44CC66',
    light: '#FFD700',
    dark:  '#AA55FF',
  };

  // Map avatar ids to portrait image paths (null = no image, use colour fallback)
  static PORTRAIT_MAP = {
    char_01_lanzeta:  'assets/char_01_lanzeta.png',
    char_02_voltrei:  'assets/char_02_voltrei.png',
    char_03_morira:   'assets/char_03_morira.png',
    char_04_yezva:    'assets/char_04_yaya_zvan.png',
    char_05_suqing:   'assets/char_05_suqing.png',
    char_06_airy:     'assets/char_06_airy.png',
    char_07_philo:    'assets/char_07_philo.png',
    char_08_ortai:    'assets/char_08_orltai.png',
    char_09_glen:     null,
    char_10_xiayu:    null,
    char_11_bolin:    null,
    char_12_moke:     null,
  };

  // Map avatar ids to elements so we can show the right colour dot
  static AVATAR_ELEMENT_MAP = {
    char_01_lanzeta:  'fire',
    char_02_voltrei:  'water',
    char_03_morira:   'wood',
    char_04_yezva:    'dark',
    char_05_suqing:   'water',
    char_06_airy:     'fire',
    char_07_philo:    'light',
    char_08_ortai:    'dark',
    char_09_glen:     'wood',
    char_10_xiayu:    'light',
    char_11_bolin:    'water',
    char_12_moke:     'dark',
  };

  _showLine(index) {
    const lines = this.currentDialogue?.lines ?? [];
    if (index >= lines.length) { this.close(); return; }

    const line = lines[index];
    this._choicesEl.classList.add('hidden');
    this._choicesEl.innerHTML = '';
    this._indicator.style.display = '';

    // System trigger line — fire callback immediately, don't display
    if (line.type === 'system') {
      this._handleTrigger(line.trigger ?? null);
      return;
    }

    // Choice line — show choices, hide indicator and avatar
    if (line.type === 'choice') {
      this._speakerEl.textContent = '';
      this._textEl.textContent    = '';
      this._avatarEl.style.display       = 'none';
      this._narrationArea.style.display  = 'none';
      this._avatarDot.style.display      = 'none';
      this._speakerBadge.classList.add('hidden');
      this._indicator.style.display = 'none';
      this._showChoices(line.choices ?? []);
      return;
    }

    // Narration line — displayed centred in upper area, no avatar
    if (line.type === 'narration' || !line.speaker) {
      this._avatarEl.style.display       = 'none';
      this._narrationArea.style.display  = 'flex';
      this._speakerEl.textContent        = '';
      this._speakerBadge.classList.add('hidden');
      this._textEl.textContent           = '';

      // Render typewriter in the upper centred area
      this._narrationArea.innerHTML = '';
      const narrationText = document.createElement('div');
      narrationText.className = 'dialogue-text dialogue-narration';
      this._narrationArea.appendChild(narrationText);
      this._typeText(narrationText, line.text ?? '', 30);
      return; // typewriter already started above
    }

    // Character line
    this._avatarEl.style.display       = '';
    this._narrationArea.style.display  = 'none';
    this._speakerEl.textContent        = line.speaker ?? '';
    this._textEl.className             = 'dialogue-text';

    // Determine avatar side: protagonist (no avatar or avatar contains 'player') → right
    const isPlayer = !line.avatar || line.avatar.includes('player');
    this._avatarEl.className = `dialogue-avatar-wrap ${isPlayer ? 'side-right' : 'side-left'}`;

    if (line.avatar) {
      const elemKey   = DialogueManager.AVATAR_ELEMENT_MAP[line.avatar] ?? null;
      const elemColor = elemKey ? DialogueManager.ELEMENT_COLORS[elemKey] : null;

      this._avatarImg.style.display  = '';
      this._avatarImg.dataset.avatar = line.avatar;

      // Try to load real portrait image using PORTRAIT_MAP
      const portraitSrc = DialogueManager.PORTRAIT_MAP[line.avatar] ?? null;
      // Clear any previous <img> child
      this._avatarImg.querySelectorAll('img.dlg-portrait').forEach(el => el.remove());
      if (portraitSrc) {
        const img = document.createElement('img');
        img.src = portraitSrc;
        img.className = 'dlg-portrait';
        img.alt = line.avatar;
        img.onerror = () => {
          img.remove();
          // fallback handled below — re-apply gradient background
          if (elemColor) {
            this._avatarImg.style.background =
              `radial-gradient(circle at 40% 35%, ${elemColor}55 0%, ${elemColor}22 60%, #1a1030 100%)`;
          }
        };
        // Let image fill the avatar box; background becomes transparent
        this._avatarImg.style.background = 'transparent';
        this._avatarImg.style.borderColor = elemColor ? `${elemColor}88` : '';
        this._avatarImg.appendChild(img);
      }

      if (elemColor) {
        if (!portraitSrc) {
          this._avatarImg.style.background =
            `radial-gradient(circle at 40% 35%, ${elemColor}55 0%, ${elemColor}22 60%, #1a1030 100%)`;
          this._avatarImg.style.borderColor = `${elemColor}88`;
        }

        this._avatarDot.style.display    = '';
        this._avatarDot.style.background = elemColor;
        this._avatarDot.style.boxShadow  = `0 0 8px ${elemColor}`;

        const ELEM_LABELS = { fire: '火', water: '水', wood: '木', light: '光', dark: '暗' };
        this._speakerBadge.textContent      = ELEM_LABELS[elemKey] ?? '';
        this._speakerBadge.style.background = elemColor;
        this._speakerBadge.classList.remove('hidden');
      } else {
        const hue = [...(line.avatar)].reduce((h, c) => h + c.charCodeAt(0), 0) % 360;
        this._avatarImg.style.background  = `hsl(${hue},50%,35%)`;
        this._avatarImg.style.borderColor = '';
        this._avatarDot.style.display     = 'none';
        this._speakerBadge.classList.add('hidden');
      }
    } else {
      this._avatarImg.style.display = 'none';
      this._avatarDot.style.display = 'none';
      this._speakerBadge.classList.add('hidden');
    }

    // Typewriter effect for character dialogue
    this._typeText(this._textEl, line.text ?? '', 30);
  }

  // ---------------------------------------------------------------------------
  // Choices
  // ---------------------------------------------------------------------------

  _showChoices(choices) {
    this._choicesEl.classList.remove('hidden');
    for (const choice of choices) {
      const btn = document.createElement('button');
      btn.className     = 'dialogue-choice-btn';
      btn.textContent   = choice.text ?? '';
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._choicesEl.classList.add('hidden');
        this._choicesEl.innerHTML = '';
        // If choice has a next target, jump to it; otherwise continue
        if (choice.next) {
          // Jump is handled externally via onComplete
          // We close current dialogue and signal the next one
          const nextId = choice.next;
          const cb = this.onComplete;
          this.onComplete = null;
          if (this._panel) { this._panel.remove(); this._panel = null; }
          document.removeEventListener('keydown', this._onKeyDown);
          this.currentDialogue = null;
          if (cb) cb({ type: 'jump', target: nextId });
        } else {
          // Move to next line
          this.lineIndex++;
          this._showLine(this.lineIndex);
        }
      });
      this._choicesEl.appendChild(btn);
    }
  }

  // ---------------------------------------------------------------------------
  // System trigger
  // ---------------------------------------------------------------------------

  _handleTrigger(trigger) {
    const cb = this.onComplete;
    // Clean up panel but keep dialogue context so caller can decide what to do
    document.removeEventListener('keydown', this._onKeyDown);
    if (this._panel) { this._panel.remove(); this._panel = null; }
    this.currentDialogue = null;
    this.onComplete      = null;
    if (cb) cb({ type: 'trigger', trigger });
  }

  // ---------------------------------------------------------------------------
  // Typewriter effect
  // ---------------------------------------------------------------------------

  /**
   * Render text character-by-character into element.
   * @param {HTMLElement} element
   * @param {string}      text
   * @param {number}      speed — ms per character
   */
  _typeText(element, text, speed = 30) {
    // Cancel any in-progress typing
    this._cancelTyping();

    element.textContent = '';
    this._typing = true;

    let charIndex = 0;
    let cancelled = false;
    let timeoutId = null;

    this._typeCancel = () => {
      cancelled = true;
      if (timeoutId !== null) clearTimeout(timeoutId);
      element.textContent = text;
      this._typing     = false;
      this._typeCancel = null;
    };

    const typeNext = () => {
      if (cancelled) return;
      if (charIndex >= text.length) {
        this._typing     = false;
        this._typeCancel = null;
        return;
      }
      element.textContent += text[charIndex];
      charIndex++;
      timeoutId = setTimeout(typeNext, speed);
    };

    timeoutId = setTimeout(typeNext, speed);
  }

  _cancelTyping() {
    if (this._typeCancel) {
      this._typeCancel();
    }
  }

  // ---------------------------------------------------------------------------
  // Input handlers
  // ---------------------------------------------------------------------------

  _onKeyDown(e) {
    if (e.code === 'Space' || e.code === 'Enter') {
      e.preventDefault();
      this.next();
    }
    if (e.code === 'Escape') {
      // Skip to end of dialogue
      this.close();
    }
  }

  _onPanelClick(e) {
    // Don't advance if the user clicked a choice button
    if (e.target.closest('.dialogue-choice-btn')) return;
    this.next();
  }
}
