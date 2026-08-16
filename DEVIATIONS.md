# Deviations and evidence boundaries

This file records every deliberate departure from the product specification
and every boundary that matters to a judge. It distinguishes implemented
production code from deployment evidence; neither code nor prose treats a
planned connector as a completed integration.

## 1. Dashboard hosting: Vercel instead of Cloud Run

The PRD places `dira-web` on Cloud Run. The dashboard is a Next.js app hosted
on Vercel. It is a visibility and control surface, not part of the repair
authority. In production it proxies requests server-to-server to Cloud Run so
the demo token never reaches the browser.

## 2. Google Cloud deployment — live since 2026-08-16

The production runtime is implemented **and deployed**: project
`dira-agentic-2026`, Cloud Run service `dira-orchestrator` (us-central1,
dedicated service account, max-instances 1), Vertex AI Gemini 3.5 Flash via
the global endpoint, Firestore state/ledger, and a real service-account-owned
Google Calendar shared to the demo account. Captured evidence lives in
[docs/evidence/](docs/evidence/): one full production run, an 8/8 live Gemini
corpus evaluation, and 10/10 consecutive production runs each recovering the
injected 409. `infrastructure/cloud-run/provision.sh` and `deploy.sh` are the
exact provisioning/deployment path used.

The runtime boundary stays visible in the product: the replay is labeled
`LIVE CLOUD` only after the server can reach the configured Cloud Run status
endpoint. Otherwise it says `DETERMINISTIC EVIDENCE` or `CLOUD UNAVAILABLE`.
Remaining gap: Pub/Sub topics are scripted but the exercised trigger is the
token-protected webhook (`/events` accepts the Pub/Sub push envelope, so a
subscription is configuration, not code).

## 3. Google ADK is not used

The rules accept Google ADK, GenAI SDK, Antigravity SDK, or GenKit. Dira uses
the Google GenAI SDK. The orchestration loop is a native, deterministic,
crash-resumable state machine. Wrapping that loop in ADK without moving real
responsibility would be decorative; the system instead exposes explicit
interpret, plan, execute, and verify stages that can become ADK tools later.

## 4. Deterministic mode is the public fallback

`REPLAY_MODE=deterministic` uses stored interpretation and stateful
integration simulators, allowing judges and CI to reproduce the engine with
zero credentials. `live-model` uses Gemini with local tools. `production`
uses Vertex AI, Firestore, Google Calendar, and controlled integration
surfaces. The UI and documentation do not call deterministic adapter actions
real external mutations.

## 5. Google Calendar is real; Gmail delivery is controlled

Production creates and manages a service-account-owned Google Calendar,
stores Dira IDs in private extended properties, and verifies every change by
fresh API reads. Recruiter slots/bookings and organization assignments are
Firestore-backed controlled integrations, allowed by the hackathon's mock
integration rule and mutable from the Cloud console.

Consumer Gmail sending from a service account is not claimed. Notifications
are persisted to a Firestore `outbound_messages` collection for inspection
and downstream delivery. Inbox provenance used by the workflow is seeded in
Firestore. A Gmail OAuth or Workspace domain-wide-delegation connector is a
future integration.

## 6. One Cloud Run service, not four empty microservices

The PRD sketches ingestor, orchestrator, executor, and verifier services. The
deployed design uses one `dira-orchestrator` service. Those stages remain
separate code paths behind the durable action ledger, but run in one process
for the demo. The earlier empty service scaffolds were removed. Pub/Sub push
envelopes are accepted by `/events`, while direct authenticated demo triggers
are the exercised path.

## 7. PRD per-path slack numbers are illustrative

The headline trajectory is derived exactly by the solver: +4.1h before the
mutation, −3.6h after, and +1.3h after repair. Some intermediate examples in
the PRD cannot coexist with that same calendar. The implemented solver's
derived values win; `docs/algorithms/global-slack.md` gives the derivation.

## 8. Two explicit solver constants

- `sessionOverheadMin = 6`: each distinct work session pays six minutes of
  context switching.
- `repairSlackMarginMin = 60`: a capacity repair must restore at least one
  hour of margin rather than finish on a knife edge.

Both are configurable and unit-tested.

## 9. Exam duration is 60 minutes

The PRD does not give an exam duration. Sixty minutes produces the specified
post-mutation recovery-buffer violation and is stored as fixture data.

## 10. Visual QA has a window that forces delegation

Sponsor-deck QA must occur after assets arrive and before the deck freezes.
When the exam moves into that window, the owner cannot complete it; a stored
`DELEGATABLE_TO` edge authorizes the backup. In the earlier-exam variation,
the window survives and delegation correctly disappears.

## 11. Candidate counts come from state

The default first round has six generated candidates rather than the PRD log's
three illustrative candidates. The planner enumerates current recruiter
slots, donor subsets, delegation options, and one deliberately policy-invalid
deadline deferral. The flight recorder reports the actual count.

## 12. Video, article, and social proof need human publication

The repository contains a recording script, technical article draft, and
social copy. They are not called published. Record only after the dashboard
shows `LIVE CLOUD`, the real Calendar mutation is visible, and the Gemini
evaluation passes. Publication and Devpost entry submission remain human
account actions.

## 13. Scope limits

The fixture is one synthetic user, one week, and one timezone. Long-horizon,
multi-user negotiation, LMS ingestion, Gmail OAuth delivery, and production
third-party recruiter/org connectors are later work. The implemented safety
and recovery properties are intentionally deeper than that integration
breadth.
