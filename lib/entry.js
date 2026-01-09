/**
 * lib/entry.js
 *
 * Entry point detection and plugin validation.
 */

const fs = require('fs')
const path = require('path')
const { glob } = require('./glob')

// Auto-detect styles in priority order (Sails convention: importer.less first)
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
  'assets/styles/app.css',
  'assets/css/app.css',
  'assets/css/main.css'
]

const JS_CANDIDATES = [
  'assets/js/app.js',
  'assets/js/main.js',
  'assets/js/index.js'
]

// Maps file extensions to required Rsbuild plugins
const PLUGIN_MAP = {
  '.less': { pkg: '@rsbuild/plugin-less', name: 'pluginLess' },
  '.scss': { pkg: '@rsbuild/plugin-sass', name: 'pluginSass' },
  '.sass': { pkg: '@rsbuild/plugin-sass', name: 'pluginSass' }
}

function detectEntry(appPath, configured, candidates) {
  if (configured) return configured
  return candidates.find((c) => fs.existsSync(path.resolve(appPath, c))) || null
}

function detectStylesEntry(appPath, configured) {
  return detectEntry(appPath, configured, STYLE_CANDIDATES)
}

function detectJsEntry(appPath, configured) {
  // Array entry = glob patterns, skip auto-detection
  if (Array.isArray(configured)) return configured
  return detectEntry(appPath, configured, JS_CANDIDATES)
}

const JS_EXTENSIONS = ['.js', '.ts', '.tsx', '.jsx']

/**
 * Expand array of glob patterns to file paths, preserving order and deduping.
 * Returns null if input is not an array, or array of absolute paths.
 */
function expandEntryPatterns(patterns, appPath) {
  if (!Array.isArray(patterns)) return null

  const assetsPath = path.resolve(appPath, 'assets')
  const seen = new Set()
  const files = []

  for (const pattern of patterns) {
    for (const file of glob(pattern, assetsPath)) {
      const ext = path.extname(file).toLowerCase()
      if (JS_EXTENSIONS.includes(ext) && !seen.has(file)) {
        seen.add(file)
        files.push(path.resolve(assetsPath, file))
      }
    }
  }
  return files
}

function isInstalled(pkg, appPath) {
  try {
    require.resolve(pkg, { paths: [appPath] })
    return true
  } catch {
    return false
  }
}

/**
 * Validate required plugins are installed. Throws with helpful instructions if missing.
 */
function validatePlugins({ appPath, stylesEntry, log }) {
  if (!stylesEntry) return

  const ext = path.extname(stylesEntry).toLowerCase()
  const plugin = PLUGIN_MAP[ext]

  if (plugin && !isInstalled(plugin.pkg, appPath)) {
    log.error('')
    log.error('Found %s but %s is not installed.', stylesEntry, plugin.pkg)
    log.error('')
    log.error('To compile these files:')
    log.error('  1. npm install %s --save-dev', plugin.pkg)
    log.error('  2. Add to config/shipwright.js:')
    log.error('')
    log.error("     const { %s } = require('%s')", plugin.name, plugin.pkg)
    log.error('     module.exports.shipwright = {')
    log.error('       build: { plugins: [%s()] }', plugin.name)
    log.error('     }')
    log.error('')
    throw new Error(`Missing ${plugin.pkg}`)
  }
}

module.exports = {
  detectStylesEntry,
  detectJsEntry,
  expandEntryPatterns,
  validatePlugins
}
