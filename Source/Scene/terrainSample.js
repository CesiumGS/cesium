/*global define*/
define([
        '../Core/defaultValue',
        '../Core/DeveloperError',
        './TerrainState',
        './Tile',
        './TileState',
        './TileTerrain',
        '../ThirdParty/when'
    ], function(
        defaultValue,
        DeveloperError,
        TerrainState,
        Tile,
        TileState,
        TileTerrain,
        when) {
    "use strict";

    /**
     * Provides an elevation query for an array of Cartographic points by
     * requesting tiles from a terrain provider, sampling and interpolating.
     * Each point height is modified in place.
     */
    var terrainSample = function(terrainProvider, level, context, pts) {
        level = defaultValue(level, 2);

        var tilingScheme = terrainProvider.getTilingScheme();

        var i;

        // Sort points into a set of tiles
        var tileRequests = []; // Result will be an Array as it's easier to work with
        {
            var tileRequestSet = {}; // A unique set
            for (i = 0; i < pts.length; ++i) {
                var xy = tilingScheme.positionToTileXY(pts[i], level);
                var key = xy.toString();

                if (!tileRequestSet.hasOwnProperty(key)) {
                    // When tile is requested for the first time
                    var value = {
                        x : xy.x,
                        y : xy.y,
                        level : level,
                        tilingScheme : tilingScheme,
                        terrainProvider : terrainProvider,
                        pts : []
                    };
                    tileRequestSet[key] = value;
                    tileRequests.push(value);
                }

                // Now append to array of points for the tile
                tileRequestSet[key].pts.push(pts[i]);
            }
        }

        // Send request for each required tile
        var tilePromises = [];
        for (i = 0; i < tileRequests.length; ++i) {
            var tileRequest = tileRequests[i];
            var requestPromise = tileRequest.terrainProvider.requestTileGeometry(tileRequest.x, tileRequest.y, tileRequest.level, false);
            var tilePromise = when(requestPromise, createInterpolateFunction(tileRequest), createMarkFailedFunction(tileRequest));
            tilePromises.push(tilePromise);
        }

        return when.all(tilePromises);
    };

    function createInterpolateFunction(tileRequest) {
        var tilePts = tileRequest.pts;
        var extent = tileRequest.tilingScheme.tileXYToExtent(tileRequest.x, tileRequest.y, tileRequest.level);
        return function(terrainData) {
            // for each point that falls in this tile
            for (var j = 0; j < tilePts.length; ++j) {
                var pt = tilePts[j];
                pt.height = terrainData.interpolateHeight(extent, pt.longitude, pt.latitude);
            }
        };
    }

    function createMarkFailedFunction(tileRequest) {
        var tilePts = tileRequest.pts;
        return function() {
            // for each point that falls in this tile
            for (var j = 0; j < tilePts.length; ++j) {
                var pt = tilePts[j];
                pt.height = undefined;
            }
        };
    }

    return terrainSample;
});
