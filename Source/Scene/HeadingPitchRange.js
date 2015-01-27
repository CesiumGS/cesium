/*global define*/
define(['../Core/defaultValue'], function(defaultValue) {
    "use strict";

    /**
     * Defines a heading angle, pitch angle an range in a local frame.
     * Heading is the rotation from the local north direction where a positive angle is increasing eastward.
     * Pitch is the rotation from the local xy-plane. Positive pitch angles are above the plane. Negative pitch
     * angles are below the plane. Range is the distance from the center of the frame.
     * @alias HeadingPitchRange
     * @constructor
     *
     * @param {Number} [heading=0.0] The heading angle in radians.
     * @param {Number} [pitch=0.0] The pitch angle in radians.
     * @param {Number} [range=0.0] The distance from the center in meters.
     */
    var HeadingPitchRange = function(heading, pitch, range) {
        /**
         * Heading is the rotation from the local north direction where a positive angle is increasing eastward.
         * @type {Number}
         */
        this.heading = defaultValue(heading, 0.0);

        /**
         * Pitch is the rotation from the local xy-plane. Positive pitch angles
         * are above the plane. Negative pitch angles are below the plane.
         * @type {Number}
         */
        this.pitch = defaultValue(pitch, 0.0);

        /**
         * Range is the distance from the center of the local frame.
         * @type {Number}
         */
        this.range = defaultValue(range, 0.0);
    };

    return HeadingPitchRange;
});
