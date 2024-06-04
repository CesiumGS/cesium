import Cartesian2 from "./Cartesian2.js";
import defaultValue from "./defaultValue.js";
import defined from "./defined.js";
import Ellipsoid from "./Ellipsoid.js";
import Rectangle from "./Rectangle.js";
import WebMercatorProjection from "./WebMercatorProjection.js";

/**
 * A tiling scheme for geometry referenced to a {@link WebMercatorProjection}, EPSG:3857.  This is
 * the tiling scheme used by Google Maps, Microsoft Bing Maps, and most of ESRI ArcGIS Online.
 *
 * @alias WebMercatorTilingScheme
 * @constructor
 *
 * @param {object} [options] Object with the following properties:
 * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid whose surface is being tiled. Defaults to
 * the WGS84 ellipsoid.
 * @param {number} [options.numberOfLevelZeroTilesX=1] The number of tiles in the X direction at level zero of
 *        the tile tree.
 * @param {number} [options.numberOfLevelZeroTilesY=1] The number of tiles in the Y direction at level zero of
 *        the tile tree.
 * @param {Cartesian2} [options.rectangleSouthwestInMeters] The southwest corner of the rectangle covered by the
 *        tiling scheme, in meters.  If this parameter or rectangleNortheastInMeters is not specified, the entire
 *        globe is covered in the longitude direction and an equal distance is covered in the latitude
 *        direction, resulting in a square projection.
 * @param {Cartesian2} [options.rectangleNortheastInMeters] The northeast corner of the rectangle covered by the
 *        tiling scheme, in meters.  If this parameter or rectangleSouthwestInMeters is not specified, the entire
 *        globe is covered in the longitude direction and an equal distance is covered in the latitude
 *        direction, resulting in a square projection.
 */
function WebMercatorTilingScheme(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  this._ellipsoid = defaultValue(options.ellipsoid, Ellipsoid.WGS84);
  this._numberOfLevelZeroTilesX = defaultValue(
    options.numberOfLevelZeroTilesX,
    1
  );
  this._numberOfLevelZeroTilesY = defaultValue(
    options.numberOfLevelZeroTilesY,
    1
  );

  this._projection = new WebMercatorProjection(this._ellipsoid);

  if (
    defined(options.rectangleSouthwestInMeters) &&
    defined(options.rectangleNortheastInMeters)
  ) {
    this._rectangleSouthwestInMeters = options.rectangleSouthwestInMeters;
    this._rectangleNortheastInMeters = options.rectangleNortheastInMeters;
  } else {
    const semimajorAxisTimesPi = this._ellipsoid.maximumRadius * Math.PI;
    this._rectangleSouthwestInMeters = new Cartesian2(
      -semimajorAxisTimesPi,
      -semimajorAxisTimesPi
    );
    this._rectangleNortheastInMeters = new Cartesian2(
      semimajorAxisTimesPi,
      semimajorAxisTimesPi
    );
  }

  const southwest = this._projection.unproject(
    this._rectangleSouthwestInMeters
  );
  const northeast = this._projection.unproject(
    this._rectangleNortheastInMeters
  );
  this._rectangle = new Rectangle(
    southwest.longitude,
    southwest.latitude,
    northeast.longitude,
    northeast.latitude
  );
}

