# Demo video — the single authoritative script

This is the **only** recording script. The earlier draft here and Part 2 of
`docs/submission/submission-review-packet.md` are merged into this cut; the
packet now points back to this file. If a shot conflicts with the live UI,
the live UI wins — re-time, do not improvise claims.

## Included evidence-video asset

`make demo-video` renders `docs/demo/dira-demo-evidence.mp4`: a 72-second,
captioned walkthrough built from the checked-in architecture and the
credential-free replay's measured outcomes. It labels itself **deterministic
replay evidence**. Useful as a gallery preview or social cut. It must **not**
be submitted as the proof of live Google Cloud actions — the recording below
is the Devpost video.

**Target duration: 3:35–3:50** (hard limit 4:00). Keep `LIVE CLOUD` visible
throughout the uncut workflow. Do not show Gemma in this recording unless a
real voice-note capture exists and is labeled.

## Non-negotiable evidence rules

- The main workflow is **one uncut live capture** — no speed-ups, no cropping
  the runtime badge, no splicing outcomes from another run.
- **Hard re-record gate:** if the uncut segment (trigger → RESOLVED) exceeds
  ~110 seconds, stop and re-record. A slow Gemini round-trip plus the tab
  tour will break the 4:00 ceiling; do not try to save a slow take.
- Abort if the badge reads `DETERMINISTIC EVIDENCE` or `CLOUD UNAVAILABLE`.
- Tie the same **workflow ID** across the Dira outcome card, a Cloud Logging
  query, and the Firestore ledger — strongest proof the UI drives the
  deployed backend.
- Evidence language: **real** Google Calendar API mutations; **controlled
  Firestore integrations** for recruiter availability, organization
  ownership, and the notification outbox. Never "Gmail was sent"; never imply
  Gmail Watch / Pub/Sub is exercised if it is not.
- The default 409 is a **seeded stale recruiter listing** — say so. Its value
  is that Dira discovers it by acting, refreshes state, replans, verifies.

## Tabs to prepare

