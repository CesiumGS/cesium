/*global define*/
define(function() {
    "use strict";

    /**
     * Provides methods for working with a string defined in CZML.
     *
     * @exports CzmlString
     *
     * @see DynamicProperty
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
     * @see CzmlUnitSpherical
     * @see CzmlVerticalOrigin
     */
    var CzmlString = {
        /**
         * Returns the packed string representation contained within the provided CZML interval
         * or undefined if the interval does not contain string data.
         *
         * @param {Object} czmlInterval The CZML interval to unwrap.
         */
        unwrapInterval : function(czmlInterval) {
            var result = czmlInterval.string;
            return typeof result === 'undefined' ? czmlInterval : result;
        },

        /**
         * Since CZML strings can not be sampled, this method always returns false.
         */
        isSampled : function() {
            return false;
        },

        /**
         * Returns the string value contained within the unwrappedInterval.  For strings
         * this is the unwrappedInterval itself.
         *
         * @param {Object} unwrappedInterval The result of CzmlString.unwrapInterval.
         * @returns The string value.
         */
        getValue : function(unwrappedInterval) {
            return unwrappedInterval;
        }
    };

    return CzmlString;
});