Object.defineProperties(WebMercatorTilingScheme.prototype, {
  /**
   * Gets the ellipsoid that is tiled by this tiling scheme.
   * @memberof WebMercatorTilingScheme.prototype
   * @type {Ellipsoid}
   */
  ellipsoid: {
    get: function () {
      return this._ellipsoid;
    },
  },

  /**
   * Gets the rectangle, in radians, covered by this tiling scheme.
   * @memberof WebMercatorTilingScheme.prototype
   * @type {Rectangle}
   */
  rectangle: {
    get: function () {
      return this._rectangle;
    },
  },

  /**
   * Gets the map projection used by this tiling scheme.
   * @memberof WebMercatorTilingScheme.prototype
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
WebMercatorTilingScheme.prototype.getNumberOfXTilesAtLevel = function (level) {
  return this._numberOfLevelZeroTilesX << level;
};

/**
 * Gets the total number of tiles in the Y direction at a specified level-of-detail.
 *
 * @param {number} level The level-of-detail.
 * @returns {number} The number of tiles in the Y direction at the given level.
 */
WebMercatorTilingScheme.prototype.getNumberOfYTilesAtLevel = function (level) {
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
WebMercatorTilingScheme.prototype.rectangleToNativeRectangle = function (
  rectangle,
  result
) {
  const projection = this._projection;
  const southwest = projection.project(Rectangle.southwest(rectangle));
  const northeast = projection.project(Rectangle.northeast(rectangle));

  if (!defined(result)) {
    return new Rectangle(southwest.x, southwest.y, northeast.x, northeast.y);
  }

  result.west = southwest.x;
  result.south = southwest.y;
  result.east = northeast.x;
  result.north = northeast.y;
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
WebMercatorTilingScheme.prototype.tileXYToNativeRectangle = function (
  x,
  y,
  level,
  result
) {
  const xTiles = this.getNumberOfXTilesAtLevel(level);
  const yTiles = this.getNumberOfYTilesAtLevel(level);

  const xTileWidth =
    (this._rectangleNortheastInMeters.x - this._rectangleSouthwestInMeters.x) /
    xTiles;
  const west = this._rectangleSouthwestInMeters.x + x * xTileWidth;
  const east = this._rectangleSouthwestInMeters.x + (x + 1) * xTileWidth;

  const yTileHeight =
    (this._rectangleNortheastInMeters.y - this._rectangleSouthwestInMeters.y) /
    yTiles;
  const north = this._rectangleNortheastInMeters.y - y * yTileHeight;
  const south = this._rectangleNortheastInMeters.y - (y + 1) * yTileHeight;

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
WebMercatorTilingScheme.prototype.tileXYToRectangle = function (
  x,
  y,
  level,
  result
) {
  const nativeRectangle = this.tileXYToNativeRectangle(x, y, level, result);

  const projection = this._projection;
  const southwest = projection.unproject(
    new Cartesian2(nativeRectangle.west, nativeRectangle.south)
  );
  const northeast = projection.unproject(
    new Cartesian2(nativeRectangle.east, nativeRectangle.north)
  );

  nativeRectangle.west = southwest.longitude;
  nativeRectangle.south = southwest.latitude;
  nativeRectangle.east = northeast.longitude;
  nativeRectangle.north = northeast.latitude;
  return nativeRectangle;
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
WebMercatorTilingScheme.prototype.positionToTileXY = function (
  position,
  level,
  result
) {
  const rectangle = this._rectangle;
  if (!Rectangle.contains(rectangle, position)) {
    // outside the bounds of the tiling scheme
    return undefined;
  }

  const xTiles = this.getNumberOfXTilesAtLevel(level);
  const yTiles = this.getNumberOfYTilesAtLevel(level);

  const overallWidth =
    this._rectangleNortheastInMeters.x - this._rectangleSouthwestInMeters.x;
  const xTileWidth = overallWidth / xTiles;
  const overallHeight =
    this._rectangleNortheastInMeters.y - this._rectangleSouthwestInMeters.y;
  const yTileHeight = overallHeight / yTiles;

  const projection = this._projection;

  const webMercatorPosition = projection.project(position);
  const distanceFromWest =
    webMercatorPosition.x - this._rectangleSouthwestInMeters.x;
  const distanceFromNorth =
    this._rectangleNortheastInMeters.y - webMercatorPosition.y;

  let xTileCoordinate = (distanceFromWest / xTileWidth) | 0;
  if (xTileCoordinate >= xTiles) {
    xTileCoordinate = xTiles - 1;
  }
  let yTileCoordinate = (distanceFromNorth / yTileHeight) | 0;
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
export default WebMercatorTilingScheme;
