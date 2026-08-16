#!/usr/bin/env bash
# Deploys Dira's backend to Cloud Run (PRD §32) — one honest service.
#
# The deployed dira-orchestrator runs the full production path: Vertex AI
# Gemini interpretation, Firestore ledger/state, real Google Calendar
# mutations, and the controlled recruiter/org integrations. The executor and
# verifier stages run in-process behind the transactional Firestore ledger
# (DEVIATIONS.md #12); max-instances=1 keeps single-writer semantics until a
# multi-worker split is needed.
#
# Requires: gcloud auth; a project with Cloud Run, Cloud Build, Artifact
# Registry (docker repo "dira"), Firestore (native), Vertex AI, and the
# Google Calendar API enabled; the compute SA holding roles/datastore.user
# and roles/aiplatform.user.
set -euo pipefail

PROJECT="${DIRA_PROJECT:?set DIRA_PROJECT}"
REGION="${DIRA_REGION:-us-central1}"
# Newer Gemini models are served from the global Vertex endpoint, not the
# Cloud Run region.
VERTEX_LOCATION="${DIRA_VERTEX_LOCATION:-global}"
SHARE_WITH="${DIRA_SHARE_CALENDAR_WITH:-}"
ALLOWED_ORIGIN="${DIRA_ALLOWED_ORIGIN:?set DIRA_ALLOWED_ORIGIN to the public dashboard origin}"
SERVICE_ACCOUNT="dira-orchestrator@${PROJECT}.iam.gserviceaccount.com"

gcloud builds submit \
  --project "$PROJECT" \
  --config infrastructure/cloud-run/cloudbuild.yaml \
  --substitutions "_SERVICE=orchestrator,_REGION=${REGION}" \
  .

gcloud run deploy dira-orchestrator \
  --project "$PROJECT" \
  --region "$REGION" \
  --image "$REGION-docker.pkg.dev/$PROJECT/dira/dira-orchestrator" \
  --allow-unauthenticated \
  --service-account "$SERVICE_ACCOUNT" \
  --max-instances 1 \
  --memory 1Gi \
  --set-env-vars "REPLAY_MODE=production,GOOGLE_GENAI_USE_VERTEXAI=true,GOOGLE_CLOUD_PROJECT=${PROJECT},GOOGLE_CLOUD_LOCATION=${VERTEX_LOCATION},DIRA_SHARE_CALENDAR_WITH=${SHARE_WITH},DIRA_ALLOWED_ORIGIN=${ALLOWED_ORIGIN}" \
  --set-secrets "DIRA_DEMO_TOKEN=dira-demo-token:latest"

echo
echo "Service URL:"
gcloud run services describe dira-orchestrator --project "$PROJECT" --region "$REGION" --format 'value(status.url)'

# The Vercel server-side replay proxy uses DIRA_CLOUD_RUN_URL and the same
# DIRA_DEMO_TOKEN. Never expose that token through NEXT_PUBLIC_* variables.
