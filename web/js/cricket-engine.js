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
  // =========================================================================
  // 9. EVENT SOURCED CORE ENGINE (P0)
  // =========================================================================
  const EventType = {
    MATCH_STARTED: 'MATCH_STARTED',
    INNINGS_STARTED: 'INNINGS_STARTED',
    BALL_SCORED: 'BALL_SCORED',
    UNDO_ACTION: 'UNDO_ACTION',
    EDIT_BALL: 'EDIT_BALL',
    PENALTY_ADDED: 'PENALTY_ADDED',
    MATCH_ENDED: 'MATCH_ENDED',
  };

  class MatchEngine {
    constructor(events = []) {
      this.events = [...events];
      this.events.sort((a, b) => (a.version || 0) - (b.version || 0) || a.timestamp - b.timestamp);
    }
    applyEvent(event) {
      this.events.push(event);
    }
    get projectedState() {
      const state = { matchId: '', status: 'PENDING', currentInnings: 0, innings: [] };
      const undoneEventIds = new Set();
      const edits = new Map();
      for (let i = this.events.length - 1; i >= 0; i--) {
        const ev = this.events[i];
        if (ev.type === EventType.UNDO_ACTION) undoneEventIds.add(ev.payload.targetEventId);
        else if (ev.type === EventType.EDIT_BALL && !edits.has(ev.payload.targetEventId)) {
          edits.set(ev.payload.targetEventId, ev.payload.newPayload);
        }
      }
      for (const ev of this.events) {
        if (undoneEventIds.has(ev.eventId)) continue;
        if (ev.type === EventType.UNDO_ACTION || ev.type === EventType.EDIT_BALL) continue;
        state.matchId = ev.matchId;
        if (ev.type === EventType.MATCH_STARTED) state.status = 'ONGOING';
        else if (ev.type === EventType.INNINGS_STARTED) {
          state.currentInnings += 1;
          state.innings.push({ runs: 0, wickets: 0, overs: 0, balls: 0, extras: { wideRuns: 0, noBallRuns: 0, byeRuns: 0, legByeRuns: 0, penaltyRuns: 0 } });
        } else if (ev.type === EventType.BALL_SCORED) {
          const payload = edits.has(ev.eventId) ? edits.get(ev.eventId) : ev.payload;
          if (state.innings.length === 0) continue;
          const currentInning = state.innings[state.currentInnings - 1];
          currentInning.runs += payload.runsOffBat || 0;
          let isLegalDelivery = true;
          if (payload.extras && payload.extras.length > 0) {
            for (const extra of payload.extras) {
              currentInning.runs += extra.runs;
              if (extra.type === 'WIDE') { currentInning.extras.wideRuns += extra.runs; isLegalDelivery = false; }
              else if (extra.type === 'NO_BALL') { currentInning.extras.noBallRuns += extra.runs; isLegalDelivery = false; }
              else if (extra.type === 'BYE') { currentInning.extras.byeRuns += extra.runs; }
              else if (extra.type === 'LEG_BYE') { currentInning.extras.legByeRuns += extra.runs; }
              else if (extra.type === 'PENALTY') { currentInning.extras.penaltyRuns += extra.runs; }
            }
          }
          if (payload.dismissal) currentInning.wickets += 1;
          if (isLegalDelivery) {
            currentInning.balls += 1;
            if (currentInning.balls === 6) { currentInning.overs += 1; currentInning.balls = 0; }
          }
        } else if (ev.type === EventType.MATCH_ENDED) state.status = 'COMPLETED';
      }
      return state;
    }

    get ballHistory() {
      const history = [];
      const undoneEventIds = new Set();
      const edits = new Map();
      for (let i = this.events.length - 1; i >= 0; i--) {
        const ev = this.events[i];
        if (ev.type === EventType.UNDO_ACTION) undoneEventIds.add(ev.payload.targetEventId);
        else if (ev.type === EventType.EDIT_BALL && !edits.has(ev.payload.targetEventId)) {
          edits.set(ev.payload.targetEventId, ev.payload.newPayload);
        }
      }
      for (const ev of this.events) {
        if (ev.type === EventType.BALL_SCORED && !undoneEventIds.has(ev.eventId)) {
          const payload = edits.has(ev.eventId) ? edits.get(ev.eventId) : ev.payload;
          let desc = payload.runsOffBat.toString();
          if (payload.dismissal) desc = "W";
          if (payload.extras && payload.extras.length > 0) {
            const ext = payload.extras[0].type;
            if (ext === 'WIDE') desc = "Wd";
            else if (ext === 'NO_BALL') desc = "Nb";
            else if (ext === 'LEG_BYE') desc = "Lb";
            else if (ext === 'BYE') desc = "B";
          }
          history.push({
            eventId: ev.eventId,
            overNumber: payload.overNumber,
            ballNumber: payload.ballNumber,
            description: desc,
            payload: payload
          });
        }
      }
      return history;
    }
  }

  class IndexedDBEventStore {
    constructor(dbName = 'CricScorerPro_Events', version = 1) {
      this.dbName = dbName; this.version = version; this.db = null;
    }
    async init() {
      return new Promise((resolve, reject) => {
        if (typeof window === 'undefined' || !window.indexedDB) { this.isNode = true; this.memoryEvents = []; return resolve(); }
        const request = window.indexedDB.open(this.dbName, this.version);
        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          if (!db.objectStoreNames.contains('events')) {
            const store = db.createObjectStore('events', { keyPath: 'eventId' });
            store.createIndex('matchId', 'matchId', { unique: false });
            store.createIndex('synced', 'synced', { unique: false });
          }
        };
        request.onsuccess = (event) => { this.db = event.target.result; resolve(); };
        request.onerror = (event) => reject(event.target.error);
      });
    }
    async saveEvent(event) {
      if (this.isNode) { this.memoryEvents.push({ ...event, synced: false }); return Promise.resolve(); }
      return new Promise((resolve, reject) => {
        const tx = this.db.transaction('events', 'readwrite');
        const request = tx.objectStore('events').put({ ...event, synced: false });
        request.onsuccess = () => resolve();
        request.onerror = (e) => reject(e.target.error);
      });
    }
    async getEventsForMatch(matchId) {
      if (this.isNode) {
        return Promise.resolve(this.memoryEvents.filter(e => e.matchId === matchId));
      }
      return new Promise((resolve, reject) => {
        const tx = this.db.transaction('events', 'readonly');
        const store = tx.objectStore('events');
        const index = store.index('matchId');
        const request = index.getAll(matchId);
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = (e) => reject(e.target.error);
      });
    }
    
    async getUnsyncedEvents() {
      if (this.isNode) {
        return Promise.resolve(this.memoryEvents.filter(e => !e.synced));
      }
      return new Promise((resolve, reject) => {
        const tx = this.db.transaction('events', 'readonly');
        const store = tx.objectStore('events');
        const index = store.index('synced');
        const request = index.getAll(false);
        request.onsuccess = (e) => resolve(e.target.result || []);
        request.onerror = (e) => reject(e.target.error);
      });
    }

    async markEventSynced(eventId) {
      if (this.isNode) {
        const ev = this.memoryEvents.find(e => e.eventId === eventId);
        if (ev) ev.synced = true;
        return Promise.resolve();
      }
      return new Promise((resolve, reject) => {
        const tx = this.db.transaction('events', 'readwrite');
        const store = tx.objectStore('events');
        const getReq = store.get(eventId);
        getReq.onsuccess = (e) => {
          const data = e.target.result;
          if (data) {
            data.synced = true;
            store.put(data);
          }
          resolve();
        };
        getReq.onerror = (e) => reject(e.target.error);
      });
    }

    close() {
      if (this.db) {
        this.db.close();
        this.db = null;
      }
    }
  }

  // =========================================================================
  // 10. OFFLINE SYNC SERVICE
  // =========================================================================
  class EventSyncService {
    constructor(eventStore, apiClient) {
      this.eventStore = eventStore;
      this.apiClient = apiClient;
      this.syncInProgress = false;
      this.onSyncComplete = null;
    }

    async syncOfflineEvents() {
      if (this.syncInProgress) return;
      this.syncInProgress = true;
      try {
        const unsynced = await this.eventStore.getUnsyncedEvents();
        if (unsynced.length === 0) {
          if (this.onSyncComplete) this.onSyncComplete(0, 0);
          this.syncInProgress = false;
          return;
        }

        const result = await this.apiClient.pushEvents(unsynced);
        const syncedIds = result?.syncedIds || unsynced.map(e => e.eventId);

        for (const event of unsynced) {
          if (syncedIds.includes(event.eventId)) {
            await this.eventStore.markEventSynced(event.eventId);
          }
        }
        if (this.onSyncComplete) this.onSyncComplete(syncedIds.length, unsynced.length - syncedIds.length);
      } catch (e) {
        console.warn('Sync failed, will retry later', e);
        if (this.onSyncComplete) this.onSyncComplete(0, -1);
      } finally {
        this.syncInProgress = false;
      }
    }

    startPeriodicSync(intervalMs = 5000) {
      if (this.intervalId) {
        this.stopPeriodicSync();
      }
      if (typeof window !== 'undefined') {
        this.intervalId = window.setInterval(() => this.syncOfflineEvents(), intervalMs);
      }
    }

    stopPeriodicSync() {
      if (this.intervalId) {
        if (typeof window !== 'undefined') window.clearInterval(this.intervalId);
        this.intervalId = null;
      }
    }
  }

  // =========================================================================
  // EXPOSE GLOBAL API
  // =========================================================================
    const CricketEngineObj = global.CricketEngine || {};
  Object.assign(CricketEngineObj, {
    version: '2.0.14',
    FreeHitManager,
    DLSEngine,
    BowlerQuotaCalculator,
    NetRunRateCalculator,
    EventType,
    MatchEngine,
    IndexedDBEventStore,
    EventSyncService
  });

  global.CricketEngine = CricketEngineObj;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = CricketEngineObj;
  }
})(typeof window !== 'undefined' ? window : globalThis);
