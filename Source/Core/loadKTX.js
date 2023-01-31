import when from "../ThirdParty/when.js";
import Check from "./Check.js";
import CompressedTextureBuffer from "./CompressedTextureBuffer.js";
import defined from "./defined.js";
import PixelFormat from "./PixelFormat.js";
import Resource from "./Resource.js";
import RuntimeError from "./RuntimeError.js";
import WebGLConstants from "./WebGLConstants.js";

/**
 * Asynchronously loads and parses the given URL to a KTX file or parses the raw binary data of a KTX file.
 * Returns a promise that will resolve to an object containing the image buffer, width, height and format once loaded,
 * or reject if the URL failed to load or failed to parse the data.  The data is loaded
 * using XMLHttpRequest, which means that in order to make requests to another origin,
 * the server must have Cross-Origin Resource Sharing (CORS) headers enabled.
 * <p>
 * The following are part of the KTX format specification but are not supported:
 * <ul>
 *     <li>Big-endian files</li>
 *     <li>Metadata</li>
 *     <li>3D textures</li>
 *     <li>Texture Arrays</li>
 *     <li>Cubemaps</li>
 *     <li>Mipmaps</li>
 * </ul>
 * </p>
 *
 * @function loadKTX
 *
 * @param {Resource|String|ArrayBuffer} resourceOrUrlOrBuffer The URL of the binary data or an ArrayBuffer.
 * @returns {Promise.<CompressedTextureBuffer>|undefined} A promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
 *
 * @exception {RuntimeError} Invalid KTX file.
 * @exception {RuntimeError} File is the wrong endianness.
 * @exception {RuntimeError} glInternalFormat is not a valid format.
 * @exception {RuntimeError} glType must be zero when the texture is compressed.
 * @exception {RuntimeError} The type size for compressed textures must be 1.
 * @exception {RuntimeError} glFormat must be zero when the texture is compressed.
 * @exception {RuntimeError} Generating mipmaps for a compressed texture is unsupported.
 * @exception {RuntimeError} The base internal format must be the same as the format for uncompressed textures.
 * @exception {RuntimeError} 3D textures are not supported.
 * @exception {RuntimeError} Texture arrays are not supported.
 * @exception {RuntimeError} Cubemaps are not supported.
 *
 * @example
 * // load a single URL asynchronously
 * Cesium.loadKTX('some/url').then(function(ktxData) {
 *     var width = ktxData.width;
 *     var height = ktxData.height;
 *     var format = ktxData.internalFormat;
 *     var arrayBufferView = ktxData.bufferView;
 *     // use the data to create a texture
 * }).otherwise(function(error) {
 *     // an error occurred
 * });
 *
 * @see {@link https://www.khronos.org/opengles/sdk/tools/KTX/file_format_spec/|KTX file format}
 * @see {@link http://www.w3.org/TR/cors/|Cross-Origin Resource Sharing}
 * @see {@link http://wiki.commonjs.org/wiki/Promises/A|CommonJS Promises/A}
 */
function loadKTX(resourceOrUrlOrBuffer) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("resourceOrUrlOrBuffer", resourceOrUrlOrBuffer);
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

  return loadPromise.then(function (data) {
    if (defined(data)) {
      return parseKTX(data);
    }
  });
}

var fileIdentifier = [
  0xab,
  0x4b,
  0x54,
  0x58,
  0x20,
  0x31,
  0x31,
  0xbb,
  0x0d,
  0x0a,
  0x1a,
  0x0a,
];
var endiannessTest = 0x04030201;
var faceOrder = [
  "positiveX",
  "negativeX",
  "positiveY",
  "negativeY",
  "positiveZ",
  "negativeZ",
];

var sizeOfUint32 = 4;

