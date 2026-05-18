const { describe, it, beforeEach, afterEach } = require('node:test')
const assert = require('node:assert')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

const { createDefaultRsbuildConfig } = require('../../lib/rsbuild-config')

const TEST_SAILS_PORT = 1337

describe('rsbuild-config.js', () => {
  let tmpDir

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shipwright-rsbuild-'))
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('uses Rsbuild 2 splitChunks defaults instead of deprecated chunkSplit', () => {
    const config = createDefaultRsbuildConfig({
      appPath: '/app',
      entry: { app: ['/app/assets/js/app.js'] },
      port: TEST_SAILS_PORT
    })

    assert.deepStrictEqual(config.splitChunks, { preset: 'default' })
    assert.strictEqual(config.performance.chunkSplit, undefined)
    assert.deepStrictEqual(config.performance.printFileSize, { diff: true })
  })

  it('keeps Shipwright aliases and output paths stable', () => {
    const config = createDefaultRsbuildConfig({
      appPath: '/app',
      entry: { app: ['/app/assets/js/app.js'] },
      port: TEST_SAILS_PORT
    })

    assert.strictEqual(
      config.resolve.alias['@'],
      path.resolve('/app/assets/js')
    )
    assert.strictEqual(config.resolve.alias['~'], path.resolve('/app/assets'))
    assert.strictEqual(config.output.manifest, true)
    assert.strictEqual(config.output.distPath.root, '.tmp/public')
    assert.strictEqual(config.output.distPath.js, 'js')
    assert.strictEqual(config.output.distPath.css, 'css')
  })

  it('uses the Sails-supplied port for the Rsbuild dev server config', () => {
    const config = createDefaultRsbuildConfig({
      appPath: '/app',
      entry: { app: ['/app/assets/js/app.js'] },
      port: TEST_SAILS_PORT
    })

    assert.strictEqual(config.server.port, TEST_SAILS_PORT)
    assert.strictEqual(config.server.strictPort, true)
  })

  it('writes the dev manifest to disk for tag generation', () => {
    const config = createDefaultRsbuildConfig({
      appPath: '/app',
      entry: { app: ['/app/assets/js/app.js'] },
      port: TEST_SAILS_PORT
    })

    assert.strictEqual(
      config.dev.writeToDisk('/app/.tmp/public/manifest.json'),
      true
    )
    assert.strictEqual(
      config.dev.writeToDisk('/app/.tmp/public/js/app.js'),
      false
    )
  })

  it('keeps Sails-owned static URLs out of css-loader processing', () => {
    const config = createDefaultRsbuildConfig({
      appPath: '/app',
      entry: { app: ['/app/assets/js/app.js'] },
      port: TEST_SAILS_PORT
    })

    const filter = config.tools.cssLoader.url.filter

    assert.strictEqual(filter('/images/logo.png'), false)
    assert.strictEqual(filter('../images/logo.png'), true)
  })

  it('builds a manifest with Rsbuild 2 for Shipwright tag generation', async () => {
    const jsPath = path.join(tmpDir, 'assets/js/app.js')
    const cssPath = path.join(tmpDir, 'assets/css/app.css')

    fs.mkdirSync(path.dirname(jsPath), { recursive: true })
    fs.mkdirSync(path.dirname(cssPath), { recursive: true })
    fs.writeFileSync(
      jsPath,
      "import '../css/app.css'\ndocument.body.dataset.shipwright = 'ready'\n"
    )
    fs.writeFileSync(cssPath, 'body { color: #123456; }\n')

    const { createRsbuild } = await import('@rsbuild/core')
    const rsbuild = await createRsbuild({
      cwd: tmpDir,
      rsbuildConfig: createDefaultRsbuildConfig({
        appPath: tmpDir,
        entry: { app: jsPath },
        port: TEST_SAILS_PORT
      })
    })

    await rsbuild.build()

    const manifestPath = path.join(tmpDir, '.tmp/public/manifest.json')
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))

    assert.ok(Array.isArray(manifest.allFiles))
    assert.ok(
      manifest.allFiles.some((file) => file.startsWith('/js/')),
      'manifest should include a JS file for scripts()'
    )
    assert.ok(
      manifest.allFiles.some((file) => file.startsWith('/css/')),
      'manifest should include a CSS file for styles()'
    )
  })
})
