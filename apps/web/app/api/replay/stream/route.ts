import { buildReplayRuntime } from '@dira/agent';
import { buildGoldenFixture } from '@dira/fixtures/golden';

export const dynamic = 'force-dynamic';

/**
 * Live replay stream: executes a fresh golden workflow run in this process
 * and streams each flight-recorder entry as a server-sent event. What the
 * client watches is a real engine execution, paced for the human eye.
 */
export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const paceMs = Math.min(1200, Math.max(0, Number(url.searchParams.get('pace') ?? 320)));

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };
      const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

      try {
        const fixture = buildGoldenFixture();
        const runtime = await buildReplayRuntime(fixture);
        const queue: unknown[] = [];
        runtime.recorder.onEntry((entry) => queue.push(entry));

        const runPromise = runtime.orchestrator.handleEvent(fixture.trigger);

        // Drain entries as they appear, paced. Track completion without
        // detaching the promise so a rejection is surfaced, not unhandled.
        let done = false;
        let runError: unknown = null;
        const tracked = runPromise
          .catch((err) => {
            runError = err;
            return null;
          })
          .finally(() => {
            done = true;
          });
        while (!done || queue.length > 0) {
          const next = queue.shift();
          if (next) {
            send('entry', next);
            await sleep(paceMs);
          } else {
            await sleep(20);
          }
        }
        const run = await tracked;
        if (!run || runError) {
          send('error', { message: String(runError ?? 'engine run failed') });
        } else {
          send('done', {
            status: run.status,
            slackBeforeMin: run.slackBeforeMin,
            slackAfterMutationMin: run.slackAfterMutationMin,
            slackFinalMin: run.slackFinalMin,
            failuresRecovered: run.failuresRecovered,
            userInterventions: run.userInterventions,
          });
        }
      } catch (err) {
        send('error', { message: String(err) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
