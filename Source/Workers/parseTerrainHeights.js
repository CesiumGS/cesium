define([
        '../Core/ApproximateTerrainHeights',
        '../ThirdParty/when'
    ], function(
        ApproximateTerrainHeights,
        when) {
    'use strict';

    function parseTerrainHeights(terrainHeightsString) {
        ApproximateTerrainHeights.initializeFromString(terrainHeightsString);
    }

    return parseTerrainHeights;
});
