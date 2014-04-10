/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/Math',
        '../Core/Cartesian2',
        '../Core/Ellipsoid',
        '../Core/Extent',
        '../Core/GeographicProjection',
        './TilingScheme'
    ], function(
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        CesiumMath,
        Cartesian2,
        Ellipsoid,
        Extent,
        GeographicProjection,
        TilingScheme) {
    "use strict";

    /**
     * A tiling scheme for geometry referenced to a simple {@link GeographicProjection} where
     * longitude and latitude are directly mapped to X and Y.  This projection is commonly
     * known as geographic, equirectangular, equidistant cylindrical, or plate carrée.
     *
     * @alias GeographicTilingScheme
     * @constructor
     *
     * @param {Ellipsoid} [description.ellipsoid=Ellipsoid.WGS84] The ellipsoid whose surface is being tiled. Defaults to
     * the WGS84 ellipsoid.
     * @param {Extent} [description.extent=Extent.MAX_VALUE] The extent, in radians, covered by the tiling scheme.
     * @param {Number} [description.numberOfLevelZeroTilesX=2] The number of tiles in the X direction at level zero of
     * the tile tree.
     * @param {Number} [description.numberOfLevelZeroTilesY=1] The number of tiles in the Y direction at level zero of
     * the tile tree.
     */
    var GeographicTilingScheme = function GeographicTilingScheme(description) {
        description = defaultValue(description, {});

        this._ellipsoid = defaultValue(description.ellipsoid, Ellipsoid.WGS84);
        this._extent = defaultValue(description.extent, Extent.MAX_VALUE);
        this._projection = new GeographicProjection(this._ellipsoid);
        this._numberOfLevelZeroTilesX = defaultValue(description.numberOfLevelZeroTilesX, 2);
        this._numberOfLevelZeroTilesY = defaultValue(description.numberOfLevelZeroTilesY, 1);
    };


    defineProperties(GeographicTilingScheme.prototype, {
        /**
         * Gets the ellipsoid that is tiled by this tiling scheme.
         * @memberof GeographicTilingScheme.prototype
         * @type {Ellipsoid}
         */
        ellipsoid : {
            get : function() {
                return this._ellipsoid;
            }
        },

        /**
         * Gets the extent, in radians, covered by this tiling scheme.
         * @memberof GeographicTilingScheme.prototype
         * @type {Extent}
         */
        extent : {
            get : function() {
                return this._extent;
            }
        },

        /**
         * Gets the map projection used by this tiling scheme.
         * @memberof GeographicTilingScheme.prototype
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
     * @memberof GeographicTilingScheme
     *
     * @param {Number} level The level-of-detail.
     * @returns {Number} The number of tiles in the X direction at the given level.
     */
    GeographicTilingScheme.prototype.getNumberOfXTilesAtLevel = function(level) {
        return this._numberOfLevelZeroTilesX << level;
    };

    /**
     * Gets the total number of tiles in the Y direction at a specified level-of-detail.
     *
     * @memberof GeographicTilingScheme
     *
     * @param {Number} level The level-of-detail.
     * @returns {Number} The number of tiles in the Y direction at the given level.
     */
    GeographicTilingScheme.prototype.getNumberOfYTilesAtLevel = function(level) {
        return this._numberOfLevelZeroTilesY << level;
    };

    /**
     * Creates the tile or tiles at level of detail zero, the coarsest, least detailed level.
     *
     * @memberof GeographicTilingScheme
     *
     * @returns {Array} An array containing the tiles at level of detail zero, starting with the
     * tile in the northwest corner of the globe and followed by the tile (if any) to its east.
     */
    GeographicTilingScheme.prototype.createLevelZeroTiles = function() {
        return TilingScheme.createRectangleOfLevelZeroTiles(this, this._numberOfLevelZeroTilesX, this._numberOfLevelZeroTilesY);
    };

    /**
     * Transforms an extent specified in geodetic radians to the native coordinate system
     * of this tiling scheme.
     *
     * @memberof GeographicTilingScheme
     *
     * @param {Extent} extent The extent to transform.
     * @param {Extent} [result] The instance to which to copy the result, or undefined if a new instance
     *        should be created.
     * @returns {Extent} The specified 'result', or a new object containing the native extent if 'result'
     *          is undefined.
     */
    GeographicTilingScheme.prototype.extentToNativeExtent = function(extent, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(extent)) {
            throw new DeveloperError('extent is required.');
        }
        //>>includeEnd('debug');

        var west = CesiumMath.toDegrees(extent.west);
        var south = CesiumMath.toDegrees(extent.south);
        var east = CesiumMath.toDegrees(extent.east);
        var north = CesiumMath.toDegrees(extent.north);

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
     * Converts tile x, y coordinates and level to an extent expressed in the native coordinates
     * of the tiling scheme.
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
    GeographicTilingScheme.prototype.tileXYToNativeExtent = function(x, y, level, result) {
        var extentRadians = this.tileXYToExtent(x, y, level, result);
        extentRadians.west = CesiumMath.toDegrees(extentRadians.west);
        extentRadians.south = CesiumMath.toDegrees(extentRadians.south);
        extentRadians.east = CesiumMath.toDegrees(extentRadians.east);
        extentRadians.north = CesiumMath.toDegrees(extentRadians.north);
        return extentRadians;
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
    GeographicTilingScheme.prototype.tileXYToExtent = function(x, y, level, result) {
        var extent = this._extent;

        var xTiles = this.getNumberOfXTilesAtLevel(level);
        var yTiles = this.getNumberOfYTilesAtLevel(level);

        var xTileWidth = (extent.east - extent.west) / xTiles;
        var west = x * xTileWidth + extent.west;
        var east = (x + 1) * xTileWidth + extent.west;

        var yTileHeight = (extent.north - extent.south) / yTiles;
        var north = extent.north - y * yTileHeight;
        var south = extent.north - (y + 1) * yTileHeight;

        if (!defined(result)) {
            result = new Extent(west, south, east, north);
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
    GeographicTilingScheme.prototype.positionToTileXY = function(position, level, result) {
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

        var xTileWidth = (extent.east - extent.west) / xTiles;
        var yTileHeight = (extent.north - extent.south) / yTiles;

        var xTileCoordinate = (position.longitude - extent.west) / xTileWidth | 0;
        if (xTileCoordinate >= xTiles) {
            xTileCoordinate = xTiles - 1;
        }

        var yTileCoordinate = (extent.north - position.latitude) / yTileHeight | 0;
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

    return GeographicTilingScheme;
});