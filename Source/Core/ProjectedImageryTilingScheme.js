import CesiumMath from "./Math.js";
import Check from "./Check.js";
import defaultValue from "./defaultValue.js";
import defined from "./defined.js";
import defineProperties from "./defineProperties.js";
import GeographicTilingScheme from "./GeographicTilingScheme.js";
import Ellipsoid from "./Ellipsoid.js";
import Rectangle from "./Rectangle.js";
/**
 * A tiling scheme for imagery being reprojected from any projection to geographic.
 * ProjectedImageryTilingScheme is intended for generating geographic {@link Imagery} tiles that draw from
 * multiple source images.
 *
 * Geographic tiles are not generated if any of their source images should be discarded according to the
 * ImageryProvider's {@link TileDiscardPolicy}.
 *
 * @param {Object} options Object with the following properties:
 * @param {MapProjection} options.mapProjection MapProjection to the imagery's CRS.
 * @param {Rectangle} options.projectedRectangle Rectangle covered by the imagery in its CRS.
 * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid whose surface is being tiled. Defaults to
 * the WGS84 ellipsoid.
 * @param {Number} [options.numberOfLevelZeroTilesX=1] The number of tiles in the X direction at level zero of
 *        the tile tree.
 * @param {Number} [options.numberOfLevelZeroTilesY=1] The number of tiles in the Y direction at level zero of
 *        the tile tree.
 */
function ProjectedImageryTilingScheme(options) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("options", options);
  Check.defined("options.mapProjection", options.mapProjection);
  Check.defined("options.projectedRectangle", options.projectedRectangle);
  //>>includeEnd('debug');

  var ellipsoid = defaultValue(options.ellipsoid, Ellipsoid.WGS84);
  var mapProjection = options.mapProjection;
  var projectedRectangle = options.projectedRectangle;

  var cartographicRectangle = Rectangle.approximateCartographicExtents({
    projectedRectangle: projectedRectangle,
    mapProjection: mapProjection,
  });

  var numberOfLevelZeroTilesX = defaultValue(
    options.numberOfLevelZeroTilesX,
    1
  );
  var numberOfLevelZeroTilesY = defaultValue(
    options.numberOfLevelZeroTilesY,
    1
  );

  var geographicLevelZeroTilesX = numberOfLevelZeroTilesX;
  var geographicLevelZeroTilesY = numberOfLevelZeroTilesY;

  this._geographicProjection = new GeographicTilingScheme({
    ellipsoid: ellipsoid,
    rectangle: cartographicRectangle,
    numberOfLevelZeroTilesX: geographicLevelZeroTilesX,
    numberOfLevelZeroTilesY: geographicLevelZeroTilesY,
  });

  this._projection = mapProjection;
  this._projectedRectangle = Rectangle.clone(projectedRectangle);
  this._cartographicRectangle = cartographicRectangle;

  this._ellipsoid = ellipsoid;
  this._numberOfLevelZeroTilesX = numberOfLevelZeroTilesX;
  this._numberOfLevelZeroTilesY = numberOfLevelZeroTilesY;
}

defineProperties(ProjectedImageryTilingScheme.prototype, {
  /**
   * Gets the ellipsoid that is tiled by this tiling scheme.
   * @memberof ProjectedImageryTilingScheme.prototype
   * @type {Ellipsoid}
   */
  ellipsoid: {
    get: function () {
      return this._geographicProjection.ellipsoid;
    },
  },

  /**
   * Gets the rectangle, in radians, covered by this tiling scheme.
   * @memberof ProjectedImageryTilingScheme.prototype
   * @type {Rectangle}
   */
  rectangle: {
    get: function () {
      return this._geographicProjection.rectangle;
    },
  },

  /**
   * Gets the map projection used by this tiling scheme.
   * @memberof ProjectedImageryTilingScheme.prototype
   * @type {MapProjection}
   */
  projection: {
    get: function () {
      return this._geographicProjection.projection;
    },
  },

  /**
   * Gets the imagery's map projectoin.
   *
   * @private
   * @memberof ProjectedImageryTilingScheme.prototype
   * @type {MapProjection}
   */
  sourceProjection: {
    get: function () {
      return this._projection;
    },
  },
});

var tileRectangleScratch = new Rectangle();
var tileProjectedRectangleScratch = new Rectangle();
/**
 * Utility function that gets all the tile indices (x, y) at the requested level for the
 * native imagery tiles needed to generate the given projected tile.
 *
 * @param {Number} x The integer x coordinate of the tile.
 * @param {Number} y The integer y coordinate of the tile.
 * @param {Number} level The tile level-of-detail.  Zero is the least detailed.
 * @returns {Number[]} Array of numbers containing x and y for the native imagery tiles at the same level
 */
