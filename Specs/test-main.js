(function () {
    /*global __karma__*/
    "use strict";

    var allTestFiles = Object.keys(__karma__.files).filter(function(file) {
        return /Spec\.js$/.test(file);
    });

    /* global require */
    require({
            // Karma serves files from '/base', which is the basePath from your config file
            baseUrl : '/base/Source',

            paths : {
                'Specs' : '../Specs',
                'Source' : '.'
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