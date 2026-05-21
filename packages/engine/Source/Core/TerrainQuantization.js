// @ts-check

/**
 * This enumerated type is used to determine how the vertices of the terrain mesh are compressed.
 *
 * @enum {number}
 *
 * @private
 */
const TerrainQuantization = {
  /**
   * The vertices are not compressed.
   *
   * @type {number}
   * @constant
   */
  NONE: 0,

  /**
   * The vertices are compressed to 12 bits.
   *
   * @type {number}
   * @constant
   */
  BITS12: 1,
};

Object.freeze(TerrainQuantization);

export default TerrainQuantization;
