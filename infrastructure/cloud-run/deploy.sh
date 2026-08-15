#!/usr/bin/env bash
# Deploys the Dira services to Cloud Run (PRD §32).
# Requires: gcloud auth + a project with Cloud Run, Cloud Build, Artifact
# Registry, Pub/Sub, Firestore, Secret Manager and Vertex AI enabled, and an
# Artifact Registry docker repo named "dira" in $DIRA_REGION.
set -euo pipefail

PROJECT="${DIRA_PROJECT:?set DIRA_PROJECT}"
REGION="${DIRA_REGION:-us-central1}"

for SERVICE in ingestor orchestrator executor verifier; do
  gcloud builds submit \
    --project "$PROJECT" \
    --config infrastructure/cloud-run/cloudbuild.yaml \
    --substitutions "_SERVICE=${SERVICE},_REGION=${REGION}" \
    .

  gcloud run deploy "dira-$SERVICE" \
    --project "$PROJECT" \
    --region "$REGION" \
    --image "$REGION-docker.pkg.dev/$PROJECT/dira/dira-$SERVICE" \
    --no-allow-unauthenticated \
    --set-env-vars "REPLAY_MODE=live-model" \
    --set-secrets "GEMINI_API_KEY=dira-gemini-key:latest"
done

# dira-web deploys to Vercel in this build (see DEVIATIONS.md #1):
#   vercel deploy --prod
