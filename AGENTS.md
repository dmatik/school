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
   * **Vitest** runs unit and component tests (`src/**/*.{test,spec}.{ts,tsx}`) inside `happy-dom`. This is the **only** test suite that runs in GitHub Actions CI.
   * **Playwright** runs end-to-end browser tests (`e2e/*.spec.ts`) **locally only**. Never add Playwright commands or browser installs to `.github/workflows/`.
   * **Zero Test Pollution**: All Playwright E2E tests **must** create a dedicated, uniquely-named temporary user (`createTestUser('admin')` from `e2e/helpers/auth.ts`) and tear it down in `afterEach`. Never mutate or log in as existing production records (`admin-default`).
4. **Bilingual & RTL Integrity**:
   * The app supports **Hebrew (RTL, default)** and **English (LTR)**.
   * Never hardcode user-facing strings in JSX. Always add translation keys to **both** [`src/locales/he.json`](src/locales/he.json) and [`src/locales/en.json`](src/locales/en.json).
   * Never use physical CSS directions (`left-`, `right-`, `pl-`, `pr-`, `ml-`, `mr-`, `text-left`, `text-right`). Always use logical Tailwind properties: `start-`, `end-`, `ps-`, `pe-`, `ms-`, `me-`, `text-start`, `text-end`.
5. **Shared Components & Storybook Mandate (Zero Code Duplication)**:
   * **Zero Duplication**: Never duplicate UI markup, form controls, modals, cards, badges, or button styles across pages. Every UI element **must** be built using the shared components in [`src/components/ui/`](src/components/ui).
   * **Build Shared First**: If a new UI element, field variant, card layout, or modal pattern is needed, create or extend a shared component in `src/components/ui/` first and consume it across views.
   * **Storybook Single Source of Truth**: Every new or modified shared UI component or variant **must** be added or updated in [`src/stories/`](src/stories) (and documented in [`src/stories/Introduction.mdx`](src/stories/Introduction.mdx)).
   * **Code Review Enforcement**: Every code review **must** verify that no ad-hoc or duplicated UI markup was introduced and that Storybook stories are up to date.

---

## 2. Approved Technology Stack & Conventions

To prevent hallucinated dependencies and architectural mismatches, adhere strictly to the existing stack:

| Layer | Standard In This Project | Strict Rules & What NOT to Do |
| :--- | :--- | :--- |
| **Frontend Framework** | **React 19** + **TypeScript 6** + **Vite 7** | Ref is a standard prop in React 19 (no `forwardRef`). Use functional components and hooks only. |
| **UI Components** | **Radix UI Primitives** + **Tailwind CSS 3.4** + **Storybook 8** | All shared components live in [`src/components/ui/`](src/components/ui) and are cataloged in [`src/stories/`](src/stories). Combine classes using `cn()` from `@/lib/utils`. Never duplicate UI markup; always use shared components and update Storybook. Do not install extra component libraries (MUI, Chakra, AntD). |
| **Icons** | **Lucide React** (`lucide-react`) | Use existing Lucide icons. |
| **State & HTTP** | React Hooks (`useState`, `useEffect`) + Native `fetch` | No Axios, Redux, or TanStack Query. Use native `fetch` with `Authorization: Bearer ${token}`. |
| **Dates** | **`date-fns` v3** (`format`, `parseISO`, `addDays`, `he`/`enUS` locales) | Do not install `moment` or `dayjs`. |
| **Backend API** | **Express 5** (`server/index.js`) | Express 5 handles rejected Promises natively. Routes are proxied from Vite via `/api` to port 3001. |
| **Database** | **Better-SQLite3** (`server/db.js` $\rightarrow$ `data/school.db`) | **SYNCHRONOUS API ONLY**: `db.prepare(...).run()`, `.get()`, `.all()`. Never write `await db...`. All queries must use parameterized bindings (`?`). |
| **Authentication** | **JWT** (`jsonwebtoken`) + **Bcrypt** (`bcryptjs`) + **WebAuthn** (`@simplewebauthn`) | Passwords hashed with salt 10. Sessions verified via Bearer tokens. |
| **PWA** | `vite-plugin-pwa` | Web app manifest with standalone display, RTL support, and mobile icons in `public/`. |

---

## 3. Directory Layout & Key Entry Points

