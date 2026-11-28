---
name: devops-github-workflows
description: DevOps engineering guide specializing in GitHub Actions workflows, CI/CD pipelines, Docker builds, release automation, and workflow security for school. Use when creating, modifying, debugging, optimizing, or auditing .github/workflows/ files, Dockerfile, or release/CI pipelines.
---

# DevOps & GitHub Workflows Engineering Guide

Use this runbook whenever authoring, modifying, auditing, or troubleshooting GitHub Actions workflows, Docker builds, or release automation in `school`.

---

## 1. Repository CI/CD Inventory

| Workflow / File | Trigger | Purpose & Key Steps | Required Secrets / Permissions |
| :--- | :--- | :--- | :--- |
| [`.github/workflows/build-and-test.yml`](../../.github/workflows/build-and-test.yml) | `push` / `pull_request` to `main`, `workflow_dispatch` | Node 22, dual `npm ci` (root + `app`), `typecheck`, `lint`, `npm test` (Jest), `npm run build` (Expo Web). | `permissions: contents: read` |
| [`.github/workflows/full-testing.yml`](../../.github/workflows/full-testing.yml) | `workflow_dispatch` (on-demand only) | Sequential 4-stage full test suite: Jest (`ubuntu-latest`) → Playwright E2E (`ubuntu-latest`) → Maestro iOS Release build & E2E (`macos-15`) → `$GITHUB_STEP_SUMMARY` report. | `permissions: contents: read` |
| [`.github/workflows/docker-build.yml`](../../.github/workflows/docker-build.yml) | `workflow_dispatch` | Runs Jest tests, reads version from `package.json`, builds & pushes `dmatik/school:<version>` via Docker Buildx. | `DOCKER_USERNAME`, `DOCKER_PASSWORD`, `contents: read` |
| [`.github/workflows/release.yml`](../../.github/workflows/release.yml) | `workflow_dispatch` (`patch` / `minor` / `major`) | Runs typecheck/lint/Jest, bumps `package.json` + `app/package.json` + `app/app.json`, commits & tags `v<ver>`, creates GitHub Release, pushes Docker `latest` + `<ver>`, then runs `publish-expo` OTA update (`eas-cli update --branch production`). | `DOCKER_USERNAME`, `DOCKER_PASSWORD`, `EXPO_TOKEN`, `contents: write`, `packages: write` |
| [`Dockerfile`](../../Dockerfile) | Invoked by Docker workflows | Two-stage `node:22-alpine` build: builds `app/dist` in builder stage; production stage installs `npm ci --omit=dev` (with `python3 make g++` for `better-sqlite3`, then removes build tools), serves on port `5173`. | `APP_VERSION` build-arg |

---

## 2. Non-Negotiable CI Boundaries for `school`

1. **Jest-Only in GitHub Actions**:
   - **Never** add Playwright (`npm run test:e2e`) or Maestro (`npm run test:maestro`) to `.github/workflows/`. Those run locally only against ephemeral SQLite databases.
   - CI test steps must only run `npm test` (Jest: `server/__tests__/` + `app/__tests__/`).
2. **Dual Lockfile & Node 22 Consistency**:
   - Root and `app/` have separate `package-lock.json` files. Always cache both in `actions/setup-node`:
     ```yaml
     cache: 'npm'
     cache-dependency-path: |
       package-lock.json
       app/package-lock.json
     ```
   - Install deterministically with `npm ci && npm --prefix app ci` (never `npm install` in CI).
   - Keep Node version aligned across workflows and `Dockerfile` (`22` / `node:22-alpine`).
3. **Synchronized Versioning on Release**:
   - Release workflows must keep all three version fields in sync: `package.json` (`version`), `app/package.json` (`version`), and `app/app.json` (`expo.version`).
4. **Native Addon Build Tools in Docker**:
   - `better-sqlite3` compiles native C++ bindings on Alpine. Keep `python3 make g++` installed during `npm ci` and cleaned up (`apk del python3 make g++`) in the final stage to minimize image size and attack surface.

---

## 3. GitHub Actions Best Practices & Security Hardening

Apply these standards to every new or modified workflow:

1. **Least-Privilege `permissions:`**:
   - Declare top-level `permissions: contents: read` by default.
   - Grant elevated scopes (`contents: write`, `packages: write`, `id-token: write`, `pull-requests: write`) **only** on the specific job that requires them.
