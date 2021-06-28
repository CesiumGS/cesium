import Check from "./Check.js";
import CompressedTextureBuffer from "./CompressedTextureBuffer.js";
import defined from "./defined.js";
import TaskProcessor from "./TaskProcessor.js";

/**
 * Transcodes KTX2 textures using web workers.
 *
 * @private
 */
function KTX2Transcoder() {}

KTX2Transcoder._transcoderTaskProcessor = undefined;
KTX2Transcoder._getTranscoderTaskProcessor = function () {
  if (!defined(KTX2Transcoder._transcoderTaskProcessor)) {
    KTX2Transcoder._transcoderTaskProcessor = new TaskProcessor(
      "transcodeKTX2",
      Number.POSITIVE_INFINITY // KTX2 transcoding is used in place of Resource.fetchImage, so it can't reject as "just soooo busy right now"
    );
  }
  return KTX2Transcoder._transcoderTaskProcessor;
};

KTX2Transcoder._readyPromise = undefined;

function makeReadyPromise() {
  var taskProcessor = KTX2Transcoder._getTranscoderTaskProcessor();
  var readyPromise = taskProcessor
    .initWebAssemblyModule({
      modulePath: "ThirdParty/Workers/basis_transcoder.js",
      wasmBinaryFile: "ThirdParty/basis_transcoder.wasm",
    })
    .then(function () {
      return KTX2Transcoder._transcodeTaskProcessor;
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
      var parameters;
      if (ktx2Buffer instanceof ArrayBuffer) {
        var view = new Uint8Array(ktx2Buffer);
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
      var levelsLength = result.length;
      var faceKeys = Object.keys(result[0]);
      var faceKeysLength = faceKeys.length;

      var i;
      for (i = 0; i < levelsLength; i++) {
        var faces = result[i];
        for (var j = 0; j < faceKeysLength; j++) {
          var face = faces[faceKeys[j]];
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
    .otherwise(function (error) {
      throw error;
    });
};

export default KTX2Transcoder;
