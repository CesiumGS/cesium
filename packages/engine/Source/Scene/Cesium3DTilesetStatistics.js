import defined from "../Core/defined.js";

/**
 * @private
 */
function Cesium3DTilesetStatistics() {
  // Rendering statistics
  this.selected = 0;
  this.visited = 0;
  // Loading statistics
  this.numberOfCommands = 0;
  this.numberOfAttemptedRequests = 0;
  this.numberOfPendingRequests = 0;
  this.numberOfTilesProcessing = 0;
  this.numberOfTilesWithContentReady = 0; // Number of tiles with content loaded, does not include empty tiles
  this.numberOfTilesTotal = 0; // Number of tiles in tileset JSON (and other tileset JSON files as they are loaded)
  this.numberOfLoadedTilesTotal = 0; // Running total of loaded tiles for the lifetime of the session
  // Features statistics
  this.numberOfFeaturesSelected = 0; // Number of features rendered
  this.numberOfFeaturesLoaded = 0; // Number of features in memory
  this.numberOfPointsSelected = 0;
  this.numberOfPointsLoaded = 0;
  this.numberOfTrianglesSelected = 0;
  // Styling statistics
  this.numberOfTilesStyled = 0;
  this.numberOfFeaturesStyled = 0;
  // Optimization statistics
  this.numberOfTilesCulledWithChildrenUnion = 0;
  // Memory statistics
  this.geometryByteLength = 0;
  this.texturesByteLength = 0;
  this.batchTableByteLength = 0; // batch textures and any binary metadata properties not otherwise accounted for
}

Cesium3DTilesetStatistics.prototype.clear = function () {
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
  const contents = content.innerContents;
  const pointsLength = content.pointsLength;
  const trianglesLength = content.trianglesLength;
  const featuresLength = content.featuresLength;
  const geometryByteLength = content.geometryByteLength;
  const texturesByteLength = content.texturesByteLength;
  const batchTableByteLength = content.batchTableByteLength;

  if (load) {
    statistics.numberOfFeaturesLoaded += decrement
      ? -featuresLength
      : featuresLength;
    statistics.numberOfPointsLoaded += decrement ? -pointsLength : pointsLength;
    statistics.geometryByteLength += decrement
      ? -geometryByteLength
      : geometryByteLength;
    statistics.texturesByteLength += decrement
      ? -texturesByteLength
      : texturesByteLength;
    statistics.batchTableByteLength += decrement
      ? -batchTableByteLength
      : batchTableByteLength;
  } else {
    statistics.numberOfFeaturesSelected += decrement
      ? -featuresLength
      : featuresLength;
    statistics.numberOfPointsSelected += decrement
      ? -pointsLength
      : pointsLength;
    statistics.numberOfTrianglesSelected += decrement
      ? -trianglesLength
      : trianglesLength;
  }

  if (defined(contents)) {
    const length = contents.length;
    for (let i = 0; i < length; ++i) {
      updatePointAndFeatureCounts(statistics, contents[i], decrement, load);
    }
  }
}

Cesium3DTilesetStatistics.prototype.incrementSelectionCounts = function (
  content
) {
  updatePointAndFeatureCounts(this, content, false, false);
};

Cesium3DTilesetStatistics.prototype.incrementLoadCounts = function (content) {
  updatePointAndFeatureCounts(this, content, false, true);
};

Cesium3DTilesetStatistics.prototype.decrementLoadCounts = function (content) {
  updatePointAndFeatureCounts(this, content, true, true);
};

Cesium3DTilesetStatistics.clone = function (statistics, result) {
  result.selected = statistics.selected;
  result.visited = statistics.visited;
  result.numberOfCommands = statistics.numberOfCommands;
  result.selected = statistics.selected;
  result.numberOfAttemptedRequests = statistics.numberOfAttemptedRequests;
  result.numberOfPendingRequests = statistics.numberOfPendingRequests;
  result.numberOfTilesProcessing = statistics.numberOfTilesProcessing;
  result.numberOfTilesWithContentReady =
    statistics.numberOfTilesWithContentReady;
  result.numberOfTilesTotal = statistics.numberOfTilesTotal;
  result.numberOfFeaturesSelected = statistics.numberOfFeaturesSelected;
  result.numberOfFeaturesLoaded = statistics.numberOfFeaturesLoaded;
  result.numberOfPointsSelected = statistics.numberOfPointsSelected;
  result.numberOfPointsLoaded = statistics.numberOfPointsLoaded;
  result.numberOfTrianglesSelected = statistics.numberOfTrianglesSelected;
  result.numberOfTilesStyled = statistics.numberOfTilesStyled;
  result.numberOfFeaturesStyled = statistics.numberOfFeaturesStyled;
  result.numberOfTilesCulledWithChildrenUnion =
    statistics.numberOfTilesCulledWithChildrenUnion;
  result.geometryByteLength = statistics.geometryByteLength;
  result.texturesByteLength = statistics.texturesByteLength;
  result.batchTableByteLength = statistics.batchTableByteLength;
};
export default Cesium3DTilesetStatistics;
