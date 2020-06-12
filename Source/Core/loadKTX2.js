import when from "../ThirdParty/when.js";
import Check from "./Check.js";
import CompressedTextureBuffer from "./CompressedTextureBuffer.js";
import defined from "./defined.js";
import PixelFormat from "./PixelFormat.js";
import Resource from "./Resource.js";
import RuntimeError from "./RuntimeError.js";
import VulkanConstants from "./VulkanConstants.js";
import MSC_TRANSCODER from "../ThirdParty/msc_basis_transcoder.js";

/**
 * Asynchronously loads and parses the given URL to a KTX file or parses the raw binary data of a KTX file.
 * Returns a promise that will resolve to an object containing the image buffer, width, height and format once loaded,
 * or reject if the URL failed to load or failed to parse the data.  The data is loaded
 * using XMLHttpRequest, which means that in order to make requests to another origin,
 * the server must have Cross-Origin Resource Sharing (CORS) headers enabled.
 * <p>
 * The following are part of the KTX format specification but are not supported:
 * <ul>
 *     <li>Metadata</li>
 *     <li>3D textures</li>
 *     <li>Texture Arrays</li>
 *     <li>Cubemaps</li>
 *     <li>Mipmaps</li>
 * </ul>
 * </p>
 *
 * @exports loadKTX2
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
 * Cesium.loadKTX2('some/url').then(function(ktxData) {
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

var transcoderModule;
var transcoderPromise;
function loadKTX2(resourceOrUrlOrBuffer, supportedFormats) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("resourceOrUrlOrBuffer", resourceOrUrlOrBuffer);
  //>>includeEnd('debug');

  if (!defined(transcoderModule) && !defined(transcoderPromise)) {
    var deferred = when.defer();
    transcoderPromise = deferred.promise;
    // MSC_TRANSCODER is defined in the transcoder js file, es-lint is wrong here
    // eslint-disable-next-line new-cap
    MSC_TRANSCODER().then(function (basisModule) {
      transcoderModule = basisModule;
      deferred.resolve();
    });
  }

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

  // load module then return
  return transcoderPromise.then(function () {
    return loadPromise
      .then(function (data) {
        console.log("data resource loaded");
        if (defined(data)) {
          try {
            return parseKTX2(data, supportedFormats);
          } catch (e) {
            console.log("KTX2 Parsing Error:");
            console.log(e);
          }
        }
      })
      .otherwise(function (error) {
        console.log("KTX2 Resource Fetching Error:");
        console.log(error);
      });
  });
}

var fileIdentifier = [
  0xab, // '«'
  0x4b, // 'K'
  0x54, // 'T'
  0x58, // 'X'
  0x20, // ' '
  0x32, // '2'
  0x30, // '0'
  0xbb, // '»'
  0x0d, // '\r'
  0x0a, // '\n'
  0x1a, // '\x1A'
  0x0a, // '\n'
];

var faceOrder = [
  "positiveX",
  "negativeX",
  "positiveY",
  "negativeY",
  "positiveZ",
  "negativeZ",
];

// For iteration
var sizeOfUint16 = 2;
var sizeOfUint32 = 4;
var sizeOfUint64 = 8;

// Flags
var isETC1SMask = 0x01;
var hasAlphaSlicesMask = 0x04;

// Needed to support Int64 parsing, taken from: https://stackoverflow.com/a/53107482/5420846
function getUint64(view, byteOffset, littleEndian) {
  // split 64-bit number into two 32-bit parts
  var left = view.getUint32(byteOffset, littleEndian);
  var right = view.getUint32(byteOffset + 4, littleEndian);

  // combine the two 32-bit values
  var combined = littleEndian
    ? left + Math.pow(2, 32) * right
    : Math.pow(2, 32) * left + right;

  if (!Number.isSafeInteger(combined)) {
    console.warn(combined, "exceeds MAX_SAFE_INTEGER. Precision may be lost");
  }

  return combined;
}

function parseKTX2(data, supportedFormats) {
  var byteBuffer = new Uint8Array(data);

  var isKTX2 = true;
  var i;
  for (i = 0; i < fileIdentifier.length; ++i) {
    if (fileIdentifier[i] !== byteBuffer[i]) {
      isKTX2 = false;
      break;
    }
  }

  if (!isKTX2) {
    throw new RuntimeError("Invalid KTX2 file.");
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

  // Header
  var header = {
    vkFormat: view.getUint32(byteOffset, true),
    typeSize: view.getUint32((byteOffset += sizeOfUint32), true),
    pixelWidth: view.getUint32((byteOffset += sizeOfUint32), true),
    pixelHeight: view.getUint32((byteOffset += sizeOfUint32), true),
    pixelDepth: view.getUint32((byteOffset += sizeOfUint32), true),
    layerCount: view.getUint32((byteOffset += sizeOfUint32), true),
    faceCount: view.getUint32((byteOffset += sizeOfUint32), true),
    levelCount: view.getUint32((byteOffset += sizeOfUint32), true),
    supercompressionScheme: view.getUint32((byteOffset += sizeOfUint32), true),
  };
  byteOffset += sizeOfUint32;

  // Index
  // var dfdByteOffset = view.getUint32(byteOffset, true);
  byteOffset += sizeOfUint32;
  // var dfdByteLength = view.getUint32(byteOffset, true);
  byteOffset += sizeOfUint32;
  // var kvdByteOffset = view.getUint32(byteOffset, true);
  byteOffset += sizeOfUint32;
  // var kvdByteLength = view.getUint32(byteOffset, true);
  byteOffset += sizeOfUint32;
  var sgdByteOffset = getUint64(view, byteOffset, true);
  byteOffset += sizeOfUint64;
  var sgdByteLength = getUint64(view, byteOffset, true);
  byteOffset += sizeOfUint64;
  var sgdIndex = {
    byteOffset: sgdByteOffset,
    byteLength: sgdByteLength,
  };

  // Level Index
  var levelIndex = [];
  for (var l = 0; l < header.levelCount; l++) {
    var levelByteOffset = getUint64(view, byteOffset, true);
    byteOffset += sizeOfUint64;
    var levelByteLength = getUint64(view, byteOffset, true);
    byteOffset += sizeOfUint64;
    var levelUncompressedByteLength = getUint64(view, byteOffset, true);
    byteOffset += sizeOfUint64;

    levelIndex.push({
      byteOffset: levelByteOffset,
      byteLength: levelByteLength,
      uncompressedByteLength: levelUncompressedByteLength,
    });
  }

  // Get Texture Based on Format
  var result = new Array(header.levelCount);
  if (header.vkFormat === VulkanConstants.VK_FORMAT_R8G8B8_SRGB) {
    //RGB8
    parseRGB8(data, header, levelIndex, result);
  } else if (header.vkFormat === 0x0) {
    // Compressed, initialize transcoder module
    var BasisTranscoder = transcoderModule.BasisTranscoder;
    BasisTranscoder.init();
    var transcoder = new BasisTranscoder();
    parseCompressed(
      data,
      view,
      header,
      levelIndex,
      sgdIndex,
      transcoder,
      supportedFormats,
      result
    );
  } else {
    throw new RuntimeError("KTX2 pixel format is not yet supported.");
  }

  if (header.layerCount !== 0) {
    throw new RuntimeError("KTX2 Videos are not supported");
  }

  if (header.pixelDepth !== 0) {
    throw new RuntimeError("KTX2 3D textures are unsupported.");
  }

  // Cleaning up parsed result if it's a single image
  if (header.faceCount === 1) {
    for (i = 0; i < header.levelCount; ++i) {
      result[i] = result[i][faceOrder[0]];
    }
  }
  if (header.levelCount === 1) {
    result = result[0];
  }

  return result;
}

// Parser for RGB8 images (uncompressed)
function parseRGB8(data, header, levelIndex, result) {
  var internalFormat = PixelFormat.RGB;

  for (var i = 0; i < levelIndex.length; ++i) {
    var level = (result[i] = {});
    var levelInfo = levelIndex[i];

    for (var j = 0; j < header.faceCount; ++j) {
      var width = header.pixelWidth >> i;
      var height = header.pixelWidth >> i;
      var levelLength = levelInfo.byteLength;
      var levelOffset = levelInfo.byteOffset;

      var levelBuffer;
      if (defined(data.buffer)) {
        levelBuffer = new Uint8Array(data.buffer, levelOffset, levelLength);
      } else {
        levelBuffer = new Uint8Array(data, levelOffset, levelLength);
      }

      level[faceOrder[j]] = new CompressedTextureBuffer(
        internalFormat,
        width,
        height,
        levelBuffer
      );
    }
  }
}

function parseCompressed(
  data,
  view,
  header,
  levelIndex,
  sgdIndex,
  transcoder,
  supportedFormats,
  result
) {
  var byteOffset = sgdIndex.byteOffset;

  var globalFlags = view.getUint32(byteOffset, true);
  byteOffset += sizeOfUint32;
  var isETC1s = globalFlags & isETC1SMask;
  var hasAlphaSlices = globalFlags & hasAlphaSlicesMask;
  var isVideo = header.layerCount !== 0; // Should be false until video support is added

  if (!isETC1s) {
    throw new RuntimeError("UASTC Basis Encoding not yet supported");
  }

  // Read rest of SGD data
  var endpointCount = view.getUint16(byteOffset, true);
  byteOffset += sizeOfUint16;
  var selectorCount = view.getUint16(byteOffset, true);
  byteOffset += sizeOfUint16;
  var endpointsByteLength = view.getUint32(byteOffset, true);
  byteOffset += sizeOfUint32;
  var selectorsByteLength = view.getUint32(byteOffset, true);
  byteOffset += sizeOfUint32;
  var tablesByteLength = view.getUint32(byteOffset, true);
  byteOffset += sizeOfUint32;
  var extendedByteLength = view.getUint32(byteOffset, true);
  byteOffset += sizeOfUint32;

  var imageDescs = [];
  for (var imDescs = 0; imDescs < header.levelCount; ++imDescs) {
    imageDescs.push({
      imageFlags: view.getUint32(byteOffset, true),
      rgbSliceByteOffset: view.getUint32((byteOffset += sizeOfUint32), true),
      rgbSliceByteLength: view.getUint32((byteOffset += sizeOfUint32), true),
      alphaSliceByteOffset: view.getUint32((byteOffset += sizeOfUint32), true),
      alphaSliceByteLength: view.getUint32((byteOffset += sizeOfUint32), true),
    });
  }
  byteOffset += sizeOfUint32;

  // Determine target format based on platform support
  var internalFormat, transcoderFormat;
  var TranscodeTarget = transcoderModule.TranscodeTarget;
  if (supportedFormats.etc1 && !hasAlphaSlices) {
    internalFormat = PixelFormat.RGB_ETC1;
    transcoderFormat = TranscodeTarget.ETC1_RGB;
  } else if (supportedFormats.s3tc) {
    internalFormat = hasAlphaSlices
      ? PixelFormat.RGBA_DXT1
      : PixelFormat.RGB_DXT1;
    transcoderFormat = hasAlphaSlices
      ? TranscodeTarget.BC3_RGBA
      : TranscodeTarget.BC1_RGB;
  } else if (supportedFormats.pvrtc) {
    internalFormat = hasAlphaSlices
      ? PixelFormat.RGBA_PVRTC_4BPPV1
      : PixelFormat.RGB_PVRTC_4BPPV1;
    transcoderFormat = hasAlphaSlices
      ? TranscodeTarget.PVRTC1_4_RGBA
      : TranscodeTarget.PVRTC1_4_RGB;
  } else {
    throw new RuntimeError("No transcoding format target available");
  }

  var endpoints = new Uint8Array(data, byteOffset, endpointsByteLength);
  byteOffset += endpointsByteLength;
  var selectors = new Uint8Array(data, byteOffset, selectorsByteLength);
  byteOffset += selectorsByteLength;
  transcoder.decodePalettes(endpointCount, endpoints, selectorCount, selectors);

  var tables = new Uint8Array(data, byteOffset, tablesByteLength);
  byteOffset += tablesByteLength;
  // var extendedByte = new Uint8Array(data, byteOffset, extendedByteLength);
  byteOffset += extendedByteLength;
  transcoder.decodeTables(tables);

  for (var i = 0; i < levelIndex.length; ++i) {
    var level = (result[i] = {});
    var levelInfo = levelIndex[i];
    var imageInfo = imageDescs[i];

    // BasisU blocks are 4x4: https://github.com/BinomialLLC/basis_universal/wiki/.basis-File-Format-and-ETC1S-Texture-Video-Specification
    var blockWidth = 4;
    var blockHeight = 4;

    // NumBlocks formula: http://github.khronos.org/KTX-Specification/#_supercompression_global_data
    var numBlocksX = Math.ceil(header.pixelWidth / blockWidth);
    var numBlocksY = Math.max(1, Math.ceil(header.pixelHeight / blockHeight));

    for (var j = 0; j < header.faceCount; ++j) {
      var width = header.pixelWidth >> i;
      var height = header.pixelWidth >> i;
      var levelOffset = levelInfo.byteOffset;

      var transcoded;
      var rgbData;
      var alphaData;
      if (defined(data.buffer)) {
        rgbData = new Uint8Array(
          data.buffer,
          levelOffset + imageInfo.rgbSliceByteOffset,
          imageInfo.rgbSliceByteLength
        );
        alphaData = new Uint8Array(
          data.buffer,
          levelOffset + imageInfo.alphaSliceByteOffset,
          imageInfo.alphaSliceByteLength
        );
      } else {
        rgbData = new Uint8Array(
          data,
          levelOffset + imageInfo.rgbSliceByteOffset,
          imageInfo.rgbSliceByteLength
        );
        alphaData = new Uint8Array(
          data,
          levelOffset + imageInfo.alphaSliceByteOffset,
          imageInfo.alphaSliceByteLength
        );
      }

      transcoded = transcoder.transcodeImage(
        imageInfo.imageFlags,
        rgbData,
        alphaData,
        transcoderFormat,
        i,
        width,
        height,
        numBlocksX,
        numBlocksY,
        isVideo,
        false
      );

      // Check Error Here
      if (transcoded.error) {
        throw new RuntimeError("Error transcoding Image");
      }

      // Create a copy and delete transcoder wasm allocated memory
      var levelBuffer = transcoded.transcodedImage
        .get_typed_memory_view()
        .slice();
      transcoded.transcodedImage.delete();

      level[faceOrder[j]] = new CompressedTextureBuffer(
        internalFormat,
        width,
        height,
        levelBuffer
      );
    }
  }
}

export default loadKTX2;
