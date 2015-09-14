var del = require('del');
var gulp = require('gulp');
var gutil = require('gulp-util');
var webpack = require('webpack');
var runSequence = require('run-sequence');
var config = require('./webpack.config.js');

/**
 *
 */

gulp.task('clean', function () {
  return del('dist');
});

/**
 *
 */

gulp.task('webpack', function (done) {
  webpack(config, function (err, stats) {
    if (err) {
      throw new gutil.PluginError('[webpack]', err);
    }

    console.log(stats.toString());
    done();
  });
});

/**
 *
 */

gulp.task('copy', function () {
  return gulp.src('lib/resources/*')
    .pipe(gulp.dest('dist'));
});

/**
 *
 */

gulp.task('default', function (done) {
  runSequence(
    'clean',
    'webpack',
    'copy',
    done
  );
});
