/*global define*/
define([
        '../Core/Cartesian3',
        '../Core/Spherical',
        '../Core/Math',
        '../Core/Ellipsoid'
       ], function(
         Cartesian3,
         Spherical,
         CesiumMath,
         Ellipsoid) {
    "use strict";

    var doublesPerValue = 3;
    var scratchCartesian = new Cartesian3();
    var scratchSpherical = new Spherical();

    /**
     * Provides methods for working with a direction defined in CZML.
     *
     * @exports CzmlDirection
     *
     * @see Cartesian3
     * @see Spherical
     * @see DynamicProperty
     * @see DynamicDirectionProperty
     * @see CzmlBoolean
     * @see CzmlCartesian2
     * @see CzmlColor
     * @see CzmlHorizontalOrigin
     * @see CzmlLabelStyle
     * @see CzmlNumber
     * @see CzmlString
     * @see CzmlUnitCartesian3
     * @see CzmlUnitQuaternion
     * @see CzmlUnitSpherical
     * @see CzmlVerticalOrigin
     */
    var CzmlDirection = {
         /**
         * The number of doubles per packed Cartesian3 value.
         */
        doublesPerValue : doublesPerValue,

        /**
         * The number of doubles per packed value used for interpolation.
         */
        doublesPerInterpolationValue : doublesPerValue,

        /**
         * Returns the packed Cartesian3 representation contained within the provided CZML interval
         * or undefined if the interval does not contain Cartesian3 data.
         *
         * @param {Object} czmlInterval The CZML interval to unwrap.
         */
        unwrapInterval : function(czmlInterval) {
            var unitCartesian = czmlInterval.unitCartesian;
            if (typeof unitCartesian !== 'undefined') {
                return unitCartesian;
            }

            var unitSpherical = czmlInterval.unitSpherical;
            if (typeof unitSpherical !== 'undefined') {
                var len = unitSpherical.length;
                if (len === 2) {
                    scratchSpherical.clock = unitSpherical[0];
                    scratchSpherical.cone = unitSpherical[1];
                    Cartesian3.fromSpherical(scratchSpherical, scratchCartesian);
                    unitCartesian = [scratchCartesian.x, scratchCartesian.y, scratchCartesian.z];
                } else {
                    var sphericalIt = 0;
                    unitCartesian = new Array((len / 3) * 4);
                    for ( var i = 0; i < len; i += 4) {
                        unitCartesian[i] = unitSpherical[sphericalIt++];

                        scratchSpherical.clock = unitSpherical[sphericalIt++];
                        scratchSpherical.cone = unitSpherical[sphericalIt++];
                        Cartesian3.fromSpherical(scratchSpherical, scratchCartesian);

                        unitCartesian[i + 1] = scratchCartesian.x;
                        unitCartesian[i + 2] = scratchCartesian.y;
                        unitCartesian[i + 3] = scratchCartesian.z;
                    }
                }
            }
            return unitCartesian;
        },

        /**
         * Returns true if this interval represents data that should be interpolated by the client
         * or false if it's a single value.
         *
         * @param {Object} unwrappedInterval The result of CzmlDirection.unwrapInterval.
         */
        isSampled : function(unwrappedInterval) {
            return Array.isArray(unwrappedInterval) && unwrappedInterval.length > doublesPerValue;
        },

        /**
         * Given a non-sampled unwrapped interval, returns a Cartesian3 instance of the data.
         *
         * @param {Object} unwrappedInterval The result of CzmlDirection.unwrapInterval.
         * @param {Cartesian3} result The object to store the result in, if undefined a new instance will be created.
         * @returns The modified result parameter or a new Cartesian3 instance if result was not defined.
         */
        getValue : function(unwrappedInterval, result) {
            if (typeof result === 'undefined') {
                result = new Cartesian3();
            }
            result.x = unwrappedInterval[0];
            result.y = unwrappedInterval[1];
            result.z = unwrappedInterval[2];
            return result;
        },

        /**
         * Given a packed array of x, y, and z values, extracts a Cartesian3 instance.
         *
         * @param {Array} array A packed array of Cartesian3 values, where every three elements represents a Cartesian3.
         * @param {Number} startingIndex The index into the array that contains the x value of the Cartesian3 you would like.
         * @param {Cartesian3} result The object to store the result in, if undefined a new instance will be created.
         * @returns The modified result parameter or a new Cartesian3 instance if result was not defined.
         */
        getValueFromArray : function(array, startingIndex, result) {
            if (typeof result === 'undefined') {
                result = new Cartesian3();
            }
            result.x = array[startingIndex];
            result.y = array[startingIndex + 1];
            result.z = array[startingIndex + 2];
            return result;
        }
    };

    return CzmlDirection;
});