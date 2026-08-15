import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  cloneState,
  DEFAULT_ENGINE_CONFIG,
  type Commitment,
  type DomainState,
  type Interval,
} from '@dira/commitment-model';
import {
  computeFeasibility,
  computePlanCost,
  DEFAULT_COST_WEIGHTS,
  validatePlan,
} from '@dira/constraint-engine';
import { generateCandidatePlans } from '@dira/agent';
import { evaluateAction } from '@dira/policy-engine';
import type { PlannedAction } from '@dira/event-schema';

/**
 * Property-based tests over randomized commitment graphs (PRD §41–§42).
 * fast-check prints the seed + shrunken counterexample for any failing run;
 * re-run with `fc.configureGlobal({ seed })` (or the printed seed) to replay.
 */

const HORIZON_END = 4 * 1440;
const USER = 'user-prop';

interface GenTask {
  effort: number;
  completed: number;
  deadline: number;
}

interface GenEvent {
  start: number;
  duration: number;
  critical: boolean;
}

interface GenBlock {
  start: number;
  duration: number;
  optional: boolean;
}

const grid = (min: number, max: number) =>
  fc.integer({ min: Math.floor(min / 15), max: Math.floor(max / 15) }).map((n) => n * 15);

const windowArb = fc
  .tuple(grid(0, HORIZON_END - 120), fc.integer({ min: 4, max: 20 }))
  .map(([start, q]) => ({ start, end: Math.min(start + q * 15, HORIZON_END) }));

const taskArb: fc.Arbitrary<GenTask> = fc.record({
  effort: fc.integer({ min: 30, max: 480 }),
  completed: fc.integer({ min: 0, max: 120 }),
  deadline: grid(240, HORIZON_END),
});

const eventArb: fc.Arbitrary<GenEvent> = fc.record({
  start: grid(0, HORIZON_END - 120),
  duration: fc.constantFrom(30, 60, 90, 120),
  critical: fc.boolean(),
});

const blockArb: fc.Arbitrary<GenBlock> = fc.record({
  start: grid(0, HORIZON_END - 240),
  duration: fc.constantFrom(30, 60, 120, 240),
  optional: fc.boolean(),
});

const stateArb = fc
  .record({
    windows: fc.array(windowArb, { minLength: 1, maxLength: 8 }),
    tasks: fc.array(taskArb, { minLength: 1, maxLength: 4 }),
    events: fc.array(eventArb, { maxLength: 3 }),
    blocks: fc.array(blockArb, { maxLength: 3 }),
    bufferMin: fc.constantFrom(0, 60, 180),
  })
  .map(({ windows, tasks, events, blocks, bufferMin }) => buildState(windows, tasks, events, blocks, bufferMin));

function buildState(
  windows: Interval[],
  tasks: GenTask[],
  events: GenEvent[],
  blocks: GenBlock[],
  bufferMin: number,
): DomainState {
  const now = '2026-08-18T00:00:00-05:00';
  const commitments: Record<string, Commitment> = {};
  const base = {
    userId: USER,
    domain: 'academic' as const,
    source: 'gen',
    status: 'PLANNED' as const,
    owner: USER,
    participants: [USER],
    goalIds: [],
    resourceRequirements: ['user-time'],
    confidence: 1,
    createdAtIso: now,
    updatedAtIso: now,
  };

  tasks.forEach((t, i) => {
    commitments[`task-${i}`] = {
      ...base,
      id: `task-${i}`,
      title: `Task ${i}`,
      kind: 'effort',
      requiredEffortMin: t.effort,
      completedEffortMin: Math.min(t.completed, t.effort),
      deadlineMin: t.deadline,
      flexibility: 'FLEXIBLE',
      criticality: 'HIGH',
    };
  });
  events.forEach((e, i) => {
    commitments[`event-${i}`] = {
      ...base,
      id: `event-${i}`,
      title: `Event ${i}`,
      kind: 'event',
      startMin: e.start,
      durationMin: e.duration,
      flexibility: 'FIXED',
      criticality: e.critical ? 'CRITICAL' : 'NORMAL',
      externalSystem: 'calendar',
    };
  });
  blocks.forEach((b, i) => {
    commitments[`block-${i}`] = {
      ...base,
      id: `block-${i}`,
      title: `Block ${i}`,
      domain: 'personal',
      kind: 'block',
      startMin: b.start,
      durationMin: b.duration,
      flexibility: b.optional ? 'OPTIONAL' : 'FLEXIBLE',
      criticality: 'LOW',
      externalSystem: 'calendar',
    };
  });

  const state: DomainState = {
    userId: USER,
    horizonStartIso: now,
    horizonEndMin: HORIZON_END,
    commitments,
    edges: [],
    people: {},
    constraints: {},
    availability: windows.sort((a, b) => a.start - b.start),
    approvedSlots: {},
    config: { ...DEFAULT_ENGINE_CONFIG },
  };

  if (events.length >= 2 && bufferMin > 0) {
    state.edges.push({
      id: 'gen-buffer',
      type: 'REQUIRES_BUFFER',
      from: 'event-0',
      to: 'event-1',
      data: { bufferMin, provenance: 'generated' },
    });
  }
  if (events.length >= 1 && tasks.length >= 1) {
    state.edges.push({
      id: 'gen-prep',
      type: 'REQUIRES_PREPARATION',
      from: 'event-0',
      to: 'task-0',
      data: { finalBufferMin: 0 },
    });
  }
  return state;
}

