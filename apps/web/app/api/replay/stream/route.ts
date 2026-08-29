import { buildReplayRuntime, summarizeSurfaceChanges } from '@dira/agent';
import { buildGoldenFixture } from '@dira/fixtures/golden';
import { getDemoScenario } from '../../../../lib/demo-scenarios';

export const dynamic = 'force-dynamic';

/**
 * Server-side replay proxy. When the Cloud Run URL and demo token are
 * configured, the browser receives the real production stream without ever
 * seeing the credential. Otherwise it runs the same engine locally against
 * deterministic, stateful integration simulators.
 */
export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const paceMs = Math.min(1200, Math.max(0, Number(url.searchParams.get('pace') ?? 320)));
  const scenario = getDemoScenario(url.searchParams.get('scenario'));
  const cloudUrl = process.env.DIRA_CLOUD_RUN_URL?.replace(/\/$/, '');
  const demoToken = process.env.DIRA_DEMO_TOKEN;

  if (cloudUrl && demoToken) {
    // One request: the service reseeds inside its own serialized turn (and
    // narrates it), so a judge's run can never be wiped by another judge's
    // reset and there is no silent seeding gap before the stream starts.
    const variation = encodeURIComponent(JSON.stringify(scenario.variation));
    const upstream = await fetch(`${cloudUrl}/demo/stream?variation=${variation}`, {
      headers: { 'x-dira-demo-token': demoToken },
      cache: 'no-store',
    });
    if (!upstream.ok || !upstream.body) {
      return Response.json(
        { error: `Cloud replay failed (${upstream.status})` },
        { status: 502 },
      );
    }

    return new Response(upstream.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Dira-Runtime': 'production',
      },
    });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };
      const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

      try {
        const fixture = buildGoldenFixture(scenario.variation);
        const runtime = await buildReplayRuntime(fixture);
        const beforeState = structuredClone(fixture.state);
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
            statusReason: run.statusReason,
            workflowId: run.id,
            slackBeforeMin: run.slackBeforeMin,
            slackAfterMutationMin: run.slackAfterMutationMin,
            slackFinalMin: run.slackFinalMin,
            failuresRecovered: run.failuresRecovered,
            userInterventions: run.userInterventions,
            runtime: 'deterministic',
            changes: summarizeSurfaceChanges(beforeState, runtime.orchestrator.state),
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
      'X-Dira-Runtime': 'deterministic',
    },
  });
}
