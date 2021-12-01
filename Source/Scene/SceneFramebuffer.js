import Color from "../Core/Color.js";
import destroyObject from "../Core/destroyObject.js";
import ClearCommand from "../Renderer/ClearCommand.js";
import FramebufferManager from "../Renderer/FramebufferManager.js";

/**
 * @private
 */
function SceneFramebuffer() {
  this._colorFramebufferManager = new FramebufferManager();
  this._idFramebufferManager = new FramebufferManager();

  this._idClearColor = new Color(0.0, 0.0, 0.0, 0.0);

  this._useHdr = undefined;

  this._clearCommand = new ClearCommand({
    color: new Color(0.0, 0.0, 0.0, 0.0),
    depth: 1.0,
    owner: this,
  });
}

function destroyResources(post) {
  post._colorFramebufferManager.destroy();
  post._idFramebufferManager.destroy();
  post._colorFramebufferManager = undefined;
  post._idFramebufferManager = undefined;
}

SceneFramebuffer.prototype.update = function (
  context,
  viewport,
  hdr,
  numSamples
) {
  this._colorFramebufferManager.update(context, viewport, hdr, numSamples);
  this._idFramebufferManager.update(context, viewport);
};

SceneFramebuffer.prototype.clear = function (context, passState, clearColor) {
  this._colorFramebufferManager.clear(
    context,
    passState,
    clearColor,
    this._clearCommand
  );
  this._idFramebufferManager.clear(
    context,
    passState,
    clearColor,
    this._clearCommand
  );
};

SceneFramebuffer.prototype.getFramebuffer = function () {
  return this._colorFramebufferManager._framebuffer;
};

SceneFramebuffer.prototype.getIdFramebuffer = function () {
  return this._idFramebufferManager._framebuffer;
};

SceneFramebuffer.prototype.isDestroyed = function () {
  return false;
};

SceneFramebuffer.prototype.destroy = function () {
  destroyResources(this);
  return destroyObject(this);
};
export default SceneFramebuffer;
