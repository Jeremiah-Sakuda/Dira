# Dira — submission review packet

This is the single review document for the Devpost submission and final demo recording. Replace the bracketed video URL only after the final upload. Keep the evidence language precise.

---

# Part 1 — Devpost submission

## Submission fields

- **Project name:** Dira
- **Tagline:** When one commitment changes, Dira repairs the plan.
- **Track:** The Taskmaster
- **Project URL:** https://dira-phi.vercel.app
- **Repository:** https://github.com/Jeremiah-Sakuda/Dira
- **Demo video:** `[PUBLIC YOUTUBE / VIMEO URL]`
- **Architecture diagram:** https://github.com/Jeremiah-Sakuda/Dira/blob/main/docs/architecture/dira-production.svg

## Inspiration

A professor moved a midterm forward by two days. That one change collided with a recruiting interview, erased study capacity, and made a team deliverable impossible to finish in its allowed window. Calendar and task apps showed every conflict—in red—and then asked me to repair the week manually.

That is the problem Dira solves. The hard part is not remembering commitments; it is recomputing everything else that becomes infeasible when the outside world moves. Dira treats a schedule change as a trigger to repair the plan, not as another notification.

![A midterm moves, three commitments become infeasible, and Dira restores a verified plan](https://raw.githubusercontent.com/Jeremiah-Sakuda/Dira/main/docs/submission/problem-to-repair.svg)

**One thing changes. Everything adapts.** Dira finds what no longer fits, chooses only permitted repairs, and verifies the resulting world before it calls the plan repaired.

## What it does

Dira is an autonomous commitment-repair agent: when an authorized external change makes a student's week infeasible, it finds the downstream conflicts and repairs the plan without requiring the student to manually coordinate every change. Under the hood, it updates a typed graph of commitments and dependencies, computes feasibility as Global Slack, and takes only policy-authorized actions.

In the 48-Hour Shock demo, a professor moves a midterm from Friday to Wednesday. Dira detects the mutation, finds six affected commitments and three violations, evaluates repair candidates, and acts without human intervention after the trigger. It tries an authorized interview slot, receives a deliberately seeded stale-listing `409`, refreshes state, replans, books the remaining authorized slot, delegates visual QA to its designated backup, rebuilds the study plan, and independently verifies each mutation. Global Slack moves from `+4.1h` to `−3.6h` to `+1.3h`.

The demo includes counterfactuals: when no approved interview slots remain, Dira stops safely instead of inventing success; when the constraint changes, the action set changes.

After each run, Dira presents a **proof-carrying repair receipt**: a compact, plain-English account of what was protected and changed, any action failure it recovered from, the rejected alternatives, and the independent re-reads that verified the resulting state.

## How we built it

- **Gemini 3.5 Flash on Vertex AI**, through the Google GenAI SDK, interprets schedule-change language and resolves entities behind strict schemas.
- A **typed commitment graph** represents commitments, time windows, flexibility, stakeholders, provenance, and executable edges including `REQUIRES_PREPARATION`, `REQUIRES_BUFFER`, and `DELEGATABLE_TO`.
- Deterministic engines own propagation, Global Slack, planning, and policy. Gemini never performs schedule arithmetic, authorizes a tool, or declares success.
- A Firestore-backed **action ledger** persists intent before execution, uses idempotency keys and transactional claims, and separates execution from verification.
- Every mutation is verified by re-reading its target; an optimistic tool response never becomes internal truth by itself.
- The deployed boundary is one **Cloud Run** service using Vertex AI, Firestore, and a real service-account-managed **Google Calendar**. The Next.js judge console is hosted on Vercel and labels each run `LIVE CLOUD`, `DETERMINISTIC EVIDENCE`, or `CLOUD UNAVAILABLE`.
- An optional, separately deployed **Gemma 3n** Cloud Run service transcribes short user voice notes. It returns only text and has no tool credentials; its transcript is untrusted and owner-scoped before entering the same Dira safety pipeline. Mention it as live only after end-to-end evidence is included in the demo; call it GPU-backed only if a GPU revision is actually deployed.

## What makes it autonomous instead of a chatbot

The user does not prompt Dira through each repair. A change enters the system, then Dira propagates the impact, derives candidate plans from current state, selects only policy- and provenance-approved actions, survives partial failure, and verifies the resulting world state. It stops when authorization or availability is insufficient.

**Models interpret. Engines decide. Ledgers remember. Verifiers believe.**

## Evidence boundary

The live-cloud demo uses Gemini on Vertex AI, Cloud Run, Firestore, and real Google Calendar mutations with independent verification reads. Recruiter availability/booking, organization-task ownership, and the notification outbox are deliberately labeled **controlled Firestore integrations**. The outbox is not presented as consumer Gmail delivery; the demo trigger is not presented as a live Gmail Watch/Pub/Sub integration.

The repository also includes a credential-free deterministic replay, an eight-scenario variation matrix, property/chaos tests, and 20 consecutive replays with zero duplicate mutations and zero policy violations. Those prove the engine separately from the live-cloud side effects.

## Challenges we ran into

The difficult part was not producing a plan—it was ensuring the plan could act safely when the world changed mid-execution. A booking can fail after the planner reads availability, and a worker can stop after a tool succeeds but before it records success. Dira therefore persists intent before execution, re-reads external state after every write, invalidates failed options, and replans from the new world state.

We also treated email-like inputs as hostile. Model outputs must pass a strict schema, resolve to an existing commitment, satisfy sender authority, meet a confidence threshold, carry action provenance, and pass deterministic policy. No untrusted text or model output can widen the agent's authority.

## Accomplishments that we're proud of

- A full autonomous repair loop with a visible `409 → OBSERVE → REPLAN → VERIFY → RESOLVED` recovery sequence.
- Deterministic authority boundaries: the model can interpret, never authorize.
- A durable action ledger, idempotent execution, independent verification, and crash-resume coverage.
- 77 tests across unit, integration, property, replay, and chaos suites.
- A credential-free canonical replay with 18/18 assertions, eight runtime variations, and 20/20 injected-failure recovery runs.
- A judge-controlled dashboard that honestly distinguishes live cloud from deterministic evidence.
- A proof-carrying repair receipt that turns a run's diff, recovery, candidate rationale, and verification evidence into an auditable user outcome.

## What we learned

Autonomy is earned by the unglamorous parts: explicit permissions, provenance, idempotency keys, fresh verification reads, failure handling, and a visible safe-stop condition. The LLM is valuable where language is ambiguous; the agent's authority and correctness should remain falsifiable.

## What's next

We will add Gmail OAuth/Workspace delivery, LMS and production recruiting connectors, multi-user negotiation, and a longer-horizon commitment model. Gemma 3n voice intake is implemented as an optional private capture path; the next step is to collect end-to-end deployment evidence and add a photo-based official-notice workflow with the same gates.

## Built with

TypeScript · Google GenAI SDK · Gemini 3.5 Flash · Vertex AI · Cloud Run · Firestore · Google Calendar API · Next.js · Vercel · Zod · fast-check · Vitest

---

# Part 2 — final demo video

**Target duration:** 3:35–3:50. Keep `LIVE CLOUD` visible throughout the uncut workflow. Do not show Gemma in this recording.

## Tabs to prepare

1. [Dira home](https://dira-phi.vercel.app)
2. [Dira Interventions](https://dira-phi.vercel.app/interventions)
3. [Cloud Run — dira-orchestrator](https://console.cloud.google.com/run/detail/us-central1/dira-orchestrator?project=dira-agentic-2026)
4. [Cloud Logging](https://console.cloud.google.com/logs/query?project=dira-agentic-2026)
5. [Firestore data](https://console.cloud.google.com/firestore/databases/-default-/data?project=dira-agentic-2026)
6. Google Calendar with **Dira Demo — Sam Adeyemi** added and visible.
7. [Architecture diagram](https://github.com/Jeremiah-Sakuda/Dira/blob/main/docs/architecture/dira-production.svg)

## Recording script

### 0:00–0:16 — problem

**Screen:** Dira home. Show the moved midterm, impacted commitments, and `LIVE CLOUD`.

> “A professor moves a midterm from Friday to Wednesday. For a student balancing classes, recruiting, and a team commitment, that one change can break the whole week. The interview buffer disappears, there is not enough study time, and a team deliverable becomes risky. A calendar can show those conflicts. Dira repairs them.”

### 0:16–0:30 — live Google Cloud proof

**Screen:** Briefly show Cloud Run, then return to Dira.

> “This is a live Google Cloud deployment. Gemini on Vertex AI interprets the change, Firestore persists the workflow and its action ledger, and Dira makes and independently verifies real Google Calendar changes.”

### 0:30–0:48 — before-state and trigger

**Screen:** Google Calendar before-state, then Dira Interventions with `LIVE CLOUD` and **48-Hour Shock** selected.

> “Here is the week before the change: study blocks and an interview can coexist. I’m selecting the 48-Hour Shock. This does not retrieve a prewritten answer—it changes the world state. From this point, Dira must derive a repair from the commitments, dependencies, availability, and permissions it finds.”

**Click:** **Trigger change and repair plan**.

### 0:48–2:22 — uncut live workflow

**Screen:** Keep the live flight recorder visible. Speak slowly; give the workflow room to be legible.

> “First, Gemini extracts the professor’s schedule change through a strict schema. It interprets language, but it does not authorize actions.
>
> Dira propagates the consequences through the stored commitment graph. The moved midterm affects study capacity, the interview recovery buffer, and the team task. Global Slack falls from positive four-point-one hours to negative three-point-six hours: this week is no longer feasible.
>
> Dira evaluates candidate repairs, but deterministic policy limits what it may do. It can only use an approved interview slot, delegate only to the designated backup, and move only flexible personal blocks.
>
> The first listed interview slot is deliberately stale. Dira attempts the permitted booking and receives a 409 conflict. It does not pretend the action succeeded, and I do not step in. It refreshes the world state, invalidates the failed option, and replans.
>
> It finds the remaining authorized interview slot, delegates visual QA to the designated backup, rebuilds the study plan, and then verifies every mutation by reading the targets back. A successful tool call is not enough.
>
> The repair is resolved with positive one-point-three hours of slack and zero human actions after the trigger.”

### 2:22–2:37 — the proof-carrying repair receipt

**Screen:** Stay on Dira's resolved outcome. Reveal the **Proof-carrying repair receipt** and point across **Protected**, **Changed**, **Recovered**, and **Verified**. Open **Why not the other repair options?** for one beat if a rejected candidate is present.

> “This is Dira's repair receipt. In one screen, it shows what it protected, what it changed, the failed action it recovered from, and what it re-read to verify the result. Expand this line and you can see why the other options were rejected. Agents usually give you an answer. Dira gives you the proof needed to trust a repair.”

### 2:37–3:08 — prove outcomes

**Screen:** Calendar before/after, then Firestore booking, organization task, action ledger ending `VERIFIED`, and outbox. Keep the workflow ID visible when possible.

> “Here is the real Calendar before-and-after. The interview and study plan changed, and Dira independently verified them. The recruiter booking, organization task, and notification outbox are controlled Firestore integrations, clearly labeled as test doubles. This action-ledger record for the same workflow ends in VERIFIED.”

**On-screen lower third:**

```text
REAL: Vertex AI · Cloud Run · Firestore · Google Calendar
CONTROLLED: recruiter availability · organization task · notification outbox
```

### 3:08–3:20 — safe counterfactual

**Screen:** A separately captured **No slots available** run, clearly labeled `COUNTERFACTUAL RUN`.

> “When I remove every approved interview slot, Dira stops safely rather than fabricating an appointment. A different world produces a different plan.”

**On-screen caption:** `NO APPROVED SLOT → SAFE STOP, NOT FABRICATED SUCCESS`

### 3:20–3:45 — architecture and close

**Screen:** Architecture diagram, then return to the resolved outcome. Show deterministic replay / CI evidence if it fits without rushing.

> “Gemini interprets. Deterministic systems calculate feasibility, enforce permissions, and choose repairs. Firestore makes retries durable and idempotent. Narrow adapters execute actions, and independent verifiers confirm the world changed.
>
> Dira does not remind you that your week broke. It repairs what changed—safely, visibly, and with proof. One thing changes. Everything adapts.”

## Final recording checklist

- [ ] The run visibly says `LIVE CLOUD`, not `DETERMINISTIC EVIDENCE`.
- [ ] The default run is uncut from trigger through `RESOLVED`.
- [ ] The 409, observe, replan, verify, and positive final slack are readable.
- [ ] Calendar before/after is visible.
- [ ] The workflow ID ties Dira, Cloud Run logs, and the Firestore ledger.
- [ ] The controlled-integration disclosure is spoken and displayed.
- [ ] The video is English, under four minutes, and uploaded **publicly** to YouTube/Vimeo.
- [ ] The video URL is pasted into Part 1 before submitting Devpost.

## Claims to keep precise

- Say **“seeded stale-listing race,”** not “spontaneous live outage.”
- Say **“no human intervention after trigger,”** not “no human action.”
- Say **“controlled Firestore integrations”** for recruiter, organization, and outbox—not production third-party connectors or Gmail delivery.
- Do not call Gemma GPU-backed. It currently runs on a CPU fallback and should not appear in this video without a real voice-note-to-safe-outcome capture.
