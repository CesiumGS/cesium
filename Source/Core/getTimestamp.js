/*global define*/
define([
        './defined'
    ], function(
        defined) {
    "use strict";

    /**
     * Gets a timestamp that can be used in measuring the time between events.  Timestamps
     * are expressed in milliseconds, but it is not specified what the milliseconds are
     * measured from.  This function uses performance.now() if it is available, or Date.now()
     * otherwise.
     *
     * @exports getTimestamp
     *
     * @returns {Number} The timestamp in milliseconds since some unspecified reference time.
     */
    var getTimestamp;

    if (defined(window) && defined(window.performance) && defined(window.performance.now)) {
        getTimestamp = function() {
            return window.performance.now();
        };
    } else {
        getTimestamp = function() {
            return Date.now();
        };
    }

    return getTimestamp;
});