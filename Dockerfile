# ---- Stage 1: Build frontend ----
FROM node:20-slim AS frontend
WORKDIR /build
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

# ---- Stage 2: Build backend ----
FROM node:20-slim AS backend
WORKDIR /build
COPY backend/package*.json ./
RUN npm ci --legacy-peer-deps
COPY backend/ .
RUN npx prisma generate
RUN npm run build
RUN npm prune --omit=dev --legacy-peer-deps

# ---- Stage 3: Production ----
FROM node:20-slim

RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

RUN groupadd --gid 1001 appgroup \
 && useradd --uid 1001 --gid appgroup --shell /bin/bash --create-home appuser

WORKDIR /app

COPY --from=backend --chown=appuser:appgroup /build/node_modules ./node_modules
COPY --from=backend --chown=appuser:appgroup /build/dist       ./dist
COPY --from=backend --chown=appuser:appgroup /build/prisma     ./prisma
COPY --from=frontend --chown=appuser:appgroup /build/dist      ./public

USER appuser

EXPOSE 4000

CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node dist/main.js"]
