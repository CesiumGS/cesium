import Framebuffer from "./Framebuffer.js";
import PixelDatatype from "./PixelDatatype.js";
import Renderbuffer from "./Renderbuffer.js";
import RenderbufferFormat from "./RenderbufferFormat.js";
import Sampler from "./Sampler.js";
import Texture from "./Texture.js";
import Color from "../Core/Color.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import PixelFormat from "../Core/PixelFormat.js";

/**
 * Creates a wrapper object around a framebuffer and its resources.
 *
 * @private
 * @constructor
 */
function FramebufferManager(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  this._createColorAttachments = defaultValue(
    options.createColorAttachments,
    true
  );
  this._createDepthAttachments = defaultValue(
    options.createDepthAttachments,
    true
  );
  this._depthStencil = defaultValue(options.depthStencil, false);
  this._useHdr = false;

  this._framebuffer = undefined;
  this._colorRenderbuffer = undefined;
  this._colorTextures = [];
  this._depthStencilRenderbuffer = undefined;
  this._depthStencilTexture = undefined;
}

Object.defineProperties(FramebufferManager.prototype, {
  framebuffer: {
    get: function () {
      return this._framebuffer;
    },
  },
  depthStencilTexture: {
    get: function () {
      return this._depthStencilTexture;
    },
  },
  status: {
    get: function () {
      return this._framebuffer.status;
    },
  },
});

FramebufferManager.prototype.isDirty = function (width, height, hdr) {
  hdr = defaultValue(hdr, false);
  var texturesDirty = false;
  var length = this._colorTextures.length;

  if (defined(width) && !defined(height)) {
    var texture;
    for (var i = 0; i < length; ++i) {
      texture = this._colorTextures[i];
      if (
        !defined(texture) ||
        texture.width !== width ||
        texture.height !== height
      ) {
        texturesDirty = true;
      }
    }
    return length === 0 || texturesDirty || this._useHdr !== hdr;
  }
  return true;
};

FramebufferManager.prototype.update = function (
  context,
  width,
  height,
  depthTexture,
  hdr
) {
  //>>includeStart('debug', pragmas.debug);
  if (
    (!defined(width) || !defined(height)) &&
    (this._createColorAttachments ||
      (this._depthStencil && this._createDepthAttachments))
  ) {
    throw new DeveloperError(
      "width and height must be provided if color or depth attachments are created"
    );
  }
  //>>includeEnd('debug');
  depthTexture = defaultValue(depthTexture, false);
  hdr = defaultValue(hdr, false);

  if (this.isDirty(width, height, hdr)) {
    this.destroyResources();
    this._useHdr = hdr;

    // Create color texture
    if (this._createColorAttachments) {
      var pixelDatatype = hdr
        ? context.halfFloatingPointTexture
          ? PixelDatatype.HALF_FLOAT
          : PixelDatatype.FLOAT
        : PixelDatatype.UNSIGNED_BYTE;
      this._colorTextures.push(
        new Texture({
          context: context,
          width: width,
          height: height,
          pixelFormat: PixelFormat.RGBA,
          pixelDatatype: pixelDatatype,
          sampler: Sampler.NEAREST,
        })
      );
    }

    // Create depth stencil texture or renderbuffer
    if (this._depthStencil && this._createDepthAttachments) {
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
      colorTextures: this._colorTextures,
      depthStencilTexture: this._depthStencilTexture,
      depthStencilRenderbuffer: this._depthStencilRenderbuffer,
      destroyAttachments: false,
    });
  }
};

FramebufferManager.prototype.getColorTexture = function (index) {
  index = defaultValue(index, 0);
  return this._colorTextures[index];
};

FramebufferManager.prototype.setColorTexture = function (texture, index) {
  //>>includeStart('debug', pragmas.debug);
  if (this._createColorAttachments) {
    throw new DeveloperError(
      "If setColorTexture is called, createColorAttachments must be false."
    );
  }
  //>>includeEnd('debug');
  index = defaultValue(index, 0);
  this._colorTextures[index] = texture;
};

FramebufferManager.prototype.setDepthStencilTexture = function (texture) {
  //>>includeStart('debug', pragmas.debug);
  if (this._createDepthAttachments) {
    throw new DeveloperError(
      "If setDepthStencilTexture is called, createDepthAttachments must be false."
    );
  }
  //>>includeEnd('debug');
  this._depthStencilTexture = texture;
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
  var i;
  var length = this._colorTextures.length;
  for (i = 0; i < length; ++i) {
    var texture = this._colorTextures[i];
    if (defined(texture) && !texture.isDestroyed()) {
      this._colorTextures[i].destroy();
    }
  }
  this._colorTextures = [];

  if (
    defined(this._depthStencilTexture) &&
    !this._depthStencilTexture.isDestroyed()
  ) {
    this._depthStencilTexture.destroy();
  }
  this._depthStencilTexture = undefined;

  if (defined(this._framebuffer)) {
    this._framebuffer.destroy();
    this._framebuffer = undefined;
  }
};
export default FramebufferManager;
