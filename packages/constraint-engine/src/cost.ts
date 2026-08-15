import type { DomainState } from '@dira/commitment-model';
import type { CandidatePlan } from '@dira/event-schema';

/**
 * PRD §20 — explicit, configurable resolution objective function.
 * Only plans with zero hard violations are ever scored; hard violations and
 * unauthorized actions are handled upstream as "impossible", not as costs.
 */
export interface CostWeights {
  criticalCommitmentDropped: number;
  opportunityLost: number;
  socialDisruption: number;
  majorScheduleMove: number;
  minorScheduleMove: number;
  externalActionCount: number;
}

export const DEFAULT_COST_WEIGHTS: CostWeights = {
  criticalCommitmentDropped: 10_000,
  opportunityLost: 2_000,
  socialDisruption: 500,
  majorScheduleMove: 100,
  minorScheduleMove: 25,
  externalActionCount: 5,
};

export interface CostBreakdown {
  total: number;
  terms: { label: string; amount: number }[];
}

export function computePlanCost(
  state: DomainState,
  plan: CandidatePlan,
  simulated: DomainState,
  weights: CostWeights = DEFAULT_COST_WEIGHTS,
): CostBreakdown {
  const terms: { label: string; amount: number }[] = [];
  const add = (label: string, amount: number) => {
    if (amount > 0) terms.push({ label, amount });
  };

  // Commitments that end up dropped, weighted by criticality.
  for (const [id, before] of Object.entries(state.commitments)) {
    const after = simulated.commitments[id];
    if (before.status !== 'DROPPED' && after?.status === 'DROPPED') {
      if (before.criticality === 'CRITICAL' || before.criticality === 'HIGH') {
        add(`critical commitment dropped: ${before.title}`, weights.criticalCommitmentDropped);
      } else {
        add(`commitment dropped: ${before.title}`, weights.minorScheduleMove);
      }
    }
  }

  for (const action of plan.actions) {
    switch (action.type) {
      case 'DECLINE_INTERVIEW':
        add(`opportunity lost: ${action.summary}`, weights.opportunityLost);
        break;
      case 'BOOK_INTERVIEW_SLOT':
        // Rescheduling with an external counterpart is a major move.
        add(`major schedule move: ${action.summary}`, weights.majorScheduleMove);
        break;
      case 'MOVE_CALENDAR_EVENT': {
        const target = state.commitments[action.target];
        const external = target && target.participants.some((p) => p !== state.userId);
        if (external) add(`social disruption: ${action.summary}`, weights.socialDisruption);
        else add(`minor schedule move: ${action.summary}`, weights.minorScheduleMove);
        break;
      }
      case 'DELEGATE_TASK':
        // Handing work to the designated backup owner is a designed, minor move.
        add(`delegation: ${action.summary}`, weights.minorScheduleMove);
        break;
      case 'CREATE_CALENDAR_EVENT':
      case 'DELETE_CALENDAR_EVENT':
      case 'SEND_NOTIFICATION':
        break;
      default:
        break;
    }
    add(`external action: ${action.summary}`, weights.externalActionCount);
  }

  return { total: terms.reduce((s, t) => s + t.amount, 0), terms };
}
