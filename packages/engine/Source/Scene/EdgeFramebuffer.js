import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import PixelFormat from "../Core/PixelFormat.js";
import PixelDatatype from "../Renderer/PixelDatatype.js";
import FramebufferManager from "../Renderer/FramebufferManager.js";

/**
 * Creates and manages framebuffers for edge visibility rendering.
 *
 * @param {Object} options Object with the following properties:
 * @param {boolean} [options.multisampling=false] Whether to enable multisampling.
 *
 * @alias EdgeFramebuffer
 * @constructor
 *
 * @private
 */
function EdgeFramebuffer(options) {
  options = options || {};

  // Create framebuffer manager with single color output for testing
  // TEMP: Using single color output instead of MRT to avoid GL errors
  this._framebufferManager = new FramebufferManager({
    colorAttachmentsLength: 1, // Single color texture only
    depthStencil: true,
    supportsDepthTexture: true,
  });

  this._framebuffer = undefined;
  this._colorTexture = undefined;
  this._idTexture = undefined;
  this._depthStencilTexture = undefined;
}

Object.defineProperties(EdgeFramebuffer.prototype, {
  /**
   * Gets the framebuffer for edge rendering.
   * @memberof EdgeFramebuffer.prototype
   * @type {Framebuffer}
   * @readonly
   */
  framebuffer: {
    get: function () {
      return this._framebuffer;
    },
  },

  /**
   * Gets the color texture.
   * @memberof EdgeFramebuffer.prototype
   * @type {Texture}
   * @readonly
   */
  colorTexture: {
    get: function () {
      return this._colorTexture;
    },
  },

  /**
   * Gets the ID texture for picking.
   * @memberof EdgeFramebuffer.prototype
   * @type {Texture}
   * @readonly
   */
  idTexture: {
    get: function () {
      return this._idTexture;
    },
  },

  /**
   * Gets the depth-stencil texture.
   * @memberof EdgeFramebuffer.prototype
   * @type {Texture}
   * @readonly
   */
  depthStencilTexture: {
    get: function () {
      return this._depthStencilTexture;
    },
  },
});

/**
 * Updates the framebuffer.
 *
 * @param {Context} context The context.
 * @param {Viewport} viewport The viewport.
 * @param {boolean} hdr Whether HDR is enabled.
 * @param {number} [msaaSamples=1] The number of MSAA samples.
 *
 * @returns {boolean} True if the framebuffer was updated; otherwise, false.
 */
EdgeFramebuffer.prototype.update = function (
  context,
  viewport,
  hdr,
  msaaSamples,
) {
  const width = viewport.width;
  const height = viewport.height;

  msaaSamples = defined(msaaSamples) ? msaaSamples : 1;

  const pixelDatatype = hdr
    ? context.halfFloatingPointTexture
      ? PixelDatatype.HALF_FLOAT
      : PixelDatatype.FLOAT
    : PixelDatatype.UNSIGNED_BYTE;

  const changed = this._framebufferManager.update(
    context,
    width,
    height,
    msaaSamples,
    pixelDatatype,
    PixelFormat.RGBA, // Color format for both attachments
  );

  // Always assign framebuffer if FramebufferManager has one
  if (this._framebufferManager.framebuffer) {
    this._framebuffer = this._framebufferManager.framebuffer;

    // Get the textures from the framebuffer manager
    this._colorTexture = this._framebufferManager.getColorTexture(0); // Color attachment 0
    // TEMP: Single color attachment only, no ID texture
    this._idTexture = undefined; // No ID attachment for now
    this._depthStencilTexture =
      this._framebufferManager.getDepthStencilTexture();
  }

  return changed;
};

/**
 * Clears the framebuffer.
 *
 * @param {Context} context The context.
 * @param {PassState} passState The pass state.
 * @param {Color} clearColor The clear color.
 */
EdgeFramebuffer.prototype.clear = function (context, passState, clearColor) {
  const framebuffer = passState.framebuffer;

  passState.framebuffer = this._framebuffer;

  // Clear color attachments and depth/stencil
  context.clear({
    color: clearColor,
    depth: 1.0,
    stencil: 0,
  });

  passState.framebuffer = framebuffer;
};

/**
 * Gets the edge framebuffer, creating it if necessary.
 *
 * @param {Context} context The context.
 * @param {Viewport} viewport The viewport.
 * @param {number} [msaaSamples=1] The number of MSAA samples.
 *
 * @returns {Framebuffer} The edge framebuffer.
 */
EdgeFramebuffer.prototype.getFramebuffer = function (
  context,
  viewport,
  msaaSamples,
) {
  this.update(context, viewport, msaaSamples);
  return this._framebuffer;
};

/**
 * Returns true if this object was destroyed; otherwise, false.
 *
 * @returns {boolean} True if this object was destroyed; otherwise, false.
 */
EdgeFramebuffer.prototype.isDestroyed = function () {
  return false;
};

/**
 * Destroys the WebGL resources held by this object.  Destroying an object allows for deterministic
 * release of WebGL resources, instead of relying on the garbage collector to destroy this object.
 * <br /><br />
 * Once an object is destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
 * assign the return value (<code>undefined</code>) to the object as done in the example.
 *
 * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
 */
EdgeFramebuffer.prototype.destroy = function () {
  this._framebufferManager =
    this._framebufferManager && this._framebufferManager.destroy();
  return destroyObject(this);
};

export default EdgeFramebuffer;
