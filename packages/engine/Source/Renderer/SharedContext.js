import clone from "../Core/clone.js";
import destroyObject from "../Core/destroyObject.js";
import DeveloperError from "../Core/DeveloperError.js";
import Context from "./Context";

function SharedContext(options) {
  this._autoDestroy = options?.autoDestroy ?? true;
  this._canvas = document.createElement("canvas");
  this._context = new Context(this._canvas, clone(options?.contextOptions));
  this._canvases = [];
}

SharedContext.prototype._createSceneContext = function (canvas) {
  //>>includeStart('debug', pragmas.debug);
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
        default:
          return Reflect.get(target, prop, receiver);
      }
    },
  });

  return proxy;
};

SharedContext.prototype.destroy = function () {
  this._context.destroy();
  destroyObject(this);
};

SharedContext.prototype.isDestroyed = function () {
  return false;
};

export default SharedContext;
