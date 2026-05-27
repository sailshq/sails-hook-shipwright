const { describe, it, beforeEach, afterEach } = require('node:test')
const assert = require('node:assert')
const fs = require('fs')
const path = require('path')
const os = require('os')

const defineShipwrightHook = require('../../index')

describe('index.js', () => {
  let tmpDir
  let manifestPath

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shipwright-hook-'))
    manifestPath = path.join(tmpDir, '.tmp', 'public', 'manifest.json')
    fs.mkdirSync(path.dirname(manifestPath), { recursive: true })
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('passes entry names through hook-level tag helpers', () => {
    fs.writeFileSync(
      manifestPath,
      JSON.stringify({
        entries: {
          admin: {
            initial: {
              js: ['/js/admin.js'],
              css: ['/css/admin.css']
            }
          }
        },
        allFiles: [
          '/js/app.js',
          '/js/admin.js',
          '/css/app.css',
          '/css/admin.css'
        ]
      })
    )

    const sails = {
      config: {
        appPath: tmpDir,
        port: 1337,
        shipwright: {
          js: { inject: [] },
          styles: { inject: [] },
          build: {}
        }
      },
      log: {
        silly: () => {},
        verbose: () => {},
        warn: () => {}
      }
    }

    const hook = defineShipwrightHook(sails)

    hook.configure()

    assert.strictEqual(
      hook.scripts('admin'),
      '<script src="/js/admin.js"></script>'
    )
    assert.strictEqual(
      hook.styles('admin'),
      '<link rel="stylesheet" href="/css/admin.css">'
    )
  })
})
