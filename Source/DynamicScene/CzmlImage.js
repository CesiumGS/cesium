/*global define*/
define(['../ThirdParty/Uri'], function(Uri) {
    "use strict";

    /**
     * Provides methods for working with a image defined in CZML.
     *
     * @exports CzmlImage
     *
     * @see DynamicProperty
     * @see CzmlCartesian2
     * @see CzmlCartesian3
     * @see CzmlPosition
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
    var CzmlImage = {
        /**
         * Returns the packed image representation contained within the provided CZML interval
         * or undefined if the interval does not contain image data.
         *
         * @param {Object} czmlInterval The CZML interval to unwrap.
         */
        unwrapInterval : function(czmlInterval, sourceUri) {
            var result = typeof czmlInterval.image === 'undefined' ? czmlInterval : czmlInterval.image;
            if (typeof sourceUri !== 'undefined') {
                var baseUri = new Uri(document.location.href);
                sourceUri = new Uri(sourceUri);
                result = new Uri(result).resolve(sourceUri.resolve(baseUri)).toString();
            }
            return result;
        },

        /**
         * Since CZML images can not be sampled, this method always returns false.
         */
        isSampled : function() {
            return false;
        },

        /**
         * Returns the image value contained within the unwrappedInterval.  For images
         * this is the unwrappedInterval itself.
         *
         * @param {Object} unwrappedInterval The result of CzmlImage.unwrapInterval.
         * @returns The image value.
         */
        getValue : function(unwrappedInterval) {
            return unwrappedInterval;
        }
    };

    return CzmlImage;
});