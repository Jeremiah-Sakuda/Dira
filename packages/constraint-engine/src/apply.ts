import { cloneState, type DomainState } from '@dira/commitment-model';
import type { CandidatePlan, PlannedAction } from '@dira/event-schema';

/**
 * Pure simulation of a planned action against the world model. The validator
 * uses this to test candidate plans; the orchestrator uses it to update
 * internal state only after the verifier has confirmed the external world
 * actually changed.
 */
export function applyAction(state: DomainState, action: PlannedAction): DomainState {
  const next = cloneState(state);
  const c = next.commitments[action.target];
  const d = action.desired_state as Record<string, unknown>;

  switch (action.type) {
    case 'BOOK_INTERVIEW_SLOT':
    case 'MOVE_CALENDAR_EVENT': {
      if (!c) throw new Error(`Unknown target ${action.target}`);
      if (typeof d.start_min !== 'number') throw new Error(`${action.type}: missing start_min`);
      c.startMin = d.start_min;
      if (typeof d.duration_min === 'number') c.durationMin = d.duration_min;
      break;
    }
    case 'CREATE_CALENDAR_EVENT': {
      if (typeof d.start_min !== 'number' || typeof d.duration_min !== 'number') {
        throw new Error('CREATE_CALENDAR_EVENT: missing start_min/duration_min');
      }
      next.commitments[action.target] = {
        id: action.target,
        userId: next.userId,
        title: String(d.title ?? action.summary),
        domain: 'personal',
        source: 'dira',
        status: 'PLANNED',
        kind: 'block',
        startMin: d.start_min,
        durationMin: d.duration_min,
        reservesEffortFor:
          typeof d.reserves_effort_for === 'string' ? d.reserves_effort_for : undefined,
        flexibility: 'FLEXIBLE',
        criticality: 'NORMAL',
        owner: next.userId,
        participants: [next.userId],
        goalIds: [],
        resourceRequirements: ['user-time'],
        externalSystem: 'calendar',
        confidence: 1,
        createdAtIso: next.horizonStartIso,
        updatedAtIso: next.horizonStartIso,
      };
      break;
    }
    case 'DELETE_CALENDAR_EVENT': {
      if (!c) throw new Error(`Unknown target ${action.target}`);
      c.status = 'DROPPED';
      break;
    }
    case 'DELEGATE_TASK': {
      if (!c) throw new Error(`Unknown target ${action.target}`);
      if (typeof d.new_owner !== 'string') throw new Error('DELEGATE_TASK: missing new_owner');
      c.owner = d.new_owner;
      break;
    }
    case 'DECLINE_INTERVIEW': {
      if (!c) throw new Error(`Unknown target ${action.target}`);
      c.status = 'DROPPED';
      break;
    }
    case 'SEND_NOTIFICATION':
      break; // no world-model change
    default: {
      const exhaustive: never = action.type;
      throw new Error(`Unsupported action type: ${exhaustive}`);
    }
  }
  return next;
}

export function applyPlan(state: DomainState, plan: CandidatePlan): DomainState {
  let next = state;
  for (const action of plan.actions) next = applyAction(next, action);
  return next;
}
