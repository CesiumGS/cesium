/*global define*/
define([
        '../Core/DeveloperError',
        '../Core/Math',
        '../Core/Ellipsoid',
        '../Core/Extent',
        './Tile',
        './TilingScheme',
        '../Core/Cartesian2',
        '../Core/Cartographic2'
    ], function(
        DeveloperError,
        CesiumMath,
        Ellipsoid,
        Extent,
        Tile,
        TilingScheme,
        Cartesian2,
        Cartographic2) {
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
        description = description || {};

        /**
         * The ellipsoid whose surface is being tiled.
         *
         * @type Ellipsoid
         */
        this.ellipsoid = description.ellipsoid || Ellipsoid.WGS84;

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

        /**
         * The world extent covered by this tiling scheme, in radians.
         *
         * @type Extent
         */
        this.extent = undefined;

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
        this.extent = new Extent(
                southwest.longitude,
                southwest.latitude,
                northeast.longitude,
                northeast.latitude);
    }

    /**
     * Creates the tile or tiles at level of detail zero, the coarsest, least detailed level.
     *
     * @memberof WebMercatorTilingScheme
     *
     * @return {Array} An array containing the tiles at level of detail zero, starting with the
     * tile in the northwest corner of the globe and followed by the tile (if any) to its east.
     */
    WebMercatorTilingScheme.prototype.createLevelZeroTiles = TilingScheme.prototype.createLevelZeroTiles;

    WebMercatorTilingScheme.prototype.webMercatorToCartographic = function(x, y) {
        var oneOverEarthSemimajorAxis = this.ellipsoid.getOneOverRadii().x;
        var longitude = x * oneOverEarthSemimajorAxis;
        var latitude = CesiumMath.PI_OVER_TWO - (2.0 * Math.atan(Math.exp(-y * oneOverEarthSemimajorAxis)));
        return new Cartographic2(longitude, latitude);
    };

    WebMercatorTilingScheme.prototype.cartographicToWebMercator = function(cartographic) {
        var semimajorAxisTimesPi = this.ellipsoid.getOneOverRadii().x * Math.PI;
        return new Cartographic2(
                cartographic.longitude * semimajorAxisTimesPi,
                Math.log(Math.tan((CesiumMath.PI_OVER_TWO + lat) * 0.5)) * semimajorAxisTimesPi);
    };

    /**
     * Converts an extent and zoom level into tile x, y coordinates.
     *
     * @memberof WebMercatorTilingScheme
     *
     * @param {Extent} extent The cartographic extent of the tile, with north, south, east and
     * west properties in radians.
     * @param {Number} level The tile level-of-detail.  Zero is the least detailed.
     *
     * @return {Cartesian2} The integer x and y tile coordinates.
     */
    WebMercatorTilingScheme.prototype.extentToTileXY = function(extent, level) {
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
     * @memberof WebMercatorTilingScheme
     *
     * @param {Number} x The integer x coordinate of the tile.
     * @param {Number} y The integer y coordinate of the tile.
     * @param {Number} zoom The tile level-of-detail.  Zero is the least detailed.
     *
     * @return {Extent} The cartographic extent of the tile, with north, south, east and
     * west properties in radians.
     */
    WebMercatorTilingScheme.prototype.tileXYToExtent = function(x, y, level) {
        var xTiles = this.numberOfLevelZeroTilesX << level;
        var yTiles = this.numberOfLevelZeroTilesY << level;

        var worldFractionPerTileX = (this._extentNortheastInMeters.x - this._extentSouthwestInMeters.x) / xTiles;
        var west = this._extentSouthwestInMeters.x + x * worldFractionPerTileX;
        var east = this._extentSouthwestInMeters.x + (x + 1) * worldFractionPerTileX;

        var worldFractionPerTileY = (this._extentNortheastInMeters.y - this._extentSouthwestInMeters.y) / yTiles;
        var north = this._extentNortheastInMeters.y - y * worldFractionPerTileY;
        var south = this._extentNortheastInMeters.y - (y + 1) * worldFractionPerTileY;

        var southwest = this.webMercatorToCartographic(west, south);
        var northeast = this.webMercatorToCartographic(east, north);

        return new Extent(southwest.longitude, southwest.latitude,
                          northeast.longitude, northeast.latitude);
    };

    return WebMercatorTilingScheme;
});