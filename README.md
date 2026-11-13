# Paperleaf - demo ebook store

Next.js 16 (App Router, Cache Components) + PostgreSQL. Authentication, catalogue, payment and purchase
confirmation are all real code paths, but **payment is mocked**: no card is ever charged and no third-party
service is called.

| Area | Where |
| --- | --- |
| Data model (ER diagram, decisions) | [`docs/data-model.md`](docs/data-model.md), [`db/schema.sql`](db/schema.sql) |
| OpenAPI 3.1 spec | [`openapi/openapi.yaml`](openapi/openapi.yaml) |
| REST API (route handlers) | [`app/api`](app/api), services in [`lib`](lib) |
| UI | [`app`](app), [`components`](components) |
| Tests | [`tests`](tests) (Vitest), [`e2e`](e2e) (Playwright) |
| Deployment | [`docs/deployment.md`](docs/deployment.md), [`Dockerfile`](Dockerfile), [`compose.yaml`](compose.yaml), [`deploy/openshift`](deploy/openshift) |
| AI-assisted workflow + what still needs you | [`docs/ai-workflow.md`](docs/ai-workflow.md) |

## Run locally

Requirements: Node 22.22+ or 24.15+ (see `.nvmrc`), PostgreSQL 15+.

```bash
npm ci
createdb ebookstore && createdb ebookstore_test      # or any two empty databases
cp .env.example .env.local                           # then set real passwords/URLs
npm run db:init                                      # applies db/schema.sql + db/seed.sql
npm run dev                                          # http://localhost:3000
```

`.env.local` is git-ignored. Never commit credentials.

### Try the purchase flow

1. Browse `/books`, open a book, **Add to cart**.
2. **Checkout** (you are sent to register/sign in; 12+ character password).
3. Pay with a mock card (any future expiry, any 3-digit CVC):

| Card | Result |
| --- | --- |
| `4242 4242 4242 4242` | Succeeds, shows confirmation code `PL-XXXXXXXX` |
| `4000 0000 0000 0002` | Declined (order stays pending; retry with another card) |
| `4000 0000 0000 9995` | Insufficient funds |

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js |
| `npm run lint` / `typecheck` | ESLint / `tsc --noEmit` |
| `npm test` | Resets **`TEST_DATABASE_URL`** schema, runs Vitest (unit, PostgreSQL integration, component) |
| `npm run test:e2e` | Builds, resets the test DB, runs Playwright (uses installed Edge; `PW_CHANNEL=chromium` in CI) |
| `npm run openapi:validate` | Validates the spec and checks it matches every route in `app/api` |
| `npm run db:init` / `db:reset` | Apply schema+seed / drop everything and re-apply (dev DB) |

`npm test` and `npm run test:e2e` only ever touch `TEST_DATABASE_URL`.

## Security notes

- Passwords: scrypt with per-password salt; constant-time compare; dummy hash on unknown email to blunt user enumeration.
- Sessions: random 256-bit token in an `HttpOnly`, `SameSite=Lax` cookie (`__Host-` prefix and `Secure` in production). Only a SHA-256 hash is stored server-side; logout deletes it.
- All SQL is parameterised; search input has LIKE wildcards escaped. All input is validated with Zod on the server.
- Prices are always read from the database. Orders are scoped to the signed-in user (other users get 404).
- Card number and CVC are validated in memory and discarded; only brand and last four digits are stored.
- Origin check on state-changing requests, login/register/pay rate limits, `?next=` open-redirect protection, security headers.
- Rate limiting is in-memory per process; use a shared store (e.g. Redis) when running more than one replica.
- Auth/session pieces are intentionally simple for a demo. A real product should use an OIDC/SAML provider and MFA.
