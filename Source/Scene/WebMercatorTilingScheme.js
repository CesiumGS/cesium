/*global define*/
define([
        '../Core/defaultValue',
        '../Core/DeveloperError',
        '../Core/Math',
        '../Core/Ellipsoid',
        '../Core/Extent',
        '../Core/Cartesian2',
        '../Core/Cartographic',
        '../Core/WebMercatorProjection',
        './TilingScheme'
    ], function(
        defaultValue,
        DeveloperError,
        CesiumMath,
        Ellipsoid,
        Extent,
        Cartesian2,
        Cartographic,
        WebMercatorProjection,
        TilingScheme) {
    "use strict";

    /**
     * A tiling scheme for geometry referenced to a {@link WebMercatorProjection}, EPSG:3857.  This is
     * the tiling scheme used by Google Maps, Microsoft Bing Maps, and most of ESRI ArcGIS Online.
     *
     * @name WebMercatorTilingScheme
     * @constructor
     *
     * @param {Ellipsoid} [description.ellipsoid=Ellipsoid.WGS84] The ellipsoid whose surface is being tiled. Defaults to
     * the WGS84 ellipsoid.
     * @param {Number} [description.numberOfLevelZeroTilesX=1] The number of tiles in the X direction at level zero of
     * the tile tree.
     * @param {Number} [description.numberOfLevelZeroTilesY=1] The number of tiles in the Y direction at level zero of
     * the tile tree.
     */
    function WebMercatorTilingScheme(description) {
        description = defaultValue(description, {});

        /**
         * The ellipsoid whose surface is being tiled.
         *
         * @type Ellipsoid
         */
        this.ellipsoid = defaultValue(description.ellipsoid, Ellipsoid.WGS84);

        /**
         * The number of tiles in the X direction at level zero of the tile tree.
         *
         * @type Number
         */
        this.numberOfLevelZeroTilesX = defaultValue(description.numberOfLevelZeroTilesX, 1);

        /**
         * The number of tiles in the Y direction at level zero of the tile tree.
         *
         * @type Number
         */
        this.numberOfLevelZeroTilesY = defaultValue(description.numberOfLevelZeroTilesY, 1);

        /**
         * The world extent covered by this tiling scheme, in radians.
         *
         * @type Extent
         */
        this.extent = undefined;

        this._projection = new WebMercatorProjection(this.ellipsoid);

        if (typeof description.extentSouthwestInMeters !== 'undefined' &&
            typeof description.extentNortheastInMeters !== 'undefined') {
            this._extentSouthwestInMeters = description.extentSouthwestInMeters;
            this._extentNortheastInMeters = description.extentNortheastInMeters;
        } else {
            var semimajorAxisTimesPi = this.ellipsoid.getMaximumRadius() * Math.PI;
            this._extentSouthwestInMeters = new Cartesian2(-semimajorAxisTimesPi, -semimajorAxisTimesPi);
            this._extentNortheastInMeters = new Cartesian2(semimajorAxisTimesPi, semimajorAxisTimesPi);
        }

        var southwest = this._projection.unproject(this._extentSouthwestInMeters);
        var northeast = this._projection.unproject(this._extentNortheastInMeters);
        this.extent = new Extent(southwest.longitude, southwest.latitude,
                                 northeast.longitude, northeast.latitude);
    }

    /**
     * Creates the tile or tiles at level of detail zero, the coarsest, least detailed level.
     *
     * @memberof WebMercatorTilingScheme
     *
     * @returns {Array} An array containing the tiles at level of detail zero, starting with the
     * tile in the northwest corner of the globe and followed by the tile (if any) to its east.
     */
    WebMercatorTilingScheme.prototype.createLevelZeroTiles = TilingScheme.prototype.createLevelZeroTiles;

    WebMercatorTilingScheme.prototype.extentToNativeExtent = function(extent) {
        var projection = this._projection;
        var southwest = projection.project(extent.getSouthwest());
        var northeast = projection.project(extent.getNortheast());
        return {
            west : southwest.x,
            south : southwest.y,
            east : northeast.x,
            north : northeast.y
        };
    };

    /**
     * Converts tile x, y coordinates and level to an extent expressed in the native coordinates
     * of the tiling scheme.
     *
     * @memberof WebMercatorTilingScheme
     *
     * @param {Number} x The integer x coordinate of the tile.
     * @param {Number} y The integer y coordinate of the tile.
     * @param {Number} level The tile level-of-detail.  Zero is the least detailed.
     * @param {Object} An object whose west, south, east, and north properties will be set
     * with the native extent on return.
     *
     * @returns {Object} The specified 'outputExtent', or a new object containing the extent
     * if 'outputExtent' is undefined.
     */
    WebMercatorTilingScheme.prototype.tileXYToNativeExtent = function(x, y, level, outputExtent) {
        if (typeof outputExtent === 'undefined') {
            outputExtent = {};
        }
        var xTiles = this.numberOfLevelZeroTilesX << level;
        var yTiles = this.numberOfLevelZeroTilesY << level;

        var xTileWidth = (this._extentNortheastInMeters.x - this._extentSouthwestInMeters.x) / xTiles;
        outputExtent.west = this._extentSouthwestInMeters.x + x * xTileWidth;
        outputExtent.east = this._extentSouthwestInMeters.x + (x + 1) * xTileWidth;

        var yTileHeight = (this._extentNortheastInMeters.y - this._extentSouthwestInMeters.y) / yTiles;
        outputExtent.north = this._extentNortheastInMeters.y - y * yTileHeight;
        outputExtent.south = this._extentNortheastInMeters.y - (y + 1) * yTileHeight;

        return outputExtent;
    };

    /**
     * Converts tile x, y coordinates and level to a cartographic extent.
     *
     * @memberof WebMercatorTilingScheme
     *
     * @param {Number} x The integer x coordinate of the tile.
     * @param {Number} y The integer y coordinate of the tile.
     * @param {Number} level The tile level-of-detail.  Zero is the least detailed.
     *
     * @returns {Extent} The cartographic extent of the tile, with north, south, east and
     * west properties in radians.
     */
    WebMercatorTilingScheme.prototype.tileXYToExtent = function(x, y, level) {
        var nativeExtent = this.tileXYToNativeExtent(x, y, level);

        var projection = this._projection;
        var southwest = projection.unproject(new Cartesian2(nativeExtent.west, nativeExtent.south));
        var northeast = projection.unproject(new Cartesian2(nativeExtent.east, nativeExtent.north));

        return new Extent(southwest.longitude, southwest.latitude,
                          northeast.longitude, northeast.latitude);
    };

    /**
     * Calculates the tile x, y coordinates of the tile containing
     * a given cartographic position.
     *
     * @memberof WebMercatorTilingScheme
     *
     * @param {Cartographic} position The position.
     * @param {Number} level The tile level-of-detail.  Zero is the least detailed.
     *
     * @returns {Cartesian2} The x, y coordinate of the tile containing the position.
     */
    WebMercatorTilingScheme.prototype.positionToTileXY = function(position, level) {
        if (position.latitude > this.extent.north ||
            position.latitude < this.extent.south ||
            position.longitude < this.extent.west ||
            position.longitude > this.extent.east) {
            // outside the bounds of the tiling scheme
            return undefined;
        }

        var xTiles = this.numberOfLevelZeroTilesX << level;
        var yTiles = this.numberOfLevelZeroTilesY << level;

        var overallWidth = this._extentNortheastInMeters.x - this._extentSouthwestInMeters.x;
        var xTileWidth = overallWidth / xTiles;
        var overallHeight = this._extentNortheastInMeters.y - this._extentSouthwestInMeters.y;
        var yTileHeight = overallHeight / yTiles;

        var projection = this._projection;

        var webMercatorPosition = projection.project(position);
        var distanceFromWest = webMercatorPosition.x - this._extentSouthwestInMeters.x;
        var distanceFromNorth = this._extentNortheastInMeters.y - webMercatorPosition.y;

        var xTileCoordinate = distanceFromWest / xTileWidth | 0;
        if (xTileCoordinate >= xTiles) {
            xTileCoordinate = xTiles - 1;
        }
        var yTileCoordinate = distanceFromNorth / yTileHeight | 0;
        if (yTileCoordinate >= yTiles) {
            yTileCoordinate = yTiles - 1;
        }
        return new Cartesian2(xTileCoordinate, yTileCoordinate);
    };

    return WebMercatorTilingScheme;
});