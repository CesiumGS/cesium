/*global define*/
define([
        '../ThirdParty/Uri',
        './definedNotNull',
        './DeveloperError'
    ], function(
        Uri,
        definedNotNull,
        DeveloperError) {
    "use strict";

    /**
     * Given a URI, returns the base path of the URI.
     * @exports getBaseUri
     *
     * @param {String} uri The Uri.
     * @param {Boolean} [includeQuery = false] Whether or not to include the query string and fragment form the uri
     * @returns {String} The base path of the Uri.
     *
     * @example
     * // basePath will be "/Gallery/";
     * var basePath = Cesium.getBaseUri('/Gallery/simple.czml?value=true&example=false');
     *
     * // basePath will be "/Gallery/?value=true&example=false";
     * var basePath = Cesium.getBaseUri('/Gallery/simple.czml?value=true&example=false', true);
     */
    function getBaseUri(uri, includeQuery) {
        //>>includeStart('debug', pragmas.debug);
        if (!definedNotNull(uri)) {
            throw new DeveloperError('uri is required.');
        }
        //>>includeEnd('debug');

        var basePath = '';
        var i = uri.lastIndexOf('/');
        if (i !== -1) {
            basePath = uri.substring(0, i + 1);
        }

        if (!includeQuery) {
            return basePath;
        }

        uri = new Uri(uri);
        if (definedNotNull(uri.query)) {
            basePath += '?' + uri.query;
        }
        if (definedNotNull(uri.fragment)){
            basePath += '#' + uri.fragment;
        }

        return basePath;
    }

    return getBaseUri;
});
