(function() {
    /*global __karma__,require*/
    "use strict";

    require({
                baseUrl : '/base/Source',
                paths : {
                    'Source' : '.',
                    'Specs' : '../Specs'
                }
            },
            [
                'Specs/customizeJasmine'
            ],
            function(customizeJasmine) {
                var include = __karma__.config.args[0];
                var exclude = __karma__.config.args[1];

                customizeJasmine(jasmine.getEnv(), include, exclude);

                var specFiles = Object.keys(__karma__.files).filter(function(file) {
                    return /Spec\.js$/.test(file);
                });

                require(specFiles, function() {
                    __karma__.start();
                });
            });
})();
