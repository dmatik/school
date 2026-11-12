---
name: code-review
description: Comprehensive inspection and code review checklist for class_attend. Use when reviewing code changes, validating pull requests, or performing architectural and security inspections.
---

# Code Review & Inspection Checklist

Use this checklist to perform rigorous reviews of any code changes in `class_attend`:

## 1. Security & Authentication Audit
- [ ] **No SQL Injection**: Are all database queries using Better-SQLite3 parameterized queries (`?`)? Zero string interpolation.
- [ ] **Multi-Tenant Isolation**: Does every query for courses/sessions filter strictly by `user_id = ?` matching `req.user.id`?
- [ ] **Authentication Middleware**: Are all new `/api/` endpoints protected by `authenticate` (unless deliberately public)?
- [ ] **Password Security**: Are passwords hashed with `bcrypt.hashSync(password, 10)`?
- [ ] **Secret Leakage**: Are JWT secrets or private keys stored in environment variables, not hardcoded?

## 2. Shared Components, Zero Duplication & Storybook Audit
- [ ] **Zero UI Code Duplication**: Are all sections, cards, modals, form fields, buttons, badges, and list rows built exclusively using shared components from `src/components/ui/`? (Reject any inline or duplicated markup).
- [ ] **Modals & Dialogs**: Do all dialogs use the shared `Modal` or `ConfirmModal` (`src/components/ui/modal.tsx`) rather than raw `DialogContent` or `AlertDialogContent` in pages?
- [ ] **Shared Form Fields & Buttons**: Do all forms and modals use shared Storybook components (`FilledInput`, `FilledTextarea`, `IconInput`, `CounterField`, `ReadOnlyPillField`, `TimePresetInput`, `SelectField` / `SelectTrigger variant="filled"`, `DatePicker variant="filled"`, `Button`, `EditButton`, `DestructiveButton`, `SyncButton`, `LogoutButton`)?
- [ ] **Storybook Catalog Sync**: Have all new or modified shared components and variants been added or updated in `src/stories/` and `src/stories/Introduction.mdx`?

## 3. Internationalization & Bi-directional (RTL) Check
- [ ] **Zero Hardcoded Text**: Are all displayed labels, tooltips, dialogs, and toasts using `t('...')`?
- [ ] **Both Locales Present**: Does every key exist in both `src/locales/he.json` and `src/locales/en.json`?
- [ ] **Logical CSS Properties**: Are padding, margins, and borders styled with logical classes (`ps-`, `pe-`, `ms-`, `me-`, `text-start`, `text-end`) rather than physical (`pl-`, `pr-`, `text-left`)?
- [ ] **Radix Direction**: Do dropdowns, popovers, and selects receive `dir={i18n.dir()}`?

## 4. Database & State Integrity
- [ ] **Synchronous SQLite**: Does the code avoid writing `await db...` or async wrappers around Better-SQLite3?
- [ ] **Foreign Keys**: Do newly created tables have `REFERENCES users(id) ON DELETE CASCADE`?
- [ ] **State Synchronization**: Does modifying courses or sessions trigger the debounced `/api/data` auto-save?

## 5. Test Strategy & Cleanliness
- [ ] **Test Separation**: Did any Playwright tests leak into `src/`? (Vitest must only see `src/`).
- [ ] **No CI Pollution**: Did `.github/workflows/` remain untouched with only `npm test`?
- [ ] **Playwright Isolation**: Does every E2E test create and clean up a dedicated test user (`createTestUser` / `deleteTestUser`)?
- [ ] **No Dirty Database State**: Did any test create records with `admin-default`?

## 6. Verification Commands
Execute the following verification suite:
```bash
npm run lint
npm run build
npm test
npm run test:e2e
```

