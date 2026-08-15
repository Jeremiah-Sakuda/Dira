# Dira

**Dira continuously detects changes to your commitments, propagates their
consequences across your life, and autonomously takes the actions required to
make your plans feasible again.**

*One thing changes. Everything adapts.*

[![ci](https://github.com/Jeremiah-Sakuda/Dira/actions/workflows/ci.yml/badge.svg)](https://github.com/Jeremiah-Sakuda/Dira/actions/workflows/ci.yml)

---

## The problem

Every calendar assumes the future stays still. It doesn't. Exams move,
interviews change, deadlines compress, responsibilities collide. The hard part
of being a student balancing classes, recruiting, and organizations isn't
remembering what you have to do — it's figuring out **what everything else
breaks when one commitment changes**. Today's tools surface the conflict.
They don't repair it.

Dira models commitments, not tasks: outcomes with time requirements,
dependencies, stakeholders, flexibility, delegatability, and policies
governing what an agent may do about them — stored as a typed graph. When the
outside world moves, Dira repairs the graph.

## The 48-Hour Shock

The canonical workflow. A professor emails: *Midterm 2 moves from Friday 2 PM
to Wednesday 2 PM.* No one prompts Dira. It then, autonomously:

1. **detects** the email and extracts a structured mutation (Gemini, strict schemas)
2. **propagates** consequences over typed edges — 6 commitments affected
3. **computes** feasibility: Global Slack +4.1h → **−3.6h**, three violations
4. **plans** 6 candidate repairs; deterministic validation + explicit cost function
5. **acts**: books the recruiter-approved Thu 10 AM slot → **409, slot gone**
6. **observes** refreshed availability, **replans**, books Thu 1 PM → verified
7. **delegates** sponsor-deck QA to the designated backup (and tells her why)
8. **reclaims** two personal blocks, **rebuilds** the study plan on the calendar
9. **verifies** every mutation against external state, recomputes: **+1.3h, RESOLVED**

Zero user interventions. One injected failure, recovered. Four external
systems mutated and independently verified.

```
13:30:05  FEASIBILITY  Global slack +4.1h → -3.6h; 3 violation(s)
13:30:06  PLAN         6 candidate repair(s) evaluated
13:31:01  ACTION       Book "TechCorp technical interview" at Thu 10:00
13:31:02  ERROR        409 SLOT_NO_LONGER_AVAILABLE
13:31:17  OBSERVE      External state refreshed after failure
13:31:18  REPLAN       Re-evaluating remaining repair options
13:31:44  ACTION       Book "TechCorp technical interview" at Thu 13:00
13:31:46  VERIFY       Verified: Book "TechCorp technical interview"
13:33:08  RESOLVED     Feasibility restored — global slack +1.3h
```

## Run it yourself — no credentials, one command

```bash
npm install
make demo-replay        # the full 48-Hour Shock, injected 409 included → 18/18 assertions
make demo-variations    # 8 runtime variations, each repair derived from state
make replay-20x         # reliability evidence: 20/20 consecutive passes
make test               # unit + integration + property + chaos suites
```

## What makes Dira different

- **It repairs, it doesn't remind.** The deliverable is restored feasibility,
  not a notification.
- **The model proposes; deterministic code disposes.** Gemini does semantic
  interpretation and entity resolution. Time arithmetic, slack, constraint
  checks, policy, and feasibility are deterministic and property-tested. A
  model output can never authorize an action.
- **Actions need provenance.** An interview can move to Thu 1 PM because a
  stored recruiter message offers it; QA can go to Maya because a
  DELEGATABLE_TO edge says so. No provenance → DENY, unconditionally.
- **External truth wins.** Every mutation is verified by re-reading the
  external system. Tool success responses are never trusted alone.
- **It survives skepticism by construction:** runtime variation, randomized
  property tests, chaos tests, crash-resume, and one-command replay.

## Architecture

```
Gmail / Calendar events
        │
     Pub/Sub ──► dira-ingestor (normalize, dedup)
        │
        ▼
 dira-orchestrator ──► Gemini (Vertex AI): interpret → strict schema gate
        │
        ├── propagation engine  (typed edges → impact records)
        ├── constraint engine   (capacity, buffers, windows → Global Slack)
        ├── planner             (candidate repairs from state)
        ├── policy engine       (ALLOW / ALLOW_AND_NOTIFY / REQUIRE_APPROVAL / DENY)
        ├── action ledger       (durable outbox, idempotency keys)
        ├── executor            (scoped tool adapters, retry taxonomy)
        └── verifier            (independent external reads → VERIFIED)
        │
     Firestore (commitments, edges, workflow runs, ledger, audit)
```

Monorepo map: engines in [`packages/`](packages), the agent loop in
[`agents/dira`](agents/dira), scoped tool adapters in [`adapters/`](adapters),
Cloud Run services in [`services/`](services), the golden fixture in
[`fixtures/`](fixtures), the dashboard in [`apps/web`](apps/web).

## The commitment model & graph

A `Commitment` carries schedule/effort fields, flexibility
(`FIXED | MOVE_WITHIN_WINDOW | FLEXIBLE | DELEGATABLE | OPTIONAL`),
criticality, ownership, and provenance. Typed edges are stored data the
engines execute: `REQUIRES_PREPARATION` derives prep deadlines,
`REQUIRES_BUFFER` carries the 3h post-exam recovery constraint,
`MUST_FOLLOW`/`MUST_PRECEDE` bound execution windows, `DELEGATABLE_TO` bounds
who a planner may propose, `SHARES_RESOURCE_WITH` links capacity competitors.

## Consequence propagation

A deterministic BFS from the mutated node over relevant typed edges. Each
edge rule compares constraint status before/after (both computed by the
solver) and emits an inspectable impact record:

```json
{
  "source_commitment": "econ402-midterm-2",
  "affected_commitment": "technical-interview-1",
  "edge_type": "REQUIRES_BUFFER",
  "constraint": "180 min buffer (POST_EXAM_RECOVERY_BUFFER)",
  "previous_status": "NOT_APPLICABLE",
  "new_status": "VIOLATED"
}
```

Cycle-safe; risk propagates transitively through dependency chains (broken QA
→ deck freeze → sponsor presentation). Details: [`docs/algorithms/propagation.md`](docs/algorithms/propagation.md).

## Global Slack is a real number

Global Slack = the minimum safety margin across all capacity buckets
(cumulative earliest-deadline test: usable capacity before each deadline minus
required work due by it) and applicable buffer constraints. Aggregate free
time can never mask one impossible deadline. The +4.1h → −3.6h → +1.3h
trajectory is **derived** from the fixture calendar by the solver and pinned
by tests — including §18's exact −216 minutes. Full formalism and the
derivation: [`docs/algorithms/global-slack.md`](docs/algorithms/global-slack.md).

## The autonomous repair loop

Candidate plans are generated from state (violations, live slot availability,
movable blocks, delegation edges), validated deterministically, priced by an
explicit cost function (critical drop 10 000 · opportunity 2 000 · social 500
· major move 100 · minor move 25 · action 5), policy-gated, persisted to a
durable action ledger with idempotency keys, executed through narrow
adapters, and independently verified before the internal world model is
allowed to believe them.

## Failure recovery

The taxonomy from PRD §28, exercised by chaos tests: transient 500s retry
with bounded backoff; permanent 409s invalidate the option and force a
replan against refreshed external state; malformed model output is rejected
by schema and retried; low confidence stops safely in WAITING_REVIEW;
verification mismatches never corrupt internal state; a killed process is
resumed by a fresh worker from the ledger without duplicating a single
external mutation.

## Security & policy boundaries

Emails are untrusted input. Interpretation is schema-gated; entity resolution
is structural; a **sender-authority check** means a random address cannot
mutate your interview no matter how well-formed the extraction; policy and
provenance gates run after all of that. Prompt-injection fixtures are part of
the eval corpus. More: [`docs/security/README.md`](docs/security/README.md).

## Local replay & modes

`REPLAY_MODE=deterministic` (default) — stored interpretation fixtures, local
adapters, zero credentials. `REPLAY_MODE=live-model` — Gemini interprets
(`GEMINI_API_KEY`), tools stay local. `REPLAY_MODE=production` — real Google
services (Cloud Run topology in [`infrastructure/`](infrastructure)).

## Testing & reliability evidence

- 64 tests: unit, integration, **property-based invariants over randomized
  graphs** (PRD §41 — monotonicity of slack, provenance completeness, policy
  soundness, ranking soundness), and chaos.
- `golden-replay-20x` CI job: 20 consecutive deterministic replays with the
  injected 409 → artifact published (`20/20 passed · 0 duplicate mutations ·
  0 policy violations · 20 failures recovered`).
- An 8-way runtime-variation matrix (exam time, slot outages, block
  durations, backup owner, prior progress, pre-trigger calendar shifts) —
  every repair derived, not replayed. Notably: with the exam at 1 PM the
  buffer holds and Dira correctly *doesn't* touch the interview.

## Google technologies

Gemini (`@google/genai`, Vertex-ready) for interpretation in live/production
modes; Cloud Run service topology with Dockerfile and deploy script; Pub/Sub
topic design; Firestore data model and transactional outbox. The dashboard
deploys via Vercel in this build — see
[`DEVIATIONS.md`](DEVIATIONS.md) for every knowing departure from the PRD and
its justification.

## Setup

```bash
git clone https://github.com/Jeremiah-Sakuda/Dira && cd Dira
npm install            # Node ≥ 20
make demo-replay       # credential-free golden workflow
npm --workspace apps/web run dev   # dashboard on :3000
```

## Known limitations

- Live Gemini and GCP deployment paths are implemented but not exercised in
  this environment (no credentials); the replay/CI evidence is the
  reproducible core.
- Recruiter scheduling and the org task tracker are controlled test doubles
  (PRD §46), clearly labeled — not claimed third-party integrations.
- One user, one week horizon, single-timezone fixture. Multi-user and
  long-horizon planning are P2.

## Hackathon disclosure

Built for the Google All Things Agentic Hackathon (Taskmaster track).
Synthetic identities throughout (Prof. Elena Chen, recruiter Jordan Lee,
teammate Maya Okafor). Deviations from the product spec are logged with
justifications in [`DEVIATIONS.md`](DEVIATIONS.md).

## Design notes

The strongest version of Dira is not the one with the most features — it's
the one that survives skepticism. *Was that scripted?* Run the variation
matrix. *Is the feasibility number real?* Read the solver and its property
tests. *What if the tool lies or the process dies?* Read the ledger, the
verifier, and the crash-resume chaos test. *Can I run it?* One command, no
credentials.
