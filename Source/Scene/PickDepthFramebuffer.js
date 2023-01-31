import BoundingRectangle from "../Core/BoundingRectangle.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import PixelFormat from "../Core/PixelFormat.js";
import Framebuffer from "../Renderer/Framebuffer.js";
import PassState from "../Renderer/PassState.js";
import PixelDatatype from "../Renderer/PixelDatatype.js";
import Texture from "../Renderer/Texture.js";

/**
 * @private
 */
function PickDepthFramebuffer() {
  this._depthStencilTexture = undefined;
  this._framebuffer = undefined;
  this._passState = undefined;
}

function destroyResources(pickDepth) {
  pickDepth._framebuffer =
    pickDepth._framebuffer && pickDepth._framebuffer.destroy();
  pickDepth._depthStencilTexture =
    pickDepth._depthStencilTexture && pickDepth._depthStencilTexture.destroy();
}

function createResources(pickDepth, context) {
  var width = context.drawingBufferWidth;
  var height = context.drawingBufferHeight;

  pickDepth._depthStencilTexture = new Texture({
    context: context,
    width: width,
    height: height,
    pixelFormat: PixelFormat.DEPTH_STENCIL,
    pixelDatatype: PixelDatatype.UNSIGNED_INT_24_8,
  });

  pickDepth._framebuffer = new Framebuffer({
    context: context,
    depthStencilTexture: pickDepth._depthStencilTexture,
    destroyAttachments: false,
  });

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

  if (
    !defined(this._framebuffer) ||
    width !== this._depthStencilTexture.width ||
    height !== this._depthStencilTexture.height
  ) {
    destroyResources(this);
    createResources(this, context);
  }

  var framebuffer = this._framebuffer;
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
