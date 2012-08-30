/*global define*/
define([
        '../Core/defaultValue',
        '../Core/loadImage',
        '../Core/getImagePixels',
        '../Core/DeveloperError',
        '../ThirdParty/when'
    ], function(
        defaultValue,
        loadImage,
        getImagePixels,
        DeveloperError,
        when) {
    "use strict";

    /**
     * A policy for discarding tile images that match a known image containing a
     * "missing" image.
     *
     * @alias DiscardMissingTileImagePolicy
     * @constructor
     *
     * @param {String} description.missingImageUrl The URL of the known missing image.
     * @param {Array} description.pixelsToCheck An array of Cartesian2 pixel positions to
     *        compare against the missing image.
     * @param {Boolean} [description.disableCheckIfAllPixelsAreTransparent] If true, the discard check will be disabled
     *                  if all of the pixelsToCheck in the missingImageUrl have an alpha value of 0.  If false, the
     *                  discard check will proceed no matter the values of the pixelsToCheck.
     */
    var DiscardMissingTileImagePolicy = function(description) {
        description = defaultValue(description, {});

        if (typeof description.missingImageUrl === 'undefined') {
            throw new DeveloperError('description.missingImageUrl is required.');
        }

        if (typeof description.pixelsToCheck === 'undefined') {
            throw new DeveloperError('description.pixelsToCheck is required.');
        }

        this._pixelsToCheck = description.pixelsToCheck;

        this._missingImagePixels = when(loadImage(description.missingImageUrl), function(image) {
            var pixels = getImagePixels(image);

            if (description.disableCheckIfAllPixelsAreTransparent) {
                var allAreTransparent = true;
                var width = image.width;

                var pixelsToCheck = description.pixelsToCheck;
                for (var i = 0, len = pixelsToCheck.length; allAreTransparent && i < len; ++i) {
                    var pos = pixelsToCheck[i];
                    var index = pos.x * 4 + pos.y * width;
                    var alpha = pixels[index + 3];

                    if (alpha > 0) {
                        allAreTransparent = false;
                    }
                }

                if (allAreTransparent) {
                    pixels = undefined;
                }
            }

            return pixels;
        });
    };

    /**
     * Given a tile image, decide whether to discard that image.
     *
     * @param {Image|Promise} image An image, or a promise that will resolve to an image.
     *
     * @returns A promise that will resolve to true if the tile should be discarded.
     */
    DiscardMissingTileImagePolicy.prototype.shouldDiscardImage = function(image) {
        var pixelsToCheck = this._pixelsToCheck;
        return when.all([this._missingImagePixels, image], function(values) {
            var missingImagePixels = values[0];
            var image = values[1];

            // If missingImagePixels is undefined, it indicates that the discard check has been disabled.
            if (typeof missingImagePixels === 'undefined') {
                return false;
            }

            var pixels = getImagePixels(image);
            var width = image.width;

            for (var i = 0, len = pixelsToCheck.length; i < len; ++i) {
                var pos = pixelsToCheck[i];
                var index = pos.x * 4 + pos.y * width;
                for (var offset = 0; offset < 4; ++offset) {
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