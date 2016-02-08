/*global define*/
define([
    '../ThirdParty/when',
    './defined',
    './sampleTerrain',
    './DeveloperError',
    './Rectangle'
], function(
    when,
    defined,
    sampleTerrain,
    DeveloperError,
    Rectangle) {
    "use strict";

    /**
     * Initiates a sampleTerrain() request at the maximum available tile level for a terrain dataset.
     *
     * @exports sampleTerrainMostDetailed
     *
     * @param {TerrainProvider} terrainProvider The terrain provider from which to query heights.
     * @param {Cartographic[]} positions The positions to update with terrain heights.
     * @returns {Promise.<Cartographic[]>} A promise that resolves to the provided list of positions when terrain the query has completed.
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
        if (!defined(terrainProvider.getMaximumTileLevel)) {
            throw new DeveloperError('getMaximumTileLevel() must be supported by the terrain provider.');
        }
        //>>includeEnd('debug');

        return terrainProvider.readyPromise.then(function() {
            var rectangle = Rectangle.fromCartographicArray(positions);
            var start = Date.now();
            var tileLevel = terrainProvider.getMaximumTileLevel(rectangle);
            return sampleTerrain(terrainProvider, tileLevel, positions);
        });
    }

    return sampleTerrainMostDetailed;
});
