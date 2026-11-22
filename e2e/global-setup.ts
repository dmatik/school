import { createEphemeralDb } from '../mobile/scripts/maestro-fixtures.mjs';

export default async function globalSetup() {
  const dbPath = process.env.SCHOOL_DB_PATH;
  if (!dbPath) {
    throw new Error('SCHOOL_DB_PATH must be set for Playwright E2E globalSetup');
  }
  await createEphemeralDb(dbPath);
}
