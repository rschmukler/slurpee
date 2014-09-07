# slurpee

preconfigured gulp

## Why?

Slurpee is a configuration of gulp that enables you to quickly get up and running with a front-end project. It supports the following out of the box:

- Jade template compilation
- [Styl](http://github.com/visionmedia/styl)-like stylesheet compilation with auto-prefixer support
- [gulp-surgeon](http://github.com/rschmukler/gulp-surgeon) preconfigured with live-reload for *lightning fast* compilation
- bower / component packaging

## Available Tasks

- `styles` - compiles stylesheets
- `js` - compiles js
- `jade` - compiles all templates and moves them to `public/`
- `indexFile` - compiles an `indexFile` (if configured) and moves it to
  `public/index.html`
- `assets` - moves files and images from `lib` to `public/`
- `serve` - start a static file server
- `build` - runs `['js', 'styles', 'jade' 'indexFile', 'jade', 'assets']`
- `watch` - watches files for changes and livereloads them.
- `watch-gulpfile` - watches gulpfile for changes and reloads the `watch` task
  on change.

## Example Usage

In your gulpfile.js
```js
var slurpee = require('slurpee');

slurpee.config.jsPaths = [
  'lib/{pages,components}/**/*.js'
];

// ... more here, see config below

slurpee.configure();

var gulp = require('gulp');

gulp.task('default', ['watch']);
```

## Configuring / Default Values

The default config for this project is based off of the [sik](http://github.com/rschmukler/sik) suggested
project layout. 


```js
  assetPaths: [
    'lib/components/**/{images,files}/*',
    'lib/pages/**/{images,files}/*',
    'lib/express-pages/**/{images,files}/*'
  ],
  autoprefixerConfig: 'last 2 versions',
  cssFile: 'app.css',
  indexFile: undefined,
  jsFile: 'app.js',
  jsPaths: ['lib/{components,pages}/**/index.js', 'lib/{components,pages}/**/*.js'],
  jsRootPath: './lib',
  jadePaths: ['lib/components/**/*.jade', 'lib/pages/**/*.jade'],
  liveReloadPort: 35729,
  outputDir: 'public/',
  reworkPlugins: [mixin(reworkMixins), reworkInherit(), reworkReferences(), reworkVariables(), reworkColors(), reworkMath(), reworkShade()],
  serverJadePaths: ['lib/express-pages/**/*.jade'],
  spawns: {
  },
  staticPath: undefined,
  staticPort: 3000,
  stylGlobals: [],
  stylPaths: ['lib/**/*.styl'],
  useComponent: false,
  useBower: false
}
```
