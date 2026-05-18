/**
 * lib/rsbuild-config.js
 *
 * Default Rsbuild configuration for the Sails integration.
 */

const path = require('path')

function createDefaultRsbuildConfig({ appPath, entry, port }) {
  return {
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
          // Only watch assets/ and node_modules/ - ignore top-level data
          // directories (e.g. db/ from sails-disk) so non-source filesystem
          // writes don't trigger rebuilds.
          ignored: /^(?!.*[\\/](assets|node_modules)[\\/])/
        }
      }
    },
    performance: {
      printFileSize: { diff: true }
    },
    splitChunks: { preset: 'default' },
    server: { port, strictPort: true, printUrls: false },
    dev: { writeToDisk: (file) => file.includes('manifest.json') }
  }
}

module.exports = { createDefaultRsbuildConfig }
