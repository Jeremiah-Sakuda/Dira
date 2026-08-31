#!/usr/bin/env bash
# Deploy the optional GPU-backed Gemma 3n audio service. This is intentionally
# separate from dira-orchestrator and can be scaled to zero after the demo.
# Review GPU quota and billing before use.
set -euo pipefail

PROJECT="${DIRA_PROJECT:?set DIRA_PROJECT}"
REGION="${DIRA_GEMMA_REGION:-us-central1}"
SERVICE="dira-gemma-voice"
REPOSITORY="dira"

gcloud builds submit services/gemma-voice \
  --project "$PROJECT" \
  --tag "$REGION-docker.pkg.dev/$PROJECT/$REPOSITORY/$SERVICE"

gcloud run deploy "$SERVICE" \
  --project "$PROJECT" \
  --region "$REGION" \
  --image "$REGION-docker.pkg.dev/$PROJECT/$REPOSITORY/$SERVICE" \
  --allow-unauthenticated \
  --gpu 1 \
  --gpu-type nvidia-l4 \
  --cpu 4 \
  --memory 16Gi \
  --no-cpu-throttling \
  --min-instances 0 \
  --max-instances 1 \
  --set-env-vars "GEMMA_MODEL_ID=google/gemma-3n-E2B-it" \
  --set-secrets "DIRA_GEMMA3N_TOKEN=dira-gemma3n-token:latest,HF_TOKEN=dira-gemma-hf-token:latest"

echo "Set DIRA_GEMMA3N_URL to:"
gcloud run services describe "$SERVICE" --project "$PROJECT" --region "$REGION" --format 'value(status.url)'
