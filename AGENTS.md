# Antigravity AI Agent Guidelines — `school`

Welcome to `school`. This document serves as the primary project-level instruction manual for all AI agents operating in this repository. Follow these guidelines strictly on every task.

---

## 1. Non-Negotiable Operational Boundaries

1. **Never Commit or Push Autonomously**:
   * **DO NOT** run `git commit`, `git push`, or alter remote branches unless the user gives an explicit, direct command in the current turn (e.g., "commit and push").
   * Keep all file changes local and uncommitted until instructed otherwise.
2. **Never Push Directly to `main` (Always Use Side Branches)**:
   * **DO NOT** push commits directly to the `main` branch under any circumstances.
   * Always create and work on a dedicated side branch (e.g., `feature/<name>`, `fix/<name>`, `chore/<name>`).
   * When instructed by the user to commit and push, always push to the side branch and open a Pull Request.
3. **Testing & Runner Discipline**:
   * **Jest** runs all unit and component tests: `server/__tests__/*.test.ts` (Node ESM) and `app/__tests__/*.test.{ts,tsx}` (`jest-expo` + `@testing-library/react-native`). This is the **only** test suite that runs in GitHub Actions CI.
   * **Playwright** (`e2e/*.spec.ts`) and **Maestro** (`app/.maestro/`) run **locally only** against isolated ephemeral SQLite databases. Never add Playwright or Maestro commands to `.github/workflows/`.
   * **Zero Test Pollution**: All Playwright E2E tests **must** create a dedicated, uniquely-named temporary user (`createTestUser('admin')` from `e2e/helpers/auth.ts`) and tear it down in `afterEach`. Never mutate or log in as existing production records (`admin-default`).
4. **Bilingual & RTL Integrity**:
   * The app supports **Hebrew (RTL, default)** and **English (LTR)**.
   * Never hardcode user-facing strings in JSX. Always add translation keys to **both** [`shared/locales/he.json`](shared/locales/he.json) and [`shared/locales/en.json`](shared/locales/en.json).
   * Respect logical layout and `useDirection()` (`flexRow`, `textAlign`, `writingDirection`) across mobile and web viewports.
5. **Shared Components & Storybook Mandate (Zero Code Duplication)**:
   * **Zero Duplication**: Never duplicate UI markup, form controls, modals, cards, badges, or button styles across screens. Every UI element **must** be built using the shared components in [`app/src/components/ui/`](app/src/components/ui).
   * **Storybook Single Source of Truth**: New or modified shared UI components or variants **must** be cataloged in React Native Storybook ([`app/src/stories/`](app/src/stories)).

---

## 2. Approved Technology Stack & Conventions

To prevent hallucinated dependencies and architectural mismatches, adhere strictly to the existing stack:

| Layer | Standard In This Project | Strict Rules & What NOT to Do |
| :--- | :--- | :--- |
| **Frontend Framework** | **Expo (React Native 0.88 + React 19 + TypeScript 6)** | Single cross-platform codebase in `app/` for iOS, Android, and Web (`expo export -p web` co-hosted by `server/index.js`). |
| **UI Components** | **React Native + Lucide React Native + RN Storybook** | Shared components live in [`app/src/components/ui/`](app/src/components/ui) and stories in [`app/src/stories/`](app/src/stories). |
| **Icons** | **Lucide React Native** (`lucide-react-native`) | Use existing Lucide icons. |
| **State & HTTP** | React Hooks + `apiFetch` (`app/src/lib/api.ts`) | Native `fetch` with `Authorization: Bearer ${token}`. |
| **Dates** | **`date-fns` v4** (`format`, `parseISO`, `addDays`, `he`/`enUS` locales) | Do not install `moment` or `dayjs`. |
| **Backend API** | **Express 5** (`server/index.js`) | Express 5 handles rejected Promises natively. Serves co-hosted Expo Web static bundle from `app/dist`. |
| **Database** | **Better-SQLite3** (`server/db.js` $\rightarrow$ `data/school.db`) | **SYNCHRONOUS API ONLY**: `db.prepare(...).run()`, `.get()`, `.all()`. Never write `await db...`. All queries must use parameterized bindings (`?`). |
| **Authentication** | **JWT** (`jsonwebtoken`) + **Bcrypt** (`bcryptjs`) + **WebAuthn** (`@simplewebauthn`) | Passwords hashed with salt 10. Sessions verified via Bearer tokens. |
| **PWA** | `vite-plugin-pwa` | Web app manifest with standalone display, RTL support, and mobile icons in `public/`. |