function parseKTX(data) {
  var byteBuffer = new Uint8Array(data);

  var isKTX = true;
  var i;
  for (i = 0; i < fileIdentifier.length; ++i) {
    if (fileIdentifier[i] !== byteBuffer[i]) {
      isKTX = false;
      break;
    }
  }

  if (!isKTX) {
    throw new RuntimeError("Invalid KTX file.");
  }

  var view;
  var byteOffset;

  if (defined(data.buffer)) {
    view = new DataView(data.buffer);
    byteOffset = data.byteOffset;
  } else {
    view = new DataView(data);
    byteOffset = 0;
  }

  byteOffset += 12; // skip identifier

  var endianness = view.getUint32(byteOffset, true);
  byteOffset += sizeOfUint32;
  if (endianness !== endiannessTest) {
    throw new RuntimeError("File is the wrong endianness.");
  }

  var glType = view.getUint32(byteOffset, true);
  byteOffset += sizeOfUint32;
  var glTypeSize = view.getUint32(byteOffset, true);
  byteOffset += sizeOfUint32;
  var glFormat = view.getUint32(byteOffset, true);
  byteOffset += sizeOfUint32;
  var glInternalFormat = view.getUint32(byteOffset, true);
  byteOffset += sizeOfUint32;
  var glBaseInternalFormat = view.getUint32(byteOffset, true);
  byteOffset += sizeOfUint32;
  var pixelWidth = view.getUint32(byteOffset, true);
  byteOffset += sizeOfUint32;
  var pixelHeight = view.getUint32(byteOffset, true);
  byteOffset += sizeOfUint32;
  var pixelDepth = view.getUint32(byteOffset, true);
  byteOffset += sizeOfUint32;
  var numberOfArrayElements = view.getUint32(byteOffset, true);
  byteOffset += sizeOfUint32;
  var numberOfFaces = view.getUint32(byteOffset, true);
  byteOffset += sizeOfUint32;
  var numberOfMipmapLevels = view.getUint32(byteOffset, true);
  byteOffset += sizeOfUint32;
  var bytesOfKeyValueByteSize = view.getUint32(byteOffset, true);
  byteOffset += sizeOfUint32;

  // skip metadata
  byteOffset += bytesOfKeyValueByteSize;

  var imageSize = view.getUint32(byteOffset, true);
  byteOffset += sizeOfUint32;

  var texture;
  if (defined(data.buffer)) {
    texture = new Uint8Array(data.buffer, byteOffset, imageSize);
  } else {
    texture = new Uint8Array(data, byteOffset, imageSize);
  }

  // Some tools use a sized internal format.
  // See table 2: https://www.opengl.org/sdk/docs/man/html/glTexImage2D.xhtml
  if (glInternalFormat === WebGLConstants.RGB8) {
    glInternalFormat = PixelFormat.RGB;
  } else if (glInternalFormat === WebGLConstants.RGBA8) {
    glInternalFormat = PixelFormat.RGBA;
  }

  if (!PixelFormat.validate(glInternalFormat)) {
    throw new RuntimeError("glInternalFormat is not a valid format.");
  }

  if (PixelFormat.isCompressedFormat(glInternalFormat)) {
    if (glType !== 0) {
      throw new RuntimeError(
        "glType must be zero when the texture is compressed."
      );
    }
    if (glTypeSize !== 1) {
      throw new RuntimeError(
        "The type size for compressed textures must be 1."
      );
    }
    if (glFormat !== 0) {
      throw new RuntimeError(
        "glFormat must be zero when the texture is compressed."
      );
    }
  } else if (glType !== WebGLConstants.UNSIGNED_BYTE) {
    throw new RuntimeError("Only unsigned byte buffers are supported.");
  } else if (glBaseInternalFormat !== glFormat) {
    throw new RuntimeError(
      "The base internal format must be the same as the format for uncompressed textures."
    );
  }

  if (pixelDepth !== 0) {
    throw new RuntimeError("3D textures are unsupported.");
  }

  if (numberOfArrayElements !== 0) {
    throw new RuntimeError("Texture arrays are unsupported.");
  }

  var offset = texture.byteOffset;
  var mipmaps = new Array(numberOfMipmapLevels);
  for (i = 0; i < numberOfMipmapLevels; ++i) {
    var level = (mipmaps[i] = {});
    for (var j = 0; j < numberOfFaces; ++j) {
      var width = pixelWidth >> i;
      var height = pixelHeight >> i;
      var levelSize = PixelFormat.isCompressedFormat(glInternalFormat)
        ? PixelFormat.compressedTextureSizeInBytes(
            glInternalFormat,
            width,
            height
          )
        : PixelFormat.textureSizeInBytes(
            glInternalFormat,
            glType,
            width,
            height
          );
      var levelBuffer = new Uint8Array(texture.buffer, offset, levelSize);
      level[faceOrder[j]] = new CompressedTextureBuffer(
        glInternalFormat,
        width,
        height,
        levelBuffer
      );
      offset += levelSize;
    }
    offset += 3 - ((offset + 3) % 4) + 4;
  }

  var result = mipmaps;
  if (numberOfFaces === 1) {
    for (i = 0; i < numberOfMipmapLevels; ++i) {
      result[i] = result[i][faceOrder[0]];
    }
  }
  if (numberOfMipmapLevels === 1) {
    result = result[0];
  }

  return result;
}
export default loadKTX;
