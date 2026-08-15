import { describe, expect, it } from 'vitest';
import { cloneState } from '@dira/commitment-model';
import { computeFeasibility } from '@dira/constraint-engine';
import { propagateConsequences } from '@dira/propagation-engine';
import { generateCandidatePlans } from '@dira/agent';
import { at, buildGoldenFixture, IDS } from '@dira/fixtures/golden';

/**
 * Regression tests for defects surfaced by the multi-agent repo sweep.
 * Each test reproduces a confirmed finding and pins the fix.
 */

describe('sweep regressions', () => {
  it('moving a window marker propagates to the windowed task and its chain', () => {
    // Finding: marker mutations (deck freeze / assets arrival) produced zero
    // impacts even though they break QA feasibility.
    const { state } = buildGoldenFixture();
    const mutated = cloneState(state);
    mutated.commitments[IDS.deckFreeze]!.startMin = at(1, 14, 30); // freeze at 14:30
    const f = computeFeasibility(mutated);
    expect(f.violations.some((v) => v.type === 'ASSIGNEE_UNAVAILABLE')).toBe(true);

    const { impacts, affected } = propagateConsequences(state, mutated, IDS.deckFreeze);
    expect(affected).toContain(IDS.qa);
    expect(affected).toContain(IDS.presentation);
    expect(impacts.length).toBeGreaterThan(0);
  });

  it('a stored windowed placement shorter than remaining effort is invalid', () => {
    const { state } = buildGoldenFixture();
    const mutated = cloneState(state);
    mutated.commitments[IDS.qa]!.requiredEffortMin = 120; // 60-min stored session
    const f = computeFeasibility(mutated);
    expect(f.violations.some((v) => v.type === 'ASSIGNEE_UNAVAILABLE')).toBe(true);
  });

  it('a stored placement outside the owner availability is invalid', () => {
    const { state } = buildGoldenFixture();
    const mutated = cloneState(state);
    mutated.commitments[IDS.qa]!.owner = 'maya-okafor';
    // Maya is only available Thursday in this variant.
    mutated.people['maya-okafor']!.availability = [{ start: at(2, 9), end: at(2, 18) }];
    const f = computeFeasibility(mutated);
    // The Wednesday-bounded window can never fit a Thursday-only owner.
    expect(f.violations.some((v) => v.type === 'ASSIGNEE_UNAVAILABLE')).toBe(true);
  });

  it('two windowed tasks cannot be assigned overlapping minutes', () => {
    const { state } = buildGoldenFixture();
    const mutated = cloneState(state);
    // A second user-owned windowed task in the same [assets, freeze] window,
    // unplaced, with enough effort that both cannot fit.
    mutated.commitments['second-qa'] = {
      ...mutated.commitments[IDS.qa]!,
      id: 'second-qa',
      title: 'Second QA pass',
      startMin: undefined,
      durationMin: undefined,
      requiredEffortMin: 60,
    };
    mutated.edges.push(
      { id: 'e2a', type: 'MUST_FOLLOW', from: 'second-qa', to: IDS.assetsArrival },
      { id: 'e2b', type: 'MUST_PRECEDE', from: 'second-qa', to: IDS.deckFreeze },
    );
    const f = computeFeasibility(mutated);
    const placements = f.placements.filter((p) => p.valid && p.interval);
    for (let i = 0; i < placements.length; i++) {
      for (let j = i + 1; j < placements.length; j++) {
        const a = placements[i]!.interval!;
        const b = placements[j]!.interval!;
        expect(a.start < b.end && b.start < a.end).toBe(false);
      }
    }
    // Window holds 90 usable minutes for the user; 60+66 cannot both fit.
    expect(f.violations.some((v) => v.type === 'ASSIGNEE_UNAVAILABLE')).toBe(true);
  });

  it('a plan moving a block onto an event is a hard violation', () => {
    const { state } = buildGoldenFixture();
    const mutated = cloneState(state);
    mutated.commitments[IDS.workout]!.startMin = at(1, 17); // onto the interview
    const f = computeFeasibility(mutated);
    expect(f.violations.some((v) => v.type === 'OVERLAP')).toBe(true);
  });

  it('the planner never books slots that are already in the past', () => {
    const { state } = buildGoldenFixture();
    const mutated = cloneState(state);
    mutated.commitments[IDS.exam]!.startMin = at(1, 14);
    const f = computeFeasibility(mutated);
    const nowMin = at(2, 12); // Thursday noon: the 10:00 slot has passed
    const plans = generateCandidatePlans({
      state: mutated,
      feasibility: f,
      liveSlots: {
        [IDS.interview]: [
          { slotId: 'slot-thu-1000', startMin: at(2, 10), durationMin: 60, provenance: 'gmail-thread-jordan-alt-slots' },
          { slotId: 'slot-thu-1300', startMin: at(2, 13), durationMin: 60, provenance: 'gmail-thread-jordan-alt-slots' },
        ],
      },
      nowMin,
    });
    for (const plan of plans) {
      for (const action of plan.actions) {
        if (action.type === 'BOOK_INTERVIEW_SLOT') {
          expect(action.desired_state.start_min as number).toBeGreaterThanOrEqual(nowMin);
        }
      }
    }
  });
});
