/*global define*/
define([
        '../ThirdParty/when',
        './defined',
        './DeveloperError'
    ], function(
        when,
        defined,
        DeveloperError) {
    "use strict";

    /**
     * Initiates a terrain height query for an array of {@link Cartographic} positions by
     * requesting tiles from a terrain provider, sampling, and interpolating.  The interpolation
     * matches the triangles used to render the terrain at the specified level.  The query
     * happens asynchronously, so this function returns a promise that is resolved when
     * the query completes.  Each point height is modified in place.  If a height can not be
     * determined because no terrain data is available for the specified level at that location,
     * or another error occurs, the height is set to undefined.  As is typical of the
     * {@link Cartographic} type, the supplied height is a height above the reference ellipsoid
     * (such as {@link Ellipsoid.WGS84}) rather than an altitude above mean sea level.  In other
     * words, it will not necessarily be 0.0 if sampled in the ocean.
     *
     * @exports sampleTerrain
     *
     * @param {TerrainProvider} terrainProvider The terrain provider from which to query heights.
     * @param {Number} level The terrain level-of-detail from which to query terrain heights.
     * @param {Cartographic[]} positions The positions to update with terrain heights.
     * @returns {Promise} A promise that resolves to the provided list of positions when terrain the query has completed.
     *
     * @example
     * // Query the terrain height of two Cartographic positions
     * var terrainProvider = new Cesium.CesiumTerrainProvider({
     *     url : '//assets.agi.com/stk-terrain/world'
     * });
     * var positions = [
     *     Cesium.Cartographic.fromDegrees(86.925145, 27.988257),
     *     Cesium.Cartographic.fromDegrees(87.0, 28.0)
     * ];
     * var promise = Cesium.sampleTerrain(terrainProvider, 11, positions);
     * Cesium.when(promise, function(updatedPositions) {
     *     // positions[0].height and positions[1].height have been updated.
     *     // updatedPositions is just a reference to positions.
     * });
     */
    var sampleTerrain = function(terrainProvider, level, positions) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(terrainProvider)) {
            throw new DeveloperError('terrainProvider is required.');
        }
        if (!defined(level)) {
            throw new DeveloperError('level is required.');
        }
        if (!defined(positions)) {
            throw new DeveloperError('positions is required.');
        }
        //>>includeEnd('debug');

        var deferred = when.defer();

        function doSamplingWhenReady() {
            if (terrainProvider.ready) {
                when(doSampling(terrainProvider, level, positions), function(updatedPositions) {
                    deferred.resolve(updatedPositions);
                });
            } else {
                setTimeout(doSamplingWhenReady, 10);
            }
        }

        doSamplingWhenReady();

        return deferred.promise;
    };

    function doSampling(terrainProvider, level, positions) {
        var tilingScheme = terrainProvider.tilingScheme;

        var i;

        // Sort points into a set of tiles
        var tileRequests = []; // Result will be an Array as it's easier to work with
        var tileRequestSet = {}; // A unique set
        for (i = 0; i < positions.length; ++i) {
            var xy = tilingScheme.positionToTileXY(positions[i], level);
            var key = xy.toString();

            if (!tileRequestSet.hasOwnProperty(key)) {
                // When tile is requested for the first time
                var value = {
                    x : xy.x,
                    y : xy.y,
                    level : level,
                    tilingScheme : tilingScheme,
                    terrainProvider : terrainProvider,
                    positions : []
                };
                tileRequestSet[key] = value;
                tileRequests.push(value);
            }

            // Now append to array of points for the tile
            tileRequestSet[key].positions.push(positions[i]);
        }

        // Send request for each required tile
        var tilePromises = [];
        for (i = 0; i < tileRequests.length; ++i) {
            var tileRequest = tileRequests[i];
            var requestPromise = tileRequest.terrainProvider.requestTileGeometry(tileRequest.x, tileRequest.y, tileRequest.level, false);
            var tilePromise = when(requestPromise, createInterpolateFunction(tileRequest), createMarkFailedFunction(tileRequest));
            tilePromises.push(tilePromise);
        }

        return when.all(tilePromises, function() {
            return positions;
        });
    }

    function createInterpolateFunction(tileRequest) {
        var tilePositions = tileRequest.positions;
        var rectangle = tileRequest.tilingScheme.tileXYToRectangle(tileRequest.x, tileRequest.y, tileRequest.level);
        return function(terrainData) {
            for (var i = 0; i < tilePositions.length; ++i) {
                var position = tilePositions[i];
                position.height = terrainData.interpolateHeight(rectangle, position.longitude, position.latitude);
            }
        };
    }

    function createMarkFailedFunction(tileRequest) {
        var tilePositions = tileRequest.positions;
        return function() {
            for (var i = 0; i < tilePositions.length; ++i) {
                var position = tilePositions[i];
                position.height = undefined;
            }
        };
    }

    return sampleTerrain;
});
