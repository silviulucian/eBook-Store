# AI-assisted workflow, and what still needs you

This file maps the assignment checklist to what exists in the repo, and is explicit about the parts that
could not be done by the assistant that generated this code.

## Checklist status

| Requirement | Status | Notes |
| --- | --- | --- |
| Database: PostgreSQL | Done | [`db/schema.sql`](../db/schema.sql), verified on PostgreSQL 18.6 |
| Data model from wireframes (manual) | **Needs you** | [`data-model.md`](data-model.md) is a *draft inferred from the screens*, not from your wireframes. Compare and adjust. |
| UI via vibe coding with IBM Bob | Done by Bob | Prompts below |
| OpenAPI spec | Done | [`openapi/openapi.yaml`](../openapi/openapi.yaml), validated and checked against routes |
| AI-augmented backend services (Bob) | Done by Bob | `lib/*`, `app/api/*` |
| AI test-case generator (ICA agent) | **Needs you** | See below. Hand-written tests exist; ICA output is not included. |
| Local deployment | Done | Verified: dev server, production build, Playwright E2E |
| Cloud deployment (ROSA / ROKS) | **Needs you** | Manifests provided, never run against a cluster |
| PR on personal GitHub, manager access | **Needs you** | No remote is configured in this repo |
| Video walkthrough | **Needs you** | Outline below |

## Prompts used with IBM Bob (for your write-up)

1. "Fresh Next.js project. Build an ebook store with mocked auth, catalogue, payment and purchase confirmation on PostgreSQL."
2. Bob read the bundled Next.js 16 docs (`node_modules/next/dist/docs`, as `AGENTS.md` instructs) before writing code, which mattered: `proxy.ts` replaces `middleware.ts`, `cacheComponents` requires `<Suspense>` around request-time reads, and `params`/`searchParams` are promises.
3. Backend first (schema, services, route handlers), smoke-tested with curl, then OpenAPI, then UI, then tests.

## ICA test case generation (you run this)

Use the ICA agent **API Testcase generator** with `openapi/openapi.yaml` as input, and optionally
**Test case generator for React** against `components/`. Suggested checks on its output:

- Cases for 401 (no session), 402 (declined), 409 (already paid / already owned), 422 (validation), 429 (rate limit).
- Ownership cases: user B must get 404 for user A's order.
- Mock cards from the spec header: `4242...` succeeds, `4000...0002` declines.

Save the generated cases under `tests/ica/` and mention in the PR which were kept, changed or rejected.
Existing hand-written coverage you can compare against: `tests/unit`, `tests/integration`, `tests/components`, `e2e`.

## Video outline

1. Wireframes -> data model (your manual step) -> `db/schema.sql`.
2. Prompting Bob for backend + UI; show the Next.js docs lookup.
3. OpenAPI spec and `npm run openapi:validate`.
4. ICA test generation.
5. `npm test`, `npm run test:e2e`, then the purchase flow in the browser.
6. Deployment (local, then OpenShift if you have access) and the PR.
