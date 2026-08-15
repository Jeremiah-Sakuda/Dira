#!/usr/bin/env bash
# Deploys the Dira services to Cloud Run (PRD §32).
# Requires: gcloud auth + a project with Cloud Run, Pub/Sub, Firestore,
# Secret Manager and Vertex AI enabled.
set -euo pipefail

PROJECT="${DIRA_PROJECT:?set DIRA_PROJECT}"
REGION="${DIRA_REGION:-us-central1}"

for SERVICE in ingestor orchestrator executor verifier; do
  gcloud builds submit \
    --project "$PROJECT" \
    --tag "$REGION-docker.pkg.dev/$PROJECT/dira/dira-$SERVICE" \
    --file infrastructure/cloud-run/Dockerfile \
    --substitutions "_SERVICE=$SERVICE" .

  gcloud run deploy "dira-$SERVICE" \
    --project "$PROJECT" \
    --region "$REGION" \
    --image "$REGION-docker.pkg.dev/$PROJECT/dira/dira-$SERVICE" \
    --no-allow-unauthenticated \
    --set-env-vars "REPLAY_MODE=production" \
    --set-secrets "GEMINI_API_KEY=dira-gemini-key:latest"
done

# dira-web deploys to Vercel in this build (see DEVIATIONS.md #1):
#   cd apps/web && vercel --prod
