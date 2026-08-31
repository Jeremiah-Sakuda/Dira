# Production evidence

Captured from the deployed Google Cloud backend on 2026-08-16
(project `dira-agentic-2026`, Cloud Run service `dira-orchestrator`,
region us-central1, Vertex location global).

| Artifact | What it proves |
| --- | --- |
| [`production-run.json`](production-run.json) | One complete production workflow: **Gemini 3.5 Flash on Vertex AI** (`vertexai: true`, latency recorded) interprets the professor email; slack derived +4.1h → −3.6h → +1.3h; a real 409 from the controlled recruiter surface is observed and replanned; **10 external mutations verified across 4 systems** — the Calendar ones against a **real Google Calendar** via independent API re-reads; RESOLVED with 0 user interventions. |
| [`gemini-live-eval.json`](gemini-live-eval.json) | The PRD §40 email corpus run against **live Gemini on Vertex** (not fixtures): **8/8** — explicit/conversational/multi-date extractions with exact ISO timestamps, ambiguous emails safely held, prompt-injection ignored, forged-sender mutation blocked by the deterministic authority gate. Per-case latency and confidence included. |
| [`production-10x.json`](production-10x.json) | **10 consecutive production runs** (PRD §44 bar): every run RESOLVED at +78 min with 10 verified mutations and the injected failure recovered; per-run Gemini latency 6.2–8.5s. |

Reproduce (needs `gcloud` auth on the project):

```bash
TOKEN=$(gcloud secrets versions access latest --secret dira-demo-token --project dira-agentic-2026)
URL=$(gcloud run services describe dira-orchestrator --project dira-agentic-2026 \
  --region us-central1 --format 'value(status.url)')
curl -X POST "$URL/demo/reset"   -H "x-dira-demo-token: $TOKEN" -d '{}'
curl -X POST "$URL/demo/trigger" -H "x-dira-demo-token: $TOKEN"
curl        "$URL/eval/gemini"   -H "x-dira-demo-token: $TOKEN"
```

**Why 10 verified mutations here vs 13 in the deterministic replay:** the
count is whatever plan the solver derives for the world it finds. Both modes
book the interview, mirror it to the calendar, delegate QA, notify the
backup, move two personal blocks, and rebuild the study plan; the modes
differ only in how many invalidated study reservations exist to delete and
how many rebuilt blocks the placement produces. Both clear the PRD's ≥4 bar
across ≥2 systems, and every counted mutation passed an independent
verification read.

The deterministic evidence (CI `golden-replay-20x`, 77 local tests, 8-way
variation matrix) lives in the repository and requires no credentials.
