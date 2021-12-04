import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
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

  var context = options.context;
  var colorRenderbuffer = options.colorRenderbuffer;
  var colorTexture = options.colorTexture;
  //>>includeStart('debug', pragmas.debug);
  Check.defined("options.context", context);
  Check.defined("options.colorRenderbuffer", colorRenderbuffer);
  Check.defined("options.colorTexture", colorTexture);
  //>>includeEnd('debug');

  var depthStencilRenderbuffer = options.depthStencilRenderbuffer;
  var depthStencilTexture = options.depthStencilTexture;
  if (
    (defined(depthStencilRenderbuffer) && !defined(depthStencilTexture)) ||
    (defined(depthStencilTexture) && !defined(depthStencilRenderbuffer))
  ) {
    // throw new DeveloperError("If multisampling depth stencil attachments, both a Renderbuffer and Texture must be provided.")
  }

  this._renderFramebuffer = new Framebuffer({
    context: context,
    colorRenderbuffers: [colorRenderbuffer],
    depthStencilRenderbuffer: depthStencilRenderbuffer,
    destroyAttachments: options.destroyAttachments,
  });
  this._colorFramebuffer = new Framebuffer({
    context: context,
    colorTextures: [colorTexture],
    depthStencilTexture: depthStencilTexture,
    destroyAttachments: options.destroyAttachments,
  });
  this._blitReady = false;
}

MultisampleFramebuffer.prototype.getFramebuffer = function () {
  // return this._blitReady ? this._colorFramebuffer : this._renderFramebuffer;
  return this._renderFramebuffer;
};

MultisampleFramebuffer.prototype.getRenderFramebuffer = function () {
  return this._renderFramebuffer;
};

MultisampleFramebuffer.prototype.getColorFramebuffer = function () {
  return this._colorFramebuffer;
};

MultisampleFramebuffer.prototype.blitFramebuffers = function (context) {
  this._renderFramebuffer.bindRead();
  this._colorFramebuffer.bindDraw();
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
  this._blitReady = true;
  return this._colorFramebuffer;
};

MultisampleFramebuffer.prototype.destroy = function () {
  this._renderFramebuffer.destroy();
  this._colorFramebuffer.destroy();
  this._blitReady = false;
};

export default MultisampleFramebuffer;
