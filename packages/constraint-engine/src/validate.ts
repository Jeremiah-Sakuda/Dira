import type { DomainState } from '@dira/commitment-model';
import type { CandidatePlan } from '@dira/event-schema';
import { applyPlan } from './apply.js';
import { computePlanCost, DEFAULT_COST_WEIGHTS, type CostBreakdown, type CostWeights } from './cost.js';
import { computeFeasibility, type FeasibilityComputation } from './slack.js';

export interface PlanValidation {
  plan: CandidatePlan;
  feasibility: FeasibilityComputation;
  cost: CostBreakdown;
  simulated: DomainState;
  /** Zero hard violations AND restores at least the configured slack margin. */
  acceptable: boolean;
  rejectionReason?: string;
}

/**
 * Repair margin: the minimum slack across *capacity* paths — how close the
 * most constrained deadline is to being unmeetable. Buffer constraints are
 * excluded here: a buffer satisfied at exactly its required length is fully
 * satisfied, not at risk (Global Slack still reports the true minimum).
 */
export function repairMarginMinutes(feasibility: FeasibilityComputation): number {
  const capacity = feasibility.paths
    .filter((p) => p.kind === 'capacity' && p.slack_minutes !== null)
    .map((p) => p.slack_minutes as number);
  return capacity.length ? Math.min(...capacity) : feasibility.global_slack_minutes;
}

/**
 * Candidate plans are proposals; this is the authority (PRD §19).
 * A plan is acceptable only if the simulated world has zero hard violations,
 * non-negative Global Slack, and a capacity margin of at least
 * `repairSlackMarginMin` — an autonomous system should not repair the most
 * constrained deadline onto a knife edge.
 */
export function validatePlan(
  state: DomainState,
  plan: CandidatePlan,
  weights: CostWeights = DEFAULT_COST_WEIGHTS,
): PlanValidation {
  let simulated: DomainState;
  try {
    simulated = applyPlan(state, plan);
  } catch (err) {
    const feasibility = computeFeasibility(state);
    return {
      plan,
      feasibility,
      cost: { total: Number.POSITIVE_INFINITY, terms: [] },
      simulated: state,
      acceptable: false,
      rejectionReason: `unapplicable plan: ${(err as Error).message}`,
    };
  }
  const feasibility = computeFeasibility(simulated);
  const cost = computePlanCost(state, plan, simulated, weights);

  if (feasibility.violations.length > 0) {
    return {
      plan, feasibility, cost, simulated,
      acceptable: false,
      rejectionReason: `hard constraint violated: ${feasibility.violations[0]!.type}`,
    };
  }
  if (feasibility.global_slack_minutes < 0) {
    return {
      plan, feasibility, cost, simulated,
      acceptable: false,
      rejectionReason: `negative global slack: ${feasibility.global_slack_minutes} min`,
    };
  }
  const margin = repairMarginMinutes(feasibility);
  if (margin < state.config.repairSlackMarginMin) {
    return {
      plan, feasibility, cost, simulated,
      acceptable: false,
      rejectionReason:
        `insufficient repair margin: ${margin} min < ` +
        `${state.config.repairSlackMarginMin} min required`,
    };
  }
  return { plan, feasibility, cost, simulated, acceptable: true };
}

/** Deterministic ranking: lowest cost, then highest slack, then stable id. */
export function rankValidations(validations: PlanValidation[]): PlanValidation[] {
  return [...validations].sort((a, b) => {
    if (a.acceptable !== b.acceptable) return a.acceptable ? -1 : 1;
    if (a.cost.total !== b.cost.total) return a.cost.total - b.cost.total;
    if (a.feasibility.global_slack_minutes !== b.feasibility.global_slack_minutes) {
      return b.feasibility.global_slack_minutes - a.feasibility.global_slack_minutes;
    }
    return a.plan.id.localeCompare(b.plan.id);
  });
}
