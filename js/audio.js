// audio.js — AudioManager: Web Audio API sound system with procedural synthesis
// No external audio files required. All sounds are generated programmatically.
// ES Module

export class AudioManager {
  constructor() {
    this._ctx       = null; // AudioContext, lazy init on first user interaction
    this._bgmGain   = null;
    this._sfxGain   = null;
    this._bgmNode   = null;
    this._buffers   = {}; // cached AudioBuffers
    this.bgmVolume  = 0.5;
    this.sfxVolume  = 0.8;
    this.muted      = false;

    // Generate all synth buffers immediately (no AudioContext needed for buffer math)
    // Actual AudioContext is created lazily on first playback.
    this._pendingSynth = true; // flag: generate buffers on first _ensureContext()
  }

  // ---------------------------------------------------------------------------
  // Context
  // ---------------------------------------------------------------------------

  /** Lazy init AudioContext (must be triggered by user gesture). */
  _ensureContext() {
    if (this._ctx) return;
    try {
      this._ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.warn('[AudioManager] AudioContext unavailable:', e);
      return;
    }

    // Master gain nodes
    this._bgmGain = this._ctx.createGain();
    this._bgmGain.gain.value = this.muted ? 0 : this.bgmVolume;
    this._bgmGain.connect(this._ctx.destination);

    this._sfxGain = this._ctx.createGain();
    this._sfxGain.gain.value = this.muted ? 0 : this.sfxVolume;
    this._sfxGain.connect(this._ctx.destination);

    // Generate all synthesised sound buffers now that we have a context
    if (this._pendingSynth) {
      this._pendingSynth = false;
      this._generateSynth();
    }
  }

  // ---------------------------------------------------------------------------
  // Synthesised sound generation
  // ---------------------------------------------------------------------------

  /**
   * Pre-render all game sounds as AudioBuffers using Web Audio API math.
   * Called once after AudioContext is available.
   */
  _generateSynth() {
    const ctx = this._ctx;
    if (!ctx) return;

    const sr = ctx.sampleRate;

    // --- match: short sine burst + decay (200ms) ---
    this._buffers['match'] = this._makeSine(ctx, 880, 0.200, 0.6, 'exponential');

    // --- combo: two layered sine waves (150ms) ---
    {
      const dur    = 0.150;
      const frames = Math.ceil(sr * dur);
      const buf    = ctx.createBuffer(1, frames, sr);
      const data   = buf.getChannelData(0);
      for (let i = 0; i < frames; i++) {
        const t    = i / sr;
        const env  = Math.exp(-t * 18);
        data[i]    = (Math.sin(2 * Math.PI * 660 * t) * 0.5
                    + Math.sin(2 * Math.PI * 990 * t) * 0.5) * env * 0.55;
      }
      this._buffers['combo'] = buf;
    }

    // --- attack: white noise + low-pass feeling (100ms) ---
    {
      const dur    = 0.100;
      const frames = Math.ceil(sr * dur);
      const buf    = ctx.createBuffer(1, frames, sr);
      const data   = buf.getChannelData(0);
      for (let i = 0; i < frames; i++) {
        const t   = i / sr;
        const env = Math.exp(-t * 30);
        // Simple LP approximation: average adjacent samples of white noise
        data[i]   = (Math.random() * 2 - 1) * env * 0.45;
      }
      this._buffers['attack'] = buf;
    }

    // --- heal: ascending sine glide (300ms) ---
    {
      const dur    = 0.300;
      const frames = Math.ceil(sr * dur);
      const buf    = ctx.createBuffer(1, frames, sr);
      const data   = buf.getChannelData(0);
      for (let i = 0; i < frames; i++) {
        const t    = i / sr;
        const freq = 880 + 440 * (t / dur); // glide from 880 to 1320 Hz
        const env  = Math.sin(Math.PI * t / dur); // bell envelope
        // accumulate phase manually for accurate frequency sweep
        data[i]    = Math.sin(2 * Math.PI * freq * t) * env * 0.45;
      }
      this._buffers['heal'] = buf;
    }

    // --- button: ultra-short square click (50ms) ---
    {
      const dur    = 0.050;
      const frames = Math.ceil(sr * dur);
      const buf    = ctx.createBuffer(1, frames, sr);
      const data   = buf.getChannelData(0);
      const freq   = 1200;
      for (let i = 0; i < frames; i++) {
        const t    = i / sr;
        const env  = Math.exp(-t * 60);
        // square wave approximation (sign of sine)
        data[i]    = Math.sign(Math.sin(2 * Math.PI * freq * t)) * env * 0.3;
      }
      this._buffers['button'] = buf;
    }

    // --- victory: three ascending notes C-E-G (200ms each = 600ms total) ---
    {
      const noteDur = 0.200;
      const notes   = [523.25, 659.25, 783.99]; // C5, E5, G5
      const dur     = noteDur * notes.length;
      const frames  = Math.ceil(sr * dur);
      const buf     = ctx.createBuffer(1, frames, sr);
      const data    = buf.getChannelData(0);
      for (let ni = 0; ni < notes.length; ni++) {
        const freq    = notes[ni];
        const start   = Math.floor(ni * noteDur * sr);
        const end     = Math.floor((ni + 1) * noteDur * sr);
        for (let i = start; i < end && i < frames; i++) {
          const t    = (i - start) / sr;
          const env  = Math.sin(Math.PI * t / noteDur);
          data[i]   += Math.sin(2 * Math.PI * freq * t) * env * 0.5;
        }
      }
      this._buffers['victory'] = buf;
    }

    // --- defeat: three descending notes G-Eb-C (300ms each = 900ms total) ---
    {
      const noteDur = 0.300;
      const notes   = [783.99, 622.25, 523.25]; // G5, Eb5, C5
      const dur     = noteDur * notes.length;
      const frames  = Math.ceil(sr * dur);
      const buf     = ctx.createBuffer(1, frames, sr);
      const data    = buf.getChannelData(0);
      for (let ni = 0; ni < notes.length; ni++) {
        const freq  = notes[ni];
        const start = Math.floor(ni * noteDur * sr);
        const end   = Math.floor((ni + 1) * noteDur * sr);
        for (let i = start; i < end && i < frames; i++) {
          const t   = (i - start) / sr;
          const env = Math.sin(Math.PI * t / noteDur);
          data[i]  += Math.sin(2 * Math.PI * freq * t) * env * 0.45;
        }
      }
      this._buffers['defeat'] = buf;
    }
  }

