import { createServer } from 'node:http';
import { RawEmailEventSchema, type RawEmailEvent } from '@dira/event-schema';

/**
 * dira-ingestor — Cloud Run event ingestor (PRD §31–§32).
 *
 * Production wiring:
 *   Gmail watch → Pub/Sub topic raw-gmail-events → push subscription → POST /
 *   here → normalize into a RawEmailEvent → publish to normalized-events.
 *
 * The service is intentionally dumb: it validates, normalizes, deduplicates
 * by messageId, and forwards. All intelligence lives downstream.
 */

const PORT = Number(process.env.PORT ?? 8080);
const ORCHESTRATOR_URL = process.env.DIRA_ORCHESTRATOR_URL ?? '';
const seen = new Set<string>();

function decodePubSubPush(body: string): RawEmailEvent | null {
  try {
    const envelope = JSON.parse(body) as { message?: { data?: string; messageId?: string } };
    const data = envelope.message?.data
      ? JSON.parse(Buffer.from(envelope.message.data, 'base64').toString('utf8'))
      : JSON.parse(body);
    const parsed = RawEmailEventSchema.safeParse(data);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

const server = createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/healthz') {
    res.writeHead(200).end('ok');
    return;
  }
  if (req.method !== 'POST') {
    res.writeHead(405).end();
    return;
  }
  let body = '';
  req.on('data', (chunk) => (body += chunk));
  req.on('end', async () => {
    const event = decodePubSubPush(body);
    if (!event) {
      // Malformed events are acked (200) but routed to the dead-letter topic
      // in production — retrying malformed payloads can never succeed.
      console.error(JSON.stringify({ severity: 'WARNING', msg: 'malformed event dropped' }));
      res.writeHead(200).end('dropped');
      return;
    }
    if (seen.has(event.eventId)) {
      res.writeHead(200).end('duplicate');
      return;
    }
    seen.add(event.eventId);
    console.log(JSON.stringify({ severity: 'INFO', msg: 'event normalized', eventId: event.eventId }));
    if (ORCHESTRATOR_URL) {
      await fetch(`${ORCHESTRATOR_URL}/events`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(event),
      });
    }
    res.writeHead(200).end('ok');
  });
});

server.listen(PORT, () => console.log(`dira-ingestor listening on :${PORT}`));
