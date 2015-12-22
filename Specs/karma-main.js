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
                customizeJasmine(jasmine.getEnv());

                var specFiles = Object.keys(__karma__.files).filter(function(file) {
                    return /Spec\.js$/.test(file);
                });

                require(specFiles, function() {
                    __karma__.start();
                });
            });
})();
