# Security & policy boundaries

## Threat model: the inbox is hostile

Emails are untrusted input that can contain instructions aimed at the AI
layer. Defense is layered and — critically — the decisive layers are
deterministic code the model cannot influence:

1. **Structured extraction only.** The interpreter's output must validate
   against a strict zod schema (`InterpretationResultSchema`). Free text
   never reaches the planner.
2. **Structural entity resolution.** A mutation may only reference a stored
   commitment id; anything else is rejected regardless of stated confidence.
3. **Sender authority.** A mutation is only accepted when the sender is a
   stored participant of the commitment or holds domain authority
   (professor → academic, recruiter → career). A perfectly-formed
   "your interview is cancelled" from `spoof@evil.demo` dies here —
   covered by the eval corpus and integration tests.
4. **Confidence gate.** Below-threshold interpretations stop in
   WAITING_REVIEW; nothing executes.
5. **Provenance.** No candidate action is executable without tracing its
   authority to stored evidence (a recruiter-offered slot, a DELEGATABLE_TO
   edge, user policy). Denied unconditionally otherwise (PRD §22).
6. **Policy gate.** Deterministic verdicts; REQUIRE_APPROVAL and DENY can
   never transition into an executable action (property-tested, invariant 6).
7. **Scoped tools.** The agent holds narrow adapters, not credentials. The
   calendar adapter can move events on one calendar; it cannot read email.

An email can therefore *inform* Dira, but the blast radius of a malicious one
is bounded by what a legitimate one could do — and never exceeds the policy
table.

## Credentials

OAuth tokens and API keys live in Secret Manager (production) or environment
variables (local live-model mode); never in Firestore, never in the repo.
The default replay needs no credentials at all.

## Auditability (PRD §48)

Every workflow persists: the triggering event, interpreted mutation, impact
records, violations, every candidate plan with its rejection reason, policy
verdicts per action, ledger transitions with timestamps, external responses,
verification reads, and final feasibility. No hidden chain-of-thought is
logged — only structured, inspectable decisions.
