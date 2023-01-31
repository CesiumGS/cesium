/**
 * A {@link TileDiscardPolicy} specifying that tile images should never be discard.
 *
 * @alias NeverTileDiscardPolicy
 * @constructor
 *
 * @see DiscardMissingTileImagePolicy
 */
function NeverTileDiscardPolicy(options) {}

/**
 * Determines if the discard policy is ready to process images.
 * @returns {Boolean} True if the discard policy is ready to process images; otherwise, false.
 */
NeverTileDiscardPolicy.prototype.isReady = function () {
  return true;
};

/**
 * Given a tile image, decide whether to discard that image.
 *
 * @param {HTMLImageElement} image An image to test.
 * @returns {Boolean} True if the image should be discarded; otherwise, false.
 */
NeverTileDiscardPolicy.prototype.shouldDiscardImage = function (image) {
  return false;
};
export default NeverTileDiscardPolicy;
