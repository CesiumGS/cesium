import defined from "../Core/defined.js";
import Model3DTileContent from "./Model/Model3DTileContent.js";

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
  this.texturesReferenceCounterById = {};
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

/**
 * Increment the counters for the points, triangles, and features
 * that are currently selected for rendering.
 *
 * This will be called recursively for the given content and
 * all its inner contents
 *
 * @param {Cesium3DTileContent} content
 */
Cesium3DTilesetStatistics.prototype.incrementSelectionCounts = function (
  content,
) {
  this.numberOfFeaturesSelected += content.featuresLength;
  this.numberOfPointsSelected += content.pointsLength;
  this.numberOfTrianglesSelected += content.trianglesLength;

  // Recursive calls on all inner contents
  const contents = content.innerContents;
  if (defined(contents)) {
    const length = contents.length;
    for (let i = 0; i < length; ++i) {
      this.incrementSelectionCounts(contents[i]);
    }
  }
};

/**
 * Increment the counters for the number of features and points that
 * are currently loaded, and the lengths (size in bytes) of the
 * occupied memory.
 *
 * This will be called recursively for the given content and
 * all its inner contents
 *
 * @param {Cesium3DTileContent} content
 */
Cesium3DTilesetStatistics.prototype.incrementLoadCounts = function (content) {
  this.numberOfFeaturesLoaded += content.featuresLength;
  this.numberOfPointsLoaded += content.pointsLength;
  this.geometryByteLength += content.geometryByteLength;
  this.batchTableByteLength += content.batchTableByteLength;

  // When the content is not a `Model3DTileContent`, then its
  // textures byte length is added directly
  if (!(content instanceof Model3DTileContent)) {
    this.texturesByteLength += content.texturesByteLength;
  } else {
    // When the content is a `Model3DTileContent`, then increment the
    // reference counter for all its textures. The byte length of any
    // newly tracked texture to the total textures byte length
    const textureIds = content.getTextureIds();
    for (const textureId of textureIds) {
      const referenceCounter =
        this.texturesReferenceCounterById[textureId] ?? 0;
      if (referenceCounter === 0) {
        const textureByteLength = content.getTextureByteLengthById(textureId);
        this.texturesByteLength += textureByteLength;
      }
      this.texturesReferenceCounterById[textureId] = referenceCounter + 1;
    }
  }

  // Recursive calls on all inner contents
  const contents = content.innerContents;
  if (defined(contents)) {
    const length = contents.length;
    for (let i = 0; i < length; ++i) {
      this.incrementLoadCounts(contents[i]);
    }
  }
};

/**
 * Decrement the counters for the number of features and points that
 * are currently loaded, and the lengths (size in bytes) of the
 * occupied memory.
 *
 * This will be called recursively for the given content and
 * all its inner contents
 *
 * @param {Cesium3DTileContent} content
 */
Cesium3DTilesetStatistics.prototype.decrementLoadCounts = function (content) {
  this.numberOfFeaturesLoaded -= content.featuresLength;
  this.numberOfPointsLoaded -= content.pointsLength;
  this.geometryByteLength -= content.geometryByteLength;
  this.batchTableByteLength -= content.batchTableByteLength;

  // When the content is not a `Model3DTileContent`, then its
  // textures byte length is subtracted directly
  if (!(content instanceof Model3DTileContent)) {
    this.texturesByteLength -= content.texturesByteLength;
  } else {
    // When the content is a `Model3DTileContent`, then decrement the
    // reference counter for all its textures. The byte length of any
    // texture that is no longer references is subtracted from the
    // total textures byte length
    const textureIds = content.getTextureIds();
    for (const textureId of textureIds) {
      const referenceCounter = this.texturesReferenceCounterById[textureId];
      if (referenceCounter === 1) {
        delete this.texturesReferenceCounterById[textureId];
        const textureByteLength = content.getTextureByteLengthById(textureId);
        this.texturesByteLength -= textureByteLength;
      } else {
        this.texturesReferenceCounterById[textureId] = referenceCounter - 1;
      }
    }
  }
  // Recursive calls on all inner contents
  const contents = content.innerContents;
  if (defined(contents)) {
    const length = contents.length;
    for (let i = 0; i < length; ++i) {
      this.decrementLoadCounts(contents[i]);
    }
  }
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
  result.texturesReferenceCounterById = {
    ...statistics.texturesReferenceCounterById,
  };
  result.batchTableByteLength = statistics.batchTableByteLength;
};
export default Cesium3DTilesetStatistics;
