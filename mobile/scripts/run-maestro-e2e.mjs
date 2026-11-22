import fs from 'fs';
import os from 'os';
import path from 'path';
import { randomBytes } from 'crypto';
import { spawn, spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { createEphemeralDb, removeEphemeralDb } from './maestro-fixtures.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');

const args = process.argv.slice(2);
const isAndroid = args.includes('--android');
const skipMetro = args.includes('--release') || process.env.MAESTRO_NO_METRO === 'true';
const flowArgs = args.filter((a) => a !== '--android' && a !== '--ios' && a !== '--release');

const TEST_PORT = Number(process.env.MAESTRO_SERVER_PORT || 3002);
const METRO_PORT = Number(process.env.MAESTRO_METRO_PORT || 8081);
const DEFAULT_SERVER_URL = isAndroid
  ? `http://10.0.2.2:${TEST_PORT}`
  : `http://localhost:${TEST_PORT}`;
const SERVER_URL = process.env.MAESTRO_SERVER_URL || DEFAULT_SERVER_URL;
const HEALTH_URL = `http://127.0.0.1:${TEST_PORT}/api/health`;
const METRO_STATUS_URL = `http://127.0.0.1:${METRO_PORT}/status`;

function resolveMaestroBin() {
  const candidates = [
    'maestro',
    path.join(os.homedir(), '.maestro', 'bin', 'maestro'),
    '/opt/homebrew/bin/maestro',
    '/usr/local/bin/maestro',
  ];
  for (const candidate of candidates) {
    const res = spawnSync(candidate, ['--version'], { stdio: 'ignore' });
    if (res.status === 0) return candidate;
  }
  return null;
}

async function waitForHealth(url, timeoutMs = 15_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (data?.status === 'ok') return;
      }
    } catch {
      // Server still starting
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Isolated test server did not become healthy at ${url} within ${timeoutMs}ms`);
}

async function isMetroRunning(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return false;
    const text = await res.text();
    return text.includes('packager-status:running');
  } catch {
    return false;
  }
}

async function waitForMetro(url, timeoutMs = 45_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isMetroRunning(url)) return;
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`Metro bundler did not become ready at ${url} within ${timeoutMs}ms`);
}

const maestroBin = resolveMaestroBin();
if (!maestroBin) {
  console.error(
    '[maestro] Maestro CLI not found on PATH or ~/.maestro/bin/maestro.\n' +
      'Install Maestro: curl -Ls "https://get.maestro.mobile.dev" | bash'
  );
  process.exit(1);
}

const tempDbPath = path.join(
  os.tmpdir(),
  `school-maestro-e2e-${Date.now()}-${randomBytes(3).toString('hex')}.db`
);
process.env.SCHOOL_DB_PATH = tempDbPath;
process.env.JWT_SECRET = process.env.JWT_SECRET || 'maestro-e2e-jwt-secret';
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'maestro-e2e-encryption-key';

function resolveFlowTarget(arg) {
  if (fs.existsSync(arg)) return arg;
  const inMaestroDir = path.join(repoRoot, 'mobile/.maestro', arg);
  if (fs.existsSync(inMaestroDir)) return inMaestroDir;
  const withYaml = arg.endsWith('.yaml') ? inMaestroDir : `${inMaestroDir}.yaml`;
  if (fs.existsSync(withYaml)) return withYaml;
  return arg;
}

let serverProc = null;
let metroProc = null;
let cleanedUp = false;

function cleanup() {
  if (cleanedUp) return;
  cleanedUp = true;
  for (const proc of [serverProc, metroProc]) {
    if (proc && !proc.killed) {
      try {
        proc.kill('SIGTERM');
      } catch {
        // Ignore already exited
      }
    }
  }
  removeEphemeralDb(tempDbPath);
}

process.on('SIGINT', () => {
  cleanup();
  process.exit(130);
});
process.on('SIGTERM', () => {
  cleanup();
  process.exit(143);
});

try {
  const fixtures = await createEphemeralDb(tempDbPath);
  console.log(`[maestro] Seeded isolated ephemeral DB: ${tempDbPath}`);

  serverProc = spawn('node', ['server/index.js'], {
    cwd: repoRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      PORT: String(TEST_PORT),
      NODE_ENV: 'test',
      SCHOOL_DB_PATH: tempDbPath,
      WEBTOP_DISABLE_EXTERNAL: 'true',
      JWT_SECRET: process.env.JWT_SECRET || 'maestro-e2e-jwt-secret',
    },
  });

  serverProc.stderr.on('data', (chunk) => {
    const text = chunk.toString().trim();
    if (text) console.error(`[test-server] ${text}`);
  });

  await waitForHealth(HEALTH_URL);
  console.log(`[maestro] Isolated test server ready at ${SERVER_URL} (Webtop external calls disabled)`);

  if (!skipMetro) {
    if (await isMetroRunning(METRO_STATUS_URL)) {
      console.log(`[maestro] Reusing running Metro bundler on port ${METRO_PORT}`);
    } else {
      console.log(`[maestro] Starting Metro bundler on port ${METRO_PORT}...`);
      metroProc = spawn('npx', ['expo', 'start', '--dev-client', '--port', String(METRO_PORT)], {
        cwd: path.join(repoRoot, 'mobile'),
        stdio: ['ignore', 'pipe', 'pipe'],
        env: {
          ...process.env,
          NODE_USE_SYSTEM_CA: '1',
        },
      });
      metroProc.stderr.on('data', (chunk) => {
        const text = chunk.toString().trim();
        if (text) console.error(`[metro] ${text}`);
      });
      await waitForMetro(METRO_STATUS_URL);
      console.log(`[maestro] Metro bundler ready on port ${METRO_PORT}`);
    }
  }

  const targets = flowArgs.length > 0 ? flowArgs.map(resolveFlowTarget) : ['mobile/.maestro'];
  const maestroArgs = [
    'test',
    ...targets,
    '-e', `SERVER_URL=${SERVER_URL}`,
    '-e', `ADMIN_USERNAME=${fixtures.admin.username}`,
    '-e', `ADMIN_PASSWORD=${fixtures.admin.password}`,
    '-e', `PARENT_USERNAME=${fixtures.parent.username}`,
    '-e', `PARENT_PASSWORD=${fixtures.parent.password}`,
    '-e', `CHILD_USERNAME=${fixtures.child.username}`,
    '-e', `CHILD_PASSWORD=${fixtures.child.password}`,
    '-e', `CHILD1_NAME=${fixtures.children[0].firstName}`,
    '-e', `CHILD2_NAME=${fixtures.children[1].firstName}`,
  ];

  const result = spawnSync(maestroBin, maestroArgs, {
    cwd: repoRoot,
    stdio: 'inherit',
  });

  process.exitCode = result.status ?? 1;
} finally {
  cleanup();
  console.log('[maestro] Cleaned up test server and ephemeral DB');
}
