import BoundingRectangle from "../Core/BoundingRectangle.js";
import Color from "../Core/Color.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import FramebufferManager from "../Renderer/FramebufferManager.js";
import PassState from "../Renderer/PassState.js";

/**
 * @private
 */
function PickFramebuffer(context) {
  // Override per-command states
  const passState = new PassState(context);
  passState.blendingEnabled = false;
  passState.scissorTest = {
    enabled: true,
    rectangle: new BoundingRectangle(),
  };
  passState.viewport = new BoundingRectangle();

  this._context = context;
  this._fb = new FramebufferManager({
    depthStencil: true,
  });
  this._passState = passState;
  this._width = 0;
  this._height = 0;
}

PickFramebuffer.prototype.begin = function (screenSpaceRectangle, viewport) {
  const context = this._context;
  const { width, height } = viewport;

  BoundingRectangle.clone(
    screenSpaceRectangle,
    this._passState.scissorTest.rectangle,
  );

  // Create or recreate renderbuffers and framebuffer used for picking
  this._width = width;
  this._height = height;
  this._fb.update(context, width, height);
  this._passState.framebuffer = this._fb.framebuffer;

  this._passState.viewport.width = width;
  this._passState.viewport.height = height;

  return this._passState;
};

const colorScratchForPickFramebuffer = new Color();

/**
 * Return the picked object rendered within a given rectangle.
 *
 * @param {BoundingRectangle} screenSpaceRectangle
 * @returns {object|undefined} The object rendered in the middle of the rectangle, or undefined if nothing was rendered.
 */
PickFramebuffer.prototype.end = function (screenSpaceRectangle) {
  const width = defaultValue(screenSpaceRectangle.width, 1.0);
  const height = defaultValue(screenSpaceRectangle.height, 1.0);

  const context = this._context;
  const pixels = context.readPixels({
    x: screenSpaceRectangle.x,
    y: screenSpaceRectangle.y,
    width: width,
    height: height,
    framebuffer: this._fb.framebuffer,
  });

  const max = Math.max(width, height);
  const length = max * max;
  const halfWidth = Math.floor(width * 0.5);
  const halfHeight = Math.floor(height * 0.5);

  let x = 0;
  let y = 0;
  let dx = 0;
  let dy = -1;

  // Spiral around the center pixel, this is a workaround until
  // we can access the depth buffer on all browsers.

  // The region does not have to square and the dimensions do not have to be odd, but
  // loop iterations would be wasted. Prefer square regions where the size is odd.
  for (let i = 0; i < length; ++i) {
    if (
      -halfWidth <= x &&
      x <= halfWidth &&
      -halfHeight <= y &&
      y <= halfHeight
    ) {
      const index = 4 * ((halfHeight - y) * width + x + halfWidth);

      colorScratchForPickFramebuffer.red = Color.byteToFloat(pixels[index]);
      colorScratchForPickFramebuffer.green = Color.byteToFloat(
        pixels[index + 1],
      );
      colorScratchForPickFramebuffer.blue = Color.byteToFloat(
        pixels[index + 2],
      );
      colorScratchForPickFramebuffer.alpha = Color.byteToFloat(
        pixels[index + 3],
      );

      const object = context.getObjectByPickColor(
        colorScratchForPickFramebuffer,
      );
      if (defined(object)) {
        return object;
      }
    }

    // if (top right || bottom left corners) || (top left corner) || (bottom right corner + (1, 0))
    // change spiral direction
    if (x === y || (x < 0 && -x === y) || (x > 0 && x === 1 - y)) {
      const temp = dx;
      dx = -dy;
      dy = temp;
    }

    x += dx;
    y += dy;
  }

  return undefined;
};

/**
 * Return a typed array containing the RGBA (byte) components of the
 * pixel that is at the center of the given rectangle.
 *
 * This may, for example, be voxel tile and sample information as rendered
 * by a pickVoxel pass, within a given rectangle. Or it may be the result
 * of a metadata picking rendering pass.
 *
 * @param {BoundingRectangle} screenSpaceRectangle
 * @returns {Uint8Array} The RGBA components
 */
PickFramebuffer.prototype.readCenterPixel = function (screenSpaceRectangle) {
  const width = defaultValue(screenSpaceRectangle.width, 1.0);
  const height = defaultValue(screenSpaceRectangle.height, 1.0);

  const context = this._context;
  const pixels = context.readPixels({
    x: screenSpaceRectangle.x,
    y: screenSpaceRectangle.y,
    width: width,
    height: height,
    framebuffer: this._fb.framebuffer,
  });

  // Read the center pixel
  const halfWidth = Math.floor(width * 0.5);
  const halfHeight = Math.floor(height * 0.5);
  const index = 4 * (halfHeight * width + halfWidth);

  return pixels.slice(index, index + 4);
};

PickFramebuffer.prototype.isDestroyed = function () {
  return false;
};

PickFramebuffer.prototype.destroy = function () {
  this._fb.destroy();
  return destroyObject(this);
};

export default PickFramebuffer;
