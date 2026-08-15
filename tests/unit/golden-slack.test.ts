import { describe, expect, it } from 'vitest';
import { cloneState } from '@dira/commitment-model';
import { computeFeasibility } from '@dira/constraint-engine';
import { at, buildGoldenFixture, IDS } from '@dira/fixtures/golden';

/**
 * The PRD's headline numbers must fall out of the deterministic solver:
 *   initial  +246 min (+4.1h), feasible
 *   mutated  −216 min (−3.6h), infeasible (PRD §18: -216)
 */

describe('golden fixture slack trajectory', () => {
  it('initial state is feasible with +4.1h global slack', () => {
    const { state } = buildGoldenFixture();
    const f = computeFeasibility(state);
    expect(f.violations).toEqual([]);
    expect(f.feasible).toBe(true);
    expect(f.global_slack_minutes).toBe(246);
  });

  it('exam moved to Wednesday 2 PM drives global slack to −216 min', () => {
    const { state } = buildGoldenFixture();
    const mutated = cloneState(state);
    mutated.commitments[IDS.exam]!.startMin = at(1, 14);
    const f = computeFeasibility(mutated);
    expect(f.feasible).toBe(false);
    expect(f.global_slack_minutes).toBe(-216);
    const types = f.violations.map((v) => v.type).sort();
    expect(types).toContain('INSUFFICIENT_PREP_CAPACITY');
    expect(types).toContain('BUFFER_VIOLATION');
    expect(types).toContain('ASSIGNEE_UNAVAILABLE');
    // PRD §18 attribution: the prep shortfall is attributed to the exam.
    const prep = f.violations.find((v) => v.type === 'INSUFFICIENT_PREP_CAPACITY');
    expect(prep?.commitment_id).toBe(IDS.exam);
    // Buffer path: interview 2h after exam end vs 3h required → −60 min.
    const buffer = f.paths.find((p) => p.id.startsWith('buffer-'));
    expect(buffer?.slack_minutes).toBe(-60);
  });

  it('manual repair simulation restores +78 min (+1.3h)', () => {
    const { state } = buildGoldenFixture();
    const repaired = cloneState(state);
    repaired.commitments[IDS.exam]!.startMin = at(1, 14);
    repaired.commitments[IDS.interview]!.startMin = at(2, 13); // Thu 1 PM
    repaired.commitments[IDS.qa]!.owner = 'maya-okafor'; // delegated
    repaired.commitments[IDS.workout]!.startMin = at(1, 16, 45); // out of the way
    repaired.commitments[IDS.sideProject]!.startMin = at(2, 14); // Thu afternoon
    const f = computeFeasibility(repaired);
    expect(f.violations).toEqual([]);
    expect(f.global_slack_minutes).toBe(78);
  });
});
