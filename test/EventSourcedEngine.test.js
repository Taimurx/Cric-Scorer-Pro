const test = require('node:test');
const assert = require('node:assert/strict');
const { MatchEngine, EventType } = require('../core/EventSourcedEngine.js');

test('MatchEngine: Event projection', () => {
  const engine = new MatchEngine();
  
  engine.applyEvent({
    eventId: 'e1', matchId: 'm1', timestamp: 100, version: 1, type: EventType.MATCH_STARTED
  });
  engine.applyEvent({
    eventId: 'e2', matchId: 'm1', timestamp: 101, version: 2, type: EventType.INNINGS_STARTED
  });

  let state = engine.projectedState;
  assert.equal(state.status, 'ONGOING');
  assert.equal(state.currentInnings, 1);
  assert.equal(state.innings[0].runs, 0);

  // Normal ball: 4 runs
  engine.applyEvent({
    eventId: 'e3', matchId: 'm1', timestamp: 102, version: 3, type: EventType.BALL_SCORED,
    payload: { runsOffBat: 4, extras: [], isFreeHit: false }
  });

  state = engine.projectedState;
  assert.equal(state.innings[0].runs, 4);
  assert.equal(state.innings[0].balls, 1);

  // Wide ball
  engine.applyEvent({
    eventId: 'e4', matchId: 'm1', timestamp: 103, version: 4, type: EventType.BALL_SCORED,
    payload: { runsOffBat: 0, extras: [{ type: 'WIDE', runs: 1 }], isFreeHit: false }
  });

  state = engine.projectedState;
  assert.equal(state.innings[0].runs, 5);
  assert.equal(state.innings[0].balls, 1); // Ball count shouldn't increase

  // Undo the wide ball
  engine.applyEvent({
    eventId: 'e5', matchId: 'm1', timestamp: 104, version: 5, type: EventType.UNDO_ACTION,
    payload: { targetEventId: 'e4' }
  });

  state = engine.projectedState;
  assert.equal(state.innings[0].runs, 4); // Back to 4
  assert.equal(state.innings[0].balls, 1);

  // Wicket
  engine.applyEvent({
    eventId: 'e6', matchId: 'm1', timestamp: 105, version: 6, type: EventType.BALL_SCORED,
    payload: { runsOffBat: 0, extras: [], dismissal: { type: 'BOWLED' } }
  });

  state = engine.projectedState;
  assert.equal(state.innings[0].runs, 4);
  assert.equal(state.innings[0].balls, 2);
  assert.equal(state.innings[0].wickets, 1);

  // Edit ball e3 from 4 runs to 6 runs
  engine.applyEvent({
    eventId: 'e7', matchId: 'm1', timestamp: 106, version: 7, type: EventType.EDIT_BALL,
    payload: { targetEventId: 'e3', newPayload: { runsOffBat: 6, extras: [], isFreeHit: false } }
  });

  state = engine.projectedState;
  assert.equal(state.innings[0].runs, 6); // Wicket adds 0, edit changed 4 to 6.
  assert.equal(state.innings[0].balls, 2);
  assert.equal(state.innings[0].wickets, 1);
});
