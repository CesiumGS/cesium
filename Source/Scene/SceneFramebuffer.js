import Color from "../Core/Color.js";
import destroyObject from "../Core/destroyObject.js";
import ClearCommand from "../Renderer/ClearCommand.js";
import FramebufferManager from "../Renderer/FramebufferManager.js";
import PixelDatatype from "../Renderer/PixelDatatype.js";

/**
 * @private
 */
function SceneFramebuffer() {
  this._colorFramebuffer = new FramebufferManager({
    depthStencil: true,
  });
  this._idFramebuffer = new FramebufferManager({
    depthStencil: true,
  });

  this._idClearColor = new Color(0.0, 0.0, 0.0, 0.0);

  this._clearCommand = new ClearCommand({
    color: new Color(0.0, 0.0, 0.0, 0.0),
    depth: 1.0,
    owner: this,
  });
}

function destroyResources(post) {
  post._colorFramebuffer.destroyResources();
  post._idFramebuffer.destroyResources();
}

Object.defineProperties(SceneFramebuffer.prototype, {
  framebuffer: {
    get: function () {
      return this._colorFramebuffer.framebuffer;
    },
  },
  idFramebuffer: {
    get: function () {
      return this._idFramebuffer.framebuffer;
    },
  },
});

SceneFramebuffer.prototype.update = function (context, viewport, hdr) {
  var width = viewport.width;
  var height = viewport.height;
  var depthTexture = context.depthTexture;
  var pixelDatatype = hdr
    ? context.halfFloatingPointTexture
      ? PixelDatatype.HALF_FLOAT
      : PixelDatatype.FLOAT
    : PixelDatatype.UNSIGNED_BYTE;
  this._colorFramebuffer.update(
    context,
    width,
    height,
    depthTexture,
    pixelDatatype
  );
  this._idFramebuffer.update(context, width, height, depthTexture);
};

SceneFramebuffer.prototype.clear = function (context, passState, clearColor) {
  this._colorFramebuffer.clear(
    context,
    passState,
    clearColor,
    this._clearCommand
  );
  this._idFramebuffer.clear(
    context,
    passState,
    this._idClearColor,
    this._clearCommand
  );
};

SceneFramebuffer.prototype.getFramebuffer = function () {
  return this._colorFramebuffer.framebuffer;
};

SceneFramebuffer.prototype.getIdFramebuffer = function () {
  return this._idFramebuffer.framebuffer;
};

SceneFramebuffer.prototype.isDestroyed = function () {
  return false;
};

SceneFramebuffer.prototype.destroy = function () {
  destroyResources(this);
  return destroyObject(this);
};
export default SceneFramebuffer;
