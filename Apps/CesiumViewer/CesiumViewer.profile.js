var profile = {
    basePath : '../..',
    baseUrl : '.',
    releaseDir : './Build/Apps/CesiumViewer',
    action : 'release',
    cssOptimize : 'comments',
    mini : true,
    optimize : 'closure',
    layerOptimize : 'closure',
    stripConsole : 'all',
    selectorEngine : 'acme',
    layers : {
        'dojo/dojo' : {
            include : ['dojo/dojo', 'CesiumViewer/CesiumViewer', 'CesiumViewer/boot'],
            boot : true,
            customBase : true
        }
    },

    packages : [{
        name : 'CesiumViewer',
        destLocation : '.'
    }],

    staticHasFeatures : {
        'dojo-trace-api' : 0,
        'dojo-log-api' : 0,
        'dojo-publish-privates' : 0,
        'dojo-sync-loader' : 0,
        'dojo-xhr-factory' : 0,
        'dojo-test-sniff' : 0,
        'dojo-firebug' : 0
    },

    resourceTags : {
        miniExclude : function(filename, mid) {
            "use strict";
            return mid in {
                'CesiumViewer/CesiumViewer.profile' : 1
            };
        },
        amd : function(filename, mid) {
            "use strict";
            return (/\.js$/).test(filename);
        }
    }
};