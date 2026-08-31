# Gemma 3n private voice-note intake

This optional Cloud Run GPU service runs `google/gemma-3n-E2B-it` to transcribe
short user voice notes. It is a **transcription boundary**, not an agent: it
cannot read Dira state, access the Calendar, call tools, or authorize actions.

The orchestrator sends an authenticated note to `POST /transcribe`, receives a
transcript, wraps it as a `gemma_voice_note` event, and treats it as untrusted
input. Voice-note mutations are restricted to commitments owned by the recorded
user; all normal strict-schema, sender, confidence, provenance, policy, ledger,
and verification gates still apply.

## Deploy

1. Accept the Gemma terms on Hugging Face and create a read token for the
   account that accepted them. Do not put this token in the repository or chat.
2. Ensure GPU quota in Vertex/Cloud Run for the target project and region. If
   quota is unavailable, deploy the documented CPU fallback (8 vCPU / 32 GiB)
   for functional verification; it has a much slower cold start and is not a
   substitute for GPU demo performance.
3. Create `dira-gemma3n-token` and `dira-gemma-hf-token` in Secret Manager.
4. Run `DIRA_PROJECT=... infrastructure/gemma-voice/deploy.sh`.
5. Set the resulting URL as `DIRA_GEMMA3N_URL` and the same secret as
   `DIRA_GEMMA3N_TOKEN` on `dira-orchestrator`, then redeploy the orchestrator.
6. Call the orchestrator's protected `POST /voice-notes` with a supported
   audio payload. Confirm the Cloud Run structured log records both the Gemma
   3n model/latency and the downstream Gemini/repair run.

The GPU service scales to zero but has a model-loading cold start. Warm it
before filming; turn it off after the demo to control cost. The currently
deployed `dira-agentic-2026` service uses the CPU fallback because Cloud Run L4
quota is not yet allocated; do not describe it as GPU-backed in a submission
until the GPU revision is actually deployed.
