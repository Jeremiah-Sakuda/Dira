import { describe, expect, it } from 'vitest';
import {
  cloneState,
  mergeIntervals,
  subtractIntervals,
  isoToMinutes,
  minutesToIso,
} from '@dira/commitment-model';
import {
  capacityBefore,
  computeFeasibility,
  computePlanCost,
  DEFAULT_COST_WEIGHTS,
  freeSegments,
  placeWindowedTask,
  repairMarginMinutes,
  scheduleEffort,
  usableMinutes,
  validatePlan,
} from '@dira/constraint-engine';
import { at, buildGoldenFixture, HORIZON_START_ISO, IDS } from '@dira/fixtures/golden';

describe('time primitives', () => {
  it('round-trips iso ↔ minutes in the demo offset', () => {
    const iso = minutesToIso(at(1, 14), HORIZON_START_ISO);
    expect(iso).toBe('2026-08-19T14:00:00-05:00');
    expect(isoToMinutes(iso, HORIZON_START_ISO)).toBe(at(1, 14));
  });

  it('subtracts busy intervals from windows', () => {
    const free = subtractIntervals({ start: 0, end: 100 }, [
      { start: 20, end: 30 },
      { start: 50, end: 120 },
    ]);
    expect(free).toEqual([
      { start: 0, end: 20 },
      { start: 30, end: 50 },
    ]);
  });

  it('merges overlapping intervals', () => {
    expect(
      mergeIntervals([
        { start: 10, end: 20 },
        { start: 15, end: 25 },
        { start: 40, end: 50 },
      ]),
    ).toEqual([
      { start: 10, end: 25 },
      { start: 40, end: 50 },
    ]);
  });
});

describe('capacity with session overhead', () => {
  it('charges one context switch per session', () => {
    expect(usableMinutes({ start: 0, end: 60 }, 6)).toBe(54);
    expect(usableMinutes({ start: 0, end: 5 }, 6)).toBe(0);
  });

  it('clips capacity at the deadline', () => {
    const segs = [
      { start: 0, end: 60 },
      { start: 100, end: 200 },
    ];
    expect(capacityBefore(segs, 150, 6)).toBe(54 + 44);
    expect(capacityBefore(segs, 50, 6)).toBe(44);
  });

  it('golden free segments exclude busy blocks but keep study reservations transparent', () => {
    const { state } = buildGoldenFixture();
    const segs = freeSegments(state);
    // Tue evening: workout 19:30–20:30 carves the 19:30–23:00 window.
    expect(segs[0]).toEqual({ start: at(0, 20, 30), end: at(0, 23) });
    // Wed evening window is free even though a study reservation sits on it.
    expect(segs.some((s) => s.start === at(1, 20, 30) && s.end === at(1, 22, 30))).toBe(true);
  });
});

describe('windowed task placement', () => {
  it('places QA inside [assets, freeze] for the user when space exists', () => {
    const { state } = buildGoldenFixture();
    const qa = state.commitments[IDS.qa]!;
    const placement = placeWindowedTask(state, qa);
    expect(placement.valid).toBe(true);
    expect(placement.interval!.start).toBeGreaterThanOrEqual(at(1, 14));
    expect(placement.interval!.end).toBeLessThanOrEqual(at(1, 16));
  });

  it('fails placement when the exam lands inside the window', () => {
    const { state } = buildGoldenFixture();
    const mutated = cloneState(state);
    mutated.commitments[IDS.exam]!.startMin = at(1, 14);
    const placement = placeWindowedTask(mutated, mutated.commitments[IDS.qa]!);
    expect(placement.valid).toBe(false);
  });
});

