import Cartesian3 from "../../Core/Cartesian3.js";
import defined from "../../Core/defined.js";
import DeveloperError from "../../Core/DeveloperError.js";
import ModelMeshUtility from "./ModelMeshUtility.js";
import ModelUtility from "./ModelUtility.js";

const scratchPosition = new Cartesian3();

/**
 * Extracts vertex geometry (positions, colors, etc.) from a loaded Model.
 * <p>
 * Uses GPU readback (WebGL 2) to read vertex data from GPU buffers when
 * CPU-side typed arrays are not available.
 * </p>
 *
 * @namespace ModelGeometryExtractor
 * @private
 */
const ModelGeometryExtractor = {};

/**
 * Returns a Map keyed by feature ID, where each value is an object
 * containing arrays of positions and/or colors for all vertices
 * belonging to that feature within the model.
 * <p>
 * This combines extraction of multiple vertex attributes in a single
 * scene graph traversal, avoiding duplicate work when both positions
 * and colors are needed.
 * </p>
 *
 * @param {object} options Object with the following properties:
 * @param {Model} options.model The model from which to extract geometry.
 * @param {string} [options.featureIdLabel="featureId_0"] The label of the feature ID set to match against.
 * @param {boolean} [options.extractPositions=true] Whether to extract vertex positions.
 * @param {boolean} [options.extractColors=false] Whether to extract vertex colors.
 * @param {FrameState} [options.frameState] The current frame state. When provided, allows GPU-backed buffers to be read.
 * @returns {Map<number, {positions?: Cartesian3[], colors?: Color[]}>} A Map from feature ID to an object with the requested attribute arrays.
 *
 * @private
 */
ModelGeometryExtractor.getGeometryForModel = function (options) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(options)) {
    throw new DeveloperError("options is required.");
  }
  if (!defined(options.model)) {
    throw new DeveloperError("options.model is required.");
  }
  //>>includeEnd('debug');

  const model = options.model;
  const featureIdLabel = options.featureIdLabel ?? "featureId_0";
  const extractPositions = options.extractPositions ?? true;
  const extractColors = options.extractColors ?? false;
  const frameState = options.frameState;
  const result = new Map();

  if (!model._ready) {
    return result;
  }

  ModelMeshUtility.forEachPrimitive(
    model,
    frameState,
    function (runtimePrimitive, primitive, instanceTransforms) {
      extractAttributesFromPrimitive(
        primitive,
        featureIdLabel,
        instanceTransforms,
        extractPositions,
        extractColors,
        frameState,
        result,
      );
    },
  );

  return result;
};

/**
 * Groups unique vertex indices by feature ID from indices or vertex count.
 * This is shared across all attribute extraction to avoid duplicate work.
 * @private
 */
function buildFeatureVertexMap(indices, featureIdData, vertexCount) {
  const map = new Map();
  if (defined(indices)) {
    const indicesLength = indices.length;
    for (let i = 0; i < indicesLength; i++) {
      const vertexIndex = indices[i];
      const fid = defined(featureIdData) ? featureIdData[vertexIndex] : 0;
      let vertexSet = map.get(fid);
      if (!defined(vertexSet)) {
        vertexSet = new Set();
        map.set(fid, vertexSet);
      }
      vertexSet.add(vertexIndex);
    }
  } else {
    for (let i = 0; i < vertexCount; i++) {
      const fid = defined(featureIdData) ? featureIdData[i] : 0;
      let vertexSet = map.get(fid);
      if (!defined(vertexSet)) {
        vertexSet = new Set();
        map.set(fid, vertexSet);
      }
      vertexSet.add(i);
    }
  }
  return map;
}

/**
 * Extracts requested attributes from a single primitive, grouped by feature ID.
 * Performs feature ID resolution and vertex grouping once, then reads each
 * requested attribute from the grouped vertices.
 * @private
 */
function extractAttributesFromPrimitive(
  primitive,
  featureIdLabel,
  instanceTransforms,
  extractPositions,
  extractColors,
  frameState,
  result,
) {
  // Look up requested attributes
  let posData;
  if (extractPositions) {
    posData = ModelMeshUtility.readPositionData(primitive, frameState);
  }

  let colorData;
  if (extractColors) {
    colorData = ModelMeshUtility.readColorData(primitive, frameState);
  }

  // Nothing to extract from this primitive
  if (!defined(posData) && !defined(colorData)) {
    return;
  }

  // Use whichever attribute is available to get vertex count
  const vertexCount = defined(posData) ? posData.count : colorData.count;

  // Feature ID grouping (done once for all attributes)
  const featureIdMapping = defined(primitive.featureIds)
    ? ModelUtility.getFeatureIdsByLabel(primitive.featureIds, featureIdLabel)
    : undefined;
  const featureIdResult = ModelMeshUtility.readFeatureIdData(
    primitive,
    featureIdMapping,
    frameState,
  );
  const featureIdData = defined(featureIdResult)
    ? featureIdResult.typedArray
    : undefined;

  const indexData = ModelMeshUtility.readIndices(primitive, frameState);
  const featureVerticesMap = buildFeatureVertexMap(
    defined(indexData) ? indexData.typedArray : undefined,
    featureIdData,
    vertexCount,
  );

  // Extract from grouped vertices
  for (const [featureId, vertexIndicesSet] of featureVerticesMap) {
    let entry = result.get(featureId);
    if (!defined(entry)) {
      entry = {};
      if (extractPositions) {
        entry.positions = [];
      }
      if (extractColors) {
        entry.colors = [];
      }
      result.set(featureId, entry);
    }

    for (const vertexIndex of vertexIndicesSet) {
      // Positions need per-instance-transform duplication
      if (defined(posData)) {
        for (let t = 0; t < instanceTransforms.length; t++) {
          const worldPos = ModelMeshUtility.decodeAndTransformPosition(
            posData.typedArray,
            vertexIndex,
            posData.offset,
            posData.elementStride,
            posData.quantization,
            instanceTransforms[t],
            scratchPosition,
          );
          entry.positions.push(Cartesian3.clone(worldPos));
        }
      }

      // Colors are instance-independent
      if (defined(colorData)) {
        const color = ModelMeshUtility.decodeColor(
          colorData.typedArray,
          vertexIndex,
          colorData.numComponents,
          colorData.normalized,
        );
        entry.colors.push(color);
      }
    }
  }
}

export default ModelGeometryExtractor;
