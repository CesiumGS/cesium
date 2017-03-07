/*global define*/
define([
    '../ThirdParty/when',
    './defined',
    './sampleTerrain',
    './DeveloperError'
], function(
    when,
    defined,
    sampleTerrain,
    DeveloperError) {
    "use strict";

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
     * var terrainProvider = new Cesium.CesiumTerrainProvider({
     *     url : '//assets.agi.com/stk-terrain/world'
     * });
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

        return terrainProvider.readyPromise.then(function() {
            var byLevel = [];

            var availability = terrainProvider.availability;

            //>>includeStart('debug', pragmas.debug);
            if (!defined(availability)) {
                throw new DeveloperError('sampleTerrainMostDetailed requires a terrain provider that has tile availability.');
            }
            //>>includeEnd('debug');

            for (var i = 0; i < positions.length; ++i) {
                var position = positions[i];
                var maxLevel = availability.computeMaximumLevelAtPosition(position);

                var atLevel = byLevel[maxLevel];
                if (!defined(atLevel)) {
                    byLevel[maxLevel] = atLevel = [];
                }
                atLevel.push(position);
            }

            return when.all(byLevel.map(function(positionsAtLevel, index) {
                if (defined(positionsAtLevel)) {
                    return sampleTerrain(terrainProvider, index, positionsAtLevel);
                }
            })).then(function() {
                return positions;
            });
        });
    }

    return sampleTerrainMostDetailed;
});
