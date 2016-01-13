/*global define*/
define(function() {
    "use strict";

    /**
     * @private
     */
    function appendForwardSlash(url) {
        if (url.length === 0 || url[url.length - 1] !== '/') {
            url = url + '/';
        }
        return url;
    }

    return appendForwardSlash;
});
