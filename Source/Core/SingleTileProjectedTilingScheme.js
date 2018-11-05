define([
        './Cartesian2',
        './Check',
        './defaultValue',
        './defined',
        './defineProperties',
        './Ellipsoid',
        './GeographicProjection',
        './Math',
        './Rectangle'
    ], function(
        Cartesian2,
        Check,
        defaultValue,
        defined,
        defineProperties,
        Ellipsoid,
        GeographicProjection,
        CesiumMath,
        Rectangle) {
    'use strict';

    function SingleTileProjectedTilingScheme(options) {
        this._projectedRectangle = Rectangle.clone(options.projectedRectangle);
        this._projection = options.projection;

        this._rectangle = Rectangle.approximateCartographicExtents(options.projectedRectangle, options.projection);
    }

    defineProperties(SingleTileProjectedTilingScheme.prototype, {
        /**
         * Gets the ellipsoid that is tiled by this tiling scheme.
         * @memberof SingleTileProjectedTilingScheme.prototype
         * @type {Ellipsoid}
         */
        ellipsoid : {
            get : function() {
                return Ellipsoid.WGS84;
            }
        },

        /**
         * Gets the rectangle, in radians, covered by this tiling scheme.
         * @memberof SingleTileProjectedTilingScheme.prototype
         * @type {Rectangle}
         */
        rectangle : {
            get : function() {
                return this._rectangle;
            }
        },

        /**
         * Gets the map projection used by this tiling scheme.
         * @memberof SingleTileProjectedTilingScheme.prototype
         * @type {MapProjection}
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
    SingleTileProjectedTilingScheme.prototype.getNumberOfXTilesAtLevel = function(level) {
        return 1;
    };

    /**
     * Gets the total number of tiles in the Y direction at a specified level-of-detail.
     *
     * @param {Number} level The level-of-detail.
     * @returns {Number} The number of tiles in the Y direction at the given level.
     */
    SingleTileProjectedTilingScheme.prototype.getNumberOfYTilesAtLevel = function(level) {
        return 1;
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
    SingleTileProjectedTilingScheme.prototype.rectangleToNativeRectangle = function(rectangle, result) {
        //>>includeStart('debug', pragmas.debug);
        Check.defined('rectangle', rectangle);
        //>>includeEnd('debug');

        return Rectangle.approximateProjectedExtents(rectangle, this._projection, result);
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
    SingleTileProjectedTilingScheme.prototype.tileXYToNativeRectangle = function(x, y, level, result) {
        return this._projectedRectangle;
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
    SingleTileProjectedTilingScheme.prototype.tileXYToRectangle = function(x, y, level, result) {
        return this._rectangle;
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
    SingleTileProjectedTilingScheme.prototype.positionToTileXY = function(position, level, result) {
        var rectangle = this._rectangle;
        if (!Rectangle.contains(rectangle, position)) {
            // outside the bounds of the tiling scheme
            return undefined;
        }

        var xTiles = this.getNumberOfXTilesAtLevel(level);
        var yTiles = this.getNumberOfYTilesAtLevel(level);

        var xTileWidth = rectangle.width / xTiles;
        var yTileHeight = rectangle.height / yTiles;

        var longitude = position.longitude;
        if (rectangle.east < rectangle.west) {
            longitude += CesiumMath.TWO_PI;
        }

        var xTileCoordinate = (longitude - rectangle.west) / xTileWidth | 0;
        if (xTileCoordinate >= xTiles) {
            xTileCoordinate = xTiles - 1;
        }

        var yTileCoordinate = (rectangle.north - position.latitude) / yTileHeight | 0;
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

    return SingleTileProjectedTilingScheme;
});
