import Check from "../Core/Check.js";
import defined from "../Core/defined.js";
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
 */
ResourceLoader.prototype.load = function () {
  DeveloperError.throwInstantiationError();
};

/**
 * Unloads the resource. Does not need to be defined for all implementations of this interface.
 */
ResourceLoader.prototype.unload = function () {
  DeveloperError.throwInstantiationError();
};

/**
 * Updates the resource. Does not need to be defined for all implementations of this interface.
 *
 * @param {FrameState} frameState The frame state.
 */
ResourceLoader.prototype.update = function (frameState) {
  DeveloperError.throwInstantiationError();
};

/**
 * Constructs a {@link RuntimeError} from an errorMessage and an error.
 *
 * @param {String} errorMessage The error message.
 * @param {Error} [error] The error.
 *
 * @returns {RuntimeError} The runtime error.
 */
ResourceLoader.getError = function (errorMessage, error) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("errorMessage", errorMessage);
  //>>includeEnd('debug');

  if (defined(error)) {
    errorMessage += "\n" + error.message;
  }
  return new RuntimeError(errorMessage);
};
