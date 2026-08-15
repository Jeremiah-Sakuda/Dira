import { describe, expect, it } from 'vitest';
import { buildReplayRuntime, computeRunMetrics } from '@dira/agent';
import { buildGoldenFixture } from '@dira/fixtures/golden';
import { assertGoldenRun } from '@dira/fixtures/golden-assertions';

describe('golden workflow — The 48-Hour Shock (PRD §5, §38, §49)', () => {
  it('resolves autonomously with all 18 assertions passing', async () => {
    const fixture = buildGoldenFixture();
    const runtime = await buildReplayRuntime(fixture);
    const run = await runtime.orchestrator.handleEvent(fixture.trigger);

    const results = await assertGoldenRun(runtime, run, fixture);
    const failed = results.filter((r) => !r.pass);
    expect(failed, JSON.stringify(failed, null, 2)).toEqual([]);
    expect(results).toHaveLength(18);
  });

  it('meets the PRD §49 success metrics', async () => {
    const fixture = buildGoldenFixture();
    const runtime = await buildReplayRuntime(fixture);
    const run = await runtime.orchestrator.handleEvent(fixture.trigger);
    const metrics = computeRunMetrics(run, runtime.ledger);

    expect(metrics.userInterventions).toBe(0);
    expect(metrics.verifiedExternalMutations).toBeGreaterThanOrEqual(4);
    expect(metrics.distinctExternalSystems).toBeGreaterThanOrEqual(2);
    expect(metrics.failuresRecovered).toBe(1);
    expect(metrics.policyViolations).toBe(0);
    expect(metrics.finalSlackMin).toBeGreaterThan(0);
    expect(metrics.status).toBe('RESOLVED');
  });

  it('replaying the same event twice does not duplicate external mutations (invariant 7)', async () => {
    const fixture = buildGoldenFixture();
    const runtime = await buildReplayRuntime(fixture);
    const first = await runtime.orchestrator.handleEvent(fixture.trigger);
    const mutationsAfterFirst = runtime.tools.calendar.mutationLog.length;
    const bookingsAfterFirst = runtime.tools.recruiter.bookAttempts.length;

    const second = await runtime.orchestrator.handleEvent(fixture.trigger);
    expect(second.status).toBe(first.status);
    expect(runtime.tools.calendar.mutationLog.length).toBe(mutationsAfterFirst);
    expect(runtime.tools.recruiter.bookAttempts.length).toBe(bookingsAfterFirst);
  });

  it('every runtime variation derives a valid repair from state (PRD §7)', async () => {
    const variations = [
      { examHour: 13 as const },
      { examHour: 15 as const },
      { firstSlotTaken: false },
      { personalBlockDurationMin: 180 },
      { backupOwner: 'tunde-adebayo' as const },
      { prepCompletedMin: 240 },
      { workoutStartHour: 18.5 },
    ];
    for (const variation of variations) {
      const fixture = buildGoldenFixture(variation);
      const runtime = await buildReplayRuntime(fixture);
      const run = await runtime.orchestrator.handleEvent(fixture.trigger);
      const results = await assertGoldenRun(runtime, run, fixture);
      const failed = results.filter((r) => !r.pass);
      expect(failed, `variation ${JSON.stringify(variation)}: ${JSON.stringify(failed)}`).toEqual([]);
    }
  });
});
