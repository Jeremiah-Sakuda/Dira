import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { FileLedgerStore } from '@dira/action-ledger/file-store';
import { buildReplayRuntime } from '@dira/agent';
import { FileWorkflowStore } from '@dira/agent/file-stores';
import { buildGoldenFixture } from '@dira/fixtures/golden';
import { assertGoldenRun } from '@dira/fixtures/golden-assertions';

/**
 * Chaos tests (PRD §40): inject failures; expect recovery, replanning, or a
 * safe stop — never silent state corruption.
 */

const tmpDirs: string[] = [];
afterEach(() => {
  for (const d of tmpDirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

describe('chaos: injected failures', () => {
  it('booking 409 → observe → replan → alternative slot (the golden injection)', async () => {
    const fixture = buildGoldenFixture(); // firstSlotTaken defaults to true
    const runtime = await buildReplayRuntime(fixture);
    const run = await runtime.orchestrator.handleEvent(fixture.trigger);
    expect(run.status).toBe('RESOLVED');
    expect(runtime.tools.recruiter.bookAttempts.map((a) => a.outcome)).toEqual(['409', 'BOOKED']);
  });

  it('both slots gone → exhausts policy-compliant repairs → safe WAITING_REVIEW', async () => {
    const fixture = buildGoldenFixture({ bothSlotsTaken: true });
    const runtime = await buildReplayRuntime(fixture);
    const run = await runtime.orchestrator.handleEvent(fixture.trigger);
    expect(run.status).toBe('WAITING_REVIEW');
    // It must not decline the interview, drop commitments, or fake a booking.
    expect(await runtime.tools.recruiter.verifyBooking('technical-interview-1')).toBeNull();
    expect(runtime.orchestrator.state.commitments['technical-interview-1']!.status).not.toBe('DROPPED');
  });

  it('calendar 500s are retried with bounded backoff and then succeed', async () => {
    const fixture = buildGoldenFixture();
    const runtime = await buildReplayRuntime(fixture);
    runtime.tools.calendar.injectTransientFailures(2);
    const run = await runtime.orchestrator.handleEvent(fixture.trigger);
    expect(run.status).toBe('RESOLVED');
    const results = await assertGoldenRun(runtime, run, fixture);
    expect(results.filter((r) => !r.pass)).toEqual([]);
  });

  it('a lying tool (success response, no external change) is caught by the verifier', async () => {
    const fixture = buildGoldenFixture();
    const runtime = await buildReplayRuntime(fixture);
    const calendar = runtime.tools.calendar;
    const realMove = calendar.moveEvent.bind(calendar);
    let lies = 0;
    calendar.moveEvent = async (id: string, s: string, e: string) => {
      if (id === 'cal-tuesday-workout') {
        lies += 1;
        return; // claims success, does nothing
      }
      return realMove(id, s, e);
    };
    const run = await runtime.orchestrator.handleEvent(fixture.trigger);
    expect(lies).toBeGreaterThan(0);
    // The internal model must never believe the unverified move.
    const workout = runtime.orchestrator.state.commitments['tuesday-workout']!;
    const externallyObserved = await calendar.verifyEvent({ id: 'cal-tuesday-workout' });
    const internalIso = new Date(
      Date.parse(fixture.state.horizonStartIso) + (workout.startMin ?? 0) * 60_000,
    ).toISOString();
    expect(externallyObserved?.startIso).toBeTruthy();
    expect(Date.parse(externallyObserved!.startIso)).toBe(Date.parse(internalIso));
    // And the workflow either recovered another way or stopped safely.
    expect(['RESOLVED', 'WAITING_REVIEW']).toContain(run.status);
  });

  it('process crash after external success: a fresh worker resumes without duplicating', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'dira-crash-'));
    tmpDirs.push(dir);
    const fixture = buildGoldenFixture();
    const ledgerStore = new FileLedgerStore(join(dir, 'ledger.json'));
    const workflowStore = new FileWorkflowStore(join(dir, 'workflows.json'));

    // Worker 1 crashes right after the recruiter confirms the booking but
    // before the ledger records VERIFIED — the classic "tool succeeded, we
    // died" window.
    const runtime1 = await buildReplayRuntime(fixture, { ledgerStore, workflowStore });
    class Crash extends Error {}
    runtime1.recorder.onEntry((e) => {
      if (e.phase === 'VERIFY' && e.message.includes('Book "TechCorp')) {
        throw new Crash('simulated process death');
      }
    });
    await expect(runtime1.orchestrator.handleEvent(fixture.trigger)).rejects.toThrow(Crash);

    const attemptsAfterCrash = runtime1.tools.recruiter.bookAttempts.length;
    expect(attemptsAfterCrash).toBeGreaterThanOrEqual(2); // 409 + successful book

    // Worker 2: same durable stores, same external world, fresh process.
    const runtime2 = await buildReplayRuntime(fixture, {
      ledgerStore,
      workflowStore,
      tools: runtime1.tools,
    });
    const resumed = await runtime2.orchestrator.handleEvent(fixture.trigger);

    expect(resumed.status).toBe('RESOLVED');
    // The booking was NOT re-executed: no new attempts beyond the crash point.
    expect(runtime1.tools.recruiter.bookAttempts.length).toBe(attemptsAfterCrash);
    const booking = await runtime1.tools.recruiter.verifyBooking('technical-interview-1');
    expect(booking?.startIso).toBe('2026-08-20T13:00:00-05:00');
  });

  it('duplicate Pub/Sub delivery of a resolved workflow is a no-op', async () => {
    const fixture = buildGoldenFixture();
    const runtime = await buildReplayRuntime(fixture);
    await runtime.orchestrator.handleEvent(fixture.trigger);
    const calMutations = runtime.tools.calendar.mutationLog.length;
    const orgMutations = runtime.tools.org.mutationLog.length;

    const dup = await runtime.orchestrator.handleEvent({ ...fixture.trigger });
    expect(dup.status).toBe('RESOLVED');
    expect(runtime.tools.calendar.mutationLog.length).toBe(calMutations);
    expect(runtime.tools.org.mutationLog.length).toBe(orgMutations);
  });

  it('low-confidence interpretation enters WAITING_REVIEW without acting', async () => {
    const fixture = buildGoldenFixture();
    const lowConfidence = structuredClone(fixture.interpretation);
    lowConfidence.mutation!.confidence = 0.42;
    const runtime = await buildReplayRuntime(fixture, {
      model: { name: 'low', interpret: async () => lowConfidence },
    });
    const run = await runtime.orchestrator.handleEvent(fixture.trigger);
    expect(run.status).toBe('WAITING_REVIEW');
    expect(runtime.tools.calendar.mutationLog).toHaveLength(0);
    expect(runtime.tools.org.mutationLog).toHaveLength(0);
  });
});
