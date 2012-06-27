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

    /**
     * Converts web mercator X, Y coordinates, expressed in meters, to a {@link Cartographic2}
     * containing geodetic ellipsoid coordinates.
     *
     * @memberof WebMercatorTilingScheme
     *
     * @param {Number} x The web mercator X coordinate in meters.
     * @param {Number} y The web mercator Y coordinate in meters.
     * @return {Cartographic2} The equivalent cartographic coordinates.
     */
    WebMercatorTilingScheme.prototype.webMercatorToCartographic = function(x, y) {
        var oneOverEarthSemimajorAxis = this.ellipsoid.getOneOverRadii().x;
        var longitude = x * oneOverEarthSemimajorAxis;
        var latitude = CesiumMath.PI_OVER_TWO - (2.0 * Math.atan(Math.exp(-y * oneOverEarthSemimajorAxis)));
        return new Cartographic2(longitude, latitude);
    };

    /**
     * Converts geodetic ellipsoid coordinates to the equivalent web mercator X, Y coordinates
     * expressed in meters and returned in a {@link Cartesian2}.
     *
     * @param {Number} longitude The cartographic longitude coordinate in radians.
     * @param {Number} latitude The cartographic latitude coordinate in radians.
     * @returns {Cartesian2} The equivalent web mercator X, Y coordinates, in meters.
     */
    WebMercatorTilingScheme.prototype.cartographicToWebMercator = function(longitude, latitude) {
        var semimajorAxis = this.ellipsoid.getRadii().x;
        return new Cartesian2(
                longitude * semimajorAxis,
                Math.log(Math.tan((CesiumMath.PI_OVER_TWO + latitude) * 0.5)) * semimajorAxis);
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