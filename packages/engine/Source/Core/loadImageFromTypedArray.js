import Check from "./Check.js";
import defined from "./defined.js";
import Resource from "./Resource.js";

/**
 * Loads an image from a typed array.
 * @param {Object} options An object containing the following properties:
 * @param {Uint8Array} options.uint8Array The typed array containing the image data.
 * @param {string} options.format The MIME format of the image (e.g., "image/png").
 * @param {Request} [options.request] The request object to use to fetch the image.
 * @param {boolean} [options.flipY=false] Whether to flip the image vertically.
 * @param {boolean} [options.skipColorSpaceConversion=false] Whether to skip color space conversion.
 * @returns {Promise<HTMLImageElement|HTMLCanvasElement|ImageBitmap>|undefined} A promise that resolves to the loaded image. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
 * @private
 */
function loadImageFromTypedArray(options) {
  const { uint8Array, format, request } = options;
  const flipY = options.flipY ?? false;
  const skipColorSpaceConversion = options.skipColorSpaceConversion ?? false;
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("uint8Array", uint8Array);
  Check.typeOf.string("format", format);
  //>>includeEnd('debug');

  const blob = new Blob([uint8Array], {
    type: format,
  });

  let blobUrl;
  return Resource.supportsImageBitmapOptions()
    .then(function (result) {
      if (result) {
        return Promise.resolve(
          Resource.createImageBitmapFromBlob(blob, {
            flipY: flipY,
            premultiplyAlpha: false,
            skipColorSpaceConversion: skipColorSpaceConversion,
          }),
        );
      }

      blobUrl = window.URL.createObjectURL(blob);
      const resource = new Resource({
        url: blobUrl,
        request: request,
      });

      return resource.fetchImage({
        flipY: flipY,
        skipColorSpaceConversion: skipColorSpaceConversion,
      });
    })
    .then(function (result) {
      if (defined(blobUrl)) {
        window.URL.revokeObjectURL(blobUrl);
      }
      return result;
    })
    .catch(function (error) {
      if (defined(blobUrl)) {
        window.URL.revokeObjectURL(blobUrl);
      }
      return Promise.reject(error);
    });
}
export default loadImageFromTypedArray;
