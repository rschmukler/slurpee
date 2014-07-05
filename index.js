// Internals...

var build = require('./lib/build');

// Gulp plugins

var gulp = require('gulp'),
    read = require('fs').readFileSync,
    gutil = require('gulp-util'),
    surgeon = require('gulp-surgeon'),
    component = require('gulp-component'),
    series = require('stream-series'),
    prepend = require('gulp-insert').prepend,
    wrap = require('gulp-insert').wrap,
    transform = require('gulp-insert').transform,
    livereload = require('gulp-livereload'),
    lrServer = require('tiny-lr')(),
    autoprefixer = require('gulp-autoprefixer'),
    cssWhitespace = require('gulp-css-whitespace');

// Rework related requires
var mixin = require('rework-plugin-mixin'),
    reworkInherit = require('rework-inherit'),
    reworkVariables = require('rework-variant'),
    reworkShade = require('rework-shade'),
    reworkMixins = require('rework-mixins'),
    reworkColors = require('rework-plugin-colors'),
    reworkReferences = require('rework-plugin-references'),
    reworkMath = require('rework-math');

var slurpee = module.exports = {
  gulp: gulp,
  configure: buildGulp,
  config: {
    assetPaths: [
      'lib/components/**/{images,files}/*',
      'lib/pages/**/{images,files}/*',
      'lib/express-pages/**/{images,files}/*'
    ],
    autoprefixerConfig: 'last 2 versions',
    cssFile: 'app.css',
    jsFile: 'app.js',
    jadePaths: ['lib/components/**/*.jade', 'lib/pages/**/*.jade'],
    liveReloadPort: 35729,
    outputDir: 'public/',
    reworkPlugins: [mixin(reworkMixins), reworkInherit(), reworkReferences(), reworkVariables(), reworkColors(), reworkMath(), reworkShade()],
    serverJadePaths: ['lib/express-pages/**/*.jade'],
    stylGlobals: [],
    stylPaths: ['lib/**/*.styl'],
    useComponent: true
  },
  spawns: {
  }
};


var stylDefinitions = ''; // used for styl globals

function buildGulp() {
  // Read global styl definitions
  var stylGlobals = slurpee.config.stylGlobals;
  stylGlobals.forEach(function(path) {
    stylDefinitions += read(path) + '\n';
  });

  gulp.task('styles', function() {
    return styles()
      .pipe(surgeon.stitch(slurpee.config.cssFile))
      .pipe(gulp.dest(slurpee.config.outputDir))
      .pipe(livereload(lrServer));
  });
}


function styles() {
  var useComponent = slurpee.config.useComponent,
      stylPaths = slurpee.config.stylPaths,
      autoPrefixerConfig = slurpee.config.autoprefixerConfig,
      dest = slurpee.config.outputDir;

  var stylStream = gulp.src(stylPaths)
      .pipe(prepend(stylDefinitions))
      .pipe(cssWhitespace())
      .pipe(build.rework(slurpee.config.reworkPlugins))
      .on('error', errorCatch);

  var stream;

  if(useComponent) {
    var componentStream = gulp.src('./component.json')
      .pipe(component({name: 'component', out: dest, only: 'styles'}))
      .on('error', errorCatch)

    stream = series(componentStream, stylStream)
  } else {
    stream = stylStream;
  }
  return stream.pipe(autoprefixer(autoPrefixerConfig));
}

function errorCatch(err) {
  var chalk = gutil.colors,
      log = gutil.log;
  var errorString = '[' + chalk.red(err.plugin) + '] ' + 'Error: ' + chalk.magenta(err.message);
  log(errorString);
}