---

## 3. Directory Layout & Key Entry Points

* `app/`: Expo (iOS, Android, and Web) React Native application
  * `app/src/screens/`: Primary application screens (`IncidentsScreen`, `HomeworkScreen`, `ExamsScreen`, `ScheduleScreen`, `SettingsScreen`, `AdminScreen`, `AccountScreen`, `LoginScreen`).
  * `app/src/components/ui/`: Shared UI components (`SectionCard`, `Modal`, `FullScreenModal`, `ConfirmModal`, `FilledInput`, `FilledTextarea`, `IconInput`, `CounterField`, `ReadOnlyPillField`, `TimePresetInput`, `Button`, `EditButton`, `DestructiveButton`, `SyncButton`, `FloatingActionButton`, `PageHeader`, `MobileHeader`, `AppSidebar`, `LiquidDock`, `LiquidTabs`, `ChildBadge`, `StatusBadge`, `SubjectIconBadge`, `UserAvatar`, `ColorSwatchPicker`, `HomeworkCard`, `IncidentCard`, `ExamCard`, `AdminUserRow`, `ScheduleTable`, `EmptyStateCard`, `InfoBox`, `SectionDateHeader`, etc.).
  * `app/src/stories/`: React Native Storybook component catalog.
  * `app/src/lib/`: Utilities (`api.ts`, `colors.ts`, `dateUtils.ts`, `homeworkUtils.ts`, `passkey.ts`, `schedulePdf.ts`, `storage.ts`, `subjectIcons.ts`).
  * `app/__tests__/`: Jest (`jest-expo`) unit and component tests.
* `shared/`: Shared TypeScript types, localization files (`he.json`, `en.json`), palettes, WebAuthn P-256 helpers, and shared schedule PDF generator
* `server/`: Node.js Express 5 backend
  * `server/index.js`: Express REST API endpoints, JWT auth middleware, WebAuthn passkey routes, incidents/homework/exams/schedule endpoints, and static serving of `app/dist`.
  * `server/db.js`: Better-SQLite3 initialization (`initDb()`), WAL mode, schema declarations, default admin seeder.
  * `server/__tests__/`: Jest Node ESM backend & shared-module tests.
* `data/`: SQLite database storage (`school.db`, `school.db-wal`, `school.db-shm`).
* `e2e/`: Local Playwright test suites (`auth.spec.ts`, `navigation.spec.ts`, `schedule.spec.ts`) running against the co-hosted Expo Web build.
  * `e2e/helpers/auth.ts` & `test-user.ts`: Utilities for isolated test user creation and automatic teardown.

---

## 4. Skills & Runbooks

Specialized skills are available in `.agents/skills/`:
* `feature-dev`: Step-by-step procedure for building full-stack features (schema $\rightarrow$ API $\rightarrow$ i18n $\rightarrow$ shared UI & Storybook $\rightarrow$ tests).
* `tri-agent-dev`: Tri-agent development framework (Frontend UI/UX, Backend/DB, and Red Team experts).
* `ui-ux-design`: Modern clean UI/UX standards, shared Storybook component catalog, design tokens, compact typography hierarchy, micro-interactions, and bilingual RTL/LTR guidelines.
* `code-review`: Security, architecture, shared component/Storybook enforcement, and regression inspection checklist.
* `test-writing`: Recipes for Vitest component tests and Playwright E2E tests.
* `db-migration`: Safe SQLite schema migrations with WAL mode and foreign keys.
* `devops-github-workflows`: DevOps engineering guide specializing in GitHub Actions workflows, CI/CD pipelines, Docker builds, release automation, and workflow security.

---

## 5. Available Subagents & Roles

