import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import getAbsoluteUri from "../Core/getAbsoluteUri.js";
import TaskProcessor from "../Core/TaskProcessor.js";

const defaultWorkerModuleId = "decodeSpz";

function getDecoderTaskProcessor() {
  let taskProcessor = SpzDecoder._decoderTaskProcessor;
  if (!defined(taskProcessor)) {
    const workerModuleUrl = SpzDecoder._workerModuleUrl;
    const workerPath = defined(workerModuleUrl)
      ? getAbsoluteUri(workerModuleUrl)
      : defaultWorkerModuleId;
    taskProcessor = new TaskProcessor(workerPath);
    SpzDecoder._decoderTaskProcessor = taskProcessor;
  }

  return taskProcessor;
}

/**
 * Configures the Web Worker module used to decode SPZ-compressed Gaussian
 * splats.
 *
 * @alias SpzDecoder
 * @namespace
 *
 * @experimental This feature is not final and is subject to change without
 * Cesium's standard deprecation policy.
 */
function SpzDecoder() {}

Object.defineProperties(SpzDecoder, {
  /**
   * The URL of the ECMAScript Web Worker module that decodes SPZ data. Set
   * this before the first SPZ decode to use a decoder other than Cesium's
   * bundled <code>Workers/decodeSpz.js</code> worker. Relative URLs are
   * resolved relative to the document URL.
   *
   * To apply a separate Content Security Policy to the decoder, serve the
   * module as a separate, same-origin resource. Cross-origin URLs use a
   * <code>blob:</code> worker fallback, which inherits the document's policy.
   *
   * The module must use {@link createTaskProcessorWorker}, receive an object
   * with a <code>spzData</code> {@link Uint8Array}, and return the gcloud
   * object produced by <code>@spz-loader/core</code>. It must transfer the
   * buffers for its typed-array attributes.
   *
   * @memberof SpzDecoder
   * @type {string|undefined}
   * @default undefined
   * @experimental This feature is not final and is subject to change without
   * Cesium's standard deprecation policy.
   */
  workerModuleUrl: {
    get: function () {
      return SpzDecoder._workerModuleUrl;
    },
    set: function (value) {
      if (defined(SpzDecoder._decoderTaskProcessor)) {
        throw new DeveloperError(
          "SpzDecoder.workerModuleUrl must be configured before the first SPZ decode.",
        );
      }

      if (defined(value) && (typeof value !== "string" || value.length === 0)) {
        throw new DeveloperError(
          "SpzDecoder.workerModuleUrl must be a non-empty string or undefined.",
        );
      }

      SpzDecoder._workerModuleUrl = value;
    },
  },
});

/**
 * Decodes SPZ data in the configured Web Worker.
 *
 * @param {Uint8Array} spzData The compressed SPZ data. Its backing buffer is
 *        transferred to the worker.
 * @returns {Promise<object>|undefined} A promise that resolves to the gcloud
 *          decode result, or undefined when the worker is busy.
 * @private
 */
SpzDecoder.decode = function (spzData) {
  return getDecoderTaskProcessor().scheduleTask({ spzData: spzData }, [
    spzData.buffer,
  ]);
};

SpzDecoder._decoderTaskProcessor = undefined;
SpzDecoder._workerModuleUrl = undefined;

// Exposed for testing purposes.
SpzDecoder._resetForTesting = function () {
  const taskProcessor = SpzDecoder._decoderTaskProcessor;
  if (defined(taskProcessor) && !taskProcessor.isDestroyed()) {
    taskProcessor.destroy();
  }
  SpzDecoder._decoderTaskProcessor = undefined;
  SpzDecoder._workerModuleUrl = undefined;
};

export default SpzDecoder;
