/* global require */
import defined from "../Core/defined.js";
import Check from "../Core/Check.js";
import PixelFormat from "../Core/PixelFormat.js";
import RuntimeError from "../Core/RuntimeError.js";
import VulkanConstants from "../Core//VulkanConstants.js";
import PixelDatatype from "../Renderer/PixelDatatype.js";
import createTaskProcessorWorker from "./createTaskProcessorWorker.js";
import ktx_parse from "../ThirdPartyNpm/ktx-parse.js";

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

var transcoderModule;
function transcode(parameters, transferableObjects) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("transcoderModule", transcoderModule);
  //>>includeEnd('debug');

  var data = parameters.ktx2Buffer;
  var supportedTargetFormats = parameters.supportedTargetFormats;
  var header;
  try {
    header = ktx_parse(data);
  } catch (e) {
    throw new RuntimeError("Invalid KTX2 file.");
  }

  if (header.layerCount !== 0) {
    throw new RuntimeError("KTX2 texture arrays are not supported.");
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
      transferableObjects,
      result
    );
  } else {
    transferableObjects.push(data.buffer);
    parseUncompressed(header, result);
  }

  return result;
}

// Parser for uncompressed
function parseUncompressed(header, result) {
  var internalFormat =
    header.vkFormat === VulkanConstants.VK_FORMAT_R8G8B8_SRGB
      ? PixelFormat.RGB
      : PixelFormat.RGBA;
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
    var levelBuffer = header.levels[i].levelData;

    var width = header.pixelWidth >> i;
    var height = header.pixelHeight >> i;
    var faceLength =
      width * height * PixelFormat.componentsLength(internalFormat);

    for (var j = 0; j < header.faceCount; ++j) {
      // multiply levelBuffer.byteOffset by the size in bytes of the pixel data type
      var faceByteOffset =
        levelBuffer.byteOffset + faceLength * header.typeSize * j;
      var faceView;
      if (!defined(datatype) || PixelDatatype.sizeInBytes(datatype) === 1) {
        faceView = new Uint8Array(
          levelBuffer.buffer,
          faceByteOffset,
          faceLength
        );
      } else if (PixelDatatype.sizeInBytes(datatype) === 2) {
        faceView = new Uint16Array(
          levelBuffer.buffer,
          faceByteOffset,
          faceLength
        );
      } else {
        faceView = new Float32Array(
          levelBuffer.buffer,
          faceByteOffset,
          faceLength
        );
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
  transferableObjects,
  result
) {
  var ktx2File = new transcoderModule.KTX2File(data);
  var width = ktx2File.getWidth();
  var height = ktx2File.getHeight();
  var levels = ktx2File.getLevels();
  var hasAlpha = ktx2File.getHasAlpha();

  if (!(width > 0) || !(height > 0) || !(levels > 0)) {
    ktx2File.close();
    ktx2File.delete();
    throw new RuntimeError("Invalid KTX2 file");
  }

  var internalFormat, transcoderFormat;
  var dfd = header.dataFormatDescriptor[0];
  var BasisFormat = transcoderModule.transcoder_texture_format;

  // Determine target format based on platform support
  if (dfd.colorModel === colorModelETC1S) {
    if (supportedTargetFormats.etc) {
      internalFormat = hasAlpha
        ? PixelFormat.RGBA8_ETC2_EAC
        : PixelFormat.RGB8_ETC2;
      transcoderFormat = hasAlpha
        ? BasisFormat.cTFETC2_RGBA
        : BasisFormat.cTFETC1_RGB;
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
    } else if (supportedTargetFormats.astc) {
      internalFormat = PixelFormat.RGBA_ASTC;
      transcoderFormat = BasisFormat.cTFASTC_4x4_RGBA;
    } else if (supportedTargetFormats.bc7) {
      internalFormat = PixelFormat.RGBA_BC7;
      transcoderFormat = BasisFormat.cTFBC7_RGBA;
    } else {
      throw new RuntimeError(
        "No transcoding format target available for ETC1S compressed ktx2."
      );
    }
  } else if (dfd.colorModel === colorModelUASTC) {
    if (supportedTargetFormats.astc) {
      internalFormat = PixelFormat.RGBA_ASTC;
      transcoderFormat = BasisFormat.cTFASTC_4x4_RGBA;
    } else if (supportedTargetFormats.bc7) {
      internalFormat = PixelFormat.RGBA_BC7;
      transcoderFormat = BasisFormat.cTFBC7_RGBA;
    } else if (supportedTargetFormats.s3tc) {
      internalFormat = hasAlpha ? PixelFormat.RGBA_DXT5 : PixelFormat.RGB_DXT1;
      transcoderFormat = hasAlpha
        ? BasisFormat.cTFBC3_RGBA
        : BasisFormat.cTFBC1_RGB;
    } else if (supportedTargetFormats.etc) {
      internalFormat = hasAlpha
        ? PixelFormat.RGBA8_ETC2_EAC
        : PixelFormat.RGB8_ETC2;
      transcoderFormat = hasAlpha
        ? BasisFormat.cTFETC2_RGBA
        : BasisFormat.cTFETC1_RGB;
    } else if (supportedTargetFormats.etc1 && !hasAlpha) {
      internalFormat = PixelFormat.RGB_ETC1;
      transcoderFormat = BasisFormat.cTFETC1_RGB;
    } else if (supportedTargetFormats.pvrtc) {
      internalFormat = hasAlpha
        ? PixelFormat.RGBA_PVRTC_4BPPV1
        : PixelFormat.RGB_PVRTC_4BPPV1;
      transcoderFormat = hasAlpha
        ? BasisFormat.cTFPVRTC1_4_RGBA
        : BasisFormat.cTFPVRTC1_4_RGB;
    } else {
      throw new RuntimeError(
        "No transcoding format target available for UASTC compressed ktx2."
      );
    }
  }

  if (!ktx2File.startTranscoding()) {
    ktx2File.close();
    ktx2File.delete();
    throw new RuntimeError("startTranscoding() failed");
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

    if (!defined(transcoded)) {
      throw new RuntimeError("transcodeImage() failed.");
    }

    transferableObjects.push(dst.buffer);

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

function initWorker(compiledModule) {
  transcoderModule = compiledModule;
  transcoderModule.initializeBasis();

  self.onmessage = createTaskProcessorWorker(transcode);
  self.postMessage(true);
}

function transcodeKTX2(event) {
  var data = event.data;

  // Expect the first message to be to load a web assembly module
  var wasmConfig = data.webAssemblyConfig;
  if (defined(wasmConfig)) {
    // Require and compile WebAssembly module, or use fallback if not supported
    return require([wasmConfig.modulePath], function (mscBasisTranscoder) {
      if (defined(wasmConfig.wasmBinaryFile)) {
        if (!defined(mscBasisTranscoder)) {
          mscBasisTranscoder = self.MSC_TRANSCODER;
        }

        mscBasisTranscoder(wasmConfig).then(function (compiledModule) {
          initWorker(compiledModule);
        });
      } else {
        return mscBasisTranscoder().then(function (transcoder) {
          initWorker(transcoder);
        });
      }
    });
  }
}
export default transcodeKTX2;
