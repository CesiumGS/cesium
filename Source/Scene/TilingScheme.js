/*global define*/
define([
        '../Core/DeveloperError',
        './Tile'
    ], function(
        DeveloperError,
        Tile) {
    "use strict";

    /**
     * A tiling scheme for geometry on the surface of an ellipsoid.  At level-of-detail zero,
     * the coarsest, least-detailed level, the number of tiles in each direction is configurable.
     * At level of detail one, each of the level zero tiles has four children, two in each direction.
     * At level of detail two, each of the level one tiles has four children, two in each direction.
     * This continues for as many levels as are present in the geometry source.
     *
     * @name TilingScheme
     * @constructor
     *
     * @param {Ellipsoid} [description.ellipsoid] The ellipsoid whose surface is being tiled.
     * @param {Number} [description.numberOfLevelZeroTilesX] The number of tiles in the X direction at the root of
     * the tile tree.
     * @param {Number} [description.numberOfLevelZeroTilesY] The number of tiles in the Y direction at the root of
     * the tile tree.
     *
     * @see WebMercatorTilingScheme
     * @see GeographicTilingScheme
     */
    function TilingScheme(description) {
        /**
         * The ellipsoid whose surface is being tiled.
         *
         * @type Ellipsoid
         */
        this.ellipsoid = undefined;

        /**
         * The world extent covered by this tiling scheme, in radians.
         *
         * @type Extent
         */
        this.extent = undefined;

        /**
         * The number of tiles in the X direction at the root of the tile tree.
         *
         * @type Number
         */
        this.numberOfLevelZeroTilesX = undefined;

        /**
         * The number of tiles in the Y direction at the root of the tile tree.
         *
         * @type Number
         */
        this.numberOfLevelZeroTilesY = undefined;

        throw new DeveloperError('This type should not be instantiated directly.  Instead, use WebMercatorTilingScheme or GeographicTilingScheme.');
    }

    /**
     * Creates the tile or tiles at level of detail zero, the coarsest, least detailed level.
     *
     * @memberof TilingScheme
     *
     * @return {Array} An array containing the tiles at level of detail zero, starting with the
     * tile in the northwest corner of the globe and followed by the tile (if any) to its east.
     */
    TilingScheme.prototype.createLevelZeroTiles = function() {
        var numberOfLevelZeroTilesX = this.numberOfLevelZeroTilesX;
        var numberOfLevelZeroTilesY = this.numberOfLevelZeroTilesY;

        var result = new Array(numberOfLevelZeroTilesX * numberOfLevelZeroTilesY);

        var index = 0;
        for (var y = 0; y < numberOfLevelZeroTilesY; ++y) {
            for (var x = 0; x < numberOfLevelZeroTilesX; ++x) {
                result[index++] = new Tile({
                    tilingScheme: this,
                    x: x,
                    y: y,
                    zoom: 0
                });
            }
        }

        return result;
    };

    /**
     * Converts an extent and zoom level into tile x, y coordinates.
     *
     * @memberof TilingScheme
     *
     * @param {Extent} extent The cartographic extent of the tile, with north, south, east and
     * west properties in radians.
     * @param {Number} level The tile level-of-detail.  Zero is the least detailed.
     *
     * @return {Cartesian2} The integer x and y tile coordinates.
     */
    TilingScheme.prototype.extentToTileXY = function(extent, level) {
        throw new DeveloperError('This method should not called directly.  Instead, use the equivalent on WebMercatorTilingScheme or GeographicTilingScheme.');
    };

    /**
     * Converts tile x, y coordinates and level to a cartographic extent.
     *
     * @memberof TilingScheme
     *
     * @param {Number} x The integer x coordinate of the tile.
     * @param {Number} y The integer y coordinate of the tile.
     * @param {Number} level The tile level-of-detail.  Zero is the least detailed.
     *
     * @return {Extent} The cartographic extent of the tile, with north, south, east and
     * west properties in radians.
     */
    TilingScheme.prototype.tileXYToExtent = function(x, y, level) {
        throw new DeveloperError('This method should not called directly.  Instead, use the equivalent on WebMercatorTilingScheme or GeographicTilingScheme.');
    };

    return TilingScheme;
});