ProjectedImageryTilingScheme.prototype.getProjectedTilesForNativeTile = function (
  x,
  y,
  level
) {
  var tileRectangle = this.tileXYToRectangle(x, y, level, tileRectangleScratch);
  var tileProjectedRectangle = Rectangle.approximateProjectedExtents(
    {
      cartographicRectangle: tileRectangle,
      mapProjection: this._projection,
    },
    tileProjectedRectangleScratch
  );

  // Figure out which tiles at this level the projected rectangle covers.
  // March over to get a list.
  var projectedTilesX = this._numberOfLevelZeroTilesX << level;
  var projectedTilesY = this._numberOfLevelZeroTilesY << level;

  var projectedRectangle = this._projectedRectangle;
  var inverseTileWidth = projectedTilesX / projectedRectangle.width;
  var inverseTileHeight = projectedTilesY / projectedRectangle.height;

  // Compute the native tiles that the tileProjectedRectangle's corners fall in
  var startX = Math.floor(
    (tileProjectedRectangle.west - projectedRectangle.west) * inverseTileWidth
  );
  var endX = Math.ceil(
    (tileProjectedRectangle.east - projectedRectangle.west) * inverseTileWidth
  );
  var startY = Math.floor(
    (tileProjectedRectangle.south - projectedRectangle.south) *
      inverseTileHeight
  );
  var endY = Math.ceil(
    (tileProjectedRectangle.north - projectedRectangle.south) *
      inverseTileHeight
  );

  startX = CesiumMath.clamp(startX, 0, projectedTilesX);
  startY = CesiumMath.clamp(startY, 0, projectedTilesY);
  endX = CesiumMath.clamp(endX, 0, projectedTilesX);
  endY = CesiumMath.clamp(endY, 0, projectedTilesY);

  var indicesXY = [];
  for (var tileY = startY; tileY < endY; tileY++) {
    for (var tileX = startX; tileX < endX; tileX++) {
      indicesXY.push(tileX);
      indicesXY.push(projectedTilesY - 1 - tileY);
    }
  }

  return indicesXY;
};

/**
 * Utility function that gets the projected rectangle around a projected tile.
 *
 * @param {Number} x The integer x coordinate of the tile.
 * @param {Number} y The integer y coordinate of the tile.
 * @param {Number} level The tile level-of-detail.  Zero is the least detailed.
 * @param {Object} [result] The instance to which to copy the result, or undefined if a new instance
 *        should be created.
 * @returns {Rectangle} The specified 'result', or a new object containing the rectangle
 *          if 'result' is undefined.
 */
ProjectedImageryTilingScheme.prototype.getProjectedTileProjectedRectangle = function (
  x,
  y,
  level,
  result
) {
  var projectedTilesX = this._numberOfLevelZeroTilesX << level;
  var projectedTilesY = this._numberOfLevelZeroTilesY << level;

  var projectedRectangle = this._projectedRectangle;
  var xTileWidth = projectedRectangle.width / projectedTilesX;
  var west = projectedRectangle.west + x * xTileWidth;
  var east = projectedRectangle.west + (x + 1) * xTileWidth;

  var yTileHeight = projectedRectangle.height / projectedTilesY;
  var north = projectedRectangle.north - y * yTileHeight;
  var south = projectedRectangle.north - (y + 1) * yTileHeight;

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
 * Gets the total number of tiles in the X direction at a specified level-of-detail.
 *
 * @param {Number} level The level-of-detail.
 * @returns {Number} The number of tiles in the X direction at the given level.
 */
ProjectedImageryTilingScheme.prototype.getNumberOfXTilesAtLevel = function (
  level
) {
  return this._geographicProjection.getNumberOfXTilesAtLevel(level);
};

/**
 * Gets the total number of tiles in the Y direction at a specified level-of-detail.
 *
 * @param {Number} level The level-of-detail.
 * @returns {Number} The number of tiles in the Y direction at the given level.
 */
ProjectedImageryTilingScheme.prototype.getNumberOfYTilesAtLevel = function (
  level
) {
  return this._geographicProjection.getNumberOfYTilesAtLevel(level);
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
ProjectedImageryTilingScheme.prototype.rectangleToNativeRectangle = function (
  rectangle,
  result
) {
  return this._geographicProjection.rectangleToNativeRectangle(
    rectangle,
    result
  );
};

/**
 * Converts tile x, y coordinates and level to a rectangle expressed in the native coordinates
 * of the tiling scheme.
 *
 * @param {Number} x The integer x coordinate of the tile.
 * @param {Number} y The integer y coordinate of the tile.
 * @param {Number} level The tile level-of-detail.  Zero is the least detailed.
 * @param {Object} [result] The instance to which to copy the result, or undefined if a new instance
 *        should be created.
 * @returns {Rectangle} The specified 'result', or a new object containing the rectangle
 *          if 'result' is undefined.
 */
ProjectedImageryTilingScheme.prototype.tileXYToNativeRectangle = function (
  x,
  y,
  level,
  result
) {
  return this._geographicProjection.tileXYToNativeRectangle(
    x,
    y,
    level,
    result
  );
};

/**
 * Converts tile x, y coordinates and level to a cartographic rectangle in radians.
 *
 * @param {Number} x The integer x coordinate of the tile.
 * @param {Number} y The integer y coordinate of the tile.
 * @param {Number} level The tile level-of-detail.  Zero is the least detailed.
 * @param {Object} [result] The instance to which to copy the result, or undefined if a new instance
 *        should be created.
 * @returns {Rectangle} The specified 'result', or a new object containing the rectangle
 *          if 'result' is undefined.
 */
ProjectedImageryTilingScheme.prototype.tileXYToRectangle = function (
  x,
  y,
  level,
  result
) {
  return this._geographicProjection.tileXYToRectangle(x, y, level, result);
};

/**
 * Calculates the tile x, y coordinates of the tile containing
 * a given cartographic position.
 *
 * @param {Cartographic} position The position.
 * @param {Number} level The tile level-of-detail.  Zero is the least detailed.
 * @param {Cartesian2} [result] The instance to which to copy the result, or undefined if a new instance
 *        should be created.
 * @returns {Cartesian2} The specified 'result', or a new object containing the tile x, y coordinates
 *          if 'result' is undefined.
 */
ProjectedImageryTilingScheme.prototype.positionToTileXY = function (
  position,
  level,
  result
) {
  return this._geographicProjection.positionToTileXY(position, level, result);
};

export default ProjectedImageryTilingScheme;
