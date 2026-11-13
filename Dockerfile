# syntax=docker/dockerfile:1
# Base images come from Red Hat's registry (UBI minimal). Pin a digest in CI for reproducible builds.
# NOTE: pulling from registry.redhat.io requires `podman login registry.redhat.io` (free Red Hat account).

FROM registry.redhat.io/ubi9/nodejs-22-minimal:latest AS build
USER 0
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# `next build` does not need a database: DB access is deferred to request time.
RUN npx next build

FROM registry.redhat.io/ubi9/nodejs-22-minimal:latest AS runtime
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000
WORKDIR /app
COPY --from=build --chown=1001:0 /app/.next/standalone ./
COPY --from=build --chown=1001:0 /app/.next/static ./.next/static
COPY --from=build --chown=1001:0 /app/public ./public
COPY --from=build --chown=1001:0 /app/db ./db
COPY --from=build --chown=1001:0 /app/scripts/db-init.mjs ./scripts/db-init.mjs
# Non-root, arbitrary-UID friendly (OpenShift runs with a random UID in group 0).
USER 1001
EXPOSE 3000
# HOSTNAME must be 0.0.0.0 inside the container so the platform can route to it; the host-side
# publish (compose) and the OpenShift Service/Route restrict who can actually reach it.
ENV HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
