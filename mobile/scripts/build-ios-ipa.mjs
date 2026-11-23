import fs from 'fs';
import path from 'path';
import { execFileSync, spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(__dirname, '..');
const iosDir = path.join(mobileRoot, 'ios');
const distDir = path.join(mobileRoot, 'dist-ios');
const buildDir = path.join(distDir, 'build');

const args = process.argv.slice(2);
const forcePrebuild = args.includes('--prebuild');

const appJsonPath = path.join(mobileRoot, 'app.json');
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
const expoConfig = appJson.expo || {};

const version = expoConfig.version || '1.0.0';
const appName = expoConfig.name || 'School';
const bundleId = expoConfig.ios?.bundleIdentifier || 'com.dmatik.school';
const repo = process.env.GITHUB_REPOSITORY || 'dmatik/school';

function versionToBuildNumber(ver) {
  const parts = String(ver)
    .split('.')
    .map((n) => parseInt(n, 10) || 0);
  const [major = 1, minor = 0, patch = 0] = parts;
  return String(major * 10000 + minor * 100 + patch);
}

const buildNumber = process.env.IOS_BUILD_NUMBER || versionToBuildNumber(version);

function run(cmd, cmdArgs, cwd = mobileRoot) {
  console.log(`[ios:ipa] $ ${cmd} ${cmdArgs.join(' ')}`);
  const res = spawnSync(cmd, cmdArgs, {
    cwd,
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_USE_SYSTEM_CA: '1',
      NODE_BINARY: process.env.NODE_BINARY || process.execPath,
    },
  });
  if (res.status !== 0) {
    throw new Error(`Command failed (${res.status}): ${cmd} ${cmdArgs.join(' ')}`);
  }
}

if (forcePrebuild || !fs.existsSync(iosDir)) {
  console.log('[ios:ipa] Generating native iOS project with expo prebuild...');
  const prebuildArgs = ['expo', 'prebuild', '--platform', 'ios'];
  if (forcePrebuild) prebuildArgs.push('--clean');
  run('npx', prebuildArgs, mobileRoot);
} else if (!fs.existsSync(path.join(iosDir, 'Pods'))) {
  console.log('[ios:ipa] Installing CocoaPods dependencies...');
  run('pod', ['install'], iosDir);
}

const workspaceEntry = fs
  .readdirSync(iosDir)
  .find((entry) => entry.endsWith('.xcworkspace'));

if (!workspaceEntry) {
  throw new Error(`No .xcworkspace found in ${iosDir}`);
}

const workspacePath = path.join(iosDir, workspaceEntry);
const workspaceBase = path.basename(workspaceEntry, '.xcworkspace');

let scheme = workspaceBase;
try {
  const listRaw = execFileSync(
    'xcodebuild',
    ['-list', '-json', '-workspace', workspacePath],
    { encoding: 'utf8' }
  );
  const listJson = JSON.parse(listRaw);
  const schemes = listJson?.workspace?.schemes || [];
  if (schemes.length > 0 && !schemes.includes(scheme)) {
    scheme = schemes.find((s) => !s.startsWith('Pods-')) || schemes[0];
  }
} catch {
  // Fallback to workspace basename
}

console.log(`[ios:ipa] Building ${appName} (${bundleId}) v${version} (${buildNumber})`);
console.log(`[ios:ipa] Workspace: ${workspaceEntry}, Scheme: ${scheme}`);

fs.rmSync(buildDir, { recursive: true, force: true });
fs.mkdirSync(buildDir, { recursive: true });

const archivePath = path.join(buildDir, `${scheme}.xcarchive`);

run(
  'xcodebuild',
  [
    'archive',
    '-workspace',
    workspacePath,
    '-scheme',
    scheme,
    '-configuration',
    'Release',
    '-destination',
    'generic/platform=iOS',
    '-archivePath',
    archivePath,
    `MARKETING_VERSION=${version}`,
    `CURRENT_PROJECT_VERSION=${buildNumber}`,
    'CODE_SIGN_IDENTITY=',
    'CODE_SIGNING_REQUIRED=NO',
    'CODE_SIGNING_ALLOWED=NO',
    'AD_HOC_CODE_SIGNING_ALLOWED=YES',
  ],
  iosDir
);

const appsDir = path.join(archivePath, 'Products', 'Applications');
const appBundleName = fs
  .readdirSync(appsDir)
  .find((entry) => entry.endsWith('.app'));

if (!appBundleName) {
  throw new Error(`No .app bundle produced in ${appsDir}`);
}

const archivedAppPath = path.join(appsDir, appBundleName);
const payloadDir = path.join(buildDir, 'Payload');
fs.mkdirSync(payloadDir, { recursive: true });

const payloadAppPath = path.join(payloadDir, appBundleName);
run('ditto', [archivedAppPath, payloadAppPath], buildDir);

const infoPlistPath = path.join(payloadAppPath, 'Info.plist');
if (fs.existsSync(infoPlistPath)) {
  run('/usr/libexec/PlistBuddy', ['-c', `Set :CFBundleShortVersionString ${version}`, infoPlistPath], buildDir);
  run('/usr/libexec/PlistBuddy', ['-c', `Set :CFBundleVersion ${buildNumber}`, infoPlistPath], buildDir);
}

const versionedIpaName = `school-ios-v${version}.ipa`;
const versionedIpaPath = path.join(distDir, versionedIpaName);
const latestIpaPath = path.join(distDir, 'school-ios.ipa');

fs.rmSync(versionedIpaPath, { force: true });
fs.rmSync(latestIpaPath, { force: true });

run('zip', ['-qry', versionedIpaPath, 'Payload'], buildDir);
fs.copyFileSync(versionedIpaPath, latestIpaPath);

const ipaSize = fs.statSync(versionedIpaPath).size;
const releaseDate = new Date().toISOString();
const downloadUrl = `https://github.com/${repo}/releases/download/v${version}/${versionedIpaName}`;
const iconUrl = `https://raw.githubusercontent.com/${repo}/main/mobile/assets/icon.png`;

const altStoreSource = {
  name: `${appName} Releases`,
  identifier: `${bundleId}.altstore`,
  sourceURL: `https://github.com/${repo}/releases/latest/download/altstore-source.json`,
  apps: [
    {
      name: appName,
      bundleIdentifier: bundleId,
      developerName: 'dmatik',
      subtitle: 'School attendance, homework & schedule',
      localizedDescription:
        'Mobile companion app for School (בית הספר) with attendance, homework, exams, and timetable.',
      iconURL: iconUrl,
      tintColor: '#4F46E5',
      category: 'education',
      versions: [
        {
          version,
          buildVersion: buildNumber,
          date: releaseDate,
          size: ipaSize,
          downloadURL: downloadUrl,
          localizedDescription: `Release v${version}`,
          minOSVersion: '16.4',
        },
      ],
    },
  ],
};

const altStoreSourcePath = path.join(distDir, 'altstore-source.json');
fs.writeFileSync(altStoreSourcePath, JSON.stringify(altStoreSource, null, 2) + '\n');

fs.rmSync(buildDir, { recursive: true, force: true });

console.log(`[ios:ipa] Created ${versionedIpaPath} (${(ipaSize / (1024 * 1024)).toFixed(2)} MB)`);
console.log(`[ios:ipa] Created ${latestIpaPath}`);
console.log(`[ios:ipa] Created ${altStoreSourcePath}`);
