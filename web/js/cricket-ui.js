/**
 * Cric Scorer Pro � UI & Browser Side Effects
 */
(function(global) {
  'use strict';

  // 5. PROCEDURAL WEB AUDIO SYNTHESIZER (ZERO-ASSET SOUND EFFECTS)
  // =========================================================================
  class CricketAudioSynthesizer {
    constructor() {
      this.ctx = null;
      this.enabled = true;
      this.volume = 0.5; // default 50%
      this.masterGain = null;
    }

    init() {
      if (!this.ctx && typeof window !== 'undefined') {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
          this.ctx = new AudioContext();
          this.masterGain = this.ctx.createGain();
          this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
          this.masterGain.connect(this.ctx.destination);
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }

    setVolume(vol) {
      this.volume = Math.max(0.0, Math.min(1.0, parseFloat(vol) || 0));
      if (this.masterGain && this.ctx) {
        this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
      }
    }

    mute() {
      this.enabled = false;
      if (this.masterGain && this.ctx) {
        this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime);
      }
    }

    unmute() {
      this.enabled = true;
      if (this.masterGain && this.ctx) {
        this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
      }
    }

    /**
     * Play Dot Ball Click (Short subtle tap)
     */
    playDot() {
      if (!this.enabled) return;
      this.init();
      if (!this.ctx || !this.masterGain) return;

      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, t);
      osc.frequency.exponentialRampToValueAtTime(250, t + 0.04);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.18, t + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.05);
    }

    /**
     * Play Boundary 4 Fanfare (Ascending Triad: C5 - E5 - G5 - C6)
     */
    playFour() {
      if (!this.enabled) return;
      this.init();
      if (!this.ctx || !this.masterGain) return;

      const t = this.ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        const start = t + idx * 0.08;

        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.001, start);
        gain.gain.linearRampToValueAtTime(0.25, start + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.22);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(start);
        osc.stop(start + 0.24);
      });
    }

    /**
     * Play Maximum 6 Fanfare (Triumphant chord)
     */
    playSix() {
      if (!this.enabled) return;
      this.init();
      if (!this.ctx || !this.masterGain) return;

      const t = this.ctx.currentTime;
      const chord = [523.25, 659.25, 783.99, 1046.50, 1318.51];
      chord.forEach((freq) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, t);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.05, t + 0.45);

        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(0.18, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.58);
      });
    }

    /**
     * Play Wicket Siren / Gong
     */
    playWicket() {
      if (!this.enabled) return;
      this.init();
      if (!this.ctx || !this.masterGain) return;

      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, t);
      osc.frequency.exponentialRampToValueAtTime(75, t + 0.55);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.35, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.62);
    }

    /**
     * Play Free Hit Alert Buzz
     */
    playFreeHit() {
      if (!this.enabled) return;
      this.init();
      if (!this.ctx || !this.masterGain) return;

      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(440, t);
      osc.frequency.setValueAtTime(880, t + 0.12);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.22, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.3);
    }

    /**
     * Play No-Ball Siren (Two-tone emergency chirp)
     */
    playNoBall() {
      if (!this.enabled) return;
      this.init();
      if (!this.ctx || !this.masterGain) return;

      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(660, t);
      osc.frequency.setValueAtTime(880, t + 0.15);
      osc.frequency.setValueAtTime(660, t + 0.30);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.24, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.48);
    }

    /**
     * Play Wide Ball Whistle (Fast rising whistle)
     */
    playWide() {
      if (!this.enabled) return;
      this.init();
      if (!this.ctx || !this.masterGain) return;

      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1100, t);
      osc.frequency.exponentialRampToValueAtTime(1600, t + 0.12);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.20, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.24);
    }

    /**
     * Play Milestone Celebration (50 / 100 / Victory fanfare)
     */
    playMilestone() {
      if (!this.enabled) return;
      this.init();
      if (!this.ctx || !this.masterGain) return;

      const t = this.ctx.currentTime;
      const arpeggio = [440, 554.37, 659.25, 880, 1108.73]; // A Major triumph
      arpeggio.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        const start = t + idx * 0.07;

        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.001, start);
        gain.gain.linearRampToValueAtTime(0.25, start + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.40);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(start);
        osc.stop(start + 0.42);
      });
    }
  }

  // =========================================================================
  // 6. VOICE COMMENTARY ANNOUNCER (WEB SPEECH SYNTHESIS with EN / BN SUPPORT)
  // =========================================================================
  class CricketVoiceAnnouncer {
    constructor() {
      this.enabled = false;
      this.language = 'en'; // 'en' or 'bn'
      this.synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
      this.voices = [];
      
      if (this.synth) {
        const loadVoices = () => {
          this.voices = this.synth.getVoices();
        };
        loadVoices();
        if (this.synth.onvoiceschanged !== undefined) {
          this.synth.onvoiceschanged = loadVoices;
        }
      }
    }

    setLanguage(lang) {
      if (['en', 'bn'].includes(lang)) {
        this.language = lang;
      }
    }

    speak(text) {
      if (!this.enabled || !this.synth) return;
      try {
        this.synth.cancel(); // cancel previous unfinished queue
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = this.language === 'bn' ? 1.0 : 1.05;
        utterance.pitch = 1.0;
        
        const targetLang = this.language === 'bn' ? 'bn' : 'en';
        if (this.language === 'bn') {
          utterance.lang = 'bn-BD';
        } else {
          utterance.lang = 'en-US';
        }
        
        // Explicit voice selection to fix browser bugs with accent/language fallback
        if (this.voices && this.voices.length > 0) {
          const voice = this.voices.find(v => v.lang.startsWith(targetLang));
          if (voice) utterance.voice = voice;
        }
        
        this.synth.speak(utterance);
      } catch (e) {
        console.warn('[Announcer Error]', e);
      }
    }

    announceRuns(runs, strikerName = '') {
      if (this.language === 'bn') {
        if (runs === 0) this.speak('ডট বল');
        else if (runs === 4) this.speak(strikerName ? `${strikerName}-এর চার!` : 'চার রান!');
        else if (runs === 6) this.speak(strikerName ? `${strikerName}-এর বিশাল ছক্কা!` : 'বিশাল ছক্কা!');
        else this.speak(`${runs} রান`);
      } else {
        if (runs === 0) this.speak('Dot ball');
        else if (runs === 4) this.speak(strikerName ? `Four runs by ${strikerName}!` : 'Four runs!');
        else if (runs === 6) this.speak(strikerName ? `Massive Six by ${strikerName}!` : 'Massive Six!');
        else this.speak(`${runs} run${runs > 1 ? 's' : ''}`);
      }
    }

    announceWicket(dismissal = '', playerOut = '') {
      const mode = dismissal ? ` (${dismissal})` : '';
      if (this.language === 'bn') {
        this.speak(`আউট! উইকেট পতন! ${playerOut ? playerOut + ' আউট' + mode : ''}`);
      } else {
        this.speak(`Out! Wicket down! ${playerOut ? playerOut + ' is out' + mode : ''}`);
      }
    }

    announceFreeHit() {
      if (this.language === 'bn') {
        this.speak('নো বল! পরবর্তী বলে ফ্রি হিট!');
      } else {
        this.speak('No ball! Free hit on the next ball!');
      }
    }

    announceMilestone(type = '50', playerName = '') {
      if (this.language === 'bn') {
        if (type === '100') {
          this.speak(`${playerName ? playerName + '-এর ' : ''}অসাধারণ শতক! চমৎকার সেঞ্চুরি!`);
        } else {
          this.speak(`${playerName ? playerName + '-এর ' : ''}অর্ধশতক! দারুণ ফিফটি!`);
        }
      } else {
        if (type === '100') {
          this.speak(`Magnificent century by ${playerName || 'the batter'}! What a brilliant hundred!`);
        } else {
          this.speak(`Half century for ${playerName || 'the batter'}! Well-played fifty!`);
        }
      }
    }
  }

  // =========================================================================
  // 7. KEYBOARD SHORTCUTS MANAGER
  // =========================================================================
  class KeyboardShortcutsManager {
    constructor() {
      this.active = true;
      this.init();
    }

    init() {
      if (typeof window === 'undefined') return;

      this._handleKeyDown = (e) => {
        if (!this.active) return;
        // Skip typing in inputs/textareas
        const tag = (e.target.tagName || '').toLowerCase();
        if (tag === 'input' || tag === 'textarea' || e.target.isContentEditable) return;

        const key = e.key.toUpperCase();

        if (e.code === 'Space' || key === '0') {
          e.preventDefault();
          this.dispatch('cricket:score_ball', { runs: 0, extra: 'NONE' });
        } else if (['1', '2', '3', '4', '6'].includes(key)) {
          e.preventDefault();
          this.dispatch('cricket:score_ball', { runs: parseInt(key, 10), extra: 'NONE' });
        } else if (key === 'W') {
          e.preventDefault();
          this.dispatch('cricket:action', { action: 'WICKET' });
        } else if (key === 'D') {
          e.preventDefault();
          this.dispatch('cricket:action', { action: 'WIDE' });
        } else if (key === 'N') {
          e.preventDefault();
          this.dispatch('cricket:action', { action: 'NO_BALL' });
        } else if (key === 'B') {
          e.preventDefault();
          this.dispatch('cricket:action', { action: 'BYE' });
        } else if (key === 'L') {
          e.preventDefault();
          this.dispatch('cricket:action', { action: 'LEG_BYE' });
        } else if ((e.ctrlKey && key === 'Z') || key === 'U') {
          e.preventDefault();
          this.dispatch('cricket:action', { action: 'UNDO' });
        } else if (key === 'S') {
          e.preventDefault();
          this.dispatch('cricket:action', { action: 'SWAP_STRIKER' });
        }
      };

      window.addEventListener('keydown', this._handleKeyDown);
    }

    destroy() {
      if (this._handleKeyDown) {
        window.removeEventListener('keydown', this._handleKeyDown);
        this._handleKeyDown = null;
      }
    }

    dispatch(eventName, detail) {
      window.dispatchEvent(new CustomEvent(eventName, { detail }));
    }
  }

  // =========================================================================
  // 8. LIVE OVERLAY BROADCAST BRIDGE (OBS & STADIUM SYNC)
  // =========================================================================
  const overlayBridge = {
    channelName: 'cric_scorer_overlay_channel',
    storageKey: 'cric_live_overlay_data',

    broadcast(matchData) {
      if (!matchData) return;
      try {
        if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
          const channel = new BroadcastChannel(this.channelName);
          channel.postMessage(matchData);
          channel.close();
        }
      } catch (err) {
        void err;
      }

      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(this.storageKey, JSON.stringify(matchData));
        }
      } catch (err) {
        console.warn('[OverlayBridge] localStorage QuotaExceededError - Match data is too large for local storage sync. Continuing via BroadcastChannel.', err);
      }
    },

    listen(callback) {
      if (typeof window === 'undefined' || typeof callback !== 'function') return;

      let channel = null;
      const handleMessage = (event) => {
        if (event.data) callback(event.data);
      };
      
      const handleStorage = (e) => {
        if (e.key === this.storageKey && e.newValue) {
          try {
            callback(JSON.parse(e.newValue));
          } catch (err) {
            void err;
          }
        }
      };

      try {
        if ('BroadcastChannel' in window) {
          channel = new BroadcastChannel(this.channelName);
          channel.onmessage = handleMessage;
        }
      } catch (err) {
        void err;
      }

      window.addEventListener('storage', handleStorage);

      return function unsubscribe() {
        if (channel) channel.close();
        window.removeEventListener('storage', handleStorage);
      };
    }
  };

  

  const audioInstance = new CricketAudioSynthesizer();
  if (typeof document !== 'undefined') {
    document.addEventListener('click', () => audioInstance.init(), { once: true });
  }
  const announcerInstance = new CricketVoiceAnnouncer();
  const shortcutsInstance = new KeyboardShortcutsManager();

  const CricketUI = {
    audio: audioInstance,
    announcer: announcerInstance,
    shortcuts: shortcutsInstance,
    overlayBridge: overlayBridge,
    broadcastScore: (data) => overlayBridge.broadcast(data),
    listenScore: (cb) => overlayBridge.listen(cb)
  };

  global.CricketUI = CricketUI;
  
  if (!global.CricketEngine) global.CricketEngine = {};
  Object.assign(global.CricketEngine, CricketUI);

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = CricketUI;
  }
})(typeof window !== 'undefined' ? window : globalThis);
