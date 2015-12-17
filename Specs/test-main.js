(function () {
    /*global __karma__*/
    "use strict";
    var allTestFiles = [];
    var TEST_REGEXP = /(spec|test)\.js$/i;

    Object.keys(__karma__.files).forEach(function(file) {
        if (TEST_REGEXP.test(file)) {
            // Normalize paths to RequireJS module names.
            allTestFiles.push(file.replace(/^\/base\//, 'http://localhost:8080/base/'));
        }
    });

    require({
            // Karma serves files from '/base', which is the basePath from your config file
            baseUrl : 'http://localhost:8080/base/Source',

            paths : {
                'Specs' : '../Specs',
                'Source' : '.',
                'Cesium' : 'Cesium'
            },

            // dynamically load all test files
            deps : allTestFiles,

            // we have to kickoff jasmine, as it is asynchronous
            callback : __karma__.start
        },
        ['../Specs/customizeJasmine'],
        function (customizeJasmine) {
            customizeJasmine(jasmine.getEnv());
        });

    window.defineSuite = function(deps, name, suite, categories) {
        /*global define,describe*/
        if (typeof suite === 'object' || typeof suite === 'string') {
            categories = suite;
        }

        if (typeof name === 'function') {
            suite = name;
            name = deps[0];
        }

        define(deps, function() {
            var args = arguments;
            describe(name, function() {
                suite.apply(null, args);
            }, categories);
        });
    };

})();