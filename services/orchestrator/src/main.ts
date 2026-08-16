import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { FileLedgerStore } from '@dira/action-ledger/file-store';
import { buildReplayRuntime, computeRunMetrics } from '@dira/agent';
import { FileWorkflowStore } from '@dira/agent/file-stores';
import { RawEmailEventSchema } from '@dira/event-schema';
import { buildGoldenFixture, type GoldenVariation } from '@dira/fixtures/golden';

/**
 * dira-orchestrator — the single Cloud Run service hosting Dira's repair
 * loop (PRD §31). Deployed with REPLAY_MODE=production it runs the REAL
 * path: Vertex Gemini interpretation, Firestore ledger/state, Google
 * Calendar mutations, controlled recruiter/org integrations.
 *
 * Endpoints
 *   GET  /healthz            liveness
 *   GET  /status             seeded? calendar id, doc counts (production)
 *   POST /events             normalized RawEmailEvent (Pub/Sub push or webhook)
 *   POST /demo/reset         reseed the demo world (body: optional variation)
 *   POST /demo/trigger       inject the golden professor email
 *   GET  /runs/latest        latest workflow run + flight recording
 *   GET  /eval/gemini        run the model-eval corpus against live Gemini
 *
 * The demo deployment pins max-instances=1; multi-worker safety is provided
 * by the Firestore ledger's transactional claims when that cap is lifted.
 */

const PORT = Number(process.env.PORT ?? 8081);
const MODE =
  process.env.REPLAY_MODE === 'production'
    ? 'production'
    : process.env.REPLAY_MODE === 'live-model'
      ? 'live-model'
      : 'deterministic';
const DATA_DIR = process.env.DIRA_DATA_DIR ?? '.dira-runtime';
const DEMO_TOKEN = process.env.DIRA_DEMO_TOKEN ?? '';
const ALLOWED_ORIGIN = process.env.DIRA_ALLOWED_ORIGIN ?? 'http://localhost:3000';

if (MODE === 'production' && !DEMO_TOKEN) {
  throw new Error('DIRA_DEMO_TOKEN is required in production mode');
}

function cors(req: IncomingMessage, res: ServerResponse): void {
  if (req.headers.origin === ALLOWED_ORIGIN) {
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'content-type, x-dira-demo-token');
}

function json(req: IncomingMessage, res: ServerResponse, code: number, body: unknown): void {
  cors(req, res);
  res.writeHead(code, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}

function authorized(req: IncomingMessage): boolean {
  if (MODE !== 'production') return true;
  const supplied = String(req.headers['x-dira-demo-token'] ?? '');
  if (!supplied || supplied.length !== DEMO_TOKEN.length) return false;
  return timingSafeEqual(Buffer.from(supplied), Buffer.from(DEMO_TOKEN));
}

function requireAuthorization(req: IncomingMessage, res: ServerResponse): boolean {
  if (authorized(req)) return true;
  json(req, res, 401, { error: 'unauthorized' });
  return false;
}

const readBody = (req: NodeJS.ReadableStream): Promise<string> =>
  new Promise((resolve) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => resolve(body));
  });

const safeJson = (s: string): unknown => {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
};

