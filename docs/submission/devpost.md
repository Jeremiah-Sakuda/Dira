# Devpost submission — Dira

**Track:** The Taskmaster
**Tagline:** One thing changes. Everything adapts.

## Inspiration

Every calendar assumes the future stays still. It doesn't. As a student
juggling classes, recruiting, and a student org, the failure mode was never
forgetting a task — it was one email moving one exam, and six other
commitments silently becoming impossible. Tools surface the conflict. Nothing
repairs it.

## What it does

Dira is an autonomous commitment-repair system. It watches for external
changes (a professor email, a recruiter withdrawal), maps them onto a typed
commitment graph, propagates the consequences, computes whether your plan is
still feasible — as a formal number, Global Slack — and then **acts**:
rebooks interviews within recruiter-approved options, delegates delegatable
work to designated backups, reclaims flexible time, rebuilds the study plan
on your calendar, survives failed bookings, verifies every external mutation
independently, and stops only when your week is feasible again. In the
canonical demo it turns a −3.6h-infeasible week into a +1.3h-feasible one
with zero human input, recovering from a live 409 on the way.

## How we built it

- **Gemini (GenAI SDK / Vertex-ready)** does semantic interpretation and
  entity resolution behind strict zod schemas — and *only* that. Time
  arithmetic, slack, policy, and feasibility are deterministic TypeScript.
- **Typed commitment graph** (REQUIRES_PREPARATION, REQUIRES_BUFFER,
  MUST_PRECEDE, DELEGATABLE_TO, SHARES_RESOURCE_WITH…) with a deterministic
  propagation engine emitting inspectable impact records.
- **Constraint engine**: cumulative earliest-deadline capacity buckets with
  session-overhead-honest capacity math; windowed-task placement; buffer and
  ordering checks. Global Slack = the minimum margin on the most constrained
  critical path.
- **Planner**: enumerates candidate repairs *from state* (live slot
  availability, movable blocks, delegation edges), validated deterministically
  and ranked by an explicit cost function.
- **Autonomy policy engine** (ALLOW / ALLOW_AND_NOTIFY / REQUIRE_APPROVAL /
  DENY) plus action provenance: no stored evidence, no execution.
- **Durable action ledger** (outbox pattern, idempotency keys) + independent
  **verifier**: tool success is never trusted; a crashed worker resumes
  without duplicating a single external mutation.
- **Cloud topology**: Cloud Run services (ingestor/orchestrator/executor/
  verifier), Pub/Sub topics, Firestore collections with transactional
  boundaries; ops-console dashboard with a live flight recorder.

## Challenges we ran into

Making the demo *unscriptable*. The fix was architectural: a fixture calendar
whose slack trajectory (+4.1h → −3.6h → +1.3h) is derived by the solver, an
8-way runtime-variation matrix where the repair set genuinely changes with
state (move the exam to 1 PM and Dira correctly leaves the interview alone),
and property-based tests over randomized commitment graphs.

## Accomplishments we're proud of

- 20/20 consecutive deterministic replays in CI, each recovering an injected
  409, with zero duplicate mutations and zero policy violations — published
  as a CI artifact.
- A crash-resume chaos test that kills the process *after* the recruiter
  confirms but *before* the ledger records VERIFIED — the classic distributed
  systems nightmare — and proves a fresh worker reconciles without
  double-booking.
- One-command, zero-credential reproduction: `make demo-replay`.

## What we learned

Autonomy is earned by the boring parts: idempotency keys, verification reads,
provenance chains, and margin rules. The LLM is the easy 10%; making its
output *safe to act on* is the product.

## What's next

Firestore/Pub/Sub production wiring end-to-end, LMS and recruiting-platform
integrations, a Gemma-based pre-execution risk classifier as a second
opinion ahead of the deterministic policy gate, and household/team
coordination.

## Built with

TypeScript · Gemini (GenAI SDK) · Cloud Run · Pub/Sub · Firestore ·
Next.js · Vercel · zod · fast-check · Vitest

## Links

- Repo: https://github.com/Jeremiah-Sakuda/Dira
- Live dashboard: (Vercel URL)
- Reliability evidence: CI `golden-replay-20x` artifact
