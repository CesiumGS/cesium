import Check from "./Check.js";
import defined from "./defined.js";
import Resource from "./Resource.js";

/**
 * @private
 */
function loadImageFromTypedArray(options) {
  const uint8Array = options.uint8Array;
  const format = options.format;
  const request = options.request;
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
