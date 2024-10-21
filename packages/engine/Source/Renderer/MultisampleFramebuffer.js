import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import DeveloperError from "../Core/DeveloperError.js";
import Framebuffer from "./Framebuffer.js";

/**
 * Creates a multisampling wrapper around two framebuffers with optional initial
 * color and depth-stencil attachments. The first framebuffer has multisampled
 * renderbuffer attachments and is bound to READ_FRAMEBUFFER during the blit. The
 * second is bound to DRAW_FRAMEBUFFER during the blit, and has texture attachments
 * to store the copied pixels.
 *
 * @param {object} options Object with the following properties:
 * @param {Context} options.context
 * @param {number} options.width
 * @param {number} options.height
 * @param {Texture[]} [options.colorTextures]
 * @param {Renderbuffer[]} [options.colorRenderbuffers]
 * @param {Texture} [options.depthStencilTexture]
 * @param {Renderbuffer} [options.depthStencilRenderbuffer]
 * @param {boolean} [options.destroyAttachments]
 *
 * @exception {DeveloperError} Both color renderbuffer and texture attachments must be provided.
 * @exception {DeveloperError} Both depth-stencil renderbuffer and texture attachments must be provided.
 *
 * @private
 * @constructor
 */
function MultisampleFramebuffer(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  const {
    context,
    width,
    height,
    colorRenderbuffers,
    colorTextures,
    depthStencilRenderbuffer,
    depthStencilTexture,
    destroyAttachments,
  } = options;

  //>>includeStart('debug', pragmas.debug);
  Check.defined("options.context", context);
  Check.defined("options.width", width);
  Check.defined("options.height", height);
  //>>includeEnd('debug');

  this._width = width;
  this._height = height;

  if (defined(colorRenderbuffers) !== defined(colorTextures)) {
    throw new DeveloperError(
      "Both color renderbuffer and texture attachments must be provided.",
    );
  }

  if (defined(depthStencilRenderbuffer) !== defined(depthStencilTexture)) {
    throw new DeveloperError(
      "Both depth-stencil renderbuffer and texture attachments must be provided.",
    );
  }

  this._renderFramebuffer = new Framebuffer({
    context: context,
    colorRenderbuffers: colorRenderbuffers,
    depthStencilRenderbuffer: depthStencilRenderbuffer,
    destroyAttachments: destroyAttachments,
  });
  this._colorFramebuffer = new Framebuffer({
    context: context,
    colorTextures: colorTextures,
    depthStencilTexture: depthStencilTexture,
    destroyAttachments: destroyAttachments,
  });
}

MultisampleFramebuffer.prototype.getRenderFramebuffer = function () {
  return this._renderFramebuffer;
};

MultisampleFramebuffer.prototype.getColorFramebuffer = function () {
  return this._colorFramebuffer;
};

/**
 * Copy from the render framebuffer to the color framebuffer, resolving the stencil.
 *
 * @param {Context} context
 * @param {boolean} blitStencil <code>true</code> if the stencil mask should be applied.
 *
 * @private
 */
MultisampleFramebuffer.prototype.blitFramebuffers = function (
  context,
  blitStencil,
) {
  this._renderFramebuffer.bindRead();
  this._colorFramebuffer.bindDraw();
  const gl = context._gl;
  let mask = 0;
  if (this._colorFramebuffer._colorTextures.length > 0) {
    mask |= gl.COLOR_BUFFER_BIT;
  }
  if (defined(this._colorFramebuffer.depthStencilTexture)) {
    mask |= gl.DEPTH_BUFFER_BIT | (blitStencil ? gl.STENCIL_BUFFER_BIT : 0);
  }
  gl.blitFramebuffer(
    0,
    0,
    this._width,
    this._height,
    0,
    0,
    this._width,
    this._height,
    mask,
    gl.NEAREST,
  );
  gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
  gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
};

MultisampleFramebuffer.prototype.isDestroyed = function () {
  return false;
};

MultisampleFramebuffer.prototype.destroy = function () {
  this._renderFramebuffer.destroy();
  this._colorFramebuffer.destroy();
  return destroyObject(this);
};

export default MultisampleFramebuffer;
