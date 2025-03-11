import Color from "../Core/Color.js";
import Frozen from "../Core/Frozen.js";

/**
 * A directional light source that originates from the Sun.
 *
 * @param {object} [options] Object with the following properties:
 * @param {Color} [options.color=Color.WHITE] The light's color.
 * @param {number} [options.intensity=2.0] The light's intensity.
 *
 * @alias SunLight
 * @constructor
 */
function SunLight(options) {
  options = options ?? Frozen.EMPTY_OBJECT;
  /**
   * The color of the light.
   * @type {Color}
   * @default Color.WHITE
   */
  this.color = Color.clone(options.color ?? Color.WHITE);

  /**
   * The intensity of the light.
   * @type {number}
   * @default 2.0
   */
  this.intensity = options.intensity ?? 2.0;
}

export default SunLight;
