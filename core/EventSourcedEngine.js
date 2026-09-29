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
    // Sort events by version or timestamp to ensure deterministic replay
    this.events.sort((a, b) => (a.version || 0) - (b.version || 0) || a.timestamp - b.timestamp);
  }

  applyEvent(event) {
    this.events.push(event);
  }

  get projectedState() {
    const state = {
      matchId: '',
      status: 'PENDING',
      currentInnings: 0,
      innings: []
    };

    const undoneEventIds = new Set();
    const edits = new Map();

    // First pass: identify undone events and edits
    for (let i = this.events.length - 1; i >= 0; i--) {
      const ev = this.events[i];
      if (ev.type === EventType.UNDO_ACTION) {
        undoneEventIds.add(ev.payload.targetEventId);
      } else if (ev.type === EventType.EDIT_BALL) {
        if (!edits.has(ev.payload.targetEventId)) {
          edits.set(ev.payload.targetEventId, ev.payload.newPayload);
        }
      }
    }

    // Second pass: project state
    for (const ev of this.events) {
      if (undoneEventIds.has(ev.eventId)) {
        continue; // skip undone events
      }

      if (ev.type === EventType.UNDO_ACTION || ev.type === EventType.EDIT_BALL) {
        continue; // Meta-events don't directly modify state in this loop
      }

      state.matchId = ev.matchId;

      if (ev.type === EventType.MATCH_STARTED) {
        state.status = 'ONGOING';
      } else if (ev.type === EventType.INNINGS_STARTED) {
        state.currentInnings += 1;
        state.innings.push({
          runs: 0,
          wickets: 0,
          overs: 0,
          balls: 0,
          battingTeamId: '',
          bowlingTeamId: '',
          strikerId: null,
          nonStrikerId: null,
          currentBowlerId: null,
          extras: { wideRuns: 0, noBallRuns: 0, byeRuns: 0, legByeRuns: 0, penaltyRuns: 0 }
        });
      } else if (ev.type === EventType.BALL_SCORED) {
        const payload = edits.has(ev.eventId) ? edits.get(ev.eventId) : ev.payload;
        
        if (state.innings.length === 0) continue;
        const currentInning = state.innings[state.currentInnings - 1];

        currentInning.runs += payload.runsOffBat || 0;
        
        let isLegalDelivery = true;

        if (payload.extras && payload.extras.length > 0) {
          for (const extra of payload.extras) {
            currentInning.runs += extra.runs;
            if (extra.type === 'WIDE') {
              currentInning.extras.wideRuns += extra.runs;
              isLegalDelivery = false;
            } else if (extra.type === 'NO_BALL') {
              currentInning.extras.noBallRuns += extra.runs;
              isLegalDelivery = false;
            } else if (extra.type === 'BYE') {
              currentInning.extras.byeRuns += extra.runs;
            } else if (extra.type === 'LEG_BYE') {
              currentInning.extras.legByeRuns += extra.runs;
            } else if (extra.type === 'PENALTY') {
              currentInning.extras.penaltyRuns += extra.runs;
            }
          }
        }

        if (payload.dismissal) {
          currentInning.wickets += 1;
        }

        if (isLegalDelivery) {
          currentInning.balls += 1;
          if (currentInning.balls === 6) {
            currentInning.overs += 1;
            currentInning.balls = 0;
          }
        }
      } else if (ev.type === EventType.MATCH_ENDED) {
        state.status = 'COMPLETED';
      }
    }

    return state;
  }
}

module.exports = {
  EventType,
  MatchEngine
};
