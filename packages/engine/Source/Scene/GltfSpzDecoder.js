import defined from "../Core/defined.js";
import FeatureDetection from "../Core/FeatureDetection.js";
import TaskProcessor from "../Core/TaskProcessor.js";

/**
 * Schedules SPZ decode work on a task processor worker.
 *
 * @private
 */
function GltfSpzDecoder() {}

GltfSpzDecoder._maximumDecodingConcurrency = Math.max(
  FeatureDetection.hardwareConcurrency - 1,
  1,
);
GltfSpzDecoder._taskProcessor = undefined;

GltfSpzDecoder._getTaskProcessor = function () {
  if (!defined(GltfSpzDecoder._taskProcessor)) {
    GltfSpzDecoder._taskProcessor = new TaskProcessor(
      "decodeSpz",
      GltfSpzDecoder._maximumDecodingConcurrency,
    );
  }

  return GltfSpzDecoder._taskProcessor;
};

function copyForTransfer(bufferViewTypedArray) {
  const buffer = new Uint8Array(bufferViewTypedArray.byteLength);
  buffer.set(bufferViewTypedArray);
  return buffer;
}

/**
 * Decodes an SPZ buffer view. Returns undefined if the worker queue is full.
 *
 * @param {Uint8Array} bufferViewTypedArray The compressed SPZ buffer view.
 * @returns {Promise<object>|undefined} The decoded Gaussian cloud promise.
 * @private
 */
GltfSpzDecoder.decode = function (bufferViewTypedArray) {
  const taskProcessor = GltfSpzDecoder._getTaskProcessor();
  if (
    taskProcessor._activeTasks >= GltfSpzDecoder._maximumDecodingConcurrency
  ) {
    return undefined;
  }

  const buffer = copyForTransfer(bufferViewTypedArray);
  return taskProcessor.scheduleTask({ buffer: buffer }, [buffer.buffer]);
};

export default GltfSpzDecoder;
