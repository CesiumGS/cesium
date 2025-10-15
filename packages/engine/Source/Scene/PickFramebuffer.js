import BoundingRectangle from "../Core/BoundingRectangle.js";
import Color from "../Core/Color.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import FramebufferManager from "../Renderer/FramebufferManager.js";
import PassState from "../Renderer/PassState.js";
import PixelDatatype from "../Renderer/PixelDatatype.js";
import PixelFormat from "../Core/PixelFormat.js";
import WebGLConstants from "../Core/WebGLConstants.js";
import Sync from "../Renderer/Sync.js";

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

// TODO: comment
function colorScratchForObject(context, pixels, width, height, limit = 1) {
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
  const objects = new Set();
  for (let i = 0; i < length; ++i) {
    if (
      -halfWidth <= x &&
      x <= halfWidth &&
      -halfHeight <= y &&
      y <= halfHeight
    ) {
      const index = 4 * ((halfHeight - y) * width + x + halfWidth);

      const pickColor = Color.bytesToRgba(
        pixels[index],
        pixels[index + 1],
        pixels[index + 2],
        pixels[index + 3],
      );

      const object = context.getObjectByPickColor(pickColor);
      if (defined(object)) {
        objects.add(object);
        if (objects.size >= limit) {
          break;
        }
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
  return [...objects];
}

let i = 0;
PickFramebuffer.prototype.endAsync = async function (
  screenSpaceRectangle,
  frameState,
  limit = 1,
) {
  const width = screenSpaceRectangle.width ?? 1.0;
  const height = screenSpaceRectangle.height ?? 1.0;

  const context = this._context;
  const framebuffer = this._fb.framebuffer;

  let pixelDatatype = PixelDatatype.UNSIGNED_BYTE;
  let pixelFormat = PixelFormat.RGBA;

  if (defined(framebuffer) && framebuffer.numberOfColorAttachments > 0) {
    pixelDatatype = framebuffer.getColorTexture(0).pixelDatatype;
    pixelFormat = framebuffer.getColorTexture(0).pixelFormat;
  }

  const pbo = context.readPixels({
    x: screenSpaceRectangle.x,
    y: screenSpaceRectangle.y,
    width: width,
    height: height,
    framebuffer: framebuffer,
    pbo: true,
  });

  const sync = Sync.create({
    context: context,
  });

  i++;

  const pickState = {
    id: i, // TODO: remove
    context: context,
    frameState: frameState,
    frameNumber: frameState.frameNumber,
    sync: sync,
    pbo: pbo,
    pixelFormat: pixelFormat,
    pixelDatatype: pixelDatatype,
    width: width,
    height: width,
  };

  return new Promise((resolve, reject) => {
    //console.log("[async] Pick", `#${pickState.id}`, pickState.frameNumber, screenSpaceRectangle.x, screenSpaceRectangle.y);
    frameState.afterRender.push(
      createAsyncPick(pickState, (context, signaled) => {
        const pbo = pickState.pbo;
        //const frameDelta = frameState.frameNumber - pickState.frameNumber; // how many frames passed since inital request
        const pixels = PixelFormat.createTypedArray(
          pickState.pixelFormat,
          pickState.pixelDatatype,
          pickState.width,
          pickState.height,
        );
        pbo.getBufferData(pixels);
        pbo.destroy();
        const pickedObjects = colorScratchForObject(
          context,
          pixels,
          pickState.width,
          pickState.height,
          limit,
        );
        //console.log("[async] Return", `#${pickState.id}`, frameDelta, signaled, obj);
        if (signaled) {
          resolve(pickedObjects);
        } else {
          reject("Picking Request Timeout");
        }
      }),
    );
  });
};

// TODO: comment
function createAsyncPick(pickState, onSignalCallback) {
  return () => {
    const context = pickState.context;
    const sync = pickState.sync;
    const frameState = pickState.frameState;
    const ttl = pickState.ttl ?? 10;
    const syncStatus = sync.getStatus();
    const signaled = syncStatus === WebGLConstants.SIGNALED;
    const frameDelta = frameState.frameNumber - pickState.frameNumber; // how many frames passed since inital request
    if (signaled || frameDelta > ttl) {
      //console.log("signal", `#${pickState.id}`, pickState.frameNumber, frameState.frameNumber, frameDelta);
      sync.destroy();
      onSignalCallback(context, signaled);
    } else {
      //console.log("no-signal", `#${pickState.id}`, pickState.frameNumber, frameState.frameNumber, frameDelta);
      frameState.afterRender.push(createAsyncPick(pickState, onSignalCallback));
    }
  };
}

/**
 * Return the picked objects rendered within a given rectangle.
 *
 * @param {BoundingRectangle} screenSpaceRectangle
 * @param {number} [limit=1] If supplied, stop iterating after collecting this many objects.
 * @returns {object[]} A list of rendered objects, ordered by distance to the middle of the rectangle.
 */
PickFramebuffer.prototype.end = function (
  screenSpaceRectangle,
  _frameState,
  limit = 1,
) {
  const width = screenSpaceRectangle.width ?? 1.0;
  const height = screenSpaceRectangle.height ?? 1.0;

  const context = this._context;
  const pixels = context.readPixels({
    x: screenSpaceRectangle.x,
    y: screenSpaceRectangle.y,
    width: width,
    height: height,
    framebuffer: this._fb.framebuffer,
  });

  return colorScratchForObject(context, pixels, width, height, limit);
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
  const width = screenSpaceRectangle.width ?? 1.0;
  const height = screenSpaceRectangle.height ?? 1.0;

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
