import { createServer } from 'node:http';
import { ActionLedger } from '@dira/action-ledger';
import { FileLedgerStore } from '@dira/action-ledger/file-store';

/**
 * dira-verifier — independent verification worker (PRD §29, §31).
 *
 * Production topology: subscribes to workflow-observations, re-reads external
 * state through the same narrow adapters (Calendar API re-read, recruiter
 * verify_booking, org verify_assignment, Gmail verify_reply) and reconciles
 * the ledger: EXECUTED_UNVERIFIED → VERIFIED on match, → REPLAN_REQUIRED on
 * mismatch. Tool success responses are never trusted alone.
 *
 * In the hackathon build the verify stage runs in-process inside
 * dira-orchestrator (see DEVIATIONS.md); this service exposes the audit
 * surface and proves the deployment seam. GET /unverified lists actions the
 * verifier would need to reconcile after a crash.
 */

const PORT = Number(process.env.PORT ?? 8083);
const DATA_DIR = process.env.DIRA_DATA_DIR ?? '.dira-runtime';

const server = createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/healthz') {
    res.writeHead(200).end('ok');
    return;
  }
  if (req.method === 'GET' && req.url === '/unverified') {
    const ledger = await ActionLedger.open(new FileLedgerStore(`${DATA_DIR}/ledger.json`));
    const pending = ledger
      .all()
      .filter((r) => r.status === 'EXECUTED_UNVERIFIED' || r.status === 'EXECUTING');
    res
      .writeHead(200, { 'content-type': 'application/json' })
      .end(JSON.stringify(pending, null, 2));
    return;
  }
  res.writeHead(404).end();
});

server.listen(PORT, () => console.log(`dira-verifier listening on :${PORT}`));
