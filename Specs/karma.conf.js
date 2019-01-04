/*eslint-env node*/
'use strict';

module.exports = function(config) {
    var options = {
        // base path that will be used to resolve all patterns (eg. files, exclude)
        basePath : '..',

        // Disable module load timeout
        waitSeconds : 0,

        // frameworks to use
        // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
        frameworks : ['jasmine', 'requirejs', 'detectBrowsers'],

        client: {
            captureConsole: false,
            jasmine: {
                random: false
            }
        },

        detectBrowsers : {
            enabled : false,
            usePhantomJS : false
        },

        // list of files / patterns to load in the browser
        files : [
            'Specs/karma-main.js',
            {pattern : 'Source/**', included : false},
            {pattern : 'Specs/**', included : false}
        ],

        proxies : {
            '/Data' : '/base/Specs/Data'
        },

        // list of files to exclude
        exclude : [],

        // preprocess matching files before serving them to the browser
        // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
        preprocessors : {},

        // test results reporter to use
        // possible values: 'dots', 'progress'
        // available reporters: https://npmjs.org/browse/keyword/karma-reporter
        reporters : ['spec', 'longest'],
        longestSpecsToReport : 10,

        // web server port
        port : 9876,

        // enable / disable colors in the output (reporters and logs)
        colors : true,

        // level of logging
        // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
        logLevel : config.LOG_ERROR,

        // enable / disable watching file and executing tests whenever any file changes
        autoWatch : false,

        // start these browsers
        // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
        browsers : ['Chrome'],

        //In Travis, we need to run with the no-sandbox flag
        customLaunchers: {
            ChromeCI: {
                base: 'ChromeHeadless',
                flags: [
                    '--no-sandbox'
                ]
            }
        },

        browserNoActivityTimeout : 30000,

        // Continuous Integration mode
        // if true, Karma captures browsers, runs the tests and exits
        singleRun : true
    };

    config.set(options);
};
