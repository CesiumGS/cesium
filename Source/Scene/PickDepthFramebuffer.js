import BoundingRectangle from "../Core/BoundingRectangle.js";
import destroyObject from "../Core/destroyObject.js";
import FramebufferManager from "../Renderer/FramebufferManager.js";
import PassState from "../Renderer/PassState.js";

/**
 * @private
 */
function PickDepthFramebuffer() {
  this._framebuffer = new FramebufferManager({
    color: false,
    depthStencil: true,
  });
  this._passState = undefined;
}

Object.defineProperties(PickDepthFramebuffer.prototype, {
  framebuffer: {
    get: function () {
      return this._framebuffer.framebuffer;
    },
  },
});

function destroyResources(pickDepth) {
  pickDepth._framebuffer.destroyResources();
}

function createResources(pickDepth, context) {
  var width = context.drawingBufferWidth;
  var height = context.drawingBufferHeight;

  pickDepth._framebuffer.update(context, width, height, true);

  var passState = new PassState(context);
  passState.blendingEnabled = false;
  passState.scissorTest = {
    enabled: true,
    rectangle: new BoundingRectangle(),
  };
  passState.viewport = new BoundingRectangle();
  pickDepth._passState = passState;
}

PickDepthFramebuffer.prototype.update = function (
  context,
  drawingBufferPosition,
  viewport
) {
  var width = viewport.width;
  var height = viewport.height;

  destroyResources(this);
  createResources(this, context);

  var framebuffer = this.framebuffer;
  var passState = this._passState;
  passState.framebuffer = framebuffer;
  passState.viewport.width = width;
  passState.viewport.height = height;
  passState.scissorTest.rectangle.x = drawingBufferPosition.x;
  passState.scissorTest.rectangle.y = height - drawingBufferPosition.y;
  passState.scissorTest.rectangle.width = 1;
  passState.scissorTest.rectangle.height = 1;

  return passState;
};

PickDepthFramebuffer.prototype.isDestroyed = function () {
  return false;
};

PickDepthFramebuffer.prototype.destroy = function () {
  destroyResources(this);
  return destroyObject(this);
};
export default PickDepthFramebuffer;
