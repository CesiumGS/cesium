/*global define*/
define([
        '../Core/defaultValue',
        '../Scene/HorizontalOrigin'
    ], function(
        defaultValue,
        HorizontalOrigin) {
    "use strict";

    /**
     * Provides methods for working with a horizontal origin defined in CZML.
     *
     * @exports CzmlHorizontalOrigin
     *
     * @see HorizontalOrigin
     * @see DynamicProperty
     * @see CzmlBoolean
     * @see CzmlCartesian2
     * @see CzmlCartesian3
     * @see CzmlPosition
     * @see CzmlColor
     * @see CzmlLabelStyle
     * @see CzmlNumber
     * @see CzmlString
     * @see CzmlUnitCartesian3
     * @see CzmlUnitQuaternion
     * @see CzmlUnitSpherical
     * @see CzmlVerticalOrigin
     */
    var CzmlHorizontalOrigin = {
        /**
         * Returns the packed enum representation contained within the provided CZML interval
         * or undefined if the interval does not contain enum data.
         *
         * @param {Object} czmlInterval The CZML interval to unwrap.
         */
        unwrapInterval : function(czmlInterval) {
            return defaultValue(czmlInterval.horizontalOrigin, czmlInterval);
        },

        /**
         * Since enums can not be sampled, this method always returns false.
         */
        isSampled : function() {
            return false;
        },

        /**
         * Returns the HorizontalOrigin contained within the unwrappedInterval.
         *
         * @param {Object} unwrappedInterval The result of CzmlHorizontalOrigin.unwrapInterval.
         * @returns The HorizontalOrigin value.
         */
        getValue : function(unwrappedInterval) {
            return HorizontalOrigin[unwrappedInterval];
        }
    };

    return CzmlHorizontalOrigin;
});