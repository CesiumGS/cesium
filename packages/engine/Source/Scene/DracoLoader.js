import defined from "../Core/defined.js";
import FeatureDetection from "../Core/FeatureDetection.js";
import TaskProcessor from "../Core/TaskProcessor.js";

/**
 * @private
 */
function DracoLoader() {}

// Maximum concurrency to use when decoding draco models
DracoLoader._maxDecodingConcurrency = Math.max(
  FeatureDetection.hardwareConcurrency - 1,
  1
);

// Exposed for testing purposes
DracoLoader._decoderTaskProcessor = undefined;
DracoLoader._taskProcessorReady = false;
DracoLoader._getDecoderTaskProcessor = function () {
  if (!defined(DracoLoader._decoderTaskProcessor)) {
    const processor = new TaskProcessor(
      "decodeDraco",
      DracoLoader._maxDecodingConcurrency
    );
    processor
      .initWebAssemblyModule({
        modulePath: "ThirdParty/Workers/draco_decoder_nodejs.js",
        wasmBinaryFile: "ThirdParty/draco_decoder.wasm",
      })
      .then(function () {
        DracoLoader._taskProcessorReady = true;
      });
    DracoLoader._decoderTaskProcessor = processor;
  }

  return DracoLoader._decoderTaskProcessor;
};

/**
 * Decodes a compressed point cloud. Returns undefined if the task cannot be scheduled.
 * @private
 */
DracoLoader.decodePointCloud = function (parameters) {
  const decoderTaskProcessor = DracoLoader._getDecoderTaskProcessor();
  if (!DracoLoader._taskProcessorReady) {
    // The task processor is not ready to schedule tasks
    return;
  }
  return decoderTaskProcessor.scheduleTask(parameters, [
    parameters.buffer.buffer,
  ]);
};

/**
 * Decodes a buffer view. Returns undefined if the task cannot be scheduled.
 *
 * @param {Object} options Object with the following properties:
 * @param {Uint8Array} options.array The typed array containing the buffer view data.
 * @param {Object} options.bufferView The glTF buffer view object.
 * @param {Object.<String, Number>} options.compressedAttributes The compressed attributes.
 * @param {Boolean} options.dequantizeInShader Whether POSITION and NORMAL attributes should be dequantized on the GPU.
 *
 * @returns {Promise} A promise that resolves to the decoded indices and attributes.
 * @private
 */
DracoLoader.decodeBufferView = function (options) {
  const decoderTaskProcessor = DracoLoader._getDecoderTaskProcessor();
  if (!DracoLoader._taskProcessorReady) {
    // The task processor is not ready to schedule tasks
    return;
  }

  return decoderTaskProcessor.scheduleTask(options, [options.array.buffer]);
};

export default DracoLoader;
