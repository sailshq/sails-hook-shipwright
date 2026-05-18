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
longer supported by Rsbuild.

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

Rsbuild 2 is published as ESM. Shipwright loads it through dynamic `import()`
from the Sails hook, and Node.js `20.19+` can still load Rsbuild plugin packages
from CommonJS Sails config files.

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

#### `shipwright.scripts()`

Returns `<script>` tags for:

1. Injected files (from `js.inject` patterns)
2. Bundled files (from manifest)

#### `shipwright.styles()`

Returns `<link>` tags for:

1. Injected files (from `styles.inject` patterns)
2. Compiled styles (from manifest)

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
