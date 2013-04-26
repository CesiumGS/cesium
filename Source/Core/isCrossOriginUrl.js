/*global define*/
define(function() {
    "use strict";

    var a;

    /**
     * Given a URL, determine whether that URL is considered cross-origin to the current page.
     *
     * @private
     */
    var isCrossOriginUrl = function(url) {
        if (typeof a === 'undefined') {
            a = document.createElement('a');
        }

        var location = window.location;
        a.href = url;

        // host includes both hostname and port if the port is not standard
        return a.protocol !== location.protocol || a.host !== location.host;
    };

    return isCrossOriginUrl;
});