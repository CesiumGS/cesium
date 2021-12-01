import Framebuffer from "./Framebuffer.js";
import MultisampleFramebuffer from "./MultisampleFramebuffer.js";
import PixelDatatype from "./PixelDatatype.js";
import Renderbuffer from "./Renderbuffer.js";
import RenderbufferFormat from "./RenderbufferFormat.js";
import Sampler from "./Sampler.js";
import Texture from "./Texture.js";
import Color from "../Core/Color.js";
import defined from "../Core/defined.js";
import defaultValue from "../Core/defaultValue.js";
import PixelFormat from "../Core/PixelFormat.js";

/**
 * Creates a wrapper object around a framebuffer and its resources.
 *
 * @private
 * @constructor
 */
function FramebufferManager(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  this._numSamples = defaultValue(options.numSamples, 1);
  this._useHdr = false;

  this._framebuffer = undefined;
  this._multisampleFramebuffer = undefined;
  this._colorRenderbuffer = undefined;
  this._colorTexture = undefined;
  this._depthStencilRenderbuffer = undefined;
  this._depthStencilTexture = undefined;
}

FramebufferManager.prototype.update = function (
  context,
  viewport,
  hdr,
  numSamples
) {
  var width = viewport.width;
  var height = viewport.height;
  var colorTexture = this._colorTexture;
  hdr = defaultValue(hdr, false);
  numSamples = defaultValue(numSamples, 1);

  if (
    defined(colorTexture) &&
    colorTexture.width === width &&
    colorTexture.height === height &&
    hdr === this._useHdr &&
    numSamples === this._numSamples
  ) {
    return;
  }

  this.destroyResources();
  this._useHdr = hdr;
  this._numSamples = numSamples;

  // Create color texture and/or renderbuffer
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

  if (this._numSamples > 1) {
    this._colorRenderbuffer = new Renderbuffer({
      context: context,
      width: width,
      height: height,
      format: RenderbufferFormat.RGBA8,
      numSamples: this._numSamples,
    });
  }

  // Create depth texture and/or renderbuffer
  if (context.depthTexture) {
    this._depthStencilTexture = new Texture({
      context: context,
      width: width,
      height: height,
      pixelFormat: PixelFormat.DEPTH_STENCIL,
      pixelDatatype: PixelDatatype.UNSIGNED_INT_24_8,
      sampler: Sampler.NEAREST,
    });
  } else if (this._numSamples > 1) {
    this._depthStencilRenderbuffer = new Renderbuffer({
      context: context,
      width: width,
      height: height,
      format: RenderbufferFormat.DEPTH24_STENCIL8,
      numSamples: this._numSamples,
    });
  } else {
    this._depthStencilRenderbuffer = new Renderbuffer({
      context: context,
      width: width,
      height: height,
      format: RenderbufferFormat.DEPTH_STENCIL,
    });
  }

  // Create color framebuffer
  if (this._multisampleFramebuffer > 1) {
    this._framebuffer = new MultisampleFramebuffer({
      context: context,
      colorTexture: this._colorTexture,
      colorRenderbuffer: this._colorRenderbuffer,
      depthStencilTexture: this._depthStencilTexture,
      depthStencilRenderbuffer: this._depthStencilRenderbuffer,
      destroyAttachments: false,
    });
  } else {
    this._framebuffer = new Framebuffer({
      context: context,
      colorTextures: [this._colorTexture],
      depthStencilTexture: this._depthStencilTexture,
      depthStencilRenderbuffer: this._depthStencilRenderbuffer,
      destroyAttachments: false,
    });
  }
};

FramebufferManager.prototype.clear = function (
  context,
  passState,
  clearColor,
  clearCommand
) {
  var framebuffer = passState.framebuffer;
  if (this._numSamples > 1) {
    passState.framebuffer = this._multisampleFramebuffer.getRenderFramebuffer();
    Color.clone(clearColor, clearCommand.color);
    clearCommand.execute(context, passState);

    passState.framebuffer = this._multisampleFramebuffer.getColorFramebuffer();
    Color.clone(clearColor, clearCommand.color);
    clearCommand.execute(context, passState);
  } else {
    passState.framebuffer = this._framebuffer;
    Color.clone(clearColor, clearCommand.color);
    clearCommand.execute(context, passState);
  }

  passState.framebuffer = framebuffer;
};

FramebufferManager.prototype.destroyResources = function () {
  if (defined(this._framebuffer)) {
    this._framebuffer.destroy();
  }
  if (defined(this._multisampleFramebuffer)) {
    this._multisampleFramebuffer.destroy();
  }
};
export default FramebufferManager;
