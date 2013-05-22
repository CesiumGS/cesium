/*global define*/
define([
        'require',
        './DeveloperError'
    ], function(
        require,
        DeveloperError) {
    "use strict";
    /*global CESIUM_BASE_URL*/

    var baseUrl;
    function getCesiumBaseUrl() {
        if (typeof baseUrl !== 'undefined') {
            return baseUrl;
        }

        if (typeof CESIUM_BASE_URL !== 'undefined') {
            baseUrl = CESIUM_BASE_URL;
        } else {
            var cesiumScriptRegex = /(.*?)Cesium\w*\.js(?:\W|$)/i;
            var scripts = document.getElementsByTagName('script');
            for ( var i = 0, len = scripts.length; i < len; ++i) {
                var src = scripts[i].getAttribute('src');
                var result = cesiumScriptRegex.exec(src);
                if (result !== null) {
                    baseUrl = result[1];
                    break;
                }
            }
        }

        if (typeof baseUrl === 'undefined') {
            throw new DeveloperError('Unable to determine Cesium base URL automatically, try defining a global variable called CESIUM_BASE_URL.');
        }

        if (!/\/$/.test(baseUrl)) {
            baseUrl += '/';
        }

        return baseUrl;
    }

    function buildModuleUrlFromRequireToUrl(moduleID) {
        //moduleID will be non-relative, so require it relative to this module, in Core.
        return require.toUrl('../' + moduleID);
    }

    function buildModuleUrlFromBaseUrl(moduleID) {
        return getCesiumBaseUrl() + moduleID;
    }

    var implementation;

    /**
     * Given a non-relative moduleID, returns a URL to the file represented by that module ID,
     * using, in order of preference, require.toUrl, the value of a global CESIUM_BASE_URL, or
     * the base URL of the Cesium.js script.
     *
     * @private
     */
    var buildModuleUrl = function(moduleID) {
        if (typeof implementation !== 'undefined') {
            return implementation(moduleID);
        }

        //select implementation
        if (typeof require.toUrl !== 'undefined') {
            implementation = buildModuleUrlFromRequireToUrl;
        } else {
            implementation = buildModuleUrlFromBaseUrl;
        }

        return implementation(moduleID);
    };

    return buildModuleUrl;
});