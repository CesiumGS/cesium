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
 * Update the given statistics with the information from the given
 * content.
 *
 * This function does vastly different things, depending on how it
 * is called:
 *
 * When the `load` parameter is `false`, then it updates the parts
 * of the statistics that summarize the `...Selected` elements,
 * indicating how many elements (features, points, triangles) are
 * selected for rendering.
 * (In this case, the `decrement` parameter apparently always has
 * to be `false` - probably because these value are reset to 0
 * after each frame or so....)
 *
 * When the `load` parameter is `true`, then it updates the parts of
 * the statistics that summarize the `...Loaded` and `...ByteLength`
 * properties. These basically describe what is currently loaded
 * in memory.
 * In this case, the `decrement` parameter indicates whether the
 * operation that triggered this update was a "load" or an "unload"
 * operation: When `decrement===false`, then the operation was a
 * "load", and the values will be incremented. When `decrement===true`,
 * then the operation was an "unload", and the values are decremented.
 *
 * In any case, this function will be called recursively with the
 * `innerContents` of the given content.
 *
 * @param {Cesium3DTilesetStatistics} statistics - The statistics
 * @param {Cesium3DTileContent} content - The conetnt
 * @param {boolean} decrement - Whether the values should be decremented
 * @param {boolean} load - This is `true` when the update is for a "load"
 * operation, and `false` when it is for a "selection" operation
 */
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
    statistics.batchTableByteLength += decrement
      ? -batchTableByteLength
      : batchTableByteLength;

    if (content instanceof Model3DTileContent) {
      const textureIds = content.getTextureIds();
      //console.log(`Update stats with ${textureIds} for decrement ${decrement}`);

      let totalTexturesByteLengthChange = 0;
      if (decrement) {
        for (const textureId of textureIds) {
          const referenceCounter =
            statistics.texturesReferenceCounterById[textureId];
          const textureByteLength = content.getTextureByteLengthById(textureId);

          // XXX TODO Sanity check
          if (!defined(referenceCounter) || referenceCounter === 0) {
            console.log(
              `ERROR decrement, but referenceCounter is ${referenceCounter} for textureId ${textureId}`,
            );
            continue;
          }
          if (referenceCounter === 1) {
            //console.log(`Decrement, referenceCounter dropped to 0 for textureId ${textureId}, reducing by ${textureByteLength} for textureId ${textureId}`);
            delete statistics.texturesReferenceCounterById[textureId];
            totalTexturesByteLengthChange -= textureByteLength;
          } else {
            //console.log(`Decrement, referenceCounter became ${referenceCounter - 1} for textureId ${textureId}`);
            statistics.texturesReferenceCounterById[textureId] =
              referenceCounter - 1;
          }
        }
      } else {
        for (const textureId of textureIds) {
          const referenceCounter =
            statistics.texturesReferenceCounterById[textureId] ?? 0;
          const textureByteLength = content.getTextureByteLengthById(textureId);

          statistics.texturesReferenceCounterById[textureId] =
            referenceCounter + 1;
          if (referenceCounter === 1) {
            //console.log(`Increment, referenceCounter became ${referenceCounter + 1}, increasing by ${textureByteLength} for textureId ${textureId}`);
            totalTexturesByteLengthChange += textureByteLength;
          } else {
            //console.log(`Increment, referenceCounter became ${referenceCounter + 1} for textureId ${textureId}`);
          }
        }
      }
      statistics.texturesByteLength += totalTexturesByteLengthChange;
    } else {
      statistics.texturesByteLength += decrement
        ? -texturesByteLength
        : texturesByteLength;
    }
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

  // XXX TODO Debug log
  if (load) {
    console.log(
      `After ${decrement ? "unload" : "load  "} statistics.texturesByteLength now ${statistics.texturesByteLength}`,
    );

    /*/
    console.log("Details:");
    const textureIds = Object.keys(statistics.texturesReferenceCounterById);
    for (const textureId of textureIds) {
      const referenceCounter = statistics.texturesReferenceCounterById[textureId];
      console.log(`  referenceCounter ${referenceCounter} for ${textureId}`);
    }
    //*/
  }

  if (defined(contents)) {
    const length = contents.length;
    for (let i = 0; i < length; ++i) {
      updatePointAndFeatureCounts(statistics, contents[i], decrement, load);
    }
  }
}

Cesium3DTilesetStatistics.prototype.incrementSelectionCounts = function (
  content,
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
  result.texturesByteLengthById = { ...statistics.texturesByteLengthById };
  result.texturesReferenceCounterById = {
    ...statistics.texturesReferenceCounterById,
  };
  result.batchTableByteLength = statistics.batchTableByteLength;
};
export default Cesium3DTilesetStatistics;
