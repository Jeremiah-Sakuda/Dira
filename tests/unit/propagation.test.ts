import { describe, expect, it } from 'vitest';
import { cloneState, findOrderingCycle } from '@dira/commitment-model';
import { propagateConsequences } from '@dira/propagation-engine';
import { at, buildGoldenFixture, IDS } from '@dira/fixtures/golden';

describe('consequence propagation (PRD §12–§14)', () => {
  it('reaches all six downstream commitments of the exam move', () => {
    const { state } = buildGoldenFixture();
    const mutated = cloneState(state);
    mutated.commitments[IDS.exam]!.startMin = at(1, 14);
    const { impacts, affected } = propagateConsequences(state, mutated, IDS.exam);

    expect(new Set(affected)).toEqual(
      new Set([IDS.prep, IDS.interview, IDS.qa, IDS.ps6, IDS.deckFreeze, IDS.presentation]),
    );
    const byEdge = Object.fromEntries(impacts.map((i) => [i.edge_type, i]));
    expect(byEdge.REQUIRES_PREPARATION?.new_status).toBe('VIOLATED');
    expect(byEdge.REQUIRES_BUFFER?.new_status).toBe('VIOLATED');
    expect(byEdge.CONFLICTS_WITH?.affected_commitment).toBe(IDS.qa);
  });

  it('emits inspectable impact records with previous and new status', () => {
    const { state } = buildGoldenFixture();
    const mutated = cloneState(state);
    mutated.commitments[IDS.exam]!.startMin = at(1, 14);
    const { impacts } = propagateConsequences(state, mutated, IDS.exam);
    const buffer = impacts.find((i) => i.edge_type === 'REQUIRES_BUFFER');
    expect(buffer).toMatchObject({
      source_commitment: IDS.exam,
      affected_commitment: IDS.interview,
      previous_status: 'NOT_APPLICABLE',
      new_status: 'VIOLATED',
    });
  });

  it('is cycle-safe on graphs with mutual SHARES_RESOURCE_WITH edges', () => {
    const { state } = buildGoldenFixture();
    const mutated = cloneState(state);
    mutated.edges.push({
      id: 'edge-cycle',
      type: 'SHARES_RESOURCE_WITH',
      from: IDS.ps6,
      to: IDS.prep,
      data: { resource: 'user-time' },
    });
    const withCycle = cloneState(state);
    withCycle.edges = structuredClone(mutated.edges);
    mutated.commitments[IDS.exam]!.startMin = at(1, 14);
    // Terminates and still produces the affected set.
    const { affected } = propagateConsequences(withCycle, mutated, IDS.exam);
    expect(affected.length).toBeGreaterThanOrEqual(6);
  });

  it('detects ordering cycles in the stored graph', () => {
    const { state } = buildGoldenFixture();
    expect(findOrderingCycle(state)).toBeNull();
    const broken = cloneState(state);
    broken.edges.push({
      id: 'edge-bad',
      type: 'MUST_PRECEDE',
      from: IDS.presentation,
      to: IDS.qa,
    });
    // qa MUST_PRECEDE freeze MUST_PRECEDE presentation MUST_PRECEDE qa → cycle
    expect(findOrderingCycle(broken)).not.toBeNull();
  });

  it('a variation without QA conflict does not drag the sponsor chain in', () => {
    const { state } = buildGoldenFixture({ examHour: 13 });
    const mutated = cloneState(state);
    mutated.commitments[IDS.exam]!.startMin = at(1, 13);
    const { affected } = propagateConsequences(state, mutated, IDS.exam);
    expect(affected).not.toContain(IDS.presentation);
    expect(affected).toContain(IDS.prep);
  });
});
