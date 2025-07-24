import clone from "../Core/clone.js";
import destroyObject from "../Core/destroyObject.js";
import DeveloperError from "../Core/DeveloperError.js";
import Context from "./Context.js";

/**
 * Enables a single WebGL context to be used by any number of {@link Scene}s.
 * You can pass a SharedContext in place of a {@link ContextOptions} to the constructors of {@link Scene}, {@link CesiumWidget}, and {@link Viewer}.
 * {@link Primitive}s associated with the shared WebGL context can be displayed in any Scene that uses the same context.
 * The context renders each Scene to an off-screen canvas, then blits the result to that Scene's on-screen canvas.
 *
 * @private
 * @alias SharedContext
 * @constructor
 *
 * @param {object} [options] Object with the following properties:
 * @param {ContextOptions} [options.contextOptions] Context and WebGL creation properties.
 * @param {boolean} [options.autoDestroy=true] Destroys this context and all of its WebGL resources after all Scenes using the context are destroyed.

 * @see {@link http://www.khronos.org/registry/webgl/specs/latest/#5.2|WebGLContextAttributes}
 *
 * @example
 * // Create two Scenes sharing a single WebGL context
 * const context = new Cesium.SharedContext();
 * const scene1 = new Cesium.Scene({
 *   canvas: canvas1,
 *   contextOptions: context,
 * });
 * const scene2 = new Cesium.Scene({
 *   canvas: canvas2,
 *   contextOptions: context,
 * });
 */
function SharedContext(options) {
  this._autoDestroy = options?.autoDestroy ?? true;
  this._canvas = document.createElement("canvas");
  this._context = new Context(this._canvas, clone(options?.contextOptions));
  this._canvases = [];
}

/**
 * Creates an instance of {@link Context} that manages the shared WebGL context for a specific canvas.
 * @param {HTMLCanvasElement} canvas The canvas element to which the context will be associated
 * @returns {Context} The created context instance
 * @private
 */
SharedContext.prototype.createSceneContext = function (canvas) {
  const context2d = canvas.getContext("2d", { alpha: true });

  //>>includeStart('debug', pragmas.debug);
  if (!context2d) {
    throw new DeveloperError(
      "canvas used with SharedContext must provide a 2d context",
    );
  }

  if (this._canvases.includes(canvas)) {
    throw new DeveloperError("canvas is already associated with a scene");
  }
  //>>includeEnd('debug');

  const sharedContext = this;
  sharedContext._canvases.push(canvas);

  let isDestroyed = false;
  const destroy = function () {
    isDestroyed = true;
    const index = sharedContext._canvases.indexOf(canvas);
    if (-1 !== index) {
      sharedContext._canvases.splice(index, 1);
      if (sharedContext._autoDestroy && sharedContext._canvases.length === 0) {
        sharedContext.destroy();
      }
    }
  };

  const beginFrame = function () {
    // Ensure the off-screen canvas is at least as large as the on-screen canvas.
    const sharedCanvas = sharedContext._context.canvas;

    const width = this.drawingBufferWidth;
    if (sharedCanvas.width < width) {
      sharedCanvas.width = width;
    }

    const height = this.drawingBufferHeight;
    if (sharedCanvas.height < height) {
      sharedCanvas.height = height;
    }
  };

  const endFrame = function () {
    // Blit the image from the off-screen canvas to the on-screen canvas.
    const w = this.drawingBufferWidth;
    const h = this.drawingBufferHeight;
    const yOffset = sharedContext._context.canvas.height - h; // drawImage has top as Y=0, GL has bottom as Y=0
    context2d.drawImage(
      sharedContext._context.canvas,
      0,
      yOffset,
      w,
      h,
      0,
      0,
      w,
      h,
    );

    // Do normal post-frame cleanup.
    sharedContext._context.endFrame();
  };

  const proxy = new Proxy(this._context, {
    get(target, prop, receiver) {
      if (prop === "isDestroyed") {
        return function () {
          return isDestroyed;
        };
      } else if (isDestroyed) {
        //>>includeStart('debug', pragmas.debug);
        throw new DeveloperError(
          "This object was destroyed, i.e., destroy() was called.",
        );
        //>>includeEnd('debug');
      }

      switch (prop) {
        case "_canvas":
          return canvas;
        case "destroy":
          return destroy;
        case "drawingBufferWidth":
          return canvas.width;
        case "drawingBufferHeight":
          return canvas.height;
        case "beginFrame":
          return beginFrame;
        case "endFrame":
          return endFrame;
        default:
          return Reflect.get(target, prop, receiver);
      }
    },
  });

  return proxy;
};

/**
 * Destroys the WebGL resources held by this object. Destroying an object allows for deterministic
 * release of WebGL resources, instead of relying on the garbage collector to destroy this object.
 * <br /><br />
 * Once an object is destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception. Therefore,
 * assign the return value (<code>undefined</code>) to the object as done in the example.
 * <br /><br />
 * By default, a SharedContext is destroyed automatically once the last Scene using it is destroyed, in which case it
 * is not necessary to call this method directly.
 *
 * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
 *
 * @example
 * context = context && context.destroy();
 *
 * @see SharedContext#isDestroyed
 */
SharedContext.prototype.destroy = function () {
  this._context.destroy();
  destroyObject(this);
};

/**
 * Returns true if this object was destroyed; otherwise, false.
 * <br /><br />
 * If this object was destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
 *
 * @returns {boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
 *
 * @see SharedContext#destroy
 */
SharedContext.prototype.isDestroyed = function () {
  return false;
};

export default SharedContext;
