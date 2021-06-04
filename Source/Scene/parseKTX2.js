import arraySlice from "../Core/arraySlice.js";
import defined from "../Core/defined.js";
import PixelFormat from "../Core/PixelFormat.js";
import RuntimeError from "../Core/RuntimeError.js";
import VulkanConstants from "../Core/VulkanConstants.js";
import WebGLConstants from "../Core/WebGLConstants.js";
import { read } from "../ThirdParty/Workers/ktx-parse.modern.js";

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

// Flags
var colorModelETC1S = 163;
var colorModelUASTC = 166;

/**
 * Parses and transcodes KTX2 buffers to an appropriate target format.
 *
 * @param {Uint8Array} data Data representing one KTX2 texture.
 * @param {Object} supportedTargetFormats Target formats available on the current system.
 * @param {Object} transcoderModule basis_transcoder object.
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

  // Get Texture Based on Format
  var header = read(data);
  var dfd = header.dataFormatDescriptor[0];

  var result = new Array(header.levelCount);

  if (header.layerCount !== 0) {
    throw new RuntimeError("KTX2 Videos are not supported");
  }

  if (header.pixelDepth !== 0) {
    throw new RuntimeError("KTX2 3D textures are unsupported.");
  }

  if (
    header.vkFormat === 0x0 &&
    (dfd.colorModel === colorModelETC1S || dfd.colorModel === colorModelUASTC)
  ) {
    // Compressed, initialize transcoder module
    transcodeCompressed(
      data,
      header,
      supportedTargetFormats,
      transcoderModule,
      result
    );
  } else {
    parseUncompressed(header, result);
  }

  return result;
}

// Parser for uncompressed
function parseUncompressed(header, result) {
  var internalFormat =
    header.vkFormat === VulkanConstants.VK_FORMAT_R8G8B8A8_SRGB
      ? PixelFormat.RGBA
      : PixelFormat.RGB;
  internalFormat =
    header.vkFormat === VulkanConstants.VK_FORMAT_B10G11R11_UFLOAT_PACK32
      ? WebGLConstants.R11F_G11F_B10F
      : internalFormat;
  internalFormat =
    header.vkFormat === VulkanConstants.VK_FORMAT_R8G8B8A8_UNORM
      ? PixelFormat.RGBA_UNORM
      : internalFormat;

  for (var i = 0; i < header.levels.length; ++i) {
    var level = (result[i] = {});
    var levelBuffer = arraySlice(header.levels[i].levelData);

    var width = header.pixelWidth >> i;
    var height = header.pixelHeight >> i;

    for (var j = 0; j < header.faceCount; ++j) {
      var faceLength =
        header.typeSize *
        width *
        height *
        PixelFormat.componentsLength(internalFormat);

      var faceView = new Uint8Array(levelBuffer.buffer, faceLength * j);

      level[faceOrder[j]] = {
        internalFormat: internalFormat,
        width: width,
        height: height,
        levelBuffer: faceView,
      };
    }
  }
}

function transcodeCompressed(
  data,
  header,
  supportedTargetFormats,
  transcoderModule,
  result
) {
  var dataBuffer = defined(data.buffer) ? data.buffer : data;
  var ktx2File = new transcoderModule.KTX2File(new Uint8Array(dataBuffer));
  var width = ktx2File.getWidth();
  var height = ktx2File.getHeight();
  // var layers = ktx2File.getLayers();
  var levels = ktx2File.getLevels();
  // var faces = ktx2File.getFaces();
  var hasAlpha = ktx2File.getHasAlpha();

  if (!width || !height || !levels) {
    ktx2File.close();
    ktx2File.delete();
    throw new RuntimeError("Invalid .ktx2 file");
  }

  // Determine target format based on platform support
  var internalFormat, transcoderFormat;
  var BasisFormat = transcoderModule.transcoder_texture_format;
  if (supportedTargetFormats.astc && hasAlpha) {
    internalFormat = PixelFormat.RGBA_ASTC;
    transcoderFormat = BasisFormat.cTFASTC_4x4_RGBA;
  } else if (supportedTargetFormats.bc7) {
    internalFormat = PixelFormat.RGBA_BC7;
    transcoderFormat = BasisFormat.cTFBC7_RGBA;
  } else if (supportedTargetFormats.etc1 && !hasAlpha) {
    internalFormat = PixelFormat.RGB_ETC1;
    transcoderFormat = BasisFormat.cTFETC1_RGB;
  } else if (supportedTargetFormats.s3tc) {
    internalFormat = hasAlpha ? PixelFormat.RGBA_DXT5 : PixelFormat.RGB_DXT1;
    transcoderFormat = hasAlpha
      ? BasisFormat.cTFBC3_RGBA
      : BasisFormat.cTFBC1_RGB;
  } else if (supportedTargetFormats.pvrtc) {
    internalFormat = hasAlpha
      ? PixelFormat.RGBA_PVRTC_4BPPV1
      : PixelFormat.RGB_PVRTC_4BPPV1;
    transcoderFormat = hasAlpha
      ? BasisFormat.cTFPVRTC1_4_RGBA
      : BasisFormat.cTFPVRTC1_4_RGB;
  } else {
    throw new RuntimeError("No transcoding format target available");
  }

  if (!ktx2File.startTranscoding()) {
    ktx2File.close();
    ktx2File.delete();
    throw new RuntimeError("startTranscoding failed");
  }

  for (var i = 0; i < header.levels.length; ++i) {
    var level = (result[i] = {});
    width = header.pixelWidth >> i;
    height = header.pixelHeight >> i;

    for (var j = 0; j < header.faceCount; ++j) {
      var dstSize = ktx2File.getImageTranscodedSizeInBytes(
        i,
        0, // layer index
        j,
        transcoderFormat.value
      );
      var dst = new Uint8Array(dstSize);

      var transcoded = ktx2File.transcodeImage(
        dst,
        i, // level index
        0, // layer index
        j, // face index
        transcoderFormat.value,
        0, // get_alpha_for_opaque_formats
        -1, // channel0
        -1 // channel1
      );

      if (!transcoded) {
        throw new RuntimeError("transcodeImage() failed");
      }

      level[faceOrder[j]] = {
        internalFormat: internalFormat,
        width: width,
        height: height,
        levelBuffer: dst,
      };
    }
  }

  ktx2File.close();
  ktx2File.delete();
  return result;
}

export default parseKTX2;