2. **Prevent Script Injection**:
   - Never interpolate untrusted expressions (`${{ github.event.pull_request.title }}`, `${{ github.head_ref }}`, `${{ inputs.* }}` of free-text type) directly inside `run:` shell blocks.
   - Pass dynamic values through `env:` and reference them as quoted shell variables (`"$MY_VAR"`).
3. **Concurrency Control**:
   - For PR/push CI workflows (`build-and-test.yml`), use a `concurrency:` group with `cancel-in-progress: true` so superseded commits don't waste runner minutes:
     ```yaml
     concurrency:
       group: ${{ github.workflow }}-${{ github.ref }}
       cancel-in-progress: true
     ```
   - For release, tag, or deploy workflows (`release.yml`, `docker-build.yml`), **never** set `cancel-in-progress: true` (use `cancel-in-progress: false` or omit to prevent half-published releases).
4. **Job Timeouts**:
   - Set `timeout-minutes` on every job (e.g., `15` for CI builds/tests, `25` for Docker/EAS releases) to prevent hung steps from burning runner quota.
5. **Action Pinning & Supply-Chain Hygiene**:
   - Prefer official/verified actions (`actions/*`, `docker/*`).
   - Pin actions to a specific major tag (`@v4`, `@v7`) — or full commit SHA with a version comment for third-party actions in privileged workflows.
   - Never combine `pull_request_target` with checking out untrusted PR head code.
6. **Caching & Fast Feedback**:
   - Order CI steps from fastest to slowest (typecheck → lint → unit tests → build) so failures surface early.
   - For Docker Buildx in CI, consider GHA layer caching (`cache-from: type=gha` / `cache-to: type=gha,mode=max`) when build times grow.
7. **Secrets & Output Hygiene**:
   - Never print secrets or tokens in logs.
   - Use `$GITHUB_OUTPUT` / `$GITHUB_ENV` with quoted values (or heredoc delimiters for multiline values).

---

## 4. Workflow Authoring & Modification Procedure

1. **Inspect Current State**:
   - Read the affected `.github/workflows/*.yml`, `package.json`, `app/package.json`, and `Dockerfile` before editing.
2. **Design Minimal, Composable Jobs**:
   - Keep jobs focused; pass values between jobs via explicit job `outputs:` and `needs:`.
   - Use `workflow_call` for reusable workflows if logic is duplicated across 3+ workflow files.
3. **Validate Locally Before Handing Off**:
   - **YAML syntax check** (always run):
     ```bash
     python3 -c "import yaml, glob; [yaml.safe_load(open(f)) for f in glob.glob('.github/workflows/*.yml')]; print('All workflow YAML files parsed cleanly')"
     ```
   - **Static workflow linting** (if `actionlint` is installed):
     ```bash
     actionlint
     ```
   - **Local CI parity check** (when CI commands change):
     ```bash
     npm run typecheck && npm run lint && npm test && npm run build
     ```
   - **Docker build verification** (when `Dockerfile` or Docker workflow build-args change):
     ```bash
     docker build --build-arg APP_VERSION=0.0.0-test -t school:local-test .
     ```

---

## 5. Debugging Failed GitHub Actions Runs

When diagnosing a failing workflow run (via `gh run list` / `gh run view <run-id> --log-failed` or pasted logs):

1. **Trigger / Permissions Errors (`403`, `Resource not accessible by integration`)**:
   - Check job-level `permissions:` and repository branch protection rules (e.g., `release.yml` pushing commits/tags to `main`).
2. **Dependency / Lockfile Failures (`npm ci` mismatch)**:
   - Verify both `package-lock.json` and `app/package-lock.json` are committed and in sync with their `package.json`, and Node version matches `22`.
3. **Native Module Failures (`better-sqlite3` / `node-gyp`)**:
   - Confirm `python3`, `make`, and `g++` are available in the build environment / Alpine stage.
4. **Docker Buildx / Registry Auth Failures**:
   - Check `DOCKER_USERNAME` / `DOCKER_PASSWORD` secrets and `APP_VERSION` build-arg propagation.
5. **Expo OTA Publish Failures (`publish-expo` job)**:
   - Check `EXPO_TOKEN` secret validity, `working-directory: app`, and `eas.json` / `app/app.json` configuration.
6. **Workflow Syntax / Expression Errors**:
   - Validate indentation, `if:` conditions, `needs.<job>.outputs.<key>` declarations, and `${{ ... }}` quoting.
