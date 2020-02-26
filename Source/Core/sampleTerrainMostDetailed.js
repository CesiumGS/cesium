import when from '../ThirdParty/when.js';
import Cartesian2 from './Cartesian2.js';
import defined from './defined.js';
import DeveloperError from './DeveloperError.js';
import sampleTerrain from './sampleTerrain.js';

    var scratchCartesian2 = new Cartesian2();

    /**
     * Initiates a sampleTerrain() request at the maximum available tile level for a terrain dataset.
     *
     * @exports sampleTerrainMostDetailed
     *
     * @param {TerrainProvider} terrainProvider The terrain provider from which to query heights.
     * @param {Cartographic[]} positions The positions to update with terrain heights.
     * @returns {Promise.<Cartographic[]>} A promise that resolves to the provided list of positions when terrain the query has completed.  This
     *                                     promise will reject if the terrain provider's `availability` property is undefined.
     *
     * @example
     * // Query the terrain height of two Cartographic positions
     * var terrainProvider = Cesium.createWorldTerrain();
     * var positions = [
     *     Cesium.Cartographic.fromDegrees(86.925145, 27.988257),
     *     Cesium.Cartographic.fromDegrees(87.0, 28.0)
     * ];
     * var promise = Cesium.sampleTerrainMostDetailed(terrainProvider, positions);
     * Cesium.when(promise, function(updatedPositions) {
     *     // positions[0].height and positions[1].height have been updated.
     *     // updatedPositions is just a reference to positions.
     * });
     */
    function sampleTerrainMostDetailed(terrainProvider, positions) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(terrainProvider)) {
            throw new DeveloperError('terrainProvider is required.');
        }
        if (!defined(positions)) {
            throw new DeveloperError('positions is required.');
        }
        //>>includeEnd('debug');

        return terrainProvider.readyPromise
            .then(function() {
                var byLevel = [];
                var maxLevels = [];

                var availability = terrainProvider.availability;

                //>>includeStart('debug', pragmas.debug);
                if (!defined(availability)) {
                    throw new DeveloperError('sampleTerrainMostDetailed requires a terrain provider that has tile availability.');
                }
                //>>includeEnd('debug');

                var promises = [];
                for (var i = 0; i < positions.length; ++i) {
                    var position = positions[i];
                    var maxLevel = availability.computeMaximumLevelAtPosition(position);
                    maxLevels[i] = maxLevel;
                    if (maxLevel === 0) {
                        // This is a special case where we have a parent terrain and we are requesting
                        // heights from an area that isn't covered by the top level terrain at all.
                        // This will essentially trigger the loading of the parent terrains root tile
                        terrainProvider.tilingScheme.positionToTileXY(position, 1, scratchCartesian2);
                        var promise = terrainProvider.loadTileDataAvailability(scratchCartesian2.x, scratchCartesian2.y, 1);
                        if (defined(promise)) {
                            promises.push(promise);
                        }
                    }

                    var atLevel = byLevel[maxLevel];
                    if (!defined(atLevel)) {
                        byLevel[maxLevel] = atLevel = [];
                    }
                    atLevel.push(position);
                }

                return when.all(promises)
                    .then(function() {
                        return when.all(byLevel.map(function(positionsAtLevel, index) {
                            if (defined(positionsAtLevel)) {
                                return sampleTerrain(terrainProvider, index, positionsAtLevel);
                            }
                        }));
                    })
                    .then(function() {
                        var changedPositions = [];
                        for (var i = 0; i < positions.length; ++i) {
                            var position = positions[i];
                            var maxLevel = availability.computeMaximumLevelAtPosition(position);

                            if (maxLevel !== maxLevels[i]) {
                                // Now that we loaded the max availability, a higher level has become available
                                changedPositions.push(position);
                            }
                        }

                        if (changedPositions.length > 0) {
                            return sampleTerrainMostDetailed(terrainProvider, changedPositions);
                        }
                    })
                    .then(function() {
                        return positions;
                    });
            });
    }
export default sampleTerrainMostDetailed;