  /**
   * Helper: create a mono AudioBuffer with a decaying sine wave.
   * @param {AudioContext} ctx
   * @param {number} freq        — frequency in Hz
   * @param {number} duration    — seconds
   * @param {number} amplitude   — peak amplitude (0–1)
   * @param {'exponential'|'linear'} [shape]
   * @returns {AudioBuffer}
   */
  _makeSine(ctx, freq, duration, amplitude, shape = 'exponential') {
    const sr     = ctx.sampleRate;
    const frames = Math.ceil(sr * duration);
    const buf    = ctx.createBuffer(1, frames, sr);
    const data   = buf.getChannelData(0);
    const decay  = shape === 'exponential' ? 12 : (1 / duration);
    for (let i = 0; i < frames; i++) {
      const t    = i / sr;
      const env  = shape === 'exponential'
        ? Math.exp(-t * decay)
        : Math.max(0, 1 - t * decay);
      data[i]    = Math.sin(2 * Math.PI * freq * t) * env * amplitude;
    }
    return buf;
  }

  // ---------------------------------------------------------------------------
  // Preload (URL / base64 data URI support — optional)
  // ---------------------------------------------------------------------------

  /**
   * Preload an external audio file into the buffer cache.
   * Falls back silently if the URL cannot be fetched.
   * @param {string} id  — buffer key
   * @param {string} url — URL or base64 data URI
   */
  async preload(id, url) {
    this._ensureContext();
    if (!this._ctx) return;
    try {
      const res  = await fetch(url);
      const ab   = await res.arrayBuffer();
      const buf  = await this._ctx.decodeAudioData(ab);
      this._buffers[id] = buf;
    } catch (e) {
      console.warn(`[AudioManager] preload failed for "${id}":`, e);
    }
  }

  // ---------------------------------------------------------------------------
  // SFX playback
  // ---------------------------------------------------------------------------

  /**
   * Play a sound effect (supports simultaneous instances).
   * @param {string} id         — buffer key
   * @param {number} [pitchRate] — playback rate (default 1.0)
   */
  playSfx(id, pitchRate = 1.0) {
    this._ensureContext();
    if (!this._ctx || this.muted) return;
    const buf = this._buffers[id];
    if (!buf) {
      console.warn(`[AudioManager] no buffer for sfx "${id}"`);
      return;
    }
    // Resume context if suspended (Chrome autoplay policy)
    if (this._ctx.state === 'suspended') {
      this._ctx.resume().catch(() => {});
    }
    const src = this._ctx.createBufferSource();
    src.buffer            = buf;
    src.playbackRate.value = pitchRate;
    src.connect(this._sfxGain);
    src.start(0);
    // Auto-cleanup when done
    src.onended = () => src.disconnect();
  }

