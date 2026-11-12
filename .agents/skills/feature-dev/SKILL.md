---
name: feature-dev
description: Guided workflow for designing and implementing full-stack or frontend features in the class_attend repository. Use whenever developing new user-facing functionality or backend endpoints.
---

# Feature Development Runbook

Follow this step-by-step checklist when building new features in `class_attend`:

## Phase 1: Planning & Schema Verification
1. **Analyze Requirements**: Check if the feature impacts the database, API, UI, or i18n.
2. **Database Update (if needed)**:
   - Check schema in `server/db.js`.
   - Add new columns using `ALTER TABLE ... ADD COLUMN` inside `initDb()` with default fallback values.
   - Verify `user_id` foreign key is present if creating a new table.
3. **Type Definitions**:
   - Update `src/types.ts` to add any new interfaces, statuses, or fields.

## Phase 2: Backend API Implementation
1. In `server/index.js`, add the necessary route(s).
2. Ensure `authenticate` middleware is attached to protect user data.
3. Use parameterized queries (`?`) scoped by `req.user.id`.
4. Validate incoming payload and return clear error statuses (`400`, `404`, `500`).

## Phase 3: Internationalization (i18n)
1. Add translation keys to **both** files before writing component code:
   - `src/locales/en.json`
   - `src/locales/he.json`
2. Ensure Hebrew strings read naturally and preserve correct punctuation.

## Phase 4: Shared Frontend UI & Storybook Implementation (Zero Code Duplication)
1. **Use Shared Components Only (Zero Duplication)**:
   - Every section, card, modal, form field, button, badge, and table **must** use the shared components in `src/components/ui/` (`SectionCard`, `Modal`, `ConfirmModal`, `FilledInput`, `FilledTextarea`, `IconInput`, `CounterField`, `ReadOnlyPillField`, `TimePresetInput`, `FieldLabel`, `SelectField` / `SelectTrigger variant="filled"`, `DatePicker variant="filled"`, `Button`, `EditButton`, `DestructiveButton`, `SyncButton`, `LogoutButton`, `FloatingActionButton`, `PageHeader`, etc.).
   - **Never duplicate UI markup** or build ad-hoc inline cards/modals/fields in page components.
2. **Create/Extend Shared Components First**:
   - If a feature requires a new UI element or variant not yet in `src/components/ui/`, create or extend the shared component in `src/components/ui/` first and consume it in the page.
3. **Update Storybook Catalog (`src/stories/`)**:
   - Every new or modified shared component or variant **must** be added or updated in `src/stories/` (`1-fields-and-inputs/`, `2-buttons-and-nav/`, `3-badges-and-pickers/`, or `4-surfaces-and-cards/`) and documented in `src/stories/Introduction.mdx`.
4. **Logical RTL Styling & States**:
   - Apply Tailwind CSS with **logical properties** (`ps-`, `pe-`, `start-`, `end-`, `text-start`).
   - Handle loading, empty (`EmptyStateCard`), and error states gracefully.
5. **If creating a new major tab or view**:
   - Wrap with `React.lazy` in `src/App.tsx`.
   - Add tab icon and label in `Sidebar` and mobile `Dock`.

## Phase 5: Verification & Testing
1. **Vitest Unit/Component Tests**:
   - Write or update tests in `src/components/` or `src/lib/`.
   - Run `npm test` and ensure all tests pass.
2. **Playwright E2E Tests**:
   - If user-visible workflow is changed or added, add a test in `e2e/`.
   - Use `createTestUser` and `deleteTestUser`.
   - Run `npm run test:e2e` and verify pass.
3. **Lint & Build**:
   ```bash
   npm run lint
   npm run build
   ```

