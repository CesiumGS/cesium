/*global define*/
define([
        '../Core/defined'
    ], function(
        defined) {
    'use strict';

    /**
     * @private
     */
    function Cesium3DTilesetStatistics() {
        // Rendering stats
        this.selected = 0;
        this.visited = 0;
        // Loading stats
        this.numberOfCommands = 0;
        this.numberOfAttemptedRequests = 0;
        this.numberOfPendingRequests = 0;
        this.numberProcessing = 0;
        this.numberContentReady = 0; // Number of tiles with content loaded, does not include empty tiles
        this.numberTotal = 0; // Number of tiles in tileset.json (and other tileset.json files as they are loaded)
        // Features stats
        this.numberOfFeaturesSelected = 0; // Number of features rendered
        this.numberOfFeaturesLoaded = 0; // Number of features in memory
        this.numberOfPointsSelected = 0;
        this.numberOfPointsLoaded = 0;
        this.numberOfTrianglesSelected = 0;
        // Styling stats
        this.numberOfTilesStyled = 0;
        this.numberOfFeaturesStyled = 0;
        // Optimization stats
        this.numberOfTilesCulledWithChildrenUnion = 0;
        // Memory stats
        this.vertexMemorySizeInBytes = 0;
        this.textureMemorySizeInBytes = 0;
        this.batchTableMemorySizeInBytes = 0;
    }

    Cesium3DTilesetStatistics.prototype.clear = function() {
        this.selected = 0;
        this.visited = 0;
        this.numberOfCommands = 0;
        this.numberOfAttemptedRequests = 0;
        this.numberOfFeaturesSelected = 0;
        this.numberOfPointsSelected = 0;
        this.numberOfTrianglesSelected = 0;
        this.numberOfTilesStyled = 0;
        this.numberOfFeaturesStyled = 0;
        this.numberOfTilesCulledWithChildrenUnion = 0;
    };

    function updatePointAndFeatureCounts(statistics, content, decrement, load) {
        var contents = content.innerContents;
        var pointsLength = content.pointsLength;
        var trianglesLength = content.trianglesLength;
        var featuresLength = content.featuresLength;
        var vertexMemorySizeInBytes = content.vertexMemorySizeInBytes;
        var textureMemorySizeInBytes = content.textureMemorySizeInBytes;
        var batchTableMemorySizeInBytes = content.batchTableMemorySizeInBytes;

        if (load) {
            statistics.numberOfFeaturesLoaded += decrement ? -featuresLength : featuresLength;
            statistics.numberOfPointsLoaded += decrement ? -pointsLength : pointsLength;
            statistics.vertexMemorySizeInBytes += decrement ? -vertexMemorySizeInBytes : vertexMemorySizeInBytes;
            statistics.textureMemorySizeInBytes += decrement ? -textureMemorySizeInBytes : textureMemorySizeInBytes;
            statistics.batchTableMemorySizeInBytes += decrement ? -batchTableMemorySizeInBytes : batchTableMemorySizeInBytes;
        } else {
            statistics.numberOfFeaturesSelected += decrement ? -featuresLength : featuresLength;
            statistics.numberOfPointsSelected += decrement ? -pointsLength : pointsLength;
            statistics.numberOfTrianglesSelected += decrement ? -trianglesLength : trianglesLength;
        }

        if (defined(contents)) {
            var length = contents.length;
            for (var i = 0; i < length; ++i) {
                updatePointAndFeatureCounts(statistics, contents[i], decrement, load);
            }
        }
    }

    Cesium3DTilesetStatistics.prototype.incrementSelectionCounts = function(content) {
        updatePointAndFeatureCounts(this, content, false, false);
    };

    Cesium3DTilesetStatistics.prototype.incrementLoadCounts = function(content) {
        updatePointAndFeatureCounts(this, content, false, true);
    };

    Cesium3DTilesetStatistics.prototype.decrementLoadCounts = function(content) {
        updatePointAndFeatureCounts(this, content, true, true);
    };

    Cesium3DTilesetStatistics.clone = function(statistics, result) {
        result.selected = statistics.selected;
        result.visited = statistics.visited;
        result.numberOfCommands = statistics.numberOfCommands;
        result.selected = statistics.selected;
        result.numberOfAttemptedRequests = statistics.numberOfAttemptedRequests;
        result.numberOfPendingRequests = statistics.numberOfPendingRequests;
        result.numberProcessing = statistics.numberProcessing;
        result.numberContentReady = statistics.numberContentReady;
        result.numberTotal = statistics.numberTotal;
        result.numberOfFeaturesSelected = statistics.numberOfFeaturesSelected;
        result.numberOfFeaturesLoaded = statistics.numberOfFeaturesLoaded;
        result.numberOfPointsSelected = statistics.numberOfPointsSelected;
        result.numberOfPointsLoaded = statistics.numberOfPointsLoaded;
        result.numberOfTrianglesSelected = statistics.numberOfTrianglesSelected;
        result.numberOfTilesStyled = statistics.numberOfTilesStyled;
        result.numberOfFeaturesStyled = statistics.numberOfFeaturesStyled;
        result.numberOfTilesCulledWithChildrenUnion = statistics.numberOfTilesCulledWithChildrenUnion;
        result.vertexMemorySizeInBytes = statistics.vertexMemorySizeInBytes;
        result.textureMemorySizeInBytes = statistics.textureMemorySizeInBytes;
        result.batchTableMemorySizeInBytes = statistics.batchTableMemorySizeInBytes;
    };

    return Cesium3DTilesetStatistics;
});
