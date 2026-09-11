import Check from "./Check.js";
import CompressedTextureBuffer from "./CompressedTextureBuffer.js";
import defined from "./defined.js";
import DeveloperError from "./DeveloperError.js";
import getAbsoluteUri from "./getAbsoluteUri.js";
import RuntimeError from "./RuntimeError.js";
import TaskProcessor from "./TaskProcessor.js";

/**
 * Lets applications use their own Basis Universal build to decode KTX2 textures.
 * Cesium uses its bundled build by default.
 *
 * @alias KTX2Transcoder
 * @namespace
 * @experimental This feature is not final and is subject to change without
 * Cesium's standard deprecation policy.
 */
function KTX2Transcoder() {}

/**
 * The two files that make up an application-supplied Basis Universal build.
 * Both the JavaScript wrapper and Wasm binary must come from the same build.
 *
 * The wrapper must be an ES module whose default export is a factory function.
 * Cesium calls that function in its KTX2 worker with an Emscripten configuration
 * that contains the binary bytes in <code>wasmBinary</code>.
 * The function returns a Basis module, or a promise for that module.
 *
 * The module must provide <code>initializeBasis</code>, <code>KTX2File</code>,
 * and <code>transcoder_texture_format</code>. These APIs must be compatible
 * with Cesium's bundled Basis version.
 *
 * @typedef {object} KTX2Transcoder.BasisTranscoderOptions
 * @property {string} modulePath The URL of the JavaScript wrapper.
 * @property {string} wasmBinaryFile The URL of the matching Wasm binary.
 */

Object.defineProperties(KTX2Transcoder, {
  /**
   * Uses your own Basis Universal build to decode KTX2 textures.
   * Leave this undefined to use Cesium's bundled build.
   *
   * Before the first KTX2 load, set both the JavaScript wrapper URL and the
   * matching Wasm binary URL. Relative URLs resolve against the document URL.
   * Cesium copies the options and rejects changes after loading starts.
   *
   * Cesium's existing KTX2 worker loads both files and compiles the Wasm binary.
   * See {@link KTX2Transcoder.BasisTranscoderOptions} for the wrapper requirements.
   *
   * For a Content Security Policy without <code>'unsafe-eval'</code>, use a
   * compatible Basis build that does not generate JavaScript at runtime.
   * The worker's policy must allow the wrapper import, binary fetch, and Wasm compilation.
   *
   * @memberof KTX2Transcoder
   * @type {KTX2Transcoder.BasisTranscoderOptions|undefined}
   * @default undefined
   * @experimental This feature is not final and is subject to change without
   * Cesium's standard deprecation policy.
   *
   * @example
   * Cesium.KTX2Transcoder.basisTranscoderOptions = {
   *   modulePath: "/decoders/basis_transcoder.js",
   *   wasmBinaryFile: "/decoders/basis_transcoder.wasm",
   * };
   */
  basisTranscoderOptions: {
    get: function () {
      return KTX2Transcoder._basisTranscoderOptions;
    },
    set: function (value) {
      if (defined(KTX2Transcoder._readyPromise)) {
        throw new DeveloperError(
          "KTX2Transcoder.basisTranscoderOptions must be configured before the first KTX2 load.",
        );
      }
      if (!defined(value)) {
        KTX2Transcoder._basisTranscoderOptions = undefined;
        return;
      }
      if (
        typeof value !== "object" ||
        typeof value.modulePath !== "string" ||
        value.modulePath.length === 0 ||
        typeof value.wasmBinaryFile !== "string" ||
        value.wasmBinaryFile.length === 0
      ) {
        throw new DeveloperError(
          "KTX2Transcoder.basisTranscoderOptions requires non-empty modulePath and wasmBinaryFile strings.",
        );
      }
      KTX2Transcoder._basisTranscoderOptions = Object.freeze({
        modulePath: value.modulePath,
        wasmBinaryFile: value.wasmBinaryFile,
      });
    },
  },
});

KTX2Transcoder._transcodeTaskProcessor = new TaskProcessor(
  "transcodeKTX2",
  Number.POSITIVE_INFINITY, // KTX2 transcoding is used in place of Resource.fetchImage, so it can't reject as "just soooo busy right now"
);

KTX2Transcoder._readyPromise = undefined;

function makeReadyPromise() {
  const options = KTX2Transcoder._basisTranscoderOptions;
  const wasmOptions = defined(options)
    ? {
        modulePath: getAbsoluteUri(options.modulePath),
        wasmBinaryFile: getAbsoluteUri(options.wasmBinaryFile),
      }
    : { wasmBinaryFile: "ThirdParty/basis_transcoder.wasm" };
  const readyPromise = KTX2Transcoder._transcodeTaskProcessor
    .initWebAssemblyModule(wasmOptions)
    .then(function (result) {
      if (result) {
        return KTX2Transcoder._transcodeTaskProcessor;
      }

      throw new RuntimeError("KTX2 transcoder could not be initialized.");
    });
  KTX2Transcoder._readyPromise = readyPromise;
}

/**
 * Transcodes a KTX2 buffer in the worker.
 * @private
 */
KTX2Transcoder.transcode = function (ktx2Buffer, supportedTargetFormats) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("supportedTargetFormats", supportedTargetFormats);
  //>>includeEnd('debug');

  if (!defined(KTX2Transcoder._readyPromise)) {
    makeReadyPromise();
  }

  return KTX2Transcoder._readyPromise
    .then(function (taskProcessor) {
      let bufferView = ktx2Buffer;
      if (ktx2Buffer instanceof ArrayBuffer) {
        bufferView = new Uint8Array(ktx2Buffer);
      }
      const parameters = {
        supportedTargetFormats: supportedTargetFormats,
        ktx2Buffer: bufferView,
      };
      return taskProcessor.scheduleTask(parameters, [bufferView.buffer]);
    })
    .then(function (result) {
      const levelsLength = result.length;
      const faceKeys = Object.keys(result[0]);

      for (let i = 0; i < levelsLength; i++) {
        const faces = result[i];
        for (let j = 0; j < faceKeys.length; j++) {
          const face = faces[faceKeys[j]];
          faces[faceKeys[j]] = new CompressedTextureBuffer(
            face.internalFormat,
            face.datatype,
            face.width,
            face.height,
            face.levelBuffer,
          );
        }
      }

      // Cleaning up parsed result if it's a single image
      if (faceKeys.length === 1) {
        for (let i = 0; i < levelsLength; ++i) {
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
