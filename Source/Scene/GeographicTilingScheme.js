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
        this.extent = defaultValue(description.extent, Extent.MAX_VALUE);

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
     * Converts tile x, y coordinates and level to an extent expressed in the native coordinates
     * of the tiling scheme.
     *
     * @memberof GeographicTilingScheme
     *
     * @param {Number} x The integer x coordinate of the tile.
     * @param {Number} y The integer y coordinate of the tile.
     * @param {Number} level The tile level-of-detail.  Zero is the least detailed.
     * @param {Object} [outputExtent] An object whose west, south, east, and north properties will be set
     * with the native extent on return.  If this parameter is undefined, a new instance is
     * allocated and returned.
     *
     * @returns {Object} The specified 'outputExtent', or a new object containing the extent
     * if 'outputExtent' is undefined.
     */
    GeographicTilingScheme.prototype.tileXYToNativeExtent = function(x, y, level, outputExtent) {
        if (typeof outputExtent === 'undefined') {
            outputExtent = {};
        }
        var extentRadians = this.tileXYToExtent(x, y, level);
        outputExtent.west = CesiumMath.toDegrees(extentRadians.west);
        outputExtent.south = CesiumMath.toDegrees(extentRadians.south);
        outputExtent.east = CesiumMath.toDegrees(extentRadians.east);
        outputExtent.north = CesiumMath.toDegrees(extentRadians.north);
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
     * @param {Extent} [outputExtent] An object whose west, south, east, and north properties will be set
     * with the native extent on return.  If this parameter is undefined, a new instance is
     * allocated and returned.
     *
     * @return {Extent} The specified 'outputExtent', or a new object containing the
     * cartographic extent of the tile, with north, south, east and west properties in radians.
     */
    GeographicTilingScheme.prototype.tileXYToExtent = function(x, y, level, outputExtent) {
        if (typeof outputExtent === 'undefined') {
            outputExtent = new Extent(0.0, 0.0, 0.0, 0.0);
        }

        var extent = this.extent;

        var xTiles = this.numberOfLevelZeroTilesX << level;
        var yTiles = this.numberOfLevelZeroTilesY << level;

        var xTileWidth = (extent.east - extent.west) / xTiles;
        outputExtent.west = x * xTileWidth + extent.west;
        outputExtent.east = (x + 1) * xTileWidth + extent.west;

        var yTileHeight = (extent.north - extent.south) / yTiles;
        outputExtent.north = extent.north - y * yTileHeight;
        outputExtent.south = extent.north - (y + 1) * yTileHeight;

        return outputExtent;
    };

    GeographicTilingScheme.prototype.extentToNativeExtent = function(extent) {
        return {
            west : CesiumMath.toDegrees(extent.west),
            south : CesiumMath.toDegrees(extent.south),
            east : CesiumMath.toDegrees(extent.east),
            north : CesiumMath.toDegrees(extent.north)
        };
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

        var extent = this.extent;

        var xTiles = this.numberOfLevelZeroTilesX << level;
        var yTiles = this.numberOfLevelZeroTilesY << level;

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
        return new Cartesian2(xTileCoordinate, yTileCoordinate);
    };

    return GeographicTilingScheme;
});