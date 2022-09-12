import Color from "../Core/Color.js";
import defaultValue from "../Core/defaultValue.js";

/**
 * A directional light source that originates from the Sun.
 *
 * @param {Object} [options] Object with the following properties:
 * @param {Color} [options.color=Color.WHITE] The light's color.
 * @param {Number} [options.intensity=2.0] The light's intensity.
 *
 * @alias SunLight
 * @constructor
 */
function SunLight(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  /**
   * The color of the light.
   * @type {Color}
   * @default Color.WHITE
   */
  this.color = Color.clone(defaultValue(options.color, Color.WHITE));

  /**
   * The intensity of the light.
   * @type {Number}
   * @default 2.0
   */
  this.intensity = defaultValue(options.intensity, 2.0);
}

export default SunLight;
