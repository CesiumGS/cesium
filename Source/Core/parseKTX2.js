import arraySlice from "./arraySlice.js";
import Check from "./Check.js";
import defined from "./defined.js";
import PixelFormat from "./PixelFormat.js";
import RuntimeError from "./RuntimeError.js";
import VulkanConstants from "./VulkanConstants.js";
import PixelDatatype from "../Renderer/PixelDatatype.js";
import { read } from "../ThirdParty/Workers/ktx-parse.modern.js";

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
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("supportedTargetFormats", supportedTargetFormats);
  Check.typeOf.object("transcoderModule", transcoderModule);
  //>>includeEnd('debug');

  var header;
  try {
    header = read(data);
  } catch (e) {
    throw new RuntimeError("Invalid KTX2 file.");
  }

  if (header.layerCount !== 0) {
    throw new RuntimeError("KTX2 Videos are not supported");
  }

  if (header.pixelDepth !== 0) {
    throw new RuntimeError("KTX2 3D textures are unsupported.");
  }

  var dfd = header.dataFormatDescriptor[0];
  var result = new Array(header.levelCount);

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
    header.vkFormat === VulkanConstants.VK_FORMAT_R8G8B8A8
      ? PixelFormat.RGBA
      : PixelFormat.RGB;
  var datatype;
  if (header.vkFormat === VulkanConstants.VK_FORMAT_R8G8B8A8_UNORM) {
    datatype = PixelDatatype.UNSIGNED_BYTE;
  } else if (
    header.vkFormat === VulkanConstants.VK_FORMAT_R16G16B16A16_SFLOAT
  ) {
    datatype = PixelDatatype.HALF_FLOAT;
  } else if (
    header.vkFormat === VulkanConstants.VK_FORMAT_R32G32B32A32_SFLOAT
  ) {
    datatype = PixelDatatype.FLOAT;
  }

  for (var i = 0; i < header.levels.length; ++i) {
    var level = {};
    result[i] = level;
    var levelBuffer = arraySlice(header.levels[i].levelData);

    var width = header.pixelWidth >> i;
    var height = header.pixelHeight >> i;

    for (var j = 0; j < header.faceCount; ++j) {
      var faceLength =
        header.typeSize * // size in bytes of the pixel data type
        width *
        height *
        PixelFormat.componentsLength(internalFormat);

      var faceView;
      if (!defined(datatype) || PixelDatatype.sizeInBytes(datatype) === 1) {
        faceView = new Uint8Array(levelBuffer.buffer, faceLength * j);
      } else if (PixelDatatype.sizeInBytes(datatype) === 2) {
        faceView = new Uint16Array(levelBuffer.buffer, faceLength * j);
      } else {
        faceView = new Float32Array(levelBuffer.buffer, faceLength * j);
      }

      level[faceOrder[j]] = {
        internalFormat: internalFormat,
        datatype: datatype,
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
  var ktx2File = new transcoderModule.KTX2File(data);
  var width = ktx2File.getWidth();
  var height = ktx2File.getHeight();
  var levels = ktx2File.getLevels();
  var hasAlpha = ktx2File.getHasAlpha();

  if (!width || !height || !levels) {
    ktx2File.close();
    ktx2File.delete();
    throw new RuntimeError("Invalid KTX2 file");
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
    var level = {};
    result[i] = level;
    width = header.pixelWidth >> i;
    height = header.pixelHeight >> i;

    // Since supercompressed cubemaps are unsupported, this function
    // does not iterate over KTX2 faces and assumes faceCount = 1.

    var dstSize = ktx2File.getImageTranscodedSizeInBytes(
      i, // level index
      0, // layer index
      0, // face index
      transcoderFormat.value
    );
    var dst = new Uint8Array(dstSize);

    var transcoded = ktx2File.transcodeImage(
      dst,
      i, // level index
      0, // layer index
      0, // face index
      transcoderFormat.value,
      0, // get_alpha_for_opaque_formats
      -1, // channel0
      -1 // channel1
    );

    if (!transcoded) {
      throw new RuntimeError("transcodeImage() failed");
    }

    level[faceOrder[0]] = {
      internalFormat: internalFormat,
      width: width,
      height: height,
      levelBuffer: dst,
    };
  }

  ktx2File.close();
  ktx2File.delete();
  return result;
}

export default parseKTX2;
