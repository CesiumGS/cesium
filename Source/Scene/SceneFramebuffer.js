import Color from "../Core/Color.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import PixelFormat from "../Core/PixelFormat.js";
import ClearCommand from "../Renderer/ClearCommand.js";
import Framebuffer from "../Renderer/Framebuffer.js";
import PixelDatatype from "../Renderer/PixelDatatype.js";
import Renderbuffer from "../Renderer/Renderbuffer.js";
import RenderbufferFormat from "../Renderer/RenderbufferFormat.js";
import Sampler from "../Renderer/Sampler.js";
import Texture from "../Renderer/Texture.js";

/**
 * @private
 */
function SceneFramebuffer() {
  this._colorTexture = undefined;
  this._colorRenderbuffer = undefined;
  this._idTexture = undefined;
  this._depthStencilTexture = undefined;
  this._depthStencilRenderbuffer = undefined;
  this._framebufferAA = undefined;
  this._framebufferDraw = undefined;
  this._idFramebuffer = undefined;

  this._idClearColor = new Color(0.0, 0.0, 0.0, 0.0);

  this._useHdr = undefined;

  this._clearCommand = new ClearCommand({
    color: new Color(0.0, 0.0, 0.0, 0.0),
    depth: 1.0,
    owner: this,
  });
}

function destroyResources(post) {
  post._framebufferAA = post._framebufferAA && post._framebufferAA.destroy();
  post._framebufferDraw =
    post._framebufferDraw && post._framebufferDraw.destroy();
  post._idFramebuffer = post._idFramebuffer && post._idFramebuffer.destroy();
  post._colorTexture = post._colorTexture && post._colorTexture.destroy();
  post._colorRenderbuffer =
    post._colorRenderbuffer && post._colorRenderbuffer.destroy();
  post._idTexture = post._idTexture && post._idTexture.destroy();
  post._depthStencilTexture =
    post._depthStencilTexture && post._depthStencilTexture.destroy();
  post._depthStencilRenderbuffer =
    post._depthStencilRenderbuffer && post._depthStencilRenderbuffer.destroy();
  post._depthStencilIdTexture =
    post._depthStencilIdTexture && post._depthStencilIdTexture.destroy();
  post._depthStencilIdRenderbuffer =
    post._depthStencilIdRenderbuffer &&
    post._depthStencilIdRenderbuffer.destroy();

  post._framebufferAA = undefined;
  post._framebufferDraw = undefined;
  post._idFramebuffer = undefined;
  post._colorTexture = undefined;
  post._colorRenderbuffer = undefined;
  post._idTexture = undefined;
  post._depthStencilTexture = undefined;
  post._depthStencilRenderbuffer = undefined;
  post._depthStencilIdTexture = undefined;
  post._depthStencilIdRenderbuffer = undefined;
}

