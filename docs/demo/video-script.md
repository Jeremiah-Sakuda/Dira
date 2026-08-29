# Demo video — script and shot list

## Included evidence-video asset

`make demo-video` renders `docs/demo/dira-demo-evidence.mp4`: a 72-second,
captioned walkthrough constructed from the checked-in architecture and the
credential-free replay's measured outcomes. It explicitly labels itself
**deterministic replay evidence**. It is useful as a project-gallery preview,
social cut, or a safe fallback when a cloud service is unavailable.

It must **not** be submitted as the final proof of live Google Cloud actions.
The four-minute recording below remains the Devpost submission video because
the rules require a working demo and visible Google Cloud deployment evidence.

**Target runtime: 3:40–3:50.** The hackathon limit is four minutes; preserve
at least 10 seconds of export/upload safety. The video must make three things
unmistakable to a first-time judge: Dira autonomously removes real friction,
the demonstrated run is live on Google Cloud, and its actions are safe,
verified, and reproducible.

## Non-negotiable evidence rules

- Record the main workflow as **one uncut live capture**. Do not speed it up,
  crop out its runtime badge, or splice in an outcome from another run.
- Keep `LIVE CLOUD` visible from the moment the run is triggered until its
  final result. Abort the recording if it says `DETERMINISTIC EVIDENCE` or
  `CLOUD UNAVAILABLE`.
- Tie the same workflow ID across the Dira result, a Cloud Run structured log,
  and the Firestore ledger record. This is the strongest proof that the UI is
  driving the deployed backend rather than replaying a fixture.
- Use exact evidence language: **real** Google Calendar API mutations;
  **controlled Firestore integrations** for recruiter availability,
  organization ownership, and notification outbox. Never call the outbox
  Gmail, and do not imply Gmail Watch/Pub/Sub is exercised if it is not.
- The default 409 is deliberately seeded as a stale recruiter listing. Say so.
  Its value is that Dira discovers the failure through an attempted action,
  refreshes external state, replans, and verifies the repair.

## Pre-record checklist

- [ ] Dedicated Dira GCP project provisioned and `deploy.sh` completed.
- [ ] Cloud Run service URL opens; structured logs are visible.
- [ ] Vertex AI evaluation artifact saved with every case passing.
- [ ] Google Calendar is open to the service-account-managed Dira calendar.
- [ ] Firestore recruiter slots are open in the Cloud console.
- [ ] Know the failure mechanics: every run reseeds the world, and the default
      scenario seeds the first recruiter slot as *listed-but-actually-taken*.
      The 409 is a seeded stale-listing race — do NOT claim a manual flip
      (a console flip would be clobbered by the reseed anyway).
- [ ] Dashboard Interventions page shows `LIVE CLOUD`.
- [ ] Default scenario has been rehearsed, then reset for a clean recording.
- [ ] The selected default run is known to display a workflow ID; Cloud Run
      logs and Firestore are filtered to that ID before recording begins.
- [ ] A browser tab is prepared with the calendar **before** state and another
      with its **after** state, so neither requires a risky live search.
- [ ] A readable lower-third/slide is ready: `REAL: Vertex AI · Cloud Run ·
      Firestore · Google Calendar` and `CONTROLLED: recruiter · org task ·
      notification outbox`.
- [ ] Browser zoom, notifications, 1080p capture, and microphone are checked.
- [ ] Final captured duration is under 3:55; no token, calendar ID, or personal
      account data is visible.

## Final recording script

### 0:00–0:12 — live boundary first

**Shot:** Interventions page with `LIVE CLOUD` badge visible. Quickly show the
Cloud Run service/status in an adjacent tab, then return to Dira.

> “This is a live Cloud Run workflow. Gemini on Vertex interprets a change,
> Firestore persists the run, and Dira independently verifies Calendar changes
> through the Google Calendar API.”

**Judge proof:** Google Cloud is visible before any product claim; the active
runtime is not confused with the deterministic fallback.

### 0:12–0:27 — friction and before-state

**Shot:** The original interview and study blocks on the service-account Dira
Calendar; return to Dira with **48-Hour Shock** selected and the live badge
still visible.

> “I am balancing classes, recruiting, and a student organization. The hard
> part is not remembering what I have to do. It is figuring out what
> everything else breaks when one commitment changes. Moving this midterm
> forward breaks study capacity, an interview buffer, and a time-bound team
> task.”

### 0:27–0:37 — what the judge controls

**Shot:** Point to **48-Hour Shock**, then briefly reveal **No slots available**
and **Alternate task owner** in the selector. Click **Run selected scenario**.

> “This control changes world state, not a prewritten plan. Dira derives the
> repair from commitments, policies, availability, and dependencies it finds.”

### 0:37–2:27 — unedited live run

**Shot:** One continuous screen capture. Keep the `LIVE CLOUD` badge and flight
recorder in frame. Do not cut away during the wait for Gemini or the 409.

