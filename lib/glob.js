/**
 * lib/glob.js
 *
 * Glob wrapper for easy swapping between implementations.
 *
 * To swap to Node's built-in (Node 22+):
 *   const { globSync } = require('fs')
 *   module.exports = { glob: (pattern, cwd) => globSync(pattern, { cwd }) }
 */

const fg = require('fast-glob')

/**
 * Match files against glob patterns.
 *
 * @param {string|string[]} patterns - Glob pattern(s)
 * @param {string} cwd - Base directory
 * @returns {string[]} - Matching file paths (relative to cwd)
 */
function glob(patterns, cwd) {
  return fg.sync(patterns, { cwd, onlyFiles: true })
}

module.exports = { glob }