describe('effort scheduling (EDF)', () => {
  it('schedules prep before PS6 and respects deadlines', () => {
    const { state } = buildGoldenFixture();
    const repaired = cloneState(state);
    repaired.commitments[IDS.exam]!.startMin = at(1, 14);
    repaired.commitments[IDS.qa]!.owner = 'maya-okafor';
    repaired.commitments[IDS.workout]!.startMin = at(1, 16, 45);
    repaired.commitments[IDS.sideProject]!.startMin = at(2, 14);
    const { sessions, unplacedMinutes } = scheduleEffort(repaired, [{ start: 0, end: at(0, 8, 30) }]);
    expect(unplacedMinutes).toEqual({});
    const prepSessions = sessions.filter((s) => s.taskId === IDS.prep);
    const prepWork = prepSessions.reduce((n, s) => n + s.workMinutes, 0);
    expect(prepWork).toBe(360);
    for (const s of prepSessions) expect(s.interval.end).toBeLessThanOrEqual(at(1, 14));
  });
});

describe('objective function (PRD §20)', () => {
  it('prices a critical drop four orders above a minor move', () => {
    expect(DEFAULT_COST_WEIGHTS.criticalCommitmentDropped).toBe(10_000);
    expect(DEFAULT_COST_WEIGHTS.minorScheduleMove).toBe(25);
    expect(DEFAULT_COST_WEIGHTS.majorScheduleMove).toBe(100);
    expect(DEFAULT_COST_WEIGHTS.opportunityLost).toBe(2_000);
    expect(DEFAULT_COST_WEIGHTS.socialDisruption).toBe(500);
    expect(DEFAULT_COST_WEIGHTS.externalActionCount).toBe(5);
  });

  it('charges the critical-drop weight when a plan drops the interview', () => {
    const { state } = buildGoldenFixture();
    const plan = {
      id: 'drop',
      label: 'drop interview',
      notes: [],
      actions: [
        {
          type: 'DECLINE_INTERVIEW' as const,
          target: IDS.interview,
          desired_state: {},
          provenance: ['user-request'],
          external_system: 'recruiter' as const,
          summary: 'Decline the interview',
        },
      ],
    };
    const simulated = cloneState(state);
    simulated.commitments[IDS.interview]!.status = 'DROPPED';
    const cost = computePlanCost(state, plan, simulated);
    expect(cost.total).toBeGreaterThanOrEqual(
      DEFAULT_COST_WEIGHTS.criticalCommitmentDropped + DEFAULT_COST_WEIGHTS.opportunityLost,
    );
  });
});

describe('plan validation margin', () => {
  it('rejects a repair that lands under the 1h capacity margin', () => {
    const { state } = buildGoldenFixture();
    const mutated = cloneState(state);
    mutated.commitments[IDS.exam]!.startMin = at(1, 14);
    // Side-project move alone yields +18 min — feasible but knife-edge.
    const thin = {
      id: 'thin',
      label: 'side-project only',
      notes: [],
      actions: [
        {
          type: 'MOVE_CALENDAR_EVENT' as const,
          target: IDS.sideProject,
          desired_state: { start_min: at(2, 14), duration_min: 240 },
          provenance: ['user_policy_config:flexibility=FLEXIBLE'],
          external_system: 'calendar' as const,
          summary: 'Move side project',
        },
        {
          type: 'BOOK_INTERVIEW_SLOT' as const,
          target: IDS.interview,
          desired_state: { start_min: at(2, 13), duration_min: 60 },
          provenance: ['gmail-thread-jordan-alt-slots'],
          external_system: 'recruiter' as const,
          summary: 'Book Thu 13:00',
        },
        {
          type: 'DELEGATE_TASK' as const,
          target: IDS.qa,
          desired_state: { new_owner: 'maya-okafor' },
          provenance: ['user_policy_config', 'edge:edge-qa-delegate'],
          external_system: 'organization' as const,
          summary: 'Delegate QA',
        },
      ],
    };
    const v = validatePlan(mutated, thin);
    expect(v.acceptable).toBe(false);
    expect(v.rejectionReason).toContain('insufficient repair margin');
    expect(v.feasibility.global_slack_minutes).toBe(18);
  });

  it('repairMarginMinutes ignores satisfied buffer paths', () => {
    const { state } = buildGoldenFixture();
    const f = computeFeasibility(state);
    expect(repairMarginMinutes(f)).toBe(246);
  });
});
