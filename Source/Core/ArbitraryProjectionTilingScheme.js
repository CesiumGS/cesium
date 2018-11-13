define([
        './Cartesian2',
        './Cartographic',
        './Math',
        './Check',
        './defaultValue',
        './defined',
        './defineProperties',
        './Ellipsoid',
        './Rectangle'
    ], function(
        Cartesian2,
        Cartographic,
        CesiumMath,
        Check,
        defaultValue,
        defined,
        defineProperties,
        Ellipsoid,
        Rectangle) {
    'use strict';

    var defaultImageResolution = new Cartesian2(128, 128);
    /**
     * A tiling scheme for geometry referenced to any {@link MapProjection}.
     *
     * @alias ArbitraryProjectionTilingScheme
     * @constructor
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
     * @param {Cartesian2} [options.imageResolution] Optional image resolution for the imagery tiles using this tiling scheme.
     */
    function ArbitraryProjectionTilingScheme(options) {
        //>>includeStart('debug', pragmas.debug);
        Check.defined('options', options);
        Check.defined('options.mapProjection', options.mapProjection);
        Check.defined('options.projectedRectangle', options.projectedRectangle);
        //>>includeEnd('debug');

        var imageResolution = defaultValue(options.imageResolution, defaultImageResolution);
        var granularity = Math.max(imageResolution.x, imageResolution.y);

        this._ellipsoid = defaultValue(options.ellipsoid, Ellipsoid.WGS84);
        this._numberOfLevelZeroTilesX = defaultValue(options.numberOfLevelZeroTilesX, 1);
        this._numberOfLevelZeroTilesY = defaultValue(options.numberOfLevelZeroTilesY, 1);

        var mapProjection = options.mapProjection;
        var projectedRectangle = options.projectedRectangle;
        this._rectangle = Rectangle.approximateCartographicExtents(projectedRectangle, mapProjection, new Rectangle(), granularity);
        this._projection = mapProjection;
        this._projectedRectangle = Rectangle.clone(options.projectedRectangle);

        this._granularity = granularity;
    }

    defineProperties(ArbitraryProjectionTilingScheme.prototype, {
        /**
         * Gets the ellipsoid that is tiled by this tiling scheme.
         * @memberof ArbitraryProjectionTilingScheme.prototype
         * @type {Ellipsoid}
         */
        ellipsoid : {
            get : function() {
                return this._ellipsoid;
            }
        },

        /**
         * Gets the rectangle, in radians, covered by this tiling scheme.
         * @memberof ArbitraryProjectionTilingScheme.prototype
         * @type {Rectangle}
         */
        rectangle : {
            get : function() {
                return this._rectangle;
            }
        },

        /**
         * Gets the map projection used by this tiling scheme.
         * @memberof ArbitraryProjectionTilingScheme.prototype
         * @type {MapProjection}
         */
        projection : {
            get : function() {
                return this._projection;
            }
        },

        projectedRectangle : {
            get : function() {
                return this._projectedRectangle;
            }
        }
    });

    /**
     * Gets the total number of tiles in the X direction at a specified level-of-detail.
     *
     * @param {Number} level The level-of-detail.
     * @returns {Number} The number of tiles in the X direction at the given level.
     */
    ArbitraryProjectionTilingScheme.prototype.getNumberOfXTilesAtLevel = function(level) {
        return this._numberOfLevelZeroTilesX << level;
    };

    /**
     * Gets the total number of tiles in the Y direction at a specified level-of-detail.
     *
     * @param {Number} level The level-of-detail.
     * @returns {Number} The number of tiles in the Y direction at the given level.
     */
    ArbitraryProjectionTilingScheme.prototype.getNumberOfYTilesAtLevel = function(level) {
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
    ArbitraryProjectionTilingScheme.prototype.rectangleToNativeRectangle = function(rectangle, result) {
        //>>includeStart('debug', pragmas.debug);
        Check.defined('rectangle', rectangle);
        //>>includeEnd('debug');

        return Rectangle.approximateProjectedExtents(rectangle, this._projection, result, this._granularity);
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
    ArbitraryProjectionTilingScheme.prototype.tileXYToNativeRectangle = function(x, y, level, result) {
        var xTiles = this.getNumberOfXTilesAtLevel(level);
        var yTiles = this.getNumberOfYTilesAtLevel(level);

        var projectedRectangle = this._projectedRectangle;
        var xTileWidth = projectedRectangle.width / xTiles;
        var west = projectedRectangle.west + x * xTileWidth;
        var east = projectedRectangle.west + (x + 1) * xTileWidth;

        var yTileHeight = projectedRectangle.height / yTiles;
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

    var nativeRectangleScratch = new Rectangle();
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
    ArbitraryProjectionTilingScheme.prototype.tileXYToRectangle = function(x, y, level, result) {
        var nativeRectangle = this.tileXYToNativeRectangle(x, y, level, nativeRectangleScratch);

        return Rectangle.approximateCartographicExtents(nativeRectangle, this._projection, result, this._granularity);
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
    ArbitraryProjectionTilingScheme.prototype.positionToTileXY = function(position, level, result) {
        if (!Rectangle.contains(this._rectangle, position)) {
            // outside the bounds of the tiling scheme
            return undefined;
        }
        var projectedPosition = this._projection.project(position);

        return this.nativePositionToTileXY(projectedPosition, level, result);
    };

    var projectedPositionCartographicScratch = new Cartographic();
    /**
     * Calculates the tile x, y coordinates of the tile containing
     * a given native position.
     *
     * @param {Cartesian3} projectedPosition A position in the tiling scheme's projected coordinate system.
     * @param {Number} level The tile level-of-detail.  Zero is the least detailed.
     * @param {Cartesian2} [result] The instance to which to copy the result, or undefined if a new instance
     *        should be created.
     * @returns {Cartesian2} The specified 'result', or a new object containing the tile x, y coordinates
     *          if 'result' is undefined.
     */
    ArbitraryProjectionTilingScheme.prototype.nativePositionToTileXY = function(projectedPosition, level, result) {
        var xTiles = this.getNumberOfXTilesAtLevel(level);
        var yTiles = this.getNumberOfYTilesAtLevel(level);
        var projectedRectangle = this._projectedRectangle;

        var projectedPositionCartographic = projectedPositionCartographicScratch;
        projectedPositionCartographic.longitude = projectedPosition.x;
        projectedPositionCartographic.latitude = projectedPosition.y;
        //if (!Rectangle.contains(projectedRectangle, projectedPositionCartographic)) {
        //    // outside the bounds of the tiling scheme
        //    return undefined;
        //}

        var overallWidth = projectedRectangle.width;
        var xTileWidth = overallWidth / xTiles;
        var overallHeight = projectedRectangle.height;
        var yTileHeight = overallHeight / yTiles;

        var distanceFromWest = projectedPosition.x - projectedRectangle.west;
        var distanceFromNorth = projectedRectangle.north - projectedPosition.y;

        var xTileCoordinate = distanceFromWest / xTileWidth | 0;
        if (xTileCoordinate >= xTiles) {
            xTileCoordinate = xTiles - 1;
        }
        var yTileCoordinate = distanceFromNorth / yTileHeight | 0;
        if (yTileCoordinate >= yTiles) {
            yTileCoordinate = yTiles - 1;
        }

        // Possible that tile coordinates will be out of bounds due to projection shape,
        // so clamp the tile coordinate.
        xTileCoordinate = CesiumMath.clamp(xTileCoordinate, 0, xTiles);
        yTileCoordinate = CesiumMath.clamp(yTileCoordinate, 0, yTiles);

        if (!defined(result)) {
            return new Cartesian2(xTileCoordinate, yTileCoordinate);
        }

        result.x = xTileCoordinate;
        result.y = yTileCoordinate;

        return result;
    };

    return ArbitraryProjectionTilingScheme;
});
