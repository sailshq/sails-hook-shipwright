# Shipwright

The modern asset pipeline for Sails.js, powered by [Rsbuild](https://rsbuild.dev).

Shipwright replaces the legacy Grunt-based asset pipeline with a fast, modern bundler that supports TypeScript, ES modules, LESS/SASS, and Hot Module Replacement out of the box.

## Why Shipwright?

| Feature                | Grunt (legacy) | Shipwright |
| ---------------------- | -------------- | ---------- |
| Build speed            | ~16s           | ~1.4s      |
| JS bundle size         | 3.0MB          | 229KB      |
| CSS bundle size        | 733KB          | 551KB      |
| Hot Module Replacement | No             | Yes        |
| TypeScript             | No             | Yes        |
| ES Modules             | No             | Yes        |
| Tree Shaking           | No             | Yes        |

_Benchmarks from [fleetdm.com](https://fleetdm.com) migration ([fleetdm/fleet#38079](https://github.com/fleetdm/fleet/issues/38079))_

## Installation

```bash
npm install sails-hook-shipwright --save
```

## Runtime Requirements

Shipwright uses Rsbuild 2.x and requires Node.js `20.19+` or `22.12+`.
This matches Rsbuild's supported runtime floor now that Node.js 18 is no
longer supported by Rsbuild. This release track is tested with Rsbuild 2.2.5
and Rspack 2.2.3.

Disable the grunt hook in `.sailsrc`:

```json
{
  "hooks": {
    "grunt": false
  }
}
```

## Quick Start

Shipwright works with zero configuration for most apps. Just create your entry point:

```
assets/
  js/
    app.js       # Auto-detected entry point
  styles/
    importer.less  # Auto-detected styles entry
```

In your layout, use the shipwright helpers:

```ejs
<!DOCTYPE html>
<html>
<head>
  <%- shipwright.styles() %>
</head>
<body>
  <!-- your content -->
  <%- shipwright.scripts() %>
</body>
</html>
```

That's it! Shipwright will bundle your JS, compile your styles, and inject the appropriate tags.

## Configuration

Create `config/shipwright.js` to customize behavior:

```js
module.exports.shipwright = {
  js: {
    entry: 'assets/js/app.js' // optional, auto-detected by default
  },
  styles: {
    entry: 'assets/styles/app.css' // optional, auto-detected by default
  },
  build: {
    // Rsbuild configuration - see https://rsbuild.dev/config/
  }
}
```

Most apps don't need a config file at all - shipwright auto-detects entry points and uses sensible defaults:

- **JS inject default:** `['dependencies/**/*.js']`
- **CSS inject default:** `['dependencies/**/*.css']`

### Entry Points

Shipwright auto-detects entry points in this order:

**JavaScript:**

1. `assets/js/app.js`
2. `assets/js/main.js`
3. `assets/js/index.js`

**Styles:**

1. `assets/styles/importer.less`
2. `assets/styles/importer.scss`
3. `assets/styles/importer.css`
4. `assets/styles/main.less`
5. `assets/styles/main.scss`
6. `assets/styles/main.css`
7. `assets/styles/app.less`
8. `assets/styles/app.scss`
9. `assets/styles/app.css`
10. `assets/css/app.css`
11. `assets/css/main.css`

### Two Bundling Modes

#### Modern Mode (ES Modules)

For new apps or apps using `import`/`export`:

```js
// assets/js/app.js
import { setupCloud } from './cloud.setup'
import { formatDate } from './utilities/format'

setupCloud()
```

Shipwright detects the single entry point and bundles all imports.

#### Legacy Mode (Glob Patterns)

For existing apps that concatenate scripts without ES modules (like Grunt's pipeline.js):

```js
// config/shipwright.js
module.exports.shipwright = {
  js: {
    entry: [
      'js/cloud.setup.js',
      'js/components/**/*.js',
      'js/utilities/**/*.js',
      'js/pages/**/*.js'
    ]
  }
}
```

Files are concatenated in the specified order, preserving the global scope behavior of the legacy pipeline. This is a drop-in replacement for `tasks/pipeline.js`.

### Inject vs Entry

- **entry** - Files bundled together by Rsbuild (minified, tree-shaken, hashed)
- **inject** - Files loaded as separate `<script>` or `<link>` tags before the bundle

Use `inject` for vendor libraries that need to be loaded separately:

```js
module.exports.shipwright = {
  js: {
    inject: [
      'dependencies/sails.io.js',
      'dependencies/lodash.js',
      'dependencies/jquery.min.js',
      'dependencies/vue.js',
      'dependencies/**/*.js' // catch remaining dependencies
    ]
  }
}
```

The order is preserved, and duplicates are automatically removed.

## TypeScript Support

Shipwright supports TypeScript out of the box. Just use `.ts` or `.tsx` files:

```js
// config/shipwright.js
module.exports.shipwright = {
  js: {
    entry: 'assets/js/app.ts'
    // or with glob patterns:
    // entry: ['js/**/*.ts', 'js/**/*.tsx']
  }
}
```

No `tsconfig.json` required for basic usage. Add one if you want strict type checking.

## LESS/SASS Support

Install the appropriate plugin:

```bash
# For LESS
npm install @rsbuild/plugin-less --save-dev

# For SASS/SCSS
npm install @rsbuild/plugin-sass --save-dev
```

Add the plugin to your config:

```js
const { pluginLess } = require('@rsbuild/plugin-less')

module.exports.shipwright = {
  build: {
    plugins: [pluginLess()]
  }
}
```

Shipwright auto-detects your styles entry point (`importer.less`, `main.scss`, etc.).

## Tailwind CSS v4

For new Tailwind CSS v4 apps, prefer Rsbuild's Tailwind plugin over routing
Tailwind through PostCSS:

```bash
npm install @rsbuild/plugin-tailwindcss tailwindcss --save-dev
```

```js
const { pluginTailwindcss } = require('@rsbuild/plugin-tailwindcss')

module.exports.shipwright = {
  build: {
    plugins: [pluginTailwindcss()]
  }
}
```

In TBJS framework apps, register it beside the framework plugin:

```js
const { pluginReact } = require('@rsbuild/plugin-react')
const { pluginTailwindcss } = require('@rsbuild/plugin-tailwindcss')

module.exports.shipwright = {
  build: {
    plugins: [pluginReact(), pluginTailwindcss()]
  }
}
```

Keep the Tailwind import in a CSS entry file:

```css
@import 'tailwindcss';
```

Do not put the Tailwind v4 import directly in a Sass, Less, or Stylus file.
If the rest of the app uses a preprocessor, keep Tailwind in a plain `.css`
entry and import the preprocessor output from there, or use a separate CSS
entry for Tailwind.

If Tailwind is the only PostCSS plugin in the app, you can remove
`@tailwindcss/postcss` and `postcss.config.js`. Keep PostCSS when the app uses
additional PostCSS plugins, and keep Tailwind v3 apps on the existing PostCSS
setup.

Tailwind v4 scans source files automatically. If Sails views, generated
content, monorepo packages, or ignored directories are not being scanned the way
your app expects, configure that from the CSS entry:

```css
@import 'tailwindcss' source('../');

@source '../../views';
@source '../../api';
@source '../node_modules/@acme/ui';
@source not '../../assets/vendor';
```

Use `source(none)` plus explicit `@source` entries for large apps that need a
tightly controlled scan surface.

## Hot Module Replacement

In development, Shipwright provides HMR via Rsbuild's dev server. Changes to your JS and CSS files are instantly reflected in the browser without a full page reload.

HMR is enabled automatically when `NODE_ENV !== 'production'`.

## Production Builds

In production (`NODE_ENV=production`), Shipwright:

- Minifies JS and CSS
- Adds content hashes for cache busting (`app.a1b2c3d4.js`)
- Enables tree shaking to remove unused code
- Generates a manifest for asset versioning

## Output Structure

```
.tmp/public/
  js/
    app.js          # development
    app.a1b2c3d4.js # production (with hash)
  css/
    styles.css
    styles.b2c3d4e5.css
  manifest.json     # maps entry names to hashed filenames
  dependencies/     # copied from assets/dependencies
  images/           # copied from assets/images
  ...
```

## Path Aliases

Shipwright configures these aliases by default:

- `@` → `assets/js`
- `~` → `assets`

```js
// In your JS files
import utils from '@/utilities/helpers'
import styles from '~/styles/components.css'
```

## Advanced Configuration

Pass any Rsbuild configuration via the `build` key:

```js
const { pluginLess } = require('@rsbuild/plugin-less')
const { pluginReact } = require('@rsbuild/plugin-react')

module.exports.shipwright = {
  build: {
    plugins: [pluginLess(), pluginReact()],
    output: {
      // Custom output options
    },
    splitChunks: {
      // Custom chunk splitting options
    }
  }
}
```

See [Rsbuild Configuration](https://rsbuild.dev/config/) for all available options.

### React Compiler

React apps can opt into React Compiler through `@rsbuild/plugin-react`:

For React 19:

```js
const { pluginReact } = require('@rsbuild/plugin-react')

module.exports.shipwright = {
  build: {
    plugins: [
      pluginReact({
        reactCompiler: true
      })
    ]
  }
}
```

For React 17 or React 18 apps, install `react-compiler-runtime` and set the
target React version:

```bash
npm install react-compiler-runtime --save
```

```js
pluginReact({
  reactCompiler: {
    target: '18'
  }
})
```

React Compiler can surface application-level compatibility issues, so enable it
per app after a normal build passes.

If the compiler reports diagnostics, treat them as app code cleanup work before
forcing the optimization. Projects already using the Babel-based React Compiler
transform should prefer this Rsbuild plugin path unless they depend on
Babel-specific customization.

### SSR and Node Externals

Keep browser assets bundled by default. Do not enable `output.autoExternal` for
normal Sails browser builds.

For SSR or other Node-targeted output, `output.autoExternal` can keep runtime
dependencies external instead of bundling them:

```js
module.exports.shipwright = {
  build: {
    environments: {
      ssr: {
        output: {
          target: 'node',
          autoExternal: {
            dependencies: true,
            optionalDependencies: true,
            peerDependencies: true,
            devDependencies: false,
            exclude: ['react', 'react-dom']
          }
        }
      }
    }
  }
}
```

Adjust the environment shape to match the app's actual SSR integration.
Current Rsbuild 2.x Node builds may emit split chunks by default, so verify that
the Sails/Inertia SSR loader can load the emitted output before enabling this
in production.

Common externalization candidates include observability SDKs, native addons,
runtime-instrumented packages, and peer dependencies supplied by the host app.
Framework packages that must match client and server rendering behavior may
need to stay bundled; use `exclude` for those.

### Resource Imports

Rsbuild 2.x supports a few resource import patterns that are useful in richer
Sails frontends.

Use CSS `?url` imports when runtime code decides when to load a stylesheet:

```js
import themeUrl from './themes/dark.css?url'

const link = document.createElement('link')
link.rel = 'stylesheet'
link.href = themeUrl
document.head.appendChild(link)
```

Use worker query imports for simple workers:

```js
import ReportWorker from './report-worker.js?worker'

const worker = new ReportWorker()
worker.postMessage({ action: 'build-report' })
```

Use the standard Worker constructor when you need full `WorkerOptions`:

```js
const worker = new Worker(new URL('./worker.js', import.meta.url), {
  type: 'module',
  credentials: 'include'
})
```

Use import attributes when you need a file's raw text:

```js
import template from './welcome-email.html' with { type: 'text' }
```

Advanced apps can also use Wasm source imports when they need to instantiate a
`WebAssembly.Module` manually or share it with a worker.

These are optional app-level recipes. Shipwright's defaults already pass them
through to Rsbuild 2.x; do not add template code for them unless the app
actually needs runtime CSS loading, workers, raw source text, or Wasm module
control.

### Page Discovery

Inertia apps can keep using synchronous `require()` page resolution for simple
starter behavior. Larger apps can evaluate `import.meta.glob` for Vite-like page
discovery and route-level code splitting:

```js
const pages = import.meta.glob('./pages/**/*.jsx')

createInertiaApp({
  resolve: (name) => pages[`./pages/${name}.jsx`]()
})
```

Validate this across the app's framework template before making it a default.
Rspack also supports `caseSensitive: false`, which can smooth over page-name
mismatches, but teams should still normalize casing for Linux deployments.

Shipwright keeps `require()` as the conservative default because it is simple
and works across current React, Vue, and Svelte TBJS starters. Adopt
`import.meta.glob` per app when route-level chunks are worth the extra async
page-loading behavior.

### Babel and SVGR Parallel Transforms

Apps that already use `@rsbuild/plugin-babel` or `@rsbuild/plugin-svgr` can
evaluate parallel transforms:

```js
pluginBabel({ parallel: true })
pluginSvgr({ parallel: true })
```

Only enable this when plugin options are structured-cloneable. If options
contain functions, keep the default serial mode.

### Dynamic Ports

Rsbuild supports `server.port: 0` for dynamic port assignment. Shipwright
mounts Rsbuild middleware and HMR through the Sails HTTP server, so normal apps
should keep the default Sails-owned port behavior. Use Sails' `PORT` or
`config/local.js` for local port changes.

Only use Rsbuild dynamic ports in custom fixtures or tests after verifying that
the browser HMR client still connects through Sails.

### Selective Minification

Rsbuild 2.x supports arrays for JavaScript minifier options, which lets advanced
apps apply different minification rules to different files:

```js
module.exports.shipwright = {
  build: {
    output: {
      minify: {
        jsOptions: [
          {
            include: /app\./,
            minimizerOptions: {
              compress: { drop_console: true }
            }
          }
        ]
      }
    }
  }
}
```

Keep this as an app-level optimization. Shipwright does not apply selective
minification by default.

## Rsbuild 2 Notes

Shipwright is built on Rsbuild 2.x, which includes Rspack 2.x. Most apps can
continue using the same `config/shipwright.js`, but a few advanced Rsbuild
options changed:

- `performance.chunkSplit` is deprecated. Migrate custom chunk-splitting config
  to `splitChunks`.
- `server.proxy` uses `http-proxy-middleware` v4. If you configure proxies,
  replace `context` with `pathFilter` and move proxy event callbacks under the
  `on` option.
- `core-js` is no longer installed by Rsbuild by default. Install `core-js`
  directly if you enable `output.polyfill`.
- Module Federation runtime packages are no longer installed implicitly. Install
  the federation runtime tooling your app uses before enabling Module
  Federation config.
- Bundle analysis is no longer provided by `performance.bundleAnalyze`. Use
  Rsdoctor or add an explicit analyzer plugin in `build.plugins`.
- Webpack provider support was removed by Rsbuild. Shipwright's defaults use
  Rspack only.
- Rsbuild's default web targets are more modern. Add a browserslist config if
  your app needs the older Rsbuild 1 browser baseline.
- Node builds target Node.js 20 by default and emit ESM by default in Rsbuild 2.
  Set explicit Rsbuild output options if your app has a custom Node bundle.
- Decorator transforms now default to the `2023-11` decorators proposal. Apps
  using legacy decorators should configure the transform explicitly.
- Audit advanced Rsbuild overrides when upgrading. Removed or deprecated options
  include `source.alias`, `source.aliasStrategy`, `performance.bundleAnalyze`,
  `performance.removeMomentLocale`, `performance.profile`, webpack provider
  tooling, `dev.setupMiddlewares`, `?__inline=false`, and customized built-in
  JS/CSS rules.
- Rspack 2.2 changed the SWC Wasm plugin boundary. If an app uses SWC Wasm
  plugins, upgrade or rebuild those plugins for the matching SWC version.

Rsbuild 2 is published as ESM. Shipwright loads it through dynamic `import()`
from the Sails hook, and Node.js `20.19+` can still load Rsbuild plugin packages
from CommonJS Sails config files.

## Migrating to Current Rsbuild 2.x

This section supersedes the original Rsbuild 2.1 checklist. As of this pass,
Shipwright is tested against Rsbuild 2.2.5 and Rspack 2.2.3, so the migration
target is the current Rsbuild 2.x line rather than the initial 2.1 release.

Normal Sails apps usually only need the dependency upgrade and verification:

1. Upgrade `sails-hook-shipwright`.
2. Refresh the app lockfile with the package manager.
3. Keep `.sailsrc` with the Grunt hook disabled.
4. Keep existing `shipwright.styles()` and `shipwright.scripts()` calls.
5. Keep existing `config/shipwright.js` unless the app has advanced Rsbuild
   overrides.
6. Do not enable `output.autoExternal` for browser assets.
7. Verify `.tmp/public/manifest.json` after a production build.
8. If the app uses SWC Wasm plugins, check compatibility with the Rspack 2.2
   SWC boundary before upgrading.

TBJS apps should also evaluate the template-level improvements:

1. Use `@rsbuild/plugin-tailwindcss` for Tailwind v4.
2. Keep Tailwind v3 on PostCSS.
3. Opt into React Compiler only after validating the app.
4. Use `output.autoExternal` only for SSR or Node output.
5. Verify SSR loaders against current Rsbuild 2.x Node split-chunk output.
6. Use resource import recipes only where the app needs them.
7. Use dynamic Rsbuild ports only in custom tests after HMR is verified through
   Sails.

Feature notes:

- Tailwind v4: `@rsbuild/plugin-tailwindcss` is preferred for new TBJS apps.
  Existing `@tailwindcss/postcss` apps remain supported.
- React Compiler: optional, app-by-app, and disabled by default in starter
  templates until app compatibility is proven.
- SSR externals: `output.autoExternal` is for Node or SSR builds only.
- Resource imports and `import.meta.glob`: useful recipes, not new defaults.

Related Shipwright issues: [#26](https://github.com/sailshq/sails-hook-shipwright/issues/26),
[#27](https://github.com/sailshq/sails-hook-shipwright/issues/27),
[#28](https://github.com/sailshq/sails-hook-shipwright/issues/28),
[#29](https://github.com/sailshq/sails-hook-shipwright/issues/29), and
[#30](https://github.com/sailshq/sails-hook-shipwright/issues/30).

Suggested verification:

```bash
npm install
npm test
NODE_ENV=production node app.js
```

For local development, also run the app's dev command and confirm Sails lifts,
frontend HMR connects, and the generated asset tags point at valid files.

Rollback is the normal package-manager rollback: revert the app's
`package.json`, lockfile, and any `config/shipwright.js` changes from the
upgrade branch, reinstall, and redeploy the previous known-good build. Keep app
code changes, Tailwind major-version migrations, and React Compiler trials in
separate commits so a build-tool rollback stays small.

## Migrating from Grunt

1. Install shipwright and disable grunt:

```bash
npm install sails-hook-shipwright --save
npm install @rsbuild/plugin-less --save-dev  # if using LESS
```

```json
// .sailsrc
{
  "hooks": {
    "grunt": false
  }
}
```

2. Create `config/shipwright.js` based on your `tasks/pipeline.js`:

```js
// If your pipeline.js has:
// var jsFilesToInject = [
//   'dependencies/sails.io.js',
//   'dependencies/lodash.js',
//   'js/cloud.setup.js',
//   'js/**/*.js'
// ]

// Your shipwright.js becomes:
const { pluginLess } = require('@rsbuild/plugin-less')

module.exports.shipwright = {
  js: {
    entry: [
      'js/cloud.setup.js',
      'js/components/**/*.js',
      'js/utilities/**/*.js',
      'js/pages/**/*.js'
    ],
    inject: [
      'dependencies/sails.io.js',
      'dependencies/lodash.js',
      'dependencies/**/*.js'
    ]
  },
  build: {
    plugins: [pluginLess()]
  }
}
```

3. Update your layout to use shipwright helpers:

```diff
- <!--STYLES-->
- <!--STYLES END-->
+ <%- shipwright.styles() %>

- <!--SCRIPTS-->
- <!--SCRIPTS END-->
+ <%- shipwright.scripts() %>
```

4. Remove the `tasks/` directory (optional, but recommended).

## API

### View Helpers

#### `shipwright.scripts([entryName])`

Returns `<script>` tags for:

1. Injected files (from `js.inject` patterns)
2. Bundled initial files (from manifest)

By default, Shipwright emits the `app` entry. Pass an entry name to emit a
different initial entry from the Rsbuild manifest:

```ejs
<%- shipwright.scripts('admin') %>
```

#### `shipwright.styles([entryName])`

Returns `<link>` tags for:

1. Injected files (from `styles.inject` patterns)
2. Compiled initial styles (from manifest)

By default, Shipwright emits the `app` entry. Pass an entry name to emit a
different initial entry from the Rsbuild manifest:

```ejs
<%- shipwright.styles('admin') %>
```

## Troubleshooting

### "Missing @rsbuild/plugin-less"

Install the required plugin:

```bash
npm install @rsbuild/plugin-less --save-dev
```

And add it to your config:

```js
const { pluginLess } = require('@rsbuild/plugin-less')
module.exports.shipwright = {
  build: { plugins: [pluginLess()] }
}
```

### Scripts loading twice

Check that your `inject` patterns don't overlap with files in the bundle. Shipwright automatically deduplicates, but explicit is better than implicit.

### HMR not working

Ensure `NODE_ENV` is not set to `production` in development.

## License

The [Sails framework](http://sailsjs.com) is free and open-source under the [MIT License](http://sailsjs.com/license).
