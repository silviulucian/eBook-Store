# Deployment

## 1. Local machine (no containers)

See the README. This is the path that was exercised end to end while building the project
(PostgreSQL 18 from Homebrew, `npm run build && npm start`, Playwright E2E against a production build).

Production-mode check on your machine over plain HTTP:

```bash
npm run build
COOKIE_SECURE=false npm start          # without COOKIE_SECURE=false the Secure cookie is dropped on http://
```

## 2. Local containers (Podman or Docker)

Images come from Red Hat's registry, which needs a (free) Red Hat login:

```bash
podman login registry.redhat.io
export POSTGRES_PASSWORD="$(openssl rand -base64 24 | tr -d '/+=')"
podman compose up --build              # app on http://127.0.0.1:3000
```

Services: `db` (PostgreSQL 16, RHEL9 image) -> `migrate` (applies schema + seed, then exits) -> `app`.
Ports bind to `127.0.0.1` only; containers run non-root, read-only, with all capabilities dropped.

> The container files and OpenShift manifests were written and YAML-validated but **not run** in the
> authoring environment (no Podman/Docker/cluster available). Expect to adjust image tags or probe
> commands on first run, and check the image tag exists for your Red Hat subscription.

## 3. OpenShift (ROSA / ROKS)

```bash
oc new-project ebookstore
PW="$(openssl rand -base64 24 | tr -d '/+=')"
oc create secret generic ebookstore-db  --from-literal=password="$PW"
oc create secret generic ebookstore-app --from-literal=DATABASE_URL="postgresql://ebookstore:$PW@postgres:5432/ebookstore"

# Build and push the image (internal registry shown)
oc new-build --name ebookstore --binary --strategy docker && oc start-build ebookstore --from-dir=. --follow

sed 's#IMAGE#image-registry.openshift-image-registry.svc:5000/ebookstore/ebookstore:latest#' deploy/openshift/app.yaml > /tmp/app.yaml
oc apply -f deploy/openshift/postgres.yaml
oc apply -f /tmp/app.yaml
oc get route ebookstore
```

The Route terminates TLS at the router and redirects HTTP to HTTPS, which is what makes the `Secure`
`__Host-session` cookie work. A `NetworkPolicy` restricts PostgreSQL to the app and migration pods.

## Operational notes

- `GET /api/health` runs `SELECT 1`; used for readiness/liveness.
- Schema changes: `db/schema.sql` is idempotent (`IF NOT EXISTS`) and fine for this demo. For anything real, adopt versioned migrations.
- `db-init.mjs --reset` refuses to run when `NODE_ENV=production`.
- Rotate the database password by updating the Secret and restarting the pods.