Whenever delegating specialized tasks, use these exact role names:
* **`frontend-uiux-expert`** (or `ui-ux-designer`): UI/UX design expert specializing in modern clean aesthetics, shared `src/components/ui/` components, Storybook catalog (`src/stories/`), zero UI duplication, visual hierarchy, polished typography, compact density, micro-interactions, and bilingual RTL/LTR ergonomics.
* **`backend-db-expert`**: Node.js & Better-SQLite3 expert specializing in Express 5 REST APIs, synchronous database access, schema migrations, and secure data scoping.
* **`red-team-expert`** (or `red-team-reviewer`): Adversarial security researcher that stress-tests architectures, probes for exploit vectors (DoS, XSS, auth bypasses, timing attacks, data loss), and audits edge-case resilience.
* **`code-reviewer-architecture`**: Blue Team reviewer focused on architecture, stack compliance (React 19, Radix UI, Express 5, Better-SQLite3), shared component reuse (zero code duplication), type safety, lifecycle performance, and clean code.
* **`code-reviewer-ui-testing`**: Blue Team reviewer focused on UI/UX, shared Storybook component compliance (`src/components/ui/` & `src/stories/`), bilingual i18n completeness (`he.json` + `en.json`), RTL Tailwind compliance, and Vitest/Playwright test discipline and isolation.
* **`code-reviewer-mobile`**: Blue Team reviewer focused on the Expo/React Native mobile app (`mobile/`): Expo SDK & RN stack compliance, `mobile/src/components/` & RN Storybook (`mobile/src/stories/`), safe areas/gestures/reanimated performance, mobile RTL/i18n (`mobile/src/i18n/`), `expo-secure-store` usage, API parity, and Maestro E2E flows (`mobile/.maestro/`).
* **`test-engineer`**: Writes and maintains Vitest component tests and Playwright E2E test suites with strict temporary user isolation and cleanup.
* **`fullstack-engineer`**: Builds end-to-end features adhering to the project's exact stack (React 19, shared `src/components/ui/` & Storybook, Express 5, Better-SQLite3) with zero code duplication.
* **`devops-engineer`**: DevOps expert specializing in GitHub Actions workflows (`.github/workflows/`), CI/CD optimization, workflow security hardening, multi-stage `Dockerfile` builds, and release/Expo OTA automation.

### Four-Agent Code Review Protocol (3 Blue Team + 1 Red Team)
Whenever the user requests a code review ("perform code review", "review this PR/branch"), **always** dispatch all four subagents in parallel as defined in [`.agents/rules/code-review-strategy.md`](.agents/rules/code-review-strategy.md):
1. **`code-reviewer-architecture`** (Blue Team: Architecture, Shared Components / Zero Duplication, Backend, Types & Performance)
2. **`code-reviewer-ui-testing`** (Blue Team: UI/UX, Storybook Catalog Sync, Bilingual i18n, RTL & Test Discipline)
3. **`code-reviewer-mobile`** (Blue Team: Mobile App — Expo/RN Stack, RN Storybook, Safe Areas/Gestures, Mobile i18n/RTL, Secure Store & Maestro)
4. **`red-team-reviewer`** (Red Team: Adversarial Security, Penetration Testing & Edge Cases)

Synthesize the four evaluations into a unified, actionable report covering architecture, UI/i18n/test compliance, mobile app compliance, security, and edge-case resilience.

---

## 6. Verification Commands

Before completing any task, always verify your changes:
```bash
# 1. Typecheck & Build (Expo Web)
npm run typecheck
npm run build

# 2. Linting
npm run lint

# 3. Unit & Component Tests (Jest: server + app)
npm test

# 4. Local E2E Tests (Playwright against Expo Web)
npm run test:e2e
```

### Full Testing Protocol ("run full testing")
Whenever the user asks to **run full testing**, follow [`.agents/rules/testing-strategy.md`](.agents/rules/testing-strategy.md) and run all stages **sequentially, one after another**:
1. `npm test` — Full unit & component tests (Jest: server + app)
2. `npm run test:e2e` — Full Playwright E2E tests
3. `npm run app:ios:maestro` — Build and start the Maestro iOS app on Simulator
4. `npm run test:maestro -- --ios` — Full Maestro E2E tests (iOS only)

At the end, report a short status summary listing each stage with how many tests passed and failed.

