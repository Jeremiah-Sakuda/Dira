import {
  type CommitmentEdge,
  type DomainState,
  eventInterval,
  overlaps,
} from '@dira/commitment-model';
import {
  computeFeasibility,
  effectiveDeadline,
  type FeasibilityComputation,
} from '@dira/constraint-engine';
import type { ImpactRecord } from '@dira/event-schema';

/**
 * Consequence propagation (PRD §12).
 *
 * A deterministic traversal from the mutated commitment over typed edges.
 * Each edge type has an explicit rule that compares constraint status before
 * and after the mutation (both computed by the deterministic solver — never
 * by a model). Every propagated effect emits an inspectable ImpactRecord
 * (PRD §14). Cycle-safe via a visited set.
 */

export interface PropagationResult {
  impacts: ImpactRecord[];
  /** Downstream commitments whose constraints or slack changed. */
  affected: string[];
}

type Status = 'SATISFIED' | 'VIOLATED' | 'NOT_APPLICABLE';

function bufferStatus(f: FeasibilityComputation, edgeId: string): Status {
  const path = f.paths.find((p) => p.id === `buffer-${edgeId}`);
  if (!path || path.slack_minutes === null) return 'NOT_APPLICABLE';
  return path.slack_minutes < 0 ? 'VIOLATED' : 'SATISFIED';
}

function capacityStatus(f: FeasibilityComputation, taskId: string): Status {
  const path = f.paths.find((p) => p.id === `capacity-${taskId}`);
  if (!path || path.slack_minutes === null) return 'NOT_APPLICABLE';
  return path.slack_minutes < 0 ? 'VIOLATED' : 'SATISFIED';
}

function capacitySlack(f: FeasibilityComputation, taskId: string): number | null {
  return f.paths.find((p) => p.id === `capacity-${taskId}`)?.slack_minutes ?? null;
}

function assignmentStatus(f: FeasibilityComputation, taskId: string): Status {
  const placement = f.placements.find((p) => p.commitmentId === taskId);
  if (!placement) return 'NOT_APPLICABLE';
  return placement.valid ? 'SATISFIED' : 'VIOLATED';
}

