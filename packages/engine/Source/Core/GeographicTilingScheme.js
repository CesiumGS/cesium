import Cartesian2 from "./Cartesian2.js";
import Check from "./Check.js";
import Frozen from "./Frozen.js";
import defined from "./defined.js";
import Ellipsoid from "./Ellipsoid.js";
import GeographicProjection from "./GeographicProjection.js";
import CesiumMath from "./Math.js";
import Rectangle from "./Rectangle.js";

/**
 * A tiling scheme for geometry referenced to a simple {@link GeographicProjection} where
 * longitude and latitude are directly mapped to X and Y.  This projection is commonly
 * known as geographic, equirectangular, equidistant cylindrical, or plate carrée.
 *
 * @alias GeographicTilingScheme
 * @constructor
 *
 * @param {object} [options] Object with the following properties:
 * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.default] The ellipsoid whose surface is being tiled. Defaults to
 * the default ellipsoid.
 * @param {Rectangle} [options.rectangle=Rectangle.MAX_VALUE] The rectangle, in radians, covered by the tiling scheme.
 * @param {number} [options.numberOfLevelZeroTilesX=2] The number of tiles in the X direction at level zero of
 * the tile tree.
 * @param {number} [options.numberOfLevelZeroTilesY=1] The number of tiles in the Y direction at level zero of
 * the tile tree.
 */
function GeographicTilingScheme(options) {
  options = options ?? Frozen.EMPTY_OBJECT;

  this._ellipsoid = options.ellipsoid ?? Ellipsoid.default;
  this._rectangle = options.rectangle ?? Rectangle.MAX_VALUE;
  this._projection = new GeographicProjection(this._ellipsoid);
  this._numberOfLevelZeroTilesX = options.numberOfLevelZeroTilesX ?? 2;
  this._numberOfLevelZeroTilesY = options.numberOfLevelZeroTilesY ?? 1;
}

Object.defineProperties(GeographicTilingScheme.prototype, {
  /**
   * Gets the ellipsoid that is tiled by this tiling scheme.
   * @memberof GeographicTilingScheme.prototype
   * @type {Ellipsoid}
   */
  ellipsoid: {
    get: function () {
      return this._ellipsoid;
    },
  },

  /**
   * Gets the rectangle, in radians, covered by this tiling scheme.
   * @memberof GeographicTilingScheme.prototype
   * @type {Rectangle}
   */
  rectangle: {
    get: function () {
      return this._rectangle;
    },
  },

  /**
   * Gets the map projection used by this tiling scheme.
   * @memberof GeographicTilingScheme.prototype
   * @type {MapProjection}
   */
  projection: {
    get: function () {
      return this._projection;
    },
  },
});

/**
 * Gets the total number of tiles in the X direction at a specified level-of-detail.
 *
 * @param {number} level The level-of-detail.
 * @returns {number} The number of tiles in the X direction at the given level.
 */
GeographicTilingScheme.prototype.getNumberOfXTilesAtLevel = function (level) {
  return this._numberOfLevelZeroTilesX << level;
};

/**
 * Gets the total number of tiles in the Y direction at a specified level-of-detail.
 *
 * @param {number} level The level-of-detail.
 * @returns {number} The number of tiles in the Y direction at the given level.
 */
GeographicTilingScheme.prototype.getNumberOfYTilesAtLevel = function (level) {
  return this._numberOfLevelZeroTilesY << level;
};

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
GeographicTilingScheme.prototype.rectangleToNativeRectangle = function (
  rectangle,
  result,
) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("rectangle", rectangle);
  //>>includeEnd('debug');

  const west = CesiumMath.toDegrees(rectangle.west);
  const south = CesiumMath.toDegrees(rectangle.south);
  const east = CesiumMath.toDegrees(rectangle.east);
  const north = CesiumMath.toDegrees(rectangle.north);

  if (!defined(result)) {
    return new Rectangle(west, south, east, north);
  }

  result.west = west;
  result.south = south;
  result.east = east;
  result.north = north;
  return result;
};

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
GeographicTilingScheme.prototype.tileXYToNativeRectangle = function (
  x,
  y,
  level,
  result,
) {
  const rectangleRadians = this.tileXYToRectangle(x, y, level, result);
  rectangleRadians.west = CesiumMath.toDegrees(rectangleRadians.west);
  rectangleRadians.south = CesiumMath.toDegrees(rectangleRadians.south);
  rectangleRadians.east = CesiumMath.toDegrees(rectangleRadians.east);
  rectangleRadians.north = CesiumMath.toDegrees(rectangleRadians.north);
  return rectangleRadians;
};

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
GeographicTilingScheme.prototype.tileXYToRectangle = function (
  x,
  y,
  level,
  result,
) {
  const rectangle = this._rectangle;

  const xTiles = this.getNumberOfXTilesAtLevel(level);
  const yTiles = this.getNumberOfYTilesAtLevel(level);

  const xTileWidth = rectangle.width / xTiles;
  const west = x * xTileWidth + rectangle.west;
  const east = (x + 1) * xTileWidth + rectangle.west;

  const yTileHeight = rectangle.height / yTiles;
  const north = rectangle.north - y * yTileHeight;
  const south = rectangle.north - (y + 1) * yTileHeight;

  if (!defined(result)) {
    result = new Rectangle(west, south, east, north);
  }

  result.west = west;
  result.south = south;
  result.east = east;
  result.north = north;
  return result;
};

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
GeographicTilingScheme.prototype.positionToTileXY = function (
  position,
  level,
  result,
) {
  const rectangle = this._rectangle;
  if (!Rectangle.contains(rectangle, position)) {
    // outside the bounds of the tiling scheme
    return undefined;
  }

  const xTiles = this.getNumberOfXTilesAtLevel(level);
  const yTiles = this.getNumberOfYTilesAtLevel(level);

  const xTileWidth = rectangle.width / xTiles;
  const yTileHeight = rectangle.height / yTiles;

  let longitude = position.longitude;
  if (rectangle.east < rectangle.west) {
    longitude += CesiumMath.TWO_PI;
  }

  let xTileCoordinate = ((longitude - rectangle.west) / xTileWidth) | 0;
  if (xTileCoordinate >= xTiles) {
    xTileCoordinate = xTiles - 1;
  }

  let yTileCoordinate =
    ((rectangle.north - position.latitude) / yTileHeight) | 0;
  if (yTileCoordinate >= yTiles) {
    yTileCoordinate = yTiles - 1;
  }

  if (!defined(result)) {
    return new Cartesian2(xTileCoordinate, yTileCoordinate);
  }

  result.x = xTileCoordinate;
  result.y = yTileCoordinate;
  return result;
};
export default GeographicTilingScheme;
