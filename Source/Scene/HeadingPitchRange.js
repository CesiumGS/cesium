/*global define*/
define([
        '../Core/deprecationWarning',
        '../Core/HeadingPitchRange'
    ], function(
        deprecationWarning,
        CoreHeadingPitchRange) {
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
     *
     * @deprecated
     */
    var HeadingPitchRange = function(heading, pitch, range) {
        deprecationWarning('HeadingPitchRange', 'Scene/HeadingPitchRange is deprecated. Use Core/HeadingPitchRange instead.');
        return new CoreHeadingPitchRange(heading, pitch, range);
    };

    /**
     * Duplicates a HeadingPitchRange instance.
     *
     * @param {HeadingPitchRange} hpr The HeadingPitchRange to duplicate.
     * @param {HeadingPitchRange} [result] The object onto which to store the result.
     * @returns {HeadingPitchRange} The modified result parameter or a new HeadingPitchRange instance if one was not provided. (Returns undefined if hpr is undefined)
     */
    HeadingPitchRange.clone = function(hpr, result) {
        return CoreHeadingPitchRange.clone(hpr, result);
    };

    return HeadingPitchRange;
});
