const { describe, it, beforeEach, afterEach } = require('node:test')
const assert = require('node:assert')
const fs = require('fs')
const path = require('path')
const os = require('os')

const {
  detectStylesEntry,
  detectJsEntry,
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
