import { buildReplayRuntime, computeRunMetrics, type RunMetrics, type WorkflowRun } from '@dira/agent';
import type { ActionRecord } from '@dira/action-ledger';
import { formatSlackHours, minutesToLabel, type Commitment } from '@dira/commitment-model';
import type { FlightEntry } from '@dira/observability';
import { buildGoldenFixture, HORIZON_START_ISO } from '@dira/fixtures/golden';

/**
 * The dashboard is a visibility layer over a real engine run (PRD §3).
 * On the deployed demo, the deterministic golden workflow executes inside the
 * server process — nothing rendered here is a canned screenshot.
 */

export interface GoldenRunData {
  run: WorkflowRun;
  metrics: RunMetrics;
  entries: FlightEntry[];
  ledger: ActionRecord[];
  commitmentsBefore: Commitment[];
  commitmentsAfter: Commitment[];
  edges: { id: string; type: string; from: string; to: string }[];
  slackTrajectory: { label: string; minutes: number }[];
}

let cache: Promise<GoldenRunData> | undefined;

export function getGoldenRunData(): Promise<GoldenRunData> {
  cache ??= runGolden();
  return cache;
}

async function runGolden(): Promise<GoldenRunData> {
  const fixture = buildGoldenFixture();
  const runtime = await buildReplayRuntime(fixture);
  const run = await runtime.orchestrator.handleEvent(fixture.trigger);

  return {
    run,
    metrics: computeRunMetrics(run, runtime.ledger),
    entries: runtime.recorder.all(),
    ledger: runtime.ledger.byWorkflow(run.id),
    commitmentsBefore: Object.values(fixture.state.commitments),
    commitmentsAfter: Object.values(runtime.orchestrator.state.commitments),
    edges: fixture.state.edges.map(({ id, type, from, to }) => ({ id, type, from, to })),
    slackTrajectory: [
      { label: 'before trigger', minutes: run.slackBeforeMin ?? 0 },
      { label: 'after mutation', minutes: run.slackAfterMutationMin ?? 0 },
      { label: 'after repair', minutes: run.slackFinalMin ?? 0 },
    ],
  };
}

export const fmtSlack = formatSlackHours;

export function fmtTime(min: number | undefined): string {
  if (min === undefined) return '—';
  return minutesToLabel(min, HORIZON_START_ISO);
}
