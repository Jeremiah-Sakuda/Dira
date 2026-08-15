# Consequence propagation

Deterministic BFS from the mutated commitment over typed edges (PRD §12).
Never an LLM responsibility.

## Inputs

`old_state`, `new_state` (post-mutation), `changed_commitment_id`. The solver
runs once on each state; edge rules compare constraint status between them.

## Traversal

```
queue = [changed]
while queue:
  current = queue.pop()
  if visited(current): continue          # cycle detection
  for edge in relevant_edges(current):   # outgoing + incoming DEPENDS_ON /
    consequence = rule[edge.type](...)   #   REQUIRES_BUFFER / SHARES_RESOURCE
    if consequence changed:
      emit ImpactRecord
      affected.add(target); queue.push(target)
```

Plus **dynamic conflict discovery**: a moved event that now overlaps someone's
planned session emits a `CONFLICTS_WITH` impact even without a stored edge.

## Edge rules (PRD §13)

| Edge | Rule |
| --- | --- |
| `REQUIRES_PREPARATION` | prep deadline := event.start − finalBuffer; scheduled prep after it is invalid capacity; status from the prep capacity bucket |
| `REQUIRES_BUFFER` | applicable when A precedes B; violated if `B.start − A.end < buffer` |
| `MUST_FOLLOW` / `MUST_PRECEDE` | windowed-task assignment re-checked; a broken task also puts its *downstream* marker at risk (never the upstream release) |
| `DEPENDS_ON` | dependent inherits risk when the prerequisite is violated, dropped, **or itself in the affected set** (transitive risk) |
| `SHARES_RESOURCE_WITH` | re-read the competitor's capacity-bucket slack; any change is an impact |
| `CONFLICTS_WITH` | overlap check before/after |
| `DELEGATABLE_TO`, `OWNED_BY`, `SUPPORTS_GOAL` | structural metadata; no propagation |

## Golden run

Exam → Wed 14:00 reaches exactly six commitments:
prep (deadline collapsed, 5 reservations invalidated) → PS6 (shared pool
tightened, capacity-path slack 483 → 123) · interview (buffer N/A→VIOLATED) ·
QA (session overlap + window infeasible) → deck freeze (input at risk) →
sponsor presentation (dependency chain at risk).

In the exam-at-1-PM variation the QA session survives, so the sponsor chain is
*not* dragged in (3 affected) — propagation reflects state, not the scenario.

Every impact is an `ImpactRecord` (PRD §14): source, target, edge type,
constraint, previous/new status, detail — powering both the flight recorder
and the tests.