SceneFramebuffer.prototype.update = function (context, viewport, hdr) {
  var width = viewport.width;
  var height = viewport.height;
  var colorTexture = this._colorTexture;
  var colorRenderbuffer = this._colorRenderbuffer;
  if (
    defined(colorTexture) &&
    colorTexture.width === width &&
    colorTexture.height === height &&
    hdr === this._useHdr
  ) {
    return;
  }

  if (
    defined(colorRenderbuffer) &&
    colorRenderbuffer.width === width &&
    colorRenderbuffer.height === height &&
    hdr === this._useHdr
  ) {
    return;
  }

  destroyResources(this);
  this._useHdr = hdr;

  var pixelDatatype = hdr
    ? context.halfFloatingPointTexture
      ? PixelDatatype.HALF_FLOAT
      : PixelDatatype.FLOAT
    : PixelDatatype.UNSIGNED_BYTE;
  this._colorTexture = new Texture({
    context: context,
    width: width,
    height: height,
    pixelFormat: PixelFormat.RGBA,
    pixelDatatype: pixelDatatype,
    sampler: Sampler.NEAREST,
  });

  this._colorRenderbuffer = new Renderbuffer({
    context: context,
    width: width,
    height: height,
    format: RenderbufferFormat.RGBA8,
    multisample: true,
    numSamples: 8,
  });

  this._idTexture = new Texture({
    context: context,
    width: width,
    height: height,
    pixelFormat: PixelFormat.RGBA,
    pixelDatatype: PixelDatatype.UNSIGNED_BYTE,
    sampler: Sampler.NEAREST,
  });

  if (context.depthTexture) {
    this._depthStencilTexture = new Texture({
      context: context,
      width: width,
      height: height,
      pixelFormat: PixelFormat.DEPTH_STENCIL,
      pixelDatatype: PixelDatatype.UNSIGNED_INT_24_8,
      sampler: Sampler.NEAREST,
    });
    this._depthStencilIdTexture = new Texture({
      context: context,
      width: width,
      height: height,
      pixelFormat: PixelFormat.DEPTH_STENCIL,
      pixelDatatype: PixelDatatype.UNSIGNED_INT_24_8,
      sampler: Sampler.NEAREST,
    });
  } else {
    this._depthStencilRenderbuffer = new Renderbuffer({
      context: context,
      width: width,
      height: height,
      format: RenderbufferFormat.DEPTH24_STENCIL8,
      multisample: true,
      numSamples: 8,
    });
    this._depthStencilIdRenderbuffer = new Renderbuffer({
      context: context,
      width: width,
      height: height,
      format: RenderbufferFormat.DEPTH_STENCIL,
    });
  }

  this._framebufferAA = new Framebuffer({
    context: context,
    // colorTextures: [this._colorTexture],
    colorRenderbuffers: [this._colorRenderbuffer],
    // depthStencilTexture: this._depthStencilTexture,
    depthStencilRenderbuffer: this._depthStencilRenderbuffer,
    destroyAttachments: false,
  });

  this._framebufferDraw = new Framebuffer({
    context: context,
    colorTextures: [this._colorTexture],
    depthStencilTexture: this._depthStencilTexture,
    // depthStencilRenderbuffer: this._depthStencilRenderbuffer,
    destroyAttachments: false,
  });

  this._idFramebuffer = new Framebuffer({
    context: context,
    colorTextures: [this._idTexture],
    depthStencilTexture: this._depthStencilIdTexture,
    depthStencilRenderbuffer: this._depthStencilIdRenderbuffer,
    destroyAttachments: false,
  });
};

SceneFramebuffer.prototype.clear = function (context, passState, clearColor) {
  var framebuffer = passState.framebuffer;

  passState.framebuffer = this._framebufferAA;
  Color.clone(clearColor, this._clearCommand.color);
  this._clearCommand.execute(context, passState);

  passState.framebuffer = this._framebufferDraw;
  Color.clone(clearColor, this._clearCommand.color);
  this._clearCommand.execute(context, passState);

  passState.framebuffer = this._idFramebuffer;
  Color.clone(this._idClearColor, this._clearCommand.color);
  this._clearCommand.execute(context, passState);

  passState.framebuffer = framebuffer;
};

SceneFramebuffer.prototype.getFramebufferAA = function () {
  return this._framebufferAA;
};

SceneFramebuffer.prototype.getFramebufferDraw = function () {
  return this._framebufferDraw;
};

SceneFramebuffer.prototype.blitColorFramebuffers = function (context) {
  this._framebufferAA.bindRead();
  this._framebufferDraw.bindDraw();
  var width = context.canvas.clientWidth;
  var height = context.canvas.clientHeight;
  var gl = context._gl;
  gl.blitFramebuffer(
    0,
    0,
    width,
    height,
    0,
    0,
    width,
    height,
    gl.COLOR_BUFFER_BIT,
    gl.LINEAR
  );
};

SceneFramebuffer.prototype.getIdFramebuffer = function () {
  return this._idFramebuffer;
};

SceneFramebuffer.prototype.isDestroyed = function () {
  return false;
};

SceneFramebuffer.prototype.destroy = function () {
  destroyResources(this);
  return destroyObject(this);
};
export default SceneFramebuffer;
