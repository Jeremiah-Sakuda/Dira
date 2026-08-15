import { createServer } from 'node:http';
import { FileLedgerStore } from '@dira/action-ledger/file-store';
import { ActionLedger } from '@dira/action-ledger';

/**
 * dira-executor — Cloud Run worker for the outbox (PRD §25, §32).
 *
 * In the production topology this worker subscribes to workflow-actions,
 * claims PENDING_EXECUTION rows from the Firestore ledger (transactional
 * claim → EXECUTING), checks whether the desired external state already
 * exists, executes through the scoped tool adapters, and records
 * EXECUTED_UNVERIFIED. It never marks anything VERIFIED — that is the
 * verifier's exclusive right.
 *
 * In the hackathon build the execute stage runs in-process inside
 * dira-orchestrator against the same ledger state machine (see
 * DEVIATIONS.md); this service exposes the ledger for inspection and proves
 * the deployment seam.
 */

const PORT = Number(process.env.PORT ?? 8082);
const DATA_DIR = process.env.DIRA_DATA_DIR ?? '.dira-runtime';

const server = createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/healthz') {
    res.writeHead(200).end('ok');
    return;
  }
  if (req.method === 'GET' && req.url === '/ledger') {
    const ledger = await ActionLedger.open(new FileLedgerStore(`${DATA_DIR}/ledger.json`));
    res
      .writeHead(200, { 'content-type': 'application/json' })
      .end(JSON.stringify(ledger.all(), null, 2));
    return;
  }
  res.writeHead(404).end();
});

server.listen(PORT, () => console.log(`dira-executor listening on :${PORT}`));
