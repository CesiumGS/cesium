import DeveloperError from "../Core/DeveloperError.js";

/**
 * A light source. This type describes an interface and is not intended to be instantiated directly. Together, <code>color</code> and <code>intensity</code> produce a high-dynamic-range light color. <code>intensity</code> can also be used individually to dim or brighten the light without changing the hue.
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
   * The intensity controls the strength of the light. <code>intensity</code> has a minimum value of 0.0 and no maximum value.
   * @memberof Light.prototype
   * @type {number}
   */
  intensity: {
    get: DeveloperError.throwInstantiationError,
  },
});

export default Light;
