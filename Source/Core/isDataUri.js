/*global define*/
define([
        './defined'
    ], function(
        defined) {
    'use strict';

    var dataUriRegex = /^data:/i;

    /**
     * Determines if the specified uri is a data uri.
     *
     * @exports isDataUri
     *
     * @param {String} uri The uri to test.
     * @returns {Boolean} true when the uri is a data uri; otherwise, false.
     *
     * @private
     */
    function isDataUri(uri) {
        if (defined(uri)) {
            return dataUriRegex.test(uri);
        }

        return false;
    }

    return isDataUri;
});
