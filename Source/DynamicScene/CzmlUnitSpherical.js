/*global define*/
define([
        '../Core/Spherical'
       ], function(
         Spherical) {
    "use strict";

    var doublesPerValue = 2;

    /**
     * Provides methods for working with a unit Spherical defined in CZML.
     *
     * @exports CzmlUnitSpherical
     *
     * @see Spherical
     * @see DynamicProperty
     * @see CzmlBoolean
     * @see CzmlCartesian2
     * @see CzmlCartesian3
     * @see CzmlPosition
     * @see CzmlColor
     * @see CzmlHorizontalOrigin
     * @see CzmlLabelStyle
     * @see CzmlNumber
     * @see CzmlString
     * @see CzmlUnitCartesian3
     * @see CzmlUnitQuaternion
     * @see CzmlVerticalOrigin
     */
    var CzmlUnitSpherical = {
        /**
         * The number of doubles per packed Spherical value.
         */
        doublesPerValue : doublesPerValue,

        /**
         * The number of doubles per packed value used for interpolation.
         */
        doublesPerInterpolationValue : doublesPerValue,

        /**
         * Returns the packed Spherical representation contained within the provided CZML interval
         * or undefined if the interval does not contain Spherical data.
         *
         * @param {Object} czmlInterval The CZML interval to unwrap.
         */
        unwrapInterval : function(czmlInterval) {
            return czmlInterval.unitSpherical;
        },

        /**
         * Returns true if this interval represents data that should be interpolated by the client
         * or false if it's a single value.
         *
         * @param {Object} unwrappedInterval The result of CzmlUnitSpherical.unwrapInterval.
         */
        isSampled : function(unwrappedInterval) {
            return Array.isArray(unwrappedInterval) && unwrappedInterval.length > doublesPerValue;
        },

        /**
         * Given a non-sampled unwrapped interval, returns a Spherical instance of the data.
         *
         * @param {Object} unwrappedInterval The result of CzmlUnitSpherical.unwrapInterval.
         * @param {Spherical} result The object to store the result in, if undefined a new instance will be created.
         * @returns The modified result parameter or a new Spherical instance if result was not defined.
         */
        getValue : function(unwrappedInterval, spherical) {
            if (typeof spherical === 'undefined') {
                spherical = new Spherical();
            }
            spherical.clock = unwrappedInterval[0];
            spherical.cone = unwrappedInterval[1];
            spherical.magnitude = 1.0;
            return spherical;
        },

        /**
         * Given a packed array of clock and cone values, extracts a Spherical instance.
         *
         * @param {Array} array A packed array of Spherical values, where every two elements represents a Spherical.
         * @param {Number} startingIndex The index into the array that contains the clock value of the Spherical you would like.
         * @param {Spherical} result The object to store the result in, if undefined a new instance will be created.
         * @returns The modified result parameter or a new Spherical instance if result was not defined.
         */
        getValueFromArray : function(array, startingIndex, spherical) {
            if (typeof spherical === 'undefined') {
                spherical = new Spherical();
            }
            spherical.clock = array[startingIndex];
            spherical.cone = array[startingIndex + 1];
            spherical.magnitude = 1.0;
            return spherical;
        }
    };

    return CzmlUnitSpherical;
});