/**
 * Defines how per-feature colors set from the Cesium API or declarative styling blend with the source colors from
 * the original feature, e.g. glTF material or per-point color in the tile.
 * <p>
 * When <code>REPLACE</code> or <code>MIX</code> are used and the source color is a glTF material, the technique must assign the
 * <code>_3DTILESDIFFUSE</code> semantic to the diffuse color parameter. Otherwise only <code>HIGHLIGHT</code> is supported.
 * </p>
 * <p>
 * A feature whose color evaluates to white (1.0, 1.0, 1.0) is always rendered without color blending, regardless of the
 * tileset's color blend mode.
 * </p>
 * <pre><code>
 * "techniques": {
 *   "technique0": {
 *     "parameters": {
 *       "diffuse": {
 *         "semantic": "_3DTILESDIFFUSE",
 *         "type": 35666
 *       }
 *     }
 *   }
 * }
 * </code></pre>
 *
 * @enum {Number}
 */
var Cesium3DTileColorBlendMode = {
  /**
   * Multiplies the source color by the feature color.
   *
   * @type {Number}
   * @constant
   */
  HIGHLIGHT: 0,

  /**
   * Replaces the source color with the feature color.
   *
   * @type {Number}
   * @constant
   */
  REPLACE: 1,

  /**
   * Blends the source color and feature color together.
   *
   * @type {Number}
   * @constant
   */
  MIX: 2,
};
export default Object.freeze(Cesium3DTileColorBlendMode);
