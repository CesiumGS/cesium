/*global define*/
define([
        '../Scene/VerticalOrigin'
       ], function(
         VerticalOrigin) {
    "use strict";

    /**
     * Provides methods for working with a vertical origin defined in CZML.
     *
     * @exports CzmlVerticalOrigin
     *
     * @see VerticalOrigin
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
     * @see CzmlUnitSpherical
     */
    var CzmlVerticalOrigin = {
        /**
         * Returns the packed enum representation contained within the provided CZML interval
         * or undefined if the interval does not contain enum data.
         *
         * @param {Object} czmlInterval The CZML interval to unwrap.
         */
        unwrapInterval : function(czmlInterval) {
            var result = czmlInterval.verticalOrigin;
            return typeof result === 'undefined' ? czmlInterval : result;
        },

        /**
         * Since enums can not be sampled, this method always returns false.
         */
        isSampled : function() {
            return false;
        },

        /**
         * Returns the VerticalOrigin contained within the unwrappedInterval.
         *
         * @param {Object} unwrappedInterval The result of CzmlVerticalOrigin.unwrapInterval.
         * @returns The VerticalOrigin value.
         */
        getValue : function(unwrappedInterval) {
            return VerticalOrigin[unwrappedInterval];
        }
    };

    return CzmlVerticalOrigin;
});