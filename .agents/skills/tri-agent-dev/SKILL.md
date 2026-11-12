---
name: tri-agent-dev
description: Tri-agent collaborative development framework utilizing Frontend UI/UX, Backend/DB, and Red Team experts for feature implementation and review.
---

# Tri-Agent Development Implementation Guide

When implementing major features or architectural refactors in `school`, execute the task using the three expert lenses:

## 1. Subagent Roles

- **Frontend UI/UX Expert (`frontend-uiux-expert`)**:
  - Focus: Modern UI design, React 19 component architecture, shared `src/components/ui/` components, Storybook 8 catalog (`src/stories/`), Tailwind CSS logical RTL/LTR design, bilingual i18n dictionaries (`he.json` & `en.json`).
  - Standard: **Zero UI code duplication** (every modal, section card, input, select, date picker, button, badge, and row must use shared components), mandatory Storybook updates for any new/modified UI component or variant, compact typography, smooth micro-interactions, responsive mobile dock, zero hardcoded user strings.

- **Backend & DB Expert (`backend-db-expert`)**:
  - Focus: Node.js Express 5 API design, Better-SQLite3 synchronous execution (`db.prepare().run()/.get()/.all()`), schema evolution (`initDb()`), JWT/WebAuthn auth, shared family data scoping.
  - Standard: Robust parameter bindings (`?`), transaction safety, strict data scoping and cascade consistency.

- **Red Team Expert (`red-team-expert`)**:
  - Focus: Adversarial threat modeling, authorization bypass checks (e.g. child vs parent permissions), horizontal privilege escalation, data leakage, edge cases.
  - Standard: Prove boundaries cannot be circumvented via direct API manipulation, query parameter tampering, or missing server-side checks.

## 2. Execution Process

1. **Schema & Backend Phase**:
   - Update `server/db.js` with idempotent schema additions.
   - Update `server/index.js` routes, attaching role and parent middleware (`requireAdmin`, `requireParent`).
2. **Types, Shared UI & Storybook Phase**:
   - Update `src/types.ts`.
   - Update `src/locales/he.json` and `src/locales/en.json`.
   - Create or update shared components in `src/components/ui/` and add/update their stories in `src/stories/` (and `src/stories/Introduction.mdx`).
   - Update React views (`AdminPage`, `AccountPage`, `SettingsPage`, `ExamsPage`, `SchedulePage`, `HomeworkPage`, `IncidentsPage`, `App`) using shared components with zero code duplication.
3. **Verification & Attack Validation**:
   - Unit tests (`npm test`).
   - E2E tests (`npm run test:e2e`).
   - Lint & build (`npm run lint && npm run build`).

