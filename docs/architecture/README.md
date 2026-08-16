# Architecture

![Dira production architecture](./dira-production.svg)

The diagram is deliberately evidentiary: solid lines are implemented code
paths; the dashed Pub/Sub connector is optional deployment infrastructure.
Blue boxes are Google-managed production components. Amber boxes are
Firestore-backed controlled integration surfaces and are never presented as
third-party APIs.

## The repair loop

```text
external event → interpret (Gemini, schema-gated) → mutate graph →
propagate (typed edges) → feasibility (deterministic solver) →
  feasible? RESOLVED
  else: generate candidates → simulate + validate → rank → policy gate →
        persist intent → execute → independently re-read → verify →
        recompute → RESOLVED | replan | WAITING_REVIEW
```

The loop lives in `agents/dira/src/orchestrator.ts` as an explicit,
crash-resumable state machine. Internal state is updated only after
verification, so the world model cannot believe an unverified mutation.

## Separation of authority

| Layer | May | May never |
| --- | --- | --- |
| Gemini on Vertex AI | classify, extract mutations, resolve entities | calculate slack, authorize tools, declare feasibility |
| Propagation engine | walk typed edges, emit impact records | mutate external state |
| Constraint engine | compute capacity, slack, and violations | call tools |
| Planner | enumerate repairs from current state | bypass simulation, policy, or provenance |
| Policy engine | ALLOW / ALLOW_AND_NOTIFY / REQUIRE_APPROVAL / DENY | be overridden by event content |
| Ledger + executor | persist and idempotently execute authorized intents | mark an action VERIFIED |
| Verifier | re-read external systems and reconcile | trust an optimistic tool response |

## Honest production topology

Dira deploys one Cloud Run service, `dira-orchestrator`. Interpretation,
propagation, constraint solving, planning, policy, execution, and verification
are separate stages inside that service, coordinated by a transactional
Firestore ledger. A single service makes the deployed boundary inspectable
and avoids claiming empty microservices. `max-instances=1` is used for the
hackathon demo; Firestore transactional claims are the multi-worker safety
boundary.

The production mode uses:

- Gemini via the Google GenAI SDK configured for Vertex AI and application
  default credentials;
- Firestore for commitments, edges, normalized-event deduplication, workflow
  snapshots, flight recordings, controlled integrations, and the action
  ledger;
- a real service-account-managed Google Calendar, with Dira provenance in
  private extended properties and fresh reads for verification;
- Firestore-backed recruiter availability/booking and organization-task
  surfaces that can be changed from the Cloud console during the demo; and
- a Firestore outbound-message record. Consumer Gmail sending is not claimed.

The Vercel dashboard calls Cloud Run through a same-origin Next.js route. The
demo token remains server-only. Mutating endpoints compare that token in
constant time; Cloud Run CORS is restricted to the configured dashboard
origin. Health and status endpoints expose no credential.

## Durability model

- **Action ledger:** every intent is persisted before execution under an
  idempotency key `workflow:type:target:desired_state`. Its lifecycle is
  `PLANNED → AUTHORIZED → PENDING_EXECUTION → EXECUTING →
  EXECUTED_UNVERIFIED → VERIFIED`, with retry/replan/stale branches.
- **Transactional claim:** Firestore compare-and-set means two workers cannot
  claim the same pending action.
- **Workflow store:** every run snapshot carries an update timestamp. A fresh
  worker rehydrates state, reconciles in-flight actions by reading the target
  system, and continues. The local chaos suite kills a run between external
  success and verification and proves no duplicate mutation occurs.
- **Event deduplication:** normalized events are keyed by event ID before the
  repair loop starts.

## Replay modes

| Mode | Interpretation | State and tools | Evidence claim |
| --- | --- | --- | --- |
| `deterministic` | stored interpretation | in-memory/file, stateful simulators | fully reproducible engine evidence; no live Google side effects |
| `live-model` | Gemini Developer API or Vertex | local simulators | live semantic-model evaluation; no live Google side effects |
| `production` | Gemini on Vertex AI | Firestore + real Google Calendar + controlled Firestore surfaces | implemented production path; requires an authorized GCP deployment |

The dashboard asks `/api/runtime/status` which boundary is active and labels
every judge-controlled run as `LIVE CLOUD`, `DETERMINISTIC EVIDENCE`, or
`CLOUD UNAVAILABLE`.

## Google ADK decision

Dira uses the Google GenAI SDK, one of the hackathon's eligible Google agent
frameworks. The orchestration loop remains native because deterministic
authority, transactional recovery, and verification are the substance of the
agent. An ADK wrapper that merely re-called those stages would add no
behavior. The stages are discrete async functions and can be registered as
ADK tools later without moving feasibility or authorization into the model.
