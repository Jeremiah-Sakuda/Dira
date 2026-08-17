# Demo video — script and shot list

**Target runtime: 3:35–3:45.** The hackathon limit is four minutes; preserve at
least 15 seconds of export/upload safety. Record only after the dashboard
visibly says `LIVE CLOUD`, the Gemini evaluation passes, and the production
rehearsal succeeds repeatedly.

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
- [ ] Browser zoom, notifications, 1080p capture, and microphone are checked.

## Script

**0:00–0:15 — lived friction** *(voiceover over a crowded calendar)*

> “I am balancing classes, recruiting, and a student organization. The hard
> part is not remembering what I have to do. It is figuring out what
> everything else breaks when one commitment changes.”

**0:15–0:28 — thesis** *(cut to Interventions)*

> “Dira is a self-healing operating system for commitments.”

Show the `LIVE CLOUD` badge and its detail: Cloud Run, Vertex AI, Firestore,
and Google Calendar.

**0:28–0:42 — judge-controlled input**

Select **48-Hour Shock**, briefly point to the other counterfactuals, and click
**Run selected scenario**.

> “The scenario changes the world state, not the plan. Dira has to derive the
> repair from what it finds.”

**0:42–2:22 — unedited execution** *(one take, no cuts)*

Let the recorder show INTERPRET → PROPAGATE → FEASIBILITY (−3.6h) → PLAN →
POLICY → ACTION → ERROR 409 → OBSERVE → REPLAN → ACTION → VERIFY → RESOLVED
(+1.3h). Point to the Vertex model/latency telemetry and the 409.

> “The seeded world *lists* that first slot as open — but it's actually
> taken, a stale listing like real schedulers produce. Dira can only discover
> that by acting. Watch it hit the 409, refresh reality, and recover.”

**2:22–2:47 — external proof** *(quick tab tour)*

- Google Calendar: interview moved and study plan rebuilt.
- Firestore recruiter booking: second slot confirmed.
- Firestore organization task: QA owner is the designated backup.
- Firestore outbox: notification record exists.
- Back to Dira: `RESOLVED`, +1.3h, zero human actions.

Say explicitly that recruiter, organization, and outbox are controlled
integrations. Do not call the outbox a Gmail send.

**2:47–3:09 — architecture**

Show `docs/architecture/dira-production.svg`.

> “A judge control reaches one Cloud Run service. Gemini on Vertex AI only
> interprets; deterministic code owns feasibility and authorization. Every
> action is policy-gated, persisted to a Firestore ledger, executed through a
> narrow adapter, and re-read before Dira believes it happened.”

**3:09–3:27 — cloud and reproducibility proof**

Show the Cloud Run service and structured completion log, Vertex AI evidence,
then the terminal: `make demo-replay` with `Assertions: 18/18 passed`, followed
by the CI `golden-replay-20x: 20/20` artifact.

**3:27–3:43 — payoff** *(run outcome card)*

```text
USER INTERVENTIONS      0
COMMITMENTS DROPPED     0
VERIFIED MUTATIONS     13
FAILURES RECOVERED      1
GLOBAL SLACK        +1.3h
```

> “Calendars tell you when plans collide. Dira repairs them.”

## Required pickup shots before export

- Cloud Run status plus structured run-complete log containing the workflow
  ID and Gemini model/latency. Never show the demo token.
- Vertex AI project/model evidence.
- Firestore action-ledger record ending `VERIFIED`.
- Google Calendar before and after.
- CI `golden-replay-20x` artifact.

## Optional 10-second montage

Run **Earlier exam** and caption the changed behavior: the interview buffer
holds, so Dira correctly does not rebook it. This is the clearest compact
proof that the system derives rather than replays a memorized action list.
