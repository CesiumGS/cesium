define([
    '../Core/defined'
], function(
    defined) {
    /**
     * A policy for discarding tile images that contain no data (and so aren't actually images).
     *
     * @alias DiscardEmptyTileImagePolicy
     * @constructor
     *
     * @see DiscardMissingTileImagePolicy
     */
    function DiscardEmptyTileImagePolicy(options) {
    }

    /**
     * Determines if the discard policy is ready to process images.
     * @returns {Boolean} True if the discard policy is ready to process images; otherwise, false.
     */
    DiscardEmptyTileImagePolicy.prototype.isReady = function() {
        return true;
    };

    /**
     * Given a tile image, decide whether to discard that image.
     *
     * @param {Image} image An image to test.
     * @returns {Boolean} True if the image should be discarded; otherwise, false.
     */
    DiscardEmptyTileImagePolicy.prototype.shouldDiscardImage = function(image) {
        // If the image blob is non-existent, or its size is zero, then discard it
        return !defined(image.blob) || image.blob.size === 0;
    };

    return DiscardEmptyTileImagePolicy;
});
