/*global define*/
define([
        './defined'
    ], function(
        defined) {
    "use strict";

    var dataUriRegex = /^data:(.*?)(;base64)?,(.*)$/;

    /**
     * DOC_TBA.
     *
     * @exports isArray
     *
     * @param {Object} value DOC_TBA.
     * @returns {Boolean} true DOC_TBA.
     *
     * @private
     */
    function isDataUri(uri) {
        if (defined(uri)) {
            var result = dataUriRegex.exec(uri);
            return (result !== null);
        }

        return false;
    }

    return isDataUri;
});