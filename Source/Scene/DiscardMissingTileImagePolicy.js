/*global define*/
define([
        '../Core/loadImage',
        '../ThirdParty/when'
    ], function(
        loadImage,
        when) {
    "use strict";

    function imageToPixels(image, canvas) {
        if (typeof canvas === 'undefined') {
            canvas = document.createElement('canvas');
        }

        var width = image.width;
        var height = image.height;
        canvas.width = width;
        canvas.height = height;

        var context = canvas.getContext('2d');
        context.drawImage(image, 0, 0);

        return context.getImageData(0, 0, width, height).data;
    }

    /**
     * A policy for discarding tile images that match a known image containing a
     * "missing" icon.
     *
     * @param {String} missingImageUrl The URL of the known missing image.
     * @param {Array} pixelsToCheck An array of Cartesian2 pixel positions to compare against the missing image.
     */
    function DiscardMissingTileImagePolicy(missingImageUrl, pixelsToCheck) {
        this._missingImagePixels = when(loadImage(missingImageUrl), imageToPixels);
        this._pixelsToCheck = pixelsToCheck;
        this._canvas = document.createElement('canvas');
    }

    /**
     * Given a tile image, decide whether to discard that image.  This policy
     * compares the image to the known "missing" image.
     *
     * @param image an image, or a promise that will resolve to an image.
     *
     * @return a promise that will resolve to true if the tile should be discarded.
     */
    DiscardMissingTileImagePolicy.prototype.shouldDiscardTileImage = function(image) {
        var canvas = this._canvas;
        var pixelsToCheck = this._pixelsToCheck;
        return when.all([this._missingImagePixels, image], function(values) {
            var missingImagePixels = values[0];
            var image = values[1];
            var pixels = imageToPixels(image, canvas);
            var width = image.width;

            for ( var i = 0, len = pixelsToCheck.length; i < len; i++) {
                var pos = pixelsToCheck[i];
                var index = pos.x * 4 + pos.y * width;
                for ( var offset = 0; offset < 4; offset++) {
                    if (pixels[index + offset] !== missingImagePixels[index + offset]) {
                        return false;
                    }
                }
            }
            return true;
        });
    };

    return DiscardMissingTileImagePolicy;
});