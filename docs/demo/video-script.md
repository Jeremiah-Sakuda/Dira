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

### 0:00–0:12 — the human shock, with the live boundary visible

**Shot:** Start on the Dira home-page problem story: `Midterm: Fri 2 PM → Wed
2 PM`, followed by `Interview buffer · study capacity · team QA`. Keep the
`LIVE CLOUD` badge visible; briefly reveal the Cloud Run service/status in an
adjacent tab before returning to Dira.

> “A professor moved this midterm forward by 48 hours. That breaks an
> interview buffer, the study plan, and a team task. Calendars show the
> conflict; Dira repairs the week. This is a live Cloud Run workflow: Gemini
> on Vertex interprets the change, Firestore persists the run, and Dira
> independently verifies Calendar changes through the Google Calendar API.”

**Judge proof:** The reason the product matters is clear before the technical
proof appears; `LIVE CLOUD` still makes the active runtime unambiguous.

### 0:12–0:27 — friction and before-state

**Shot:** The original interview and study blocks on the service-account Dira
Calendar; return to Dira with **48-Hour Shock** selected and the live badge
still visible.

> “The run starts from this real before-state. Dira does not merely flag the
> overlaps—it must restore a feasible plan within the permissions already
> stored for each commitment.”

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

### 2:27–2:42 — the proof-carrying repair receipt

**Shot:** Stay on Dira's resolved outcome. Reveal the **Proof-carrying repair
receipt** before leaving the product. Point across **Protected**, **Changed**,
**Recovered**, and **Verified**, then open **Why not the other repair options?**
for one beat if a rejected candidate is present.

> “This is Dira's repair receipt. In one screen, it shows what it protected,
> what it changed, the failed action it recovered from, and what it re-read to
> verify the result. Expand this line and you can see why the other options
> were rejected. Agents usually give you an answer. Dira gives you the proof
> needed to trust a repair.”

**Judge proof:** The result is legible as a user outcome before the detailed
audit tables. The receipt is generated from this run's state diff, candidate
evaluation, recovery count, and verification results—not written narration.

### 2:42–3:10 — prove the side effects

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

### 3:10–3:22 — tie the run to Google Cloud

**Shot:** Cloud Run structured completion log filtered to the captured workflow
ID, followed by Vertex model/latency evidence for that same execution.

> “This log ties the run you just watched to Cloud Run and Vertex AI—not a
> local fixture.”

### 3:22–3:33 — counterfactual: safe restraint

**Shot:** Use a prepared pickup from the **No slots available** scenario.
Show the run's safe non-success outcome, with the scenario selector visible.
It may be cut from a separate run; label it `COUNTERFACTUAL RUN` and do not
present it as part of the uncut default sequence.

> “Remove the approved slots and Dira stops safely instead of inventing an
> appointment. The inputs changed, so the plan changed.”

**On-screen caption:** `NO APPROVED SLOT → SAFE STOP, NOT FABRICATED SUCCESS`

### 3:33–3:43 — architecture in one sentence

Show `docs/architecture/dira-production.svg`.

> “Gemini interprets. Deterministic engines plan and authorize. The Firestore
> ledger makes retries idempotent. Narrow adapters execute, and verifiers
> decide what actually succeeded.”

### 3:43–3:53 — reproducibility and close

**Shot:** Outcome card, then terminal/CI artifact with the deterministic
evidence clearly labeled.

```text
UNEDITED LIVE RUN       RESOLVED
USER INTERVENTIONS             0
FAILURES RECOVERED             1
GLOBAL SLACK               +1.3h
```

Then show `make demo-replay` → `Assertions: 18/18 passed` and CI
`golden-replay-20x: 20/20`.

> “This live run repaired the plan; the credential-free replay verifies the
> engine separately. Calendars show conflicts. Dira repairs them.”

## Recording decision gate

Do not upload the take unless all of these are true:

- `LIVE CLOUD` is visible throughout the uncut workflow section.
- The workflow ID matches the Dira result, Cloud Run log, and Firestore ledger.
- Gemini/Vertex telemetry, Calendar before/after, the 409/replan, verification,
  and final result are readable without pausing.
- The controlled-integration disclosure is spoken and displayed.
- The video is public, in English, under four minutes, and the exact
  link has been added to the Devpost submission.
- Gemma 3n is shown only if its separate GPU service has been deployed and a
  successful voice-note-to-safe-outcome run has been captured. Otherwise keep
  it out of the video and describe it as an optional implementation path.

## Required pickup shots before export

- Cloud Run status plus structured run-complete log containing the workflow
  ID and Gemini model/latency. Never show the demo token.
- Vertex AI project/model evidence.
- Firestore action-ledger record ending `VERIFIED`.
- Google Calendar before and after.
- CI `golden-replay-20x` artifact.

## Optional alternative counterfactual pickup

Run **Earlier exam** and caption the changed behavior: the interview buffer
holds, so Dira correctly does not rebook it. This is the clearest compact
proof that the system derives rather than replays a memorized action list.

Use this **Earlier exam** pickup only if the no-slots run is too slow or
unreliable to record. It proves derived behavior, but the no-slots safe stop is
the preferred final-video counterfactual because it makes Dira's restraint
unmistakable.

## Claims to keep precise

- Say “seeded stale-listing race,” not “a spontaneous live outage.”
- Say “no human intervention after trigger,” not “no human action” without
  context—the judge intentionally starts the scenario.
- Say “Gemini interprets,” never “Gemini decides” or “Gemini authorizes.”
- Say “notification record/outbox,” never “Gmail was sent.”
- Say “controlled Firestore integration,” never “recruiter API” or “production
  organization connector.”
- Do not show the deterministic 72-second preview during a live-cloud claim.
