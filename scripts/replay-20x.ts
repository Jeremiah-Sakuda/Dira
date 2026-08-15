#!/usr/bin/env tsx
import { mkdirSync, writeFileSync } from 'node:fs';
import { buildReplayRuntime, computeRunMetrics } from '@dira/agent';
import { buildGoldenFixture } from '@dira/fixtures/golden';
import { assertGoldenRun } from '@dira/fixtures/golden-assertions';

/**
 * Reliability evidence (PRD §43): twenty consecutive deterministic golden
 * replays, each with the injected 409, each asserted end-to-end. The artifact
 * is written to .dira-runtime/replay-20x.json for CI publication.
 */

const RUNS = Number(process.env.DIRA_REPLAY_RUNS ?? 20);

interface RunSummary {
  run: number;
  passed: boolean;
  failedAssertions: string[];
  verifiedMutations: number;
  failuresRecovered: number;
  policyViolations: number;
  duplicateKeys: number;
}

const main = async () => {
  const summaries: RunSummary[] = [];

  for (let i = 1; i <= RUNS; i++) {
    const fixture = buildGoldenFixture();
    const runtime = await buildReplayRuntime(fixture);
    const run = await runtime.orchestrator.handleEvent(fixture.trigger);
    const results = await assertGoldenRun(runtime, run, fixture);
    const metrics = computeRunMetrics(run, runtime.ledger);
    const keys = runtime.ledger.byWorkflow(run.id).map((r) => r.idempotencyKey);

    summaries.push({
      run: i,
      passed: results.every((r) => r.pass),
      failedAssertions: results.filter((r) => !r.pass).map((r) => r.name),
      verifiedMutations: metrics.verifiedExternalMutations,
      failuresRecovered: metrics.failuresRecovered,
      policyViolations: metrics.policyViolations,
      duplicateKeys: keys.length - new Set(keys).size,
    });
    process.stdout.write(summaries[summaries.length - 1]!.passed ? '✓' : '✗');
  }
  console.log('');

  const passed = summaries.filter((s) => s.passed).length;
  const artifact = {
    generatedBy: 'scripts/replay-20x.ts',
    runs: RUNS,
    passed,
    duplicateMutations: summaries.reduce((n, s) => n + s.duplicateKeys, 0),
    policyViolations: summaries.reduce((n, s) => n + s.policyViolations, 0),
    injectedFailuresRecovered: summaries.reduce((n, s) => n + s.failuresRecovered, 0),
    summaries,
  };

  mkdirSync('.dira-runtime', { recursive: true });
  writeFileSync('.dira-runtime/replay-20x.json', JSON.stringify(artifact, null, 2));

  console.log('');
  console.log(`${passed}/${RUNS} passed`);
  console.log(`${artifact.duplicateMutations} duplicate mutations`);
  console.log(`${artifact.policyViolations} policy violations`);
  console.log(`${artifact.injectedFailuresRecovered} injected failures recovered`);
  console.log('');
  console.log('Artifact: .dira-runtime/replay-20x.json');

  process.exit(passed === RUNS && artifact.duplicateMutations === 0 ? 0 : 1);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
