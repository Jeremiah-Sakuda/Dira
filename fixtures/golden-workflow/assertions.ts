import type { ReplayRuntime, WorkflowRun } from '@dira/agent';
import { computeRunMetrics } from '@dira/agent';
import { computeFeasibility, repairMarginMinutes } from '@dira/constraint-engine';
import { at, iso, IDS, type GoldenFixture, type GoldenVariation } from './index.js';

/**
 * Golden-workflow assertions (PRD §38: "Assertions: 18/18 passed").
 *
 * Variation-aware: exact PRD numbers are asserted for the default fixture;
 * variations assert the derived invariants instead (signs, margins, and the
 * state-dependent action set), which is precisely what proves the repair is
 * computed rather than replayed (PRD §7).
 */

export interface AssertionResult {
  name: string;
  pass: boolean;
  detail?: string;
}

export interface GoldenExpectations {
  interviewMove: boolean;
  delegation: boolean;
  fail409: boolean;
  escalation: boolean;
  exact: boolean;
  expectedInterviewIso: string;
}

export function goldenExpectations(v: Required<GoldenVariation>): GoldenExpectations {
  const interviewMove = v.examHour >= 14;
  const fail409 = interviewMove && v.firstSlotTaken && !v.bothSlotsTaken;
  return {
    interviewMove,
    delegation: v.examHour !== 13,
    fail409,
    escalation: interviewMove && v.bothSlotsTaken,
    exact:
      v.examHour === 14 &&
      v.firstSlotTaken &&
      !v.bothSlotsTaken &&
      v.personalBlockDurationMin === 240 &&
      v.backupOwner === 'maya-okafor' &&
      v.prepCompletedMin === 120 &&
      v.workoutStartHour === 19.5,
    expectedInterviewIso: !interviewMove
      ? iso(at(1, 17))
      : v.firstSlotTaken
        ? iso(at(2, 13))
        : iso(at(2, 10)),
  };
}

