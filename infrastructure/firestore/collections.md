# Firestore layout (PRD §32–§33)

Dira's conceptual model is a graph; its storage does not need to be. Firestore
holds graph-node documents, typed edge documents, and durable workflow state.
The local replay uses file/in-memory stores behind the same interfaces
(`LedgerStore`, `WorkflowStore`) — swapping in Firestore is an adapter change,
not an engine change.

| Collection | Implemented contents |
| --- | --- |
| `dira_meta/` | graph configuration and managed Calendar ID |
| `commitments/` | commitment documents |
| `commitment_edges/` | typed dependency edges |
| `events/` | normalized events keyed by event ID for deduplication |
| `workflow_runs/` | repair snapshots, candidates, counters, update time |
| `workflow_steps/` | persisted flight-recorder entries per run |
| `action_ledger/` | idempotent intents, lifecycle, attempts, policy evidence |
| `gmail_inbox/` | controlled source-message provenance |
| `outbound_messages/` | controlled notification outbox; not claimed as Gmail delivery |
| `recruiter_slots/*/slots/` | console-mutable controlled availability |
| `recruiter_bookings/`, `recruiter_confirmed/` | idempotent controlled booking state |
| `org_tasks/` | controlled organization task ownership |

Transactional boundaries:

- Ledger records are persisted and transitioned transactionally.
- Workers claim actions with a transactional
  `PENDING_EXECUTION → EXECUTING` compare-and-set, so two replicas can never
  double-claim.
- Recruiter booking uses a Firestore transaction to re-check availability,
  reserve the slot, and record the booking together.

Security boundary: no browser writes. Cloud Run uses a dedicated service
account; the dashboard's demo token lives in Secret Manager and is sent only
by the server-side proxy. Application default credentials replace key files.
