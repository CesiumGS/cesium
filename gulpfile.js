/*jshint node:true,unused:true*/
'use strict';

/*global require*/

var fs = require('fs');
var glob = require('glob-all');
var gulp = require('gulp');
var browserify = require('browserify');
var uglify = require('gulp-uglify');
var exec = require('child_process').exec;
var sourcemaps = require('gulp-sourcemaps');
var exorcist = require('exorcist');
var buffer = require('vinyl-buffer');
var transform = require('vinyl-transform');
var source = require('vinyl-source-stream');

var workerGlob = [
    './Source/Workers/*.js',
    '!./Source/Workers/*.profile.js',
    '!./Source/Workers/cesiumWorkerBootstrapper.js',
    '!./Source/Workers/transferTypedArrayTest.js',
    '!./Source/Workers/createTaskProcessorWorker.js'
];

function createExorcistTransform(name) {
    return transform(function () { return exorcist('wwwroot/build/Workers/' + name + '.map'); });
}

// Create the build directory, because browserify flips out if the directory that might
// contain an existing source map doesn't exist.
if (!fs.existsSync('wwwroot')) {
    fs.mkdirSync('wwwroot');
}
if (!fs.existsSync('wwwroot/build')) {
    fs.mkdirSync('wwwroot/build');
}

gulp.task('prepare-cesium', ['build-cesium', 'copy-cesium-assets', 'copy-cesiumWorkerBootstrapper', 'build-workers']);

gulp.task('build-cesium', function(cb) {
    return exec('"Tools/apache-ant-1.8.2/bin/ant" build', {
    }, function(err, stdout, stderr) {
        if (stderr) {
            console.log('Error while building Cesium: ');
            console.log(stderr);
        }
        cb(err);
    });
});

gulp.task('copy-cesium-assets', function() {
    return gulp.src([
            'Source/Workers/transferTypedArrayTest.js',
            'Source/ThirdParty/Workers/**',
            'Source/Assets/**',
            'Source/Widgets/**/*.css',
            'Source/Widgets/Images/**'
        ], { base: 'Source' })
        .pipe(gulp.dest('wwwroot/build/'));
});

gulp.task('copy-cesiumWorkerBootstrapper', function() {
    return gulp.src('Source/Workers/cesiumWorkerBootstrapper.js')
        .pipe(gulp.dest('wwwroot/build/Workers'));
});

gulp.task('default', ['prepare-cesium']);

gulp.task('build-workers', function() {
    var b = browserify({
        debug: true
    });

    var workers = glob.sync(workerGlob);
    for (var i = 0; i < workers.length; ++i) {
        var workerFilename = workers[i];

        var lastSlashIndex = workerFilename.lastIndexOf('/');
        if (lastSlashIndex < 0) {
            continue;
        }

        var outName = workerFilename.substring(lastSlashIndex + 1);

        var dotJSIndex = outName.lastIndexOf('.js');
        var exposeName = 'Workers/' + outName.substring(0, dotJSIndex);

        b.require(workerFilename, {
            expose: exposeName
        });
    }

    var stream = b.bundle()
        .pipe(source('Cesium-WebWorkers.js'))
        .pipe(buffer());

    var minify = true;
    if (minify) {
        // Minify the combined source.
        // sourcemaps.init/write maintains a working source map after minification.
        // "preserveComments: 'some'" preserves JSDoc-style comments tagged with @license or @preserve.
        stream = stream
            .pipe(sourcemaps.init({ loadMaps: true }))
            .pipe(uglify({preserveComments: 'some', mangle: true}))
            .pipe(sourcemaps.write());
    }

    stream = stream
        // Extract the embedded source map to a separate file.
        .pipe(createExorcistTransform('Cesium-WebWorkers.js'))
        .pipe(gulp.dest('wwwroot/build/Workers'));

    return stream;
});
