/*global define*/
define(['./defaultValue'], function(defaultValue) {
    "use strict";

    /**
     * Represents the closed interval [start, stop].
     * @alias Interval
     * @constructor
     *
     * @param {Number} [start=0.0] The beginning of the interval.
     * @param {Number} [stop=0.0] The end of the interval.
     */
    var Interval = function(start, stop) {
        /**
         * The beginning of the interval.
         * @type {Number}
         */
        this.start = defaultValue(start, 0.0);
        /**
         * The end of the interval.
         * @type {Number}
         */
        this.stop = defaultValue(stop, 0.0);
    };

    return Interval;
});