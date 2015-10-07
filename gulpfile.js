var del = require('del');
var pkg = require('./package.json');
var gulp = require('gulp');
var zip = require('gulp-zip');
var gutil = require('gulp-util');
var webpack = require('webpack');
var uglify = require('gulp-uglify');
var conventionalChangelog = require('gulp-conventional-changelog');
var runSequence = require('run-sequence');
var config = require('./webpack.config.js');

/**
 *
 */

gulp.task('clean', function () {
  return del(['dist', '*.zip']);
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

gulp.task('uglify', function () {
  return gulp.src('dist/bundle.js')
    .pipe(uglify())
    .pipe(gulp.dest('dist'));
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

gulp.task('zip', function () {
  return gulp.src('dist/*')
    .pipe(zip(pkg.version + '.zip'))
    .pipe(gulp.dest('.'));
});

/**
 *
 */

gulp.task('changelog', function () {
  return gulp.src('CHANGELOG.md', { buffer: false })
    .pipe(conventionalChangelog({ preset: 'eslint' }))
    .pipe(gulp.dest('./'));
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

/**
 *
 */

gulp.task('dev', ['default'], function () {
  gulp.watch('lib/extension/**/*.{js,scss}', ['default']);
});

/**
 *
 */

gulp.task('build', function (done) {
  runSequence(
    'default',
    'uglify',
    'zip',
    'changelog',
    done
  );
});
