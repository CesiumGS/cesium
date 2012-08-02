/*global define*/
define([
        '../Core/defaultValue',
        '../Core/DeveloperError',
        '../Core/Math',
        '../Core/Ellipsoid',
        '../Core/Extent',
        '../Core/Cartesian2',
        '../Core/Cartographic',
        './TilingScheme'
    ], function(
        defaultValue,
        DeveloperError,
        CesiumMath,
        Ellipsoid,
        Extent,
        Cartesian2,
        Cartographic,
        TilingScheme) {
    "use strict";

    /**
     * A tiling scheme for geometry referenced to a web mercator projection, EPSG:3857.  This is
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

        /**
         * The maximum error, in meters, that can exist in the surface geometry at tile level zero.
         * Tile level one is assumed to have half this error, level two is assumed to have
         * half the error of level one, and so on down the tile pyramid.
         *
         * @type Number
         */
        this.levelZeroMaximumGeometricError = this.ellipsoid.getRadii().x * 2 * Math.PI / 512;

        if (typeof description.extentSouthwestInMeters !== 'undefined' &&
            typeof description.extentNortheastInMeters !== 'undefined') {
            this._extentSouthwestInMeters = description.extentSouthwestInMeters;
            this._extentNortheastInMeters = description.extentNortheastInMeters;
        } else {
            var semimajorAxisTimesPi = this.ellipsoid.getRadii().x * Math.PI;
            this._extentSouthwestInMeters = new Cartesian2(-semimajorAxisTimesPi, -semimajorAxisTimesPi);
            this._extentNortheastInMeters = new Cartesian2(semimajorAxisTimesPi, semimajorAxisTimesPi);
        }

        var southwest = this.webMercatorToCartographic(this._extentSouthwestInMeters.x, this._extentSouthwestInMeters.y);
        var northeast = this.webMercatorToCartographic(this._extentNortheastInMeters.x, this._extentNortheastInMeters.y);
        this.extent = new Extent(southwest.longitude, southwest.latitude,
                                 northeast.longitude, northeast.latitude);
    }

    /**
     * Gets the maximum geometric error allowed in a tile at a given level.
     *
     * @memberof WebMercatorTilingScheme
     *
     * @param {Number} level The tile level for which to get the maximum geometric error.
     * @returns {Number}
     */
    WebMercatorTilingScheme.prototype.getLevelMaximumGeometricError = TilingScheme.prototype.getLevelMaximumGeometricError;

    /**
     * Gets the level with the specified quantity of geometric error or less.
     *
     * @memberof WebMercatorTilingScheme
     *
     * @param {Number} geometricError The geometric error for which to find a corresponding level.
     * @returns {Number} The level with the specified geometric error or less.
     */
    WebMercatorTilingScheme.prototype.getLevelWithMaximumGeometricError = TilingScheme.prototype.getLevelWithMaximumGeometricError;

    /**
     * Creates the tile or tiles at level of detail zero, the coarsest, least detailed level.
     *
     * @memberof WebMercatorTilingScheme
     *
     * @returns {Array} An array containing the tiles at level of detail zero, starting with the
     * tile in the northwest corner of the globe and followed by the tile (if any) to its east.
     */
    WebMercatorTilingScheme.prototype.createLevelZeroTiles = TilingScheme.prototype.createLevelZeroTiles;

    /**
     * Converts web mercator X, Y coordinates, expressed in meters, to a {@link Cartographic}
     * containing geodetic ellipsoid coordinates.
     *
     * @memberof WebMercatorTilingScheme
     *
     * @param {Number} x The web mercator X coordinate in meters.
     * @param {Number} y The web mercator Y coordinate in meters.
     * @returns {Cartographic} The equivalent cartographic coordinates.
     */
    WebMercatorTilingScheme.prototype.webMercatorToCartographic = function(x, y) {
        var oneOverEarthSemimajorAxis = this.ellipsoid.getOneOverRadii().x;
        var longitude = x * oneOverEarthSemimajorAxis;
        var latitude = CesiumMath.PI_OVER_TWO - (2.0 * Math.atan(Math.exp(-y * oneOverEarthSemimajorAxis)));
        return new Cartographic(longitude, latitude);
    };

    /**
     * Converts geodetic ellipsoid coordinates to the equivalent web mercator
     * X, Y coordinates expressed in meters and returned in a {@link Cartesian2}.
     *
     * @param {Number} longitude The cartographic longitude coordinate in radians.
     * @param {Number} latitude The cartographic latitude coordinate in radians.
     * @returns {Cartesian2} The equivalent web mercator X, Y coordinates, in meters.
     */
    WebMercatorTilingScheme.prototype.cartographicToWebMercator = function(longitude, latitude) {
        var semimajorAxis = this.ellipsoid.getRadii().x;
        return new Cartesian2(longitude * semimajorAxis,
                              Math.log(Math.tan((CesiumMath.PI_OVER_TWO + latitude) * 0.5)) * semimajorAxis);
    };

    WebMercatorTilingScheme.prototype.extentToNativeExtent = function(extent) {
        var southwest = this.cartographicToWebMercator(extent.west, extent.south);
        var northeast = this.cartographicToWebMercator(extent.east, extent.north);
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
        var nativeExtent = {};
        this.tileXYToNativeExtent(x, y, level, nativeExtent);

        var southwest = this.webMercatorToCartographic(nativeExtent.west, nativeExtent.south);
        var northeast = this.webMercatorToCartographic(nativeExtent.east, nativeExtent.north);

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

        var webMercatorPosition = this.cartographicToWebMercator(position.longitude, position.latitude);
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