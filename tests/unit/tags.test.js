const { describe, it, beforeEach, afterEach } = require('node:test')
const assert = require('node:assert')
const fs = require('fs')
const path = require('path')
const os = require('os')

const { createTagGenerators } = require('../../lib/tags')

describe('tags.js', () => {
  let tmpDir
  let manifestPath

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shipwright-test-'))
    manifestPath = path.join(tmpDir, '.tmp', 'public', 'manifest.json')
    fs.mkdirSync(path.dirname(manifestPath), { recursive: true })
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  function writeManifest(files) {
    fs.writeFileSync(manifestPath, JSON.stringify({ allFiles: files }))
  }

  describe('scripts()', () => {
    it('returns empty string when no manifest', () => {
      const { scripts } = createTagGenerators(tmpDir)
      assert.strictEqual(scripts(), '')
    })

    it('generates script tags for JS files only', () => {
      writeManifest(['/js/app.js', '/css/app.css', '/js/vendor.js'])
      const { scripts } = createTagGenerators(tmpDir)

      assert.strictEqual(
        scripts(),
        '<script src="/js/app.js"></script>\n<script src="/js/vendor.js"></script>'
      )
    })
  })

  describe('styles()', () => {
    it('returns empty string when no manifest', () => {
      const { styles } = createTagGenerators(tmpDir)
      assert.strictEqual(styles(), '')
    })

    it('generates link tags for CSS files only', () => {
      writeManifest(['/css/app.css', '/js/app.js', '/css/vendor.css'])
      const { styles } = createTagGenerators(tmpDir)

      assert.strictEqual(
        styles(),
        '<link rel="stylesheet" href="/css/app.css">\n<link rel="stylesheet" href="/css/vendor.css">'
      )
    })
  })

  it('reads fresh manifest on each call (no caching)', () => {
    const { scripts } = createTagGenerators(tmpDir)

    assert.strictEqual(scripts(), '')

    writeManifest(['/js/app.js'])
    assert.strictEqual(scripts(), '<script src="/js/app.js"></script>')

    writeManifest(['/js/app.js', '/js/new.js'])
    assert.ok(scripts().includes('/js/new.js'))
  })
})