The run narrates its own setup first (“Reseeding the demo world — Firestore
state + real Google Calendar…”), then the recorder shows INTERPRET (with the
inline `gemini-3.5-flash on Vertex AI, ~7s` telemetry) → PROPAGATE →
FEASIBILITY (−3.6h) → PLAN → POLICY → ACTION → ERROR 409 → OBSERVE → REPLAN
→ ACTION → VERIFY → RESOLVED (+1.3h). Point at the Vertex telemetry when
INTERPRET lands and at the 409 when it hits.

Use only this sparse narration over the run:

> “Gemini extracts the schedule change under a strict schema. Deterministic
> code propagates the impact, measures negative slack, and evaluates repairs
> within stored permissions.”

> “The first listed interview slot is deliberately stale. Dira learns that by
> acting: it receives a 409, refreshes external state, replans, and uses the
> remaining authorized slot. No human intervenes after the trigger.”

When `VERIFY` and `RESOLVED` appear:

> “Tool success is not enough. Dira re-reads each target before it considers
> the repair complete.”

**Judge proof:** semantic model use, non-chat autonomy, policy constraints,
failure recovery, and a clear final outcome are demonstrated—not narrated as
architecture claims.

### 2:27–2:57 — prove the side effects

**Shot:** Fast, deliberate tab tour; retain the workflow ID in a visible tab or
capture note.

1. Google Calendar, before → after: interview moved and study plan rebuilt.
2. Firestore recruiter booking: the second slot is confirmed.
3. Firestore organization task: visual QA is assigned to the designated backup.
4. Firestore action ledger for the same workflow: lifecycle ends in `VERIFIED`.
5. Firestore outbox: a notification record exists.
6. Return to Dira’s outcome: `RESOLVED`, +1.3h, zero human interventions
   after the judge-triggered run begins.

> “Calendar is the real Google API mutation and is independently re-read for
> verification. Recruiter availability, organization ownership, and this
> notification outbox are controlled Firestore integrations—durable test
> doubles, not third-party production connectors.”

**On-screen lower third:**

```text
REAL: Vertex AI · Cloud Run · Firestore · Google Calendar
CONTROLLED: recruiter · organization task · notification outbox
```

### 2:57–3:17 — tie the run to Google Cloud

**Shot:** Cloud Run structured completion log filtered to the captured workflow
ID, followed by Vertex model/latency evidence for that same execution.

> “This log ties the run you just watched to Cloud Run and Vertex AI—not a
> local fixture.”

### 3:17–3:35 — architecture in one sentence

Show `docs/architecture/dira-production.svg`.

> “Gemini interprets. Deterministic engines plan and authorize. The Firestore
> ledger makes retries idempotent. Narrow adapters execute, and verifiers
> decide what actually succeeded.”

### 3:35–3:48 — reproducibility and close

**Shot:** Outcome card, then terminal/CI artifact with the deterministic
evidence clearly labeled.

```text
UNEDITED LIVE RUN       RESOLVED
USER INTERVENTIONS             0
FAILURES RECOVERED             1
GLOBAL SLACK               +1.3h
```

Then show `make demo-replay` → `Assertions: 18/18 passed` and CI
`golden-replay-20x: 20/20`. If time permits, flash the **No slots available**
result: a safe non-success outcome.

> “This live run repaired the plan; the credential-free replay verifies the
> engine separately. Calendars show conflicts. Dira repairs them.”

## Recording decision gate

Do not upload the take unless all of these are true:

- `LIVE CLOUD` is visible throughout the uncut workflow section.
- The workflow ID matches the Dira result, Cloud Run log, and Firestore ledger.
- Gemini/Vertex telemetry, Calendar before/after, the 409/replan, verification,
  and final result are readable without pausing.
- The controlled-integration disclosure is spoken and displayed.
- The video is public/unlisted, in English, under four minutes, and the exact
  link has been added to the Devpost submission.

## Required pickup shots before export

- Cloud Run status plus structured run-complete log containing the workflow
  ID and Gemini model/latency. Never show the demo token.
- Vertex AI project/model evidence.
- Firestore action-ledger record ending `VERIFIED`.
- Google Calendar before and after.
- CI `golden-replay-20x` artifact.

## Optional 10-second pickup (replace—not add to—the final run)

Run **Earlier exam** and caption the changed behavior: the interview buffer
holds, so Dira correctly does not rebook it. This is the clearest compact
proof that the system derives rather than replays a memorized action list.

If the production run is reliably fast enough, this is the preferred pickup:
briefly select **No slots available** and show the safe non-success result.
Caption it: `NO APPROVED SLOT → SAFE STOP, NOT FABRICATED SUCCESS`. Never add
this pickup at the expense of the uncut default run or the Cloud Run/Calendar
proof; those are the non-negotiable judging evidence.

## Claims to keep precise

- Say “seeded stale-listing race,” not “a spontaneous live outage.”
- Say “no human intervention after trigger,” not “no human action” without
  context—the judge intentionally starts the scenario.
- Say “Gemini interprets,” never “Gemini decides” or “Gemini authorizes.”
- Say “notification record/outbox,” never “Gmail was sent.”
- Say “controlled Firestore integration,” never “recruiter API” or “production
  organization connector.”
- Do not show the deterministic 72-second preview during a live-cloud claim.
