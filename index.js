var gulp = require('gulp'),
    read = require('fs').readFileSync,
    gutil = require('gulp-util'),
    series = require('stream-series'),
    prepend = require('gulp-insert').prepend,
    wrap = require('gulp-insert').wrap,
    transform = require('gulp-insert').transform,
    autoprefixer = require('gulp-autoprefixer');

var slurpee = module.exports = {
  gulp: gulp,
  configure: buildGulp
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
}


function styles() {
  var useComponent = slurpee.config.useComponent,
      stylPaths = slurpee.config.stylPaths,
      autoPrefixerConfig = slurpee.config.autoprefixerConfig,
      dest = slurpee.config.outputDir;

  var stylStream = gulp.src(stylPaths)
      .pipe(prepend(stylDefinitions))
      .pipe(cssWhitespace())
      .pipe(build.rework())
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
