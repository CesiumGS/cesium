/*global define*/
define([
        '../Core/defaultValue',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/Math',
        '../Core/Cartesian2',
        '../Core/Ellipsoid',
        '../Core/Extent',
        './TileState'
    ], function(
        defaultValue,
        destroyObject,
        DeveloperError,
        CesiumMath,
        Cartesian2,
        Ellipsoid,
        Extent,
        TileState) {
    "use strict";

    /**
     * A single piece of a uniformly subdivided image mapped to the surface of an ellipsoid.
     *
     * @name Tile
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
    function Tile(description) {
        if (typeof description === 'undefined') {
            throw new DeveloperError('description is required.');
        }

        if (typeof description.x === 'undefined' || typeof description.y === 'undefined') {
            if (typeof description.extent === 'undefined') {
                throw new DeveloperError('Either description.extent is required or description.x and description.y are required.');
            }
        } else if (description.x < 0 || description.y < 0) {
            throw new DeveloperError('description.x and description.y must be greater than or equal to zero.');
        }

        if (typeof description.zoom === 'undefined' || description.zoom < 0) {
            throw new DeveloperError('description.zoom is required and must be greater than or equal to zero.');
        }

        /**
         * The ellipsoid whose surface this tile is on.
         *
         * @type Ellipsoid
         */
        this.ellipsoid = defaultValue(description.ellipsoid, Ellipsoid.WGS84);

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
        this.zoom = description.zoom;

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

        /**
         * The state of this tile.
         *
         * @type TileState
         */
        this.state = TileState.UNLOADED;

        if (typeof description.extent !== 'undefined') {
            var coords = Tile.extentToTileXY(description.extent, this.zoom);
            this.x = coords.x;
            this.y = coords.y;

            this.extent = description.extent;
        } else {
            this.x = description.x;
            this.y = description.y;

            this.extent = Tile.tileXYToExtent(this.x, this.y, this.zoom);
        }

        this._boundingSphere3D = undefined;
        this._occludeePoint = undefined;

        this._projection = undefined;
        this._boundingSphere2D = undefined;
        this._boundingRectangle = undefined;

        this._previous = undefined;
        this._next = undefined;

        this._image = undefined;
        this._texture = undefined;
        this._extentVA = undefined;

        this._failCount = 0;
        this._lastFailTime = 0;
        this._lastUsedTime = 0;

        this._width = 0;
        this._height = 0;
    }

    /**
     * Converts an extent and zoom level into tile x, y coordinates.
     *
     * @memberof Tile
     *
     * @param {Extent} extent The cartographic extent of the tile, with north, south, east and
     * west properties in radians.
     * @param {Number} zoom The tile zoom level.
     *
     * @return {Cartesian2} An object with x and y properties.
     */
    Tile.extentToTileXY = function(extent, zoom) {
        var sinN = Math.sin(extent.north);
        var k = CesiumMath.TWO_PI - Math.log((1.0 + sinN) / (1.0 - sinN));
        var y = k * (1 << zoom) / (4.0 * Math.PI);
        y = Math.round(y);

        k = 1.0 << (zoom - 1.0);
        var x = (extent.west + Math.PI) * k / Math.PI;
        x = Math.round(x);

        return new Cartesian2(x, y);
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
            return new Extent(-CesiumMath.PI, CesiumMath.toRadians(-85.05112878), CesiumMath.PI, CesiumMath.toRadians(85.05112878));
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
        if (typeof this.children === 'undefined') {
            var zoom = this.zoom + 1;
            var x = this.x * 2;
            var y = this.y * 2;
            this.children = [new Tile({
                x : x,
                y : y,
                zoom : zoom,
                parent : this
            }), new Tile({
                x : x + 1,
                y : y,
                zoom : zoom,
                parent : this
            }), new Tile({
                x : x,
                y : y + 1,
                zoom : zoom,
                parent : this
            }), new Tile({
                x : x + 1,
                y : y + 1,
                zoom : zoom,
                parent : this
            })];
        }

        return this.children;
    };

    Tile.prototype.computeMorphBounds = function(morphTime, projection) {
        return Extent.computeMorphBoundingSphere(this.extent, this.ellipsoid, morphTime, projection);
    };

    /**
     * The bounding sphere for the geometry.
     *
     * @memberof Tile
     *
     * @return {BoundingSphere} The bounding sphere.
     */
    Tile.prototype.get3DBoundingSphere = function() {
        if (typeof this._boundingSphere3D === 'undefined') {
            this._boundingSphere3D = Extent.compute3DBoundingSphere(this.extent, this.ellipsoid);
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
        if (typeof this._occludeePoint === 'undefined') {
            this._occludeePoint = Extent.computeOccludeePoint(this.extent, this.ellipsoid);
        }

        return this._occludeePoint.valid ? this._occludeePoint.occludeePoint : undefined;
    };

    function compute2DBounds(tile, projection) {
        if (typeof projection === 'undefined' || tile._projection === projection) {
            return;
        }

        var extent = tile.extent;
        tile._boundingRectangle = Extent.computeBoundingRectangle(extent, projection);
        tile._boundingSphere2D = Extent.compute2DBoundingSphere(extent, projection);
        tile._projection = projection;
    }

    /**
     * The bounding sphere for the geometry when the extent is projected onto a surface that is displayed in 3D.
     *
     * @memberof Tile
     *
     * @return {BoundingSphere} The bounding sphere.
     */
    Tile.prototype.get2DBoundingSphere = function(projection) {
        compute2DBounds(this, projection);

        return this._boundingSphere2D;
    };

    /**
     * The bounding rectangle for when the tile is projected onto a surface that is displayed in 2D.
     *
     * @memberof Tile
     *
     * @return {Rectangle} The bounding rectangle.
     */
    Tile.prototype.get2DBoundingRectangle = function(projection) {
        compute2DBounds(this, projection);

        return this._boundingRectangle;
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     *
     * @memberof Tile
     *
     * @return {Boolean} True if this object was destroyed; otherwise, false.
     *
     * @see Tile#destroy
     */
    Tile.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Destroys the WebGL resources held by this object.  Destroying an object allows for deterministic
     * release of WebGL resources, instead of relying on the garbage collector to destroy this object.
     * <br /><br />
     * Once an object is destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
     * assign the return value (<code>undefined</code>) to the object as done in the example.
     *
     * @memberof Tile
     *
     * @return {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see Tile#isDestroyed
     *
     * @example
     * tile = tile && tile.destroy();
     */
    Tile.prototype.destroy = function() {
        this._extentVA = this._extentVA && this._extentVA.destroy();
        this._texture = this._texture && this._texture.destroy();

        if (typeof this.children !== 'undefined') {
            while (this.children.length > 0) {
                this.children.pop().destroy();
            }
        }

        return destroyObject(this);
    };

    return Tile;
});