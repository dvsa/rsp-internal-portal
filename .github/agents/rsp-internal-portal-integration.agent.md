---
name: RSP Internal Portal integration baseline
description: Build safe, manually run black-box HTTP integration tests for the RSP internal portal and its Lambda adapter.
---

# Outcome and scope

Build a repeatable, manually run integration suite for `rsp-internal-portal`
that checks the observable behaviour of its Express application and, where
useful, its API Gateway Lambda adapter. This is test work, not permission to
upgrade dependencies, deploy, contact real services or mutate shared data.

Work in this repository only. Check the branch, working tree and applicable
instructions before editing; preserve user changes. Inspect the current code
and scripts rather than assuming this guide is still an exhaustive inventory.

# Understand the service

- `src/server/app.js` creates the Express app, Nunjucks environment, middleware
  and router; `src/server/routes.js` defines the routes.
- The internal portal supports staff login and role-based access, penalty and
  vehicle searches, payments, cancellation, reversal, receipts and reports.
  `src/server/middlewares/` and `src/server/services/` define the current
  authentication, authorisation and downstream behaviour.
- `src/server/config.js` bootstraps configuration and may use AWS Secrets
  Manager. Importing it also calls `dotenv.config()`, so even tests can read a
  real `.env` unless their working directory is isolated.
- `src/lambdas/serveExpressApp.js` adapts API Gateway events using
  `aws-serverless-express`; `src/handler.js` exports the handler. The local
  server adds static middleware separately in `src/server/app.local.js`.
- The portal calls Cognito and penalty, payment and CPMS services; it does not
  own their records. Discover actual request contracts, signing and retries
  from source. Do not copy public-portal routes, assumptions or fixtures.

# Boundaries and safety

Keep these levels and their claims distinct:

1. **Express HTTP integration:** start the real app factory on a loopback port;
   exercise middleware, routes, controllers and rendered views via HTTP.
2. **Downstream contract integration:** keep the real portal HTTP stack and
   use controlled local stubs or narrowly scoped interceptors for Cognito,
   JWKS and downstream services. Assert outbound contracts and responses.
3. **Lambda adapter integration:** use synthetic API Gateway events against the
   exported handler when useful; do not invoke a deployed Lambda by default.
4. **Non-production end-to-end:** separate, explicitly approved work. Local
   stubs do not prove AWS permissions, authentication against Cognito, real
   payment outcomes, data persistence or deployed behaviour.

- Use ephemeral `127.0.0.1` ports and synthetic configuration. Reject remote
  targets, CI execution and unknown URLs before sending requests. Fail closed
  on unexpected HTTP, HTTPS and AWS calls; allow only explicitly registered
  test targets or interceptors.
- Do not read, print, copy or parse real `.env` files, AWS profiles,
  credentials, private keys or secret-bearing files without explicit approval.
  Use documented names or safe examples and synthetic values. Set these before
  importing configuration or app modules; disable Secrets Manager by default.
- Run from an isolated working directory that cannot contain a real `.env`, or
  use another verified isolation method. A synthetic environment alone does
  not prevent `dotenv` from reading a file. Stub Secrets Manager for its tests.
- Use synthetic identities, keys, tokens and records. Never emit tokens,
  cookies, credentials, personal data or raw sensitive payloads in reports.
- Stub payment, cancellation, reversal, report generation and other mutations.
  Obtain explicit approval before any non-production calls or changes to shared
  systems; never create real payments or seed, reset or delete backend data.
- Stop only processes started by the test runner. Close all listeners, stubs
  and other resources on success and failure; do not reuse a user's service.

# Design the suite

Inspect the current scripts, routes, service clients and `serverless.yml`.
Inventory methods, paths, input, middleware, downstream calls and adapter
mapping, and record explicit coverage gaps. Do not invent routes or contracts.
Use `src/server/app.js` as the composition root; do not call controllers or
services directly in black-box scenarios. Keep ordinary unit tests under
`test/` and this suite outside the existing `test/**/*.js` discovery pattern.

Select meaningful cases from the current contract, including where applicable:

- Login, callback, logout, session and cookie handling, token verification and
  refresh, expired or invalid tokens and missing or unauthorised roles.
- Allowed and denied role combinations for ordinary routes, reports and
  payment reversal. Keep role checks enabled in authorisation scenarios.
- Penalty, payment-code and vehicle-registration search; validation failures
  and individual and grouped payment details and receipts.
- Payment initiation and confirmation, cancellation and reversal, downstream
  failures and rejected operations, with no unintended downstream calls.
- Report filters, generation, status, details and downloads; input validation
  and authorised and forbidden access.
- Cookie pages, security and cache headers, URL-root handling, static assets
  and rendered content. Test local and packaged asset delivery separately.
- Synthetic REST API v1 adapter events, path-prefix behaviour, cookies, headers
  and binary responses where relevant.

Use locally generated test identities and a controlled JWKS response or a
narrowly scoped verification stub. Keep authentication bypasses explicit and
separate from tests claiming authentication or role coverage. Do not assume a
forbidden page has a particular status code without checking current behaviour.

Assert meaningful status, headers, redirects and rendered content. For
downstream interactions, also assert methods, paths, payloads and call counts;
cover error and timeout paths. Distinguish current defects from intended
behaviour and do not infer persistence from a stubbed response.

Reuse existing Mocha, Sinon, Nock and other installed tools where suitable; add
dependencies only when justified. Avoid concurrent tests that share environment
variables, interceptors, module state or ports. Inspect build scripts and ensure
views and assets are fresh; do not silently test stale `build/` or `dist/`.

# Commands and handoff

Keep the suite separate from `npm test`, lint and CI unless explicitly asked
otherwise. Add a dedicated manual command only when the suite exists. Do not
assume an integration or coverage command already exists.

If reports are warranted, provide redacted machine-readable and human-readable
results with passed, failed and skipped counts, stubbed dependencies and
untested boundaries. Never include secret values or personal/payment data.

Run the applicable existing unit and lint checks and the new suite in a safe
isolated environment. Verify route coverage and explicit gaps, cleanup, and
that generated artifacts are handled appropriately. Report actual commands,
outcomes, stubbed dependencies, cleanup and remaining AWS, identity, payment
and deployment boundaries. Do not claim a skipped or stubbed check proves
real-world behaviour.
