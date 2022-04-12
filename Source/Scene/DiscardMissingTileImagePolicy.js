import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import getImagePixels from "../Core/getImagePixels.js";
import Resource from "../Core/Resource.js";

/**
 * A policy for discarding tile images that match a known image containing a
 * "missing" image.
 *
 * @alias DiscardMissingTileImagePolicy
 * @constructor
 *
 * @param {Object} options Object with the following properties:
 * @param {Resource|String} options.missingImageUrl The URL of the known missing image.
 * @param {Cartesian2[]} options.pixelsToCheck An array of {@link Cartesian2} pixel positions to
 *        compare against the missing image.
 * @param {Boolean} [options.disableCheckIfAllPixelsAreTransparent=false] If true, the discard check will be disabled
 *                  if all of the pixelsToCheck in the missingImageUrl have an alpha value of 0.  If false, the
 *                  discard check will proceed no matter the values of the pixelsToCheck.
 */
function DiscardMissingTileImagePolicy(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  //>>includeStart('debug', pragmas.debug);
  if (!defined(options.missingImageUrl)) {
    throw new DeveloperError("options.missingImageUrl is required.");
  }

  if (!defined(options.pixelsToCheck)) {
    throw new DeveloperError("options.pixelsToCheck is required.");
  }
  //>>includeEnd('debug');

  this._pixelsToCheck = options.pixelsToCheck;
  this._missingImagePixels = undefined;
  this._missingImageByteLength = undefined;
  this._isReady = false;

  const resource = Resource.createIfNeeded(options.missingImageUrl);

  const that = this;

  function success(image) {
    if (defined(image.blob)) {
      that._missingImageByteLength = image.blob.size;
    }

    let pixels = getImagePixels(image);

    if (options.disableCheckIfAllPixelsAreTransparent) {
      let allAreTransparent = true;
      const width = image.width;

      const pixelsToCheck = options.pixelsToCheck;
      for (
        let i = 0, len = pixelsToCheck.length;
        allAreTransparent && i < len;
        ++i
      ) {
        const pos = pixelsToCheck[i];
        const index = pos.x * 4 + pos.y * width;
        const alpha = pixels[index + 3];

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

  resource
    .fetchImage({
      preferBlob: true,
      preferImageBitmap: true,
      flipY: true,
    })
    .then(success)
    .catch(failure);
}

/**
 * Determines if the discard policy is ready to process images.
 * @returns {Boolean} True if the discard policy is ready to process images; otherwise, false.
 */
DiscardMissingTileImagePolicy.prototype.isReady = function () {
  return this._isReady;
};

/**
 * Given a tile image, decide whether to discard that image.
 *
 * @param {HTMLImageElement} image An image to test.
 * @returns {Boolean} True if the image should be discarded; otherwise, false.
 *
 * @exception {DeveloperError} <code>shouldDiscardImage</code> must not be called before the discard policy is ready.
 */
DiscardMissingTileImagePolicy.prototype.shouldDiscardImage = function (image) {
  //>>includeStart('debug', pragmas.debug);
  if (!this._isReady) {
    throw new DeveloperError(
      "shouldDiscardImage must not be called before the discard policy is ready."
    );
  }
  //>>includeEnd('debug');

  const pixelsToCheck = this._pixelsToCheck;
  const missingImagePixels = this._missingImagePixels;

  // If missingImagePixels is undefined, it indicates that the discard check has been disabled.
  if (!defined(missingImagePixels)) {
    return false;
  }

  if (defined(image.blob) && image.blob.size !== this._missingImageByteLength) {
    return false;
  }

  const pixels = getImagePixels(image);
  const width = image.width;

  for (let i = 0, len = pixelsToCheck.length; i < len; ++i) {
    const pos = pixelsToCheck[i];
    const index = pos.x * 4 + pos.y * width;
    for (let offset = 0; offset < 4; ++offset) {
      const pixel = index + offset;
      if (pixels[pixel] !== missingImagePixels[pixel]) {
        return false;
      }
    }
  }
  return true;
};
export default DiscardMissingTileImagePolicy;
