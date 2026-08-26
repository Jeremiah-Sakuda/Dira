import Link from 'next/link';
import { SlackChart } from '../components/slack-chart';
import { StatusPill, Tile } from '../components/status';
import { fmtSlack, getGoldenRunData } from '../lib/replay-data';

export const dynamic = 'force-dynamic';

export default async function SystemPage() {
  const data = await getGoldenRunData();
  const { run, metrics } = data;
  const productionConfigured = Boolean(
    process.env.DIRA_CLOUD_RUN_URL && process.env.DIRA_DEMO_TOKEN,
  );
  const feasible = run.status === 'RESOLVED';
  const commitmentCount = data.commitmentsAfter.filter(
    (c) => !c.reservesEffortFor && c.status !== 'DROPPED',
  ).length;
  const atRisk = feasible ? 0 : 1;

  return (
    <main>
      <div className="hero">
        <div className="panel system-state">
          <div className="section-label">Reference system state</div>
          <div className="system-word" style={{ color: feasible ? 'var(--status-good)' : 'var(--status-critical)' }}>
            {feasible ? 'FEASIBLE' : 'AT RISK'}
          </div>
          <div>
            <StatusPill
              kind={feasible ? 'good' : 'critical'}
              label={`global slack ${fmtSlack(run.slackFinalMin ?? 0)}`}
            />
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
            Dira monitors commitments across school, career, organizations and personal
            life; when the outside world moves, it repairs the consequences. This overview
            is a reproducible deterministic snapshot — run the real thing live below.
          </p>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <Link
              href="/interventions"
              className="btn"
              style={{ textDecoration: 'none', fontSize: 15, padding: '11px 20px' }}
            >
              ▶ Run Dira live on Google Cloud
            </Link>
            {productionConfigured && (
              <StatusPill kind="good" label="LIVE CLOUD · Vertex + Calendar" />
            )}
          </div>
        </div>

        <div className="panel">
          <div className="section-label">Global slack — most constrained critical path</div>
          <SlackChart points={data.slackTrajectory} />
        </div>
      </div>

      <div className="tile-row">
        <Tile k="Commitments" v={String(commitmentCount)} />
        <Tile k="At risk" v={String(atRisk)} tone={atRisk ? 'critical' : undefined} />
        <Tile k="Interventions (resolved)" v="1" />
        <Tile k="Global slack" v={fmtSlack(run.slackFinalMin ?? 0)} tone={feasible ? 'good' : 'critical'} />
      </div>

      <div className="panel">
        <div className="section-label">Recent intervention</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap' }}>
          <strong style={{ fontSize: 16.5 }}>ECON 402 — the 48-Hour Shock</strong>
          <StatusPill kind={feasible ? 'good' : 'warning'} label={run.status} />
        </div>
        <div className="tile-row" style={{ margin: '16px 0 4px' }}>
          <Tile k="Commitments affected" v={String(run.affected.length)} />
          <Tile k="Verified adapter mutations" v={String(metrics.verifiedExternalMutations)} />
          <Tile k="Failures recovered" v={String(metrics.failuresRecovered)} />
          <Tile k="User interventions" v={String(metrics.userInterventions)} tone="good" />
        </div>
        <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', marginTop: 10 }}>
          A professor email moved the midterm forward 48 hours. Dira re-derived the plan:
          rebooked the interview (surviving a 409 on the first slot), delegated sponsor-deck
          QA to the backup owner, reclaimed two personal blocks, and rebuilt the study plan —
          all policy-gated, ledgered, and independently verified.{' '}
          <Link href="/interventions" style={{ color: 'var(--accent)' }}>
            Open the flight recorder →
          </Link>
        </p>
      </div>

      <p className="footnote">
        Runtime note: this overview is always the reproducible deterministic reference.
        {productionConfigured
          ? ' Production credentials are configured for this deployment; the Interventions page verifies live Cloud Run connectivity per run and labels the boundary.'
          : ' The judge-controlled replay currently uses stateful integration simulators; production credentials are not configured for this web deployment.'}{' '}
        Reproduce the reference with <span className="mono">make demo-replay</span>.
      </p>
    </main>
  );
}
