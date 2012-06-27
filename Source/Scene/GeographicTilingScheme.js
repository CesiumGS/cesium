/*global define*/
define([
        '../Core/defaultValue',
        '../Core/DeveloperError',
        '../Core/Math',
        '../Core/Cartesian2',
        '../Core/Ellipsoid',
        '../Core/Extent',
        './Tile',
        './TilingScheme'
    ], function(
        defaultValue,
        DeveloperError,
        CesiumMath,
        Cartesian2,
        Ellipsoid,
        Extent,
        Tile,
        TilingScheme) {
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
     * @param {Number} [description.numberOfLevelZeroTilesX=2] The number of tiles in the X direction at level zero of
     * the tile tree.
     * @param {Number} [description.numberOfLevelZeroTilesY=1] The number of tiles in the Y direction at level zero of
     * the tile tree.
     */
    function GeographicTilingScheme(description) {
        description = defaultValue(description, {});

        /**
         * The ellipsoid whose surface is being tiled.
         *
         * @type Ellipsoid
         */
        this.ellipsoid = defaultValue(description.ellipsoid, Ellipsoid.WGS84);

        /**
         * The world extent covered by this tiling scheme, in radians.
         *
         * @type Extent
         */
        this.extent = new Extent(-CesiumMath.PI,
                                 -CesiumMath.PI_OVER_TWO,
                                 CesiumMath.PI,
                                 CesiumMath.PI_OVER_TWO);

        /**
         * The number of tiles in the X direction at level zero of the tile tree.
         *
         * @type Number
         */
        this.numberOfLevelZeroTilesX = defaultValue(description.numberOfLevelZeroTilesX, 2);

        /**
         * The number of tiles in the Y direction at level zero of the tile tree.
         *
         * @type Number
         */
        this.numberOfLevelZeroTilesY = defaultValue(description.numberOfLevelZeroTilesY, 1);
    }

    /**
     * Creates the tile or tiles at level of detail zero, the coarsest, least detailed level.
     *
     * @memberof GeographicTilingScheme
     *
     * @return {Array} An array containing the tiles at level of detail zero, starting with the
     * tile in the northwest corner of the globe and followed by the tile (if any) to its east.
     */
    GeographicTilingScheme.prototype.createLevelZeroTiles = TilingScheme.prototype.createLevelZeroTiles;

    /**
     * Converts tile x, y coordinates and level to a cartographic extent.
     *
     * @memberof GeographicTilingScheme
     *
     * @param {Number} x The integer x coordinate of the tile.
     * @param {Number} y The integer y coordinate of the tile.
     * @param {Number} level The tile level-of-detail.  Zero is the least detailed.
     *
     * @return {Extent} The cartographic extent of the tile, with north, south, east and
     * west properties in radians.
     */
    GeographicTilingScheme.prototype.tileXYToExtent = function(x, y, level) {
        var xTiles = this.numberOfLevelZeroTilesX << level;
        var yTiles = this.numberOfLevelZeroTilesY << level;

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