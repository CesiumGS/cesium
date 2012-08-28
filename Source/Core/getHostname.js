/*global define*/
define([
    ], function() {
    "use strict";

    var anchor;

    /**
     * Gets the hostname portion of a URL.
     *
     * @param {String} url The URL to extract the hostname from.
     *
     * @returns {String} The hostname portion of the URL.
     */
    function getHostname(url) {
        if (typeof anchor === 'undefined') {
            anchor = document.createElement('a');
        }
        anchor.href = url;
        return anchor.hostname;
    }

    return getHostname;
});

