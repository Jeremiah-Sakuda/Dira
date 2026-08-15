#!/usr/bin/env bash
# Pub/Sub topology (PRD §32).
set -euo pipefail
PROJECT="${DIRA_PROJECT:?set DIRA_PROJECT}"

for TOPIC in raw-gmail-events raw-calendar-events normalized-events \
             workflow-actions workflow-observations dead-letter-events; do
  gcloud pubsub topics create "$TOPIC" --project "$PROJECT" || true
done

# Push subscriptions with dead-lettering; redelivery is safe end-to-end
# because every action carries an idempotency key (PRD §26).
gcloud pubsub subscriptions create normalized-events-orchestrator \
  --project "$PROJECT" \
  --topic normalized-events \
  --push-endpoint "${DIRA_ORCHESTRATOR_URL:?set DIRA_ORCHESTRATOR_URL}/events" \
  --dead-letter-topic dead-letter-events \
  --max-delivery-attempts 5 || true
