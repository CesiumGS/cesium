import BoundingRectangle from "../Core/BoundingRectangle.js";
import defaultValue from "../Core/defaultValue.js";
import destroyObject from "../Core/destroyObject.js";
import FramebufferManager from "../Renderer/FramebufferManager.js";
import PassState from "../Renderer/PassState.js";

/**
 * @private
 */
function ArbitraryRenderFrameBuffer(context) {
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

ArbitraryRenderFrameBuffer.prototype.begin = function (
  screenSpaceRectangle,
  viewport,
) {
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

/**
 * Return the picked object rendered within a given rectangle.
 *
 * @param {BoundingRectangle} screenSpaceRectangle
 * @returns {object} An object containing the resulting pixel data as well as metadata
 */
ArbitraryRenderFrameBuffer.prototype.end = function (screenSpaceRectangle) {
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

  return {
    pixels: pixels,
    x: screenSpaceRectangle.x,
    y: screenSpaceRectangle.y,
    width: width,
    height: height,
  };
};

ArbitraryRenderFrameBuffer.prototype.isDestroyed = function () {
  return false;
};

ArbitraryRenderFrameBuffer.prototype.destroy = function () {
  this._fb.destroy();
  return destroyObject(this);
};

export default ArbitraryRenderFrameBuffer;
