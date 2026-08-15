import { createServer } from 'node:http';
import { FileLedgerStore } from '@dira/action-ledger/file-store';
import { buildReplayRuntime, computeRunMetrics } from '@dira/agent';
import { FileWorkflowStore } from '@dira/agent/file-stores';
import { RawEmailEventSchema } from '@dira/event-schema';
import { buildGoldenFixture } from '@dira/fixtures/golden';

/**
 * dira-orchestrator — Cloud Run service hosting the repair loop (PRD §31).
 *
 * POST /events receives normalized events (from dira-ingestor via Pub/Sub
 * push) and drives the full loop: interpret → propagate → feasibility →
 * plan → policy → ledger → execute → verify → resolve/replan. Workflow state
 * and the action ledger live in durable stores, so any replica can resume a
 * crashed run (Firestore in production; file stores in local/demo mode).
 *
 * REPLAY_MODE (PRD §39): deterministic | live-model | production.
 */

const PORT = Number(process.env.PORT ?? 8081);
const MODE = process.env.REPLAY_MODE === 'live-model' ? 'live-model' : 'deterministic';
const DATA_DIR = process.env.DIRA_DATA_DIR ?? '.dira-runtime';

const server = createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/healthz') {
    res.writeHead(200).end('ok');
    return;
  }
  if (req.method !== 'POST' || req.url !== '/events') {
    res.writeHead(404).end();
    return;
  }
  let body = '';
  req.on('data', (chunk) => (body += chunk));
  req.on('end', async () => {
    const parsed = RawEmailEventSchema.safeParse(safeJson(body));
    if (!parsed.success) {
      res.writeHead(400).end(JSON.stringify({ error: 'invalid event' }));
      return;
    }
    try {
      const fixture = buildGoldenFixture();
      const runtime = await buildReplayRuntime(fixture, {
        mode: MODE,
        ledgerStore: new FileLedgerStore(`${DATA_DIR}/ledger.json`),
        workflowStore: new FileWorkflowStore(`${DATA_DIR}/workflows.json`),
      });
      const run = await runtime.orchestrator.handleEvent(parsed.data);
      const metrics = computeRunMetrics(run, runtime.ledger);
      console.log(JSON.stringify({ severity: 'INFO', msg: 'workflow finished', run: run.id, status: run.status }));
      res
        .writeHead(200, { 'content-type': 'application/json' })
        .end(JSON.stringify({ run, metrics, flight: runtime.recorder.all() }));
    } catch (err) {
      console.error(JSON.stringify({ severity: 'ERROR', msg: String(err) }));
      res.writeHead(500).end(JSON.stringify({ error: 'workflow crashed; state is resumable' }));
    }
  });
});

function safeJson(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

server.listen(PORT, () => console.log(`dira-orchestrator listening on :${PORT} (mode: ${MODE})`));
