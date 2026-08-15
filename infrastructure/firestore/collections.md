# Firestore layout (PRD §32–§33)

Dira's conceptual model is a graph; its storage does not need to be. Firestore
holds graph-node documents, typed edge documents, and durable workflow state.
The local replay uses file/in-memory stores behind the same interfaces
(`LedgerStore`, `WorkflowStore`) — swapping in Firestore is an adapter change,
not an engine change.

| Collection            | Contents                                                       |
| --------------------- | -------------------------------------------------------------- |
| `users/`              | user profile, autonomy preferences                             |
| `commitments/`        | commitment documents (PRD §9 fields)                           |
| `commitment_edges/`   | typed edges: `{type, from, to, data}`                          |
| `constraints/`        | named constraints (e.g. POST_EXAM_RECOVERY_BUFFER)             |
| `events/`             | normalized external events, keyed by eventId (dedup)           |
| `workflow_runs/`      | one document per repair workflow (status, slack, candidates)   |
| `workflow_steps/`     | flight-recorder entries, subcollection per run                 |
| `action_ledger/`      | outbox rows with idempotency keys and status history           |
| `observations/`       | verifier reads of external state                               |
| `policies/`           | autonomy policy configuration                                  |
| `audit_events/`       | every mutation with provenance (PRD §48)                       |

Transactional boundaries:

- Workflow transition to EXECUTING + persisting authorized actions +
  PENDING_EXECUTION happen in **one transaction** (outbox pattern, PRD §25).
- Executors claim actions with a transactional
  `PENDING_EXECUTION → EXECUTING` compare-and-set, so two replicas can never
  double-claim.

Security rules: no client writes; services use scoped service accounts; raw
OAuth secrets live in Secret Manager, never in Firestore (PRD §47).
