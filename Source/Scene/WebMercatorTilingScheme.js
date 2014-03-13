/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/Ellipsoid',
        '../Core/Extent',
        '../Core/Cartesian2',
        '../Core/WebMercatorProjection',
        './TilingScheme'
    ], function(
        defaultValue,
        defined,
        defineProperties,
        Ellipsoid,
        Extent,
        Cartesian2,
        WebMercatorProjection,
        TilingScheme) {
    "use strict";

    /**
     * A tiling scheme for geometry referenced to a {@link WebMercatorProjection}, EPSG:3857.  This is
     * the tiling scheme used by Google Maps, Microsoft Bing Maps, and most of ESRI ArcGIS Online.
     *
     * @alias WebMercatorTilingScheme
     * @constructor
     *
     * @param {Ellipsoid} [description.ellipsoid=Ellipsoid.WGS84] The ellipsoid whose surface is being tiled. Defaults to
     * the WGS84 ellipsoid.
     * @param {Number} [description.numberOfLevelZeroTilesX=1] The number of tiles in the X direction at level zero of
     *        the tile tree.
     * @param {Number} [description.numberOfLevelZeroTilesY=1] The number of tiles in the Y direction at level zero of
     *        the tile tree.
     * @param {Cartesian2} [description.extentSouthwestInMeters] The southwest corner of the extent covered by the
     *        tiling scheme, in meters.  If this parameter or extentNortheastInMeters is not specified, the entire
     *        globe is covered in the longitude direction and an equal distance is covered in the latitude
     *        direction, resulting in a square projection.
     * @param {Cartesian2} [description.extentNortheastInMeters] The northeast corner of the extent covered by the
     *        tiling scheme, in meters.  If this parameter or extentSouthwestInMeters is not specified, the entire
     *        globe is covered in the longitude direction and an equal distance is covered in the latitude
     *        direction, resulting in a square projection.
     */
    var WebMercatorTilingScheme = function WebMercatorTilingScheme(description) {
        description = defaultValue(description, {});

        this._ellipsoid = defaultValue(description.ellipsoid, Ellipsoid.WGS84);
        this._numberOfLevelZeroTilesX = defaultValue(description.numberOfLevelZeroTilesX, 1);
        this._numberOfLevelZeroTilesY = defaultValue(description.numberOfLevelZeroTilesY, 1);

        this._projection = new WebMercatorProjection(this._ellipsoid);

        if (defined(description.extentSouthwestInMeters) &&
            defined(description.extentNortheastInMeters)) {
            this._extentSouthwestInMeters = description.extentSouthwestInMeters;
            this._extentNortheastInMeters = description.extentNortheastInMeters;
        } else {
            var semimajorAxisTimesPi = this._ellipsoid.maximumRadius * Math.PI;
            this._extentSouthwestInMeters = new Cartesian2(-semimajorAxisTimesPi, -semimajorAxisTimesPi);
            this._extentNortheastInMeters = new Cartesian2(semimajorAxisTimesPi, semimajorAxisTimesPi);
        }

        var southwest = this._projection.unproject(this._extentSouthwestInMeters);
        var northeast = this._projection.unproject(this._extentNortheastInMeters);
        this._extent = new Extent(southwest.longitude, southwest.latitude,
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
         * Gets the extent, in radians, covered by this tiling scheme.
         * @memberof WebMercatorTilingScheme.prototype
         * @type {Extent}
         */
        extent : {
            get : function() {
                return this._extent;
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
     * @memberof WebMercatorTilingScheme
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
     * @memberof WebMercatorTilingScheme
     *
     * @param {Number} level The level-of-detail.
     * @returns {Number} The number of tiles in the Y direction at the given level.
     */
    WebMercatorTilingScheme.prototype.getNumberOfYTilesAtLevel = function(level) {
        return this._numberOfLevelZeroTilesY << level;
    };

    /**
     * Creates the tile or tiles at level of detail zero, the coarsest, least detailed level.
     *
     * @memberof WebMercatorTilingScheme
     *
     * @returns {Array} An array containing the tiles at level of detail zero, starting with the
     * tile in the northwest corner of the globe and followed by the tile (if any) to its east.
     */
    WebMercatorTilingScheme.prototype.createLevelZeroTiles = function() {
        return TilingScheme.createRectangleOfLevelZeroTiles(this, this._numberOfLevelZeroTilesX, this._numberOfLevelZeroTilesY);
    };

    /**
     * Transforms an extent specified in geodetic radians to the native coordinate system
     * of this tiling scheme.
     *
     * @memberof WebMercatorTilingScheme
     *
     * @param {Extent} extent The extent to transform.
     * @param {Extent} [result] The instance to which to copy the result, or undefined if a new instance
     *        should be created.
     * @returns {Extent} The specified 'result', or a new object containing the native extent if 'result'
     *          is undefined.
     */
    WebMercatorTilingScheme.prototype.extentToNativeExtent = function(extent, result) {
        var projection = this._projection;
        var southwest = projection.project(extent.getSouthwest());
        var northeast = projection.project(extent.getNortheast());

        if (!defined(result)) {
            return new Extent(southwest.x, southwest.y, northeast.x, northeast.y);
        }

        result.west = southwest.x;
        result.south = southwest.y;
        result.east = northeast.x;
        result.north = northeast.y;
        return result;
    };

    /**
     * Converts tile x, y coordinates and level to an extent expressed in the native coordinates
     * of the tiling scheme.
     *
     * @memberof WebMercatorTilingScheme
     *
     * @param {Number} x The integer x coordinate of the tile.
     * @param {Number} y The integer y coordinate of the tile.
     * @param {Number} level The tile level-of-detail.  Zero is the least detailed.
     * @param {Object} [result] The instance to which to copy the result, or undefined if a new instance
     *        should be created.
     *
     * @returns {Extent} The specified 'result', or a new object containing the extent
     *          if 'result' is undefined.
     */
    WebMercatorTilingScheme.prototype.tileXYToNativeExtent = function(x, y, level, result) {
        var xTiles = this.getNumberOfXTilesAtLevel(level);
        var yTiles = this.getNumberOfYTilesAtLevel(level);

        var xTileWidth = (this._extentNortheastInMeters.x - this._extentSouthwestInMeters.x) / xTiles;
        var west = this._extentSouthwestInMeters.x + x * xTileWidth;
        var east = this._extentSouthwestInMeters.x + (x + 1) * xTileWidth;

        var yTileHeight = (this._extentNortheastInMeters.y - this._extentSouthwestInMeters.y) / yTiles;
        var north = this._extentNortheastInMeters.y - y * yTileHeight;
        var south = this._extentNortheastInMeters.y - (y + 1) * yTileHeight;

        if (!defined(result)) {
            return new Extent(west, south, east, north);
        }

        result.west = west;
        result.south = south;
        result.east = east;
        result.north = north;
        return result;
    };

    /**
     * Converts tile x, y coordinates and level to a cartographic extent in radians.
     *
     * @memberof GeographicTilingScheme
     *
     * @param {Number} x The integer x coordinate of the tile.
     * @param {Number} y The integer y coordinate of the tile.
     * @param {Number} level The tile level-of-detail.  Zero is the least detailed.
     * @param {Object} [result] The instance to which to copy the result, or undefined if a new instance
     *        should be created.
     *
     * @returns {Extent} The specified 'result', or a new object containing the extent
     *          if 'result' is undefined.
     */
    WebMercatorTilingScheme.prototype.tileXYToExtent = function(x, y, level, result) {
        var nativeExtent = this.tileXYToNativeExtent(x, y, level, result);

        var projection = this._projection;
        var southwest = projection.unproject(new Cartesian2(nativeExtent.west, nativeExtent.south));
        var northeast = projection.unproject(new Cartesian2(nativeExtent.east, nativeExtent.north));

        nativeExtent.west = southwest.longitude;
        nativeExtent.south = southwest.latitude;
        nativeExtent.east = northeast.longitude;
        nativeExtent.north = northeast.latitude;
        return nativeExtent;
    };

    /**
     * Calculates the tile x, y coordinates of the tile containing
     * a given cartographic position.
     *
     * @memberof GeographicTilingScheme
     *
     * @param {Cartographic} position The position.
     * @param {Number} level The tile level-of-detail.  Zero is the least detailed.
     * @param {Cartesian} [result] The instance to which to copy the result, or undefined if a new instance
     *        should be created.
     *
     * @returns {Cartesian2} The specified 'result', or a new object containing the tile x, y coordinates
     *          if 'result' is undefined.
     */
    WebMercatorTilingScheme.prototype.positionToTileXY = function(position, level, result) {
        var extent = this._extent;
        if (position.latitude > extent.north ||
            position.latitude < extent.south ||
            position.longitude < extent.west ||
            position.longitude > extent.east) {
            // outside the bounds of the tiling scheme
            return undefined;
        }

        var xTiles = this.getNumberOfXTilesAtLevel(level);
        var yTiles = this.getNumberOfYTilesAtLevel(level);

        var overallWidth = this._extentNortheastInMeters.x - this._extentSouthwestInMeters.x;
        var xTileWidth = overallWidth / xTiles;
        var overallHeight = this._extentNortheastInMeters.y - this._extentSouthwestInMeters.y;
        var yTileHeight = overallHeight / yTiles;

        var projection = this._projection;

        var webMercatorPosition = projection.project(position);
        var distanceFromWest = webMercatorPosition.x - this._extentSouthwestInMeters.x;
        var distanceFromNorth = this._extentNortheastInMeters.y - webMercatorPosition.y;

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