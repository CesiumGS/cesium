/*global define*/
define([
        '../Core/DeveloperError',
        './TileState'
    ], function(
        DeveloperError,
        TileState) {
    "use strict";

    /**
     * A node in the quadtree representing the surface of a {@link CentralBody}.
     * A tile holds the surface geometry for its horizontal extent and zero or
     * more imagery textures overlaid on the geometry.
     *
     * @alias Tile
     * @constructor
     * @private
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
         * A sphere that completely contains this tile on the globe.  This property may be
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

        /**
         * The distance from the camera to this tile, updated when the tile is selected
         * for rendering.  We can get rid of this if we have a better way to sort by
         * distance - for example, by using the natural ordering of a quadtree.
         * @type Number
         */
        this.distance = 0.0;

        /**
         * The world coordinates of the southwest corner of the tile's extent.
         *
         * @type Cartesian3
         */
        this.southwestCornerCartesian = undefined;

        /**
         * The world coordinates of the northeast corner of the tile's extent.
         *
         * @type Cartesian3
         */
        this.northeastCornerCartesian = undefined;

        /**
         * A normal that, along with southwestCornerCartesian, defines a plane at the western edge of
         * the tile.  Any position above (in the direction of the normal) this plane is outside the tile.
         *
         * @type Cartesian3
         */
        this.westNormal = undefined;

        /**
         * A normal that, along with southwestCornerCartesian, defines a plane at the southern edge of
         * the tile.  Any position above (in the direction of the normal) this plane is outside the tile.
         * Because points of constant latitude do not necessary lie in a plane, positions below this
         * plane are not necessarily inside the tile, but they are close.
         *
         * @type Cartesian3
         */
        this.southNormal = undefined;

        /**
         * A normal that, along with northeastCornerCartesian, defines a plane at the eastern edge of
         * the tile.  Any position above (in the direction of the normal) this plane is outside the tile.
         *
         * @type Cartesian3
         */
        this.eastNormal = undefined;

        /**
         * A normal that, along with northeastCornerCartesian, defines a plane at the eastern edge of
         * the tile.  Any position above (in the direction of the normal) this plane is outside the tile.
         * Because points of constant latitude do not necessary lie in a plane, positions below this
         * plane are not necessarily inside the tile, but they are close.
         *
         * @type Cartesian3
         */
        this.northNormal = undefined;

        /**
         * A proxy point to use for this tile for horizon culling.  If this point is below the horizon, the
         * entire tile is below the horizon as well.  The point is expressed in the ellipsoid-scaled
         * space.  To transform a point from world coordinates centered on the ellipsoid to ellipsoid-scaled
         * coordinates, multiply the world coordinates by {@link Ellipsoid#getOneOverRadii}.  See
         * <a href="http://blogs.agi.com/insight3d/index.php/2009/03/25/horizon-culling-2/">http://blogs.agi.com/insight3d/index.php/2009/03/25/horizon-culling-2/</a>
         * for information the proxy point.
         *
         * @type {Cartesian3}
         */
        this.occludeePointInScaledSpace = undefined;
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

    Tile.prototype.freeResources = function() {
        this.state = TileState.UNLOADED;
        this.doneLoading = false;
        this.renderable = false;

        if (typeof this.vertexArray !== 'undefined') {
            var indexBuffer = this.vertexArray.getIndexBuffer();

            this.vertexArray.destroy();
            this.vertexArray = undefined;

            if (!indexBuffer.isDestroyed() && typeof indexBuffer.referenceCount !== 'undefined') {
                --indexBuffer.referenceCount;
                if (indexBuffer.referenceCount === 0) {
                    indexBuffer.destroy();
                }
            }
        }

        if (typeof this.transientData !== 'undefined' && typeof this.transientData.destroy !== 'undefined') {
            this.transientData.destroy();
        }
        this.transientData = undefined;

        var i, len;

        var imageryList = this.imagery;
        for (i = 0, len = imageryList.length; i < len; ++i) {
            imageryList[i].freeResources();
        }
        this.imagery.length = 0;

        if (typeof this.children !== 'undefined') {
            for (i = 0, len = this.children.length; i < len; ++i) {
                this.children[i].freeResources();
            }
        }
    };

    return Tile;
});