const gulp = require('gulp');
const {watch, series} = gulp;
const ts = require('gulp-typescript');
const clean = require('gulp-clean');

// Load typescript project config from file
const tsProject = ts.createProject('tsconfig.json');

// Clean distribution directory
function cleanup() {
	console.log(__dirname);
	return gulp.src('dist/**/*', {read: false})
		.pipe(clean());
}

// Build typescript to distribution
function build() {
	return tsProject.src()
		.pipe(tsProject())
		.js.pipe(gulp.dest('dist'));
}

// Watch source directory for changes
exports.watch = function () {
	watch('src/**/*.ts', build);
	watch('models/**/*.ts', build);
};

// Default export ('gulp' in cmdline)
exports.default = series(cleanup, build);
