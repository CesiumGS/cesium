/*global define*/
define(['./defined',
        './DeveloperError',
        '../ThirdParty/Uri'
    ], function(
        defined,
        DeveloperError,
        Uri) {
    "use strict";

    /**
     * Given a URI, returns the last segment of the URI, removing any path or query information.
     * @exports getFilenameFromUri
     *
     * @param {String} uri The Uri.
     * @returns {String} The last segment of the Uri.
     *
     * @exception {DeveloperError} uri is required.
     *
     * @example
     * //fileName will be"simple.czml";
     * var fileName = getFilenameFromUri('/Gallery/simple.czml?value=true&example=false');
     */
    var getFilenameFromUri = function(uri) {
        if (!defined(uri)) {
            throw new DeveloperError('uri is required.');
        }

        var uriObject = new Uri(uri);
        uriObject.normalize();
        var path = uriObject.path;
        var index = path.lastIndexOf('/');
        if (index !== -1) {
            path = path.substr(index + 1);
        }
        return path;
    };

    return getFilenameFromUri;
});