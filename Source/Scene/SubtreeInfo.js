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

    /**
     * A subtree wrapper. For use in a SubtreeCache. Couldn't just do map of subtrees in Cesium3dTilesetImplicit because that's not aysnc agnostic.
     *
     * @alias SubtreeInfo
     * @constructor
     */
    function SubtreeInfo(tileset, subtree, subtreeRootKey) {
        this._tileset = tileset;
        this._subtree = subtree;
        this._subtreeRootKey = subtreeRootKey;
        // uri is isOct ? level + '/' + z + '/'+ x + '/' + y : level + '/' + x + '/' + y;
        this._subtreeRootKeyString = subtreeRootKey.w + '/' +  subtreeRootKey.x + '/' + subtreeRootKey.y + '/' + subtreeRootKey.z;
        this._subtreesIndexMap = undefined;
        this._subtrees = undefined;
        init();

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
    SubtreeInfo._deprecationWarning = deprecationWarning;

    defineProperties(SubtreeInfo.prototype, {
        // /**
        //  * Gets or sets the tile's highlight color.
        //  *
        //  * @memberof SubtreeInfo.prototype
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
    SubtreeInfo.prototype.init = function() {
        // Early exit if subtree last level matches tree last level
        var subtreeRootKey = this._subtreeRootKey;
        var tileset = this._tileset;
        var tilingScheme = tileset._tilingScheme;
        var subtreeLevels = tilingScheme.subtreeLevels;
        var lastTreeLevel1Indexed = tilingScheme.lastLevel;
        var subtreeLastTreeLevel1Indexed = subtreeRootKey.w + subtreeLevels;
        if (subtreeLastTreeLevel1Indexed === lastTreeLevel1Indexed) {
            // No subtrees beyond us
            return;
        }

        var lastLevelOffsetIndex = subtreeLevels - 1;
        var sizesArray = tileset._unpackedArraySizes;
        var lastLevelOffset = sizesArray[lastLevelOffsetIndex];
        var numTilesOnLastLevel = sizesArray[subtreeLevels] - lastLevelOffset;

        var nextIdx = 0;
        var array = [];
        var map = new Map();
        var i, result, keyString, subtreeIndex, treeKey,
        var subtree = this._subtree;
        for (i = 0; i < numTilesOnLastLevel; i++) {
            subtreeIndex = i + lastLevelOffset;
            if (subtree[i + lastLevelOffset] === 1) {
                array.push(undefined); // alloc enough slots for all the subtrees
                // TODO: migrate the subtree related key/index conversions here?
                // Convert index to key string, add key to map
                result = tileset.getSubtreeInfoFromSubtreeIndexAndRootKey(subtreeIndex, subtreeRootKey);
                treeKey = result.treeKey;
                keyString = treeKey.w + '/' + treeKey.x + '/' + treeKey.y + '/' + treeKey.z;
                map.set(keyString, nextIdx++);
            }
        }

        this._subtreesIndexMap = map;
        this._subtrees = array;
    };

    /**
     * Adds a subtree
     *
     * @param {Cartesian4} subtreeRootKey The tree key of the root of the subtree
     * @returns {SubtreeInfo} The SubtreeInfo whose root matches the key
     * @private
     */
    SubtreeInfo.prototype.findParent = function(subtreeRootKey, subtreeRootKeyString) {
        if ((this._subtreeRootKey.w + this._tileset._tilingScheme.subtreeLevels - 1) === subtreeRootKey.w) {
            return this;
        }
        // Find the closests key that subtreeRootkey resolves to on this subtrees last level
    };

    /**
     * Adds a subtree
     *
     * @param {Cartesian4} subtreeRootKey The tree key of the root of the subtree
     * @returns {SubtreeInfo} The SubtreeInfo whose root matches the key
     * @private
     */
    SubtreeInfo.prototype.set = function(subtree, subtreeRootKey) {
        var subtreeRootKeyString = subtreeRootKey.w + '/' +  subtreeRootKey.x + '/' + subtreeRootKey.y + '/' + subtreeRootKey.z;
        var parent = this.findParent(subtreeRootKey, subtreeRootKeyString);
        if (!defined(parent)) {
            throw new DeveloperError('No parent subtree found in subtree cache.');
        }

        var parentMap = parent._subtreesIndexMap;
        if (!defined(parentMap)) {
            throw new DeveloperError('parent subtree index map is undefined');
        }

        if (!parentMap.has(subtreeRootKeyString)) {
            throw new DeveloperError('No key found for subtree in parent map.');
        }

        var i = parentMap.get(subtreeRootKeyString);
        var parentSubtrees = parent._subtrees;
        if (!defined(parentSubtrees)) {
            throw new DeveloperError('parent SubtreeInfo array is undefined');
        }

        if (defined(parentSubtrees[i])) {
            throw new DeveloperError('Subtree info for parent already exists.');
        }

        var subtreeInfo = new SubtreeInfo(this._tileset, subtree, subtreeRootKey);

        parentSubtrees[i] = subtreeInfo;

        return subtreeInfo;
    };

    /**
     * Gets the subtree with the specified root key from the cache
     *
     * @param {String} subtreeRootKey The tree key string of the root of the subtree
     * @returns {SubtreeInfo} The SubtreeInfo whose root matches the key
     * @private
     */
    SubtreeInfo.prototype.get = function(subtreeRootKey, subtreeRootKeyString) {
        var parent = this.findParent(subtreeRootKey, subtreeRootKeyString);
        if (!defined(parent)) {
            return undefined;
        }

        var parentMap = parent._subtreesIndexMap;
        var parentSubtrees = parent._subtrees;
        if (!defined(parentMap) || !parentMap.has(subtreeRootKeyString) || !defined(parentSubtrees)) {
            return undefined;
        }

        var i = parentMap.get(subtreeRootKeyString);
        return parentSubtrees[i];
    };

    /**
     * @private
     */
    SubtreeInfo.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * @private
     */
    SubtreeInfo.prototype.destroy = function() {
        // For the interval between new content being requested and downloaded, expiredContent === content, so don't destroy twice
        // return destroyObject(this);
    };

    return SubtreeInfo;
});
