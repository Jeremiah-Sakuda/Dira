# Cloud Run image for dira services (build with SERVICE=<name>):
#   gcloud builds submit --config infrastructure/cloud-run/cloudbuild.yaml \
#     --substitutions _SERVICE=orchestrator .
FROM node:22-slim
WORKDIR /app

COPY . .
RUN npm ci --omit=dev --no-audit --no-fund

ARG SERVICE=orchestrator
ENV SERVICE=${SERVICE}
ENV NODE_ENV=production
ENV DIRA_DATA_DIR=/tmp/dira

EXPOSE 8080
CMD ["sh", "-c", "node_modules/.bin/tsx services/${SERVICE}/src/main.ts"]
