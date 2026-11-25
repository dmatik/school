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
const flowArgs = args.filter((a) => !['--android', '--ios', '--release', '--dev', '--dev-client', '--skip-build'].includes(a));

const TEST_PORT = Number(process.env.MAESTRO_SERVER_PORT || 3002);
const DEFAULT_SERVER_URL = isAndroid
  ? `http://10.0.2.2:${TEST_PORT}`
  : `http://localhost:${TEST_PORT}`;
const SERVER_URL = process.env.MAESTRO_SERVER_URL || DEFAULT_SERVER_URL;
const HEALTH_URL = `http://127.0.0.1:${TEST_PORT}/api/health`;

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

function resolveAllFlows() {
  if (flowArgs.length > 0) {
    const resolved = [];
    for (const arg of flowArgs) {
      const target = resolveFlowTarget(arg);
      if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
        const yamls = fs
          .readdirSync(target)
          .filter((f) => f.endsWith('.yaml') && f !== 'config.yaml')
          .sort()
          .map((f) => path.join(target, f));
        resolved.push(...yamls);
      } else {
        resolved.push(target);
      }
    }
    return resolved;
  }

  const maestroDir = path.join(repoRoot, 'mobile/.maestro');
  const configPath = path.join(maestroDir, 'config.yaml');
  if (fs.existsSync(configPath)) {
    const configText = fs.readFileSync(configPath, 'utf8');
    const orderMatch = configText.match(/flowsOrder:\s*\n((?:\s+-\s+.+\n?)+)/);
    if (orderMatch) {
      const ordered = orderMatch[1]
        .split('\n')
        .map((line) => line.replace(/^\s*-\s*/, '').trim())
        .filter(Boolean)
        .map((name) => path.join(maestroDir, name.endsWith('.yaml') ? name : `${name}.yaml`))
        .filter((p) => fs.existsSync(p));
      if (ordered.length > 0) return ordered;
    }
  }

  return fs
    .readdirSync(maestroDir)
    .filter((f) => f.endsWith('.yaml') && f !== 'config.yaml')
    .sort()
    .map((f) => path.join(maestroDir, f));
}

function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

function extractFailureSummary(output) {
  const lines = output.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const assertionLine = lines.find((l) => l.startsWith('Assertion is false:') || l.startsWith('Unable to ') || l.startsWith('Element not found'));
  const debugIdx = lines.findIndex((l) => l.includes('Debug output'));
  const debugPath = debugIdx >= 0 ? lines.slice(debugIdx + 1).find((l) => l.startsWith('/')) : null;
  return { assertionLine, debugPath };
}

let serverProc = null;
let activeMaestroProc = null;
let currentRunningFlow = null;
let cleanedUp = false;

function cleanup() {
  if (cleanedUp) return;
  cleanedUp = true;
  for (const proc of [activeMaestroProc, serverProc]) {
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

function runMaestroFlow(flowPath, envArgs) {
  return new Promise((resolve) => {
    const start = Date.now();
    let output = '';
    const proc = spawn(maestroBin, ['test', flowPath, ...envArgs], {
      cwd: repoRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    activeMaestroProc = proc;
    proc.stdout.on('data', (chunk) => {
      output += chunk.toString();
    });
    proc.stderr.on('data', (chunk) => {
      output += chunk.toString();
    });
    proc.on('close', (code) => {
      if (activeMaestroProc === proc) activeMaestroProc = null;
      resolve({
        status: code ?? 1,
        output,
        durationMs: Date.now() - start,
      });
    });
  });
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
    if (!text) return;
    if (process.stdout.isTTY && currentRunningFlow) {
      process.stdout.write(`\r\x1b[K[test-server] ${text}\n[Running...] ${currentRunningFlow}`);
    } else {
      console.error(`[test-server] ${text}`);
    }
  });

  await waitForHealth(HEALTH_URL);
  console.log(`[maestro] Isolated test server ready at ${SERVER_URL} (Webtop external calls disabled)`);

  const flows = resolveAllFlows();
  const envArgs = [
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

  const isTTY = Boolean(process.stdout.isTTY);
  const suiteStart = Date.now();
  let passedCount = 0;

  console.log('');
  for (const flowPath of flows) {
    const flowName = path.basename(flowPath, '.yaml');
    currentRunningFlow = flowName;
    if (isTTY) {
      process.stdout.write(`\r\x1b[K[Running...] ${flowName}`);
    } else {
      console.log(`[Running...] ${flowName}`);
    }

    const { status, output, durationMs } = await runMaestroFlow(flowPath, envArgs);
    currentRunningFlow = null;
    const elapsed = formatDuration(durationMs);

    if (status === 0) {
      passedCount += 1;
      const line = `[Passed] ${flowName} (${elapsed})`;
      if (isTTY) {
        process.stdout.write(`\r\x1b[K${line}\n`);
      } else {
        console.log(line);
      }
    } else {
      const { assertionLine, debugPath } = extractFailureSummary(output);
      const reason = assertionLine ? ` (${assertionLine})` : '';
      const line = `[Failed] ${flowName} (${elapsed})${reason}`;
      if (isTTY) {
        process.stdout.write(`\r\x1b[K${line}\n`);
      } else {
        console.log(line);
      }
      if (debugPath) {
        console.log(`  Debug output: ${debugPath}`);
      }
    }
  }

  console.log(`\n${passedCount}/${flows.length} Flows Passed in ${formatDuration(Date.now() - suiteStart)}\n`);
  process.exitCode = passedCount === flows.length ? 0 : 1;
} finally {
  cleanup();
  console.log('[maestro] Cleaned up test server and ephemeral DB');
}
