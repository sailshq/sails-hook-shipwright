/**
 * shipwright hook
 *
 * @description :: A hook definition.  Extends Sails by adding shadow routes, implicit actions, and/or initialization logic.
 * @docs        :: https://sailsjs.com/docs/concepts/extending-sails/hooks
 */

const path = require('path')
const { defineConfig, mergeRsbuildConfig } = require('@rsbuild/core')
module.exports = function defineShipwrightHook(sails) {
  function getManifestFiles() {
    const manifestPath = path.resolve(
      sails.config.appPath,
      '.tmp',
      'public',
      'manifest.json'
    )
    const data = require(manifestPath)
    const files = data.allFiles
    return files
  }
  function generateScripts() {
    const manifestFiles = getManifestFiles()
    let scripts = []
    manifestFiles.forEach((file) => {
      if (file.endsWith('.js')) {
        scripts.push(`<script type="text/javascript" src="${file}"></script>`)
      }
    })
    return scripts.join('\n')
  }

  function generateStyles() {
    const manifestFiles = getManifestFiles()
    let styles = []
    manifestFiles.forEach((file) => {
      if (file.endsWith('.css')) {
        styles.push(`<link rel="stylesheet" href="${file}">`)
      }
    })
    return styles.join('\n')
  }
  return {
    defaults: {
      shipwright: {
        build: {}
      }
    },
    /**
     * Runs when this Sails app loads/lifts.
     */
    initialize: async function () {
      const appPath = sails.config.appPath
      const defaultConfigs = defineConfig({
        source: {
          entry: {
            app: path.resolve(appPath, 'assets', 'js', 'app.js')
          },
          alias: {
            '@': path.resolve(appPath, 'assets', 'js'),
            '~': path.resolve(appPath, 'assets')
          }
        },
        output: {
          manifest: true,
          distPath: {
            root: '.tmp/public',
            css: 'css',
            js: 'js',
            font: 'fonts',
            image: 'images',
            html: '/'
          },
          copy: [
            {
              from: path.resolve(appPath, 'assets', 'images'),
              to: path.resolve(appPath, '.tmp', 'public', 'images'),
              noErrorOnMissing: true
            },
            {
              from: path.resolve(appPath, 'assets', 'fonts'),
              to: path.resolve(appPath, '.tmp', 'public', 'fonts'),
              noErrorOnMissing: true
            },
            {
              from: path.resolve(appPath, 'assets', 'dependencies'),
              to: path.resolve(appPath, '.tmp', 'public', 'dependencies'),
              noErrorOnMissing: true
            },
            {
              context: path.resolve(appPath, 'assets'),
              from: '**/*.html',
              to: path.resolve(appPath, '.tmp', 'public'),
              noErrorOnMissing: true
            }
          ]
        },
        tools: {
          htmlPlugin: false
        },
        performance: {
          chunkSplit: {
            strategy: 'split-by-experience'
          }
        },
        server: {
          port: sails.config.port,
          strictPort: true,
          printUrls: false
        },
        dev: {
          writeToDisk: (file) => file.includes('manifest.json') // Write manifest file
        }
      })
      const config = mergeRsbuildConfig(
        defaultConfigs,
        sails.config.shipwright.build
      )
      const { createRsbuild } = require('@rsbuild/core')
      try {
        const rsbuild = await createRsbuild({ rsbuildConfig: config })
        if (process.env.NODE_ENV === 'production') {
          await rsbuild.build()
        } else {
          const rsbuildDevServer = await rsbuild.createDevServer()
          sails.after('hook:http:loaded', async () => {
            sails.hooks.http.app.use(rsbuildDevServer.middlewares)
            sails.hooks.http.server.on(
              'upgrade',
              rsbuildDevServer.onHTTPUpgrade
            )
          })
          sails.on('lifted', async () => {
            await rsbuildDevServer.afterListen()
          })
          sails.on('lower', async () => {
            await rsbuildDevServer.close()
          })
          sails.after('lifted', () => {})
        }
        sails.config.views.locals = {
          shipwright: { scripts: generateScripts, styles: generateStyles }
        }
      } catch (error) {
        sails.log.error(error)
      }
    }
  }
}
