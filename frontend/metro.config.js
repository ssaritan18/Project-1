const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Reduce the number of workers to decrease resource usage
config.maxWorkers = 1;

module.exports = config;
