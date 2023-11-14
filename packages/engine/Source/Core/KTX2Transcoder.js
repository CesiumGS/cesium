import Check from "./Check.js";
import CompressedTextureBuffer from "./CompressedTextureBuffer.js";
import defined from "./defined.js";
import RuntimeError from "./RuntimeError.js";
import TaskProcessor from "./TaskProcessor.js";

/**
 * Transcodes KTX2 textures using web workers.
 *
 * @private
 */
function KTX2Transcoder() {}

KTX2Transcoder._transcodeTaskProcessor = new TaskProcessor(
  "transcodeKTX2",
  Number.POSITIVE_INFINITY // KTX2 transcoding is used in place of Resource.fetchImage, so it can't reject as "just soooo busy right now"
);

KTX2Transcoder._readyPromise = undefined;

function makeReadyPromise() {
  const readyPromise = KTX2Transcoder._transcodeTaskProcessor
    .initWebAssemblyModule({
      wasmBinaryFile: "ThirdParty/basis_transcoder.wasm",
    })
    .then(function (result) {
      if (result) {
        return KTX2Transcoder._transcodeTaskProcessor;
      }

      throw new RuntimeError("KTX2 transcoder could not be initialized.");
    });
  KTX2Transcoder._readyPromise = readyPromise;
}

KTX2Transcoder.transcode = function (ktx2Buffer, supportedTargetFormats) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("supportedTargetFormats", supportedTargetFormats);
  //>>includeEnd('debug');

  if (!defined(KTX2Transcoder._readyPromise)) {
    makeReadyPromise();
  }

  return KTX2Transcoder._readyPromise
    .then(function (taskProcessor) {
      let parameters;
      if (ktx2Buffer instanceof ArrayBuffer) {
        const view = new Uint8Array(ktx2Buffer);
        parameters = {
          supportedTargetFormats: supportedTargetFormats,
          ktx2Buffer: view,
        };
        return taskProcessor.scheduleTask(parameters, [ktx2Buffer]);
      }
      parameters = {
        supportedTargetFormats: supportedTargetFormats,
        ktx2Buffer: ktx2Buffer,
      };
      return taskProcessor.scheduleTask(parameters, [ktx2Buffer.buffer]);
    })
    .then(function (result) {
      const levelsLength = result.length;
      const faceKeys = Object.keys(result[0]);
      const faceKeysLength = faceKeys.length;

      let i;
      for (i = 0; i < levelsLength; i++) {
        const faces = result[i];
        for (let j = 0; j < faceKeysLength; j++) {
          const face = faces[faceKeys[j]];
          faces[faceKeys[j]] = new CompressedTextureBuffer(
            face.internalFormat,
            face.datatype,
            face.width,
            face.height,
            face.levelBuffer
          );
        }
      }

      // Cleaning up parsed result if it's a single image
      if (faceKeysLength === 1) {
        for (i = 0; i < levelsLength; ++i) {
          result[i] = result[i][faceKeys[0]];
        }

        if (levelsLength === 1) {
          result = result[0];
        }
      }
      return result;
    })
    .catch(function (error) {
      throw error;
    });
};

export default KTX2Transcoder;
