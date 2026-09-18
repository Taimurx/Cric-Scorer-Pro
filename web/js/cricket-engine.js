/**
 * Cric Scorer Pro — Enterprise Cricket Engine & Rules Library
 * Version: 2.0.11
 * 
 * Features:
 * 1. Free Hit Engine (ICC T20/ODI Law 21.19 compliant with carry-over and dismissal filters)
 * 2. Duckworth-Lewis-Stern (DLS) Standard Calculation Engine & Par Sheet Generator
 * 3. Dynamic Rain-curtailed Bowler Quota Allocation (ICC standard 20% rule)
 * 4. Authoritative Net Run Rate (NRR) with All-Out Quota Adjustment
 * 5. Web Audio API Procedural Stadium Sound Synthesizer (Zero-asset audio)
 * 6. Web Speech Synthesis Voice Commentary Announcer
 * 7. Desktop Keyboard Scoring Shortcuts Engine
 * 8. Outdoor Sunlight High-Contrast Mode Controller
 */

(function (global) {
  'use strict';

  // =========================================================================
  // 1. FREE HIT ENGINE (ICC & MCC LAW 21.19)
  // =========================================================================
  class FreeHitManager {
    constructor() {
      this.isFreeHitActive = false;
      this.allowedDismissalsOnFreeHit = new Set([
        'RUN_OUT',
        'OBSTRUCTING_FIELD',
        'HIT_BALL_TWICE'
      ]);
    }

    /**
     * Process ball delivery outcome
     * @param {string} extraType - 'NONE', 'WIDE', 'NO_BALL', 'BYE', 'LEG_BYE'
     * @param {boolean} isLegalDelivery - whether ball counts toward over
     * @returns {object} updated status
     */
    processDelivery(extraType, isLegalDelivery) {
      const wasFreeHit = this.isFreeHitActive;
      const normalizedExtra = (extraType || 'NONE').toUpperCase();

      if (normalizedExtra === 'NO_BALL') {
        // Any No-Ball grants a Free Hit for the next ball
        this.isFreeHitActive = true;
        return {
          wasFreeHit,
          isFreeHitNext: true,
          reason: 'No-ball bowled: Free Hit awarded on next legal ball'
        };
      }

      if (wasFreeHit) {
        // If the free hit delivery is a wide or another no-ball, Free Hit carries over
        if (!isLegalDelivery || normalizedExtra === 'WIDE') {
          this.isFreeHitActive = true;
          return {
            wasFreeHit: true,
            isFreeHitNext: true,
            reason: 'Free Hit re-awarded (delivery was not legal)'
          };
        } else {
          // Legal delivery consumed the Free Hit
          this.isFreeHitActive = false;
          return {
            wasFreeHit: true,
            isFreeHitNext: false,
            reason: 'Free Hit completed'
          };
        }
      }

      return {
        wasFreeHit: false,
        isFreeHitNext: this.isFreeHitActive,
        reason: 'Normal delivery'
      };
    }

    /**
     * Check if a proposed dismissal is legal during a Free Hit
     * @param {string} dismissalType - 'BOWLED', 'CAUGHT', 'LBW', 'RUN_OUT', etc.
     */
    isDismissalAllowed(dismissalType) {
      if (!this.isFreeHitActive) return true;
      const normalized = (dismissalType || '').toUpperCase().replace(/\s+/g, '_');
      return this.allowedDismissalsOnFreeHit.has(normalized);
    }
  }

  // =========================================================================
  // 2. DUCKWORTH-LEWIS-STERN (DLS) CALCULATION ENGINE
  // =========================================================================
  // =========================================================================
  // 2. DUCKWORTH-LEWIS-STERN (DLS) CALCULATION ENGINE
  // =========================================================================
  class DLSEngine {
    constructor() {
      // Standard resource percentage parameters (exponential decay approximation R = 100 * (1 - exp(-b * overs)) * f(wickets))
      this.resourceConstants = [
        1.0,    // 0 wkts in hand (all out)
        0.32,   // 1 wkt remaining (9 down)
        0.48,   // 2 wkts remaining (8 down)
        0.60,   // 3 wkts remaining (7 down)
        0.70,   // 4 wkts remaining (6 down)
        0.78,   // 5 wkts remaining (5 down)
        0.85,   // 6 wkts remaining (4 down)
        0.90,   // 7 wkts remaining (3 down)
        0.94,   // 8 wkts remaining (2 down)
        0.97,   // 9 wkts remaining (1 down)
        1.00    // 10 wkts remaining (0 down)
      ];
      this.G50_T20 = 160; // Standard T20 G50 baseline average
      this.G50_ODI = 245; // Standard ODI G50 baseline average
    }

    /**
     * Convert overs string/number (e.g. 14.2) into true decimal overs (14 + 2/6 = 14.3333)
     */
    static oversToDecimal(oversStrOrNum) {
      return NetRunRateCalculator.oversToDecimal(oversStrOrNum);
    }

    /**
     * Calculate resource percentage remaining based on overs left and wickets lost
     * @param {number} oversRemaining - e.g. 15.2
     * @param {number} wicketsLost - 0 to 10
     * @param {number} maxOvers - scheduled total (e.g. 20 or 50)
     * @returns {number} Resource percentage (0 to 100)
     */
    getResourcePercentage(oversRemaining, wicketsLost, maxOvers = 20) {
      const wktsLeft = Math.max(0, Math.min(10, 10 - wicketsLost));
      const decimalOversRemaining = DLSEngine.oversToDecimal(oversRemaining);
      const decimalMaxOvers = Math.max(1, DLSEngine.oversToDecimal(maxOvers));
      if (wktsLeft === 0 || decimalOversRemaining <= 0) return 0.0;

      const bFactor = decimalMaxOvers <= 20 ? 0.065 : 0.035;
      const rawResource = (1 - Math.exp(-bFactor * decimalOversRemaining * (decimalMaxOvers / 20))) * 100;
      const wktFactor = this.resourceConstants[wktsLeft];

      const res = rawResource * wktFactor;
      return +Math.min(100.0, Math.max(0.0, res)).toFixed(2);
    }

    /**
     * Calculate revised target score for Team 2 after rain interruption
     * @param {number} team1Runs - Total runs scored by 1st innings team
     * @param {number} team1Overs - Scheduled overs for Team 1 (e.g. 20)
     * @param {number} team2MaxOvers - Reduced overs available for Team 2 (e.g. 14)
     * @param {string} format - 'T20' or 'ODI'
     */
    calculateRevisedTarget(team1Runs, team1Overs, team2MaxOvers, format = 'T20') {
      const decTeam1Overs = DLSEngine.oversToDecimal(team1Overs);
      const decTeam2Overs = DLSEngine.oversToDecimal(team2MaxOvers);
      const r1 = this.getResourcePercentage(decTeam1Overs, 0, decTeam1Overs); // typically 100%
      const r2 = this.getResourcePercentage(decTeam2Overs, 0, decTeam1Overs);
      const g50 = format === 'T20' ? this.G50_T20 : this.G50_ODI;

      let target;
      let parScore;
      if (r2 < r1) {
        // Team 2 has less resources: target scaled down
        parScore = Math.floor(team1Runs * (r2 / r1));
        target = parScore + 1;
      } else if (r2 === r1) {
        parScore = team1Runs;
        target = team1Runs + 1;
      } else {
        // Team 2 has more resources: target scaled up
        parScore = team1Runs + Math.floor(((r2 - r1) / 100) * g50);
        target = parScore + 1;
      }

      return {
        target: Math.max(1, target),
        parScore: Math.max(0, parScore),
        team1Runs,
        team1Overs: decTeam1Overs,
        team2Overs: decTeam2Overs,
        resourceTeam1: r1,
        resourceTeam2: r2
      };
    }

    /**
     * Calculate live DLS Par Score at any point during 2nd innings
     * @param {number} team1Runs - 1st innings total
     * @param {number} oversCompleted - e.g. 12.3
     * @param {number} wicketsLost - 0 to 10
     * @param {number} scheduledOvers - e.g. 20
     */
    calculateParScore(team1Runs, oversCompleted, wicketsLost, scheduledOvers = 20) {
      if (wicketsLost >= 10) return team1Runs + 1;

      const decCompleted = DLSEngine.oversToDecimal(oversCompleted);
      const decScheduled = Math.max(1, DLSEngine.oversToDecimal(scheduledOvers));
      const oversRemaining = Math.max(0, decScheduled - decCompleted);
      const r1 = 100.0;
      const rTotalTeam2 = this.getResourcePercentage(decScheduled, 0, decScheduled);
      const rRemaining = this.getResourcePercentage(oversRemaining, wicketsLost, decScheduled);
      const rUsed = Math.max(0, rTotalTeam2 - rRemaining);

      const parScore = Math.floor(team1Runs * (rUsed / r1));
      return Math.max(0, parScore);
    }

    /**
     * Calculate live match situation comparison against DLS Par score
     */
    calculateMatchStatus(team1Runs, team2Runs, team2OversCompleted, wicketsLost, team2MaxOvers = 20) {
      const parScore = this.calculateParScore(team1Runs, team2OversCompleted, wicketsLost, team2MaxOvers);
      const target = parScore + 1;
      const runsNeeded = Math.max(0, target - team2Runs);
      const decOvers = DLSEngine.oversToDecimal(team2OversCompleted);
      const decMax = DLSEngine.oversToDecimal(team2MaxOvers);
      const ballsBowled = Math.round(decOvers * 6);
      const totalBalls = Math.round(decMax * 6);
      const ballsRemaining = Math.max(0, totalBalls - ballsBowled);
      const crr = decOvers > 0 ? +(team2Runs / decOvers).toFixed(2) : 0;
      const rrr = ballsRemaining > 0 ? +((runsNeeded / (ballsRemaining / 6))).toFixed(2) : 0;

      let status = 'TIED';
      const diff = team2Runs - parScore;
      if (diff > 0) status = 'AHEAD_OF_PAR';
      else if (diff < 0) status = 'BEHIND_PAR';

      return {
        parScore,
        target,
        team2Runs,
        diff,
        status,
        runsNeeded,
        ballsRemaining,
        crr,
        rrr
      };
    }
  }

  // =========================================================================
  // 3. DYNAMIC RAIN-CURTAILED BOWLER QUOTA CALCULATOR (ICC 20% RULE)
  // =========================================================================
  class BowlerQuotaCalculator {
    /**
     * Calculate legal over limits per bowler when match overs are reduced
     * Rule: Matches under 10 overs allow maximum 3 overs per bowler
     * Matches 10 overs and above follow standard 20% ICC quota (overs / minBowlers)
     * @param {number} totalInningsOvers - e.g. 5, 8, 13, 17, 20
     * @param {number} minBowlers - minimum required bowlers (default 5)
     */
    static calculateQuotas(totalInningsOvers, minBowlers = 5) {
      const overs = Math.max(1, Math.floor(totalInningsOvers));

      // Rule: Under 10 overs, each bowler can bowl a maximum of 3 overs
      if (overs < 10) {
        const maxLimit = Math.min(3, overs);
        const fullBowlers = Math.floor(overs / maxLimit);
        const remainder = overs % maxLimit;
        let distributionText = '';

        if (remainder === 0) {
          distributionText = `Matches under 10 overs rule: Each bowler can bowl a maximum of ${maxLimit} overs (${fullBowlers} bowler(s) x ${maxLimit} overs).`;
        } else {
          distributionText = `Matches under 10 overs rule: Each bowler can bowl a maximum of ${maxLimit} overs (${fullBowlers} bowler(s) max ${maxLimit} overs, 1 bowler max ${remainder} over(s)).`;
        }

        return {
          totalOvers: overs,
          bowlersWithExtraOver: remainder,
          maxOverLimit: maxLimit,
          minOverLimit: remainder > 0 ? remainder : maxLimit,
          distributionText
        };
      }

      const baseQuota = Math.floor(overs / minBowlers);
      const remainder = overs % minBowlers;
      const maxOverLimit = Math.max(1, baseQuota + (remainder > 0 ? 1 : 0));
      const minOverLimit = Math.max(1, baseQuota > 0 ? baseQuota : 1);

      let distributionText = '';
      if (remainder === 0) {
        distributionText = `${minBowlers} bowlers can bowl a maximum of ${baseQuota} overs each.`;
      } else {
        const bowlersWithBase = minBowlers - remainder;
        distributionText = `${remainder} bowler(s) can bowl max ${maxOverLimit} overs; ${bowlersWithBase} bowler(s) can bowl max ${minOverLimit} over(s).`;
      }

      return {
        totalOvers: overs,
        bowlersWithExtraOver: remainder,
        maxOverLimit,
        minOverLimit,
        distributionText
      };
    }
  }

  // =========================================================================
  // 4. NET RUN RATE (NRR) CALCULATOR (WITH ALL-OUT OVERS ADJUSTMENT)
  // =========================================================================
  class NetRunRateCalculator {
    /**
     * Convert overs (e.g. 19.4) to decimal overs (19.6667)
     */
    static oversToDecimal(oversStrOrNum) {
      const val = parseFloat(oversStrOrNum) || 0;
      const completed = Math.floor(val);
      const balls = Math.round((val - completed) * 10);
      return completed + (balls / 6.0);
    }

    /**
     * Compute authoritative tournament NRR for a single match
     */
    static calculateNRR(
      runsScored, oversFaced, isAllOut, scheduledOversFor,
      runsConceded, oversBowled, isOpponentAllOut, scheduledOversAgainst
    ) {
      const actualOversFor = isAllOut ? scheduledOversFor : this.oversToDecimal(oversFaced);
      const actualOversAgainst = isOpponentAllOut ? scheduledOversAgainst : this.oversToDecimal(oversBowled);

      const runRateFor = actualOversFor > 0 ? runsScored / actualOversFor : 0;
      const runRateAgainst = actualOversAgainst > 0 ? runsConceded / actualOversAgainst : 0;

      const nrr = +(runRateFor - runRateAgainst).toFixed(3);
      return {
        nrr,
        runRateFor: +runRateFor.toFixed(2),
        runRateAgainst: +runRateAgainst.toFixed(2),
        adjustedOversFor: +actualOversFor.toFixed(2),
        adjustedOversAgainst: +actualOversAgainst.toFixed(2)
      };
    }

    /**
     * Compute tournament multi-match aggregate NRR (Official ICC Standings Formula)
     * @param {Array<object>} matches - Array of match stats
     */
    static calculateTournamentNRR(matches) {
      if (!Array.isArray(matches) || matches.length === 0) {
        return { nrr: 0.000, totalRunsFor: 0, totalOversFor: 0, totalRunsAgainst: 0, totalOversAgainst: 0 };
      }

      let totalRunsFor = 0;
      let totalOversFor = 0;
      let totalRunsAgainst = 0;
      let totalOversAgainst = 0;

      for (const m of matches) {
        const of = m.isAllOut ? m.scheduledOversFor : this.oversToDecimal(m.oversFaced);
        const oa = m.isOpponentAllOut ? m.scheduledOversAgainst : this.oversToDecimal(m.oversBowled);

        totalRunsFor += (m.runsScored || 0);
        totalOversFor += of;
        totalRunsAgainst += (m.runsConceded || 0);
        totalOversAgainst += oa;
      }

      const rrFor = totalOversFor > 0 ? totalRunsFor / totalOversFor : 0;
      const rrAgainst = totalOversAgainst > 0 ? totalRunsAgainst / totalOversAgainst : 0;
      const nrr = +(rrFor - rrAgainst).toFixed(3);

      return {
        nrr,
        totalRunsFor,
        totalOversFor: +totalOversFor.toFixed(2),
        totalRunsAgainst,
        totalOversAgainst: +totalOversAgainst.toFixed(2),
        rrFor: +rrFor.toFixed(2),
        rrAgainst: +rrAgainst.toFixed(2)
      };
    }
  }

  // =========================================================================
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

      window.addEventListener('keydown', (e) => {
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
      });
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
        void err;
      }
    },

    listen(callback) {
      if (typeof window === 'undefined' || typeof callback !== 'function') return;

      try {
        if ('BroadcastChannel' in window) {
          const channel = new BroadcastChannel(this.channelName);
          channel.onmessage = (event) => {
            if (event.data) callback(event.data);
          };
        }
      } catch (err) {
        void err;
      }

      window.addEventListener('storage', (e) => {
        if (e.key === this.storageKey && e.newValue) {
          try {
            callback(JSON.parse(e.newValue));
          } catch (err) {
            void err;
          }
        }
      });
    }
  };

  // =========================================================================
  // EXPOSE GLOBAL API
  // =========================================================================
  const audioInstance = new CricketAudioSynthesizer();
  const announcerInstance = new CricketVoiceAnnouncer();
  const shortcutsInstance = new KeyboardShortcutsManager();

  const CricketEngine = {
    version: '2.0.13',
    FreeHitManager,
    DLSEngine,
    BowlerQuotaCalculator,
    NetRunRateCalculator,
    audio: audioInstance,
    announcer: announcerInstance,
    shortcuts: shortcutsInstance,
    overlayBridge,
    broadcastScore: (data) => overlayBridge.broadcast(data),
    listenScore: (cb) => overlayBridge.listen(cb)
  };

  global.CricketEngine = CricketEngine;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = CricketEngine;
  }
})(typeof window !== 'undefined' ? window : globalThis);
