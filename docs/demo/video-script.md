# Demo video — the single authoritative script

This is the **only** recording script. The earlier draft here and Part 2 of
`docs/submission/submission-review-packet.md` are merged into this cut; the
packet points back to this file. If a shot conflicts with the live UI, the
live UI wins. Re-time, do not improvise claims.

## Included evidence-video asset

`make demo-video` renders `docs/demo/dira-demo-evidence.mp4`: a 72-second
captioned walkthrough built from the checked-in architecture and the
credential-free replay's measured outcomes. It labels itself **deterministic
replay evidence**. Useful as a gallery preview or social cut. It must **not**
be submitted as the proof of live Google Cloud actions; the recording below
is the Devpost video.

**Target duration: 3:35–3:50** (hard limit 4:00). Keep `LIVE CLOUD` visible
throughout the uncut workflow. Do not show Gemma in this recording unless a
real voice-note capture exists and is labeled.

## Non-negotiable evidence rules

- The main workflow is **one uncut live capture**: no speed-ups, no cropping
  the runtime badge, no splicing outcomes from another run.
- **Hard re-record gate:** if the uncut segment (trigger to RESOLVED) exceeds
  ~110 seconds, stop and re-record. A slow Gemini round trip plus the tab
  tour will break the 4:00 ceiling; do not try to save a slow take.
- Abort if the badge reads `DETERMINISTIC EVIDENCE` or `CLOUD UNAVAILABLE`.
- Tie the same **workflow ID** across the Dira outcome card, a Cloud Logging
  query, and the Firestore ledger. This is the strongest proof the UI drives
  the deployed backend.
- Evidence language: **real** Google Calendar API mutations; **controlled
  Firestore integrations** for recruiter availability, organization
  ownership, and the notification outbox. Never "Gmail was sent"; never imply
  Gmail Watch / Pub/Sub is exercised if it is not.
- The default 409 is a **seeded stale recruiter listing**. Say so. Its value
  is that Dira discovers it by acting, refreshes state, replans, verifies.

## Tabs to prepare

