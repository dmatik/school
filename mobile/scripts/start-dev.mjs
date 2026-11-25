import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(__dirname, '..');
const appJson = JSON.parse(
  fs.readFileSync(path.join(mobileRoot, 'app.json'), 'utf8')
);

const args = process.argv.slice(2);
const platform = args.includes('--android') ? 'android' : 'ios';
const extraArgs = args.filter((a) => a !== '--ios' && a !== '--android');

const iosBundleId = appJson?.expo?.ios?.bundleIdentifier || 'com.school.app';
const androidPkg = appJson?.expo?.android?.package || 'com.school.app';

function isIosAppInstalled() {
  const res = spawnSync(
    'xcrun',
    ['simctl', 'get_app_container', 'booted', iosBundleId],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }
  );
  if (res.status !== 0) return false;
  const appContainer = (res.stdout || '').trim();
  // Release builds (e.g. from Maestro E2E) embed main.jsbundle and don't connect to Metro.
  // Treat them as not-dev-installed so `expo run:ios` restores the Debug dev-client build.
  if (appContainer && fs.existsSync(path.join(appContainer, 'main.jsbundle'))) {
    return false;
  }
  return true;
}

function isAndroidAppInstalled() {
  const res = spawnSync('adb', ['shell', 'pm', 'path', androidPkg], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  return res.status === 0 && (res.stdout || '').includes('package:');
}

const installed =
  platform === 'ios' ? isIosAppInstalled() : isAndroidAppInstalled();

const expoArgs = installed
  ? ['expo', 'start', '--dev-client', `--${platform}`, ...extraArgs]
  : ['expo', `run:${platform}`, ...extraArgs];

if (!installed) {
  const id = platform === 'ios' ? iosBundleId : androidPkg;
  console.log(
    `[mobile] Dev build (${id}) not found on target ${platform} device — building & installing automatically...`
  );
}

const child = spawnSync('npx', expoArgs, {
  cwd: mobileRoot,
  stdio: 'inherit',
  env: {
    NODE_USE_SYSTEM_CA: '1',
    ...process.env,
  },
});

process.exit(child.status ?? 1);