1. [Dira home](https://dira-phi.vercel.app)
2. [Dira Interventions](https://dira-phi.vercel.app/interventions)
3. [Cloud Run — dira-orchestrator](https://console.cloud.google.com/run/detail/us-central1/dira-orchestrator?project=dira-agentic-2026)
4. [Cloud Logging](https://console.cloud.google.com/logs/query?project=dira-agentic-2026)
5. [Firestore data](https://console.cloud.google.com/firestore/databases/-default-/data?project=dira-agentic-2026)
6. Google Calendar with **Dira Demo — Sam Adeyemi** added and visible.
7. [Architecture diagram](https://github.com/Jeremiah-Sakuda/Dira/blob/main/docs/architecture/dira-production.svg)

## Pre-record checklist

- [ ] `deploy.sh` current; Cloud Run service page open; structured logs visible.
- [ ] Terminal proof ready: `curl https://dira-orchestrator-oq463fciiq-uc.a.run.app/health`
      → `{"ok":true,"mode":"production"}` (the raw `.run.app` URL beat).
- [ ] Interventions page shows `LIVE CLOUD`; default scenario rehearsed once,
      then left finished so Calendar shows a clean repaired state to reset from.
- [ ] Know the failure mechanics: every run reseeds; the default scenario
      seeds slot 1 as listed-but-actually-taken. Do NOT claim a manual flip.
- [ ] Calendar **before** state captured in one tab, **after** in another —
      no risky live searching mid-take.
- [ ] Cloud Logging query template ready: `jsonPayload.run="<paste-id>"`.
- [ ] Lower-third slide ready:
      `REAL: Vertex AI · Cloud Run · Firestore · Google Calendar` /
      `CONTROLLED: recruiter · organization task · notification outbox`.
- [ ] A separately captured **No slots available** run labeled
      `COUNTERFACTUAL RUN`.
- [ ] Zoom ~110%, notifications off, 1080p capture, mic checked; no token,
      calendar ID, or personal account data on screen.

## Recording script

### 0:00–0:16 — problem

**Screen:** Dira home. The moved midterm, impacted commitments, `LIVE CLOUD`.

> "A professor moves a midterm from Friday to Wednesday. For a student
> balancing classes, recruiting, and a team commitment, that one change can
> break the whole week. The interview buffer disappears, there is not enough
> study time, and a team deliverable becomes risky. A calendar can show those
> conflicts. Dira repairs them."

### 0:16–0:32 — live Google Cloud proof

**Screen:** Cloud Run console for `dira-orchestrator`, then one beat on the
terminal: `curl …run.app/health` → `{"ok":true,"mode":"production"}`. Return
to Dira.

> "This is a live Google Cloud deployment — here is the Cloud Run service and
> its public endpoint answering in production mode. Gemini on Vertex AI
> interprets the change, Firestore persists the workflow and its action
> ledger, and Dira makes and independently verifies real Google Calendar
> changes."

### 0:32–0:48 — before-state and trigger

**Screen:** Google Calendar before-state, then Interventions with `LIVE
CLOUD` and **48-Hour Shock** selected.

> "Here is the week before the change: study blocks and an interview can
> coexist. I'm selecting the 48-Hour Shock. This does not retrieve a
> prewritten answer — it changes the world state. From this point, Dira must
> derive a repair from the commitments, dependencies, availability, and
> permissions it finds."

**Click:** **Trigger change and repair plan**. Hands visibly off.

### 0:48–2:22 — uncut live workflow *(re-record if this segment > ~110s)*

**Screen:** The live flight recorder, badge in frame, no cuts — including the
wait for Gemini and the 409.

> "First, Gemini extracts the professor's schedule change through a strict
> schema. It interprets language, but it does not authorize actions.
>
> Dira propagates the consequences through the stored commitment graph.
> Global Slack falls from positive four-point-one hours to negative
> three-point-six: this week is no longer feasible.
>
> Deterministic policy limits the repairs: only an approved interview slot,
> only the designated backup, only flexible personal blocks.
>
> The first listed interview slot is deliberately stale. Dira attempts the
> permitted booking and receives a 409 conflict. It does not pretend the
> action succeeded, and I do not step in. It refreshes the world, invalidates
> that option, and replans.
>
> It books the remaining authorized slot, delegates visual QA to the backup,
> rebuilds the study plan, and verifies every mutation by reading the targets
> back. A successful tool call is not enough.
>
> Resolved: positive one-point-three hours of slack, zero human actions after
> the trigger."

### 2:22–2:37 — the proof-carrying repair receipt

**Screen:** Stay on the resolved outcome. Point across **Protected**,
**Changed**, **Recovered**, **Verified**; open **Why not the other repair
options?** for one beat. Note the **workflow ID** line on the card.

> "This is Dira's repair receipt: what it protected, what it changed, the
> failed action it recovered from, and what it re-read to verify. Expand this
> and you see why the other options were rejected. Agents usually give you an
> answer. Dira gives you the proof needed to trust a repair. And this
> workflow ID — remember it."

### 2:37–3:10 — prove outcomes, tied by the workflow ID

**Screen:** Fast tour: (1) Calendar before → after; (2) **Cloud Logging**
filtered to `jsonPayload.run="<the ID from the card>"` showing the
`workflow finished` entry with the Gemini model + latency; (3) Firestore:
recruiter booking confirmed, org task reassigned, action-ledger record for
the same ID ending `VERIFIED`, outbox record.

> "The real Calendar changed and was independently re-read. This Cloud Run
> log line carries the same workflow ID as the card you just saw — the UI is
> driving the deployed backend, not replaying a fixture. The recruiter
> booking, organization task, and notification outbox are controlled
> Firestore integrations, clearly labeled test doubles; this ledger record
> for the same workflow ends in VERIFIED."

**On-screen lower third:**

```text
REAL: Vertex AI · Cloud Run · Firestore · Google Calendar
CONTROLLED: recruiter availability · organization task · notification outbox
```

### 3:10–3:22 — safe counterfactual

**Screen:** The separately captured **No slots available** run, labeled
`COUNTERFACTUAL RUN`.

> "When I remove every approved interview slot, Dira stops safely rather than
> fabricating an appointment. A different world produces a different plan."

**Caption:** `NO APPROVED SLOT → SAFE STOP, NOT FABRICATED SUCCESS`

### 3:22–3:47 — architecture and close

**Screen:** Architecture diagram, then the resolved outcome. Deterministic
replay / CI evidence only if it fits without rushing.

> "Gemini interprets. Deterministic systems calculate feasibility, enforce
> permissions, and choose repairs. Firestore makes retries durable and
> idempotent. Narrow adapters execute, and independent verifiers confirm the
> world changed.
>
> Dira does not remind you that your week broke. It repairs what changed —
> safely, visibly, and with proof. One thing changes. Everything adapts."

## Final recording checklist

- [ ] `LIVE CLOUD` visible from trigger through `RESOLVED`; run uncut.
- [ ] Uncut segment ≤ ~110 seconds (else re-recorded).
- [ ] The 409 → observe → replan → verify → positive slack are readable.
- [ ] Raw `.run.app` `/health` response shown.
- [ ] Workflow ID visibly identical on the Dira card, the Cloud Logging
      entry, and the Firestore ledger record.
- [ ] Calendar before/after shown; controlled-integration disclosure spoken
      **and** displayed.
- [ ] English, under 4:00 (captured ≤ 3:55), uploaded **public/unlisted** to
      YouTube or Vimeo; link tested signed-out; URL pasted into the Devpost
      text before submitting.

## Claims to keep precise

- "Seeded stale-listing race," not "spontaneous live outage."
- "No human intervention after the trigger," not "no human action."
- "Gemini interprets," never "Gemini decides/authorizes."
- "Notification record/outbox," never "Gmail was sent."
- "Controlled Firestore integration," never "recruiter API" or a production
  connector.
- Gemma is CPU-fallback; it does not appear in this video without a real
  captured voice-note run, and is never called GPU-backed.
