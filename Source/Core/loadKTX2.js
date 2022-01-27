import Check from "./Check.js";
import Resource from "./Resource.js";
import KTX2Transcoder from "./KTX2Transcoder.js";
import when from "../ThirdParty/when.js";

/**
 * Stores the supported formats that KTX2 can transcode to. Called during context creation.
 *
 * @param {Boolean} s3tc Whether or not S3TC is supported
 * @param {Boolean} pvrtc Whether or not PVRTC is supported
 * @param {Boolean} astc Whether or not ASTC is supported
 * @param {Boolean} etc Whether or not ETC is supported
 * @param {Boolean} etc1 Whether or not ETC1 is supported
 * @param {Boolean} bc7 Whether or not BC7 is supported
 * @private
 */
let supportedTranscoderFormats;

loadKTX2.setKTX2SupportedFormats = function (
  s3tc,
  pvrtc,
  astc,
  etc,
  etc1,
  bc7
) {
  supportedTranscoderFormats = {
    s3tc: s3tc,
    pvrtc: pvrtc,
    astc: astc,
    etc: etc,
    etc1: etc1,
    bc7: bc7,
  };
};

/**
 * Asynchronously loads and parses the given URL to a KTX2 file or parses the raw binary data of a KTX2 file.
 * Returns a promise that will resolve to an object containing the image buffer, width, height, and format once loaded,
 * or reject if the URL failed to load or failed to parse the data. The data is loaded
 * using XMLHttpRequest, which means that in order to make requests to another origin,
 * the server must have Cross-Origin Resource sharing (CORS) headers enabled.
 * <p>
 * The following are part of the KTX2 format specification but are not supported:
 * <ul>
 *     <li>Metadata</li>
 *     <li>3D textures</li>
 *     <li>Texture Arrays</li>
 *     <li>Video</li>
 * </ul>
 * </p>
 *
 * @function loadKTX2
 *
 * @param {Resource|String|ArrayBuffer} resourceOrUrlOrBuffer The URL of the binary data or an ArrayBuffer.
 * @returns {Promise.<CompressedTextureBuffer>|undefined} A promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
 *
 * @exception {RuntimeError} Invalid KTX2 file.
 * @exception {RuntimeError} KTX2 texture arrays are not supported.
 * @exception {RuntimeError} KTX2 3D textures are unsupported.
 * @exception {RuntimeError} No transcoding format target available for ETC1S compressed ktx2s.
 * @exception {RuntimeError} No transcoding format target available for UASTC compressed ktx2s.
 * @exception {RuntimeError} startTranscoding() failed.
 * @exception {RuntimeError} transcodeImage() failed.
 *
 * @example
 * // load a single URL asynchronously
 * Cesium.loadKTX2('some/url').then(function (ktx2Data) {
 *     var width = ktx2Data.width;
 *     var height = ktx2Data.height;
 *     var format = ktx2Data.internalFormat;
 *     var arrayBufferView = ktx2Data.bufferView;
 *     // use the data to create a texture
 * }).otherwise(function (error) {
 *     // an error occurred.
 * });
 *
 * @see {@link https://github.com/KhronosGroup/KTX-Specification|KTX file format}
 * @see {@link http://www.w3.org/TR/cors/|Cross-Origin Resource Sharing}
 * @see {@link http://wiki.commonjs.org/wiki/Promises/A|CommonJS Promises/A}
 * @private
 */
function loadKTX2(resourceOrUrlOrBuffer) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("resourceOrUrlOrBuffer", resourceOrUrlOrBuffer);
  //>>includeEnd('debug');

  let loadPromise;
  if (
    resourceOrUrlOrBuffer instanceof ArrayBuffer ||
    ArrayBuffer.isView(resourceOrUrlOrBuffer)
  ) {
    loadPromise = when.resolve(resourceOrUrlOrBuffer);
  } else {
    const resource = Resource.createIfNeeded(resourceOrUrlOrBuffer);
    loadPromise = resource.fetchArrayBuffer();
  }

  // load module then return
  return loadPromise.then(function (data) {
    return KTX2Transcoder.transcode(data, supportedTranscoderFormats);
  });
}

export default loadKTX2;
