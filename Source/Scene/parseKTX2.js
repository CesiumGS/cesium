import defined from "../Core/defined.js";
import PixelFormat from "../Core/PixelFormat.js";
import RuntimeError from "../Core/RuntimeError.js";
import VulkanConstants from "../Core/VulkanConstants.js";
import WebGLConstants from "../Core/WebGLConstants.js";

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
var sizeOfUint8 = 1;
var sizeOfUint16 = 2;
var sizeOfUint32 = 4;
var sizeOfUint64 = 8;

// // Flags
var colorModelETC1S = 163;
var colorModelUASTC = 166;

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

/**
 * Parses and transcodes KTX2 buffers to an appropriate target format.
 *
 * @param {Uint8Array} data Data representing one KTX2 texture.
 * @param {Object} supportedTargetFormats Target formats available on the current system.
 * @param {Object} transcoderModule msc_basis_transcoder object.
 *
 * @private
 */
function parseKTX2(data, supportedTargetFormats, transcoderModule) {
  var byteBuffer = new Uint8Array(data);

  if (!defined(supportedTargetFormats)) {
    throw new RuntimeError(
      "KTX2 Loader does not know which GPU formats are supported."
    );
  }

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
  var dfdByteOffset = view.getUint32(byteOffset, true);
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

  // 2 -- Level Index
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

  // 3 -- Data Format Descriptors (DFD)
  // http://github.khronos.org/KTX-Specification/#_dfd_for_supercompressed_data
  byteOffset = defined(data.buffer)
    ? data.byteOffset + dfdByteOffset
    : dfdByteOffset;
  var dfd = {
    totalSize: view.getUint32(byteOffset, true),
    vendorId: view.getUint16((byteOffset += sizeOfUint32), true), // Should be reading 'UInt17', but it's zero anyway for KTX2
    descriptorType: view.getUint16((byteOffset += sizeOfUint16 + 1), true),
    versionNumber: view.getUint16((byteOffset += sizeOfUint16 - 1), true),
    descriptorBlockSize: view.getUint16((byteOffset += sizeOfUint16), true),
    colorModel: view.getUint8((byteOffset += sizeOfUint16), true),
    colorPrimaries: view.getUint8((byteOffset += sizeOfUint8), true),
    transferFunction: view.getUint8((byteOffset += sizeOfUint8), true),
    flags: view.getUint8((byteOffset += sizeOfUint8), true),
    texelBlockDimension: {
      x: view.getUint8((byteOffset += sizeOfUint8), true) + 1,
      y: view.getUint8((byteOffset += sizeOfUint8), true) + 1,
      z: view.getUint8((byteOffset += sizeOfUint8), true) + 1,
      w: view.getUint8((byteOffset += sizeOfUint8), true) + 1,
    },
    bytesPlane0: view.getUint8((byteOffset += sizeOfUint8), true),
    numSamples: 0,
    samples: [],
  };

  // Get Texture Based on Format
  var result = new Array(header.levelCount);
  if (
    header.vkFormat === VulkanConstants.VK_FORMAT_R8G8B8_SRGB ||
    header.vkFormat === VulkanConstants.VK_FORMAT_R8G8B8A8_SRGB ||
    header.vkFormat === VulkanConstants.VK_FORMAT_B10G11R11_UFLOAT_PACK32
  ) {
    parseUncompressed(data, header, levelIndex, result);
  } else if (header.vkFormat === 0x0 && dfd.colorModel === colorModelETC1S) {
    // Compressed, initialize transcoder module
    transcodeEtc1s(
      data,
      view,
      header,
      levelIndex,
      sgdIndex,
      supportedTargetFormats,
      transcoderModule,
      result
    );
  } else if (header.vkFormat === 0x0 && dfd.colorModel === colorModelUASTC) {
    throw new RuntimeError("UASTC Basis Encoding not yet supported");
  } else {
    throw new RuntimeError("KTX2 pixel format is not yet supported.");
  }

  if (header.layerCount !== 0) {
    throw new RuntimeError("KTX2 Videos are not supported");
  }

  if (header.pixelDepth !== 0) {
    throw new RuntimeError("KTX2 3D textures are unsupported.");
  }

  //// Cleaning up parsed result if it's a single image
  //if (header.faceCount === 1) {
  //  debugger;
  //  for (i = 0; i < header.levelCount; ++i) {
  //    result[i] = result[i][faceOrder[0]];
  //  }

  //  if (header.levelCount === 1) {
  //    result = result[0];
  //  }
  //}

  return result;
}

