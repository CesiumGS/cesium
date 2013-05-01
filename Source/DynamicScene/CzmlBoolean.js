/*global define*/
define([
        '../Core/defaultValue'
    ], function(
        defaultValue) {
    "use strict";

    /**
     * Provides methods for working with a boolean defined in CZML.
     *
     * @exports CzmlBoolean
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
    var CzmlBoolean = {
        /**
         * Returns the packed boolean representation contained within the provided CZML interval
         * or undefined if the interval does not contain boolean data.
         *
         * @param {Object} czmlInterval The CZML interval to unwrap.
         */
        unwrapInterval : function(czmlInterval) {
            /*jshint sub:true*/
            // boolean is a JS reserved word
            return defaultValue(czmlInterval['boolean'], czmlInterval);
        },

        /**
         * Since CZML booleans can not be sampled, this method always returns false.
         */
        isSampled : function() {
            return false;
        },

        /**
         * Returns the boolean value contained within the unwrappedInterval.  For booleans
         * this is the unwrappedInterval itself.
         *
         * @param {Object} unwrappedInterval The result of CzmlBoolean.unwrapInterval.
         * @returns The boolean value.
         */
        getValue : function(unwrappedInterval) {
            return unwrappedInterval;
        }
    };

    return CzmlBoolean;
});