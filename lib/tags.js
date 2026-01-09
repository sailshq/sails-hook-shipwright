/**
 * lib/tags.js
 *
 * Generate script and style tags from the manifest.
 */

const fs = require('fs')
const path = require('path')

/**
 * Create tag generators bound to the app path.
 */
function createTagGenerators(appPath) {
  const manifestPath = path.resolve(appPath, '.tmp', 'public', 'manifest.json')

  function readManifest() {
    if (!fs.existsSync(manifestPath)) {
      return { allFiles: [] }
    }
    return JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  }

  function generateTags(extension, template) {
    return readManifest()
      .allFiles.filter((file) => file.endsWith(extension))
      .map((file) => template(file))
      .join('\n')
  }

  return {
    scripts: () =>
      generateTags('.js', (file) => `<script src="${file}"></script>`),
    styles: () =>
      generateTags('.css', (file) => `<link rel="stylesheet" href="${file}">`)
  }
}

module.exports = { createTagGenerators }
