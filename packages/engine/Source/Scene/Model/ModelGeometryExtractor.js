import AttributeCompression from "../../Core/AttributeCompression.js";
import Cartesian3 from "../../Core/Cartesian3.js";
import Color from "../../Core/Color.js";
import defined from "../../Core/defined.js";
import DeveloperError from "../../Core/DeveloperError.js";
import Matrix4 from "../../Core/Matrix4.js";
import AttributeType from "../AttributeType.js";
import VertexAttributeSemantic from "../VertexAttributeSemantic.js";
import ModelMeshUtility from "./ModelMeshUtility.js";
import ModelUtility from "./ModelUtility.js";

const scratchPosition = new Cartesian3();
const scratchNodeTransforms = {
  nodeComputedTransform: new Matrix4(),
  modelMatrix: new Matrix4(),
  computedModelMatrix: new Matrix4(),
};

/**
 * Extracts vertex geometry (positions, colors, etc.) from a loaded Model.
 * <p>
 * This requires that the model was loaded with <code>enableGeometryExtraction: true</code>
 * so that vertex data is retained on the CPU.
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
  const result = new Map();

  if (!model._ready) {
    return result;
  }

  const sceneGraph = model.sceneGraph;
  if (!defined(sceneGraph)) {
    return result;
  }

  const nodes = sceneGraph._runtimeNodes;
  const nodesLength = nodes.length;

  for (let n = 0; n < nodesLength; n++) {
    const runtimeNode = nodes[n];

    const nodeTransforms = ModelMeshUtility.computeNodeTransforms(
      runtimeNode,
      sceneGraph,
      model,
      scratchNodeTransforms,
    );

    const instanceTransforms = ModelMeshUtility.getInstanceTransforms(
      runtimeNode,
      nodeTransforms.computedModelMatrix,
      nodeTransforms.nodeComputedTransform,
      nodeTransforms.modelMatrix,
    );

    const primitivesLength = runtimeNode.runtimePrimitives.length;
    for (let p = 0; p < primitivesLength; p++) {
      const runtimePrimitive = runtimeNode.runtimePrimitives[p];
      const primitive = runtimePrimitive.primitive;

      extractAttributesFromPrimitive(
        primitive,
        featureIdLabel,
        instanceTransforms,
        extractPositions,
        extractColors,
        result,
      );
    }
  }

  return result;
};

/**
 * Finds the feature ID attribute or implicit range matching the given label
 * on the primitive's featureIds array.
 * @private
 */
function findFeatureIdMapping(primitive, featureIdLabel) {
  const featureIds = primitive.featureIds;
  if (!defined(featureIds)) {
    return undefined;
  }
  for (let i = 0; i < featureIds.length; i++) {
    const fid = featureIds[i];
    if (
      fid.label === featureIdLabel ||
      fid.positionalLabel === featureIdLabel
    ) {
      return fid;
    }
  }
  return undefined;
}

/**
 * Reads the per-vertex feature IDs for the given primitive.
 * Returns a typed array or function that maps vertex index to feature ID.
 * @private
 */
function getPerVertexFeatureIds(primitive, featureIdMapping, vertexCount) {
  // FeatureIdAttribute — stored as a vertex attribute with a setIndex
  if (defined(featureIdMapping.setIndex)) {
    const featureIdAttribute = ModelUtility.getAttributeBySemantic(
      primitive,
      VertexAttributeSemantic.FEATURE_ID,
      featureIdMapping.setIndex,
    );
    if (defined(featureIdAttribute)) {
      return featureIdAttribute.typedArray;
    }
    return undefined;
  }

  // FeatureIdImplicitRange — feature IDs are computed from vertex index
  if (defined(featureIdMapping.repeat)) {
    const offset = featureIdMapping.offset ?? 0;
    const repeat = featureIdMapping.repeat;
    // Return a proxy that computes feature IDs on the fly
    return {
      _offset: offset,
      _repeat: repeat,
      get: function (index) {
        return this._offset + Math.floor(index / this._repeat);
      },
      length: vertexCount,
    };
  }

  // Implicit range without repeat — vertex index equals feature ID
  if (defined(featureIdMapping.offset) || featureIdMapping.offset === 0) {
    const offset = featureIdMapping.offset ?? 0;
    return {
      _offset: offset,
      get: function (index) {
        return this._offset + index;
      },
      length: vertexCount,
    };
  }

  return undefined;
}

/**
 * Helper to get a feature ID value from either a typed array or an implicit mapping.
 * @private
 */
