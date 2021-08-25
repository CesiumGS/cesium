import DeveloperError from "../Core/DeveloperError.js";

/**
 * A light source. This type describes an interface and is not intended to be instantiated directly. Together, `color` and `intensity` produce a high-dynamic-range light color. `intensity` can also be used individually to dim or brighten the light without changing the hue.
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
   * The intensity controls the strength of the light. `intensity` has a minimum value of 0.0 and no maximum value.
   * @memberof Light.prototype
   * @type {Number}
   */
  intensity: {
    get: DeveloperError.throwInstantiationError,
  },
});

export default Light;
