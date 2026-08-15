# Global Slack — formal definition and the golden derivation

Global Slack is not a cosmetic number (PRD §16). This document defines it and
shows, minute by minute, how the golden fixture produces the PRD trajectory
**+4.1h → −3.6h → +1.3h** out of the solver rather than out of a script.

## Work taxonomy

The solver partitions required work:

1. **Pooled effort** (exam prep, problem sets) draws on the shared pool of the
   user's free focus time before a hard deadline.
2. **Windowed tasks** (deck visual QA) must be placed as one contiguous
   session inside `[release, deadline]` for a specific owner; when owned by
   the user, the placement consumes user capacity like any busy block.
3. **Scheduled events/blocks** occupy concrete intervals. *Study
   reservations* (blocks with `reservesEffortFor`) are transparent to
   capacity: they mark where pooled effort is intended to happen and must not
   double-count against the pool they draw from.

## Capacity

The fixture declares **availability windows** — when the user can genuinely do
focused work. Free segments = availability − busy time. Each distinct work
session pays a context-switch overhead:

```
usable(segment, before d) = max(0, min(seg.end, d) − seg.start − OVERHEAD)
OVERHEAD = 6 minutes (configurable, unit-tested)
```

## Bucket test (pooled effort)

Classic cumulative earliest-deadline feasibility. For every effort deadline
`d` (deadlines may be derived from graph edges — `REQUIRES_PREPARATION` gives
prep `deadline = event.start − finalBuffer`):

```
slack(d) = Σ usable(segments before d) − Σ remaining_effort(tasks with deadline ≤ d)
```

A negative bucket means **no schedule exists** meeting that deadline —
regardless of how much free time exists elsewhere.

## Buffers, windows, ordering

- `REQUIRES_BUFFER(A→B, m)`: applicable when A precedes B;
  `slack = B.start − A.end − m`.
- Windowed tasks: a valid stored placement, or the earliest feasible
  placement of `effort + OVERHEAD` contiguous minutes inside the window for
  the owner; failure raises `ASSIGNEE_UNAVAILABLE`.
- `MUST_PRECEDE / MUST_FOLLOW / CONFLICTS_WITH / DEPENDS_ON` are checked
  directly.

## Global Slack

```
GlobalSlack = min( all bucket slacks, all applicable buffer slacks )
```

The **repair margin** used to accept plans is the minimum over *capacity*
buckets only (a buffer satisfied at exactly its required length is fully
satisfied, not at risk); an accepted repair must restore ≥ 60 minutes of
margin and non-negative Global Slack.

## The golden derivation

Availability (Tue Aug 18 – Fri Aug 21, minutes usable after 6-min overhead):

| Window | Raw | Usable |
| --- | --- | --- |
| Tue 19:30–23:00 (workout 19:30–20:30 inside) | 150 free | 144 |
| Wed 09:00–13:00 (side-project block occupies) | 0 free | 0 |
| Wed 14:30–16:45 (QA planned 14:30–15:30 inside) | 75 free | 69 |
| Wed 18:00–19:00 | 60 | 54 |
| Wed 20:30–22:30 | 120 | 114 |
| Thu 11:00–12:00 | 60 | 54 |
| Thu 19:00–20:45 | 105 | 99 |
| Thu 21:15–22:30 | 75 | 69 |
| Fri 08:30–09:30 | 60 | 54 |
| Fri 10:00–11:15 | 75 | 69 |
| **Total before Fri 14:00** | | **726** |

Demand before Fri 14:00: prep remaining 360 (8h required − 2h done) + PS6 120
= 480.

**Initial:** prep bucket `726 − 480 = +246 min = +4.1h`. Every other bucket
is larger; the buffer (interview Wed, exam Fri) is not applicable. ✅

**Mutation (exam → Wed 14:00–15:00):** prep deadline becomes Wed 14:00.
Capacity before Wed 14:00 = Tue 144 only (Wed morning is occupied by the
side-project block; the QA slot starts 14:30).

- prep bucket: `144 − 360 = −216 min = −3.6h` — exactly PRD §18. ❌
- buffer: interview 17:00 − exam end 15:00 = 120 < 180 → `−60 min = −1.0h`
  (matches PRD §17). ❌
- QA: the exam overlaps the planned 14:30–15:30 session; the only remaining
  user gap inside [assets 14:00 → freeze 16:00] is 15:00–16:00 = 60 raw <
  60 + 6 needed → `ASSIGNEE_UNAVAILABLE`. ❌

**Repair (derived, not scripted):** book Thu 13:00 (after the injected 409 on
Thu 10:00), delegate QA to Maya, move the workout (Tue window becomes
19:30–23:00 → 204 usable) and the side-project block (Wed morning becomes
09:00–13:00 → 234 usable), rebuild study reservations where the solver put
the hours.

- prep bucket: `(204 + 234) − 360 = +78 min = +1.3h` ✅ (the global minimum)
- buffer: Thu 13:00 − Wed 15:00 = 22h − 3h → +19h ✅
- PS6 bucket: +447 ✅

The planner also proves the margin rule matters: moving *only* the
side-project block yields `144 + 234 − 360 = +18 min` — feasible but
knife-edge, rejected for insufficient margin; moving *only* the workout
yields −156, rejected as infeasible.

All of the above is pinned by `tests/unit/golden-slack.test.ts` and the
property suite (`tests/property/invariants.test.ts`) checks the monotonicity
laws (earlier deadline ⇒ slack never increases; more capacity ⇒ never
decreases; more effort ⇒ never increases) over randomized graphs.
