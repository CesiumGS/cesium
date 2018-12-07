define([
        '../Core/Intersect',
        '../Core/ManagedArray',
        './Cesium3DTileRefine'
    ], function(
        Intersect,
        ManagedArray,
        Cesium3DTileRefine) {
    'use strict';

    /**
     * Traversal that loads all leaves that intersect the camera frustum.
     * Used to determine ray-tileset intersections during a pickFromRayMostDetailed call.
     *
     * @private
     */
    function Cesium3DTilesetAsyncTraversal() {
    }

    var asyncTraversal = {
        stack : new ManagedArray(),
        stackMaximumLength : 0
    };

    Cesium3DTilesetAsyncTraversal.selectTiles = function(tileset, frameState) {
        tileset._selectedTiles.length = 0;
        tileset._requestedTiles.length = 0;
        tileset._hasMixedContent = false;

        var ready = true;

        var root = tileset.root;
        root.updateVisibility(frameState);

        if (!isVisible(root)) {
            return ready;
        }

        var stack = asyncTraversal.stack;
        stack.push(tileset.root);

        while (stack.length > 0) {
            asyncTraversal.stackMaximumLength = Math.max(asyncTraversal.stackMaximumLength, stack.length);

            var tile = stack.pop();
            var add = (tile.refine === Cesium3DTileRefine.ADD);
            var replace = (tile.refine === Cesium3DTileRefine.REPLACE);
            var traverse = canTraverse(tileset, tile);

            if (traverse) {
                updateAndPushChildren(tileset, tile, stack, frameState);
            }

            if (add || (replace && !traverse)) {
                loadTile(tileset, tile);
                selectDesiredTile(tileset, tile, frameState);

                if (!hasEmptyContent(tile) && !tile.contentAvailable) {
                    ready = false;
                }
            }

            visitTile(tileset);
            touchTile(tileset, tile);
        }

        asyncTraversal.stack.trim(asyncTraversal.stackMaximumLength);

        return ready;
    };

    function isVisible(tile) {
        return tile._visible && tile._inRequestVolume;
    }

    function hasEmptyContent(tile) {
        return tile.hasEmptyContent || tile.hasTilesetContent;
    }

    function hasUnloadedContent(tile) {
        return !hasEmptyContent(tile) && tile.contentUnloaded;
    }

    function canTraverse(tileset, tile) {
        if (tile.children.length === 0) {
            return false;
        }

        if (tile.hasTilesetContent) {
            // Traverse external tileset to visit its root tile
            // Don't traverse if the subtree is expired because it will be destroyed
            return !tile.contentExpired;
        }

        if (tile.hasEmptyContent) {
            return true;
        }

        return true; // Keep traversing until a leave is hit
    }

    function updateAndPushChildren(tileset, tile, stack, frameState) {
        var children = tile.children;
        var length = children.length;

        for (var i = 0; i < length; ++i) {
            var child = children[i];
            child.updateVisibility(frameState);
            if (isVisible(child)) {
                stack.push(child);
            }
        }
    }

    function loadTile(tileset, tile) {
        if (hasUnloadedContent(tile) || tile.contentExpired) {
            tile._priority = 0.0; // Highest priority
            tileset._requestedTiles.push(tile);
        }
    }

    function touchTile(tileset, tile) {
        tileset._cache.touch(tile);
    }

    function visitTile(tileset) {
        ++tileset.statistics.visited;
    }

    function selectDesiredTile(tileset, tile, frameState) {
        if (tile.contentAvailable && (tile.contentVisibility(frameState) !== Intersect.OUTSIDE)) {
            tileset._selectedTiles.push(tile);
        }
    }

    return Cesium3DTilesetAsyncTraversal;
});