function getFeatureIdValue(featureIdData, vertexIndex) {
  if (typeof featureIdData.get === "function") {
    return featureIdData.get(vertexIndex);
  }
  return featureIdData[vertexIndex];
}

/**
 * Reads indices from the primitive.
 * @private
 */
function readIndices(primitive) {
  if (!defined(primitive.indices)) {
    return undefined;
  }

  return primitive.indices.typedArray;
}

/**
 * Decodes a vertex position, applying quantization dequantization if necessary,
 * then transforms it by the instance transform to produce a world-space position.
 * @private
 */
function decodeAndTransformVertex(
  vertices,
  index,
  offset,
  elementStride,
  quantization,
  instanceTransform,
  result,
) {
  const i = offset + index * elementStride;
  result.x = vertices[i];
  result.y = vertices[i + 1];
  result.z = vertices[i + 2];

  if (defined(quantization)) {
    if (quantization.octEncoded) {
      result = AttributeCompression.octDecodeInRange(
        result,
        quantization.normalizationRange,
        result,
      );

      if (quantization.octEncodedZXY) {
        const x = result.x;
        result.x = result.z;
        result.z = result.y;
        result.y = x;
      }
    } else {
      result = Cartesian3.multiplyComponents(
        result,
        quantization.quantizedVolumeStepSize,
        result,
      );
      result = Cartesian3.add(
        result,
        quantization.quantizedVolumeOffset,
        result,
      );
    }
  }

  result = Matrix4.multiplyByPoint(instanceTransform, result, result);
  return result;
}

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
      const fid = defined(featureIdData)
        ? getFeatureIdValue(featureIdData, vertexIndex)
        : 0;
      let vertexSet = map.get(fid);
      if (!defined(vertexSet)) {
        vertexSet = new Set();
        map.set(fid, vertexSet);
      }
      vertexSet.add(vertexIndex);
    }
  } else {
    for (let i = 0; i < vertexCount; i++) {
      const fid = defined(featureIdData)
        ? getFeatureIdValue(featureIdData, i)
        : 0;
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
 * Reads a single vertex color from the typed array and returns a new {@link Color}.
 * Handles both normalized integer (e.g. UNSIGNED_BYTE) and float data.
 * @private
 */
function readVertexColor(typedArray, vertexIndex, numComponents, normalized) {
  const i = vertexIndex * numComponents;
  let r = typedArray[i];
  let g = typedArray[i + 1];
  let b = typedArray[i + 2];
  let a = numComponents === 4 ? typedArray[i + 3] : 1.0;

  if (normalized) {
    const max = typedArray instanceof Uint16Array ? 65535.0 : 255.0;
    r /= max;
    g /= max;
    b /= max;
    if (numComponents === 4) {
      a /= max;
    }
  }

  return new Color(r, g, b, a);
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
  result,
) {
  // Look up requested attributes
  let posData;
  if (extractPositions) {
    posData = ModelMeshUtility.readPositionData(primitive);
  }

  let colorAttribute, colorNumComponents;
  if (extractColors) {
    colorAttribute = ModelUtility.getAttributeBySemantic(
      primitive,
      VertexAttributeSemantic.COLOR,
      0,
    );
    if (defined(colorAttribute) && defined(colorAttribute.typedArray)) {
      colorNumComponents = AttributeType.getNumberOfComponents(
        colorAttribute.type,
      );
    } else {
      colorAttribute = undefined;
    }
  }

  // Nothing to extract from this primitive
  if (!defined(posData) && !defined(colorAttribute)) {
    return;
  }

  // Use whichever attribute is available to get vertex count
  const vertexCount = defined(posData)
    ? posData.vertexCount
    : colorAttribute.count;

  // Feature ID grouping (done once for all attributes)
  const featureIdMapping = findFeatureIdMapping(primitive, featureIdLabel);
  let featureIdData;
  if (defined(featureIdMapping)) {
    featureIdData = getPerVertexFeatureIds(
      primitive,
      featureIdMapping,
      vertexCount,
    );
  }

  const indices = readIndices(primitive);
  const featureVerticesMap = buildFeatureVertexMap(
    indices,
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
          const worldPos = decodeAndTransformVertex(
            posData.vertices,
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
      if (defined(colorAttribute)) {
        const color = readVertexColor(
          colorAttribute.typedArray,
          vertexIndex,
          colorNumComponents,
          colorAttribute.normalized,
        );
        entry.colors.push(color);
      }
    }
  }
}

export default ModelGeometryExtractor;
