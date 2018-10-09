define([], function() {
    'use strict';

    /**
         * A {@link TileDiscardPolicy} specifying that tile images should never be discard.
         *
         * @alias NeverTileDiscardPolicy
         * @constructor
         *
         * @see DiscardMissingTileImagePolicy
         */
    class NeverTileDiscardPolicy {
        constructor(options) {
        }
        /**
             * Determines if the discard policy is ready to process images.
             * @returns {Boolean} True if the discard policy is ready to process images; otherwise, false.
             */
        isReady() {
            return true;
        }
        /**
             * Given a tile image, decide whether to discard that image.
             *
             * @param {Image} image An image to test.
             * @returns {Boolean} True if the image should be discarded; otherwise, false.
             */
        shouldDiscardImage(image) {
            return false;
        }
    }



    return NeverTileDiscardPolicy;
});
