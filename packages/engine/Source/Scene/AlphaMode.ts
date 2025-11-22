/**
 * The alpha rendering mode of the material.
 *
 * @enum {string}
 * @private
 */
const AlphaMode = {
  /**
   * The alpha value is ignored and the rendered output is fully opaque.
   *
   * @type {string}
   * @constant
   */
  OPAQUE: "OPAQUE",

  /**
   * The rendered output is either fully opaque or fully transparent depending on the alpha value and the specified alpha cutoff value.
   *
   * @type {string}
   * @constant
   */
  MASK: "MASK",

  /**
   * The rendered output is composited onto the destination with alpha blending.
   *
   * @type {string}
   * @constant
   */
  BLEND: "BLEND",
};

export default Object.freeze(AlphaMode);
