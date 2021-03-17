import DeveloperError from "../Core/DeveloperError.js";

/**
 * A cache resource.
 * <p>
 * This type describes an interface and is not intended to be instantiated directly.
 * </p>
 *
 * @alias CacheResource
 * @constructor
 *
 * @see ResourceCache
 *
 * @private
 */
function CacheResource() {}

Object.defineProperties(CacheResource.prototype, {
  /**
   * A promise that resolves to the resource when the resource is ready.
   *
   * @memberof CacheResource.prototype
   *
   * @type {Promise.<CacheResource>}
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
   * @memberof CacheResource.prototype
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
CacheResource.prototype.load = function () {
  DeveloperError.throwInstantiationError();
};

/**
 * Unloads the resource. Does not need to be defined for all implementations of this interface.
 */
CacheResource.prototype.unload = function () {
  DeveloperError.throwInstantiationError();
};

/**
 * Updates the resource. Does not need to be defined for all implementations of this interface.
 *
 * @param {FrameState} frameState The frame state.
 */
CacheResource.prototype.update = function (frameState) {
  DeveloperError.throwInstantiationError();
};