1. [Dira home](https://dira-phi.vercel.app)
2. [Dira Interventions](https://dira-phi.vercel.app/interventions)
3. [Cloud Run — dira-orchestrator](https://console.cloud.google.com/run/detail/us-central1/dira-orchestrator?project=dira-agentic-2026)
4. [Cloud Logging](https://console.cloud.google.com/logs/query?project=dira-agentic-2026)
5. [Firestore data](https://console.cloud.google.com/firestore/databases/-default-/data?project=dira-agentic-2026)
6. Google Calendar with **Dira Demo — Sam Adeyemi** added and visible,
   **parked on the seeded demo week (Aug 16–22, 2026)** in both the before
   and after tabs. The current week is empty by design.
7. [Architecture diagram](https://github.com/Jeremiah-Sakuda/Dira/blob/main/docs/architecture/dira-production.svg)

## Pre-record checklist

- [ ] `deploy.sh` current; Cloud Run service page open; structured logs visible.
- [ ] Terminal proof ready: `curl https://dira-orchestrator-oq463fciiq-uc.a.run.app/health`
      returning `{"ok":true,"mode":"production"}` (the raw `.run.app` beat).
- [ ] Interventions page shows `LIVE CLOUD`; default scenario rehearsed once,
      then left finished so Calendar shows a clean repaired state to reset from.
- [ ] Know the failure mechanics: every run reseeds; the default scenario
      seeds slot 1 as listed but actually taken. Do NOT claim a manual flip.
- [ ] Calendar **before** state captured in one tab, **after** in another,
      both on the Aug 16–22 week. No live searching mid-take.
- [ ] Cloud Logging query template ready: `jsonPayload.run="<paste-id>"`.
- [ ] Lower-third slide ready:
      `REAL: Vertex AI · Cloud Run · Firestore · Google Calendar` /
      `CONTROLLED: recruiter · organization task · notification outbox`.
- [ ] A separately captured **No slots available** run labeled
      `COUNTERFACTUAL RUN`.
- [ ] Zoom ~110%, notifications off, 1080p capture, mic checked; no token,
      calendar ID, or personal account data on screen.

## Recording script

The first line tells a cold viewer what Dira is. Value first, infrastructure
second, then the uncut run.

### 0:00–0:14 — what Dira is, and why

**Screen:** Dira home. The moved midterm and impacted commitments visible,
`LIVE CLOUD` in frame.

> "On Tuesday morning a professor moves the midterm from Friday to Wednesday.
> That one email quietly breaks the rest of a student's week: study time now
> collides with a job interview and a club deadline. Every calendar app will
> show you the collision. Dira is an autonomous agent that repairs it."

### 0:14–0:28 — this is live, not a mockup

**Screen:** Cloud Run console for `dira-orchestrator`, then one quick beat on
the terminal: `curl …run.app/health` returning
`{"ok":true,"mode":"production"}`. Return to Dira.

> "Everything you are about to watch runs live on Google Cloud. Here is the
> Cloud Run service, and here is its public endpoint answering in production
> mode. Gemini on Vertex AI reads the change, Firestore records every
> decision, and the calendar being edited is a real Google Calendar."

### 0:28–0:45 — before state and trigger

**Screen:** Google Calendar before tab (Aug 16–22), then Interventions with
`LIVE CLOUD` and **48-Hour Shock** selected.

> "Here is the week before the change. Study blocks, an interview, and club
> work all fit. I trigger the professor's email and take my hands off the
> keyboard. There is no prewritten answer behind this button. Dira has to
> work out a repair from the commitments, deadlines, availability, and
> permissions it finds."

**Click:** **Trigger change and repair plan**. Hands visibly off.

### 0:45–2:20 — uncut live workflow *(re-record if this segment > ~110s)*

**Screen:** The live flight recorder, badge in frame, no cuts, including the
wait for Gemini and the 409.

> "First, Gemini extracts the schedule change through a strict schema. It
> reads language. It cannot authorize actions.
>
> Dira pushes the change through its stored commitment graph and recomputes
> the week. Global slack drops from plus four point one hours to minus three
> point six. The week is now infeasible, and Dira can prove exactly why.
>
> Deterministic policy limits what it may do: only an approved interview
> slot, only the designated backup, only personal blocks marked flexible.
>
> Now watch the failure. The first listed interview slot is stale. Dira
> attempts the booking, receives a 409 conflict, and does not pretend it
> worked. I stay hands off. It refreshes the world, rules that option out,
> and replans.
>
> It books the other approved slot, hands visual QA to the designated backup,
> rebuilds the study plan, and then verifies every change by reading each
> system back. A successful API response is never taken on faith.
>
> Resolved. Slack is positive again at one point three hours, with zero
> human actions after the trigger."

### 2:20–2:35 — the repair receipt

**Screen:** Stay on the resolved outcome. Point across **Protected**,
**Changed**, **Recovered**, **Verified**; open **Why not the other repair
options?** for one beat. Note the **workflow ID** line on the card.

> "This card is the repair receipt: what Dira protected, what it changed, the
> failure it recovered from, and what it re-read to verify. Open this section
> and you can see why the losing options were rejected. Most agents give you
> an answer. Dira shows its work. Keep an eye on this workflow ID."

### 2:35–3:08 — outcomes proven, tied by the workflow ID

**Screen:** Fast tour: (1) Calendar before then after (same seeded week);
(2) **Cloud Logging** filtered to `jsonPayload.run="<the ID from the card>"`
showing the `workflow finished` entry with the Gemini model and latency;
(3) Firestore: recruiter booking confirmed, org task reassigned, the
action-ledger record for the same ID ending `VERIFIED`, the outbox record.

> "The real calendar changed and was independently re-read. In Cloud Logging,
> filtering by that same workflow ID finds this exact run on the server, with
> the Gemini model and latency. In Firestore, the same ID sits on the
> confirmed booking, the reassigned task, the notification record, and a
> ledger entry that ends in VERIFIED. The recruiter, organization, and
> notification systems are controlled Firestore stand-ins and are labeled
> that way. The calendar is real."

**On-screen lower third:**

```text
REAL: Vertex AI · Cloud Run · Firestore · Google Calendar
CONTROLLED: recruiter availability · organization task · notification outbox
```

### 3:08–3:20 — safe counterfactual

**Screen:** The separately captured **No slots available** run, labeled
`COUNTERFACTUAL RUN`.

> "One more run, this time with every approved interview slot removed. Dira
> stops and says why, instead of inventing an appointment. A different world
> produces a different plan."

**Caption:** `NO APPROVED SLOT → SAFE STOP, NOT FABRICATED SUCCESS`

### 3:20–3:45 — architecture and close

**Screen:** Architecture diagram, then the resolved outcome. Deterministic
replay / CI evidence only if it fits without rushing.

> "The design rule is simple: Gemini interprets, deterministic code decides.
> Feasibility, permissions, and planning are computed, property-tested, and
> replayable. Firestore makes every action durable and idempotent, and
> independent verifiers confirm the world actually changed.
>
> Dira does not remind you that your week broke. It repairs it, and hands you
> the proof. One thing changes. Everything adapts."

## Final recording checklist

- [ ] `LIVE CLOUD` visible from trigger through `RESOLVED`; run uncut.
- [ ] Uncut segment ≤ ~110 seconds (else re-recorded).
- [ ] The 409, observe, replan, verify, and positive slack are readable.
- [ ] Raw `.run.app` `/health` response shown.
- [ ] Workflow ID visibly identical on the Dira card, the Cloud Logging
      entry, and the Firestore ledger record.
- [ ] Calendar before/after shown on the seeded Aug 16–22 week; the
      controlled-integration disclosure spoken **and** displayed.
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
