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
    supportsDepthTexture: true,
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
  pickDepth._framebuffer.destroy();
}

function createResources(pickDepth, context) {
  const width = context.drawingBufferWidth;
  const height = context.drawingBufferHeight;

  pickDepth._framebuffer.update(context, width, height);

  const passState = new PassState(context);
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
  viewport,
) {
  const width = viewport.width;
  const height = viewport.height;

  if (this._framebuffer.isDirty(width, height)) {
    createResources(this, context);
  }

  const framebuffer = this.framebuffer;
  const passState = this._passState;
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
