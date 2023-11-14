/**
 * The encoding that is used for a heightmap
 *
 * @enum {Number}
 */
const HeightmapEncoding = {
  /**
   * No encoding
   *
   * @type {Number}
   * @constant
   */
  NONE: 0,

  /**
   * LERC encoding
   *
   * @type {Number}
   * @constant
   *
   * @see {@link https://github.com/Esri/lerc|The LERC specification}
   */
  LERC: 1,
};
export default Object.freeze(HeightmapEncoding);
