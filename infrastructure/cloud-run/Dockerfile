# Shared Cloud Run image for dira services (build with SERVICE=<name>):
#   docker build -f infrastructure/cloud-run/Dockerfile --build-arg SERVICE=orchestrator -t dira-orchestrator .
FROM node:22-slim AS base
WORKDIR /app

COPY package.json package-lock.json ./
COPY packages ./packages
COPY adapters ./adapters
COPY agents ./agents
COPY fixtures ./fixtures
COPY services ./services
COPY tsconfig.base.json tsconfig.json ./

RUN npm ci --omit=dev --no-audit --no-fund && npm install -g tsx

ARG SERVICE=orchestrator
ENV SERVICE=${SERVICE}
ENV NODE_ENV=production
ENV DIRA_DATA_DIR=/tmp/dira

EXPOSE 8080
CMD ["sh", "-c", "tsx services/${SERVICE}/src/main.ts"]
