/**
 * sails-hook-shipwright
 *
 * Modern asset pipeline for Sails.js, powered by Rsbuild.
 *
 * @see https://github.com/sailshq/sails-hook-shipwright
 */

const path = require('path')
const {
  detectStylesEntry,
  detectJsEntry,
  expandEntryPatterns,
  validatePlugins
} = require('./lib/entry')
const { createTagGenerators } = require('./lib/tags')
const { createLogger, randomQuote } = require('./lib/log')

module.exports = function defineShipwrightHook(sails) {
  let log
  let tagGenerators

  return {
    defaults: {
      shipwright: {
        styles: {},
        js: {},
        build: {}
      }
    },

    /**
     * Configure hook.
     * Runs after defaults merge, before initialize.
     * Detects entry points and validates plugins early.
     */
    configure: function () {
      log = createLogger(sails.log)

      const { appPath } = sails.config
      const config = sails.config.shipwright

      config.styles.entry = detectStylesEntry(appPath, config.styles.entry)
      config.js.entry = detectJsEntry(appPath, config.js.entry)

      validatePlugins({ appPath, stylesEntry: config.styles.entry, log })

      // Create tag generators early so other hooks can use them
      tagGenerators = createTagGenerators(appPath, {
        jsInject: config.js.inject,
        cssInject: config.styles.inject
      })

      // Register view locals
      sails.config.views = sails.config.views || {}
      sails.config.views.locals = {
        ...sails.config.views.locals,
        shipwright: tagGenerators
      }
    },

    // Expose tag generators on hook for other hooks to use
    scripts: () => tagGenerators?.scripts() || '',
    styles: () => tagGenerators?.styles() || '',

    /**
     * Initialize hook.
     * Starts Rsbuild build (production) or dev server (development).
     */
    initialize: async function () {
      if (sails.config.dontLift) {
        log.verbose('Skipping build (dontLift)')
        return
      }

      const { appPath } = sails.config
      const config = sails.config.shipwright

      // Build entry object - array patterns get expanded to file list
      const entry = {}
      const jsFiles = expandEntryPatterns(config.js.entry, appPath)
      if (jsFiles?.length) {
        entry.app = jsFiles
        log.verbose('Bundling %d JS files', jsFiles.length)
      } else if (config.js.entry && !Array.isArray(config.js.entry)) {
        entry.app = [path.resolve(appPath, config.js.entry)]
        log.verbose('Bundling %s', config.js.entry)
      }
      if (config.styles.entry) {
        const stylesPath = path.resolve(appPath, config.styles.entry)
        if (entry.app) {
          // Bundle CSS with the JS entry so the chunk keeps a JS module map.
          // CSS-only entries produce chunks with no JS modules, which crashes
          // the HMR runtime in jsonp_chunk_loading when it tries to apply
          // updates. The CSS extract plugin still outputs a separate CSS file.
          entry.app.unshift(stylesPath)
        } else {
          entry.styles = stylesPath
        }
        log.verbose('Compiling %s', config.styles.entry)
      }

      log.silly('Preparing to set sail...')

      if (!Object.keys(entry).length) {
        log.verbose('No entry points found, skipping')
        return
      }

      const {
        defineConfig,
        mergeRsbuildConfig,
        createRsbuild
      } = require('@rsbuild/core')

      const defaultConfig = defineConfig({
        source: { entry },
        resolve: {
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
            image: 'images'
          },
          copy: [
            {
              from: path.resolve(appPath, 'assets'),
              to: path.resolve(appPath, '.tmp', 'public'),
              noErrorOnMissing: true,
              globOptions: { ignore: ['**/js/**', '**/styles/**', '**/css/**'] }
            }
          ]
        },
        tools: {
          htmlPlugin: false,
          // Don't process absolute URLs in CSS - they reference static assets served from .tmp/public
          cssLoader: { url: { filter: (url) => !url.startsWith('/') } },
          rspack: {
            watchOptions: {
              // Only watch assets/ and node_modules/ — ignore top-level data
              // directories (e.g. db/ from sails-disk) so non-source filesystem
              // writes don't trigger rebuilds.
              ignored: /^(?!.*[\\/](assets|node_modules)[\\/])/
            }
          }
        },
        performance: {
          chunkSplit: { strategy: 'split-by-experience' },
          printFileSize: { diff: true }
        },
        server: { port: sails.config.port, strictPort: true, printUrls: false },
        dev: { writeToDisk: (file) => file.includes('manifest.json') }
      })

      const rsbuildConfig = mergeRsbuildConfig(defaultConfig, config.build)

      try {
        const rsbuild = await createRsbuild({ rsbuildConfig })

        if (process.env.NODE_ENV === 'production') {
          log.silly('Building for production...')
          await rsbuild.build()
          log.verbose('Build complete ⚓')
          log.silly('🚢 %s', randomQuote())
        } else {
          const devServer = await rsbuild.createDevServer()

          sails.after('hook:http:loaded', () => {
            sails.hooks.http.app.use(devServer.middlewares)
            devServer.connectWebSocket({ server: sails.hooks.http.server })
          })

          sails.on('lifted', () => {
            devServer.afterListen()
            log.verbose('Dev server ready ⚓')
            log.silly('🚢 %s', randomQuote())
          })

          sails.on('lower', () => {
            devServer.close()
            log.silly('Dropping anchor... goodbye!')
          })
        }
      } catch (error) {
        log.error('Build failed')
        log.error(error)
      }
    }
  }
}