export function propagateConsequences(
  oldState: DomainState,
  newState: DomainState,
  changedCommitmentId: string,
): PropagationResult {
  const oldF = computeFeasibility(oldState);
  const newF = computeFeasibility(newState);

  const impacts: ImpactRecord[] = [];
  const affected = new Set<string>();
  const visited = new Set<string>();
  const queue: string[] = [changedCommitmentId];

  const record = (
    source: string,
    target: string,
    edgeType: string,
    constraint: string,
    prev: Status,
    next: Status,
    detail: string,
    changed: boolean,
  ) => {
    if (!changed) return;
    impacts.push({
      source_commitment: source,
      affected_commitment: target,
      edge_type: edgeType,
      constraint,
      previous_status: prev,
      new_status: next,
      detail,
    });
    if (target !== changedCommitmentId && !affected.has(target)) {
      affected.add(target);
      queue.push(target);
    }
  };

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (visited.has(currentId)) continue; // cycle detection
    visited.add(currentId);
    const current = newState.commitments[currentId];
    if (!current) continue;

    // Dynamic conflict discovery: a moved event landing on top of someone's
    // placed work is a consequence even without a stored CONFLICTS_WITH edge.
    if (currentId === changedCommitmentId && current.startMin !== undefined && current.durationMin) {
      const iv = eventInterval(current);
      for (const other of Object.values(newState.commitments)) {
        if (other.id === currentId || other.startMin === undefined || !other.durationMin) continue;
        if (other.status === 'DROPPED' || other.status === 'COMPLETE') continue;
        if (other.kind !== 'effort') continue; // block/event overlaps surface via solver
        const oldOther = oldState.commitments[other.id];
        const overlapNow = overlaps(iv, eventInterval(other));
        const overlapBefore =
          oldOther?.startMin !== undefined && oldOther.durationMin
            ? overlaps(
                eventInterval(oldState.commitments[currentId] ?? current),
                eventInterval(oldOther),
              )
            : false;
        if (overlapNow && !overlapBefore) {
          record(
            currentId, other.id, 'CONFLICTS_WITH', 'no temporal overlap',
            'SATISFIED', 'VIOLATED',
            `${current.title} now overlaps the planned session for ${other.title}`,
            true,
          );
        }
      }
    }

    for (const edge of relevantEdges(newState, currentId)) {
      applyEdgeRule(edge, currentId);
    }
  }

  function applyEdgeRule(edge: CommitmentEdge, currentId: string): void {
    const src = newState.commitments[edge.from];
    const dst = newState.commitments[edge.to];

    switch (edge.type) {
      case 'REQUIRES_PREPARATION': {
        if (edge.from !== currentId || !dst) return;
        const oldDeadline = oldState.commitments[edge.to]
          ? effectiveDeadline(oldState, oldState.commitments[edge.to]!)
          : undefined;
        const newDeadline = effectiveDeadline(newState, dst);
        const prev = capacityStatus(oldF, edge.to);
        const next = capacityStatus(newF, edge.to);
        const invalidReservations = Object.values(newState.commitments).filter(
          (c) =>
            c.reservesEffortFor === edge.to &&
            c.status !== 'DROPPED' &&
            newDeadline !== undefined &&
            c.startMin !== undefined &&
            c.startMin + (c.durationMin ?? 0) > newDeadline,
        );
        record(
          edge.from, edge.to, edge.type,
          'preparation must complete before the prepared event',
          prev, next,
          `prep deadline ${oldDeadline} → ${newDeadline}; ` +
            `${invalidReservations.length} scheduled prep block(s) now sit after the deadline`,
          oldDeadline !== newDeadline || prev !== next,
        );
        return;
      }
      case 'REQUIRES_BUFFER': {
        if (edge.from !== currentId && edge.to !== currentId) return;
        const prev = bufferStatus(oldF, edge.id);
        const next = bufferStatus(newF, edge.id);
        record(
          edge.from, edge.to, edge.type,
          `${edge.data?.bufferMin ?? 0} min buffer (${edge.data?.provenance ?? 'stored'})`,
          prev, next,
          `${src?.title ?? edge.from} → ${dst?.title ?? edge.to}`,
          prev !== next,
        );
        return;
      }
      case 'SHARES_RESOURCE_WITH': {
        const otherId = edge.from === currentId ? edge.to : edge.from;
        const prevSlack = capacitySlack(oldF, otherId);
        const nextSlack = capacitySlack(newF, otherId);
        if (prevSlack === null || nextSlack === null) return;
        const prev = prevSlack < 0 ? 'VIOLATED' : 'SATISFIED';
        const next = nextSlack < 0 ? 'VIOLATED' : 'SATISFIED';
        record(
          currentId, otherId, edge.type,
          `shared resource: ${edge.data?.resource ?? 'user-time'}`,
          prev, next,
          `capacity-path slack ${prevSlack} min → ${nextSlack} min`,
          prevSlack !== nextSlack,
        );
        return;
      }
      case 'MUST_PRECEDE':
      case 'MUST_FOLLOW': {
        // Windowed-task edges: re-evaluate the task's assignment feasibility.
        if (edge.from !== currentId || !src || src.kind !== 'effort') {
          // Also propagate onward from a windowed task to its marker.
          if (edge.from === currentId && dst) {
            record(
              edge.from, edge.to, edge.type,
              'ordering', 'SATISFIED', 'SATISFIED',
              `${src?.title ?? edge.from} feeds ${dst.title}`,
              assignmentStatus(oldF, edge.from) !== assignmentStatus(newF, edge.from),
            );
          }
          return;
        }
        const prev = assignmentStatus(oldF, edge.from);
        const next = assignmentStatus(newF, edge.from);
        record(
          edge.from, edge.from, edge.type,
          'execution window', prev, next,
          `${src.title} window feasibility for owner "${src.owner}"`,
          prev !== next,
        );
        return;
      }
      case 'DEPENDS_ON': {
        // Traverse upstream→downstream: if the prerequisite (edge.to) is the
        // current node, the dependent (edge.from) inherits the risk.
        if (edge.to !== currentId || !src) return;
        const prereqBroken =
          assignmentStatus(newF, edge.to) === 'VIOLATED' ||
          capacityStatus(newF, edge.to) === 'VIOLATED' ||
          newState.commitments[edge.to]?.status === 'DROPPED';
        const prereqWasBroken =
          assignmentStatus(oldF, edge.to) === 'VIOLATED' ||
          capacityStatus(oldF, edge.to) === 'VIOLATED' ||
          oldState.commitments[edge.to]?.status === 'DROPPED';
        record(
          edge.to, edge.from, edge.type,
          'prerequisite must complete first',
          prereqWasBroken ? 'VIOLATED' : 'SATISFIED',
          prereqBroken ? 'VIOLATED' : 'SATISFIED',
          `${src.title} depends on ${dst?.title ?? edge.to}`,
          prereqBroken !== prereqWasBroken,
        );
        return;
      }
      case 'CONFLICTS_WITH': {
        if (edge.from !== currentId && edge.to !== currentId) return;
        const a = src, b = dst;
        if (!a || !b || a.startMin === undefined || b.startMin === undefined) return;
        const now = overlaps(eventInterval(a), eventInterval(b));
        const oldA = oldState.commitments[edge.from];
        const oldB = oldState.commitments[edge.to];
        const before =
          oldA?.startMin !== undefined && oldB?.startMin !== undefined
            ? overlaps(eventInterval(oldA), eventInterval(oldB))
            : false;
        record(
          edge.from, edge.to, edge.type, 'no temporal overlap',
          before ? 'VIOLATED' : 'SATISFIED',
          now ? 'VIOLATED' : 'SATISFIED',
          `${a.title} vs ${b.title}`,
          before !== now,
        );
        return;
      }
      case 'DELEGATABLE_TO':
      case 'OWNED_BY':
      case 'SUPPORTS_GOAL':
      case 'BLOCKED_BY':
        return; // structural metadata; no propagation rule
      default:
        return;
    }
  }

  return { impacts, affected: [...affected] };
}

/** Edges that can transmit a change from `id` (outgoing + relevant incoming). */
function relevantEdges(state: DomainState, id: string): CommitmentEdge[] {
  return state.edges.filter(
    (e) =>
      e.from === id ||
      (e.to === id && (e.type === 'DEPENDS_ON' || e.type === 'REQUIRES_BUFFER' || e.type === 'SHARES_RESOURCE_WITH')),
  );
}
