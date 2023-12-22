/**
 * shipwright hook
 *
 * @description :: A hook definition.  Extends Sails by adding shadow routes, implicit actions, and/or initialization logic.
 * @docs        :: https://sailsjs.com/docs/concepts/extending-sails/hooks
 */

const path = require('path')
const { defineConfig, mergeRsbuildConfig } = require('@rsbuild/core')
module.exports = function defineShipwrightHook(sails) {
  return {
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
          disableFilenameHash: true,
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
              to: path.resolve(appPath, '.tmp', 'public', 'images')
            },
            {
              from: path.resolve(appPath, 'assets', 'fonts'),
              to: path.resolve(appPath, '.tmp', 'public', 'fonts')
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
            strategy: 'all-in-one'
          }
        }
      })
      const config = mergeRsbuildConfig(
        defaultConfigs,
        sails.config.shipwright.build
      )
      const { createRsbuild } = require('@rsbuild/core')
      try {
        const rsbuild = await createRsbuild({ rsbuildConfig: config })
        if (process.env.NODE_ENV == 'production') {
          rsbuild.build()
        } else {
          rsbuild.build({ mode: 'development', watch: true })
        }
      } catch (error) {
        sails.error(error)
      }
    }
  }
}
