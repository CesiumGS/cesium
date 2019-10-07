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
        this._subtree = subtree; // uin8array of 1 or 0 at each index
        this._tiles = undefined; // similiar to _subtree but undefined or instanceof implicit tile at each index
        this._subtreesMap = undefined;
        this._subtreeLastTreeLevel0Indexed = -1;

        // TODO: keys not needed
        this._subtreeRootKeyString = undefined;
        this._subtreeRootKey = subtreeRootKey;

        if (!defined(this._subtree)) {
            this.initRoot();
        } else {
            this.init();
        }
    }

    defineProperties(SubtreeInfo.prototype, {
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

        var map = new Map();
        var i, keyString, treeKey;
        var rootsLength = roots.length;
        for (i = 0; i < rootsLength; i++) {
            treeKey = roots[i];
            keyString = treeKey[0] + '/' + treeKey[1] + '/' + treeKey[2] + '/' + treeKey[3];
            map.set(keyString, undefined);
        }

        this._subtreesMap = map;
        this._subtreeLastTreeLevel0Indexed = roots[0][0];
    };

    /**
     * Given an inclusive level range, return if subtree levels overlap that range.
     *
     * @param {Number} startLevel The min level in the range we care about,
     * @param {Number} endLevel The max level in the range we care about,
     * @returns {Boolean} True if overlaps range, false otherwise.
     * @private
     */
    SubtreeInfo.prototype.inRange = function(startLevel, endLevel) {
        var subtreeStartLevel = this._subtreeRootKey.w;
        var subtreeLevels = this._tileset._tilingScheme.subtreeLevels;
        var subtreeEndLevel = subtreeStartLevel + subtreeLevels - 1;
        // return (subtreeStartLevel >= startLevel && subtreeStartLevel <= endLevel) ||
        //        (subtreeEndLevel >= startLevel && subtreeEndLevel <= endLevel);
        var noOverlap = subtreeStartLevel > endLevel || subtreeEndLevel < startLevel;
        return !noOverlap;

    };

    SubtreeInfo.prototype.hasSubtrees = function() {
        return defined(this._subtreesMap); // this._subtreeLastTreeLevel0Indexed !== this._subtreeRootKey.w;
    };

    /**
     * Given a a tree level, what are the tree index ranges for the level in the subtree
     *
     * @param {Number} treeLevel The tree level we care about.
     * @param {Cartesian3} outMin The output parameter for the min tree range on the level for the subtree.
     * @param {Cartesian3} outMax The output parameter for the max tree range on the level for the subtree.
     * @private
     */
    SubtreeInfo.prototype.treeIndexRangeForTreeLevel = function(treeLevel, outMin, outMax) {
        var subtreeRootKey = this._subtreeRootKey;
        var subtreeRootLevel = subtreeRootKey.w;
        if (treeLevel < subtreeRootLevel) {
            throw new DeveloperError('DEBUG: Level is before root of subtree');
        }

        var subtreeLevel = treeLevel - subtreeRootLevel;
        var subtreeLevels = this._tileset._tilingScheme.subtreeLevels;
        if (subtreeLevel >= subtreeLevels) {
            throw new DeveloperError('DEBUG: Level is after last level of subtree');
        }

        outMin.x = (subtreeRootKey.x << subtreeLevel);
        outMin.y = (subtreeRootKey.y << subtreeLevel);
        outMin.z = (subtreeRootKey.z << subtreeLevel);

        var dimOnLevel = (1 << subtreeLevel);
        var toLastIndex = dimOnLevel - 1;
        outMax.x = outMin.x + toLastIndex;
        outMax.y = outMin.y + toLastIndex;
        outMax.z = outMin.z + toLastIndex;
    };

    SubtreeInfo.prototype.arrayIndexRangeForLevel = function(treeLevel) {
        var subtreeRootLevel = this._subtreeRootKey.w;
        if (treeLevel < subtreeRootLevel) {
            throw new DeveloperError('DEBUG: Level is before root of subtree');
        }

        var subtreeLevel = treeLevel - subtreeRootLevel;
        var subtreeLevels = this._tileset._tilingScheme.subtreeLevels;
        if (subtreeLevel >= subtreeLevels) {
            throw new DeveloperError('DEBUG: Level is after last level of subtree');
        }

        var sizesArray = this._tileset._unpackedArraySizes;
        var levelOffset = sizesArray[subtreeLevel];
        var nextLevelOffset = sizesArray[subtreeLevel + 1];
        return {
            begin: levelOffset,
            end: nextLevelOffset
        };
    };

    /**
     * Given ancestor and descendant tree keys, determine if the descenand is in
     * face a descendant of the ancestor key.
     *
     * @param {Cartesian4} level the tree level for which to filter.
     * @param {Cartesian4} contentStartLevel where the content root starts in the tileset. Needed for a check.
     * @returns {Boolean} True if the descenant key is a descendant of the ancestor key
     */
    SubtreeInfo.isDescendant = function(ancestorTreeIndex, descendantTreeIndex) {
        var levelDiff = descendantTreeIndex.w - ancestorTreeIndex.w;
        if (levelDiff < 0) {
            return false;
        }

        return ancestorTreeIndex.x === (descendantTreeIndex.x >> levelDiff) &&
               ancestorTreeIndex.y === (descendantTreeIndex.y >> levelDiff) &&
               ancestorTreeIndex.z === (descendantTreeIndex.z >> levelDiff);
    };

    /**
     * Given an tree level, return the subset of subtrees in subtrees that overlap this level.
     * Does not include dud subtrees, i.e. subtrees that only have a root (unless it is the  root subtree).
     *
     * @param {Array} subtrees An array of subtreeInfo
     * @param {Number} level the tree level for which to filter.
     * @param {Number} contentStartLevel where the content root starts in the tileset. Needed for a check.
     * @returns {Array} An subset array of the param subtrees
     */
    SubtreeInfo.subtreesContainingLevel = function(subtrees, level, contentStartLevel) {
        var subset = [];
        var i, subtree;
        var length = subtrees.length;
        for (i = 0; i < length; i++) {
            subtree = subtrees[i];

            if (!subtree.inRange(level, level)) {
                continue;
            }

            // Don't take if level is the same as rootkey since the parent subtree will suffice
            // If the parent is not in subtrees, the child won't be either.
            if (level !== contentStartLevel && level === subtree._subtreeRootKey.w) {
                continue;
            }

            subset.push(subtree);
        }
        return subset;
    };

    /**
     * Given an inclusive level range, get all the available subtreeInfos that overlap this range.
     * Does not include dud subtrees, i.e. subtrees that only have a root (unless it is the  root subtree).
     *
     * @param {Number} startLevel The min level.
     * @param {Number} endLevel The max level.
     * @param {Array} minIndicesPerLevel The min xyz indices per level.
     * @param {Array} maxIndicesPerLevel The max xyz indices per level.
     * @returns {Array} An array of subtreeInfo's
     * @private
     */
    SubtreeInfo.prototype.subtreesInRange = function(startLevel, endLevel, minIndicesPerLevel, maxIndicesPerLevel) {
        var subtreesInRange = [];
        var stack = [];
        var contentStartLevel = this._tileset._indicesFinder._startLevel;

        var current;
        var children, key, value, child;
        // Root holds SubtreeInfo's with actual content so push those first then iterate
        children = this._subtreesMap;
        for ([key, child] of children) {
            if (!defined(child)) {
                continue;
            }
            stack.push(child);
        }

        while(stack.length > 0) {
            current = stack.pop();
            if (!current.inRange(startLevel, endLevel)) {
                continue;
            }

            // Don't take if level is the same as rootkey since the parent subtree will suffice
            // If the parent is not in subtrees, the child won't be either.
            if (endLevel !== contentStartLevel && endLevel === current._subtreeRootKey.w) {
                continue;
            }

            // TODO: check if at least one level's inclusive range touches this subtree.
            // if so, push.

            subtreesInRange.push(current);

            if (current._subtreeLastTreeLevel0Indexed > endLevel || !current.hasSubtrees()) {
                continue;
            }

            children = current._subtreesMap;
            for ([key, child] of children) {
                if (!defined(child)) {
                    continue;
                }

                // TODO: only push children in range
                stack.push(child);
            }
        }

        return subtreesInRange;
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
        var i;
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

        var map = new Map();
        var result, keyString, subtreeIndex, treeKey;
        for (i = 0; i < numTilesOnLastLevel; i++) {
            subtreeIndex = i + lastLevelOffset;
            if (subtree[i + lastLevelOffset] === 1) {
                // TODO: migrate the subtree related key/index conversions here?
                // Convert index to key string, add key to map
                result = tileset.getSubtreeInfoFromSubtreeIndexAndRootKey(subtreeIndex, subtreeRootKey);
                treeKey = result.treeKey;
                keyString = treeKey.w + '/' + treeKey.x + '/' + treeKey.y + '/' + treeKey.z;
                map.set(keyString, undefined);
            }
        }

        this._subtreesMap = map;
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

        if (subtreeLastLevel0Indexed === subtreeRootKey.w) {
            if (!this._subtreesMap.has(subtreeRootKeyString)) {
                throw new DeveloperError('Unit subtree in subtreeInfo.');
            }

            return this;
        }

        // Find the treekey on this subtrees lastlevel that subtreeRootKey resolves to on this subtrees last level
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

        var map = this._subtreesMap;
        if (!map.has(resultRootKeyString)) {
            throw new DeveloperError('No key in subtreeInfo index map');
        }

        var ancestor = map.get(resultRootKeyString);

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

        var parentMap = parent._subtreesMap;
        if (!defined(parentMap)) {
            throw new DeveloperError('parent subtree index map is undefined');
        }

        if (defined(parentMap.get(subtreeRootKeyString))) {
            throw new DeveloperError('subtreeInfo already exists in map');
        }

        var subtreeInfo = new SubtreeInfo(this._tileset, subtree, subtreeRootKey);

        parentMap.set(subtreeRootKeyString, subtreeInfo);

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

        var parentMap = parent._subtreesMap;
        if (!defined(parentMap)) {
            return undefined;
        }

        return parentMap.get(subtreeRootKeyString);
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
