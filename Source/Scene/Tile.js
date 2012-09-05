/*global define*/
define([
        '../Core/DeveloperError',
        '../Core/Math',
        '../Core/Ellipsoid',
        '../Core/Extent',
        '../Core/BoundingRectangle',
        '../Core/BoundingSphere',
        '../Core/Occluder'
    ], function(
        DeveloperError,
        CesiumMath,
        Ellipsoid,
        Extent,
        BoundingRectangle,
        BoundingSphere,
        Occluder) {
    "use strict";

    /**
     * A single piece of a uniformly subdivided image mapped to the surface of an ellipsoid.
     *
     * @alias Tile
     * @constructor
     *
     * @param {Extent} description.extent The cartographic extent of the tile, with north, south, east and
     * west properties in radians.
     * @param {Number} description.x The tile x coordinate.
     * @param {Number} description.y The tile y coordinate.
     * @param {Number} description.zoom The tile zoom level.
     * @param {Ellipsoid} description.ellipsoid The ellipsoid whose surface the tile is on. Defaults to
     * a WGS84 ellipsoid.
     * @param {Tile} description.parent The parent of this tile in a tile tree system.
     *
     * @exception {DeveloperError} Either description.extent or both description.x and description.y is required.
     * @exception {DeveloperError} description.zoom is required.
     *
     * @see SingleTileProvider
     * @see ArcGISTileProvider
     * @see OpenStreetMapTileProvider
     * @see BingMapsTileProvider
     */
    var Tile = function(description) {
        if (!description) {
            throw new DeveloperError('description is required.');
        }

        if (typeof description.extent === 'undefined' &&
            (typeof description.x === 'undefined' || typeof description.y === 'undefined')) {
            throw new DeveloperError('Either description.extent is required or description.x and description.y are required.');
        }

        if (typeof description.zoom === 'undefined' || description.zoom < 0) {
            throw new DeveloperError('description.zoom is required an must be greater than zero.');
        }

        /**
         * The ellipsoid whose surface this tile is on.
         *
         * @type Ellipsoid
         */
        this.ellipsoid = description.ellipsoid || Ellipsoid.WGS84;

        /**
         * The cartographic extent of the tile, with north, south, east and
         * west properties in radians.
         *
         * @type Extent
         */
        this.extent = undefined;

        /**
         * The x coordinate.
         *
         * @type Number
         */
        this.x = undefined;

        /**
         * The y coordinate.
         *
         * @type Number
         */
        this.y = undefined;

        /**
         * The zoom level.
         *
         * @type Number
         */
        this.zoom = undefined;

        /**
         * The parent of this tile in a tile tree system.
         *
         * @type Tile
         */
        this.parent = description.parent;

        /**
         * The children of this tile in a tile tree system.
         *
         * @type Array
         */
        this.children = undefined;

        this.zoom = description.zoom;
        if (typeof description.extent !== 'undefined') {
            this.extent = description.extent;
            var coords = Tile.extentToTileXY(this.extent, this.zoom);
            this.x = coords.x;
            this.y = coords.y;
        } else {
            this.x = description.x;
            this.y = description.y;

            if (this.x < 0 || this.y < 0) {
                throw new DeveloperError('description.x and description.y must be greater than zero.');
            }

            this.extent = Tile.tileXYToExtent(this.x, this.y, this.zoom);
        }

        this._boundingSphere3D = undefined;
        this._occludeePoint = undefined;
        this._occludeePointComputed = false;

        this._projection = undefined;
        this._boundingSphere2D = undefined;
        this._boundingRectangle = undefined;
    };

    /**
     * Converts an extent and zoom level into tile x, y coordinates.
     *
     * @memberof Tile
     *
     * @param {Extent} extent The cartographic extent of the tile, with north, south, east and
     * west properties in radians.
     * @param {Number} zoom The tile zoom level.
     *
     * @return {Object} An object with x and y properties.
     */
    Tile.extentToTileXY = function(extent, zoom) {
        var result = {};

        var sinN = Math.sin(extent.north);
        var k = CesiumMath.TWO_PI - Math.log((1.0 + sinN) / (1.0 - sinN));
        result.y = k * (1 << zoom) / (4.0 * Math.PI);
        result.y = Math.round(result.y);

        k = 1.0 << (zoom - 1.0);
        result.x = (extent.west + Math.PI) * k / Math.PI;
        result.x = Math.round(result.x);

        return result;
    };

    /**
     * Converts tile x, y coordinates and zoom to a cartographic extent.
     *
     * @memberof Tile
     *
     * @param {Number} x The x coordinate.
     * @param {Number} y The y coordinate.
     * @param {Number} zoom The tile zoom level.
     *
     * @return {Extent} The cartographic extent of the tile, with north, south, east and
     * west properties in radians.
     */
    Tile.tileXYToExtent = function(x, y, zoom) {
        if (x === 0 && y === 0 && zoom === 0) {
            return new Extent(
                -CesiumMath.PI,
                CesiumMath.toRadians(-85.05112878),
                CesiumMath.PI,
                CesiumMath.toRadians(85.05112878)
            );
        }

        // Lat
        var invZoom = 4.0 * Math.PI / (1 << zoom);
        var k = Math.exp(CesiumMath.TWO_PI - (y * invZoom));
        var north = Math.asin((k - 1.0) / (k + 1.0));
        k = Math.exp(CesiumMath.TWO_PI - ((y + 1) * invZoom));
        var south = Math.asin((k - 1.0) / (k + 1.0));

        // Lon
        invZoom = Math.PI / (1 << (zoom - 1.0));
        var west = x * invZoom - Math.PI;
        var east = (x + 1.0) * invZoom - Math.PI;

        return new Extent(west, south, east, north);
    };

    /**
     * Returns an array of tiles that would be at the next level of the tile tree.
     *
     * @memberof Tile
     *
     * @return {Array} The list of child tiles.
     */
    Tile.prototype.getChildren = function() {
        if (!this.children) {
            this.children = [];
            this.children.push(new Tile({
                x : this.x << 1,
                y : this.y << 1,
                zoom : this.zoom + 1,
                parent : this
            }));
            this.children.push(new Tile({
                x : this.x << 1 | 1,
                y : this.y << 1,
                zoom : this.zoom + 1,
                parent : this
            }));
            this.children.push(new Tile({
                x : this.x << 1,
                y : this.y << 1 | 1,
                zoom : this.zoom + 1,
                parent : this
            }));
            this.children.push(new Tile({
                x : this.x << 1 | 1,
                y : this.y << 1 | 1,
                zoom : this.zoom + 1,
                parent : this
            }));
        }
        return this.children;
    };

    /**
     * The bounding sphere for the geometry.
     *
     * @memberof Tile
     *
     * @return {BoundingSphere} The bounding sphere.
     */
    Tile.prototype.get3DBoundingSphere = function() {
        if (!this._boundingSphere3D) {
            this._boundingSphere3D = BoundingSphere.fromExtent3D(this.extent, this.ellipsoid);
        }
        return this._boundingSphere3D;
    };

    /**
     * A point that when visible means the geometry for this tile is visible.
     *
     * @memberof Tile
     *
     * @return {Cartesian3} The occludee point or undefined.
     */
    Tile.prototype.getOccludeePoint = function() {
        if (!this._occludeePointComputed) {
            this._occludeePoint = Occluder.computeOccludeePointFromExtent(this.extent, this.ellipsoid);
            this._occludeePointComputed = true;
        }
        return this._occludeePoint;
    };

    Tile.prototype._compute2DBounds = function(projection) {
        if (typeof projection !== 'undefined' && this._projection !== projection) {
            this._boundingRectangle = BoundingRectangle.fromExtent(this.extent, projection);
            this._boundingSphere2D = BoundingSphere.fromExtent2D(this.extent, projection);

            this._projection = projection;
        }
    };

    /**
     * The bounding sphere for the geometry when the extent is projected onto a surface that is displayed in 3D.
     *
     * @memberof Tile
     *
     * @return {BoundingSphere} The bounding sphere.
     */
    Tile.prototype.get2DBoundingSphere = function(projection) {
        this._compute2DBounds(projection);
        return this._boundingSphere2D;
    };

    /**
     * The bounding rectangle for when the tile is projected onto a surface that is displayed in 2D.
     *
     * @memberof Tile
     *
     * @return {BoundingRectangle} The bounding rectangle.
     */
    Tile.prototype.get2DBoundingRectangle = function(projection) {
        this._compute2DBounds(projection);
        return this._boundingRectangle;
    };

    /**
     * Returns a unique id from the x, y coordinates and zoom level.
     *
     * @memberof Tile
     *
     * @return {String} The unique id.
     */
    Tile.prototype.getKey = function() {
        return 'x_' + this.x + '_y_' + this.y + '_z_' + this.zoom;
    };

    return Tile;
});