// Parser for uncompressed
function parseUncompressed(data, header, levelIndex, result) {
  var internalFormat =
    header.vkFormat === VulkanConstants.VK_FORMAT_R8G8B8A8_SRGB
      ? PixelFormat.RGBA
      : PixelFormat.RGB;
  internalFormat =
    header.vkFormat === VulkanConstants.VK_FORMAT_B10G11R11_UFLOAT_PACK32
      ? WebGLConstants.R11F_G11F_B10F
      : internalFormat;
  var dataBuffer = defined(data.buffer) ? data.buffer : data;

  for (var i = 0; i < levelIndex.length; ++i) {
    var level = (result[i] = {});
    var levelInfo = levelIndex[i];

    for (var j = 0; j < header.faceCount; ++j) {
      var width = header.pixelWidth >> i;
      var height = header.pixelWidth >> i;
      // var levelLength = levelInfo.byteLength;
      var faceLength =
        header.typeSize *
        width *
        height *
        PixelFormat.componentsLength(internalFormat);
      var levelOffset = levelInfo.byteOffset + faceLength * j;
      var levelBuffer = new Uint8Array(dataBuffer, levelOffset, faceLength);

      level[faceOrder[j]] = {
        internalFormat: internalFormat,
        width: width,
        height: height,
        levelBuffer: levelBuffer,
      };
    }
  }
}

function transcodeEtc1s(
  data,
  view,
  header,
  levelIndex,
  sgdIndex,
  supportedTargetFormats,
  transcoderModule,
  result
) {
  var ktx2Offset = defined(data.buffer) ? data.byteOffset : 0;
  var byteOffset = ktx2Offset + sgdIndex.byteOffset;
  var isVideo = header.layerCount !== 0; // Should be false until video support is added

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
    byteOffset += sizeOfUint32;
  }

  var hasAlphaSlices = imageDescs[0].alphaSliceByteLength > 0;

  // Determine target format based on platform support
  var internalFormat, transcoderFormat;
  var TranscodeTarget = transcoderModule.TranscodeTarget;
  if (supportedTargetFormats.etc1 && !hasAlphaSlices) {
    internalFormat = PixelFormat.RGB_ETC1;
    transcoderFormat = TranscodeTarget.ETC1_RGB;
  } else if (supportedTargetFormats.s3tc) {
    internalFormat = hasAlphaSlices
      ? PixelFormat.RGBA_DXT5
      : PixelFormat.RGB_DXT1;
    transcoderFormat = hasAlphaSlices
      ? TranscodeTarget.BC3_RGBA
      : TranscodeTarget.BC1_RGB;
  } else if (supportedTargetFormats.pvrtc) {
    internalFormat = hasAlphaSlices
      ? PixelFormat.RGBA_PVRTC_4BPPV1
      : PixelFormat.RGB_PVRTC_4BPPV1;
    transcoderFormat = hasAlphaSlices
      ? TranscodeTarget.PVRTC1_4_RGBA
      : TranscodeTarget.PVRTC1_4_RGB;
  } else {
    throw new RuntimeError("No transcoding format target available");
  }

  var dataBuffer = defined(data.buffer) ? data.buffer : data;
  var endpoints = new Uint8Array(dataBuffer, byteOffset, endpointsByteLength);
  byteOffset += endpointsByteLength;
  var selectors = new Uint8Array(dataBuffer, byteOffset, selectorsByteLength);
  byteOffset += selectorsByteLength;

  var transcoder = new transcoderModule.BasisLzEtc1sImageTranscoder();

  transcoder.decodePalettes(endpointCount, endpoints, selectorCount, selectors);

  var tables = new Uint8Array(dataBuffer, byteOffset, tablesByteLength);
  byteOffset += tablesByteLength;
  // var extendedByte = new Uint8Array(data, byteOffset, extendedByteLength);
  byteOffset += extendedByteLength;
  transcoder.decodeTables(tables);

  for (var i = 0; i < levelIndex.length; ++i) {
    var level = (result[i] = {});
    var levelInfo = levelIndex[i];
    var imageDesc = imageDescs[i];

    for (var j = 0; j < header.faceCount; ++j) {
      var width = header.pixelWidth >> i;
      var height = header.pixelWidth >> i;
      var levelOffset = ktx2Offset + levelInfo.byteOffset;

      var levelData = new Uint8Array(
        dataBuffer,
        levelOffset + imageDesc.rgbSliceByteOffset,
        imageDesc.rgbSliceByteLength + imageDesc.alphaSliceByteLength
      );

      var imageInfo = new transcoderModule.ImageInfo(
        transcoderModule.TextureFormat.ETC1S,
        width,
        height,
        i
      );
      imageInfo.flags = imageDesc.imageFlags;
      imageInfo.rgbByteOffset = 0;
      imageInfo.rgbByteLength = imageDesc.rgbSliceByteLength;
      imageInfo.alphaByteOffset =
        imageDesc.alphaSliceByteOffset > 0 ? imageDesc.rgbSliceByteLength : 0;
      imageInfo.alphaByteLength = imageDesc.alphaSliceByteLength;

      var transcoded = transcoder.transcodeImage(
        transcoderFormat,
        levelData,
        imageInfo,
        0,
        isVideo
      );

      // Check Error Here
      if (transcoded.transcodedImage === undefined) {
        throw new RuntimeError("Error transcoding Image");
      }

      // Create a copy and delete transcoder wasm allocated memory
      var levelBuffer = transcoded.transcodedImage
        .get_typed_memory_view()
        .slice();
      transcoded.transcodedImage.delete();

      // console.log(levelBuffer.byteLength);

      level[faceOrder[j]] = {
        internalFormat: internalFormat,
        width: width,
        height: height,
        levelBuffer: levelBuffer,
      };
    }
  }
}

export default parseKTX2;
