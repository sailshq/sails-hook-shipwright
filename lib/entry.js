/**
 * lib/entry.js
 *
 * Entry point detection and plugin validation.
 */

const fs = require('fs')
const path = require('path')

const STYLE_CANDIDATES = [
  'assets/styles/importer.less',
  'assets/styles/importer.scss',
  'assets/styles/importer.sass',
  'assets/styles/importer.css',
  'assets/styles/main.less',
  'assets/styles/main.scss',
  'assets/styles/main.css',
  'assets/styles/app.less',
  'assets/styles/app.scss',
  'assets/styles/app.css'
]

const JS_CANDIDATES = [
  'assets/js/app.js',
  'assets/js/main.js',
  'assets/js/index.js'
]

const PLUGIN_CONFIG = {
  '.less': { package: '@rsbuild/plugin-less', importName: 'pluginLess' },
  '.scss': { package: '@rsbuild/plugin-sass', importName: 'pluginSass' },
  '.sass': { package: '@rsbuild/plugin-sass', importName: 'pluginSass' }
}

/**
 * Detect an entry point from a list of candidates.
 */
function detectEntry(appPath, configuredEntry, candidates) {
  if (configuredEntry) return configuredEntry
  for (const candidate of candidates) {
    if (fs.existsSync(path.resolve(appPath, candidate))) {
      return candidate
    }
  }
  return null
}

function detectStylesEntry(appPath, configuredEntry) {
  return detectEntry(appPath, configuredEntry, STYLE_CANDIDATES)
}

function detectJsEntry(appPath, configuredEntry) {
  return detectEntry(appPath, configuredEntry, JS_CANDIDATES)
}

/**
 * Check if a package is installed in the user's app.
 */
function isPluginInstalled(packageName, appPath) {
  try {
    require.resolve(packageName, { paths: [appPath] })
    return true
  } catch {
    return false
  }
}

/**
 * Log a helpful error message for missing plugins.
 * Note: log is already prefixed via createLogger from lib/log.js
 */
function logMissingPlugin(log, entry, plugin, importName) {
  log.error('')
  log.error('Found %s but %s is not installed.', entry, plugin)
  log.error('')
  log.error('To compile these files:')
  log.error('  1. npm install %s --save-dev', plugin)
  log.error('  2. Add to config/shipwright.js:')
  log.error('')
  log.error("     const { %s } = require('%s')", importName, plugin)
  log.error('     module.exports.shipwright = {')
  log.error('       build: { plugins: [%s()] }', importName)
  log.error('     }')
  log.error('')
}

/**
 * Validate that required plugins are installed.
 */
function validatePlugins({ appPath, stylesEntry, log }) {
  if (!stylesEntry) return

  const ext = path.extname(stylesEntry).toLowerCase()
  const pluginInfo = PLUGIN_CONFIG[ext]

  if (pluginInfo && !isPluginInstalled(pluginInfo.package, appPath)) {
    logMissingPlugin(
      log,
      stylesEntry,
      pluginInfo.package,
      pluginInfo.importName
    )
    throw new Error(`Missing ${pluginInfo.package}`)
  }
}

module.exports = {
  detectStylesEntry,
  detectJsEntry,
  validatePlugins
}
