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
class ResourceLoader {
  /**
   * The cache key of the resource.
   *
   * @memberof ResourceLoader.prototype
   *
   * @type {string}
   * @readonly
   * @private
   */
  // eslint-disable-next-line getter-return
  get cacheKey() {
    DeveloperError.throwInstantiationError();
  }

  /**
   * Loads the resource.
   * @returns {Promise<ResourceLoader>} A promise which resolves to the loader when the resource loading is completed.
   * @private
   */
  load() {
    DeveloperError.throwInstantiationError();
  }

  /**
   * Unloads the resource.
   * @private
   */
  unload() {}

  /**
   * Processes the resource until it becomes ready.
   *
   * @param {FrameState} frameState The frame state.
   * @returns {boolean} true once all resourced are ready.
   * @private
   */
  process(frameState) {
    return false;
  }

  /**
   * Constructs a {@link RuntimeError} from an errorMessage and an error.
   *
   * @param {string} errorMessage The error message.
   * @param {Error} [error] The error.
   *
   * @returns {RuntimeError} The runtime error.
   * @private
   */
  getError(errorMessage, error) {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.string("errorMessage", errorMessage);
    //>>includeEnd('debug');

    if (defined(error) && defined(error.message)) {
      errorMessage += `\n${error.message}`;
    }

    const runtimeError = new RuntimeError(errorMessage);
    if (defined(error)) {
      runtimeError.stack = `Original stack:\n${error.stack}\nHandler stack:\n${runtimeError.stack}`;
    }

    return runtimeError;
  }

  /**
   * Returns true if this object was destroyed; otherwise, false.
   * <br /><br />
   * If this object was destroyed, it should not be used; calling any function other than
   * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
   *
   * @returns {boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
   *
   * @see ResourceLoader#destroy
   * @private
   */
  isDestroyed() {
    return false;
  }

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
  destroy() {
    this.unload();
    return destroyObject(this);
  }
}

export default ResourceLoader;
