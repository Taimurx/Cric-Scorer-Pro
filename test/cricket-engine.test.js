const test = require('node:test');
const assert = require('node:assert/strict');
const CricketEngine = require('../web/js/cricket-engine.js');

test('CricketEngine: Free Hit Law 21.19 Enforcement', () => {
  const fhm = new CricketEngine.FreeHitManager();

  // Initial state
  assert.equal(fhm.isFreeHitActive, false);
  assert.equal(fhm.isDismissalAllowed('BOWLED'), true);

  // Ball 1: No-ball bowled
  const b1 = fhm.processDelivery('NO_BALL', false);
  assert.equal(b1.isFreeHitNext, true);
  assert.equal(fhm.isFreeHitActive, true);

  // During Free Hit: check dismissals
  assert.equal(fhm.isDismissalAllowed('BOWLED'), false);
  assert.equal(fhm.isDismissalAllowed('CAUGHT'), false);
  assert.equal(fhm.isDismissalAllowed('LBW'), false);
  assert.equal(fhm.isDismissalAllowed('STUMPED'), false);
  assert.equal(fhm.isDismissalAllowed('RUN_OUT'), true);
  assert.equal(fhm.isDismissalAllowed('OBSTRUCTING_FIELD'), true);

  // Ball 2: Bowler bowls a Wide on Free Hit -> Carry-over!
  const b2 = fhm.processDelivery('WIDE', false);
  assert.equal(b2.wasFreeHit, true);
  assert.equal(b2.isFreeHitNext, true);
  assert.equal(fhm.isFreeHitActive, true);

  // Ball 3: Bowler bowls a legal ball (dot) on Free Hit -> Consumed!
  const b3 = fhm.processDelivery('NONE', true);
  assert.equal(b3.wasFreeHit, true);
  assert.equal(b3.isFreeHitNext, false);
  assert.equal(fhm.isFreeHitActive, false);

  // Subsequent ball is normal
  assert.equal(fhm.isDismissalAllowed('BOWLED'), true);
});

test('CricketEngine: Duckworth-Lewis-Stern (DLS) Calculations', () => {
  const dls = new CricketEngine.DLSEngine();

  // Resource percentage check
  const r20 = dls.getResourcePercentage(20, 0, 20);
  assert.ok(r20 > 70 && r20 <= 100);

  const r0 = dls.getResourcePercentage(0, 5, 20);
  assert.equal(r0, 0);

  // Revised target: Team 1 scores 180 in 20 overs. Team 2 gets only 12 overs due to rain.
  const calc = dls.calculateRevisedTarget(180, 20, 12, 'T20');
  assert.ok(calc.target > 100 && calc.target < 180);
  assert.equal(calc.team2Overs, 12);

  // Par score at 8.0 overs with 2 wickets down
  const par = dls.calculateParScore(180, 8.0, 2, 20);
  assert.ok(par >= 35 && par <= 120);
});

test('CricketEngine: Rain-curtailed Bowler Quotas (ICC 20% Rule)', () => {
  // 20-over match: 5 bowlers x 4 overs
  const q20 = CricketEngine.BowlerQuotaCalculator.calculateQuotas(20, 5);
  assert.equal(q20.maxOverLimit, 4);
  assert.equal(q20.bowlersWithExtraOver, 0);

  // 17-over match: 2 bowlers x 4 overs, 3 bowlers x 3 overs
  const q17 = CricketEngine.BowlerQuotaCalculator.calculateQuotas(17, 5);
  assert.equal(q17.maxOverLimit, 4);
  assert.equal(q17.minOverLimit, 3);
  assert.equal(q17.bowlersWithExtraOver, 2);

  // 13-over match: 3 bowlers x 3 overs, 2 bowlers x 2 overs
  const q13 = CricketEngine.BowlerQuotaCalculator.calculateQuotas(13, 5);
  assert.equal(q13.maxOverLimit, 3);
  assert.equal(q13.minOverLimit, 2);
  assert.equal(q13.bowlersWithExtraOver, 3);

  // 8-over rain-curtailed match: each bowler max 3 overs (2 bowlers x 3 overs, 1 bowler x 2 overs)
  const q8 = CricketEngine.BowlerQuotaCalculator.calculateQuotas(8, 5);
  assert.equal(q8.maxOverLimit, 3);
  assert.equal(q8.minOverLimit, 2);
  assert.equal(q8.bowlersWithExtraOver, 2);

  // 5-over rain-curtailed match: max 3 overs (1 bowler x 3 overs, 1 bowler x 2 overs)
  const q5 = CricketEngine.BowlerQuotaCalculator.calculateQuotas(5, 5);
  assert.equal(q5.maxOverLimit, 3);
  assert.equal(q5.minOverLimit, 2);
  assert.equal(q5.bowlersWithExtraOver, 2);
});

