import when from "../ThirdParty/when.js";
import Check from "./Check.js";
import defaultValue from "./defaultValue.js";
import defined from "./defined.js";
import Resource from "./Resource.js";

/**
 * @private
 */
function loadImageFromTypedArray(options) {
  var uint8Array = options.uint8Array;
  var format = options.format;
  var request = options.request;
  var flipY = defaultValue(options.flipY, false);
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("uint8Array", uint8Array);
  Check.typeOf.string("format", format);
  //>>includeEnd('debug');

  var blob = new Blob([uint8Array], {
    type: format,
  });

  var blobUrl;
  return Resource.supportsImageBitmapOptions()
    .then(function (result) {
      if (result) {
        return when(
          Resource.createImageBitmapFromBlob(blob, {
            flipY: flipY,
            premultiplyAlpha: false,
          })
        );
      }

      blobUrl = window.URL.createObjectURL(blob);
      var resource = new Resource({
        url: blobUrl,
        request: request,
      });

      return resource.fetchImage({
        flipY: flipY,
      });
    })
    .then(function (result) {
      if (defined(blobUrl)) {
        window.URL.revokeObjectURL(blobUrl);
      }
      return result;
    })
    .otherwise(function (error) {
      if (defined(blobUrl)) {
        window.URL.revokeObjectURL(blobUrl);
      }
      return when.reject(error);
    });
}
export default loadImageFromTypedArray;
