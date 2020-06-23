import DeveloperError from "../Core/DeveloperError.js";

/**
 * A light source. This type describes an interface and is not intended to be instantiated directly.
 *
 * @alias Light
 * @constructor
 *
 * @see DirectionalLight
 * @see SunLight
 */
function Light() {}

Object.defineProperties(Light.prototype, {
  /**
   * The color of the light.
   * @memberof Light.prototype
   * @type {Color}
   */
  color: {
    get: DeveloperError.throwInstantiationError,
  },

  /**
   * The intensity of the light.
   * @memberof Light.prototype
   * @type {Number}
   */
  intensity: {
    get: DeveloperError.throwInstantiationError,
  },
});

export default Light;
