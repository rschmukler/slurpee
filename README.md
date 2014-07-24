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
- `build` - runs `['js', 'styles', 'jade' 'indexFile', 'jade', 'assets']`
- `watch` - watches files for changes and livereloads them.
