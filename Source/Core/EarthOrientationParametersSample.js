/*global define*/
define(function() {
    "use strict";

    /**
     * A set of Earth Orientation Parameters (EOP) sampled at a time.
     *
     * @alias EarthOrientationParametersSample
     * @constructor
     *
     * @param {Number} xPoleWander The pole wander about the X axis, in radians.
     * @param {Number} yPoleWander The pole wander about the Y axis, in radians.
     * @param {Number} xPoleOffset The offset to the Celestial Intermediate Pole (CIP) about the X axis, in radians.
     * @param {Number} yPoleOffset The offset to the Celestial Intermediate Pole (CIP) about the Y axis, in radians.
     * @param {Number} ut1MinusUtc The difference in time standards, UT1 - UTC, in seconds.
     *
     * @private
     */
    var EarthOrientationParametersSample = function EarthOrientationParametersSample(xPoleWander, yPoleWander, xPoleOffset, yPoleOffset, ut1MinusUtc) {
        /**
         * The pole wander about the X axis, in radians.
         * @type {Number}
         */
        this.xPoleWander = xPoleWander;

        /**
         * The pole wander about the Y axis, in radians.
         * @type {Number}
         */
        this.yPoleWander = yPoleWander;

        /**
         * The offset to the Celestial Intermediate Pole (CIP) about the X axis, in radians.
         * @type {Number}
         */
        this.xPoleOffset = xPoleOffset;

        /**
         * The offset to the Celestial Intermediate Pole (CIP) about the Y axis, in radians.
         * @type {Number}
         */
        this.yPoleOffset = yPoleOffset;

        /**
         * The difference in time standards, UT1 - UTC, in seconds.
         * @type {Number}
         */
        this.ut1MinusUtc = ut1MinusUtc;
    };

    return EarthOrientationParametersSample;
});