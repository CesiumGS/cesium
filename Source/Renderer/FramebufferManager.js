import Framebuffer from "./Framebuffer.js";
import MultisampleFramebuffer from "./MultisampleFramebuffer.js";
import PixelDatatype from "./PixelDatatype.js";
import Renderbuffer from "./Renderbuffer.js";
import RenderbufferFormat from "./RenderbufferFormat.js";
import Sampler from "./Sampler.js";
import Texture from "./Texture.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import PixelFormat from "../Core/PixelFormat.js";

/**
 * Creates a wrapper object around a framebuffer and its resources.
 *
 * @param {Object} options Object with the following properties:
 * @param {Number} [options.numSamples=1] The multisampling rate of the render targets. Requires a WebGL2 context.
 * @param {Number} [options.colorAttachmentsLength=1] The number of color attachments this FramebufferManager will create.
 * @param {Boolean} [options.color=true] Whether the FramebufferManager will use color attachments.
 * @param {Boolean} [options.depth=false] Whether the FramebufferManager will use depth attachments.
 * @param {Boolean} [options.depthStencil=false] Whether the FramebufferManager will use depth-stencil attachments.
 * @param {Boolean} [options.supportsDepthTexture=false] Whether the FramebufferManager will create a depth texture when the extension is supported.
 * @param {Boolean} [options.createColorAttachments=true] Whether the FramebufferManager will construct its own color attachments.
 * @param {Boolean} [options.createDepthAttachments=true] Whether the FramebufferManager will construct its own depth attachments.
 * @param {PixelDatatype} [options.pixelDatatype=undefined] The default pixel datatype to use when creating color attachments.
 * @param {PixelFormat} [options.pixelFormat=undefined] The default pixel format to use when creating color attachments.
 *
 * @exception {DeveloperError} Must enable at least one type of framebuffer attachment.
 * @exception {DeveloperError} Cannot have both a depth and depth-stencil attachment.
 *
 * @private
 * @constructor
 */
