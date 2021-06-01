import when from "../ThirdParty/when.js";
import CompressedTextureBuffer from "./CompressedTextureBuffer.js";
import defined from "./defined.js";
import DeveloperError from "./DeveloperError.js";
import Resource from "./Resource.js";
import TaskProcessor from "./TaskProcessor.js";
import deprecationWarning from "./deprecationWarning.js";

var transcodeTaskProcessor = new TaskProcessor("transcodeCRNToDXT");

/**
 * Asynchronously loads and parses the given URL to a CRN file or parses the raw binary data of a CRN file.
 * Returns a promise that will resolve to an object containing the image buffer, width, height and format once loaded,
 * or reject if the URL failed to load or failed to parse the data.  The data is loaded
 * using XMLHttpRequest, which means that in order to make requests to another origin,
 * the server must have Cross-Origin Resource Sharing (CORS) headers enabled.
 *
 * @function loadCRN
 *
 * @param {Resource|String|ArrayBuffer} resourceOrUrlOrBuffer The URL of the binary data or an ArrayBuffer.
 * @returns {Promise.<CompressedTextureBuffer>|undefined} A promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
 *
 * @exception {RuntimeError} Unsupported compressed format.
 *
 * @example
 * // load a single URL asynchronously
 * Cesium.loadCRN('some/url').then(function(textureData) {
 *     var width = textureData.width;
 *     var height = textureData.height;
 *     var format = textureData.internalFormat;
 *     var arrayBufferView = textureData.bufferView;
 *     // use the data to create a texture
 * }).otherwise(function(error) {
 *     // an error occurred
 * });
 *
 * @see {@link https://github.com/BinomialLLC/crunch|crunch DXTc texture compression and transcoding library}
 * @see {@link http://www.w3.org/TR/cors/|Cross-Origin Resource Sharing}
 * @see {@link http://wiki.commonjs.org/wiki/Promises/A|CommonJS Promises/A}
 * @deprecated This function has been deprecated and will be removed in CesiumJS 1.83.
 */
function loadCRN(resourceOrUrlOrBuffer) {
  deprecationWarning(
    "loadCRN",
    "loadCRN is deprecated and will be removed in CesiumJS 1.83."
  );
  //>>includeStart('debug', pragmas.debug);
  if (!defined(resourceOrUrlOrBuffer)) {
    throw new DeveloperError("resourceOrUrlOrBuffer is required.");
  }
  //>>includeEnd('debug');

  var loadPromise;
  if (
    resourceOrUrlOrBuffer instanceof ArrayBuffer ||
    ArrayBuffer.isView(resourceOrUrlOrBuffer)
  ) {
    loadPromise = when.resolve(resourceOrUrlOrBuffer);
  } else {
    var resource = Resource.createIfNeeded(resourceOrUrlOrBuffer);
    loadPromise = resource.fetchArrayBuffer();
  }

  if (!defined(loadPromise)) {
    return undefined;
  }

  return loadPromise
    .then(function (data) {
      if (!defined(data)) {
        return;
      }
      var transferrableObjects = [];
      if (data instanceof ArrayBuffer) {
        transferrableObjects.push(data);
      } else if (
        data.byteOffset === 0 &&
        data.byteLength === data.buffer.byteLength
      ) {
        transferrableObjects.push(data.buffer);
      } else {
        // data is a view of an array buffer. need to copy so it is transferrable to web worker
        data = data.slice(0, data.length);
        transferrableObjects.push(data.buffer);
      }

      return transcodeTaskProcessor.scheduleTask(data, transferrableObjects);
    })
    .then(function (compressedTextureBuffer) {
      return CompressedTextureBuffer.clone(compressedTextureBuffer);
    });
}
export default loadCRN;
