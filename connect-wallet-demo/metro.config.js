const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Get the default Expo config
const config = getDefaultConfig(__dirname);

// Configure Metro to watch and resolve local @phoenix-demo/wallet package
const phoenixWalletPath = path.resolve(__dirname, '../packages/phoenix-wallet');

config.watchFolders = [phoenixWalletPath];
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
  path.resolve(phoenixWalletPath, 'node_modules'),
];
config.resolver.sourceExts = [...config.resolver.sourceExts, 'ts', 'tsx', 'js', 'jsx'];

module.exports = config;
