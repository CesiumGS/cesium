define([
        '../Core/Cartesian4',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/deprecationWarning',
        '../Core/destroyObject',
        '../Core/JulianDate',
        '../Core/Math',
        '../Core/RuntimeError',
        '../ThirdParty/when'
    ], function(
        Cartesian4,
        defaultValue,
        defined,
        defineProperties,
        deprecationWarning,
        destroyObject,
        JulianDate,
        CesiumMath,
        RuntimeError,
        when) {
    'use strict';


    function SubtreeInfo(subtree, numTilesOnLastLevel) {
        this._subtree = subtree;
        this._numTilesOnLastLevel = numTilesOnLastLevel;
        this._lastLevelTilesIndexMap = new Map();
        this._lastLevelTiles = [];

        var i;
        var array = this._lastLevelTiles;
        for (i = 0; i < numTilesOnLastLevel; i++) {
            array.push(undefined);
        }
    }

    /**
     * A tile in a {@link Cesium3DTilesetImplicit}.  When a tile is first created, its content is not loaded;
     * the content is loaded on-demand when needed based on the view.
     * <p>
     * Do not construct this directly, instead access tiles through {@link Cesium3DTilesetImplicit#tileVisible}.
     * </p>
     *
     * @alias SubtreeCache
     * @constructor
     */
    function SubtreeCache(tileset) {
        this.tileset = tileset;
        this.subtreeRootInfo = undefined;

        // /**
        //  * When <code>true</code>, the tile has no content.
        //  *
        //  * @type {Boolean}
        //  * @readonly
        //  *
        //  * @private
        //  */
        // this.hasEmptyContent = hasEmptyContent;
        //
        // /**
        //  * The node in the tileset's LRU cache, used to determine when to unload a tile's content.
        //  *
        //  * See {@link Cesium3DTilesetCache}
        //  *
        //  * @type {DoublyLinkedListNode}
        //  * @readonly
        //  *
        //  * @private
        //  */
        // this.cacheNode = undefined;
        //
        // /**
        //  * The time in seconds after the tile's content is ready when the content expires and new content is requested.
        //  *
        //  * @type {Number}
        //  */
        // this.expireDuration = expireDuration;
    }

    // This can be overridden for testing purposes
    SubtreeCache._deprecationWarning = deprecationWarning;

    defineProperties(SubtreeCache.prototype, {
        // /**
        //  * Gets or sets the tile's highlight color.
        //  *
        //  * @memberof SubtreeCache.prototype
        //  *
        //  * @type {Color}
        //  *
        //  * @default {@link Color.WHITE}
        //  *
        //  * @private
        //  */
        // subtreeRoot : {
        //     get : function() {
        //         if (!defined(this._subtreeRoot)) {
        //             this._color = new Color();
        //         }
        //         return Color.clone(this._color);
        //     },
        //     set : function(value) {
        //         this._color = Color.clone(value, this._color);
        //         this._colorDirty = true;
        //     }
        // },
    });

    // var scratchCartesian = new Cartesian4();

    /**
     * Adds the subtree to the subtree cache
     *
     * @param {UintArray8} subtree The subtree byte array to add
     * @param {Cartesian4} subtreeRootKey The tree key of the root of the subtree
     * @private
     */
    SubtreeCache.prototype.set = function(subtree, subtreeRootKey) {
        var rootSubtreeInfo = 
        if (thi)

    };

    /**
     * Gets the subtree with the specified root key from the cache
     *
     * @param {Cartesian4} subtreeRootKey The tree key of the root of the subtree
     * @returns {Uint8Array} The subtree byte array whose root matches the key
     * @private
     */
    SubtreeCache.prototype.get = function(subtreeRootKey) {
        // Dig around for it, if not there then return undefined

        return undefined;
    };


    /**
     * @private
     */
    SubtreeCache.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * @private
     */
    SubtreeCache.prototype.destroy = function() {
        // For the interval between new content being requested and downloaded, expiredContent === content, so don't destroy twice
        // return destroyObject(this);
    };

    return SubtreeCache;
});
