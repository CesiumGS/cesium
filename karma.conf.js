// Karma configuration
// Generated on Mon Dec 14 2015 13:37:20 GMT-0500 (Eastern Standard Time)

module.exports = function(config) {
  config.set({

    // base path that will be used to resolve all patterns (eg. files, exclude)
    baseUrl: '',


    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: ['jasmine', 'requirejs'],


    // list of files / patterns to load in the browser
    files: [
		{pattern: 'Source/**/*', included: false, served: true},
		{pattern: 'Specs/**/*', included: false, served: true},

		'Specs/test-main.js'
    ],


    proxies: {

    },


    // list of files to exclude
    exclude: [
        'Specs/Widgets/**/*.js',
        'Specs/Scene/**/*.js',
        'Specs/DataSources/**/*.js',
        'Specs/Renderer/**/*.js'
    ],


    // preprocess matching files before serving them to the browser
    // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
    preprocessors: {
    },


    // test results reporter to use
    // possible values: 'dots', 'progress'
    // available reporters: https://npmjs.org/browse/keyword/karma-reporter
    reporters: ['spec'],
    specReporter: {
      maxLogLines: 10,
      suppressErrorSummary: true,
      suppressFailed: false,
      suppressPassed: true,  // do not print information about passed tests
      suppressSkipped: true  // do not print information about skipped tests
    },


    // web server port
    port: 8080,


    // enable / disable colors in the output (reporters and logs)
    colors: true,


    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,


    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: false,


    // start these browsers
    // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
    browsers: ['Firefox'],


    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: false,

    // Concurrency level
    // how many browser should be started simultanous
    concurrency: Infinity
  });
};
