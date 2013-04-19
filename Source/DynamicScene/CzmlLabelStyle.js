/*global define*/
define([
        '../Scene/LabelStyle'
       ], function(
         LabelStyle) {
    "use strict";

    /**
     * Provides methods for working with a label style defined in CZML.
     *
     * @exports CzmlLabelStyle
     *
     * @see LabelStyle
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
    var CzmlLabelStyle = {
        /**
         * Returns the packed enum representation contained within the provided CZML interval
         * or undefined if the interval does not contain enum data.
         *
         * @param {Object} czmlInterval The CZML interval to unwrap.
         */
        unwrapInterval : function(czmlInterval) {
            var result = czmlInterval.labelStyle;
            return typeof result === 'undefined' ? czmlInterval : result;
        },

        /**
         * Since enums can not be sampled, this method always returns false.
         */
        isSampled : function() {
            return false;
        },

        /**
         * Returns the LabelStyle contained within the unwrappedInterval.
         *
         * @param {Object} unwrappedInterval The result of CzmlLabelStyle.unwrapInterval.
         * @returns The LabelStyle value.
         */
        getValue : function(unwrappedInterval) {
            return LabelStyle[unwrappedInterval];
        }
    };

    return CzmlLabelStyle;
});