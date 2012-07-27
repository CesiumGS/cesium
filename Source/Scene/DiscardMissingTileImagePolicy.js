/*global define*/
define([
        '../Core/loadImage',
        '../Core/getImagePixels',
        '../ThirdParty/when'
    ], function(
        loadImage,
        getImagePixels,
        when) {
    "use strict";

    /**
     * A policy for discarding tile images that match a known image containing a
     * "missing" icon.
     *
     * @param {String|Object} missingImageUrl The URL of the known missing image, or a
     *        promise for the URL.
     * @param {Array} pixelsToCheck An array of Cartesian2 pixel positions to
     *        compare against the missing image.
     */
    function DiscardMissingTileImagePolicy(missingImageUrl, pixelsToCheck) {
        this._missingImagePixels = when(loadImage(missingImageUrl), getImagePixels);
        this._pixelsToCheck = pixelsToCheck;
    }

    /**
     * Given a tile image, decide whether to discard that image.  This policy
     * compares the image to the known "missing" image.
     *
     * @param image an image, or a promise that will resolve to an image.
     *
     * @return a promise that will resolve to true if the tile should be discarded.
     */
    DiscardMissingTileImagePolicy.prototype.shouldDiscardImage = function(image) {
        var pixelsToCheck = this._pixelsToCheck;
        return when.all([this._missingImagePixels, image], function(values) {
            var missingImagePixels = values[0];
            var image = values[1];
            var pixels = getImagePixels(image);
            var width = image.width;

            for ( var i = 0, len = pixelsToCheck.length; i < len; i++) {
                var pos = pixelsToCheck[i];
                var index = pos.x * 4 + pos.y * width;
                for ( var offset = 0; offset < 4; offset++) {
                    var pixel = index + offset;
                    if (pixels[pixel] !== missingImagePixels[pixel]) {
                        return false;
                    }
                }
            }
            return true;
        });
    };

    return DiscardMissingTileImagePolicy;
});