const { describe, it, beforeEach, afterEach } = require('node:test')
const assert = require('node:assert')
const fs = require('fs')
const path = require('path')
const os = require('os')

const { createTagGenerators } = require('../../lib/tags')

describe('tags.js', () => {
  let tmpDir
  let manifestPath
  let assetsPath

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shipwright-test-'))
    manifestPath = path.join(tmpDir, '.tmp', 'public', 'manifest.json')
    assetsPath = path.join(tmpDir, 'assets')
    fs.mkdirSync(path.dirname(manifestPath), { recursive: true })
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  function writeManifest(files) {
    writeManifestPayload({ allFiles: files })
  }

  function writeManifestPayload(manifest) {
    fs.writeFileSync(manifestPath, JSON.stringify(manifest))
  }

  function createAsset(relativePath) {
    const fullPath = path.join(assetsPath, relativePath)
    fs.mkdirSync(path.dirname(fullPath), { recursive: true })
    fs.writeFileSync(fullPath, '')
  }

  describe('scripts()', () => {
    it('returns empty string when no manifest and no dependencies', () => {
      const { scripts } = createTagGenerators(tmpDir, { jsInject: [] })
      assert.strictEqual(scripts(), '')
    })

    it('generates script tags for manifest JS files', () => {
      writeManifest(['/js/app.js', '/css/app.css', '/js/vendor.js'])
      const { scripts } = createTagGenerators(tmpDir, { jsInject: [] })

      assert.strictEqual(
        scripts(),
        '<script src="/js/app.js"></script>\n<script src="/js/vendor.js"></script>'
      )
    })

    it('uses initial JS entry assets without async chunks', () => {
      writeManifestPayload({
        entries: {
          app: {
            initial: {
              js: ['/js/app.js', '/js/vendor.js'],
              css: ['/css/app.css']
            },
            async: {
              js: ['/js/pages/dashboard.js'],
              css: ['/css/pages/dashboard.css']
            }
          }
        },
        allFiles: [
          '/js/app.js',
          '/js/vendor.js',
          '/js/pages/dashboard.js',
          '/css/app.css',
          '/css/pages/dashboard.css'
        ]
      })
      const { scripts } = createTagGenerators(tmpDir, { jsInject: [] })

      const output = scripts()
      assert.strictEqual(
        output,
        '<script src="/js/app.js"></script>\n<script src="/js/vendor.js"></script>'
      )
      assert.ok(!output.includes('/js/pages/dashboard.js'))
    })

    it('supports named JS entries', () => {
      writeManifestPayload({
        entries: {
          app: {
            initial: {
              js: ['/js/app.js']
            }
          },
          admin: {
            initial: {
              js: ['/js/admin.js', '/js/admin-vendor.js']
            },
            async: {
              js: ['/js/pages/admin-settings.js']
            }
          }
        },
        allFiles: [
          '/js/app.js',
          '/js/admin.js',
          '/js/admin-vendor.js',
          '/js/pages/admin-settings.js'
        ]
      })
      const { scripts } = createTagGenerators(tmpDir, { jsInject: [] })

      const output = scripts('admin')
      assert.strictEqual(
        output,
        '<script src="/js/admin.js"></script>\n<script src="/js/admin-vendor.js"></script>'
      )
      assert.ok(!output.includes('/js/app.js'))
      assert.ok(!output.includes('/js/pages/admin-settings.js'))
    })

    it('uses default inject pattern when not specified', () => {
      createAsset('dependencies/lodash.js')
      createAsset('dependencies/vue.js')
      writeManifest(['/js/app.js'])

      // No jsInject = defaults to dependencies/**/*.js
      const { scripts } = createTagGenerators(tmpDir)

      const output = scripts()
      assert.ok(output.includes('/dependencies/lodash.js'))
      assert.ok(output.includes('/dependencies/vue.js'))
      assert.ok(output.includes('/js/app.js'))
    })

    it('injects files before manifest in specified order', () => {
      createAsset('dependencies/sails.io.js')
      createAsset('dependencies/lodash.js')
      createAsset('dependencies/vue.js')
      writeManifest(['/js/app.js'])

      const { scripts } = createTagGenerators(tmpDir, {
        jsInject: [
          'dependencies/sails.io.js',
          'dependencies/lodash.js',
          'dependencies/vue.js'
        ]
      })

      const output = scripts()
      const sailsIdx = output.indexOf('sails.io.js')
      const lodashIdx = output.indexOf('lodash.js')
      const vueIdx = output.indexOf('vue.js')
      const appIdx = output.indexOf('/js/app.js')

      assert.ok(sailsIdx < lodashIdx, 'sails.io should come before lodash')
      assert.ok(lodashIdx < vueIdx, 'lodash should come before vue')
      assert.ok(vueIdx < appIdx, 'vue should come before app.js')
    })

    it('injects files before initial manifest assets and removes duplicates', () => {
      createAsset('dependencies/sails.io.js')
      writeManifestPayload({
        entries: {
          app: {
            initial: {
              js: ['/dependencies/sails.io.js', '/js/app.js']
            },
            async: {
              js: ['/js/pages/dashboard.js']
            }
          }
        },
        allFiles: [
          '/dependencies/sails.io.js',
          '/js/app.js',
          '/js/pages/dashboard.js'
        ]
      })

      const { scripts } = createTagGenerators(tmpDir, {
        jsInject: ['dependencies/sails.io.js']
      })

      const output = scripts()
      const matches = output.match(/sails\.io\.js/g) || []
      assert.strictEqual(matches.length, 1, 'sails.io should appear only once')
      assert.ok(
        output.indexOf('sails.io.js') < output.indexOf('/js/app.js'),
        'injected JS should come before manifest JS'
      )
      assert.ok(!output.includes('/js/pages/dashboard.js'))
    })

    it('supports glob patterns with deduplication', () => {
      createAsset('dependencies/sails.io.js')
      createAsset('dependencies/lodash.js')
      createAsset('dependencies/vue.js')

      const { scripts } = createTagGenerators(tmpDir, {
        jsInject: [
          'dependencies/sails.io.js', // Explicit first
          'dependencies/**/*.js' // Glob catches rest, sails.io deduped
        ]
      })

      const output = scripts()
      // sails.io should appear only once
      const matches = output.match(/sails\.io\.js/g)
      assert.strictEqual(matches.length, 1, 'sails.io should appear only once')

      // Order: sails.io first (explicit), then rest
      const sailsIdx = output.indexOf('sails.io.js')
      const lodashIdx = output.indexOf('lodash.js')
      assert.ok(
        sailsIdx < lodashIdx,
        'explicit file should come before glob matches'
      )
    })

    it('empty inject array means no injection', () => {
      createAsset('dependencies/lodash.js')
      writeManifest(['/js/app.js'])

      const { scripts } = createTagGenerators(tmpDir, { jsInject: [] })

      const output = scripts()
      assert.ok(!output.includes('lodash.js'), 'should not inject dependencies')
      assert.ok(output.includes('/js/app.js'), 'should still include manifest')
    })
  })

  describe('styles()', () => {
    it('returns empty string when no manifest and no dependencies', () => {
      const { styles } = createTagGenerators(tmpDir, { cssInject: [] })
      assert.strictEqual(styles(), '')
    })

    it('generates link tags for manifest CSS files', () => {
      writeManifest(['/css/app.css', '/js/app.js', '/css/vendor.css'])
      const { styles } = createTagGenerators(tmpDir, { cssInject: [] })

      assert.strictEqual(
        styles(),
        '<link rel="stylesheet" href="/css/app.css">\n<link rel="stylesheet" href="/css/vendor.css">'
      )
    })

    it('uses initial CSS entry assets without async chunks', () => {
      writeManifestPayload({
        entries: {
          app: {
            initial: {
              js: ['/js/app.js'],
              css: ['/css/app.css', '/css/vendor.css']
            },
            async: {
              js: ['/js/pages/dashboard.js'],
              css: ['/css/pages/dashboard.css']
            }
          }
        },
        allFiles: [
          '/js/app.js',
          '/js/pages/dashboard.js',
          '/css/app.css',
          '/css/vendor.css',
          '/css/pages/dashboard.css'
        ]
      })
      const { styles } = createTagGenerators(tmpDir, { cssInject: [] })

      const output = styles()
      assert.strictEqual(
        output,
        '<link rel="stylesheet" href="/css/app.css">\n<link rel="stylesheet" href="/css/vendor.css">'
      )
      assert.ok(!output.includes('/css/pages/dashboard.css'))
    })

    it('supports named CSS entries', () => {
      writeManifestPayload({
        entries: {
          app: {
            initial: {
              css: ['/css/app.css']
            }
          },
          admin: {
            initial: {
              css: ['/css/admin.css', '/css/admin-vendor.css']
            },
            async: {
              css: ['/css/pages/admin-settings.css']
            }
          }
        },
        allFiles: [
          '/css/app.css',
          '/css/admin.css',
          '/css/admin-vendor.css',
          '/css/pages/admin-settings.css'
        ]
      })
      const { styles } = createTagGenerators(tmpDir, { cssInject: [] })

      const output = styles('admin')
      assert.strictEqual(
        output,
        '<link rel="stylesheet" href="/css/admin.css">\n<link rel="stylesheet" href="/css/admin-vendor.css">'
      )
      assert.ok(!output.includes('/css/app.css'))
      assert.ok(!output.includes('/css/pages/admin-settings.css'))
    })

    it('uses default inject pattern when not specified', () => {
      createAsset('dependencies/normalize.css')
      writeManifest(['/css/app.css'])

      const { styles } = createTagGenerators(tmpDir)

      const output = styles()
      assert.ok(output.includes('/dependencies/normalize.css'))
      assert.ok(output.includes('/css/app.css'))
    })

    it('injects CSS before manifest', () => {
      createAsset('dependencies/normalize.css')
      createAsset('dependencies/fontawesome.css')
      writeManifest(['/css/app.css'])

      const { styles } = createTagGenerators(tmpDir, {
        cssInject: ['dependencies/**/*.css']
      })

      const output = styles()
      const normalizeIdx = output.indexOf('normalize.css')
      const appIdx = output.indexOf('/css/app.css')

      assert.ok(
        normalizeIdx < appIdx,
        'injected CSS should come before manifest'
      )
    })

    it('injects CSS before initial manifest assets and removes duplicates', () => {
      createAsset('dependencies/normalize.css')
      writeManifestPayload({
        entries: {
          app: {
            initial: {
              css: ['/dependencies/normalize.css', '/css/app.css']
            },
            async: {
              css: ['/css/pages/dashboard.css']
            }
          }
        },
        allFiles: [
          '/dependencies/normalize.css',
          '/css/app.css',
          '/css/pages/dashboard.css'
        ]
      })

      const { styles } = createTagGenerators(tmpDir, {
        cssInject: ['dependencies/normalize.css']
      })

      const output = styles()
      const matches = output.match(/normalize\.css/g) || []
      assert.strictEqual(
        matches.length,
        1,
        'normalize.css should appear only once'
      )
      assert.ok(
        output.indexOf('normalize.css') < output.indexOf('/css/app.css'),
        'injected CSS should come before manifest CSS'
      )
      assert.ok(!output.includes('/css/pages/dashboard.css'))
    })
  })

  it('falls back to allFiles when entries are missing', () => {
    writeManifest(['/js/app.js', '/css/app.css', '/images/logo.svg'])
    const { scripts, styles } = createTagGenerators(tmpDir, {
      jsInject: [],
      cssInject: []
    })

    assert.strictEqual(scripts(), '<script src="/js/app.js"></script>')
    assert.strictEqual(styles(), '<link rel="stylesheet" href="/css/app.css">')
  })

  it('falls back to allFiles when the default entry initial assets are missing', () => {
    writeManifestPayload({
      entries: {
        app: {}
      },
      allFiles: ['/js/app.js', '/css/app.css', '/images/logo.svg']
    })
    const { scripts, styles } = createTagGenerators(tmpDir, {
      jsInject: [],
      cssInject: []
    })

    assert.strictEqual(scripts(), '<script src="/js/app.js"></script>')
    assert.strictEqual(styles(), '<link rel="stylesheet" href="/css/app.css">')
  })

  it('does not fall back to allFiles for missing named entries', () => {
    writeManifestPayload({
      entries: {
        app: {
          initial: {
            js: ['/js/app.js'],
            css: ['/css/app.css']
          }
        }
      },
      allFiles: ['/js/app.js', '/js/admin.js', '/css/app.css', '/css/admin.css']
    })
    const { scripts, styles } = createTagGenerators(tmpDir, {
      jsInject: [],
      cssInject: []
    })

    assert.strictEqual(scripts('admin'), '')
    assert.strictEqual(styles('admin'), '')
  })

  it('reads fresh manifest on each call (no caching)', () => {
    const { scripts } = createTagGenerators(tmpDir, { jsInject: [] })

    assert.strictEqual(scripts(), '')

    writeManifest(['/js/app.js'])
    assert.strictEqual(scripts(), '<script src="/js/app.js"></script>')

    writeManifest(['/js/app.js', '/js/new.js'])
    assert.ok(scripts().includes('/js/new.js'))
  })

  it('handles nested directories in inject patterns', () => {
    createAsset('js/components/header.js')
    createAsset('js/components/footer.js')
    createAsset('js/utilities/helpers.js')

    const { scripts } = createTagGenerators(tmpDir, {
      jsInject: ['js/components/**/*.js', 'js/utilities/**/*.js']
    })

    const output = scripts()
    assert.ok(output.includes('/js/components/header.js'))
    assert.ok(output.includes('/js/components/footer.js'))
    assert.ok(output.includes('/js/utilities/helpers.js'))
  })
})
