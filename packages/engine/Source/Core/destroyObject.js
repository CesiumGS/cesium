import DeveloperError from "./DeveloperError.js";

function returnTrue() {
  return true;
}

/**
 * Returns the prototype chain of a given object. Object may be an instance
 * of an ES6 class, or of a class defined by prototype-based inheritance.
 *
 * @param {object} object
 * @returns {Array<object>}
 */
function getPrototypeChain(object) {
  const prototypes = [];

  let value = object;
  while ((value = Object.getPrototypeOf(value))) {
    if (value === Object.prototype) {
      break;
    }
    prototypes.push(value);
  }

  return prototypes;
}

/**
 * Destroys an object.  Each of the object's functions, including functions in its prototype,
 * is replaced with a function that throws a {@link DeveloperError}, except for the object's
 * <code>isDestroyed</code> function, which is set to a function that returns <code>true</code>.
 * The object's properties are removed with <code>delete</code>.
 * <br /><br />
 * This function is used by objects that hold native resources, e.g., WebGL resources, which
 * need to be explicitly released.  Client code calls an object's <code>destroy</code> function,
 * which then releases the native resource and calls <code>destroyObject</code> to put itself
 * in a destroyed state.
 *
 * @function
 *
 * @param {object} object The object to destroy.
 * @param {string} [message] The message to include in the exception that is thrown if
 *                           a destroyed object's function is called.
 *
 *
 * @example
 * // How a texture would destroy itself.
 * this.destroy = function () {
 *     _gl.deleteTexture(_texture);
 *     return Cesium.destroyObject(this);
 * };
 *
 * @see DeveloperError
 */
function destroyObject(object, message) {
  message = message ?? "This object was destroyed, i.e., destroy() was called.";

  function throwOnDestroyed() {
    //>>includeStart('debug', pragmas.debug);
    throw new DeveloperError(message);
    //>>includeEnd('debug');
  }

  for (const prototype of getPrototypeChain(object)) {
    const descriptors = Object.getOwnPropertyDescriptors(prototype);
    for (const key in descriptors) {
      if (descriptors[key].writable && typeof object[key] === "function") {
        object[key] = throwOnDestroyed;
      }
    }
  }

  object.isDestroyed = returnTrue;

  return undefined;
}
export default destroyObject;
