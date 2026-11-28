# Testing Strategy & Test Isolation Rules

## 1. Test Runner Separation

| Concern | Jest Suite | Playwright Suite | Maestro Suite (iOS) |
| :--- | :--- | :--- | :--- |
| **Location** | `server/__tests__/*.test.ts` & `app/__tests__/*.test.{ts,tsx}` | `e2e/*.spec.ts` | `app/.maestro/*.yaml` |
| **Environment** | Node ESM (`server`) & `jest-expo` (`app`) | Real Chromium Browser (against co-hosted Expo Web) | iOS Simulator (`com.dmatik.school`) |
| **Execution** | Local (`npm test`) & GitHub Actions CI | Local only (`npm run test:e2e`, `npm run test:e2e:headed`) | Local only (`npm run app:ios:maestro` then `npm run test:maestro -- --ios`) |
| **What to Test** | Pure functions, API/DB logic, component states, dialogs, form validation | End-to-end web user journeys, responsive mobile/desktop web, SQLite roundtrip | Native iOS end-to-end user flows |

### Runner Configuration Rules
1. `.github/workflows/` **must only run Jest (`npm test`)**. Never add Playwright or Maestro commands or browser/simulator installs to CI workflows.

---

## 2. Full Testing Protocol ("run full testing")

Whenever the user asks to **run full testing** (e.g., "run full testing", "run full tests"), execute all four stages **sequentially, one after another** (do not run them in parallel):

1. **Full Unit & Component Tests (Jest — Server + App)**:
   ```bash
   npm test
   ```
2. **Full Playwright E2E Tests (Expo Web)**:
   ```bash
   npm run test:e2e
   ```
3. **Start Maestro iOS App (Release build on iOS Simulator)**:
   ```bash
   npm run app:ios:maestro
   ```
4. **Full Maestro E2E Tests (iOS only)**:
   ```bash
   npm run test:maestro -- --ios
   ```

### Required Final Summary Format
At the end of the run, always provide a **short status summary** showing each stage, its pass/fail status, and the exact passed/failed test counts, for example:

| Stage | Status | Passed | Failed |
| :--- | :--- | :---: | :---: |
| 1. Unit Tests (Jest: server + app) | Pass / Fail | X | Y |
| 2. Playwright E2E | Pass / Fail | X | Y |
| 3. Start Maestro iOS App | Pass / Fail | — | — |
| 4. Maestro E2E (iOS) | Pass / Fail | X | Y |

---

## 3. Playwright E2E Test Isolation & Cleanup Rules

To guarantee that tests are 100% deterministic and leave zero garbage in the database:

1. **Dedicated User per Test**:
   - Every E2E test file must import helper utilities from `./helpers/auth`:
     ```ts
     import { createTestUser, deleteTestUser, cleanupAllTestUsers, loginWithUser, TestUser } from './helpers/auth';
     ```
   - In `beforeEach`, generate a fresh test user:
     ```ts
     let testUser: TestUser;
     test.beforeEach(async ({ page }) => {
       testUser = createTestUser('admin');
       await loginWithUser(page, testUser);
     });
     ```
2. **Mandatory Teardown**:
   - In `afterEach`, delete the user:
     ```ts
     test.afterEach(async () => {
       if (testUser) {
         deleteTestUser(testUser.id);
       }
     });
     ```
   - Due to SQLite `ON DELETE CASCADE`, deleting the user automatically deletes all incidents, homework, and authenticators created by that user.
3. **Safety Sweep**:
   - In `beforeAll` and `afterAll`, call `cleanupAllTestUsers()` to scrub any orphaned `e2e_*` records in case of an abrupt termination.
4. **Never Use Existing Users**:
   - Never log in as `admin` (`admin-default`) or query pre-existing records.