async function handleLocalEvent(raw: unknown) {
  const parsed = RawEmailEventSchema.parse(raw);
  const fixture = buildGoldenFixture();
  const runtime = await buildReplayRuntime(fixture, {
    mode: MODE === 'live-model' ? 'live-model' : 'deterministic',
    ledgerStore: new FileLedgerStore(`${DATA_DIR}/ledger.json`),
    workflowStore: new FileWorkflowStore(`${DATA_DIR}/workflows.json`),
  });
  const run = await runtime.orchestrator.handleEvent(parsed);
  return { run, metrics: computeRunMetrics(run, runtime.ledger), flight: runtime.recorder.all() };
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  try {
    if (req.method === 'OPTIONS') {
      cors(req, res);
      res.writeHead(204).end();
      return;
    }
    if (req.method === 'GET' && url.pathname === '/healthz') {
      json(req, res, 200, { ok: true, mode: MODE });
      return;
    }

    if (MODE === 'production') {
      const production = await import('./production.js');

      if (req.method === 'GET' && url.pathname === '/status') {
        json(req, res, 200, { mode: MODE, ...(await production.productionStatus()) });
        return;
      }
      if (req.method === 'POST' && url.pathname === '/demo/reset') {
        if (!requireAuthorization(req, res)) return;
        const body = (safeJson(await readBody(req)) ?? {}) as GoldenVariation;
        const seeded = await production.seedProduction(body);
        json(req, res, 200, { reseeded: true, ...seeded });
        return;
      }
      if (req.method === 'POST' && (url.pathname === '/events' || url.pathname === '/demo/trigger')) {
        if (!requireAuthorization(req, res)) return;
        let raw = safeJson(await readBody(req));
        if (url.pathname === '/demo/trigger') {
          // Controlled webhook: inject the golden professor email, optionally
          // varied (?examHour=13|14|15) — the runtime variable for the video.
          const examHour = Number(url.searchParams.get('examHour') ?? 14) as 13 | 14 | 15;
          raw = buildGoldenFixture({ examHour }).trigger;
        } else if ((raw as { message?: { data?: string } })?.message?.data) {
          // Pub/Sub push envelope
          raw = safeJson(
            Buffer.from((raw as { message: { data: string } }).message.data, 'base64').toString('utf8'),
          );
        }
        const trigger = RawEmailEventSchema.parse(raw);
        const result = await production.handleProductionEvent(trigger);
        console.log(
          JSON.stringify({
            severity: 'INFO',
            msg: 'workflow finished',
            run: result.run.id,
            status: result.run.status,
            gemini: result.gemini,
          }),
        );
        json(req, res, 200, result);
        return;
      }
      if (req.method === 'GET' && url.pathname === '/demo/stream') {
        if (!requireAuthorization(req, res)) return;
        const examHour = Number(url.searchParams.get('examHour') ?? 14) as 13 | 14 | 15;
        const trigger = buildGoldenFixture({ examHour }).trigger;
        cors(req, res);
        res.writeHead(200, {
          'content-type': 'text/event-stream',
          'cache-control': 'no-cache, no-transform',
          connection: 'keep-alive',
        });
        const send = (event: string, data: unknown) => {
          if (!res.writableEnded) res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
        };
        try {
          const result = await production.handleProductionEvent(trigger, (entry) => send('entry', entry));
          send('done', {
            status: result.run.status,
            slackBeforeMin: result.run.slackBeforeMin,
            slackAfterMutationMin: result.run.slackAfterMutationMin,
            slackFinalMin: result.run.slackFinalMin,
            failuresRecovered: result.run.failuresRecovered,
            userInterventions: result.run.userInterventions,
            runtime: 'production',
            gemini: result.gemini,
            calendarId: result.calendarId,
          });
        } catch (err) {
          send('error', { message: String(err) });
        } finally {
          res.end();
        }
        return;
      }
      if (req.method === 'GET' && url.pathname === '/runs/latest') {
        if (!requireAuthorization(req, res)) return;
        const latest = await production.latestProductionRun();
        if (!latest) {
          json(req, res, 404, { error: 'no runs yet' });
          return;
        }
        json(req, res, 200, latest);
        return;
      }
      if (req.method === 'GET' && url.pathname === '/eval/gemini') {
        if (!requireAuthorization(req, res)) return;
        const { runGeminiEval } = await import('./gemini-eval.js');
        json(req, res, 200, await runGeminiEval());
        return;
      }
    } else {
      if (req.method === 'GET' && url.pathname === '/status') {
        json(req, res, 200, { mode: MODE, seeded: true, local: true });
        return;
      }
      if (req.method === 'POST' && url.pathname === '/events') {
        const raw = safeJson(await readBody(req));
        json(req, res, 200, await handleLocalEvent(raw));
        return;
      }
    }

    json(req, res, 404, { error: 'not found' });
  } catch (err) {
    console.error(JSON.stringify({ severity: 'ERROR', msg: String(err) }));
    const code = err instanceof Error && err.name === 'EventAlreadyProcessingError' ? 409 : 500;
    json(req, res, code, { error: String(err) });
  }
});

server.listen(PORT, () => console.log(`dira-orchestrator listening on :${PORT} (mode: ${MODE})`));
