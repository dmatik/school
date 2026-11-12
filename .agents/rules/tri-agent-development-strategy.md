# Tri-Agent Development Implementation Strategy

This project utilizes a 3-agent expert methodology for complex feature implementations, architectural shifts, and quality enforcement:

1. **Frontend UI/UX Expert (`frontend-uiux-expert`)**:
   - React 19, TypeScript, Tailwind CSS 3.4, Radix UI primitives, and Storybook 8.
   - **Zero UI Code Duplication**: Enforces that every UI element (cards, modals, inputs, selects, date pickers, buttons, badges, rows) is built using shared components in `src/components/ui/`.
   - **Mandatory Storybook Synchronization**: Ensures every new or modified shared component or variant is added or updated in `src/stories/` (and `src/stories/Introduction.mdx`).
   - Enforces bilingual Hebrew (RTL, default) and English (LTR) integrity.
   - Strictly enforces logical properties (`ps-`, `pe-`, `start-`, `end-`, `text-start`, `text-end`).
   - Ensures visual hierarchy, responsive liquid glass aesthetics, and zero hardcoded JSX strings (`src/locales/he.json` and `src/locales/en.json`).

2. **Backend & DB Expert (`backend-db-expert`)**:
   - Node.js with Express 5 REST API architecture.
   - Better-SQLite3: Strictly synchronous API execution (`db.prepare(...).run()`, `.get()`, `.all()`).
   - Safe, idempotent schema migrations in `server/db.js` (`initDb()`).
   - Multi-tenant / shared family data scoping, JWT/WebAuthn auth, rate limiting, and cascade safety.

3. **Red Team Expert (`red-team-expert`)**:
   - Adversarial security review, stress testing, and boundary validation.
   - Authorization probing: privilege escalation (child to parent, user to admin), horizontal data leakage between children or users.
   - Input sanitization, parameter tampering, DoS prevention, and edge-case failure modes.
   - Zero-pollution test verification for Vitest and Playwright.

---

## Development Lifecycle Workflow

1. **Planning & Architecture Alignment**:
   - Database schema & migration design (handled with `backend-db-expert`).
   - Shared UI component reuse, Storybook additions, & bilingual user flow design (handled with `frontend-uiux-expert`).
   - Threat modeling & authorization boundaries (audited with `red-team-expert`).

2. **Implementation**:
   - Backend schema migrations and API endpoint updates.
   - Bilingual locale synchronization (`he.json` and `en.json`).
   - Shared UI components in `src/components/ui/` and Storybook stories in `src/stories/` first, then page integration with zero code duplication.

3. **Verification & Hardening**:
   - Unit and component tests with Vitest (`npm test`).
   - End-to-end user isolation tests with Playwright (`npm run test:e2e`).
   - Build and linting verification (`npm run lint && npm run build`).

