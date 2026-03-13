import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import PixelFormat from "../Core/PixelFormat.js";
import Color from "../Core/Color.js";
import PixelDatatype from "../Renderer/PixelDatatype.js";
import FramebufferManager from "../Renderer/FramebufferManager.js";
import ClearCommand from "../Renderer/ClearCommand.js";

/**
 * Creates and manages a framebuffer for the planar fill feature-ID pre-pass.
 *
 * During this pass, non-behind planar fill geometry writes its per-fragment
 * feature ID into a screen-sized texture. Later, primitives with
 * <code>behind: true</code> (BENTLEY_materials_planar_fill) sample this
 * texture to check whether the pixel they are about to overwrite belongs to
 * the same logical object (same feature ID). Only then do they apply an
 * additional depth offset, pushing the fill behind its own object's edges
 * and non-behind fills — but NOT behind other objects.
 *
 * Layout:
 *   Color attachment 0 – RGBA: R = encoded feature ID (float), GBA reserved.
 *   Depth-stencil attachment – shared with the main scene for correct depth testing.
 *
 * @alias PlanarFillIdFramebuffer
 * @constructor
 * @private
 */
function PlanarFillIdFramebuffer() {
  this._framebufferManager = new FramebufferManager({
    colorAttachmentsLength: 1,
    createColorAttachments: true,
    depthStencil: true,
    supportsDepthTexture: true,
    color: true,
  });

  this._framebuffer = undefined;
  this._idTexture = undefined;
  this._depthStencilTexture = undefined;

  this._clearCommand = new ClearCommand({
    color: new Color(0.0, 0.0, 0.0, 0.0),
    depth: 1.0,
    stencil: 0,
    owner: this,
  });
}

Object.defineProperties(PlanarFillIdFramebuffer.prototype, {
  /**
   * Gets the underlying framebuffer.
   * @memberof PlanarFillIdFramebuffer.prototype
   * @type {Framebuffer}
   * @readonly
   */
  framebuffer: {
    get: function () {
      return this._framebuffer;
    },
  },

  /**
   * Gets the feature-ID texture (color attachment 0).
   * @memberof PlanarFillIdFramebuffer.prototype
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
   * @memberof PlanarFillIdFramebuffer.prototype
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
 * Updates (creates / resizes) the framebuffer to match the viewport.
 *
 * @param {Context} context
 * @param {BoundingRectangle} viewport
 * @param {boolean} hdr
 * @returns {boolean} <code>true</code> if the framebuffer was recreated.
 */
PlanarFillIdFramebuffer.prototype.update = function (context, viewport, hdr) {
  const width = viewport.width;
  const height = viewport.height;

  // Feature IDs are integers — use a float format for best range of values.
  // Prefer FLOAT over HALF_FLOAT to avoid precision issues with models that
  // have many features.
  let pixelDatatype;
  if (context.floatingPointTexture) {
    pixelDatatype = PixelDatatype.FLOAT;
  } else if (context.halfFloatingPointTexture) {
    pixelDatatype = PixelDatatype.HALF_FLOAT;
  } else {
    pixelDatatype = PixelDatatype.FLOAT;
  }

  const changed = this._framebufferManager.update(
    context,
    width,
    height,
    1, // no MSAA
    pixelDatatype,
    PixelFormat.RGBA,
  );

  if (this._framebufferManager.framebuffer) {
    this._framebuffer = this._framebufferManager.framebuffer;
    this._idTexture = this._framebufferManager.getColorTexture(0);
    this._depthStencilTexture =
      this._framebufferManager.getDepthStencilTexture();
  }

  return changed;
};

/**
 * Returns a ClearCommand that targets this framebuffer.
 *
 * @param {Color} [clearColor] Override the clear color (default: transparent black).
 * @returns {ClearCommand}
 */
PlanarFillIdFramebuffer.prototype.getClearCommand = function (clearColor) {
  this._clearCommand.framebuffer = this._framebuffer;
  if (defined(clearColor)) {
    Color.clone(clearColor, this._clearCommand.color);
  }
  return this._clearCommand;
};

/**
 * @returns {boolean}
 */
PlanarFillIdFramebuffer.prototype.isDestroyed = function () {
  return false;
};

/**
 * Destroys WebGL resources.
 */
PlanarFillIdFramebuffer.prototype.destroy = function () {
  this._framebufferManager =
    this._framebufferManager && this._framebufferManager.destroy();
  this._clearCommand = undefined;
  return destroyObject(this);
};

export default PlanarFillIdFramebuffer;
