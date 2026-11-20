# One Dockerfile, one target per container. compose.yaml picks the target with `build.target`.
# Build:  docker compose build    Run:  docker compose up -d

# --- Web app -> static files (served by the gateway) ---
FROM node:24-alpine AS web-build
WORKDIR /web
# Deps first so source edits don't trigger reinstall.
COPY web/package.json web/package-lock.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

# --- Shared runtime base for the Node services: no build tools, non-root ---
FROM node:24-alpine AS service-base
ENV NODE_ENV=production
WORKDIR /app
EXPOSE 3000
CMD ["node", "src/server.ts"]

# --- Auth service ---
FROM service-base AS auth
COPY --chown=node:node services/auth/package.json services/auth/package-lock.json ./
RUN npm ci --omit=dev
COPY --chown=node:node services/auth/src ./src
USER node

# --- Books service ---
FROM service-base AS books
COPY --chown=node:node services/books/package.json services/books/package-lock.json ./
RUN npm ci --omit=dev
COPY --chown=node:node services/books/src ./src
USER node

# --- Gateway: Caddy reverse proxy + the built web app ---
FROM caddy:2-alpine AS gateway
COPY gateway/Caddyfile /etc/caddy/Caddyfile
COPY --from=web-build /web/dist /srv
