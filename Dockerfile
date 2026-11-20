# Production image: one container runs Fastify, which serves /api and the built React app.
# Build:  docker compose build    Run:  docker compose up -d

# --- 1. Build the web app to static files ---
FROM node:24-alpine AS web-build
WORKDIR /web
# Deps first so source edits don't trigger reinstall.
COPY web/package.json web/package-lock.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

# --- 2. Server production dependencies only ---
FROM node:24-alpine AS server-deps
WORKDIR /app
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev

# --- 3. Runtime: no build tools, no dev deps, non-root ---
FROM node:24-alpine AS app
ENV NODE_ENV=production \
    STATIC_DIR=/app/public
WORKDIR /app
COPY --from=server-deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node server/package.json ./
COPY --chown=node:node server/src ./src
COPY --from=web-build --chown=node:node /web/dist ./public
USER node
EXPOSE 3000
CMD ["node", "src/server.ts"]
