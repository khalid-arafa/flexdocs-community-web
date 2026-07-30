# Production image for the FlexDocs admin dashboard (Next.js).
# Multi-stage: install deps → build → run `next start` as a non-root user.
# (The old single-stage image ran `npm run dev`; this one ships a real build.)

# ---- deps: install all deps (build needs devDependencies too) --------------
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# ---- builder: compile the production build ---------------------------------
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* vars are inlined into the client bundle at build time, so the
# API origin the dashboard talks to must be supplied as a build arg. Defaults to
# the localhost dev origin; setup.sh / compose pass the real api.<domain>.
ARG NEXT_PUBLIC_API_URL=http://api.localhost
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production
RUN npm run build

# ---- runner: minimal runtime, non-root ------------------------------------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Only what `next start` needs at runtime.
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.mjs ./next.config.mjs

# Run as the unprivileged built-in `node` user, not root.
RUN chown -R node:node /app
USER node

EXPOSE 3000
CMD ["npm", "run", "start"]
