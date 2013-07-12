/*global define*/
define(['../ThirdParty/Uri'], function(Uri) {
    "use strict";

    /**
     * Provides methods for working with a image defined in CZML.
     *
     * @exports CzmlModel
     *
     * @see DynamicProperty
     * @see CzmlCartesian2
     * @see CzmlCartesian3
     * @see CzmlCartographic
     * @see CzmlColor
     * @see CzmlHorizontalOrigin
     * @see CzmlLabelStyle
     * @see CzmlNumber
     * @see CzmlImage
     * @see CzmlUnitCartesian3
     * @see CzmlUnitQuaternion
     * @see CzmlUnitSpherical
     * @see CzmlVerticalOrigin
     */
    var CzmlModel = {
        /**
         * Returns the packed model representation contained within the provided CZML interval
         * or undefined if the interval does not contain model data.
         *
         * @param {Object} czmlInterval The CZML interval to unwrap.
         */
        unwrapInterval : function(czmlInterval, sourceUri) {
            var result = typeof czmlInterval.gltf === 'undefined' ? czmlInterval : czmlInterval.gltf;
            if (typeof sourceUri !== 'undefined') {
                var baseUri = new Uri(document.location.href);
                sourceUri = new Uri(sourceUri);
                result = new Uri(result).resolve(sourceUri.resolve(baseUri)).toString();
            }
            return result;
        },

        /**
         * Since CZML models can not be sampled, this method always returns false.
         */
        isSampled : function() {
            return false;
        },

        /**
         * Returns the model value contained within the unwrappedInterval.  For models
         * this is the unwrappedInterval itself.
         *
         * @param {Object} unwrappedInterval The result of CzmlModel.unwrapInterval.
         * @returns The model value.
         */
        getValue : function(unwrappedInterval) {
            return unwrappedInterval;
        }
    };

    return CzmlModel;
});