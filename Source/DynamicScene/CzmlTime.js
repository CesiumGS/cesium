/*global define*/
define([
        '../Core/JulianDate'
       ],function(
        JulianDate) {
    "use strict";

    /**
     * Provides methods for working with a string defined in CZML.
     *
     * @exports CzmlTime
     *
     * @see DynamicProperty
     * @see CzmlCartesian2
     * @see CzmlCartesian3
     * @see CzmlCartographic
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
    var CzmlTime = {
        /**
         * Returns the packed date representation contained within the provided CZML interval
         * or undefined if the interval does not contain date data.
         *
         * @param {Object} czmlInterval The CZML interval to unwrap.
         */
        unwrapInterval : function(czmlInterval) {
            var result = czmlInterval.time;
            return typeof result === 'undefined' ? czmlInterval : result;
        },

        /**
         * Since CZML dates can not be sampled, this method always returns false.
         */
        isSampled : function() {
            return false;
        },

        /**
         * Returns the dates value contained within the unwrappedInterval.  For dates
         * this is the unwrappedInterval itself.
         *
         * @param {Object} unwrappedInterval The result of CzmlTime.unwrapInterval.
         * @returns The date value.
         */
        getValue : function(unwrappedInterval, result) {
            return JulianDate.fromIso8601(unwrappedInterval, result);
        }
    };

    return CzmlTime;
});