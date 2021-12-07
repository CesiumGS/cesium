import Framebuffer from "./Framebuffer.js";
import PixelDatatype from "./PixelDatatype.js";
import Renderbuffer from "./Renderbuffer.js";
import RenderbufferFormat from "./RenderbufferFormat.js";
import Sampler from "./Sampler.js";
import Texture from "./Texture.js";
import Color from "../Core/Color.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import PixelFormat from "../Core/PixelFormat.js";

/**
 * Creates a wrapper object around a framebuffer and its resources.
 *
 * @private
 * @constructor
 */
function FramebufferManager(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  this._depthStencil = defaultValue(options.depthStencil, false);
  this._useHdr = false;

  this._framebuffer = undefined;
  this._colorRenderbuffer = undefined;
  this._colorTexture = undefined;
  this._depthStencilRenderbuffer = undefined;
  this._depthStencilTexture = undefined;
}

FramebufferManager.prototype.isDirty = function (width, height, hdr) {
  hdr = defaultValue(hdr, false);
  var colorTexture = this._colorTexture;
  return (
    !defined(colorTexture) ||
    colorTexture.width !== width ||
    colorTexture.height !== height ||
    this._useHdr !== hdr
  );
};

FramebufferManager.prototype.update = function (
  context,
  width,
  height,
  depthTexture,
  hdr
) {
  depthTexture = defaultValue(depthTexture, false);
  hdr = defaultValue(hdr, false);

  if (this.isDirty(width, height, hdr)) {
    this.destroyResources();
    this._useHdr = hdr;

    // Create color texture
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

    // Create depth stencil texture or renderbuffer
    if (this._depthStencil) {
      if (depthTexture) {
        this._depthStencilTexture = new Texture({
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
          format: RenderbufferFormat.DEPTH_STENCIL,
        });
      }
    }

    this._framebuffer = new Framebuffer({
      context: context,
      colorTextures: [this._colorTexture],
      depthStencilTexture: this._depthStencilTexture,
      depthStencilRenderbuffer: this._depthStencilRenderbuffer,
      destroyAttachments: false,
    });
  }
};

FramebufferManager.prototype.getFramebuffer = function () {
  return this._framebuffer;
};

FramebufferManager.prototype.clear = function (
  context,
  passState,
  clearColor,
  clearCommand
) {
  var framebuffer = passState.framebuffer;

  passState.framebuffer = this._framebuffer;
  Color.clone(clearColor, clearCommand.color);
  clearCommand.execute(context, passState);

  passState.framebuffer = framebuffer;
};

FramebufferManager.prototype.destroyResources = function () {
  if (defined(this._framebuffer)) {
    this._framebuffer.destroy();
    this._framebuffer = undefined;
  }
};
export default FramebufferManager;
