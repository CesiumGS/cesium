/*global define*/
define([
        './Cartesian2',
        './defaultValue',
        './defined',
        './defineProperties',
        './Ellipsoid',
        './Rectangle',
        './WebMercatorProjection'
    ], function(
        Cartesian2,
        defaultValue,
        defined,
        defineProperties,
        Ellipsoid,
        Rectangle,
        WebMercatorProjection) {
    "use strict";

    /**
     * A tiling scheme for geometry referenced to a {@link WebMercatorProjection}, EPSG:3857.  This is
     * the tiling scheme used by Google Maps, Microsoft Bing Maps, and most of ESRI ArcGIS Online.
     *
     * @alias WebMercatorTilingScheme
     * @constructor
     *
     * @param {Object} [options] Object with the following properties:
     * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid whose surface is being tiled. Defaults to
     * the WGS84 ellipsoid.
     * @param {Number} [options.numberOfLevelZeroTilesX=1] The number of tiles in the X direction at level zero of
     *        the tile tree.
     * @param {Number} [options.numberOfLevelZeroTilesY=1] The number of tiles in the Y direction at level zero of
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
    var WebMercatorTilingScheme = function WebMercatorTilingScheme(options) {
        options = defaultValue(options, {});

        this._ellipsoid = defaultValue(options.ellipsoid, Ellipsoid.WGS84);
        this._numberOfLevelZeroTilesX = defaultValue(options.numberOfLevelZeroTilesX, 1);
        this._numberOfLevelZeroTilesY = defaultValue(options.numberOfLevelZeroTilesY, 1);

        this._projection = new WebMercatorProjection(this._ellipsoid);

        if (defined(options.rectangleSouthwestInMeters) &&
            defined(options.rectangleNortheastInMeters)) {
            this._rectangleSouthwestInMeters = options.rectangleSouthwestInMeters;
            this._rectangleNortheastInMeters = options.rectangleNortheastInMeters;
        } else {
            var semimajorAxisTimesPi = this._ellipsoid.maximumRadius * Math.PI;
            this._rectangleSouthwestInMeters = new Cartesian2(-semimajorAxisTimesPi, -semimajorAxisTimesPi);
            this._rectangleNortheastInMeters = new Cartesian2(semimajorAxisTimesPi, semimajorAxisTimesPi);
        }

        var southwest = this._projection.unproject(this._rectangleSouthwestInMeters);
        var northeast = this._projection.unproject(this._rectangleNortheastInMeters);
        this._rectangle = new Rectangle(southwest.longitude, southwest.latitude,
                                  northeast.longitude, northeast.latitude);
    };

    defineProperties(WebMercatorTilingScheme.prototype, {
        /**
         * Gets the ellipsoid that is tiled by this tiling scheme.
         * @memberof WebMercatorTilingScheme.prototype
         * @type {Ellipsoid}
         */
        ellipsoid : {
            get : function() {
                return this._ellipsoid;
            }
        },

        /**
         * Gets the rectangle, in radians, covered by this tiling scheme.
         * @memberof WebMercatorTilingScheme.prototype
         * @type {Rectangle}
         */
        rectangle : {
            get : function() {
                return this._rectangle;
            }
        },

        /**
         * Gets the map projection used by this tiling scheme.
         * @memberof WebMercatorTilingScheme.prototype
         * @type {Projection}
         */
        projection : {
            get : function() {
                return this._projection;
            }
        }
    });

    /**
     * Gets the total number of tiles in the X direction at a specified level-of-detail.
     *
     * @param {Number} level The level-of-detail.
     * @returns {Number} The number of tiles in the X direction at the given level.
     */
    WebMercatorTilingScheme.prototype.getNumberOfXTilesAtLevel = function(level) {
        return this._numberOfLevelZeroTilesX << level;
    };

    /**
     * Gets the total number of tiles in the Y direction at a specified level-of-detail.
     *
     * @param {Number} level The level-of-detail.
     * @returns {Number} The number of tiles in the Y direction at the given level.
     */
    WebMercatorTilingScheme.prototype.getNumberOfYTilesAtLevel = function(level) {
        return this._numberOfLevelZeroTilesY << level;
    };

    /**
     * Transforms an rectangle specified in geodetic radians to the native coordinate system
     * of this tiling scheme.
     *
     * @param {Rectangle} rectangle The rectangle to transform.
     * @param {Rectangle} [result] The instance to which to copy the result, or undefined if a new instance
     *        should be created.
     * @returns {Rectangle} The specified 'result', or a new object containing the native rectangle if 'result'
     *          is undefined.
     */
    WebMercatorTilingScheme.prototype.rectangleToNativeRectangle = function(rectangle, result) {
        var projection = this._projection;
        var southwest = projection.project(Rectangle.southwest(rectangle));
        var northeast = projection.project(Rectangle.northeast(rectangle));

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
     * Converts tile x, y coordinates and level to an rectangle expressed in the native coordinates
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
    WebMercatorTilingScheme.prototype.tileXYToNativeRectangle = function(x, y, level, result) {
        var xTiles = this.getNumberOfXTilesAtLevel(level);
        var yTiles = this.getNumberOfYTilesAtLevel(level);

        var xTileWidth = (this._rectangleNortheastInMeters.x - this._rectangleSouthwestInMeters.x) / xTiles;
        var west = this._rectangleSouthwestInMeters.x + x * xTileWidth;
        var east = this._rectangleSouthwestInMeters.x + (x + 1) * xTileWidth;

        var yTileHeight = (this._rectangleNortheastInMeters.y - this._rectangleSouthwestInMeters.y) / yTiles;
        var north = this._rectangleNortheastInMeters.y - y * yTileHeight;
        var south = this._rectangleNortheastInMeters.y - (y + 1) * yTileHeight;

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
     * @param {Number} x The integer x coordinate of the tile.
     * @param {Number} y The integer y coordinate of the tile.
     * @param {Number} level The tile level-of-detail.  Zero is the least detailed.
     * @param {Object} [result] The instance to which to copy the result, or undefined if a new instance
     *        should be created.
     * @returns {Rectangle} The specified 'result', or a new object containing the rectangle
     *          if 'result' is undefined.
     */
    WebMercatorTilingScheme.prototype.tileXYToRectangle = function(x, y, level, result) {
        var nativeRectangle = this.tileXYToNativeRectangle(x, y, level, result);

        var projection = this._projection;
        var southwest = projection.unproject(new Cartesian2(nativeRectangle.west, nativeRectangle.south));
        var northeast = projection.unproject(new Cartesian2(nativeRectangle.east, nativeRectangle.north));

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
     * @param {Number} level The tile level-of-detail.  Zero is the least detailed.
     * @param {Cartesian} [result] The instance to which to copy the result, or undefined if a new instance
     *        should be created.
     * @returns {Cartesian2} The specified 'result', or a new object containing the tile x, y coordinates
     *          if 'result' is undefined.
     */
    WebMercatorTilingScheme.prototype.positionToTileXY = function(position, level, result) {
        var rectangle = this._rectangle;
        if (position.latitude > rectangle.north ||
            position.latitude < rectangle.south ||
            position.longitude < rectangle.west ||
            position.longitude > rectangle.east) {
            // outside the bounds of the tiling scheme
            return undefined;
        }

        var xTiles = this.getNumberOfXTilesAtLevel(level);
        var yTiles = this.getNumberOfYTilesAtLevel(level);

        var overallWidth = this._rectangleNortheastInMeters.x - this._rectangleSouthwestInMeters.x;
        var xTileWidth = overallWidth / xTiles;
        var overallHeight = this._rectangleNortheastInMeters.y - this._rectangleSouthwestInMeters.y;
        var yTileHeight = overallHeight / yTiles;

        var projection = this._projection;

        var webMercatorPosition = projection.project(position);
        var distanceFromWest = webMercatorPosition.x - this._rectangleSouthwestInMeters.x;
        var distanceFromNorth = this._rectangleNortheastInMeters.y - webMercatorPosition.y;

        var xTileCoordinate = distanceFromWest / xTileWidth | 0;
        if (xTileCoordinate >= xTiles) {
            xTileCoordinate = xTiles - 1;
        }
        var yTileCoordinate = distanceFromNorth / yTileHeight | 0;
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

    return WebMercatorTilingScheme;
});