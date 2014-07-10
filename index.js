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
    cssWhitespace = require('gulp-css-whitespace'),
    hatchling = require('hatchling'),
    jade = require('gul-jade'),
    sourceUrl = require('gulp-source-url');

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
    jsPaths: ['lib/{components,pages}/**/index.js', 'lib/{components,pages}/**/*.js'],
    jsRootPath: './lib',
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

  gulp.task('js', function() {
    return scripts({js: [sourceUrl(slurpee.config.jsRootPath)]})
      .pipe(surgeon.stitch(slurpee.config.jsFile))
      .pipe(gulp.dest(slurpee.config.outputDir))
      .pipe(livereload(lrServer));
  });

  gulp.task('jade', function(done) {
    return gulp.src(slurpee.config.jadePaths)
      .pipe(jade())
      .on('error', errorCatch)
      .pipe(gulp.dest('./public'));
  });

  // Spawns
  for(var name in slurpee.config.spawns) {
    var config = slurpee.config.spawns[name];
    var cmd = config.cmd;
    delete config.cmd;
    gulp.task(name, function() {
      gutil.log('Launching ' + name + '...');
      hatchling(cmd, config);
    });
  }
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
      .on('error', errorCatch);

    stream = series(componentStream, stylStream);
  } else {
    stream = stylStream;
  }
  return stream.pipe(autoprefixer(autoPrefixerConfig));
}

function scripts(opts) {
  opts = opts || {};

  var useComponent = slurpee.config.useComponent,
      outputDir = slurpee.config.outputDir;


  var scripts = gulp.src(slurpee.config.jsPaths);

  if(opts.js) {
    opts.js.forEach(function(plugin) {
      scripts = scripts.pipe(plugin);
    });
  }

  if(useComponent) {
    var componentScripts = gulp.src('component.json')
        .pipe(component.scripts({name:'component', out: 'public/'}))
        .on('error', errorCatch);
    return series(componentScripts, scripts);
  } else {
    return scripts;
  }
}

function errorCatch(err) {
  var chalk = gutil.colors,
      log = gutil.log;
  var errorString = '[' + chalk.red(err.plugin) + '] ' + 'Error: ' + chalk.magenta(err.message);
  log(errorString);
}
