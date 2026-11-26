# Four-Agent Code Review Strategy (3 Blue Team + 1 Red Team)

When a code review is requested for changes, branches, or PRs in `school`, always execute this four-agent review protocol using 4 parallel subagents: **3 Blue Team reviewers** and **1 Red Team reviewer**.

---

## 1. Four-Agent Subagent Workflow

Whenever the user asks to "do code review", "review this PR/branch", or "review feature", dispatch four subagents in parallel:

```
                               User: "perform code review"
                                            │
    ┌───────────────────────────┬───────────┴───────────┬───────────────────────────┐
    ▼                           ▼                       ▼                           ▼
[Blue Team: Architecture]  [Blue Team: UI & Testing] [Blue Team: Mobile]       [Red Team: Adversarial]
`code-reviewer-architecture` `code-reviewer-ui-testing` `code-reviewer-mobile` `red-team-reviewer`
• Architecture & Patterns  • Shared UI & Storybook   • Expo / RN Stack Rules   • Injection & DDE Attacks
• Zero Code/UI Duplication • Bilingual i18n (he/en)  • RN Shared UI & Stories  • Auth, Session & Data
• React 19 & TS Types      • RTL Compliance          • Safe Area, Gestures     • Crash Probing & Fuzzing
• Backend & DB Sync Rules  • Accessibility & UX      • Mobile i18n & RTL       • DoS & Edge Case Failures
• Performance & Memory     • Vitest & Playwright     • Maestro E2E & Offline   • Boundary Conditions
    │                           │                       │                           │
    └───────────────────────────┴───────────┬───────────┴───────────────────────────┘
                                            ▼
                         Unified Four-Agent Review Synthesis & Verdict
```

### A. Blue Team 1: Architecture & Code Quality Reviewer (`code-reviewer-architecture`)
- **Focus**: System architecture, zero code duplication, shared component reuse, type safety, framework conventions, performance, and clean code.
- **Checklist**:
  1. **Stack Compliance**: Strict adherence to React 19 (functional components, standard ref prop, no forwardRef), TypeScript 6, Vite 7, Radix UI primitives, Express 5, Better-SQLite3 synchronous API.
  2. **Zero Code Duplication & Shared Component Reuse**: Every UI section, modal, form field, button, card, and badge **must** use the shared components in `src/components/ui/` (`SectionCard`, `Modal`, `ConfirmModal`, `FilledInput`, `FilledTextarea`, `IconInput`, `CounterField`, `ReadOnlyPillField`, `TimePresetInput`, `EditButton`, `DestructiveButton`, `SyncButton`, `LogoutButton`, etc.). Flag any inline re-implementation or duplicated markup as a blocker (`CHANGES REQUESTED`).
  3. **Type Safety & Contracts**: Accurate TypeScript interfaces in `src/types.ts` or module exports. No `any` type escapes unless strictly justified.
  4. **Data Access & Scoping**: Parameterized queries (`?`), multi-tenant scoping (`user_id = ?`), WAL mode safety, and proper foreign key cascade definitions.
  5. **Performance & Lifecycle**: Memoization of expensive operations (`useMemo`, `useCallback`), proper hook dependency arrays, clean resource allocation and teardown.

### B. Blue Team 2: UI/UX, Storybook Catalog, Bilingual i18n & Test Integrity Reviewer (`code-reviewer-ui-testing`)
- **Focus**: Shared Storybook component compliance, user experience, internationalization, bidirectional RTL layouts, and testing rigor.
- **Checklist**:
  1. **Shared Storybook Component & Catalog Compliance**: Verify that all UI elements use shared Storybook components from `src/components/ui/` and that any new or modified shared component/variant has a corresponding, up-to-date story in `src/stories/` (and `src/stories/Introduction.mdx`). Reject any raw `DialogContent`/`AlertDialogContent` in pages (must use `Modal`/`ConfirmModal`) or raw unstyled inputs/buttons.
  2. **Bilingual i18n Completeness**: Zero hardcoded strings in JSX or UI. Every label, toast, dialog, and message must exist in *both* `src/locales/en.json` and `src/locales/he.json`.
  3. **Bi-directional & RTL Discipline**: Strictly use logical Tailwind CSS classes (`ps-`, `pe-`, `ms-`, `me-`, `start-`, `end-`, `text-start`, `text-end`). Zero physical directional classes (`pl-`, `pr-`, `ml-`, `mr-`, `text-left`, `text-right`). Pass `dir={i18n.dir()}` to popovers/dropdowns.
  4. **Vitest Unit & Component Coverage**: Validates pure functions, calculation logic, edge inputs, and component state transitions inside `src/`.
  5. **Playwright E2E Isolation**: Tests located strictly in `e2e/`, using isolated temporary users (`createTestUser` and `deleteTestUser`) in `beforeEach`/`afterEach`. Zero pollution of CI workflows or production admin records.

