/*global define*/
define([
        '../Core/defined',
        '../Core/DeveloperError'
    ], function(
        defined,
        DeveloperError) {
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

        /**
         * The tiling scheme used to tile the surface.
         * @type {TilingScheme}
         */
        this.tilingScheme = description.tilingScheme;

        /**
         * The x coordinate.
         * @type {Number}
         */
        this.x = description.x;

        /**
         * The y coordinate.
         * @type {Number}
         */
        this.y = description.y;

        /**
         * The level-of-detail, where zero is the coarsest, least-detailed.
         * @type {Number}
         */
        this.level = description.level;

        /**
         * The parent of this tile in a tiling scheme.
         * @type {Tile}
         */
        this.parent = description.parent;

        /**
         * The children of this tile in a tiling scheme.
         * @type {Array}
         * @default undefined
         */
        this.children = undefined;

        /**
         * The cartographic extent of the tile, with north, south, east and
         * west properties in radians.
         * @type {Extent}
         */
        this.extent = this.tilingScheme.tileXYToRectangle(this.x, this.y, this.level);

        /**
         * The previous tile in the {@link TileReplacementQueue}.
         * @type {Tile}
         * @default undefined
         */
        this.replacementPrevious = undefined;

        /**
         * The next tile in the {@link TileReplacementQueue}.
         * @type {Tile}
         * @default undefined
         */
        this.replacementNext = undefined;
    };

    /**
     * Returns an array of tiles that are at the next level of the tile tree.
     *
     * @memberof QuadtreeTile
     *
     * @returns {Array} The list of child tiles.
     */
    QuadtreeTile.prototype.getChildren = function() {
        if (!defined(this.children)) {
            var tilingScheme = this.tilingScheme;
            var level = this.level + 1;
            var x = this.x * 2;
            var y = this.y * 2;
            this.children = [new QuadtreeTile({
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

        return this.children;
    };

    return QuadtreeTile;
});
