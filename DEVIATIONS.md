# Deviations from the PRD

Every place this implementation knowingly departs from the PRD, with the
reasoning. Everything not listed here follows the PRD as written.

## 1. Web deployment target: Vercel instead of Cloud Run (`dira-web`)

**PRD:** §32 deploys `dira-web` to Cloud Run alongside the four services.
**Built:** the dashboard is a Next.js app deployed with the Vercel CLI, per
the repo owner's explicit instruction. The four backend services keep their
Cloud Run shape (`services/*` + `infrastructure/cloud-run/Dockerfile` +
`deploy.sh`), so the PRD topology remains deployable when a GCP project is
provisioned.
**Why it's safe:** the dashboard is a visibility layer (PRD §3); nothing in
the repair loop depends on where it's hosted. The deployed demo runs the same
engine server-side in deterministic replay mode.

## 2. No live GCP deployment in this build (Pub/Sub, Firestore, Cloud Run, Vertex)

**PRD:** §32 production stack on Google Cloud.
**Built:** this environment has no GCP project or credentials, so the build
centers on what the PRD itself makes the evidentiary core: the credential-free
replay (§38), CI reliability evidence (§43), and deterministic engines.
Pub/Sub and Firestore are represented by in-memory/file equivalents behind
narrow interfaces (`LedgerStore`, `WorkflowStore`, event dedup by id), and the
infrastructure directory contains the real topology (topics, collections,
transactional boundaries, deploy script). Wiring Firestore/Pub/Sub in is an
adapter swap, not an engine change.
**Why it's safe:** PRD §33 already argues the storage layer is swappable; §38
requires the system to be fully reproducible with zero Google credentials —
that requirement is what this build proves end to end.

## 3. Google ADK is not integrated

**PRD:** §32 wants Google ADK as the orchestration layer with substantive
responsibility, "not a decorative wrapper."
**Built:** the orchestration loop is an explicit, deterministic, crash-
resumable state machine (`agents/dira/src/orchestrator.ts`). With no GCP
runtime available here, an ADK integration would have been exactly the
decorative wrapper the PRD forbids — untestable glue claiming credit.
The honest alternative was a first-class native loop with the same
responsibilities (tool registration via `ToolSet`, structured planning calls,
execution sequencing, recovery coordination). The ADK migration path is
documented in `docs/architecture/README.md`.
**Rules check:** the hackathon requires "at least one Google Agent Framework
(ADK, GenAI SDK, Antigravity SDK, or GenKit)" — Dira uses the **GenAI SDK**
(`@google/genai`), which satisfies the requirement without ADK.
**Optional before submission:** if ADK specifically is desired for judging
optics, port `DiraOrchestrator.repairLoop()` into an ADK agent with the
engine calls as tools — the seams (interpret / plan / execute / verify are
already discrete async calls) were designed for that port.

## 4. Gemini runs behind a mode switch, default deterministic

**PRD:** §8 Gemini interprets events; §39 defines deterministic / live-model /
production replay modes.
**Built:** exactly the §39 switch. `REPLAY_MODE=live-model` uses Gemini
(`@google/genai`, `GEMINI_API_KEY` or Vertex ADC) with strict schema
validation; the default mode uses stored interpretation fixtures so judges
and CI need zero credentials. The live path is implemented but was not
exercised in this environment (no API key present).

## 5. PRD §17 per-path slack figures treated as illustrative

**PRD:** §17 lists intermediate path slacks (interview buffer +6.0h,
sponsor +5.4h, Plan A −0.8h, …).
**Built:** the three headline Global Slack figures are reproduced *exactly*
(+4.1h → −3.6h → +1.3h, and §18's −216 minutes), derived by the solver from
the fixture calendar — not asserted. Sub-path values are whatever the solver
computes (e.g. buffer slack −1.0h post-mutation matches §17; the illustrative
+6.0h/"Plan A −0.8h" figures do not arise from any consistent calendar that
also yields the three headline numbers, so the derived values win). The full
derivation is in `docs/algorithms/global-slack.md`.

## 6. Two engine constants the PRD doesn't specify

- `sessionOverheadMin = 6`: each distinct work session costs 6 minutes of
  context switching. Makes capacity math honest (ten scattered 10-minute gaps
  are not 100 usable minutes) and is part of the calendar arithmetic that
  reproduces the PRD's exact slack numbers.
- `repairSlackMarginMin = 60`: a repair must restore ≥1h of margin on the most
  constrained *capacity* path. Prevents the planner from "repairing" onto a
  knife edge (a cheaper plan reaching +0.3h exists in the golden state and is
  correctly rejected). Buffer constraints satisfied at exactly their required
  length are fully satisfied and don't trip the margin.

Both are configurable and unit-tested (PRD §20 "weights should be
configurable and unit-tested" extended to these).

## 7. Exam duration fixed at 60 minutes

The PRD never states the exam's duration. 60 minutes makes the post-mutation
buffer arithmetic produce §17's −1.0h (interview 17:00 − exam end 15:00 = 2h
against a 3h buffer).

## 8. Visual QA modeled as a windowed task with a delegation forcing function

**PRD:** §5.1 lists visual QA as delegatable with Maya as backup, and the
golden flow delegates it.
**Built:** QA must happen between sponsor-assets arrival (Wed 14:00) and deck
freeze (Wed 16:00) — stored as MUST_FOLLOW/MUST_PRECEDE edges. With the exam
at Wed 14:00–15:00 the user cannot fit the 1h session in the remaining
window, so delegation is *forced by state*, not scripted. In the exam-at-1-PM
variation the window survives and Dira correctly does **not** delegate —
which is the §7 "derive the repair from current state" requirement doing its
job.

## 9. Candidate-plan counts differ from the PRD's example log

**PRD:** §35 shows "3 candidate repairs evaluated"; §19 sketches Plans A/B/C.
**Built:** the planner enumerates donor subsets, slot alternatives, and a
policy-violating deadline-deferral exhibit — 6 candidates in round one of the
default run (A-equivalent, B-equivalent, and four capacity variants). The
flight recorder reports the real count. The PRD's A/B/C structure is
recognizable in the candidate table (minimal → deferral → full repair).

## 10. Secondary-trigger slot choice is cost/slack-derived, not scripted

The recruiter-withdrawal workflow (§37) offers Tue 4 PM and Fri 10 AM. Fri
10 AM overlaps a Friday-morning study window and would burn 60+ minutes of
pre-exam capacity, so the engine books Tue 4 PM. The Friday option appears in
the candidate table as evaluated-and-outranked.

## 11. Demo video not recorded

Recording requires a human presenter. `docs/demo/video-script.md` contains
the full §51 script adapted to this build, with shot list and timings, plus
the §50 runtime budget.

## 12. `dira-executor` / `dira-verifier` run in-process in this build

**PRD:** §31 draws executor and verifier as separate services.
**Built:** the execute and verify stages are discrete, ledger-mediated steps
inside the orchestrator process; the standalone services exist as scaffolds
exposing the ledger/audit surface. Splitting them onto Pub/Sub work queues is
a deployment change (the ledger state machine — claim, EXECUTED_UNVERIFIED,
independent verify, VERIFIED — is already the coordination protocol, and the
crash-resume chaos test proves another worker can pick up mid-flight state).
For hackathon scale, one process with a durable outbox is more reliable than
four processes and a queue — and reliability is the judged property (§61).
