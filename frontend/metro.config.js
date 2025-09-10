const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Container-optimized configuration
config.watchman = false; // Disable watchman to avoid inotify issues
config.maxWorkers = 1; // Reduce workers for container limits

// Use polling instead of file watching
config.server = {
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      // Disable caching for hot reload
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      return middleware(req, res, next);
    };
  },
  useGlobalHotkey: false, // Disable global hotkeys in container
};

// Aggressive file exclusions to reduce watched files
config.resolver.blacklistRE = /(.*\/__tests__\/.*|.*\/node_modules\/.*\/(android|ios|windows|macos|__tests__|\.git|.*\.android\.js|.*\.ios\.js|.*\.native\.js))$/;

// Reduce resolver resolution time
config.resolver.platforms = ['web', 'native'];

// Memory optimization - use default caching
// config.cacheStores is handled automatically by Expo

module.exports = config;
