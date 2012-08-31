/*global define*/
define([
        '../Core/defaultValue',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/Math',
        '../Core/Cartesian2',
        '../Core/Ellipsoid',
        '../Core/Extent',
        '../Core/BoundingRectangle',
        '../Core/BoundingSphere',
        '../Core/Occluder',
        './TileState'
    ], function(
        defaultValue,
        destroyObject,
        DeveloperError,
        CesiumMath,
        Cartesian2,
        Ellipsoid,
        Extent,
        BoundingRectangle,
        BoundingSphere,
        Occluder,
        TileState) {
    "use strict";

    /**
     * A node in the quadtree representing the surface of a {@link CentralBody}.
     * A tile holds the surface geometry for its horizontal extent and zero or
     * more imagery textures overlaid on the geometry.
     *
     * @alias Tile
     * @constructor
     *
     * @param {TilingScheme} description.tilingScheme The tiling scheme of which the new tile is a part, such as a
     *                                                {@link WebMercatorTilingScheme} or a {@link GeographicTilingScheme}.
     * @param {Number} description.x The tile x coordinate.
     * @param {Number} description.y The tile y coordinate.
     * @param {Number} description.level The tile level-of-detail.
     * @param {Tile} description.parent The parent of this tile in a tile tree system.
     *
     * @exception {DeveloperError} Either description.extent or both description.x and description.y is required.
     * @exception {DeveloperError} description.level is required.
     */
    var Tile = function(description) {
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

        if (typeof description.level === 'undefined' || description.zoom < 0) {
            throw new DeveloperError('description.level is required and must be greater than or equal to zero.');
        }

        if (typeof description.tilingScheme === 'undefined') {
            throw new DeveloperError('description.tilingScheme is required.');
        }

        /**
         * The tiling scheme used to tile the surface.
         * @type TilingScheme
         */
        this.tilingScheme = description.tilingScheme;

        /**
         * The x coordinate.
         * @type Number
         */
        this.x = description.x;

        /**
         * The y coordinate.
         * @type Number
         */
        this.y = description.y;

        /**
         * The level-of-detail, where zero is the coarsest, least-detailed.
         * @type Number
         */
        this.level = description.level;

        /**
         * The parent of this tile in a tiling scheme.
         * @type Tile
         */
        this.parent = description.parent;

        /**
         * The children of this tile in a tiling scheme.
         * @type Array
         */
        this.children = undefined;

        /**
         * The cartographic extent of the tile, with north, south, east and
         * west properties in radians.
         * @type Extent
         */
        this.extent = this.tilingScheme.tileXYToExtent(this.x, this.y, this.level);

        /**
         * The {@link VertexArray} defining the geometry of this tile.  This property
         * is expected to be set before the tile enter's the {@link TileState.READY}
         * {@link state}.
         * @type VertexArray
         */
        this.vertexArray = undefined;

        /**
         * The center of this tile.  The {@link vertexArray} is rendered
         * relative-to-center (RTC) using this center.  Note that the center of the
         * {@link boundingSphere3D} is not necessarily the same as this center.
         * This property is expected to be set before the tile enter's the
         * {@link TileState.READY} {@link state}.
         * @type Cartesian3
         */
        this.center = undefined;

        /**
         * The maximum height of terrain in this tile, in meters above the ellipsoid.
         * @type Number
         */
        this.maxHeight = undefined;

        /**
         * A sphere that completely contains this tile.  This property may be
         * undefined until the tile's {@link vertexArray} is loaded.
         * @type BoundingSphere
         */
        this.boundingSphere3D = undefined;

        /**
         * The current state of the tile in the tile load pipeline.
         * @type TileState
         */
        this.state = TileState.UNLOADED;

        /**
         * The previous tile in the {@link TileLoadQueue}.
         * @type Tile
         */
        this.loadPrevious = undefined;

        /**
         * The next tile in the {@link TileLoadQueue}.
         * @type Tile
         */
        this.loadNext = undefined;

        /**
         * The previous tile in the {@link TileReplacementQueue}.
         * @type Tile
         */
        this.replacementPrevious = undefined;

        /**
         * The next tile in the {@link TileReplacementQueue}.
         * @type Tile
         */
        this.replacementNext = undefined;

        /**
         * The {@link TileImagery} attached to this tile.
         * @type Array
         */
        this.imagery = [];

        /**
         * Transient data stored during the load process.  The exact content
         * of this property is a function of the tile's current {@link state} and
         * the {@link TerrainProvider} that is loading the tile.
         * @type Object
         */
        this.transientData = undefined;

        // TODO: write doc for these.
        this.occludeePoint = undefined;
        this.occludeePointComputed = false;
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
            var tilingScheme = this.tilingScheme;
            var level = this.level + 1;
            var x = this.x * 2;
            var y = this.y * 2;
            this.children = [new Tile({
                tilingScheme : tilingScheme,
                x : x,
                y : y,
                level : level,
                parent : this
            }), new Tile({
                tilingScheme : tilingScheme,
                x : x + 1,
                y : y,
                level : level,
                parent : this
            }), new Tile({
                tilingScheme : tilingScheme,
                x : x,
                y : y + 1,
                level : level,
                parent : this
            }), new Tile({
                tilingScheme : tilingScheme,
                x : x + 1,
                y : y + 1,
                level : level,
                parent : this
            })];
        }

        return this.children;
    };

    /**
     * Computes a point that when visible means the geometry for this tile is visible.
     *
     * @memberof Tile
     *
     * @return {Cartesian3} The occludee point or undefined.
     */
    Tile.prototype.getOccludeePoint = function() {
        if (!this._occludeePointComputed) {
            this._occludeePoint = Occluder.computeOccludeePointFromExtent(this.extent, this.tilingScheme.ellipsoid);
            this._occludeePointComputed = true;
        }
        return this._occludeePoint;
    };

    Tile.prototype.freeResources = function() {
        this.state = TileState.UNLOADED;
        this.doneLoading = false;
        this.renderable = false;

        if (typeof this.vertexArray !== 'undefined') {
            var indexBuffer = this.vertexArray.getIndexBuffer();

            this.vertexArray = this.vertexArray && this.vertexArray.destroy();
            this.vertexArray = undefined;

            if (!indexBuffer.isDestroyed() && typeof indexBuffer.referenceCount !== 'undefined') {
                --indexBuffer.referenceCount;
                if (indexBuffer.referenceCount === 0) {
                    indexBuffer.destroy();
                }
            }
        }

        if (typeof this.geometry !== 'undefined' && typeof this.geometry.destroy !== 'undefined') {
            this.geometry.destroy();
        }
        this.geometry = undefined;

        if (typeof this.transformedGeometry !== 'undefined' && typeof this.transformedGeometry.destroy !== 'undefined') {
            this.transformedGeometry.destroy();
        }
        this.transformedGeometry = undefined;

        var imageryList = this.imagery;
        Object.keys(imageryList).forEach(function(key) {
            var tileImagery = imageryList[key];
            var imagery = tileImagery.imagery;
            imagery.releaseReference();
        });
        this.imagery = [];

        if (typeof this.children !== 'undefined') {
            for (var i = 0; i < this.children.length; ++i) {
                this.children[i].freeResources();
            }
        }
    };

    return Tile;
});