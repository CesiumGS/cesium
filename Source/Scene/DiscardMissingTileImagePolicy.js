/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/DeveloperError',
        '../Core/getImagePixels',
        '../Core/loadImageViaBlob',
        '../ThirdParty/when'
    ], function(
        defaultValue,
        defined,
        DeveloperError,
        getImagePixels,
        loadImageViaBlob,
        when) {
    'use strict';

    /**
     * A policy for discarding tile images that match a known image containing a
     * "missing" image.
     *
     * @alias DiscardMissingTileImagePolicy
     * @constructor
     *
     * @param {Object} options Object with the following properties:
     * @param {String} options.missingImageUrl The URL of the known missing image.
     * @param {Cartesian2[]} options.pixelsToCheck An array of {@link Cartesian2} pixel positions to
     *        compare against the missing image.
     * @param {Boolean} [options.disableCheckIfAllPixelsAreTransparent=false] If true, the discard check will be disabled
     *                  if all of the pixelsToCheck in the missingImageUrl have an alpha value of 0.  If false, the
     *                  discard check will proceed no matter the values of the pixelsToCheck.
     */
    function DiscardMissingTileImagePolicy(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        if (!defined(options.missingImageUrl)) {
            throw new DeveloperError('options.missingImageUrl is required.');
        }

        if (!defined(options.pixelsToCheck)) {
            throw new DeveloperError('options.pixelsToCheck is required.');
        }

        this._pixelsToCheck = options.pixelsToCheck;
        this._missingImagePixels = undefined;
        this._missingImageByteLength = undefined;
        this._isReady = false;

        var that = this;

        function success(image) {
            if (defined(image.blob)) {
                that._missingImageByteLength = image.blob.size;
            }

            var pixels = getImagePixels(image);

            if (options.disableCheckIfAllPixelsAreTransparent) {
                var allAreTransparent = true;
                var width = image.width;

                var pixelsToCheck = options.pixelsToCheck;
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

            that._missingImagePixels = pixels;
            that._isReady = true;
        }

        function failure() {
            // Failed to download "missing" image, so assume that any truly missing tiles
            // will also fail to download and disable the discard check.
            that._missingImagePixels = undefined;
            that._isReady = true;
        }

        when(loadImageViaBlob(options.missingImageUrl), success, failure);
    }

    /**
     * Determines if the discard policy is ready to process images.
     * @returns {Boolean} True if the discard policy is ready to process images; otherwise, false.
     */
    DiscardMissingTileImagePolicy.prototype.isReady = function() {
        return this._isReady;
    };

    /**
     * Given a tile image, decide whether to discard that image.
     *
     * @param {Image} image An image to test.
     * @returns {Boolean} True if the image should be discarded; otherwise, false.
     *
     * @exception {DeveloperError} <code>shouldDiscardImage</code> must not be called before the discard policy is ready.
     */
    DiscardMissingTileImagePolicy.prototype.shouldDiscardImage = function(image) {
        if (!this._isReady) {
            throw new DeveloperError('shouldDiscardImage must not be called before the discard policy is ready.');
        }

        var pixelsToCheck = this._pixelsToCheck;
        var missingImagePixels = this._missingImagePixels;

        // If missingImagePixels is undefined, it indicates that the discard check has been disabled.
        if (!defined(missingImagePixels)) {
            return false;
        }

        if (defined(image.blob) && image.blob.size !== this._missingImageByteLength) {
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
    };

    return DiscardMissingTileImagePolicy;
});
