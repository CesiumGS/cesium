/*global define*/
define([
        '../Core/DeveloperError',
        '../Core/Math',
        '../Core/Occluder',
        '../Core/Ellipsoid',
        '../Core/BoundingSphere',
        '../Core/Rectangle',
        '../Core/Cartesian3',
        '../Core/Cartographic2',
        '../Core/Cartographic3'
    ], function(
        DeveloperError,
        CesiumMath,
        Occluder,
        Ellipsoid,
        BoundingSphere,
        Rectangle,
        Cartesian3,
        Cartographic2,
        Cartographic3) {
    "use strict";

    /**
     * A single piece of a uniformly subdivided image mapped to the surface of an ellipsoid.
     *
     * @name Tile
     * @constructor
     *
     * @param {Object} description.extent The cartographic extent of the tile, with north, south, east and
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
        if (!description) {
            throw new DeveloperError("description is required.", "description");
        }

        if (typeof description.extent === "undefined" &&
            (typeof description.x === "undefined" || typeof description.y === "undefined")) {
            throw new DeveloperError("Either description.extent is required or description.x and description.y are required.", "description");
        }

        if (typeof description.zoom === "undefined" || description.zoom < 0) {
            throw new DeveloperError("description.zoom is required an must be greater than zero.", "description.zoom");
        }

        /**
         * The ellipsoid whose surface this tile is on.
         *
         * @type Ellipsoid
         */
        this.ellipsoid = description.ellipsoid || Ellipsoid.getWgs84();

        /**
         * The cartographic extent of the tile, with north, south, east and
         * west properties in radians.
         *
         * @type Object
         */
        this.extent = null;

        /**
         * The x coordinate.
         *
         * @type Number
         */
        this.x = null;

        /**
         * The y coordinate.
         *
         * @type Number
         */
        this.y = null;

        /**
         * The zoom level.
         *
         * @type Number
         */
        this.zoom = null;

        /**
         * The parent of this tile in a tile tree system.
         *
         * @type Tile
         */
        this.parent = description.parent || null;

        /**
         * The children of this tile in a tile tree system.
         *
         * @type Array
         */
        this.children = null;

        this.zoom = description.zoom;
        if (description.extent) {
            this.extent = description.extent;
            var coords = Tile.extentToTileXY(this.extent, this.zoom);
            this.x = coords.x;
            this.y = coords.y;
        } else {
            this.x = description.x;
            this.y = description.y;

            if (this.x < 0 || this.y < 0) {
                throw new DeveloperError("description.x and description.y must be greater than zero.", "description");
            }

            this.extent = Tile.tileXYToExtent(this.x, this.y, this.zoom);
        }

        this._boundingSphere3D = null;
        this._occludeePoint = null;

        this._projection = null;
        this._boundingSphere2D = null;
        this._boundingRectangle = null;
    }

    /**
     * Converts an extent and zoom level into tile x, y coordinates.
     *
     * @memberof Tile
     *
     * @param {Object} extent The cartographic extent of the tile, with north, south, east and
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
     * @return {Object} The cartographic extent of the tile, with north, south, east and
     * west properties in radians.
     */
    Tile.tileXYToExtent = function(x, y, zoom) {
        var extent = {};

        // Lat
        var invZoom = 4.0 * Math.PI / (1 << zoom);
        var k = Math.exp(CesiumMath.TWO_PI - (y * invZoom));
        extent.north = Math.asin((k - 1.0) / (k + 1.0));
        k = Math.exp(CesiumMath.TWO_PI - ((y + 1) * invZoom));
        extent.south = Math.asin((k - 1.0) / (k + 1.0));

        // Lon
        invZoom = Math.PI / (1 << (zoom - 1.0));
        extent.west = x * invZoom - Math.PI;
        extent.east = (x + 1.0) * invZoom - Math.PI;

        return extent;
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

    Tile.prototype.computeMorphBounds = function(morphTime, projection) {
        var positions = [];

        var lla = new Cartographic3(this.extent.west, this.extent.north, 0.0);
        var twod = projection.project(lla);
        twod = new Cartesian3(0.0, twod.x, twod.y);
        positions.push(twod.lerp(this.ellipsoid.toCartesian(lla), morphTime));
        lla.longitude = this.extent.east;
        twod = projection.project(lla);
        twod = new Cartesian3(0.0, twod.x, twod.y);
        positions.push(twod.lerp(this.ellipsoid.toCartesian(lla), morphTime));
        lla.latitude = this.extent.south;
        twod = projection.project(lla);
        twod = new Cartesian3(0.0, twod.x, twod.y);
        positions.push(twod.lerp(this.ellipsoid.toCartesian(lla), morphTime));
        lla.longitude = this.extent.west;
        twod = projection.project(lla);
        twod = new Cartesian3(0.0, twod.x, twod.y);
        positions.push(twod.lerp(this.ellipsoid.toCartesian(lla), morphTime));

        if (this.extent.north < 0.0) {
            lla.latitude = this.extent.north;
        } else if (this.extent.south > 0.0) {
            lla.latitude = this.extent.south;
        } else {
            lla.latitude = 0.0;
        }

        for ( var i = 1; i < 8; ++i) {
            var temp = -Math.PI + i * CesiumMath.PI_OVER_TWO;
            if (this.extent.west < temp && temp < this.extent.east) {
                lla.longitude = temp;
                twod = projection.project(lla);
                twod = new Cartesian3(0.0, twod.x, twod.y);
                positions.push(twod.lerp(this.ellipsoid.toCartesian(lla), morphTime));
            }
        }

        if (lla.latitude === 0.0) {
            lla.longitude = this.extent.west;
            twod = projection.project(lla);
            twod = new Cartesian3(0.0, twod.x, twod.y);
            positions.push(twod.lerp(this.ellipsoid.toCartesian(lla), morphTime));
            lla.longitude = this.extent.east;
            twod = projection.project(lla);
            twod = new Cartesian3(0.0, twod.x, twod.y);
            positions.push(twod.lerp(this.ellipsoid.toCartesian(lla), morphTime));
        }

        return new BoundingSphere(positions);
    };

    Tile.prototype._compute3DBounds = function() {
        var positions = [];

        var lla = new Cartographic3(this.extent.west, this.extent.north, 0.0);
        positions.push(this.ellipsoid.toCartesian(lla));
        lla.longitude = this.extent.east;
        positions.push(this.ellipsoid.toCartesian(lla));
        lla.latitude = this.extent.south;
        positions.push(this.ellipsoid.toCartesian(lla));
        lla.longitude = this.extent.west;
        positions.push(this.ellipsoid.toCartesian(lla));

        if (this.extent.north < 0.0) {
            lla.latitude = this.extent.north;
        } else if (this.extent.south > 0.0) {
            lla.latitude = this.extent.south;
        } else {
            lla.latitude = 0.0;
        }

        for ( var i = 1; i < 8; ++i) {
            var temp = -Math.PI + i * CesiumMath.PI_OVER_TWO;
            if (this.extent.west < temp && temp < this.extent.east) {
                lla.longitude = temp;
                positions.push(this.ellipsoid.toCartesian(lla));
            }
        }

        if (lla.latitude === 0.0) {
            lla.longitude = this.extent.west;
            positions.push(this.ellipsoid.toCartesian(lla));
            lla.longitude = this.extent.east;
            positions.push(this.ellipsoid.toCartesian(lla));
        }

        this._boundingSphere3D = new BoundingSphere(positions);

        // TODO: get correct ellipsoid center
        var ellipsoidCenter = Cartesian3.getZero();
        if (!ellipsoidCenter.equals(this._boundingSphere3D.center)) {
            this._occludeePoint = Occluder.getOccludeePoint(new BoundingSphere(ellipsoidCenter, this.ellipsoid.getMinimumRadius()), this._boundingSphere3D.center, positions);
        } else {
            this._occludeePoint = {
                valid : false,
                occludeePoint : null
            };
        }
    };

    /**
     * The bounding sphere for the geometry.
     *
     * @memberof Tile
     *
     * @return {BoundingSphere} The bounding sphere for the geometry.
     */
    Tile.prototype.get3DBoundingSphere = function() {
        if (!this._boundingSphere3D) {
            this._compute3DBounds();
        }
        return this._boundingSphere3D;
    };

    /**
     * A point that when visible means the geometry for this tile is visible.
     *
     * @memberof Tile
     *
     * @return {Cartesian3} The occludee point or null.
     */
    Tile.prototype.getOccludeePoint = function() {
        if (!this._occludeePoint) {
            this._compute3DBounds();
        }
        return ((this._occludeePoint.valid) ? this._occludeePoint.occludeePoint : null);
    };

    Tile.prototype._compute2DBounds = function(projection) {
        if (projection && this._projection !== projection) {
            var lla = new Cartographic2(this.extent.west, this.extent.south);
            var lowerLeft = projection.project(lla);
            lla.longitude = this.extent.east;
            lla.latitude = this.extent.north;
            var upperRight = projection.project(lla);

            var diagonal = upperRight.subtract(lowerLeft);
            this._boundingRectangle = new Rectangle(lowerLeft.x, lowerLeft.y, diagonal.x, diagonal.y);

            this._boundingSphere2D = new BoundingSphere(new Cartesian3((lowerLeft.x + upperRight.x) * 0.5, (lowerLeft.y + upperRight.y) * 0.5, 0.0), Math.sqrt(diagonal.x * diagonal.x + diagonal.y *
                    diagonal.y) * 0.5);

            this._projection = projection;
        }
    };

    /**
     * DOC_TBA
     * @memberof Tile
     */
    Tile.prototype.get2DBoundingSphere = function(projection) {
        this._compute2DBounds(projection);
        return this._boundingSphere2D;
    };

    /**
     * DOC_TBA
     * @memberof Tile
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