function FramebufferManager(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  this._numSamples = defaultValue(options.numSamples, 1);
  this._colorAttachmentsLength = defaultValue(
    options.colorAttachmentsLength,
    1
  );

  this._color = defaultValue(options.color, true);
  this._depth = defaultValue(options.depth, false);
  this._depthStencil = defaultValue(options.depthStencil, false);
  this._supportsDepthTexture = defaultValue(
    options.supportsDepthTexture,
    false
  );
  //>>includeStart('debug', pragmas.debug);
  if (!this._color && !this._depth && !this._depthStencil) {
    throw new DeveloperError(
      "Must enable at least one type of framebuffer attachment."
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

  this._pixelDatatype = options.pixelDatatype;
  this._pixelFormat = options.pixelFormat;

  this._width = undefined;
  this._height = undefined;

  this._framebuffer = undefined;
  this._multisampleFramebuffer = undefined;
  this._colorTextures = undefined;
  if (this._color) {
    this._colorTextures = new Array(this._colorAttachmentsLength);
    this._colorRenderbuffers = new Array(this._colorAttachmentsLength);
  }
  this._colorRenderbuffer = undefined;
  this._depthStencilRenderbuffer = undefined;
  this._depthStencilTexture = undefined;
  this._depthRenderbuffer = undefined;
  this._depthTexture = undefined;

  this._attachmentsDirty = false;
}

Object.defineProperties(FramebufferManager.prototype, {
  framebuffer: {
    get: function () {
      if (this._numSamples > 1) {
        return this._multisampleFramebuffer.getRenderFramebuffer();
      }
      return this._framebuffer;
    },
  },
  numSamples: {
    get: function () {
      return this._numSamples;
    },
  },
  status: {
    get: function () {
      return this.framebuffer.status;
    },
  },
});

FramebufferManager.prototype.isDirty = function (
  width,
  height,
  numSamples,
  pixelDatatype,
  pixelFormat
) {
  numSamples = defaultValue(numSamples, 1);
  const dimensionChanged = this._width !== width || this._height !== height;
  const samplesChanged = this._numSamples !== numSamples;
  const pixelChanged =
    (defined(pixelDatatype) && this._pixelDatatype !== pixelDatatype) ||
    (defined(pixelFormat) && this._pixelFormat !== pixelFormat);
  const framebufferDefined =
    numSamples === 1
      ? defined(this._framebuffer)
      : defined(this._multisampleFramebuffer);

  return (
    this._attachmentsDirty ||
    dimensionChanged ||
    samplesChanged ||
    pixelChanged ||
    !framebufferDefined ||
    (this._color && !defined(this._colorTextures[0]))
  );
};

FramebufferManager.prototype.update = function (
  context,
  width,
  height,
  numSamples,
  pixelDatatype,
  pixelFormat
) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(width) || !defined(height)) {
    throw new DeveloperError("width and height must be defined.");
  }
  //>>includeEnd('debug');
  numSamples = context.msaa ? defaultValue(numSamples, 1) : 1;
  pixelDatatype = defaultValue(
    pixelDatatype,
    this._color
      ? defaultValue(this._pixelDatatype, PixelDatatype.UNSIGNED_BYTE)
      : undefined
  );
  pixelFormat = defaultValue(
    pixelFormat,
    this._color ? defaultValue(this._pixelFormat, PixelFormat.RGBA) : undefined
  );

  if (this.isDirty(width, height, numSamples, pixelDatatype, pixelFormat)) {
    this.destroy();
    this._width = width;
    this._height = height;
    this._numSamples = numSamples;
    this._pixelDatatype = pixelDatatype;
    this._pixelFormat = pixelFormat;
    this._attachmentsDirty = false;

    // Create color texture
    if (this._color && this._createColorAttachments) {
      for (let i = 0; i < this._colorAttachmentsLength; ++i) {
        this._colorTextures[i] = new Texture({
          context: context,
          width: width,
          height: height,
          pixelFormat: pixelFormat,
          pixelDatatype: pixelDatatype,
          sampler: Sampler.NEAREST,
        });
        if (this._numSamples > 1) {
          const format = RenderbufferFormat.getColorFormat(pixelDatatype);
          this._colorRenderbuffers[i] = new Renderbuffer({
            context: context,
            width: width,
            height: height,
            format: format,
            numSamples: this._numSamples,
          });
        }
      }
    }

    // Create depth stencil texture or renderbuffer
    if (this._depthStencil && this._createDepthAttachments) {
      if (this._supportsDepthTexture && context.depthTexture) {
        this._depthStencilTexture = new Texture({
          context: context,
          width: width,
          height: height,
          pixelFormat: PixelFormat.DEPTH_STENCIL,
          pixelDatatype: PixelDatatype.UNSIGNED_INT_24_8,
          sampler: Sampler.NEAREST,
        });
        if (this._numSamples > 1) {
          this._depthStencilRenderbuffer = new Renderbuffer({
            context: context,
            width: width,
            height: height,
            format: RenderbufferFormat.DEPTH24_STENCIL8,
            numSamples: this._numSamples,
          });
        }
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
      if (this._supportsDepthTexture && context.depthTexture) {
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

    if (this._numSamples > 1) {
      this._multisampleFramebuffer = new MultisampleFramebuffer({
        context: context,
        width: this._width,
        height: this._height,
        colorTextures: this._colorTextures,
        colorRenderbuffers: this._colorRenderbuffers,
        depthStencilTexture: this._depthStencilTexture,
        depthStencilRenderbuffer: this._depthStencilRenderbuffer,
        destroyAttachments: false,
      });
    } else {
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
  }
};

FramebufferManager.prototype.getColorTexture = function (index) {
  index = defaultValue(index, 0);
  //>>includeStart('debug', pragmas.debug);
  if (index >= this._colorAttachmentsLength) {
    throw new DeveloperError(
      "index must be smaller than total number of color attachments."
    );
  }
  //>>includeEnd('debug');
  return this._colorTextures[index];
};

FramebufferManager.prototype.setColorTexture = function (texture, index) {
  index = defaultValue(index, 0);
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
  this._attachmentsDirty = texture !== this._colorTextures[index];
  this._colorTextures[index] = texture;
};

FramebufferManager.prototype.getColorRenderbuffer = function (index) {
  index = defaultValue(index, 0);
  //>>includeStart('debug', pragmas.debug);
  if (index >= this._colorAttachmentsLength) {
    throw new DeveloperError(
      "index must be smaller than total number of color attachments."
    );
  }
  //>>includeEnd('debug');
  return this._colorRenderbuffers[index];
};

FramebufferManager.prototype.setColorRenderbuffer = function (
  renderbuffer,
  index
) {
  index = defaultValue(index, 0);
  //>>includeStart('debug', pragmas.debug);
  if (this._createColorAttachments) {
    throw new DeveloperError(
      "createColorAttachments must be false if setColorRenderbuffer is called."
    );
  }
  if (index >= this._colorAttachmentsLength) {
    throw new DeveloperError(
      "index must be smaller than total number of color attachments."
    );
  }
  //>>includeEnd('debug');
  this._attachmentsDirty = renderbuffer !== this._colorRenderbuffers[index];
  this._colorRenderbuffers[index] = renderbuffer;
};

FramebufferManager.prototype.getDepthRenderbuffer = function () {
  return this._depthRenderbuffer;
};

FramebufferManager.prototype.setDepthRenderbuffer = function (renderbuffer) {
  //>>includeStart('debug', pragmas.debug);
  if (this._createDepthAttachments) {
    throw new DeveloperError(
      "createDepthAttachments must be false if setDepthRenderbuffer is called."
    );
  }
  //>>includeEnd('debug');
  this._attachmentsDirty = renderbuffer !== this._depthRenderbuffer;
  this._depthRenderbuffer = renderbuffer;
};

FramebufferManager.prototype.getDepthTexture = function () {
  return this._depthTexture;
};

FramebufferManager.prototype.setDepthTexture = function (texture) {
  //>>includeStart('debug', pragmas.debug);
  if (this._createDepthAttachments) {
    throw new DeveloperError(
      "createDepthAttachments must be false if setDepthTexture is called."
    );
  }
  //>>includeEnd('debug');
  this._attachmentsDirty = texture !== this._depthTexture;
  this._depthTexture = texture;
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
  this._attachmentsDirty = renderbuffer !== this._depthStencilRenderbuffer;
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
  this._attachmentsDirty = texture !== this._depthStencilTexture;
  this._depthStencilTexture = texture;
};

FramebufferManager.prototype.prepareTextures = function (context, blitStencil) {
  if (this._numSamples > 1) {
    this._multisampleFramebuffer.blitFramebuffers(context, blitStencil);
  }
};

FramebufferManager.prototype.clear = function (
  context,
  clearCommand,
  passState
) {
  const framebuffer = clearCommand.framebuffer;
  clearCommand.framebuffer = this.framebuffer;
  clearCommand.execute(context, passState);
  clearCommand.framebuffer = framebuffer;
};

FramebufferManager.prototype.destroyFramebuffer = function () {
  this._framebuffer = this._framebuffer && this._framebuffer.destroy();
  this._multisampleFramebuffer =
    this._multisampleFramebuffer && this._multisampleFramebuffer.destroy();
};

FramebufferManager.prototype.destroy = function () {
  if (this._color) {
    let i;
    const length = this._colorTextures.length;
    for (i = 0; i < length; ++i) {
      const texture = this._colorTextures[i];
      if (this._createColorAttachments) {
        if (defined(texture) && !texture.isDestroyed()) {
          this._colorTextures[i].destroy();
          this._colorTextures[i] = undefined;
        }
      }
      if (defined(texture) && texture.isDestroyed()) {
        this._colorTextures[i] = undefined;
      }
      const renderbuffer = this._colorRenderbuffers[i];
      if (this._createColorAttachments) {
        if (defined(renderbuffer) && !renderbuffer.isDestroyed()) {
          this._colorRenderbuffers[i].destroy();
          this._colorRenderbuffers[i] = undefined;
        }
      }
      if (defined(renderbuffer) && renderbuffer.isDestroyed()) {
        this._colorRenderbuffers[i] = undefined;
      }
    }
  }

  if (this._depthStencil) {
    if (this._createDepthAttachments) {
      this._depthStencilTexture =
        this._depthStencilTexture && this._depthStencilTexture.destroy();
      this._depthStencilRenderbuffer =
        this._depthStencilRenderbuffer &&
        this._depthStencilRenderbuffer.destroy();
    }
    if (
      defined(this._depthStencilTexture) &&
      this._depthStencilTexture.isDestroyed()
    ) {
      this._depthStencilTexture = undefined;
    }
    if (
      defined(this._depthStencilRenderbuffer) &&
      this._depthStencilRenderbuffer.isDestroyed()
    ) {
      this._depthStencilRenderbuffer = undefined;
    }
  }

  if (this._depth) {
    if (this._createDepthAttachments) {
      this._depthTexture = this._depthTexture && this._depthTexture.destroy();
      this._depthRenderbuffer =
        this._depthRenderbuffer && this._depthRenderbuffer.destroy();
    }
    if (defined(this._depthTexture) && this._depthTexture.isDestroyed()) {
      this._depthTexture = undefined;
    }
    if (
      defined(this._depthRenderbuffer) &&
      this._depthRenderbuffer.isDestroyed()
    ) {
      this._depthRenderbuffer = undefined;
    }
  }

  this.destroyFramebuffer();
};
export default FramebufferManager;
