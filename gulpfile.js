const gulp = require('gulp');
const browserSync = require('browser-sync').create();
const sass = require('gulp-sass');
const notify = require("gulp-notify");
const plumber = require('gulp-plumber');
const _ = require('lodash');

// Static server


// Static Server + watching scss/html files


// Compile sass into CSS & auto-inject into browsers
gulp.task(`sass`, function () {

  return gulp.src(`./public/style/*.scss`)
    .pipe(plumber({
      errorHandler: (e) => {
        notify.onError("Error: <%= error.message %>")(e)
      }
    }))
    .pipe(sass().on('error', sass.logError))
    .pipe(gulp.dest(`./public/`))
//      .pipe(browserSync.stream());
});

gulp.watch([`public/style/*.scss`], gulp.series(`sass`));
