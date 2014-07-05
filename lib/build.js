var gulpRework = require('gulp-rework');

exports.rework = function(reworkPlugins) {
  return gulpRework.apply(gulpRework, reworkPlugins);
}
