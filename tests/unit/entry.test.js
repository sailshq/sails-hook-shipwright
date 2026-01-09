const { describe, it, beforeEach, afterEach } = require('node:test')
const assert = require('node:assert')
const fs = require('fs')
const path = require('path')
const os = require('os')

const {
  detectStylesEntry,
  detectJsEntry,
  expandEntryPatterns,
  validatePlugins
} = require('../../lib/entry')

describe('entry.js', () => {
  let tmpDir
  const mockLog = { error: () => {} }

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shipwright-test-'))
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  function createFile(relativePath) {
    const fullPath = path.join(tmpDir, relativePath)
    fs.mkdirSync(path.dirname(fullPath), { recursive: true })
    fs.writeFileSync(fullPath, '')
  }

  describe('detectStylesEntry', () => {
    it('returns configured entry over auto-detection', () => {
      createFile('assets/styles/importer.less')
      assert.strictEqual(
        detectStylesEntry(tmpDir, 'custom.less'),
        'custom.less'
      )
    })

    it('auto-detects in priority order: importer.less > main.less > app.less', () => {
      createFile('assets/styles/app.less')
      assert.strictEqual(
        detectStylesEntry(tmpDir, null),
        'assets/styles/app.less'
      )

      createFile('assets/styles/importer.less')
      assert.strictEqual(
        detectStylesEntry(tmpDir, null),
        'assets/styles/importer.less'
      )
    })

    it('returns null if no entry found', () => {
      assert.strictEqual(detectStylesEntry(tmpDir, null), null)
    })
  })

  describe('detectJsEntry', () => {
    it('returns configured entry over auto-detection', () => {
      createFile('assets/js/app.js')
      assert.strictEqual(detectJsEntry(tmpDir, 'custom.js'), 'custom.js')
    })

    it('auto-detects in priority order: app.js > main.js > index.js', () => {
      createFile('assets/js/index.js')
      assert.strictEqual(detectJsEntry(tmpDir, null), 'assets/js/index.js')

      createFile('assets/js/app.js')
      assert.strictEqual(detectJsEntry(tmpDir, null), 'assets/js/app.js')
    })

    it('returns null if no entry found', () => {
      assert.strictEqual(detectJsEntry(tmpDir, null), null)
    })

    it('returns array as-is (glob patterns)', () => {
      const patterns = ['js/utilities/**/*.js', 'js/pages/**/*.js']
      assert.deepStrictEqual(detectJsEntry(tmpDir, patterns), patterns)
    })
  })

  describe('expandEntryPatterns', () => {
    it('returns null for non-array input', () => {
      assert.strictEqual(expandEntryPatterns('assets/js/app.js', tmpDir), null)
      assert.strictEqual(expandEntryPatterns(null, tmpDir), null)
    })

    it('expands glob patterns preserving order', () => {
      createFile('assets/js/utilities/helpers.js')
      createFile('assets/js/utilities/format.js')
      createFile('assets/js/pages/home.js')
      createFile('assets/js/pages/about.js')

      const result = expandEntryPatterns(
        ['js/utilities/**/*.js', 'js/pages/**/*.js'],
        tmpDir
      )

      assert.strictEqual(result.length, 4)
      const utilitiesIdx = result.findIndex((f) => f.includes('utilities'))
      const pagesIdx = result.findIndex((f) => f.includes('pages'))
      assert.ok(utilitiesIdx < pagesIdx, 'utilities should come before pages')
    })

    it('deduplicates files across patterns', () => {
      createFile('assets/js/app.js')
      createFile('assets/js/utils.js')

      const result = expandEntryPatterns(['js/app.js', 'js/**/*.js'], tmpDir)

      const appMatches = result.filter((f) => f.includes('app.js'))
      assert.strictEqual(appMatches.length, 1)
      assert.ok(result[0].includes('app.js'))
    })

    it('returns absolute paths', () => {
      createFile('assets/js/app.js')
      const result = expandEntryPatterns(['js/**/*.js'], tmpDir)
      assert.ok(path.isAbsolute(result[0]))
    })

    it('includes js, ts, tsx, jsx files', () => {
      createFile('assets/js/app.js')
      createFile('assets/js/utils.ts')
      createFile('assets/js/component.tsx')
      createFile('assets/js/legacy.jsx')
      createFile('assets/js/styles.css')
      createFile('assets/js/readme.md')

      const result = expandEntryPatterns(['js/**/*'], tmpDir)

      assert.strictEqual(result.length, 4)
    })

    it('returns empty array when no matches', () => {
      const result = expandEntryPatterns(['js/**/*.js'], tmpDir)
      assert.strictEqual(result.length, 0)
    })
  })

  describe('validatePlugins', () => {
    it('passes for .css (no plugin needed) or no entry', () => {
      validatePlugins({ appPath: tmpDir, stylesEntry: null, log: mockLog })
      validatePlugins({ appPath: tmpDir, stylesEntry: 'app.css', log: mockLog })
    })

    it('throws for .less when plugin missing', () => {
      assert.throws(
        () =>
          validatePlugins({
            appPath: tmpDir,
            stylesEntry: 'app.less',
            log: mockLog
          }),
        { message: 'Missing @rsbuild/plugin-less' }
      )
    })

    it('throws for .scss/.sass when plugin missing', () => {
      assert.throws(
        () =>
          validatePlugins({
            appPath: tmpDir,
            stylesEntry: 'app.scss',
            log: mockLog
          }),
        { message: 'Missing @rsbuild/plugin-sass' }
      )
    })
  })
})
