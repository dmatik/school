import os from 'os';
import path from 'path';
import { randomBytes } from 'crypto';
import { defineConfig, devices } from '@playwright/test';

const BACKEND_PORT = process.env.PLAYWRIGHT_BACKEND_PORT || '3003';
const FRONTEND_PORT = process.env.PLAYWRIGHT_FRONTEND_PORT || '5174';

if (!process.env.SCHOOL_DB_PATH) {
  process.env.SCHOOL_DB_PATH = path.join(
    os.tmpdir(),
    `school-playwright-e2e-${Date.now()}-${randomBytes(3).toString('hex')}.db`
  );
}
if (!process.env.WEBTOP_DISABLE_EXTERNAL) {
  process.env.WEBTOP_DISABLE_EXTERNAL = 'true';
}
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'test';
}

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'list',
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
  use: {
    baseURL: `http://localhost:${FRONTEND_PORT}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    launchOptions: {
      slowMo: process.env.SLOWMO ? parseInt(process.env.SLOWMO, 10) : (process.argv.includes('--headed') ? 500 : 0),
    },
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* Run isolated backend + Vite dev server against the ephemeral test DB */
  webServer: [
    {
      command: 'node server/index.js',
      url: `http://127.0.0.1:${BACKEND_PORT}/api/health`,
      reuseExistingServer: false,
      timeout: 60 * 1000,
      env: {
        ...process.env,
        PORT: BACKEND_PORT,
        NODE_ENV: 'test',
        SCHOOL_DB_PATH: process.env.SCHOOL_DB_PATH,
        WEBTOP_DISABLE_EXTERNAL: 'true',
        JWT_SECRET: process.env.JWT_SECRET || 'playwright-e2e-jwt-secret',
      },
    },
    {
      command: `npx vite --port ${FRONTEND_PORT} --strictPort`,
      url: `http://localhost:${FRONTEND_PORT}`,
      reuseExistingServer: false,
      timeout: 60 * 1000,
      env: {
        ...process.env,
        VITE_API_TARGET: `http://127.0.0.1:${BACKEND_PORT}`,
      },
    },
  ],
});