### C. Blue Team 3: Mobile (Expo / React Native) Reviewer (`code-reviewer-mobile`)
- **Focus**: Expo / React Native architecture, cross-platform iOS/Android behavior, mobile shared components & RN Storybook, RTL/i18n, secure storage, and Maestro E2E coverage.
- **Checklist**:
  1. **Expo & React Native Stack Compliance**: Adherence to `mobile/package.json` versions (Expo SDK 58, React Native 0.88, React 19, TypeScript 6), `mobile/AGENTS.md` rules (using `npx expo install`, configuring native behavior in `app.json`/config plugins rather than hand-editing generated native code unnecessarily), and `expo lint` / `tsc --noEmit` cleanliness.
  2. **Mobile Shared Components & RN Storybook**: UI elements in `mobile/src/screens/` reuse shared primitives from `mobile/src/components/` and theme tokens from `mobile/src/theme/`; new or updated shared mobile components have stories in `mobile/src/stories/` (and `.rnstorybook/` kept in sync).
  3. **Cross-Platform UX, Safe Areas & Performance**: Proper `react-native-safe-area-context` insets, keyboard avoidance, `react-native-gesture-handler` / `@gorhom/bottom-sheet` / `react-native-reanimated` usage without UI-thread stalls, and smooth scrolling/list virtualization.
  4. **Mobile Bilingual i18n & RTL**: Zero hardcoded user-facing strings; translations in `mobile/src/i18n/`; logical/RTL-safe layout (`I18nManager` / `flexDirection` / `writingDirection` / `start`/`end` properties) for Hebrew (RTL) and English (LTR).
  5. **Secure Storage, API Parity & Maestro E2E**: Sensitive tokens/credentials stored in `expo-secure-store` (not plain `AsyncStorage`), offline/network error handling, API contract parity with `server/index.js`, and Maestro E2E flow coverage in `mobile/.maestro/` when user-facing mobile flows change.

### D. Red Team: Adversarial Security & Reliability Reviewer (`red-team-reviewer`)
- **Focus**: Exploitation vectors, stress testing, data integrity, and failure modes.
- **Checklist**:
  1. **Injection Vectors**: SQL injection, XSS, CSV formula injection (CWE-1236 / DDE triggers: `=`, `+`, `-`, `@`, `\t`, `\r`).
  2. **Encoding & Format Hardening**: Unicode handling, UTF-8 BOM, control character stripping, BIDI override attack prevention (`\u202E`).
  3. **Boundary Conditions**: Null/undefined inputs, empty datasets, malformed dates, extreme payloads, and client-side error boundary resilience.
  4. **Resource Exhaustion & Concurrency**: Memory leaks (unrevoked Object URLs, unbounded arrays), CPU stalls, rapid click spamming, race conditions.

---

## 2. Review Output Format

The parent agent aggregates all 4 reviews into a consolidated, actionable report:
1. **Executive Verdict**: `APPROVED`, `APPROVED WITH MINOR SUGGESTIONS`, or `CHANGES REQUESTED`.
2. **Blue Team 1 (Architecture & Code Quality)**: Structural findings, stack compliance, maintainability.
3. **Blue Team 2 (UI, i18n, RTL & Testing)**: Bilingual dictionary checks, RTL layout verification, test coverage & isolation.
4. **Blue Team 3 (Mobile — Expo / React Native)**: Cross-platform iOS/Android compliance, RN Storybook, safe areas/gestures, mobile i18n/RTL, secure storage & Maestro coverage.
5. **Red Team (Adversarial Security & Edge Cases)**: Vulnerability probing, injection defense, reliability risks.
6. **Actionable Recommendations & Remediation Plan**: Prioritized list of concrete fixes.
