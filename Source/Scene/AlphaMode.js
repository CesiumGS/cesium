/**
 * The alpha rendering mode of the material.
 *
 * @enum {String}
 * @private
 */
var AlphaMode = {
  /**
   * The alpha value is ignored and the rendered output is fully opaque.
   *
   * @type {String}
   * @constant
   */
  OPAQUE: "OPAQUE",

  /**
   * The rendered output is either fully opaque or fully transparent depending on the alpha value and the specified alpha cutoff value.
   *
   * @type {String}
   * @constant
   */
  MASK: "MASK",

  /**
   * The rendered output is composited onto the destination with alpha blending.
   *
   * @type {String}
   * @constant
   */
  BLEND: "BLEND",
};

export default Object.freeze(AlphaMode);
