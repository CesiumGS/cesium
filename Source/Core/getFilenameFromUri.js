/*global define*/
define([
        '../ThirdParty/Uri',
        './defined',
        './DeveloperError'
    ], function(
        Uri,
        defined,
        DeveloperError) {
    "use strict";

    /**
     * Given a URI, returns the last segment of the URI, removing any path or query information.
     * @exports getFilenameFromUri
     *
     * @param {String} uri The Uri.
     * @returns {String} The last segment of the Uri.
     *
     * @example
     * //fileName will be"simple.czml";
     * var fileName = Cesium.getFilenameFromUri('/Gallery/simple.czml?value=true&example=false');
     */
    function getFilenameFromUri(uri) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(uri)) {
            throw new DeveloperError('uri is required.');
        }
        //>>includeEnd('debug');

        var uriObject = new Uri(uri);
        uriObject.normalize();
        var path = uriObject.path;
        var index = path.lastIndexOf('/');
        if (index !== -1) {
            path = path.substr(index + 1);
        }
        return path;
    }

    return getFilenameFromUri;
});
