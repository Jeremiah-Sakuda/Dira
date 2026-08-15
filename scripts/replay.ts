#!/usr/bin/env tsx
import { buildReplayRuntime, type ReplayMode } from '@dira/agent';
import { formatSlackHours } from '@dira/commitment-model';
import {
  buildGoldenFixture,
  type GoldenVariation,
} from '@dira/fixtures/golden';
import { assertGoldenRun } from '@dira/fixtures/golden-assertions';

/**
 * `make demo-replay` — the credential-free golden workflow (PRD §38).
 *
 *   tsx scripts/replay.ts                       # default 48-Hour Shock
 *   tsx scripts/replay.ts --vary examHour=15    # runtime variation
 *   tsx scripts/replay.ts --matrix              # full variation matrix
 *   REPLAY_MODE=live-model tsx scripts/replay.ts  # Gemini interprets
 */

const args = process.argv.slice(2);
const mode = (process.env.REPLAY_MODE === 'live-model' ? 'live-model' : 'deterministic') as ReplayMode;
const matrix = args.includes('--matrix');
const quiet = args.includes('--quiet');

function parseVariation(): GoldenVariation {
  const v: Record<string, unknown> = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] !== '--vary') continue;
    const [key, raw] = (args[i + 1] ?? '').split('=');
    if (!key || raw === undefined) continue;
    const value: unknown = raw === 'true' ? true : raw === 'false' ? false : Number.isNaN(Number(raw)) ? raw : Number(raw);
    v[key] = value;
  }
  return v as GoldenVariation;
}

async function runOnce(variation: GoldenVariation, label: string): Promise<boolean> {
  const fixture = buildGoldenFixture(variation);
  const runtime = await buildReplayRuntime(fixture, { mode });

  if (!quiet) {
    console.log(`\n━━━ ${label} (mode: ${mode}) ━━━`);
    console.log('Golden workflow initialized');
    runtime.recorder.onEntry((e) => {
      console.log(`${e.atIso.slice(11, 19)}  ${e.phase.padEnd(11)} ${e.message}`);
    });
  }

  const run = await runtime.orchestrator.handleEvent(fixture.trigger);
  const results = await assertGoldenRun(runtime, run, fixture);
  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass);

  if (!quiet) {
    console.log('');
    console.log(`Initial slack: ${formatSlackHours(run.slackBeforeMin ?? 0)}`);
    console.log(`After trigger: ${formatSlackHours(run.slackAfterMutationMin ?? 0)}`);
    console.log(`Plan candidates: ${run.planningRounds[0]?.length ?? 0}`);
    console.log(`Plan selected: ${run.selectedPlanIds[0] ?? 'none'}`);
    for (const attempt of runtime.tools.recruiter.bookAttempts) {
      console.log(
        `Interview ${attempt.slotId} → ${attempt.outcome === 'BOOKED' ? 'VERIFIED' : 'FAILED (409)'}`,
      );
    }
    if (run.slackFinalMin !== undefined) {
      console.log(`Final slack: ${formatSlackHours(run.slackFinalMin)}`);
    }
    console.log(`Workflow: ${run.status}`);
    console.log('');
    for (const r of failed) {
      console.log(`  ✗ ${r.name}${r.detail ? ` — ${r.detail}` : ''}`);
    }
    console.log(`Assertions: ${passed}/${results.length} passed`);
  }
  return failed.length === 0;
}

const VARIATION_MATRIX: { label: string; variation: GoldenVariation }[] = [
  { label: 'default 48-Hour Shock', variation: {} },
  { label: 'exam moves to Wednesday 1 PM', variation: { examHour: 13 } },
  { label: 'exam moves to Wednesday 3 PM', variation: { examHour: 15 } },
  { label: 'first recruiter slot genuinely open (no 409)', variation: { firstSlotTaken: false } },
  { label: 'personal block is 3h instead of 4h', variation: { personalBlockDurationMin: 180 } },
  { label: 'backup owner changes to Tunde', variation: { backupOwner: 'tunde-adebayo' } },
  { label: 'prep already 4h complete before trigger', variation: { prepCompletedMin: 240 } },
  { label: 'workout moved earlier before the trigger', variation: { workoutStartHour: 18.5 } },
];

const main = async () => {
  if (matrix) {
    let allOk = true;
    const rows: { label: string; ok: boolean }[] = [];
    for (const { label, variation } of VARIATION_MATRIX) {
      const ok = await runOnce(variation, label);
      rows.push({ label, ok });
      allOk &&= ok;
    }
    console.log('\n━━━ Variation matrix ━━━');
    for (const row of rows) console.log(`${row.ok ? '✓' : '✗'} ${row.label}`);
    process.exit(allOk ? 0 : 1);
  } else {
    const ok = await runOnce(parseVariation(), 'The 48-Hour Shock');
    process.exit(ok ? 0 : 1);
  }
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
