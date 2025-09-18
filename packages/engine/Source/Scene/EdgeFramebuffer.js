import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import PixelFormat from "../Core/PixelFormat.js";
import Color from "../Core/Color.js";
import PixelDatatype from "../Renderer/PixelDatatype.js";
import FramebufferManager from "../Renderer/FramebufferManager.js";
import ClearCommand from "../Renderer/ClearCommand.js";

/**
 * Creates and manages framebuffers for edge visibility rendering.
 *
 * @param {Object} options Object with the following properties:
 *
 * @alias EdgeFramebuffer
 * @constructor
 *
 * @private
 */
function EdgeFramebuffer(options) {
  options = options || {};

  // Create framebuffer manager with multiple render targets (MRT)
  // Color attachment 0: edge color output (visualization / debug)
  // Color attachment 1: R: edge type, G: featureId (metadata / ids)
  // Color attachment 2: packed depth (czm_packDepth) for edge fragments
  this._framebufferManager = new FramebufferManager({
    colorAttachmentsLength: 3, // MRT: Color + ID + Depth (packed RGBA)
    createColorAttachments: true,
    depthStencil: true,
    supportsDepthTexture: true,
    color: true,
  });

  this._framebuffer = undefined;
  this._colorTexture = undefined;
  this._idTexture = undefined;
  this._depthTexture = undefined; // packed depth color attachment (location = 2)
  this._depthStencilTexture = undefined;

  this._clearCommand = new ClearCommand({
    color: new Color(0.0, 0.0, 0.0, 0.0),
    depth: 1.0,
    stencil: 0,
    owner: this,
  });
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
   * Gets the ID texture.
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
   * Gets the packed depth texture written during the edge pass.
   * @memberof EdgeFramebuffer.prototype
   * @type {Texture}
   * @readonly
   */
  depthTexture: {
    get: function () {
      return this._depthTexture;
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
 * @param {Texture} [existingColorTexture] Optional existing color texture to reuse.
 * @param {Texture} [existingDepthTexture] Optional existing depth texture to reuse.
 *
 * @returns {boolean} True if the framebuffer was updated; otherwise, false.
 */
EdgeFramebuffer.prototype.update = function (
  context,
  viewport,
  hdr,
  existingColorTexture,
  existingDepthTexture,
) {
  const width = viewport.width;
  const height = viewport.height;

  const pixelDatatype = hdr
    ? context.halfFloatingPointTexture
      ? PixelDatatype.HALF_FLOAT
      : PixelDatatype.FLOAT
    : PixelDatatype.UNSIGNED_BYTE;

  const changed = this._framebufferManager.update(
    context,
    width,
    height,
    1, // No MSAA
    pixelDatatype,
    PixelFormat.RGBA,
  );

  // Always assign framebuffer if FramebufferManager has one
  if (this._framebufferManager.framebuffer) {
    this._framebuffer = this._framebufferManager.framebuffer;

    // Get the textures from the framebuffer manager or use existing ones
    this._colorTexture = defined(existingColorTexture)
      ? existingColorTexture
      : this._framebufferManager.getColorTexture(0); // Color attachment 0
    this._idTexture = this._framebufferManager.getColorTexture(1); // Color attachment 1: ID texture
    this._depthTexture = this._framebufferManager.getColorTexture(2); // Color attachment 2: packed depth
    this._depthStencilTexture = defined(existingDepthTexture)
      ? existingDepthTexture
      : this._framebufferManager.getDepthStencilTexture();
  }

  return changed;
};

/**
 * Clears the framebuffer using ClearCommand.
 * @deprecated Use getClearCommand() instead for proper MRT clearing.
 *
 * @param {Context} context The context.
 * @param {PassState} passState The pass state.
 * @param {Color} clearColor The clear color.
 */
EdgeFramebuffer.prototype.clear = function (context, passState, clearColor) {
  const clearCommand = this.getClearCommand(clearColor);
  clearCommand.execute(context, passState);
};

/**
 * Gets the clear command for this framebuffer.
 *
 * @param {Color} [clearColor] The clear color to use. If undefined, uses the default.
 * @returns {ClearCommand} The clear command.
 */
EdgeFramebuffer.prototype.getClearCommand = function (clearColor) {
  this._clearCommand.framebuffer = this._framebuffer;

  if (defined(clearColor)) {
    Color.clone(clearColor, this._clearCommand.color);
  }

  return this._clearCommand;
};

/**
 * Gets the edge framebuffer, creating it if necessary.
 *
 * @param {Context} context The context.
 * @param {Viewport} viewport The viewport.
 * @param {Texture} [existingColorTexture] Optional existing color texture to reuse.
 * @param {Texture} [existingDepthTexture] Optional existing depth texture to reuse.
 *
 * @returns {Framebuffer} The edge framebuffer.
 */
EdgeFramebuffer.prototype.getFramebuffer = function (
  context,
  viewport,
  existingColorTexture,
  existingDepthTexture,
) {
  this.update(
    context,
    viewport,
    false,
    existingColorTexture,
    existingDepthTexture,
  );
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
  this._clearCommand = undefined;
  return destroyObject(this);
};

export default EdgeFramebuffer;
