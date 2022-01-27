import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import Framebuffer from "./Framebuffer.js";

/**
 * Creates a multisampling wrapper around two framebuffers with optional initial color, depth, and stencil attachments.
 *
 * @param {Object} options The initial framebuffer attachments as shown in the example below. <code>context</code> is required. The possible properties are <code>colorTextures</code>, <code>colorRenderbuffers</code>, <code>depthTexture</code>, <code>depthRenderbuffer</code>, <code>stencilRenderbuffer</code>, <code>depthStencilTexture</code>, and <code>depthStencilRenderbuffer</code>.
 *
 * @private
 * @constructor
 */
function MultisampleFramebuffer(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  const context = options.context;
  const colorRenderbuffers = options.colorRenderbuffers;
  const colorTextures = options.colorTextures;
  //>>includeStart('debug', pragmas.debug);
  Check.defined("options.context", context);
  Check.defined("options.colorRenderbuffers", colorRenderbuffers);
  Check.defined("options.colorTextures", colorTextures);
  //>>includeEnd('debug');

  const depthStencilRenderbuffer = options.depthStencilRenderbuffer;
  const depthStencilTexture = options.depthStencilTexture;
  if (
    (defined(depthStencilRenderbuffer) && !defined(depthStencilTexture)) ||
    (defined(depthStencilTexture) && !defined(depthStencilRenderbuffer))
  ) {
    // throw new DeveloperError("If multisampling depth stencil attachments, both a Renderbuffer and Texture must be provided.")
  }

  this._renderFramebuffer = new Framebuffer({
    context: context,
    colorRenderbuffers: colorRenderbuffers,
    depthStencilRenderbuffer: depthStencilRenderbuffer,
    destroyAttachments: options.destroyAttachments,
  });
  this._colorFramebuffer = new Framebuffer({
    context: context,
    colorTextures: colorTextures,
    depthStencilTexture: depthStencilTexture,
    destroyAttachments: options.destroyAttachments,
  });

  this._defaultToRender = true;
  this._blitReady = false;
}

MultisampleFramebuffer.prototype.getFramebuffer = function () {
  // if (this._defaultToRender) return this._renderFramebuffer;
  // if (this._blitReady) return this._colorFramebuffer;
  return this._renderFramebuffer;
};

MultisampleFramebuffer.prototype.getRenderFramebuffer = function () {
  return this._renderFramebuffer;
};

MultisampleFramebuffer.prototype.getColorFramebuffer = function () {
  return this._colorFramebuffer;
};

MultisampleFramebuffer.prototype.blitFramebuffers = function (context) {
  // if (!this._blitReady) {
  // clearCommand.execute(context);
  this._renderFramebuffer.bindRead();
  this._colorFramebuffer.bindDraw();
  const width = context.canvas.clientWidth;
  const height = context.canvas.clientHeight;
  const gl = context._gl;
  let mask = 0;
  if (this._colorFramebuffer._colorTextures.length > 0) {
    mask |= gl.COLOR_BUFFER_BIT;
  }
  if (defined(this._colorFramebuffer.depthTexture)) {
    mask |= gl.DEPTH_BUFFER_BIT;
  }
  if (defined(this._colorFramebuffer.depthStencilTexture)) {
    mask |= gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT;
  }
  gl.blitFramebuffer(
    0,
    0,
    width,
    height,
    0,
    0,
    width,
    height,
    mask,
    gl.NEAREST
  );
  gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
  gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
  // this._blitReady = true;
  // }
};

MultisampleFramebuffer.prototype.setRenderAsDefault = function (value) {
  this._defaultToRender = value;
};

MultisampleFramebuffer.prototype.isDestroyed = function () {
  return false;
};

MultisampleFramebuffer.prototype.destroy = function () {
  this._blitReady = false;
  this._renderFramebuffer.destroy();
  this._colorFramebuffer.destroy();
  return destroyObject(this);
};

export default MultisampleFramebuffer;
