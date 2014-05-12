/*global define*/
define([
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError'
    ], function(
        defined,
        defineProperties,
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

        this._children = undefined;

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
         * @type {QuadtreeTile}
         */
        this.parent = description.parent;

        /**
         * The cartographic rectangle of the tile, with north, south, east and
         * west properties in radians.
         * @type {Rectangle}
         */
        this.rectangle = this.tilingScheme.tileXYToRectangle(this.x, this.y, this.level);

        /**
         * The previous tile in the {@link TileReplacementQueue}.
         * @type {QuadtreeTile}
         * @default undefined
         */
        this.replacementPrevious = undefined;

        /**
         * The next tile in the {@link TileReplacementQueue}.
         * @type {QuadtreeTile}
         * @default undefined
         */
        this.replacementNext = undefined;

        /**
         * Additional data associated with this tile.  The exact content is specific to the
         * {@link QuadtreeTileProvider}.
         * @type {Object}
         * @default undefined
         */
        this.data = undefined;
    };

    defineProperties(QuadtreeTile.prototype, {
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
        }
    });

    return QuadtreeTile;
});
