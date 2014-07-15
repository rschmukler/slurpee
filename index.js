// Internals...

var build = require('./lib/build');

var extname = require('path').extname;

// Gulp plugins

var read = require('fs').readFileSync,
    gutil = require('gulp-util'),
    surgeon = require('gulp-surgeon'),
    symlink = require('gulp-symlink'),
    component = require('gulp-component'),
    series = require('stream-series'),
    prepend = require('gulp-insert').prepend,
    wrap = require('gulp-insert').wrap,
    transform = require('gulp-insert').transform,
    livereload = require('gulp-livereload'),
    rename = require('gulp-rename'),
    autoprefixer = require('gulp-autoprefixer'),
    cssWhitespace = require('gulp-css-whitespace'),
    hatchling = require('hatchling'),
    jade = require('gulp-jade'),
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
  configure: buildGulp,
  config: {
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
    stylGlobals: [],
    stylPaths: ['lib/**/*.styl'],
    useComponent: true
  },
  spawns: {
  }
};


var stylDefinitions = ''; // used for styl globals

function buildGulp(gulp) {
  // Read global styl definitions

  gulp.task('reloadStylDefinitions', function() {
    stylDefinitions = '';
    var stylGlobals = slurpee.config.stylGlobals;
    stylGlobals.forEach(function(path) {
      stylDefinitions += read(path) + '\n';
    });
  });

  gulp.task('styles', ['reloadStylDefinitions'], function() {
    return styles()
      .pipe(surgeon.stitch(slurpee.config.cssFile))
      .pipe(gulp.dest(slurpee.config.outputDir))
      .pipe(livereload({auto: false}));
  });

  gulp.task('js', function() {
    return scripts({js: [sourceUrl(slurpee.config.jsRootPath)]})
      .pipe(surgeon.stitch(slurpee.config.jsFile))
      .pipe(gulp.dest(slurpee.config.outputDir))
      .pipe(livereload({auto: false}));
  });

  gulp.task('jade', function() {
    return gulp.src(slurpee.config.jadePaths)
      .pipe(jade())
      .on('error', errorCatch)
      .pipe(gulp.dest('./public'));
  });

  gulp.task('indexFile', function() {
    var indexFile = slurpee.config.indexFile;
    if(indexFile) {
      var stream = gulp.src(indexFile);

      if(extname(indexFile) == '.jade') { 
        stream.pipe(jade())
        .on('error', errorCatch);
      }

      stream
      .pipe(rename('index.html'))
      .pipe(gulp.dest(slurpee.config.outputDir))
      .pipe(livereload({auto: false}));
    }
  });

  gulp.task('assets', function() {
    var assetPaths = slurpee.config.assetPaths,
        outputDir = slurpee.config.outputDir;

    var assetStream = gulp.src(assetPaths)
        .pipe(symlink('./' + outputDir));

    if(slurpee.config.useComponent) {
      return series(assetStream,
        gulp.src('component.json')
          .pipe(component({name: 'component', out: outputDir, ignore: ['styles', 'scripts']}))
          .on('error', errorCatch)
      );
    } else {
      return assetStream;
    }
  });

  gulp.task('build', ['js', 'styles', 'indexFile', 'jade', 'assets']);

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

  gulp.task('watch', function() {
    livereload.listen(slurpee.config.liveReloadPort);

    var outputDir = slurpee.config.outputDir,
        outputJs = slurpee.config.jsFile,
        outputCss = slurpee.config.cssFile;

    // Watch Javascript files
    gulp.watch(slurpee.config.jsPaths, function(event) {
      gulp.src(event.path)
      .pipe(sourceUrl(slurpee.config.jsRootPath))
      .pipe(surgeon.slice(outputDir + outputJs))
      .pipe(gulp.dest(outputDir))
      .pipe(livereload({auto: false}))
    });

    // Watch Jade files
    gulp.watch(slurpee.config.jadePaths, function(event) {
      gulp.src(event.path)
      .pipe(jade())
      .on('error', errorCatch)
      .pipe(gulp.dest(outputDir + getDirName(event.path)))
      .pipe(livereload({auto: false}));
    });

    if(slurpee.config.indexFile) {
      gulp.watch(slurpee.config.indexFile, ['indexFile']);
    }

    // Watch Styl Files
    gulp.watch(slurpee.config.stylPaths, function(event) {
      gulp.src(event.path)
      .pipe(prepend(stylDefinitions))
      .pipe(cssWhitespace())
      .pipe(build.rework())
      .on('error', errorCatch)
      .pipe(autoprefixer(slurpee.config.autoprefixerConfig))
      .pipe(surgeon.slice(outputDir + outputCss))
      .pipe(gulp.dest(outputDir))
      .pipe(livereload({auto: false}));
    });
    gulp.watch(slurpee.config.stylGlobals, ['styles']);
  });

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
}



function errorCatch(err) {
  var chalk = gutil.colors,
      log = gutil.log;
  var errorString = '[' + chalk.red(err.plugin) + '] ' + 'Error: ' + chalk.magenta(err.message);
  log(errorString);
}

function getDirName(path) {
  path = path.split('/');
  return path[path.length - 2];
}
