import Check from "../Core/Check.js";
import destroyObject from "../Core/destroyObject.js";
import DeveloperError from "../Core/DeveloperError.js";
import Frozen from "../Core/Frozen.js";
import RuntimeError from "../Core/RuntimeError.js";
import WebGLConstants from "../Core/WebGLConstants.js";

/**
 * The WebGLSync interface is part of the WebGL 2 API and is used to synchronize activities between the GPU and the application.
 *
 * @param {object} options Object with the following properties:
 * @param {Context} context
 *
 * @exception {DeveloperError} A WebGL 2 context is required to use Sync operations.
 *
 * @private
 * @constructor
 */
function Sync(options) {
  options = options ?? Frozen.EMPTY_OBJECT;
  const context = options.context;

  //>>includeStart('debug', pragmas.debug);
  Check.defined("options.context", context);
  //>>includeEnd('debug');

  if (!context._webgl2) {
    throw new DeveloperError(
      "A WebGL 2 context is required to use Sync operations.",
    );
  }

  const gl = context._gl;
  const sync = gl.fenceSync(WebGLConstants.SYNC_GPU_COMMANDS_COMPLETE, 0);

  this._gl = gl;
  this._sync = sync;
}
Sync.create = function (options) {
  return new Sync(options);
};
/**
 * Query the sync status of this Sync object.
 *
 * @returns {number} Returns a WebGLConstants indicating the status of the sync object (WebGLConstants.SIGNALED or WebGLConstants.UNSIGNALED).
 *
 * @private
 */
Sync.prototype.getStatus = function () {
  const status = this._gl.getSyncParameter(
    this._sync,
    WebGLConstants.SYNC_STATUS,
  );
  return status;
};
Sync.prototype.isDestroyed = function () {
  return false;
};
Sync.prototype.destroy = function () {
  this._gl.deleteSync(this._sync);
  return destroyObject(this);
};

/**
 * Incremantally polls the status of the Sync object until signaled then resolves.
 * Usually polling should be done once per frame.
 *
 * @example
 * try {
 *  await sync.waitForSignal(function (next) {
 *    setTimeout(next, 100);
 *  });
 *} catch (e) {
 *  throw "Signal timeout";
 *} finally {
 *  sync.destroy();
 *}
 *
 * @param {function} scheduleFunction Function for scheduling the next poll. Receives a callback as its only parameter.
 * @param {number} [ttl=10] Max number of iterations to poll until timeout.
 *
 * @exception {RuntimeError} Wait for signal timeout.
 */
Sync.prototype.waitForSignal = async function (scheduleFunction, ttl) {
  const self = this;
  ttl = ttl ?? 10;
  function waitForSignal0(resolve, reject, ttl) {
    return () => {
      const syncStatus = self.getStatus();
      const signaled = syncStatus === WebGLConstants.SIGNALED;
      if (signaled) {
        resolve();
      } else if (ttl <= 0) {
        reject(new RuntimeError("Wait for signal timeout"));
      } else {
        scheduleFunction(waitForSignal0(resolve, reject, ttl - 1));
      }
    };
  }
  return new Promise((resolve, reject) => {
    scheduleFunction(waitForSignal0(resolve, reject, ttl));
  });
};
export default Sync;
