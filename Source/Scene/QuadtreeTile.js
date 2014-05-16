/*global define*/
define([
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        './QuadtreeTileState'
    ], function(
        defined,
        defineProperties,
        DeveloperError,
        QuadtreeTileState) {
    "use strict";

    var QuadtreeTile = function QuadtreeTile(description) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(description)) {
            throw new DeveloperError('description is required.');
        }
        if (!defined(description.x)) {
            throw new DeveloperError('description.x is required.');
        } else if (!defined(description.y)) {
            throw new DeveloperError('description.y is required.');
        } else if (description.x < 0 || description.y < 0) {
            throw new DeveloperError('description.x and description.y must be greater than or equal to zero.');
        }
        if (!defined(description.level)) {
            throw new DeveloperError('description.level is required and must be greater than or equal to zero.');
        }
        if (!defined(description.tilingScheme)) {
            throw new DeveloperError('description.tilingScheme is required.');
        }
        //>>includeEnd('debug');

        this._tilingScheme = description.tilingScheme;
        this._x = description.x;
        this._y = description.y;
        this._level = description.level;
        this._parent = description.parent;
        this._rectangle = this._tilingScheme.tileXYToRectangle(this._x, this._y, this._level);
        this._children = undefined;

        // QuadtreeTileReplacementQueue gets/sets these private properties.
        this._replacementPrevious = undefined;
        this._replacementNext = undefined;

        // The distance from the camera to this tile, updated when the tile is selected
        // for rendering.  We can get rid of this if we have a better way to sort by
        // distance - for example, by using the natural ordering of a quadtree.
        // QuadtreePrimitive gets/sets this private property.
        this._distance = 0.0;

        /**
         * Gets or sets the current state of the tile in the tile load pipeline.
         * @type {QuadtreeTileState}
         * @default {@link QuadtreeTileState.START}
         */
        this.state = QuadtreeTileState.START;

        /**
         * Gets or sets a value indicating whether or not the tile is currently renderable.
         * @type {Boolean}
         * @default false
         */
        this.renderable = false;

        /**
         * Gets or set a value indicating whether or not the tile was entire upsampled from its
         * parent tile.  If all four children of a parent tile were upsampled from the parent,
         * we will render the parent instead of the children even if the LOD indicates that
         * the children would be preferable.
         * @type {Boolean}
         * @default false
         */
        this.upsampledFromParent = false;

        /**
         * Gets or sets the additional data associated with this tile.  The exact content is specific to the
         * {@link QuadtreeTileProvider}.
         * @type {Object}
         * @default undefined
         */
        this.data = undefined;
    };

    /**
     * Creates a rectangular set of tiles for level of detail zero, the coarsest, least detailed level.
     *
     * @memberof QuadtreeTile
     *
     * @param {TilingScheme} tilingScheme The tiling scheme for which the tiles are to be created.
     * @returns {Array} An array containing the tiles at level of detail zero, starting with the
     * tile in the northwest corner and followed by the tile (if any) to its east.
     */
    QuadtreeTile.createLevelZeroTiles = function(tilingScheme) {
        if (!defined(tilingScheme)) {
            throw new DeveloperError('tilingScheme is required.');
        }

        var numberOfLevelZeroTilesX = tilingScheme.getNumberOfXTilesAtLevel(0);
        var numberOfLevelZeroTilesY = tilingScheme.getNumberOfYTilesAtLevel(0);

        var result = new Array(numberOfLevelZeroTilesX * numberOfLevelZeroTilesY);

        var index = 0;
        for (var y = 0; y < numberOfLevelZeroTilesY; ++y) {
            for (var x = 0; x < numberOfLevelZeroTilesX; ++x) {
                result[index++] = new QuadtreeTile({
                    tilingScheme : tilingScheme,
                    x : x,
                    y : y,
                    level : 0
                });
            }
        }

        return result;
    };

    defineProperties(QuadtreeTile.prototype, {
        /**
         * Gets the tiling scheme used to tile the surface.
         * @type {TilingScheme}
         */
        tilingScheme : {
            get : function() {
                return this._tilingScheme;
            }
        },

        /**
         * Gets the tile X coordinate.
         * @type {Number}
         */
        x : {
            get : function() {
                return this._x;
            }
        },

        /**
         * Gets the tile Y coordinate.
         * @type {Number}
         */
        y : {
            get : function() {
                return this._y;
            }
        },

        /**
         * Gets the level-of-detail, where zero is the coarsest, least-detailed.
         * @type {Number}
         */
        level : {
            get : function() {
                return this._level;
            }
        },

        /**
         * Gest the parent tile of this tile.
         * @type {QuadtreeTile}
         */
        parent : {
            get : function() {
                return this._parent;
            }
        },

        /**
         * Gets the cartographic rectangle of the tile, with north, south, east and
         * west properties in radians.
         * @type {Rectangle}
         */
        rectangle : {
            get : function() {
                return this._rectangle;
            }
        },

        /**
         * An array of tiles that would be at the next level of the tile tree.
         * @memberof Tile.prototype
         * @type {QuadtreeTile[]}
         */
        children : {
            get : function() {
                if (!defined(this._children)) {
                    var tilingScheme = this.tilingScheme;
                    var level = this.level + 1;
                    var x = this.x * 2;
                    var y = this.y * 2;
                    this._children = [new QuadtreeTile({
                        tilingScheme : tilingScheme,
                        x : x,
                        y : y,
                        level : level,
                        parent : this
                    }), new QuadtreeTile({
                        tilingScheme : tilingScheme,
                        x : x + 1,
                        y : y,
                        level : level,
                        parent : this
                    }), new QuadtreeTile({
                        tilingScheme : tilingScheme,
                        x : x,
                        y : y + 1,
                        level : level,
                        parent : this
                    }), new QuadtreeTile({
                        tilingScheme : tilingScheme,
                        x : x + 1,
                        y : y + 1,
                        level : level,
                        parent : this
                    })];
                }

                return this._children;
            }
        },

        needsLoading : {
            get : function() {
                return this.state.value < QuadtreeTileState.READY.value;
            }
        }
    });

    QuadtreeTile.prototype.freeResources = function() {
        this.state = QuadtreeTileState.START;
        this.renderable = false;
        this.upsampledFromParent = false;

        if (defined(this.data) && defined(this.data.freeResources)) {
            this.data.freeResources();
        }

        if (defined(this._children)) {
            for (var i = 0, len = this._children.length; i < len; ++i) {
                this._children[i].freeResources();
            }
            this._children = undefined;
        }
    };

    return QuadtreeTile;
});
