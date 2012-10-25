/*global define*/
define([
        '../Core/DeveloperError'
    ], function(
        DeveloperError) {
    "use strict";

    /**
     * A policy for discarding tile images according to some criteria.  This type describes an
     * interface and is not intended to be instantiated directly.
     *
     * @alias TileDiscardPolicy
     * @constructor
     *
     * @see DiscardMissingTileImagePolicy
     * @see NeverTileDiscardPolicy
     */
    var TileDiscardPolicy = function(description) {
        throw new DeveloperError('This type should not be instantiated directly.');
    };

    /**
     * Determines if the discard policy is ready to process images.
     * @returns {Boolean} True if the discard policy is ready to process images; otherwise, false.
     */
    TileDiscardPolicy.prototype.isReady = function() {
        throw new DeveloperError('This type should not be instantiated directly.');
    };

    /**
     * Given a tile image, decide whether to discard that image.
     *
     * @param {Image|Promise} image An image, or a promise that will resolve to an image.
     *
     * @returns {Boolean} A promise that will resolve to true if the tile should be discarded.
     */
    TileDiscardPolicy.prototype.shouldDiscardImage = function(image) {
        throw new DeveloperError('This type should not be instantiated directly.');
    };

    return TileDiscardPolicy;
});