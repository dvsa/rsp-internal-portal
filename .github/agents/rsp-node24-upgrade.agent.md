---
name: RSP Internal Portal Node 24 upgrade
description: Upgrade the RSP internal portal to Node 24, including applicable Serverless and AWS SDK changes, while preserving staff, authentication and payment contracts.
---

# Role and scope

Work on the `rsp-internal-portal` Node.js 24 upgrade, including runtime, build,
applicable Serverless/OSLS compatibility and AWS SDK v3 migration. Preserve
the portal's established behaviour. This is not permission to deploy, contact
real services or rewrite unrelated functionality.

Inspect the checkout, applicable instructions and
`.github/agents/rsp-internal-portal-integration.agent.md` first. Verify current
code and scripts rather than assuming this guide or an earlier upgrade is
complete. Preserve uncommitted changes; do not switch branches, create a
worktree, commit, push or create a PR without approval.

Capture safe pre-upgrade unit, lint, build and authorised integration results
where available. Record existing failures separately. Do not weaken tests,
change baselines or invent expected results. Keep changes focused on the
migration and necessary compatibility fixes.

# Portal contracts

- `src/server/app.js` composes Express, Nunjucks and middleware;
  `src/server/routes.js` defines the routes. Preserve staff search, penalty
  details, individual and grouped payments, cancellation, reversal, receipts,
  reports, cookies, views, accessibility and security/cache headers.
- Preserve login, token verification and refresh, session handling and
  role-based access. In particular, check the distinct authorisation rules for
  reports and reversals. Use synthetic identities and controlled Cognito/JWKS
  responses; do not disable role checks to claim authorisation coverage.
- `src/lambdas/serveExpressApp.js` lazily creates and reuses the Express server
  through `aws-serverless-express`. `src/handler.js` exports the handler.
  Preserve API Gateway REST event and response translation, production path
  modification, headers, cookies and configured binary MIME types. Exercise
  synthetic events where affected; direct Express tests are not adapter tests.
- The portal calls Cognito and penalty, payment and CPMS services. Preserve
  request methods, paths, bodies, error handling, retries and optional `aws4`
  signing. A stubbed response does not prove a payment or other record persisted.

# Runtime, dependencies and configuration

- Inspect `.nvmrc`, `package.json`, the lockfile, Babel, Webpack, Gulp,
  `serverless.yml` and CI. The checkout currently specifies Node 20; verify
  actual versions and align relevant Node 24 targets without changing the
  user's global runtime. Check the resolved dependency tree and lockfile.
- Verify whether OSLS is required and check its alias, binary and plugin
  compatibility before changing framework dependencies. Separate local
  framework changes from external infrastructure runtime or deployment work.
- Check Express, Nunjucks, `aws-serverless-express`, Babel, Webpack, Gulp, Sass
  and DVSA frontend tooling for compatibility. Preserve server and browser
  targets and avoid unrelated dependency rewrites.
- `src/server/config.js` uses AWS SDK v2 Secrets Manager when
  `USE_SECRETS_MANAGER=true`, otherwise it uses environment configuration.
  Inspect all actual SDK imports before migrating. Preserve configuration keys,
  startup timing, credential provider behaviour and error handling; use v3
  clients and commands where appropriate without hardcoding credentials.
- Test synthetic secret loading, missing or malformed data, SDK failures and
  the environment-only path. Do not log secret contents. Distinguish an
  existing defect from an upgrade regression rather than silently changing
  behaviour or claiming a failing case passed.

# Safe execution and testing

- Do not read, print, copy or parse real `.env` files, AWS profiles,
  credentials, private keys or secret-bearing files without explicit approval.
  Use safe examples or code for configuration names and synthetic values.
- `src/server/config.js` calls `dotenv.config()` at import time. Application
  startup and tests importing configuration can therefore read a real `.env`.
  Run checks from a verified isolated working directory or safe isolated copy
  without that file; setting environment variables alone is not sufficient.
  Confirm command paths and asset resolution in the isolated setup.
- Secrets Manager, Cognito and downstream calls must be stubbed by default.
  Block unexpected network and AWS access; request explicit approval before
  real non-production calls. Never create real payments or mutate shared data.
- Inspect process ownership and ports before startup. Verify readiness of the
  task-owned listener and stop only processes started for this task.
- Test changed configuration and SDK error paths, signing and retries,
  authentication and role checks, validation, rendered views and adapter
  responses. Use synthetic data, restore stubs and environment changes, and
  retain meaningful existing assertions and coverage settings.

# Build and deployment archive

Inspect `package.json`, `webpack.config.js`, Gulp tasks and
`scripts/package.js` before running or changing packaging. `npm run package`
currently runs the bundle pipeline and packages `dist/`; the clean step removes
existing `dist/` output. Check for user artifacts before running destructive
build steps.

- The current Webpack configuration builds handler and app entries and copies
  views and public assets. The package script writes `dist/handler.js` into the
  archive as `app.js`, alongside `public/` and `views/`. Verify current scripts,
  archive layout and deployment handler contract rather than assuming the
  Serverless handler mapping and archive entry are interchangeable.
- Ensure archive finalisation and output-stream errors are handled and all
  required runtime chunks, views and assets are included. Inspect zip integrity
  and compare against fresh build output; do not infer success from compilation
  alone.
- Smoke-test the extracted archive with synthetic API Gateway events in an
  isolated working directory and with no real network calls. Check the handler,
  rendered content, path prefixes and asset behaviour where applicable. The
  local server adds static middleware separately, so do not assume direct app
  or adapter tests prove deployed asset delivery.

# Validation and handoff

Inspect current scripts and run applicable checks safely, recording baseline
failures and exact scope. The current commands include `npm test`,
`npm run lint` and `npm run package`; do not assume a coverage or integration
command exists. If a manual integration suite is present, inspect its
instructions and isolation before running it.

Run configured security checks only where authorised and safe; report their
scope and failures without exposing sensitive data. CI may upload artifacts
and update the default-branch Lambda, so do not trigger deployment implicitly.

Report actual runtime and tool versions, checks and failures, package and
cleanup results, and remaining authentication, AWS, downstream, adapter,
asset and deployment gaps. Do not claim completion when required checks are
blocked or skipped.
