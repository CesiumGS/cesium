(function() {
    /*global __karma__,require*/
    "use strict";

    var included = '';
    var excluded = '';
    var webglValidation = false;
    var release = false;

    if(__karma__.config.args){
        included = __karma__.config.args[0];
        excluded = __karma__.config.args[1];
        webglValidation = __karma__.config.args[2];
        release = __karma__.config.args[3];
    }

    var toRequire = ['Cesium'];

    if (release) {
        require.config({
            baseUrl : '/base/Build/Cesium'
        });
        toRequire.push('../Stubs/paths');
    } else {
        require.config({
           baseUrl : '/base/Source'
        });
    }

    require(toRequire, function (Cesium, paths) {
        if (release) {
            paths.Specs = '../../Specs';
            paths.Source = '../../Source';
            paths.Stubs = '../Stubs';

            require.config({
                paths: paths,
                shim: {
                    'Cesium': {
                        exports: 'Cesium'
                    }
                }
            });
        } else {
            require.config({
                paths: {
                    'Specs': '../Specs',
                    'Source' : '.'
                }
            });
        }

        require([
        'Specs/customizeJasmine'
    ], function(
        customizeJasmine) {

                    customizeJasmine(jasmine.getEnv(), included, excluded, webglValidation, release);

                    var specFiles = Object.keys(__karma__.files).filter(function(file) {
                        return /Spec\.js$/.test(file);
                    });

                    require(specFiles, function() {
                        __karma__.start();
                    });
                });
    });
})();
