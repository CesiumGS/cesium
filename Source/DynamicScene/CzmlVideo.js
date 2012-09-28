/*global define*/
define(['../ThirdParty/Uri'], function(Uri) {
    "use strict";

    /**
     * Provides methods for working with a video defined in CZML.
     *
     * @exports CzmlVideo
     *
     * @see DynamicProperty
     * @see CzmlCartesian2
     * @see CzmlCartesian3
     * @see CzmlCartographic
     * @see CzmlColor
     * @see CzmlHorizontalOrigin
     * @see CzmlLabelStyle
     * @see CzmlNumber
     * @see CzmlVideo
     * @see CzmlUnitCartesian3
     * @see CzmlUnitQuaternion
     * @see CzmlUnitSpherical
     * @see CzmlVerticalOrigin
     */
    var CzmlVideo = {
        /**
         * Returns the packed video representation contained within the provided CZML interval
         * or undefined if the interval does not contain video data.
         *
         * @param {Object} czmlInterval The CZML interval to unwrap.
         */
        unwrapInterval : function(czmlInterval, sourceUri) {
            var result = typeof czmlInterval.video === 'undefined' ? czmlInterval : czmlInterval.video;
            if (typeof sourceUri !== 'undefined') {
                var baseUri = new Uri(document.location.href);
                sourceUri = new Uri(sourceUri);
                result = new Uri(result).resolve(sourceUri.resolve(baseUri)).toString();
            }
            return result;
        },

        /**
         * Since CZML videos can not be sampled, this method always returns false.
         */
        isSampled : function() {
            return false;
        },

        /**
         * Returns the video value contained within the unwrappedInterval.  For videos
         * this is the unwrappedInterval itself.
         *
         * @param {Object} unwrappedInterval The result of CzmlVideo.unwrapInterval.
         * @returns The video value.
         */
        getValue : function(unwrappedInterval) {
            return unwrappedInterval;
        }
    };

    return CzmlVideo;
});