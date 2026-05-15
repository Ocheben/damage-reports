# Build context is the repo root (see docker-compose.yml) so the build can
# reach docs/openapi.yaml — Kubb's input. All COPY paths below are therefore
# relative to the repo root.

FROM node:22-alpine AS deps
WORKDIR /app
# `npm ci` would trigger the postinstall hook, which runs `kubb generate` and
# needs both kubb.config.ts and the spec. We don't have either yet in this
# stage — defer generation to the builder stage where the full tree is present.
COPY client/package.json client/package-lock.json ./
RUN npm ci --ignore-scripts

FROM node:22-alpine AS builder
WORKDIR /app
# NEXT_PUBLIC_* values are inlined into the browser bundle at build time.
ARG NEXT_PUBLIC_API_BASE=http://localhost:8088
ARG NEXT_PUBLIC_API_PUBLIC_TOKEN=local-dev-public-token
ENV NEXT_PUBLIC_API_BASE=$NEXT_PUBLIC_API_BASE
ENV NEXT_PUBLIC_API_PUBLIC_TOKEN=$NEXT_PUBLIC_API_PUBLIC_TOKEN
COPY --from=deps /app/node_modules ./node_modules
COPY client/ ./
# Spec sits one level up in the repo. WORKDIR is /app so kubb's relative
# path "../docs/openapi.yaml" resolves to /docs/openapi.yaml.
COPY docs/openapi.yaml /docs/openapi.yaml
# `npm run build` triggers `prebuild` → `kubb generate` first.
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.mjs ./next.config.mjs
EXPOSE 3000
CMD ["npx", "next", "start", "-p", "3000"]