* `src/`: React 19 application
  * `src/components/`: Primary application views (`IncidentsPage`, `HomeworkPage`, `ExamsPage`, `SchedulePage`, `SettingsPage`, `AdminPage`, `AccountPage`, `LoginView`, `LanguageSwitcher`, `ModeToggle`).
  * `src/components/ui/`: Shared UI components & Radix primitives styled with Tailwind (`SectionCard`, `Modal`, `ConfirmModal`, `FilledInput`, `FilledTextarea`, `IconInput`, `CounterField`, `ReadOnlyPillField`, `TimePresetInput`, `Button`, `EditButton`, `DestructiveButton`, `SyncButton`, `LogoutButton`, `FloatingActionButton`, `PageHeader`, `Header`, `Sidebar`, `Dock`, `LiquidTabs`, `ChildBadge`, `StatusBadge`, `DateBadge`, `SubjectIconBadge`, `UserAvatar`, `ColorSwatchPicker`, `HomeworkCard`, `IncidentCard`, `ExamCard`, `AdminUserRow`, `ScheduleTable`, `EmptyStateCard`, `InfoBox`, `SectionDateHeader`, `Separator`, etc.).
  * `src/stories/`: Storybook 8 component catalog (`1-fields-and-inputs/`, `2-buttons-and-nav/`, `3-badges-and-pickers/`, `4-surfaces-and-cards/`, `Introduction.mdx`).
  * `src/locales/`: Localization files (`he.json` and `en.json`).
  * `src/lib/`: Utilities (`cn`, `uuidv4`, `webauthn.ts`, `image.ts`).
  * `src/types.ts`: TypeScript interfaces (`User`, `Incident`, `HomeworkItem`).
* `server/`: Node.js Express 5 backend
  * `server/index.js`: Express REST API endpoints, JWT auth middleware, WebAuthn passkey routes, incidents/homework endpoints.
  * `server/db.js`: Better-SQLite3 initialization (`initDb()`), WAL mode, schema declarations, default admin seeder.
* `data/`: SQLite database storage (`school.db`, `school.db-wal`, `school.db-shm`).
* `e2e/`: Local Playwright test suites (`auth.spec.ts`, `navigation.spec.ts`).
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

---

## 5. Available Subagents & Roles

Whenever delegating specialized tasks, use these exact role names:
* **`frontend-uiux-expert`** (or `ui-ux-designer`): UI/UX design expert specializing in modern clean aesthetics, shared `src/components/ui/` components, Storybook catalog (`src/stories/`), zero UI duplication, visual hierarchy, polished typography, compact density, micro-interactions, and bilingual RTL/LTR ergonomics.
* **`backend-db-expert`**: Node.js & Better-SQLite3 expert specializing in Express 5 REST APIs, synchronous database access, schema migrations, and secure data scoping.
* **`red-team-expert`** (or `red-team-reviewer`): Adversarial security researcher that stress-tests architectures, probes for exploit vectors (DoS, XSS, auth bypasses, timing attacks, data loss), and audits edge-case resilience.
* **`code-reviewer-architecture`**: Blue Team reviewer focused on architecture, stack compliance (React 19, Radix UI, Express 5, Better-SQLite3), shared component reuse (zero code duplication), type safety, lifecycle performance, and clean code.
* **`code-reviewer-ui-testing`**: Blue Team reviewer focused on UI/UX, shared Storybook component compliance (`src/components/ui/` & `src/stories/`), bilingual i18n completeness (`he.json` + `en.json`), RTL Tailwind compliance, and Vitest/Playwright test discipline and isolation.
* **`test-engineer`**: Writes and maintains Vitest component tests and Playwright E2E test suites with strict temporary user isolation and cleanup.
* **`fullstack-engineer`**: Builds end-to-end features adhering to the project's exact stack (React 19, shared `src/components/ui/` & Storybook, Express 5, Better-SQLite3) with zero code duplication.

### Tri-Agent Code Review Protocol (2 Blue Team + 1 Red Team)
Whenever the user requests a code review ("perform code review", "review this PR/branch"), **always** dispatch all three subagents in parallel as defined in [`.agents/rules/code-review-strategy.md`](.agents/rules/code-review-strategy.md):
1. **`code-reviewer-architecture`** (Blue Team: Architecture, Shared Components / Zero Duplication, Backend, Types & Performance)
2. **`code-reviewer-ui-testing`** (Blue Team: UI/UX, Storybook Catalog Sync, Bilingual i18n, RTL & Test Discipline)
3. **`red-team-reviewer`** (Red Team: Adversarial Security, Penetration Testing & Edge Cases)

Synthesize the three evaluations into a unified, actionable report covering architecture, UI/i18n/test compliance, security, and edge-case resilience.

---

## 6. Verification Commands

Before completing any task, always verify your changes:
```bash
# 1. Typecheck & Build
npm run build

# 2. Linting
npm run lint

# 3. Unit & Component Tests (Vitest)
npm test

# 4. Local E2E Tests (Playwright)
npm run test:e2e
```

