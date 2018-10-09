define([
    './defined',
    './DeveloperError',
    './getAbsoluteUri',
    './Resource',
    'require'
], function(
    defined,
    DeveloperError,
    getAbsoluteUri,
    Resource,
    require) {
    'use strict';
    /*global CESIUM_BASE_URL*/

    var cesiumScriptRegex = /((?:.*\/)|^)cesium[\w-]*\.js(?:\W|$)/i;
    export function getBaseUrlFromCesiumScript(): string | undefined {
        var scripts = document.getElementsByTagName('script');
        for (var i = 0, len = scripts.length; i < len; ++i) {
            var src = scripts[i].getAttribute('src');
            var result = cesiumScriptRegex.exec(src);
            if (result !== null) {
                return result[1];
            }
        }
        return undefined;
    }

    var a;

    export function tryMakeAbsolute(url: string): HTMLElement {
        if (typeof document === 'undefined') {
            //Node.js and Web Workers. In both cases, the URL will already be absolute.
            return url;
        }

        if (!defined(a)) {
            a = document.createElement('a');
        }
        a.href = url;

        // IE only absolutizes href on get, not set
        a.href = a.href; // eslint-disable-line no-self-assign
        return a.href;
    }

    var baseResource;

    export function getCesiumBaseUrl(): Resource {
        if (defined(baseResource)) {
            return baseResource;
        }

        var baseUrlString;
        if (typeof CESIUM_BASE_URL !== 'undefined') {
            baseUrlString = CESIUM_BASE_URL;
        } else if (defined(define.amd) && !define.amd.toUrlUndefined && defined(require.toUrl)) {
            baseUrlString = getAbsoluteUri('..', buildModuleUrl('Core/buildModuleUrl.js'));
        } else {
            baseUrlString = getBaseUrlFromCesiumScript();
        }

        //>>includeStart('debug', pragmas.debug);
        if (!defined(baseUrlString)) {
            throw new DeveloperError('Unable to determine Cesium base URL automatically, try defining a global variable called CESIUM_BASE_URL.');
        }
        //>>includeEnd('debug');

        baseResource = new Resource({
            url: tryMakeAbsolute(baseUrlString)
        });
        baseResource.appendForwardSlash();

        return baseResource;
    }

    export function buildModuleUrlFromRequireToUrl(moduleID: string): string {
        //moduleID will be non-relative, so require it relative to this module, in Core.
        return tryMakeAbsolute(require.toUrl('../' + moduleID));
    }

    export function buildModuleUrlFromBaseUrl(moduleID: string): string {
        var resource = getCesiumBaseUrl().getDerivedResource({
            url: moduleID
        });
        return resource.url;
    }

    var implementation;

    /**
     * Given a non-relative moduleID, returns an absolute URL to the file represented by that module ID,
     * using, in order of preference, require.toUrl, the value of a global CESIUM_BASE_URL, or
     * the base URL of the Cesium.js script.
     *
     * @private
     */
    export function buildModuleUrl(moduleID: string): string {
        if (!defined(implementation)) {
            //select implementation
            if (defined(define.amd) && !define.amd.toUrlUndefined && defined(require.toUrl)) {
                implementation = buildModuleUrlFromRequireToUrl;
            } else {
                implementation = buildModuleUrlFromBaseUrl;
            }
        }

        var url = implementation(moduleID);
        return url;
    }

    // exposed for testing
    buildModuleUrl._cesiumScriptRegex = cesiumScriptRegex;
    buildModuleUrl._buildModuleUrlFromBaseUrl = buildModuleUrlFromBaseUrl;
    buildModuleUrl._clearBaseResource = function() {
        baseResource = undefined;
    };

    /**
     * Sets the base URL for resolving modules.
     * @param {String} value The new base URL.
     */
    buildModuleUrl.setBaseUrl = function(value: string) {
        baseResource = Resource.DEFAULT.getDerivedResource({
            url: value
        });
    };

    /**
     * Gets the base URL for resolving modules.
     */
    buildModuleUrl.getCesiumBaseUrl = getCesiumBaseUrl;

    return buildModuleUrl;
});
