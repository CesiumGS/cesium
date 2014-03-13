/*global define*/
define([
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        './Tile'
    ], function(
        defined,
        defineProperties,
        DeveloperError,
        Tile) {
    "use strict";

    /**
     * A tiling scheme for geometry or imagery on the surface of an ellipsoid.  At level-of-detail zero,
     * the coarsest, least-detailed level, the number of tiles is configurable.
     * At level of detail one, each of the level zero tiles has four children, two in each direction.
     * At level of detail two, each of the level one tiles has four children, two in each direction.
     * This continues for as many levels as are present in the geometry or imagery source.
     *
     * @alias TilingScheme
     * @constructor
     *
     * @see WebMercatorTilingScheme
     * @see GeographicTilingScheme
     */
    var TilingScheme = function TilingScheme(description) {
        throw new DeveloperError('This type should not be instantiated directly.  Instead, use WebMercatorTilingScheme or GeographicTilingScheme.');
    };

    defineProperties(TilingScheme.prototype, {
        /**
         * Gets the ellipsoid that is tiled by the tiling scheme.
         * @memberof TilingScheme.prototype
         * @type {Ellipsoid}
         */
        ellipsoid: {
            get : DeveloperError.throwInstantiationError
        },

        /**
         * Gets the extent, in radians, covered by this tiling scheme.
         * @memberof TilingScheme.prototype
         * @type {Extent}
         */
        extent : {
            get : DeveloperError.throwInstantiationError
        },


        /**
         * Gets the map projection used by the tiling scheme.
         * @memberof TilingScheme.prototype
         * @type {Projection}
         */
        projection : {
            get : DeveloperError.throwInstantiationError
        }
    });

    /**
     * Gets the total number of tiles in the X direction at a specified level-of-detail.
     * @memberof TilingScheme
     * @function
     *
     * @param {Number} level The level-of-detail.
     * @returns {Number} The number of tiles in the X direction at the given level.
     */
    TilingScheme.prototype.getNumberOfXTilesAtLevel = DeveloperError.throwInstantiationError;

    /**
     * Gets the total number of tiles in the Y direction at a specified level-of-detail.
     * @memberof TilingScheme
     * @function
     *
     * @param {Number} level The level-of-detail.
     * @returns {Number} The number of tiles in the Y direction at the given level.
     */
    TilingScheme.prototype.getNumberOfYTilesAtLevel = DeveloperError.throwInstantiationError;

    /**
     * Creates the tile or tiles at level of detail zero, the coarsest, least detailed level.
     * @memberof TilingScheme
     * @function
     *
     * @returns {Array} An array containing the tiles at level of detail zero, starting with the
     * tile in the northwest corner and followed by the tile (if any) to its east.
     */
    TilingScheme.prototype.createLevelZeroTiles = DeveloperError.throwInstantiationError;

    /**
     * Transforms an extent specified in geodetic radians to the native coordinate system
     * of this tiling scheme.
     * @memberof TilingScheme
     * @function
     *
     * @param {Extent} extent The extent to transform.
     * @param {Extent} [result] The instance to which to copy the result, or undefined if a new instance
     *        should be created.
     * @returns {Extent} The specified 'result', or a new object containing the native extent if 'result'
     *          is undefined.
     */
    TilingScheme.prototype.extentToNativeExtent = DeveloperError.throwInstantiationError;

    /**
     * Converts tile x, y coordinates and level to an extent expressed in the native coordinates
     * of the tiling scheme.
     * @memberof TilingScheme
     * @function
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
    TilingScheme.prototype.tileXYToNativeExtent = DeveloperError.throwInstantiationError;

    /**
     * Converts tile x, y coordinates and level to a cartographic extent in radians.
     * @memberof TilingScheme
     * @function
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
    TilingScheme.prototype.tileXYToExtent = DeveloperError.throwInstantiationError;

    /**
     * Calculates the tile x, y coordinates of the tile containing
     * a given cartographic position.
     * @memberof TilingScheme
     * @function
     *
     * @param {Cartographic} position The position.
     * @param {Number} level The tile level-of-detail.  Zero is the least detailed.
     * @param {Cartesian} [result] The instance to which to copy the result, or undefined if a new instance
     *        should be created.
     *
     * @returns {Cartesian2} The specified 'result', or a new object containing the tile x, y coordinates
     *          if 'result' is undefined.
     */
    TilingScheme.prototype.positionToTileXY = DeveloperError.throwInstantiationError;

    /**
     * Creates a rectangular set of tiles for level of detail zero, the coarsest, least detailed level.
     *
     * @memberof TilingScheme
     *
     * @param {TilingScheme} tilingScheme The tiling scheme for which the tiles are to be created.
     * @param {Number} numberOfLevelZeroTilesX The number of tiles in the X direction at level zero of
     *        the tile tree.
     * @param {Number} numberOfLevelZeroTilesY The number of tiles in the Y direction at level zero of
     *        the tile tree.
     * @returns {Array} An array containing the tiles at level of detail zero, starting with the
     * tile in the northwest corner and followed by the tile (if any) to its east.
     */
    TilingScheme.createRectangleOfLevelZeroTiles = function(tilingScheme, numberOfLevelZeroTilesX, numberOfLevelZeroTilesY) {
        if (!defined(tilingScheme)) {
            throw new DeveloperError('tilingScheme is required.');
        }
        if (!defined(numberOfLevelZeroTilesX)) {
            throw new DeveloperError('numberOfLevelZeroTilesX is required.');
        }
        if (!defined(numberOfLevelZeroTilesY)) {
            throw new DeveloperError('numberOfLevelZeroTilesY is required.');
        }

        var result = new Array(numberOfLevelZeroTilesX * numberOfLevelZeroTilesY);

        var index = 0;
        for (var y = 0; y < numberOfLevelZeroTilesY; ++y) {
            for (var x = 0; x < numberOfLevelZeroTilesX; ++x) {
                result[index++] = new Tile({
                    tilingScheme : tilingScheme,
                    x : x,
                    y : y,
                    level : 0
                });
            }
        }

        return result;
    };

    return TilingScheme;
});