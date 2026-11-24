import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_PACKAGE_JSON_PATH = path.resolve(__dirname, '../package.json');

/**
 * Resolves the running server version at startup.
 * Prefers a non-placeholder APP_VERSION env var (set by Docker builds) and
 * falls back to the server's own package.json version.
 */
export function resolveServerVersion({
  envVersion = process.env.APP_VERSION,
  packageJsonPath = DEFAULT_PACKAGE_JSON_PATH,
} = {}) {
  const normalizedEnv = typeof envVersion === 'string' ? envVersion.trim() : '';
  if (normalizedEnv && normalizedEnv !== '0.0.0') {
    return normalizedEnv;
  }

  try {
    const raw = fs.readFileSync(packageJsonPath, 'utf8');
    const pkg = JSON.parse(raw);
    const pkgVersion = typeof pkg?.version === 'string' ? pkg.version.trim() : '';
    return pkgVersion || null;
  } catch {
    return null;
  }
}

export const SERVER_VERSION = resolveServerVersion();
