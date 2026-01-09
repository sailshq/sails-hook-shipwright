/**
 * lib/tags.js
 *
 * Generate script and style tags from manifest and inject patterns.
 */

const fs = require('fs')
const path = require('path')
const { glob } = require('./glob')

const DEFAULT_INJECT = {
  js: ['dependencies/**/*.js'],
  css: ['dependencies/**/*.css']
}

/**
 * Expand glob patterns, preserving order and deduping.
 */
function expandPatterns(patterns, cwd, ext) {
  const seen = new Set()
  const result = []

  for (const pattern of patterns) {
    if (!pattern.endsWith(ext) && !pattern.includes('*')) continue
    for (const file of glob(pattern, cwd)) {
      if (file.endsWith(ext) && !seen.has(file)) {
        seen.add(file)
        result.push('/' + file.replace(/\\/g, '/'))
      }
    }
  }
  return result
}

/**
 * Create tag generators for views.
 */
function createTagGenerators(appPath, config = {}) {
  const assetsPath = path.resolve(appPath, 'assets')
  const manifestPath = path.resolve(appPath, '.tmp', 'public', 'manifest.json')

  function getManifest(ext) {
    if (!fs.existsSync(manifestPath)) return []
    return JSON.parse(fs.readFileSync(manifestPath, 'utf8')).allFiles.filter(
      (f) => f.endsWith(ext)
    )
  }

  function getTags(ext, template, injectKey) {
    const patterns = config[injectKey] || DEFAULT_INJECT[ext.slice(1)]
    const injected = expandPatterns(patterns, assetsPath, ext)
    const injectedSet = new Set(injected)
    // Filter manifest to exclude already-injected files (avoid duplicates)
    const bundled = getManifest(ext).filter((f) => !injectedSet.has(f))
    return [...injected, ...bundled].map(template).join('\n')
  }

  return {
    scripts: () =>
      getTags('.js', (f) => `<script src="${f}"></script>`, 'jsInject'),
    styles: () =>
      getTags('.css', (f) => `<link rel="stylesheet" href="${f}">`, 'cssInject')
  }
}

module.exports = { createTagGenerators }
