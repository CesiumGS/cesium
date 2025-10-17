import Check from "../Core/Check.js";
import destroyObject from "../Core/destroyObject.js";
import DeveloperError from "../Core/DeveloperError.js";
import Frozen from "../Core/Frozen.js";
import WebGLConstants from "../Core/WebGLConstants.js";

/**
 * @private
 */
function Sync(options) {
  options = options ?? Frozen.EMPTY_OBJECT;

  //>>includeStart('debug', pragmas.debug);
  Check.defined("options.context", options.context);
  //>>includeEnd('debug');

  if (!options.context._webgl2) {
    throw new DeveloperError("A WebGL 2 context is required.");
  }

  const context = options.context;
  const gl = context._gl;

  const sync = gl.fenceSync(WebGLConstants.SYNC_GPU_COMMANDS_COMPLETE, 0);

  this._gl = gl;
  this._sync = sync;
}
Sync.create = function (options) {
  return new Sync(options);
};
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
export default Sync;
