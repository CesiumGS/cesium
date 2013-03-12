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

    function linstep(mn, mx, val) {
        return (val - mn) / (mx - mn);
    }

    function lerp(x, y, a) {
        return x * (1.0 - a) + y * a;
    }

    function getHeight(vertData, vertId) {
        // Extract the height data
        return vertData[vertId * 6 + 3];
    }

    function TerrainSampler(terrainProvider, context, tileCount, maxRetries) {
        this.terrainProvider = terrainProvider;
        this.receivedTileCount = 0;
        this.transformedTileCount = 0;
        this.context = context;
        this.retries = 10 * tileCount;
        this.tileCount = tileCount;
        this.tilesRemaining = tileCount;
        this.deferred = when.defer();
        this.success = true;
    }

    TerrainSampler.prototype.requestTile = function(tileRequest) {
        var tileTerrain = new TileTerrain();
        this.stateMachine(tileRequest, tileTerrain, this);
    };

    TerrainSampler.prototype.stateMachine = function(tileRequest, tileTerrain, that) {
        var tile = tileRequest.tile;
        tileTerrain.processLoadStateMachine(that.context, that.terrainProvider, tile.x, tile.y, tile.level);

        if (tileTerrain.state === TerrainState.READY) {
            // The tile is ready, we can now interpolate...
            that.interpolate(tileRequest, tileTerrain, that);
            return;
        }
        if (tileTerrain.state === TerrainState.FAILED) {
            // Fail this request
            --that.tilesRemaining;
            return;
        }
        if (tileTerrain.state === TerrainState.UNLOADED) {
            --that.retries;
            if (that.retries < 0) {
                // If retries used up then fail this request
                --that.tilesRemaining;
                return;
            }
        }
        setTimeout(that.stateMachine, 250 * (0.5 + 0.5 * Math.random()), tileRequest, tileTerrain, that);
    };

    TerrainSampler.prototype.interpolate = function(tileRequest, tileTerrain, that) {
        var tile = tileRequest.tile;

        var vertData = tileTerrain.mesh.vertices;
        var vertCount = vertData.length / 6;

        // now interpolate verts
        // remembering 1 pixel skirt
        var dim = Math.sqrt(vertCount);
        var tilePts = tileRequest.pts;
        var tileExtent = tile.extent;

        // for each point that falls in this tile
        for ( var j = 0; j < tilePts.length; ++j) {
            var pt = tilePts[j];

            // Determine location of point in tile
            // todo: is this bad? Should TilingScheme or specific
            // TerrainProvider be doing this?
            var a = linstep(tileExtent.west, tileExtent.east, pt.longitude);
            var b = 1.0 - linstep(tileExtent.south, tileExtent.north, pt.latitude);

            // Now bilinear interpolate
            var ai = a * (dim - 3) + 1;
            var ai0 = Math.floor(ai);
            var ai1 = ai0 + 1;
            var ar = ai - ai0;

            var bi = b * (dim - 3) + 1;
            var bi0 = Math.floor(bi);
            var bi1 = bi0 + 1;
            var br = bi - bi0;

            // Vert indices
            var v0 = bi0 * dim + ai0;
            var v1 = bi0 * dim + ai1;
            var v2 = bi1 * dim + ai0;
            var v3 = bi1 * dim + ai1;

            // Vert heights
            var h0 = getHeight(vertData, v0);
            var h1 = getHeight(vertData, v1);
            var h2 = getHeight(vertData, v2);
            var h3 = getHeight(vertData, v3);

            // Final bilinear blend
            pt.height = lerp(lerp(h0, h1, ar), lerp(h2, h3, ar), br);
        }
        --that.tilesRemaining;
        if (that.tilesRemaining === 0) {
            that.deferred.resolve();
        }
    };

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
                        requestRetries : 0,
                        transformRetries : 0,
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

        // A unique sampler for this terrainSample() request
        var terrainSampler = new TerrainSampler(terrainProvider, context, tileRequests.length);

        // Send request for each required tile
        for (i = 0; i < tileRequests.length; ++i) {
            var tileRequest = tileRequests[i];
            var tile = new Tile(tileRequest);

            // Store the tile in the tileRequest
            tileRequest.tile = tile;
            tile.state = TileState.TRANSITIONING;
            terrainSampler.requestTile(tileRequest);
        }

        return terrainSampler.deferred.promise;
    };

    return terrainSample;
});
