var gulpRework = require('gulp-rework'),
    reworkPlugins = require('../').config.reworkPlugins;

exports.rework = function() {
  return gulpRework.apply(gulpRework, reworkPlugins);
}
