/*global define*/
define([
        '../ThirdParty/Uri',
        './defined',
        './DeveloperError',
        'require'
    ], function(
        Uri,
        defined,
        DeveloperError,
        require) {
    "use strict";
    /*global CESIUM_BASE_URL*/

    var cesiumScriptRegex = /((?:.*\/)|^)cesium[\w-]*\.js(?:\W|$)/i;
    function getBaseUrlFromCesiumScript() {
        var scripts = document.getElementsByTagName('script');
        for ( var i = 0, len = scripts.length; i < len; ++i) {
            var src = scripts[i].getAttribute('src');
            var result = cesiumScriptRegex.exec(src);
            if (result !== null) {
                return result[1];
            }
        }
        return undefined;
    }

    var baseUrl;
    function getCesiumBaseUrl() {
        if (defined(baseUrl)) {
            return baseUrl;
        }

        var baseUrlString;
        if (typeof CESIUM_BASE_URL !== 'undefined') {
            baseUrlString = CESIUM_BASE_URL;
        } else {
            baseUrlString = getBaseUrlFromCesiumScript();
        }

        if (!defined(baseUrlString)) {
            throw new DeveloperError('Unable to determine Cesium base URL automatically, try defining a global variable called CESIUM_BASE_URL.');
        }

        baseUrl = new Uri(baseUrlString).resolve(new Uri(document.location.href));

        return baseUrl;
    }

    function buildModuleUrlFromRequireToUrl(moduleID) {
        //moduleID will be non-relative, so require it relative to this module, in Core.
        return require.toUrl('../' + moduleID);
    }

    function buildModuleUrlFromBaseUrl(moduleID) {
        return new Uri(moduleID).resolve(getCesiumBaseUrl()).toString();
    }

    var implementation;
    var a;

    /**
     * Given a non-relative moduleID, returns an absolute URL to the file represented by that module ID,
     * using, in order of preference, require.toUrl, the value of a global CESIUM_BASE_URL, or
     * the base URL of the Cesium.js script.
     *
     * @private
     */
    var buildModuleUrl = function(moduleID) {
        if (!defined(implementation)) {
            //select implementation
            if (defined(require.toUrl)) {
                implementation = buildModuleUrlFromRequireToUrl;
            } else {
                implementation = buildModuleUrlFromBaseUrl;
            }
        }

        if (!defined(a)) {
            a = document.createElement('a');
        }

        var url = implementation(moduleID);

        a.href = url;
        a.href = a.href; // IE only absolutizes href on get, not set

        return a.href;
    };

    // exposed for testing
    buildModuleUrl._cesiumScriptRegex = cesiumScriptRegex;

    return buildModuleUrl;
});