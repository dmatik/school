const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const { withStorybook } = require('@storybook/react-native/metro/withStorybook');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

// Allow Metro to resolve shared locales and types from the parent src/ directory
config.watchFolders = [path.resolve(workspaceRoot, 'src')];
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, 'node_modules')];

module.exports = withStorybook(config, {
  enabled: process.env.EXPO_PUBLIC_STORYBOOK_ENABLED === 'true',
  configPath: path.resolve(projectRoot, '.rnstorybook'),
});
