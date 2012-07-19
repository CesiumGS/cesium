/*global define*/
define([
        '../Core/defaultValue',
        '../Core/DeveloperError',
        '../Core/Math',
        '../Core/Cartesian2',
        '../Core/Ellipsoid',
        '../Core/Extent',
        './TilingScheme'
    ], function(
        defaultValue,
        DeveloperError,
        CesiumMath,
        Cartesian2,
        Ellipsoid,
        Extent,
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
        this.extent = new Extent(-CesiumMath.PI, -CesiumMath.PI_OVER_TWO,
                                 CesiumMath.PI, CesiumMath.PI_OVER_TWO);

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

        /**
         * The maximum error, in meters, that can exist in the surface geometry at tile level zero.
         * Tile level one is assumed to have half this error, level two is assumed to have
         * half the error of level one, and so on down the tile pyramid.
         *
         * @type Number
         */
        this.levelZeroMaximumGeometricError = this.ellipsoid.getRadii().x * 2 * Math.PI / 128;
    }

    /**
     * Gets the maximum geometric error allowed in a tile at a given level.
     *
     * @memberof GeographicTilingScheme
     *
     * @param {Number} level The tile level for which to get the maximum geometric error.
     * @returns {Number}
     */
    GeographicTilingScheme.prototype.getLevelMaximumGeometricError = TilingScheme.prototype.getLevelMaximumGeometricError;

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
     * Converts tile x, y coordinates and level to an extent expressed in the native coordinates
     * of the tiling scheme.
     *
     * @memberof GeographicTilingScheme
     *
     * @param {Number} x The integer x coordinate of the tile.
     * @param {Number} y The integer y coordinate of the tile.
     * @param {Number} level The tile level-of-detail.  Zero is the least detailed.
     * @param {Object} An object whose west, south, east, and north properties will be set
     * with the native extent on return.
     *
     * @returns {Extent} The specified 'outputExtent', or a new object containing the extent
     * if 'outputExtent' is undefined.
     */
    GeographicTilingScheme.prototype.tileXYToNativeExtent = function(x, y, level, outputExtent) {
        if (typeof outputExtent === 'undefined') {
            outputExtent = new Extent(0.0, 0.0, 0.0, 0.0);
        }

        var xTiles = this.numberOfLevelZeroTilesX << level;
        var yTiles = this.numberOfLevelZeroTilesY << level;

        var xTileWidth = CesiumMath.TWO_PI / xTiles;
        outputExtent.west = x * xTileWidth - Math.PI;
        outputExtent.east = (x + 1) * xTileWidth - Math.PI;

        var yTileHeight = CesiumMath.PI / yTiles;
        outputExtent.north = CesiumMath.PI_OVER_TWO - y * yTileHeight;
        outputExtent.south = CesiumMath.PI_OVER_TWO - (y + 1) * yTileHeight;

        return outputExtent;
    };

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
        return this.tileXYToNativeExtent(x, y, level);
    };

    /**
     * Calculates the tile x, y coordinates of the tile containing
     * a given cartographic position.
     *
     * @memberof GeographicTilingScheme
     *
     * @param {Cartographic} position The position.
     * @param {Number} level The tile level-of-detail.  Zero is the least detailed.
     *
     * @returns {Cartesian2} The x, y coordinate of the tile containing the position.
     */
    GeographicTilingScheme.prototype.positionToTileXY = function(position, level) {
        if (position.latitude > this.extent.north ||
            position.latitude < this.extent.south ||
            position.longitude < this.extent.west ||
            position.longitude > this.extent.east) {
            // outside the bounds of the tiling scheme
            return undefined;
        }

        var xTiles = this.numberOfLevelZeroTilesX << level;
        var yTiles = this.numberOfLevelZeroTilesY << level;

        var xTileWidth = CesiumMath.TWO_PI / xTiles;
        var yTileHeight = Math.PI / yTiles;

        var xTileCoordinate = (position.longitude + Math.PI) / xTileWidth | 0;
        if (xTileCoordinate >= xTiles) {
            xTileCoordinate = xTiles - 1;
        }

        var yTileCoordinate = (CesiumMath.PI_OVER_TWO - position.latitude) / yTileHeight | 0;
        if (yTileCoordinate >= yTiles) {
            yTileCoordinate = yTiles - 1;
        }
        return new Cartesian2(xTileCoordinate, yTileCoordinate);
    };

    return GeographicTilingScheme;
});