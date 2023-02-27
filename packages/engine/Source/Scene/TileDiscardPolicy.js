import DeveloperError from "../Core/DeveloperError.js";

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
function TileDiscardPolicy(options) {
  DeveloperError.throwInstantiationError();
}

/**
 * Determines if the discard policy is ready to process images.
 * @function
 *
 * @returns {boolean} True if the discard policy is ready to process images; otherwise, false.
 */
TileDiscardPolicy.prototype.isReady = DeveloperError.throwInstantiationError;

/**
 * Given a tile image, decide whether to discard that image.
 * @function
 *
 * @param {HTMLImageElement} image An image to test.
 * @returns {boolean} True if the image should be discarded; otherwise, false.
 */
TileDiscardPolicy.prototype.shouldDiscardImage =
  DeveloperError.throwInstantiationError;
export default TileDiscardPolicy;
