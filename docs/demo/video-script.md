# Demo video — script & shot list

**Target runtime 3:40–3:45** (hard limit ~4:00; keep 15–20s of safety, PRD §50).
Record only after the reliability bar: 20/20 deterministic replays (CI has
this), 10/10 live-model runs, 10/10 production-like runs.

## Pre-record checklist

- [ ] GCP project provisioned; `infrastructure/cloud-run/deploy.sh` run;
      Cloud Run console tab open (judging requires visible Google Cloud
      deployment)
- [ ] Demo Gmail + Calendar accounts logged in (synthetic identities)
- [ ] Recruiter endpoint seeded; **flip which slot is taken right before
      recording** (the §51 runtime variable Dira can't know in advance)
- [ ] Dashboard open on System page (FEASIBLE, +4.1h)
- [ ] Screen recorder at 1080p, mic checked

## Script

**0:00–0:15 — lived friction** *(face or voiceover over a messy calendar)*
> "I'm a student balancing classes, recruiting, and student orgs. The hard
> part isn't remembering what I have to do. It's figuring out what everything
> else breaks when one commitment changes."

**0:15–0:27 — thesis** *(cut to Dira System page)*
> "Dira is a self-healing operating system for commitments."
Show: `SYSTEM FEASIBLE · Global slack +4.1h`.

**0:27–0:35 — autonomy declaration** *(hands off keyboard, visible)*
> "I'm not going to touch Dira for the rest of this workflow."

**0:35–2:30 — unedited live execution** *(single take, no cuts)*
Send the professor email from Prof. Chen's account. Switch to the
Interventions flight recorder and let it narrate itself:
DETECT → INTERPRET → PROPAGATE (6 commitments) → FEASIBILITY (−3.6h) →
PLAN (candidates table) → ACTION (books first available slot) → **ERROR 409**
→ OBSERVE → REPLAN → ACTION (books the other slot) → VERIFY → RESOLVED (+1.3h).
Say almost nothing; point at the 409 when it happens:
> "That slot was taken 30 seconds ago. Watch."

**2:30–2:50 — external proof** *(fast tab tour)*
Google Calendar: interview moved, study blocks rebuilt, workout and
side-project relocated. Gmail: Maya's delegation notification. Org tracker:
QA owner = Maya. Back to Dira: RESOLVED, 0 user interventions.

**2:50–3:12 — architecture** *(diagram slide)*
> "Pub/Sub into Cloud Run. Gemini — through the GenAI SDK — only interprets;
> a deterministic solver owns feasibility. Plans are validated, policy-gated,
> written to a durable action ledger, executed through scoped tools, and a
> verifier re-reads the outside world before Dira believes anything."

**3:12–3:27 — cloud + reproducibility proof**
Cloud Run services + logs; then a terminal:
`make demo-replay` → `Assertions: 18/18 passed`, and the CI badge with
`golden-replay-20x: 20/20`.

**3:27–3:43 — payoff** *(metrics card)*
```
USER INTERVENTIONS      0
COMMITMENTS DROPPED     0
VERIFIED MUTATIONS     13
FAILURES RECOVERED      1
GLOBAL SLACK        +1.3h
```
> "Calendars tell you when plans collide. Dira repairs them."

## Optional 10–15s montage (§37)

Recruiter-withdrawal secondary trigger: email offering Tue 4 PM / Fri 10 AM →
Dira books Tuesday because Friday would eat pre-exam study capacity. One
caption: "Different trigger class. Same engine."
