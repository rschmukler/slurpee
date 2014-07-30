// Internals...

var build = require('./lib/build');

var extname = require('path').extname;

var gulp = require('gulp');

// Gulp plugins

var read = require('fs').readFileSync,
    gutil = require('gulp-util'),
    surgeon = require('gulp-surgeon'),
    webserver = require('gulp-webserver'),
    plumber = require('gulp-plumber'),
    symlink = require('gulp-symlink'),
    component = require('gulp-component'),
    bowerFiles = require('main-bower-files'),
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
    filter = require('gulp-filter'),
    watch = require('gulp-watch'),
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
    useComponent: false,
    useBower: false,
    spawns: {
    },
    staticDir: undefined,
    staticPort: 3000
  },
};


var stylDefinitions = ''; // used for styl globals

function buildGulp() {

  function reloadStylDefinitions() {
    stylDefinitions = '';
    var stylGlobals = slurpee.config.stylGlobals;
    stylGlobals.forEach(function(path) {
      stylDefinitions += read(path) + '\n';
    });
  }

  reloadStylDefinitions();

  gulp.task('styles', function() {
    reloadStylDefinitions();
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
      .pipe(plumber())
      .pipe(jade())
      .pipe(gulp.dest('./public'));
  });

  gulp.task('indexFile', function() {
    var indexFile = slurpee.config.indexFile;
    if(indexFile) {
      var stream = gulp.src(indexFile);

      if(extname(indexFile) == '.jade') {
        stream
        .pipe(plumber())
        .pipe(jade());
      }

      stream
      .pipe(rename('index.html'))
      .pipe(gulp.dest(slurpee.config.outputDir))
      .pipe(livereload({auto: false}));
    }
  });

  gulp.task('serve', function() {
    var staticPath = slurpee.config.staticDir,
        staticPort = slurpee.config.staticPort;

    if(!(staticPath && staticPort)) {
      throw new gutil.PluginError('slurpee', 'invalid static configuration');
    }

    gulp.src(staticPath)
    .pipe(webserver({
      port: staticPort,
      fallback: 'index.html'
    }));
  });

  gulp.task('assets', function() {
    var assetPaths = slurpee.config.assetPaths,
        outputDir = slurpee.config.outputDir;

    var assetStream = gulp.src(assetPaths)
        .pipe(symlink('./' + outputDir));

    var streams = [assetStream];

    if(slurpee.config.useComponent) {
      streams.unshift(
        gulp.src('component.json')
        .pipe(plumber())
        .pipe(component({name: 'component', out: outputDir, ignore: ['styles', 'scripts']}))
      );
    }

    if(slurpee.config.useBower) {
      streams.unshift(
        gulp.src(bowerFiles()).pipe(filter(['!*.js', '!*.css']))
      );
    }

    return series(streams);
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
    watch({glob: slurpee.config.jsPaths, emitOnGlob: false})
      .pipe(filter(isAddedOrChanged))
      .pipe(sourceUrl(slurpee.config.jsRootPath))
      .pipe(surgeon.slice(outputDir + outputJs))
      .pipe(gulp.dest(outputDir))
      .pipe(livereload({auto: false}));

    // Watch Jade files
    watch({glob: slurpee.config.jadePaths, emitOnGlob: false})
      .pipe(filter(isAddedOrChanged))
      .pipe(plumber())
      .pipe(jade())
      .pipe(gulp.dest(outputDir))
      .pipe(livereload({auto: false}));

    if(slurpee.config.indexFile) {
      watch({glob: slurpee.config.indexFile, emitOnGlob: false}, ['indexFile']);
    }

    // Watch Styl Files
    watch({glob: slurpee.config.stylPaths, emitOnGlob: false})
      .pipe(filter(isAddedOrChanged))
      .pipe(prepend(function() { return stylDefinitions; }))
      .pipe(cssWhitespace())
      .pipe(plumber())
      .pipe(build.rework(slurpee.config.reworkPlugins))
      .pipe(autoprefixer(slurpee.config.autoprefixerConfig))
      .pipe(surgeon.slice(outputDir + outputCss))
      .pipe(gulp.dest(outputDir))
      .pipe(livereload({auto: false}));

    watch({ glob: slurpee.config.stylGlobals, emitOnGlob: false }, ['styles']);
  });

  function styles() {
    var useComponent = slurpee.config.useComponent,
        useBower = slurpee.config.useBower,
        stylPaths = slurpee.config.stylPaths,
        autoPrefixerConfig = slurpee.config.autoprefixerConfig,
        dest = slurpee.config.outputDir;

    var stylStream = gulp.src(stylPaths)
        .pipe(prepend(stylDefinitions))
        .pipe(cssWhitespace())
        .pipe(plumber())
        .pipe(build.rework(slurpee.config.reworkPlugins));

    var streams = [stylStream];

    if(useComponent) {
      var componentStream = gulp.src('./component.json')
        .pipe(component({name: 'component', out: dest, only: 'styles'}))
        .pipe(plumber());
      streams.unshift(componentStream);
    }

    if(useBower) {
      var bowerStyles = gulp.src(bowerFiles()).pipe(filter('*.css'));
      streams.unshift(bowerStyles);
    }

    return series(streams)
    .pipe(autoprefixer(autoPrefixerConfig))
    .pipe(plumber());
  }

  function scripts(opts) {
    opts = opts || {};

    var useComponent = slurpee.config.useComponent,
        useBower = slurpee.config.useBower,
        outputDir = slurpee.config.outputDir;


    var streams = [];
    var scripts = gulp.src(slurpee.config.jsPaths);

    if(opts.js) {
      opts.js.forEach(function(plugin) {
        scripts = scripts.pipe(plugin);
      });
    }

    streams.push(scripts);

    if(useComponent) {
      var componentScripts = gulp.src('component.json')
          .pipe(component.scripts({name:'component', out: 'public/'}));
      streams.unshift(componentScripts);
    }

    if(useBower) {
      var bowerScripts = gulp.src(bowerFiles()).pipe(filter('*.js'));
      streams.unshift(bowerScripts);
    }

    return series(streams);
  }
}


function isAddedOrChanged(file) {
  return file.event == 'added' || file.event == 'changed';
}

function getDirName(path) {
  path = path.split('/');
  return path[path.length - 2];
}
