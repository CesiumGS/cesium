// @ts-check

import DeveloperError from "./DeveloperError.js";

/** @import Cartesian2 from "./Cartesian2.js"; */
/** @import Cartographic from "./Cartographic.js"; */
/** @import Ellipsoid from "./Ellipsoid.js"; */
/** @import MapProjection from "./MapProjection.js"; */
/** @import Rectangle from "./Rectangle.js"; */

/**
 * A tiling scheme for geometry or imagery on the surface of an ellipsoid.  At level-of-detail zero,
 * the coarsest, least-detailed level, the number of tiles is configurable.
 * At level of detail one, each of the level zero tiles has four children, two in each direction.
 * At level of detail two, each of the level one tiles has four children, two in each direction.
 * This continues for as many levels as are present in the geometry or imagery source.
 *
 * @interface
 *
 * @see WebMercatorTilingScheme
 * @see GeographicTilingScheme
 */
class TilingScheme {
  /**
   * Gets the ellipsoid that is tiled by the tiling scheme.
   * @type {Ellipsoid}
   */
  ellipsoid;

  /**
   * Gets the rectangle, in radians, covered by this tiling scheme.
   * @type {Rectangle}
   */
  rectangle;

  /**
   * Gets the map projection used by the tiling scheme.
   * @type {MapProjection}
   */
  projection;

  /**
   * @param {object} options
   */
  constructor(options) {
    //>>includeStart('debug', pragmas.debug);
    throw new DeveloperError(
      "This type should not be instantiated directly.  Instead, use WebMercatorTilingScheme or GeographicTilingScheme.",
    );
    //>>includeEnd('debug');
  }

  /**
   * Gets the total number of tiles in the X direction at a specified level-of-detail.
   *
   * @param {number} level The level-of-detail.
   * @returns {number} The number of tiles in the X direction at the given level.
   */
  getNumberOfXTilesAtLevel(level) {
    DeveloperError.throwInstantiationError();
  }

  /**
   * Gets the total number of tiles in the Y direction at a specified level-of-detail.
   *
   * @param {number} level The level-of-detail.
   * @returns {number} The number of tiles in the Y direction at the given level.
   */
  getNumberOfYTilesAtLevel(level) {
    DeveloperError.throwInstantiationError();
  }

  /**
   * Transforms a rectangle specified in geodetic radians to the native coordinate system
   * of this tiling scheme.
   *
   * @param {Rectangle} rectangle The rectangle to transform.
   * @param {Rectangle} [result] The instance to which to copy the result, or undefined if a new instance
   *        should be created.
   * @returns {Rectangle} The specified 'result', or a new object containing the native rectangle if 'result'
   *          is undefined.
   */
  rectangleToNativeRectangle(rectangle, result) {
    DeveloperError.throwInstantiationError();
  }

  /**
   * Converts tile x, y coordinates and level to a rectangle expressed in the native coordinates
   * of the tiling scheme.
   *
   * @param {number} x The integer x coordinate of the tile.
   * @param {number} y The integer y coordinate of the tile.
   * @param {number} level The tile level-of-detail.  Zero is the least detailed.
   * @param {object} [result] The instance to which to copy the result, or undefined if a new instance
   *        should be created.
   * @returns {Rectangle} The specified 'result', or a new object containing the rectangle
   *          if 'result' is undefined.
   */
  tileXYToNativeRectangle(x, y, level, result) {
    DeveloperError.throwInstantiationError();
  }

  /**
   * Converts tile x, y coordinates and level to a cartographic rectangle in radians.
   *
   * @param {number} x The integer x coordinate of the tile.
   * @param {number} y The integer y coordinate of the tile.
   * @param {number} level The tile level-of-detail.  Zero is the least detailed.
   * @param {object} [result] The instance to which to copy the result, or undefined if a new instance
   *        should be created.
   * @returns {Rectangle} The specified 'result', or a new object containing the rectangle
   *          if 'result' is undefined.
   */
  tileXYToRectangle(x, y, level, result) {
    DeveloperError.throwInstantiationError();
  }

  /**
   * Calculates the tile x, y coordinates of the tile containing
   * a given cartographic position.
   *
   * @param {Cartographic} position The position.
   * @param {number} level The tile level-of-detail.  Zero is the least detailed.
   * @param {Cartesian2} [result] The instance to which to copy the result, or undefined if a new instance
   *        should be created.
   * @returns {Cartesian2} The specified 'result', or a new object containing the tile x, y coordinates
   *          if 'result' is undefined.
   */
  positionToTileXY(position, level, result) {
    DeveloperError.throwInstantiationError();
  }
}

export default TilingScheme;
