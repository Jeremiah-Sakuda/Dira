# Architecture

## The loop (PRD §4)

```
external event → interpret (Gemini, schema-gated) → mutate graph →
propagate (typed edges) → feasibility (deterministic solver) →
  feasible? RESOLVED
  else: generate candidates → validate → rank (explicit cost) →
        policy gate → persist intents (durable ledger) →
        execute (scoped adapters) → verify (independent reads) →
        recompute → RESOLVED | replan | WAITING_REVIEW
```

The loop lives in `agents/dira/src/orchestrator.ts` as an explicit,
crash-resumable state machine. Internal state is updated **only after
verification** — the world model can never believe an unverified mutation.

## Separation of authority

| Layer | May | May never |
| --- | --- | --- |
| Gemini (interpreter, live modes) | classify, extract mutations, resolve entities, propose plan sketches | do time arithmetic, compute slack, authorize actions, invent feasibility |
| Propagation engine | walk typed edges, emit impact records | mutate state |
| Constraint engine | compute capacity/slack/violations, validate plans | call tools |
| Planner | enumerate candidate repairs from state | bypass validation or policy |
| Policy engine | ALLOW / ALLOW_AND_NOTIFY / REQUIRE_APPROVAL / DENY | be overridden by content |
| Ledger + executor | persist intents, execute idempotently | mark VERIFIED |
| Verifier | re-read external systems, reconcile the ledger | trust tool responses |

## Durability model

- **Action ledger** (outbox): every intent persisted before execution with an
  idempotency key `workflow:type:target:desired_state`. Lifecycle
  `PLANNED → AUTHORIZED → PENDING_EXECUTION → EXECUTING →
  EXECUTED_UNVERIFIED → VERIFIED`, failure branches
  `FAILED_TRANSIENT (bounded retry) / FAILED_PERMANENT → REPLAN_REQUIRED /
  STALE (revivable only through re-authorization)`.
- **Workflow store**: run status, mutation, impacts, candidate records,
  counters. A fresh worker rehydrates: initial state + persisted mutation +
  all VERIFIED actions, reconciles in-flight actions by *reading the external
  system*, then continues. Proven by the crash-resume chaos test.

## Production topology (PRD §31–§32)

Cloud Run services `dira-ingestor / orchestrator / executor / verifier`
(shared Dockerfile in `infrastructure/cloud-run/`), Pub/Sub topics
(`infrastructure/pubsub/topics.sh`), Firestore collections and transactional
boundaries (`infrastructure/firestore/collections.md`), Secret Manager for
OAuth/Gemini keys. In this build the execute/verify stages run in-process
behind the same ledger protocol, and the dashboard deploys to Vercel — both
logged in `DEVIATIONS.md`.

## Google ADK migration path

The loop's stages are discrete async calls, which is exactly the shape an ADK
agent wants: register the four adapters as ADK tools, expose
`interpretEmail`, `generateCandidatePlans` + `validatePlan`, and the ledger
executor as tool-backed steps, and let the ADK agent own sequencing while the
deterministic engines keep their authority. See DEVIATIONS.md #3 for why this
build ships a native loop instead of an untestable wrapper.

## Replay modes (PRD §39)

| Mode | Interpretation | Tools | Use |
| --- | --- | --- | --- |
| `deterministic` | stored fixtures | local adapters | CI, judges, zero credentials |
| `live-model` | Gemini | local adapters | model-level integration testing |
| `production` | Gemini via Vertex | Google APIs + controlled endpoints | cloud demo |
