define([], function() {
    'use strict';

    function TerrainTileEdgeDetails() {
        this.vertices = [];
        this.minimumHeight = Number.MAX_VALUE;
        this.maximumHeight = -Number.MAX_VALUE;
    }

    TerrainTileEdgeDetails.prototype.clear = function() {
        this.vertices.length = 0;
        this.minimumHeight = Number.MAX_VALUE;
        this.maximumHeight = -Number.MAX_VALUE;
    };

    return TerrainTileEdgeDetails;
});