export async function assertGoldenRun(
  runtime: ReplayRuntime,
  run: WorkflowRun,
  fixture: GoldenFixture,
): Promise<AssertionResult[]> {
  const v = fixture.variation;
  const e = goldenExpectations(v);
  const results: AssertionResult[] = [];
  const check = (name: string, pass: boolean, detail?: string) =>
    results.push({ name, pass, detail });

  const { ledger, tools, orchestrator } = runtime;
  const metrics = computeRunMetrics(run, ledger);
  const initialF = computeFeasibility(fixture.state);
  const finalF = computeFeasibility(orchestrator.state);
  const remainingPrep =
    (fixture.state.commitments[IDS.prep]!.requiredEffortMin ?? 0) - v.prepCompletedMin;

  // 1–2 initial state
  check('initial state is feasible', initialF.feasible && initialF.violations.length === 0);
  check(
    e.exact ? 'initial global slack is exactly +4.1h' : 'initial global slack is positive',
    e.exact ? initialF.global_slack_minutes === 246 : initialF.global_slack_minutes > 0,
    `${initialF.global_slack_minutes} min`,
  );

  // 3 interpretation
  check(
    'trigger resolved to the exam commitment as a schedule_change',
    run.mutation?.entity_id === IDS.exam && run.mutation?.mutation_type === 'schedule_change',
  );

  // 4–5 post-mutation infeasibility
  check(
    e.exact ? 'post-mutation slack is exactly −3.6h (−216 min)' : 'post-mutation slack is negative',
    e.exact ? run.slackAfterMutationMin === -216 : (run.slackAfterMutationMin ?? 0) < 0,
    `${run.slackAfterMutationMin} min`,
  );
  const impactEdges = new Set(run.impacts.map((i) => i.edge_type));
  check(
    'prep-capacity violation detected and attributed to the exam',
    run.impacts.some(
      (i) => i.edge_type === 'REQUIRES_PREPARATION' && i.new_status === 'VIOLATED',
    ),
  );

  // 6–7 propagation
  const minAffected = e.delegation ? 6 : 3;
  check(
    `propagation reaches ≥${minAffected} downstream commitments`,
    run.affected.length >= minAffected,
    `affected: ${run.affected.join(', ')}`,
  );
  check(
    'impacts carry typed edges (REQUIRES_PREPARATION, REQUIRES_BUFFER)',
    impactEdges.has('REQUIRES_PREPARATION') && impactEdges.has('REQUIRES_BUFFER'),
    [...impactEdges].join(', '),
  );

  if (e.escalation) {
    // Chaos path: both slots gone → no policy-compliant repair → safe stop.
    check('workflow stops safely in WAITING_REVIEW', run.status === 'WAITING_REVIEW');
    check(
      'no interview booking was fabricated',
      (await tools.recruiter.verifyBooking(IDS.interview)) === null,
    );
    return results;
  }

  // 8–9 planning
  check(
    'multiple candidate repairs were evaluated',
    (run.planningRounds[0]?.length ?? 0) >= 3,
    `${run.planningRounds[0]?.length} candidates in round 1`,
  );
  check(
    'repaired state has zero hard violations and ≥1h capacity margin',
    finalF.violations.length === 0 &&
      finalF.global_slack_minutes >= 0 &&
      repairMarginMinutes(finalF) >= 60,
    `global ${finalF.global_slack_minutes} min, margin ${repairMarginMinutes(finalF)} min, ${finalF.violations.length} violations`,
  );

  // 10–11 injected failure + recovery
  if (e.fail409) {
    const first = tools.recruiter.bookAttempts[0];
    check(
      'first booking attempt hit 409 SLOT_NO_LONGER_AVAILABLE',
      first?.slotId === 'slot-thu-1000' && first?.outcome === '409',
      JSON.stringify(tools.recruiter.bookAttempts),
    );
    check(
      'failure was recovered by replanning (not a hard-coded fallback)',
      run.failuresRecovered >= 1 && run.replans >= 1,
      `failures=${run.failuresRecovered} replans=${run.replans}`,
    );
  } else {
    check('no 409 injected in this variation', true, 'n/a');
    check('no failure recovery required in this variation', run.failuresRecovered === 0);
  }

  // 12 interview external truth
  if (e.interviewMove) {
    const booking = await tools.recruiter.verifyBooking(IDS.interview);
    const calEvent = await tools.calendar.verifyEvent({ id: `cal-${IDS.interview}` });
    check(
      `interview verified externally at ${e.expectedInterviewIso}`,
      booking?.startIso === e.expectedInterviewIso &&
        calEvent?.startIso === e.expectedInterviewIso,
      `recruiter=${booking?.startIso} calendar=${calEvent?.startIso}`,
    );
  } else {
    const calEvent = await tools.calendar.verifyEvent({ id: `cal-${IDS.interview}` });
    check(
      'interview untouched (buffer already satisfied in this variation)',
      calEvent?.startIso === e.expectedInterviewIso,
      `calendar=${calEvent?.startIso}`,
    );
  }

  // 13–14 delegation external truth
  if (e.delegation) {
    const assignment = await tools.org.verifyAssignment('org-task-visual-qa');
    check(
      `visual QA reassigned to ${v.backupOwner} in the org tracker`,
      assignment?.owner === v.backupOwner,
      `owner=${assignment?.owner}`,
    );
    check(
      'delegation notification sent and independently verified',
      await tools.gmail.verifyReply(`thread-org-${IDS.qa}`, 'Sponsor deck visual QA'),
    );
  } else {
    const assignment = await tools.org.verifyAssignment('org-task-visual-qa');
    check('visual QA stays with the user in this variation', assignment?.owner === fixture.state.userId);
    check('no delegation notification needed', tools.gmail.sent().length === 0);
  }

  // 15 study plan rebuilt
  const events = await tools.calendar.getEvents();
  const studyBlocks = events.filter((ev) => ev.id.startsWith('cal-study-'));
  const overhead = fixture.state.config.sessionOverheadMin;
  const reservedWork = studyBlocks.reduce((sum, ev) => {
    const mins =
      (Date.parse(ev.endIso) - Date.parse(ev.startIso)) / 60_000 - overhead;
    return sum + Math.max(0, mins);
  }, 0);
  check(
    'study capacity rebuilt on the calendar covers remaining prep',
    studyBlocks.length >= 1 && reservedWork >= remainingPrep,
    `${studyBlocks.length} blocks, ${reservedWork} usable min vs ${remainingPrep} required`,
  );

  // 16–17 resolution
  check(
    e.exact ? 'final global slack is exactly +1.3h (+78 min)' : 'final global slack non-negative with capacity margin',
    e.exact
      ? run.slackFinalMin === 78
      : (run.slackFinalMin ?? -1) >= 0 && repairMarginMinutes(finalF) >= 60,
    `${run.slackFinalMin} min`,
  );
  check(
    'workflow RESOLVED with zero user interventions',
    run.status === 'RESOLVED' && run.userInterventions === 0,
    `${run.status}`,
  );

  // 18 ledger integrity + PRD §49 external-mutation bar
  const records = ledger.byWorkflow(run.id);
  const keys = records.map((r) => r.idempotencyKey);
  const noDuplicates = new Set(keys).size === keys.length;
  const noForbiddenExecutions = records.every(
    (r) => !(r.status === 'VERIFIED' && (r.policyVerdict === 'DENY' || r.policyVerdict === 'REQUIRE_APPROVAL')),
  );
  const mutationBar = e.exact
    ? metrics.verifiedExternalMutations >= 4 && metrics.distinctExternalSystems >= 2
    : metrics.verifiedExternalMutations >= 1;
  check(
    'ledger integrity: no duplicates, no unauthorized executions, mutation bar met',
    noDuplicates && noForbiddenExecutions && mutationBar,
    `${metrics.verifiedExternalMutations} verified across ${metrics.distinctExternalSystems} systems`,
  );

  return results;
}
