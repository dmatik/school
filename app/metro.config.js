const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const { withStorybook } = require('@storybook/react-native/metro/withStorybook');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const config = getDefaultConfig(projectRoot);

// Allow Metro to resolve shared locales, types, and root package.json from the parent workspace
const rootExclusions = [
  new RegExp(`^${escapeRegExp(path.join(workspaceRoot, 'node_modules'))}[\\\\/]`),
  new RegExp(`^${escapeRegExp(path.join(workspaceRoot, 'dist'))}[\\\\/]`),
  new RegExp(`^${escapeRegExp(path.join(workspaceRoot, 'storybook-static'))}[\\\\/]`),
  new RegExp(`^${escapeRegExp(path.join(workspaceRoot, 'data'))}[\\\\/]`),
  new RegExp(`^${escapeRegExp(path.join(workspaceRoot, 'e2e'))}[\\\\/]`),
];
const existingBlockList = config.resolver.blockList;
config.watchFolders = [workspaceRoot];
config.resolver.blockList = Array.isArray(existingBlockList)
  ? [...existingBlockList, ...rootExclusions]
  : existingBlockList
    ? [existingBlockList, ...rootExclusions]
    : rootExclusions;
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, 'node_modules')];

module.exports = withStorybook(config, {
  enabled: process.env.EXPO_PUBLIC_STORYBOOK_ENABLED === 'true',
  configPath: path.resolve(projectRoot, '.rnstorybook'),
});