test('CricketEngine: Net Run Rate (NRR) with All-Out Adjustment and Tournament Aggregation', () => {
  // Team 1 scores 160 in 20.0 overs (RR = 8.00)
  // Team 2 is ALL OUT for 100 in 15.2 overs -> MUST count as full 20.0 overs!
  const nrr1 = CricketEngine.NetRunRateCalculator.calculateNRR(
    160, 20.0, false, 20,
    100, 15.2, true, 20
  );

  // Team 1 RR = 160/20 = 8.00; Opponent RR = 100/20 = 5.00 -> NRR = +3.000
  assert.equal(nrr1.nrr, 3.000);
  assert.equal(nrr1.adjustedOversAgainst, 20.0);

  // If opponent was NOT all out (e.g. 15.2 overs 100/4 rain end)
  const nrr2 = CricketEngine.NetRunRateCalculator.calculateNRR(
    160, 20.0, false, 20,
    100, 15.2, false, 20
  );
  assert.notEqual(nrr2.adjustedOversAgainst, 20.0);

  // Multi-match tournament NRR calculation
  const tourneyMatches = [
    { runsScored: 180, oversFaced: 20, isAllOut: false, scheduledOversFor: 20, runsConceded: 140, oversBowled: 20, isOpponentAllOut: false, scheduledOversAgainst: 20 },
    { runsScored: 150, oversFaced: 19.3, isAllOut: true, scheduledOversFor: 20, runsConceded: 120, oversBowled: 20, isOpponentAllOut: false, scheduledOversAgainst: 20 }
  ];
  const tourneyNRR = CricketEngine.NetRunRateCalculator.calculateTournamentNRR(tourneyMatches);
  // Total runs for: 330, Total overs for: 40 (since 2nd match was all out) -> RR for = 8.25
  // Total runs against: 260, Total overs against: 40 -> RR against = 6.50 -> NRR = +1.750
  assert.equal(tourneyNRR.nrr, 1.75);
  assert.equal(tourneyNRR.totalRunsFor, 330);
  assert.equal(tourneyNRR.totalOversFor, 40);
});

test('CricketEngine: DLS Ball-by-Ball Decimal & Match Situation Tracking', () => {
  const dls = new CricketEngine.DLSEngine();
  // 14.2 overs in 20-over match with 3 wickets down
  const status = dls.calculateMatchStatus(180, 110, '14.2', 3, 20);
  assert.ok(status.parScore > 0);
  assert.equal(status.target, status.parScore + 1);
  assert.ok(['AHEAD_OF_PAR', 'BEHIND_PAR', 'TIED'].includes(status.status));
  assert.ok(status.ballsRemaining > 0);
});

test('CricketEngine: Audio, Voice Announcer & Overlay Bridge API', () => {
  assert.ok(CricketEngine.audio);
  CricketEngine.audio.setVolume(0.8);
  assert.equal(CricketEngine.audio.volume, 0.8);
  assert.equal(typeof CricketEngine.audio.playNoBall, 'function');
  assert.equal(typeof CricketEngine.audio.playWide, 'function');
  assert.equal(typeof CricketEngine.audio.playMilestone, 'function');

  assert.ok(CricketEngine.announcer);
  CricketEngine.announcer.setLanguage('bn');
  assert.equal(CricketEngine.announcer.language, 'bn');
  CricketEngine.announcer.setLanguage('en');
  assert.equal(CricketEngine.announcer.language, 'en');

  assert.ok(CricketEngine.overlayBridge);
  assert.equal(typeof CricketEngine.broadcastScore, 'function');
  assert.equal(typeof CricketEngine.listenScore, 'function');
});
