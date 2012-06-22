define([
        '../Core/DeveloperError',
        '../Core/Math',
        '../Core/Ellipsoid',
        '../Core/Extent',
        './Tile'
    ], function(
        DeveloperError,
        CesiumMath,
        Ellipsoid,
        Extent,
        Tile) {
    "use strict";

    /**
     * A tiling scheme for geometry referenced to a simple projection where longitude and latitude
     * are directly mapped to X and Y.  This projection is commonly known as geographic, equirectangular,
     * equidistant cylindrical, or plate carrée.
     *
     * @name GeographicTilingScheme
     * @constructor
     *
     * @param {Ellipsoid} [description.ellipsoid=Ellipsoid.WGS84] The ellipsoid whose surface is being tiled. Defaults to
     * the WGS84 ellipsoid.
     * @param {Number} [description.rootTilesX=2] The number of tiles in the X direction at the root of
     * the tile tree.
     * @param {Number} [description.rootTilesY=1] The number of tiles in the Y direction at the root of
     * the tile tree.
     */
    function GeographicTilingScheme(description) {
        description = description || {};

        /**
         * The ellipsoid whose surface is being tiled.
         *
         * @type Ellipsoid
         */
        this.ellipsoid = description.ellipsoid || Ellipsoid.WGS84;

        /**
         * The world extent covered by this tiling scheme, in radians.
         *
         * @type Extent
         */
        this.extent = new Extent(
            -CesiumMath.PI,
            -CesiumMath.PI_OVER_TWO,
            CesiumMath.PI,
            CesiumMath.PI_OVER_TWO);

        /**
         * The number of tiles in the X direction at the root of the tile tree.
         *
         * @type Number
         */
        this.rootTilesX = description.rootTilesX || 2;

        /**
         * The number of tiles in the Y direction at the root of the tile tree.
         *
         * @type Number
         */
        this.rootTilesY = description.rootTilesY || 1;
    }

    GeographicTilingScheme.prototype.createLevelZeroTiles = function() {
        var rootTilesX = this.rootTilesX;
        var rootTilesY = this.rootTilesY;

        var result = new Array(rootTilesX * rootTilesY);

        for (var x = 0; x < rootTilesX; ++x) {
            for (var y = 0; y < rootTilesY; ++y) {
                result[y * rootTilesX + x] = new Tile({
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
     * @memberof GeographicTilingScheme
     *
     * @param {Extent} extent The cartographic extent of the tile, with north, south, east and
     * west properties in radians.
     * @param {Number} level The tile level-of-detail.  Zero is the least detailed.
     *
     * @return {Object} An object with x and y properties specifying the x and y tile coordinates.
     */
    GeographicTilingScheme.prototype.extentToTileXY = function(extent, level) {
        var result = {};

        var xTiles = this.rootTilesX << level;
        var yTiles = this.rootTilesY << level;

        var longitudeFraction = (extent.west + Math.PI) / CesiumMath.TWO_PI;
        result.x = Math.round(longitudeFraction * xTiles);

        var latitudeFraction = (CesiumMath.PI_OVER_TWO - extent.north) / CesiumMath.PI;
        result.y = Math.round(latitudeFraction * yTiles);

        return result;
    };

    /**
     * Converts tile x, y coordinates and level to a cartographic extent.
     *
     * @memberof GeographicTilingScheme
     *
     * @param {Number} x The x coordinate of the tile.
     * @param {Number} y The y coordinate of the tile.
     * @param {Number} zoom The tile level-of-detail.  Zero is the least detailed.
     *
     * @return {Extent} The cartographic extent of the tile, with north, south, east and
     * west properties in radians.
     */
    GeographicTilingScheme.prototype.tileXYToExtent = function(x, y, level) {
        var xTiles = this.rootTilesX << level;
        var yTiles = this.rootTilesY << level;

        var worldFractionPerTileX = CesiumMath.TWO_PI / xTiles;
        var west = x * worldFractionPerTileX - Math.PI;
        var east = (x + 1) * worldFractionPerTileX - Math.PI;

        var worldFractionPerTileY = CesiumMath.PI / yTiles;
        var north = CesiumMath.PI_OVER_TWO - y * worldFractionPerTileY;
        var south = CesiumMath.PI_OVER_TWO - (y + 1) * worldFractionPerTileY;

        return new Extent(west, south, east, north);
    };

    return GeographicTilingScheme;
});