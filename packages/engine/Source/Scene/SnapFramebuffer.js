import BoundingRectangle from "../Core/BoundingRectangle.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import PixelFormat from "../Core/PixelFormat.js";
import FramebufferManager from "../Renderer/FramebufferManager.js";
import PassState from "../Renderer/PassState.js";
import PixelDatatype from "../Renderer/PixelDatatype.js";

/**
 * @private
 */
function SnapFramebuffer(context) {
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
    pixelDatatype: PixelDatatype.FLOAT,
    pixelFormat: PixelFormat.RGBA,
  });
  this._passState = passState;
}

function getSnapObjectsFromPixels(context, pixels, width, height) {
  const max = Math.max(width, height);
  const length = max * max;
  const halfWidth = Math.floor(width * 0.5);
  const halfHeight = Math.floor(height * 0.5);

  let x = 0;
  let y = 0;
  let dx = 0;
  let dy = -1;

  const results = [];
  for (let i = 0; i < length; ++i) {
    if (
      -halfWidth <= x &&
      x <= halfWidth &&
      -halfHeight <= y &&
      y <= halfHeight
    ) {
      const index = 4 * ((halfHeight - y) * width + x + halfWidth);

      const pickColor = pixels[index];
      const object = context.getObjectByPickColor(pickColor);
      if (defined(object)) {
        results.push({
          object: object,
          isEdge: pixels[index + 1] > 0.0,
          depth: pixels[index + 2],
          x: x,
          y: y,
        });
      }
    }

    if (x === y || (x < 0 && -x === y) || (x > 0 && x === 1 - y)) {
      const temp = dx;
      dx = -dy;
      dy = temp;
    }

    x += dx;
    y += dy;
  }

  return results;
}

SnapFramebuffer.prototype.begin = function (screenSpaceRectangle, viewport) {
  const context = this._context;
  const { width, height } = viewport;

  BoundingRectangle.clone(
    screenSpaceRectangle,
    this._passState.scissorTest.rectangle,
  );

  this._fb.update(context, width, height);
  this._passState.framebuffer = this._fb.framebuffer;

  this._passState.viewport.width = width;
  this._passState.viewport.height = height;

  return this._passState;
};

SnapFramebuffer.prototype.end = function (screenSpaceRectangle) {
  const width = screenSpaceRectangle.width ?? 1.0;
  const height = screenSpaceRectangle.height ?? 1.0;

  const context = this._context;
  const pixels = context.readPixels({
    x: screenSpaceRectangle.x,
    y: screenSpaceRectangle.y,
    width: width,
    height: height,
    pixelDatatype: PixelDatatype.FLOAT,
    framebuffer: this._fb.framebuffer,
  });

  return getSnapObjectsFromPixels(context, pixels, width, height);
};

SnapFramebuffer.prototype.isDestroyed = function () {
  return false;
};

SnapFramebuffer.prototype.destroy = function () {
  this._fb.destroy();
  return destroyObject(this);
};

export default SnapFramebuffer;
