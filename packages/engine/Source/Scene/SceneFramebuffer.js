import Color from "../Core/Color.js";
import destroyObject from "../Core/destroyObject.js";
import ClearCommand from "../Renderer/ClearCommand.js";
import FramebufferManager from "../Renderer/FramebufferManager.js";
import PixelDatatype from "../Renderer/PixelDatatype.js";

/**
 * @private
 */
function SceneFramebuffer() {
  this._numSamples = 1;
  this._colorFramebuffer = new FramebufferManager({
    depthStencil: true,
    supportsDepthTexture: true,
  });
  this._idFramebuffer = new FramebufferManager({
    depthStencil: true,
    supportsDepthTexture: true,
  });

  this._idClearColor = new Color(0.0, 0.0, 0.0, 0.0);

  this._clearCommand = new ClearCommand({
    color: new Color(0.0, 0.0, 0.0, 0.0),
    depth: 1.0,
    owner: this,
  });
}

function destroyResources(post) {
  post._colorFramebuffer.destroy();
  post._idFramebuffer.destroy();
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
  depthStencilTexture: {
    get: function () {
      return this._colorFramebuffer.getDepthStencilTexture();
    },
  },
});

SceneFramebuffer.prototype.update = function (
  context,
  viewport,
  hdr,
  numSamples,
) {
  const width = viewport.width;
  const height = viewport.height;
  const pixelDatatype = hdr
    ? context.halfFloatingPointTexture
      ? PixelDatatype.HALF_FLOAT
      : PixelDatatype.FLOAT
    : PixelDatatype.UNSIGNED_BYTE;
  this._numSamples = numSamples;
  this._colorFramebuffer.update(
    context,
    width,
    height,
    numSamples,
    pixelDatatype,
  );
  this._idFramebuffer.update(context, width, height);
};

SceneFramebuffer.prototype.clear = function (context, passState, clearColor) {
  Color.clone(clearColor, this._clearCommand.color);
  Color.clone(this._idClearColor, this._clearCommand.color);
  this._colorFramebuffer.clear(context, this._clearCommand, passState);
  this._idFramebuffer.clear(context, this._clearCommand, passState);
};

SceneFramebuffer.prototype.getFramebuffer = function () {
  return this._colorFramebuffer.framebuffer;
};

SceneFramebuffer.prototype.getIdFramebuffer = function () {
  return this._idFramebuffer.framebuffer;
};

SceneFramebuffer.prototype.prepareColorTextures = function (context) {
  if (this._numSamples > 1) {
    this._colorFramebuffer.prepareTextures(context);
  }
};

SceneFramebuffer.prototype.isDestroyed = function () {
  return false;
};

SceneFramebuffer.prototype.destroy = function () {
  destroyResources(this);
  return destroyObject(this);
};
export default SceneFramebuffer;
