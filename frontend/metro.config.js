const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Disable file watching to avoid ENOSPC errors in containers
config.watchman = false;
config.server = {
  useGlobalHotkey: false,
};

// Exclude unnecessary directories from file watching
config.resolver.blacklistRE = /(.*)\/(__tests__|android|ios|build|dist|.git|node_modules\/.*\/android|node_modules\/.*\/ios|node_modules\/.*\/windows|node_modules\/.*\/macos)(\/.*)?$/;

// Reduce the number of workers to decrease resource usage
config.maxWorkers = 1;

module.exports = config;
