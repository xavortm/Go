var gulp = require('gulp'),
	sass = require('gulp-ruby-sass'),
	autoprefixer = require('gulp-autoprefixer'),
	cssnano = require('gulp-cssnano'),
	// jshint = require('gulp-jshint'),
	uglify = require('gulp-uglify'),
	imagemin = require('gulp-imagemin'),
	rename = require('gulp-rename'),
	concat = require('gulp-concat'),
	notify = require('gulp-notify'),
	cache = require('gulp-cache'),
	livereload = require('gulp-livereload'),
	del = require('del');

gulp.task('clean', function() {
	return del(['dist/assets/css', 'dist/assets/js', 'dist/assets/img']);
});

gulp.task('scripts', function() {
	return gulp.src('src/assets/scripts/**/*.js')
		.pipe(concat('main.js'))
		.pipe(gulp.dest('dist/assets/js'))
		.pipe(rename({suffix: '.min'}))
		.pipe(uglify())
		.pipe(gulp.dest('dist/assets/js'))
		.pipe(notify({ message: 'Scripts task complete' }));
});

gulp.task('images', function() {
	return gulp.src('src/assets/images/**/*')
		.pipe(imagemin({ optimizationLevel: 3, progressive: true, interlaced: true }))
		.pipe(gulp.dest('dist/assets/img'))
		.pipe(notify({ message: 'Images task complete' }));
});

gulp.task('default', function() {
	gulp.start('watch');
});

gulp.task('watch', function() {

	// Watch .scss files
	// gulp.watch('src/styles/**/*.scss', ['styles']);

	// Watch .js files
	gulp.watch('src/assets/scripts/**/*.js', ['scripts']);

	// Watch image files
	gulp.watch('src/assets/images/**/*', ['images']);
	
	// Watch vendor changes
	gulp.watch('src/vendor/**/*.js', ['vendor']);

});