  /**
   * COMBO sound: base combo sfx with pitch rising per combo count.
   * @param {number} comboCount — current combo number (1+)
   */
  playComboSfx(comboCount) {
    const pitch = Math.min(1.0 + (comboCount - 1) * 0.08, 2.0);
    this.playSfx('combo', pitch);
  }

  /**
   * Match sound: orb type influences pitch.
   * @param {number} elementType — 0=fire,1=water,2=wood,3=light,4=dark,5=heart
   */
  playMatchSfx(elementType) {
    const pitchMap = [0.85, 1.1, 0.95, 1.2, 0.7, 1.0];
    this.playSfx('match', pitchMap[elementType] ?? 1.0);
  }

  // ---------------------------------------------------------------------------
  // BGM
  // ---------------------------------------------------------------------------

  /**
   * Switch BGM with crossfade.
   * @param {string} id           — buffer key
   * @param {number} fadeDuration — ms
   */
  async switchBgm(id, fadeDuration = 500) {
    this._ensureContext();
    if (!this._ctx) return;

    const fadeSecs = fadeDuration / 1000;

    // Fade out current BGM
    if (this._bgmNode) {
      const oldNode = this._bgmNode;
      const oldGain = this._ctx.createGain();
      oldGain.gain.setValueAtTime(this.bgmVolume, this._ctx.currentTime);
      oldGain.gain.linearRampToValueAtTime(0, this._ctx.currentTime + fadeSecs);
      oldGain.connect(this._ctx.destination);
      oldNode.disconnect();
      oldNode.connect(oldGain);
      setTimeout(() => { try { oldNode.stop(); } catch (_) {} oldGain.disconnect(); }, fadeDuration + 50);
      this._bgmNode = null;
    }

    const buf = this._buffers[id];
    if (!buf) return;

    // Fade in new BGM
    const src = this._ctx.createBufferSource();
    src.buffer = buf;
    src.loop   = true;

    const fadeGain = this._ctx.createGain();
    fadeGain.gain.setValueAtTime(0, this._ctx.currentTime);
    fadeGain.gain.linearRampToValueAtTime(
      this.muted ? 0 : this.bgmVolume,
      this._ctx.currentTime + fadeSecs
    );
    fadeGain.connect(this._bgmGain);
    src.connect(fadeGain);

    if (this._ctx.state === 'suspended') await this._ctx.resume();
    src.start(0);
    this._bgmNode = src;
  }

  /**
   * Stop BGM with optional fade-out.
   * @param {number} fadeDuration — ms
   */
  stopBgm(fadeDuration = 300) {
    if (!this._ctx || !this._bgmNode) return;
    const fadeSecs = fadeDuration / 1000;
    const fadeGain = this._ctx.createGain();
    fadeGain.gain.setValueAtTime(this.bgmVolume, this._ctx.currentTime);
    fadeGain.gain.linearRampToValueAtTime(0, this._ctx.currentTime + fadeSecs);
    fadeGain.connect(this._ctx.destination);
    this._bgmNode.disconnect();
    this._bgmNode.connect(fadeGain);
    const node = this._bgmNode;
    this._bgmNode = null;
    setTimeout(() => { try { node.stop(); } catch (_) {} fadeGain.disconnect(); }, fadeDuration + 50);
  }

  // ---------------------------------------------------------------------------
  // Volume / Mute
  // ---------------------------------------------------------------------------

  /** Toggle mute on/off. Returns new muted state. */
  toggleMute() {
    this.muted = !this.muted;
    if (this._sfxGain) this._sfxGain.gain.value  = this.muted ? 0 : this.sfxVolume;
    if (this._bgmGain) this._bgmGain.gain.value  = this.muted ? 0 : this.bgmVolume;
    return this.muted;
  }

  /**
   * Set volume for BGM or SFX channel.
   * @param {'bgm'|'sfx'} type
   * @param {number}       value — 0.0 to 1.0
   */
  setVolume(type, value) {
    const v = Math.max(0, Math.min(1, value));
    if (type === 'bgm') {
      this.bgmVolume = v;
      if (this._bgmGain && !this.muted) this._bgmGain.gain.value = v;
    } else if (type === 'sfx') {
      this.sfxVolume = v;
      if (this._sfxGain && !this.muted) this._sfxGain.gain.value = v;
    }
  }
}