describe('PRD §41 invariants over randomized graphs', () => {
  it('invariant 1: moving a hard deadline earlier cannot increase global slack', () => {
    fc.assert(
      fc.property(stateArb, fc.integer({ min: 15, max: 720 }), (state, shift) => {
        const before = computeFeasibility(state).global_slack_minutes;
        const earlier = cloneState(state);
        const task = Object.values(earlier.commitments).find((c) => c.kind === 'effort')!;
        task.deadlineMin = Math.max(0, (task.deadlineMin ?? 0) - shift);
        const after = computeFeasibility(earlier).global_slack_minutes;
        expect(after).toBeLessThanOrEqual(before);
      }),
      { numRuns: 150 },
    );
  });

  it('invariant 2: adding usable capacity cannot reduce global slack', () => {
    fc.assert(
      fc.property(stateArb, windowArb, (state, extra) => {
        const before = computeFeasibility(state).global_slack_minutes;
        const bigger = cloneState(state);
        bigger.availability = [...bigger.availability, extra];
        const after = computeFeasibility(bigger).global_slack_minutes;
        expect(after).toBeGreaterThanOrEqual(before);
      }),
      { numRuns: 150 },
    );
  });

  it('invariant 3: adding required effort cannot increase global slack', () => {
    fc.assert(
      fc.property(stateArb, fc.integer({ min: 15, max: 240 }), (state, extraEffort) => {
        const before = computeFeasibility(state).global_slack_minutes;
        const heavier = cloneState(state);
        const task = Object.values(heavier.commitments).find((c) => c.kind === 'effort')!;
        task.requiredEffortMin = (task.requiredEffortMin ?? 0) + extraEffort;
        const after = computeFeasibility(heavier).global_slack_minutes;
        expect(after).toBeLessThanOrEqual(before);
      }),
      { numRuns: 150 },
    );
  });

  it('invariants 4+5: accepted plans have zero hard violations and full provenance', () => {
    fc.assert(
      fc.property(stateArb, (state) => {
        const f = computeFeasibility(state);
        const plans = generateCandidatePlans({
          state,
          feasibility: f,
          liveSlots: {},
          nowMin: 0,
        });
        for (const plan of plans) {
          for (const action of plan.actions) {
            expect(action.provenance.length).toBeGreaterThanOrEqual(1); // invariant 5
          }
          const v = validatePlan(state, plan);
          if (v.acceptable) {
            expect(v.feasibility.violations).toEqual([]); // invariant 4
          }
        }
      }),
      { numRuns: 60 },
    );
  });

  it('invariant 6: a DENY verdict never yields an executable action', () => {
    const denyAction: fc.Arbitrary<PlannedAction> = fc.record({
      type: fc.constantFrom(
        'MOVE_CALENDAR_EVENT' as const,
        'DELEGATE_TASK' as const,
        'BOOK_INTERVIEW_SLOT' as const,
      ),
      target: fc.string({ minLength: 1, maxLength: 12 }),
      desired_state: fc.constant({ start_min: 100 } as Record<string, unknown>),
      provenance: fc.constant([] as string[]), // no provenance → DENY, always
      external_system: fc.constantFrom('calendar' as const, 'recruiter' as const),
      summary: fc.constant('generated'),
    });
    fc.assert(
      fc.property(stateArb, denyAction, (state, action) => {
        const decision = evaluateAction(state, action);
        expect(decision.verdict).toBe('DENY');
      }),
      { numRuns: 100 },
    );
  });

  it('invariant 8: dropping a critical commitment can never rank above preserving it', () => {
    fc.assert(
      fc.property(stateArb, (state) => {
        const critical = Object.values(state.commitments).find(
          (c) => c.criticality === 'CRITICAL' || c.criticality === 'HIGH',
        );
        if (!critical) return;
        const keep = { id: 'keep', label: 'keep', notes: [], actions: [] };
        const drop = {
          id: 'drop',
          label: 'drop',
          notes: [],
          actions: [
            {
              type: 'DELETE_CALENDAR_EVENT' as const,
              target: critical.id,
              desired_state: {},
              provenance: ['generated'],
              external_system: 'calendar' as const,
              summary: `drop ${critical.id}`,
            },
          ],
        };
        const simulatedDrop = cloneState(state);
        simulatedDrop.commitments[critical.id]!.status = 'DROPPED';
        const keepCost = computePlanCost(state, keep, state, DEFAULT_COST_WEIGHTS);
        const dropCost = computePlanCost(state, drop, simulatedDrop, DEFAULT_COST_WEIGHTS);
        expect(dropCost.total).toBeGreaterThan(keepCost.total);
        expect(dropCost.total).toBeGreaterThanOrEqual(DEFAULT_COST_WEIGHTS.criticalCommitmentDropped);
      }),
      { numRuns: 100 },
    );
  });
});
