define([
        '../Core/Cartesian4',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Core/DeveloperError'
    ], function(
        Cartesian4,
        defaultValue,
        defined,
        defineProperties,
        destroyObject,
        DeveloperError) {
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
        this._tiles = undefined;
        this._subtreeLastTreeLevel0Indexed = -1;
        // uri is isOct ? level + '/' + z + '/'+ x + '/' + y : level + '/' + x + '/' + y;
        // TODO: not needed
        this._subtreeRootKeyString = undefined;
        // TODO: not needed
        this._subtreeRootKey = subtreeRootKey;
        this._subtreesIndexMap = undefined;
        this._subtrees = undefined;

        if (!defined(this._subtree)) {
            this.initRoot();
        } else {
            this.init();
        }

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
    SubtreeInfo.prototype.initRoot = function() {
        // Early exit if subtree last level matches tree last level
        var tileset = this._tileset;
        var tilingScheme = tileset._tilingScheme;
        var roots = tilingScheme.roots;

        var nextIdx = 0;
        var array = [];
        var map = new Map();
        var i, keyString, treeKey;
        var rootsLength = roots.length;
        for (i = 0; i < rootsLength; i++) {
            array.push(undefined); // alloc enough slots for all the roots
            treeKey = roots[i];
            keyString = treeKey[0] + '/' + treeKey[1] + '/' + treeKey[2] + '/' + treeKey[3];
            map.set(keyString, nextIdx++);
        }

        this._subtreesIndexMap = map;
        this._subtrees = array;
        this._subtreeLastTreeLevel0Indexed = roots[0][0];
    };

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
        this._subtreeRootKeyString = subtreeRootKey.w + '/' +  subtreeRootKey.x + '/' + subtreeRootKey.y + '/' + subtreeRootKey.z;
        var tileset = this._tileset;
        var tilingScheme = tileset._tilingScheme;
        var subtreeLevels = tilingScheme.subtreeLevels;
        var lastTreeLevel0Indexed = tilingScheme.lastLevel;

        var sizesArray = tileset._unpackedArraySizes;
        var subtreeSize = sizesArray[subtreeLevels];
        var tilesArray = [];
        for (i = 0; i < subtreeSize; i++) {
            tilesArray.push(undefined);
        }
        this._tiles = tilesArray;

        var subtreeLastTreeLevel0Indexed = subtreeRootKey.w + subtreeLevels - 1;
        if (subtreeLastTreeLevel0Indexed === lastTreeLevel0Indexed) {
            // No subtrees beyond us
            this._subtreeLastTreeLevel0Indexed = subtreeRootKey.w;
            return;
        }

        var subtree = this._subtree;
        if (subtree[0] === 1 && subtree[1] === 0) {
            // Empty subtree
            this._subtreeLastTreeLevel0Indexed = subtreeRootKey.w;
            return;
        }

        var lastLevelOffsetIndex = subtreeLevels - 1;
        var lastLevelOffset = sizesArray[lastLevelOffsetIndex];
        var numTilesOnLastLevel = subtreeSize - lastLevelOffset;

        var nextIdx = 0;
        var array = [];
        var map = new Map();
        var i, result, keyString, subtreeIndex, treeKey;
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
        this._subtreeLastTreeLevel0Indexed = subtreeLastTreeLevel0Indexed;
    };

    /**
     * Adds a subtree
     *
     * @param {Cartesian4} subtreeRootKey The tree key of the root of the subtree
     * @returns {SubtreeInfo} The SubtreeInfo whose root matches the key
     * @private
     */
    SubtreeInfo.prototype.findParent = function(subtreeRootKey, subtreeRootKeyString) {
        var tileset = this._tileset;
        var subtreeLastLevel0Indexed = this._subtreeLastTreeLevel0Indexed;

        if (subtreeLastLevel0Indexed === -1) {
            throw new DeveloperError('Unit subtree in subtreeInfo.');
        }

        var index;
        if (subtreeLastLevel0Indexed === subtreeRootKey.w) {
            if (!this._subtreesIndexMap.has(subtreeRootKeyString)) {
                throw new DeveloperError('Unit subtree in subtreeInfo.');
            }

            // // Root
            // if (!defined(this._subtreeRootKeyString)) {
            //     index = this._subtreesIndexMap.get(subtreeRootKeyString);
            //     return this._subtrees[index];
            // }
            // index = this._subtreesIndexMap.get(subtreeRootKeyString);
            // return this._subtrees[index];

            return this;
        }

        // Find the treekey on this subtrees lastlevel that subtreeRootkey resolves to on this subtrees last level
        var result = tileset.getSubtreeInfoFromTreeKey(subtreeRootKey.x, subtreeRootKey.y, subtreeRootKey.z, subtreeRootKey.w);
        var resultRootKey = result.subtreeRootKey;
        while(resultRootKey.w !== subtreeLastLevel0Indexed) {
            result = tileset.getSubtreeInfoFromTreeKey(
                resultRootKey.x,
                resultRootKey.y,
                resultRootKey.z,
                resultRootKey.w
            );
            resultRootKey = result.subtreeRootKey;
        }

        var resultRootKeyString = resultRootKey.w + '/' + resultRootKey.x + '/' + resultRootKey.y + '/' + resultRootKey.z;

        var map = this._subtreesIndexMap;
        if (!map.has(resultRootKeyString)) {
            throw new DeveloperError('No key in subtreeInfo index map');
        }

        index = map.get(resultRootKeyString);
        var ancestor = this._subtrees[index];

        // if it is undefined return undefined, else recurse
        if (!defined(ancestor)) {
            return undefined;
        }

        return ancestor.findParent(subtreeRootKey, subtreeRootKeyString);
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
     * Gets the subtree with the specified root key from the cache
     *
     * @param {String} subtreeRootKey The tree key string of the root of the subtree
     * @returns {SubtreeInfo} The SubtreeInfo whose root matches the key
     * @private
     */
    SubtreeInfo.prototype.getSubtreeArray = function(subtreeRootKey, subtreeRootKeyString) {
        var parent = this.get(subtreeRootKey, subtreeRootKeyString);
        if (!defined(parent)) {
            return undefined;
        }
        return parent._subtree;
    };

    /**
     * Gets the subtree with the specified root key from the cache
     *
     * @param {String} subtreeRootKey The tree key string of the root of the subtree
     * @returns {SubtreeInfo} The SubtreeInfo whose root matches the key
     * @private
     */
    SubtreeInfo.prototype.has = function(subtreeRootKey, subtreeRootKeyString) {
        var parent = this.get(subtreeRootKey, subtreeRootKeyString);
        return defined(parent);
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
