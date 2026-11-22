import { removeEphemeralDb } from '../mobile/scripts/maestro-fixtures.mjs';

export default async function globalTeardown() {
  const dbPath = process.env.SCHOOL_DB_PATH;
  if (dbPath) {
    removeEphemeralDb(dbPath);
  }
}
