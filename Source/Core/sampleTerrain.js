import when from '../ThirdParty/when.js';
import Check from './Check.js';

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
     * words, it will not necessarily be 0.0 if sampled in the ocean. This function needs the
     * terrain level of detail as input, if you need to get the altitude of the terrain as precisely
     * as possible (i.e. with maximum level of detail) use {@link sampleTerrainMostDetailed}.
     *
     * @exports sampleTerrain
     *
     * @param {TerrainProvider} terrainProvider The terrain provider from which to query heights.
     * @param {Number} level The terrain level-of-detail from which to query terrain heights.
     * @param {Cartographic[]} positions The positions to update with terrain heights.
     * @returns {Promise.<Cartographic[]>} A promise that resolves to the provided list of positions when terrain the query has completed.
     *
     * @see sampleTerrainMostDetailed
     *
     * @example
     * // Query the terrain height of two Cartographic positions
     * var terrainProvider = Cesium.createWorldTerrain();
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
    function sampleTerrain(terrainProvider, level, positions) {
        //>>includeStart('debug', pragmas.debug);
        Check.typeOf.object('terrainProvider', terrainProvider);
        Check.typeOf.number('level', level);
        Check.defined('positions', positions);
        //>>includeEnd('debug');

        return terrainProvider.readyPromise.then(function() { return doSampling(terrainProvider, level, positions); });
    }

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
            var requestPromise = tileRequest.terrainProvider.requestTileGeometry(tileRequest.x, tileRequest.y, tileRequest.level);
            var tilePromise = requestPromise
                .then(createInterpolateFunction(tileRequest))
                .otherwise(createMarkFailedFunction(tileRequest));
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
export default sampleTerrain;
