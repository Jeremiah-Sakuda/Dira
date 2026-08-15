import { StatusPill } from '../../components/status';
import { getGoldenRunData } from '../../lib/replay-data';

export const dynamic = 'force-dynamic';

const STATUS_TONE: Record<string, string> = {
  VERIFIED: 'good',
  EXECUTED_UNVERIFIED: 'warning',
  PENDING_EXECUTION: 'neutral',
  EXECUTING: 'accent',
  FAILED_TRANSIENT: 'warning',
  FAILED_PERMANENT: 'critical',
  REPLAN_REQUIRED: 'serious',
  STALE: 'neutral',
  PLANNED: 'neutral',
  AUTHORIZED: 'neutral',
};

export default async function ActivityPage() {
  const { ledger } = await getGoldenRunData();

  return (
    <main>
      <h1 className="page-title">Activity — durable action ledger</h1>
      <p className="page-sub">
        Every external intent is persisted before execution and only becomes VERIFIED
        after an independent read of external state. Tool success is never trusted alone;
        idempotency keys make redelivery and crash-resume duplicate-free. The 409 record
        below is the injected failure the workflow recovered from.
      </p>
      <div className="panel" style={{ overflowX: 'auto' }}>
        <table className="data">
          <thead>
            <tr>
              <th>Action</th>
              <th>System</th>
              <th>Verdict · rule</th>
              <th>Attempts</th>
              <th>Status</th>
              <th>Idempotency key</th>
            </tr>
          </thead>
          <tbody>
            {ledger.map((r) => (
              <tr key={r.actionId}>
                <td>{r.action.summary}</td>
                <td className="mono">{r.action.external_system}</td>
                <td>
                  <span className="mono">{r.policyVerdict}</span>
                  <div className="muted" style={{ fontSize: 12 }}>{r.policyRule}</div>
                </td>
                <td className="mono">{r.attempts}</td>
                <td>
                  <StatusPill kind={STATUS_TONE[r.status] ?? 'neutral'} label={r.status} />
                  {r.failureReason && (
                    <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{r.failureReason}</div>
                  )}
                </td>
                <td className="mono muted" style={{ fontSize: 11, maxWidth: 260, overflowWrap: 'anywhere' }}>
                  {r.idempotencyKey}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
