const { getDefaultConfig } = require('expo/metro-config');

// Get the default Expo config
const config = getDefaultConfig(__dirname);

// Using npm published packages (@vincenttaylorlab3/phoenix-wallet)
// No additional configuration needed for standard npm packages

module.exports = config;
