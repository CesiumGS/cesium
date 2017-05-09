/*global define*/
define([
        '../Core/defined',
        './Cesium3DTileContentState',
        './CullingVolume'
    ], function(
        defined,
        Cesium3DTileContentState,
        CullingVolume) {
    'use strict';

    /**
     * @private
     */
    function Cesium3DTilesetProcessor() { }

    Cesium3DTilesetProcessor.processTiles = function(tileset, frameState) {
        var tiles = tileset._processingHeap;
        var length = tiles.length;

        var i, tile;

        var start = Date.now();
        var timeSlice = 15;

        // recompute visibility in case these are old tiles
        for (i = 0; i < length; ++i) {
            tile = tiles.data[i];
            if (tile._lastVisitedFrame !== frameState.frameNumber - 1) {
                tile.visibilityPlaneMask = tile.visibility(frameState, CullingVolume.MASK_INDETERMINATE);
            }
        }

        // resize and resort
        tiles.reserve();
        tiles.buildHeap(tiles.data);

        var internalLength = tiles.data.length;
        var popCount = 0;

        while(tiles.length > 0 && Date.now() - start <= timeSlice) {
            // pop tiles and move them to the back of the array
            tile = tiles.pop();
            tiles.data[internalLength - ++popCount] = tile;
            tile.process(tileset, frameState);
        }

        // insert any tiles still processing back into the processing heap
        for (i = internalLength - popCount; i < internalLength; ++i) {
            var tile = tiles.data[i];
            tiles.data[i] = undefined;
            if (tile.contentProcessing) {
                tiles.insert(tile);
            }
        }
    };

    Cesium3DTilesetProcessor.requestContent = function(tileset, tile, outOfCore) {
        if (!outOfCore) {
            return;
        }

        if (tile.hasEmptyContent) {
            return;
        }

        var stats = tileset._statistics;

        var requested = tile.requestContent();

        if (!requested) {
            ++stats.numberOfAttemptedRequests;
            return;
        }

        tileset._requestingTiles.push(tile);

        ++stats.numberOfPendingRequests;

        var removeFunction = removeFromProcessingQueue(tileset, tile);
        tile.contentReadyToProcessPromise.then(addToProcessingQueue(tileset, tile));
        tile.contentReadyPromise.then(removeFunction).otherwise(removeFunction);
    }

    Cesium3DTilesetProcessor.updateRequestingTiles = function(tileset, frameState) {
        var tiles = tileset._requestingTiles.internalArray;
        var length = tileset._requestingTiles.length;
        var undefinedCount = 0;
        // Stream compact the array. Tiles that are done have been set to undefined. Update any tiles still requesting
        for (var i = 0; i < length; ++i) {
            var tile = tiles[i];
            if (!defined(tile)) {
                ++undefinedCount;
                continue;
            } else if (!defined(tile._request)) {
                tiles[i] = undefined;
                ++undefinedCount;
                continue;
            }

            if (undefinedCount > 0) {
                tiles[i - undefinedCount] = tile;
            }

            if (tile._lastVisitedFrame !== frameState.frameNumber) {
                // this tile was not seen this frame. cancel the request
                --tileset._statistics.numberOfPendingRequests;
                tile._request.cancel();
                tile.unloadContent();
                tile._contentState = Cesium3DTileContentState.UNLOADED;
                tile._contentReadyToProcessPromise = undefined;
                tile._contentReadyPromise = undefined;
                tile._request = undefined;
                tiles[i] = undefined;
                ++undefinedCount
                continue;
            }

            // update parameters for request sorting
            tile._request.screenSpaceError = tile._screenSpaceError;
            tile._request.distance = tile.distanceToCamera;
        }
        tileset._requestingTiles.length -= undefinedCount;
        tileset._requestingTiles.trim();
    }

    function addToProcessingQueue(tileset, tile) {
        return function() {
            var index = tileset._requestingTiles.internalArray.indexOf(tile);
            if (index >= 0) {
                // just mark as undefined to avoid too many memory operations. Stream compact later.
                tileset._requestingTiles.internalArray[index] = undefined;
            }

            tileset._processingHeap.insert(tile);

            --tileset._statistics.numberOfPendingRequests;
            ++tileset._statistics.numberProcessing;
        };
    }

    function removeFromProcessingQueue(tileset, tile) {
        return function(e) {
            var index = tileset._processingHeap.data.indexOf(tile);
            if (index >= 0) {
                // Remove from processing queue. processTiles may have already removed the tile.
                if (index < tileset._processingHeap.length) {
                    tileset._processingHeap.pop(index);
                }

                --tileset._statistics.numberProcessing;
                if (tile.hasRenderableContent) {
                    // RESEARCH_IDEA: ability to unload tiles (without content) for an
                    // external tileset when all the tiles are unloaded.
                    ++tileset._statistics.numberContentReady;
                    // incrementPointAndFeatureLoadCounts(tileset, tile.content);
                    tile.replacementNode = tileset._replacementList.add(tile);
                }
            } else {
                // Not in processing queue
                // For example, when a url request fails and the ready promise is rejected
                --tileset._statistics.numberOfPendingRequests;
            }
        };
    }

    return Cesium3DTilesetProcessor;
});