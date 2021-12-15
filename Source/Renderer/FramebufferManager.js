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
 * @param {Object} options Object with the following properties:
 * @param {Number} [options.colorAttachmentsLength=1] The number of color attachments this FramebufferManager will create.
 * @param {Boolean} [options.color=true] Whether the FramebufferManager will use color attachments.
 * @param {Boolean} [options.depth=false] Whether the FramebufferManager will use depth attachments.
 * @param {Boolean} [options.depthStencil=false] Whether the FramebufferManager will use depth-stencil attachments.
 * @param {Boolean} [options.createColorAttachments=true] Whether the FramebufferManager will construct its own color attachments.
 * @param {Boolean} [options.createDepthAttachments=true] Whether the FramebufferManager will construct its own depth attachments.*
 *
 * @exception {DeveloperError} Cannot have both a depth and depth-stencil attachment.
 *
 * @private
 * @constructor
 */
function FramebufferManager(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  this._colorAttachmentsLength = defaultValue(
    options.colorAttachmentsLength,
    1
  );

  this._color = defaultValue(options.color, true);
  this._depth = defaultValue(options.depth, false);
  this._depthStencil = defaultValue(options.depthStencil, false);
  //>>includeStart('debug', pragmas.debug);
  if (!this._color && !this._depth && !this._depthStencil) {
    throw new DeveloperError(
      "must enable at least one type of framebuffer attachment."
    );
  }
  if (this._depth && this._depthStencil) {
    throw new DeveloperError(
      "Cannot have both a depth and depth-stencil attachment."
    );
  }
  //>>includeEnd('debug');

  this._createColorAttachments = defaultValue(
    options.createColorAttachments,
    true
  );
  this._createDepthAttachments = defaultValue(
    options.createDepthAttachments,
    true
  );

  this._width = undefined;
  this._height = undefined;
  this._pixelDatatype = undefined;

  this._framebuffer = undefined;
  this._colorTextures = undefined;
  if (this._color) {
    this._colorTextures = new Array(this._colorAttachmentsLength);
  }
  this._depthStencilRenderbuffer = undefined;
  this._depthStencilTexture = undefined;
  this._depthRenderbuffer = undefined;
  this._depthTexture = undefined;
}

Object.defineProperties(FramebufferManager.prototype, {
  framebuffer: {
    get: function () {
      return this._framebuffer;
    },
  },
  status: {
    get: function () {
      return this._framebuffer.status;
    },
  },
});

FramebufferManager.prototype.isDirty = function (width, height, pixelDatatype) {
  var dimensionChanged = this._width !== width || this._height !== height;
  var attachmentsNeedUpdate =
    (this._color && !defined(this._colorTextures[0])) ||
    (this._color && !this._createColorAttachments) ||
    (this._depth && !this._createDepthAttachments) ||
    (this._depthStencil && !this._createDepthAttachments);
  var datatypeChanged =
    defined(pixelDatatype) && this._pixelDatatype !== pixelDatatype;

  return dimensionChanged || attachmentsNeedUpdate || datatypeChanged;
};

FramebufferManager.prototype.update = function (
  context,
  width,
  height,
  depthTexture,
  pixelDatatype
) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(width) || !defined(height)) {
    throw new DeveloperError("width and height must be defined.");
  }
  //>>includeEnd('debug');
  depthTexture = defaultValue(depthTexture, false);
  pixelDatatype = defaultValue(
    pixelDatatype,
    this._color ? PixelDatatype.UNSIGNED_BYTE : undefined
  );

  if (this.isDirty(width, height, pixelDatatype)) {
    this.destroyResources();
    this._width = width;
    this._height = height;
    this._pixelDatatype = pixelDatatype;

    // Create color texture
    if (this._color && this._createColorAttachments) {
      for (var i = 0; i < this._colorAttachmentsLength; ++i) {
        this._colorTextures[i] = new Texture({
          context: context,
          width: width,
          height: height,
          pixelFormat: PixelFormat.RGBA,
          pixelDatatype: pixelDatatype,
          sampler: Sampler.NEAREST,
        });
      }
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

    // Create depth texture
    if (this._depth && this._createDepthAttachments) {
      if (depthTexture) {
        this._depthTexture = new Texture({
          context: context,
          width: width,
          height: height,
          pixelFormat: PixelFormat.DEPTH_COMPONENT,
          pixelDatatype: PixelDatatype.UNSIGNED_INT,
          sampler: Sampler.NEAREST,
        });
      } else {
        this._depthRenderbuffer = new Renderbuffer({
          context: context,
          width: width,
          height: height,
          format: RenderbufferFormat.DEPTH_COMPONENT16,
        });
      }
    }

    this._framebuffer = new Framebuffer({
      context: context,
      colorTextures: this._colorTextures,
      depthTexture: this._depthTexture,
      depthRenderbuffer: this._depthRenderbuffer,
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
      "createColorAttachments must be false if setColorTexture is called."
    );
  }
  if (index >= this._colorAttachmentsLength) {
    throw new DeveloperError(
      "index must be smaller than total number of color attachments."
    );
  }
  //>>includeEnd('debug');
  index = defaultValue(index, 0);
  this._colorTextures[index] = texture;
};

FramebufferManager.prototype.getDepthStencilRenderbuffer = function () {
  return this._depthStencilRenderbuffer;
};

FramebufferManager.prototype.setDepthStencilRenderbuffer = function (
  renderbuffer
) {
  //>>includeStart('debug', pragmas.debug);
  if (this._createDepthAttachments) {
    throw new DeveloperError(
      "createDepthAttachments must be false if setDepthStencilRenderbuffer is called."
    );
  }
  //>>includeEnd('debug');
  this._depthStencilRenderbuffer = renderbuffer;
};

FramebufferManager.prototype.getDepthStencilTexture = function () {
  return this._depthStencilTexture;
};

FramebufferManager.prototype.setDepthStencilTexture = function (texture) {
  //>>includeStart('debug', pragmas.debug);
  if (this._createDepthAttachments) {
    throw new DeveloperError(
      "createDepthAttachments must be false if setDepthStencilTexture is called."
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
  var clearCommandColor = clearCommand.color;

  passState.framebuffer = this._framebuffer;
  clearCommand.color = Color.clone(clearColor, clearCommand.color);
  clearCommand.execute(context, passState);

  clearCommand.color = clearCommandColor;
  passState.framebuffer = framebuffer;
};

FramebufferManager.prototype.destroyFramebuffer = function () {
  this._framebuffer = this._framebuffer && this._framebuffer.destroy();
};

FramebufferManager.prototype.destroyResources = function () {
  if (this._color && this._createColorAttachments) {
    var length = this._colorTextures.length;
    for (var i = 0; i < length; ++i) {
      var texture = this._colorTextures[i];
      if (defined(texture) && !texture.isDestroyed()) {
        this._colorTextures[i].destroy();
        this._colorTextures[i] = undefined;
      }
    }
  }

  if (this._depthStencil && this._createDepthAttachments) {
    this._depthStencilTexture =
      this._depthStencilTexture && this._depthStencilTexture.destroy();
    this._depthStencilRenderbuffer =
      this._depthStencilRenderbuffer &&
      this._depthStencilRenderbuffer.destroy();
  }

  if (this._depth && this._createDepthAttachments) {
    this._depthTexture = this._depthTexture && this._depthTexture.destroy();
    this._depthRenderbuffer =
      this._depthRenderbuffer && this._depthRenderbuffer.destroy();
  }

  this.destroyFramebuffer();
};
export default FramebufferManager;
