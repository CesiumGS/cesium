/*global define*/
define([
        '../Core/BoundingSphere',
        '../Core/Cartesian3',
        '../Core/Cartesian4',
        '../Core/DeveloperError',
        './TileState',
        './TileTerrain'
    ], function(
        BoundingSphere,
        Cartesian3,
        Cartesian4,
        DeveloperError,
        TileState,
        TileTerrain) {
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
         * The current state of the tile in the tile load pipeline.
         * @type TileState
         */
        this.state = TileState.START;

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
        this.southwestCornerCartesian = new Cartesian3(0.0, 0.0, 0.0);

        /**
         * The world coordinates of the northeast corner of the tile's extent.
         *
         * @type Cartesian3
         */
        this.northeastCornerCartesian = new Cartesian3(0.0, 0.0, 0.0);

        /**
         * A normal that, along with southwestCornerCartesian, defines a plane at the western edge of
         * the tile.  Any position above (in the direction of the normal) this plane is outside the tile.
         *
         * @type Cartesian3
         */
        this.westNormal = new Cartesian3(0.0, 0.0, 0.0);

        /**
         * A normal that, along with southwestCornerCartesian, defines a plane at the southern edge of
         * the tile.  Any position above (in the direction of the normal) this plane is outside the tile.
         * Because points of constant latitude do not necessary lie in a plane, positions below this
         * plane are not necessarily inside the tile, but they are close.
         *
         * @type Cartesian3
         */
        this.southNormal = new Cartesian3(0.0, 0.0, 0.0);

        /**
         * A normal that, along with northeastCornerCartesian, defines a plane at the eastern edge of
         * the tile.  Any position above (in the direction of the normal) this plane is outside the tile.
         *
         * @type Cartesian3
         */
        this.eastNormal = new Cartesian3(0.0, 0.0, 0.0);

        /**
         * A normal that, along with northeastCornerCartesian, defines a plane at the eastern edge of
         * the tile.  Any position above (in the direction of the normal) this plane is outside the tile.
         * Because points of constant latitude do not necessary lie in a plane, positions below this
         * plane are not necessarily inside the tile, but they are close.
         *
         * @type Cartesian3
         */
        this.northNormal = new Cartesian3(0.0, 0.0, 0.0);

        this.waterMaskTexture = undefined;

        this.waterMaskTranslationAndScale = new Cartesian4(0.0, 0.0, 1.0, 1.0);

        this.terrainData = undefined;
        this.center = new Cartesian3(0.0, 0.0, 0.0);
        this.vertexArray = undefined;
        this.minHeight = 0.0;
        this.maxHeight = 0.0;
        this.boundingSphere3D = new BoundingSphere();
        this.boundingSphere2D = new BoundingSphere();
        this.occludeePointInScaledSpace = new Cartesian3(0.0, 0.0, 0.0);

        this.isRenderable = false;

        this.loadedTerrain = undefined;
        this.upsampledTerrain = undefined;
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
        if (typeof this.waterMaskTexture !== 'undefined') {
            --this.waterMaskTexture.referenceCount;
            if (this.waterMaskTexture.referenceCount === 0) {
                this.waterMaskTexture.destroy();
            }
            this.waterMaskTexture = undefined;
        }

        this.state = TileState.START;
        this.isRenderable = false;
        this.terrainData = undefined;

        if (typeof this.loadedTerrain !== 'undefined') {
            this.loadedTerrain.freeResources();
            this.loadedTerrain = undefined;
        }

        if (typeof this.upsampledTerrain !== 'undefined') {
            this.upsampledTerrain.freeResources();
            this.upsampledTerrain = undefined;
        }

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
            this.children = undefined;
        }

        this.freeVertexArray();
    };

    Tile.prototype.freeVertexArray = function() {
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
    };

    return Tile;
});