import Check from "../Core/Check.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import DeveloperError from "../Core/DeveloperError.js";
import RuntimeError from "../Core/RuntimeError.js";

/**
 * A cache resource.
 * <p>
 * This type describes an interface and is not intended to be instantiated directly.
 * </p>
 *
 * @alias ResourceLoader
 * @constructor
 *
 * @see ResourceCache
 *
 * @private
 */
export default function ResourceLoader() {}

Object.defineProperties(ResourceLoader.prototype, {
  /**
   * A promise that resolves to the resource when the resource is ready.
   *
   * @memberof ResourceLoader.prototype
   *
   * @type {Promise.<ResourceLoader>}
   * @readonly
   * @private
   */
  promise: {
    // eslint-disable-next-line getter-return
    get: function () {
      DeveloperError.throwInstantiationError();
    },
  },
  /**
   * The cache key of the resource.
   *
   * @memberof ResourceLoader.prototype
   *
   * @type {String}
   * @readonly
   * @private
   */
  cacheKey: {
    // eslint-disable-next-line getter-return
    get: function () {
      DeveloperError.throwInstantiationError();
    },
  },
});

/**
 * Loads the resource.
 * @private
 */
ResourceLoader.prototype.load = function () {
  DeveloperError.throwInstantiationError();
};

/**
 * Unloads the resource.
 * @private
 */
ResourceLoader.prototype.unload = function () {};

/**
 * Processes the resource until it becomes ready.
 *
 * @param {FrameState} frameState The frame state.
 * @private
 */
ResourceLoader.prototype.process = function (frameState) {};

/**
 * Constructs a {@link RuntimeError} from an errorMessage and an error.
 *
 * @param {String} errorMessage The error message.
 * @param {Error} [error] The error.
 *
 * @returns {RuntimeError} The runtime error.
 * @private
 */
ResourceLoader.prototype.getError = function (errorMessage, error) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("errorMessage", errorMessage);
  //>>includeEnd('debug');

  if (defined(error)) {
    errorMessage += `\n${error.message}`;
  }
  return new RuntimeError(errorMessage);
};

/**
 * Returns true if this object was destroyed; otherwise, false.
 * <br /><br />
 * If this object was destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
 *
 * @returns {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
 *
 * @see ResourceLoader#destroy
 * @private
 */
ResourceLoader.prototype.isDestroyed = function () {
  return false;
};

/**
 * Destroys the loaded resource.
 * <br /><br />
 * Once an object is destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
 * assign the return value (<code>undefined</code>) to the object as done in the example.
 *
 * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
 *
 * @example
 * resourceLoader = resourceLoader && resourceLoader.destroy();
 *
 * @see ResourceLoader#isDestroyed
 * @private
 */
ResourceLoader.prototype.destroy = function () {
  this.unload();
  return destroyObject(this);
};
