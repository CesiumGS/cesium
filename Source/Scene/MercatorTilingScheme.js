/*global define*/
define([
        '../Core/DeveloperError',
        '../Core/Math',
        '../Core/Ellipsoid',
        '../Core/Extent',
        './Tile',
        './TilingScheme',
        '../Core/Cartesian2'
    ], function(
        DeveloperError,
        CesiumMath,
        Ellipsoid,
        Extent,
        Tile,
        TilingScheme,
        Cartesian2) {
    "use strict";

    /**
     * A tiling scheme for geometry referenced to a mercator projection.
     *
     * @name MercatorTilingScheme
     * @constructor
     *
     * @param {Ellipsoid} [description.ellipsoid=Ellipsoid.WGS84] The ellipsoid whose surface is being tiled. Defaults to
     * the WGS84 ellipsoid.
     * @param {Number} [description.numberOfLevelZeroTilesX=1] The number of tiles in the X direction at level zero of
     * the tile tree.
     * @param {Number} [description.numberOfLevelZeroTilesY=1] The number of tiles in the Y direction at level zero of
     * the tile tree.
     */
    function MercatorTilingScheme(description) {
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
            CesiumMath.toRadians(-85.05112878),
            CesiumMath.PI,
            CesiumMath.toRadians(85.05112878));

        /**
         * The number of tiles in the X direction at level zero of the tile tree.
         *
         * @type Number
         */
        this.numberOfLevelZeroTilesX = description.numberOfLevelZeroTilesX || 1;

        /**
         * The number of tiles in the Y direction at level zero of the tile tree.
         *
         * @type Number
         */
        this.numberOfLevelZeroTilesY = description.numberOfLevelZeroTilesY || 1;
    }

    /**
     * Creates the tile or tiles at level of detail zero, the coarsest, least detailed level.
     *
     * @memberof MercatorTilingScheme
     *
     * @return {Array} An array containing the tiles at level of detail zero, starting with the
     * tile in the northwest corner of the globe and followed by the tile (if any) to its east.
     */
    MercatorTilingScheme.prototype.createLevelZeroTiles = TilingScheme.prototype.createLevelZeroTiles;

    /**
     * Converts an extent and zoom level into tile x, y coordinates.
     *
     * @memberof MercatorTilingScheme
     *
     * @param {Extent} extent The cartographic extent of the tile, with north, south, east and
     * west properties in radians.
     * @param {Number} level The tile level-of-detail.  Zero is the least detailed.
     *
     * @return {Cartesian2} The integer x and y tile coordinates.
     */
    MercatorTilingScheme.prototype.extentToTileXY = function(extent, level) {
        var xTiles = this.numberOfLevelZeroTilesX << level;
        var yTiles = this.numberOfLevelZeroTilesY << level;

        var longitudeFraction = (extent.west + Math.PI) / CesiumMath.TWO_PI;
        var x = Math.round(longitudeFraction * xTiles);

        var sinLatitude = Math.sin(extent.north);
        var latitudeFraction = 0.5 - Math.log((1.0 + sinLatitude) / (1.0 - sinLatitude)) / (4 * Math.PI);
        var y = Math.round(latitudeFraction * yTiles);

        return new Cartesian2(x, y);
    };

    /**
     * Converts tile x, y coordinates and level to a cartographic extent.
     *
     * @memberof MercatorTilingScheme
     *
     * @param {Number} x The integer x coordinate of the tile.
     * @param {Number} y The integer y coordinate of the tile.
     * @param {Number} zoom The tile level-of-detail.  Zero is the least detailed.
     *
     * @return {Extent} The cartographic extent of the tile, with north, south, east and
     * west properties in radians.
     */
    MercatorTilingScheme.prototype.tileXYToExtent = function(x, y, level) {
        var xTiles = this.numberOfLevelZeroTilesX << level;
        var yTiles = this.numberOfLevelZeroTilesY << level;

        var worldFractionPerTileX = CesiumMath.TWO_PI / xTiles;
        var west = x * worldFractionPerTileX - Math.PI;
        var east = (x + 1) * worldFractionPerTileX - Math.PI;

        var yFraction = 0.5 - y / yTiles;
        var north = CesiumMath.PI_OVER_TWO - CesiumMath.TWO_PI * Math.atan(Math.exp(-yFraction * 2 * Math.PI)) / Math.PI;
        yFraction = 0.5 - (y + 1) / yTiles;
        var south = CesiumMath.PI_OVER_TWO - CesiumMath.TWO_PI * Math.atan(Math.exp(-yFraction * 2 * Math.PI)) / Math.PI;

        return new Extent(west, south, east, north);
    };

    return MercatorTilingScheme;
});