import AttributeCompression from "../../Core/AttributeCompression.js";
import Cartesian3 from "../../Core/Cartesian3.js";
import defined from "../../Core/defined.js";
import DeveloperError from "../../Core/DeveloperError.js";
import Matrix4 from "../../Core/Matrix4.js";
import AttributeType from "../AttributeType.js";
import VertexAttributeSemantic from "../VertexAttributeSemantic.js";
import ModelUtility from "./ModelUtility.js";

const scratchPosition = new Cartesian3();
const scratchNodeComputedTransform = new Matrix4();
const scratchModelMatrix = new Matrix4();
const scratchComputedModelMatrix = new Matrix4();

/**
 * Extracts vertex positions from a loaded Model.
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
 * Returns a Map keyed by feature ID, where each value is an array of
 * world-space (ECEF) {@link Cartesian3} positions for all vertices
 * belonging to that feature within the model.
 *
 * @param {object} options Object with the following properties:
 * @param {Model} options.model The model from which to extract positions.
 * @param {string} [options.featureIdLabel="featureId_0"] The label of the feature ID set to match against.
 * @param {Map<number, Cartesian3[]>} [options.result] A Map to store the result.
 * @returns {Map<number, Cartesian3[]>} A Map from feature ID to an array of world-space Cartesian3 positions.
 *
 * @private
 */
ModelGeometryExtractor.getPositionsForModel = function (options) {
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
  const result = options.result ?? new Map();
  result.clear();

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
    const node = runtimeNode.node;

    let nodeComputedTransform = Matrix4.clone(
      runtimeNode.computedTransform,
      scratchNodeComputedTransform,
    );
    let modelMatrix = Matrix4.clone(
      sceneGraph.computedModelMatrix,
      scratchModelMatrix,
    );

    const instances = node.instances;
    if (defined(instances)) {
      if (instances.transformInWorldSpace) {
        modelMatrix = Matrix4.multiplyTransformation(
          model.modelMatrix,
          sceneGraph.components.transform,
          modelMatrix,
        );
        nodeComputedTransform = Matrix4.multiplyTransformation(
          sceneGraph.axisCorrectionMatrix,
          runtimeNode.computedTransform,
          nodeComputedTransform,
        );
      }
    }

    const computedModelMatrix = Matrix4.multiplyTransformation(
      modelMatrix,
      nodeComputedTransform,
      scratchComputedModelMatrix,
    );

    const instanceTransforms = getInstanceTransforms(
      runtimeNode,
      node,
      computedModelMatrix,
      nodeComputedTransform,
      modelMatrix,
    );

    const primitivesLength = runtimeNode.runtimePrimitives.length;
    for (let p = 0; p < primitivesLength; p++) {
      const runtimePrimitive = runtimeNode.runtimePrimitives[p];
      const primitive = runtimePrimitive.primitive;

      extractAllPositionsFromPrimitive(
        primitive,
        featureIdLabel,
        instanceTransforms,
        result,
      );
    }
  }

  return result;
};

/**
 * Builds instance transforms array, similar to pickModel.js pattern.
 * @private
 */
function getInstanceTransforms(
  runtimeNode,
  node,
  computedModelMatrix,
  nodeComputedTransform,
  modelMatrix,
) {
  const transforms = [];
  const instances = node.instances;

  if (defined(instances)) {
    const transformsCount = instances.attributes[0].count;

    const transformElements = 12;
    const transformsTypedArray = runtimeNode.transformsTypedArray;

    if (defined(transformsTypedArray)) {
      for (let i = 0; i < transformsCount; i++) {
        const index = i * transformElements;

        const transform = new Matrix4(
          transformsTypedArray[index],
          transformsTypedArray[index + 1],
          transformsTypedArray[index + 2],
          transformsTypedArray[index + 3],
          transformsTypedArray[index + 4],
          transformsTypedArray[index + 5],
          transformsTypedArray[index + 6],
          transformsTypedArray[index + 7],
          transformsTypedArray[index + 8],
          transformsTypedArray[index + 9],
          transformsTypedArray[index + 10],
          transformsTypedArray[index + 11],
          0,
          0,
          0,
          1,
        );

        if (instances.transformInWorldSpace) {
          Matrix4.multiplyTransformation(
            transform,
            nodeComputedTransform,
            transform,
          );
          Matrix4.multiplyTransformation(modelMatrix, transform, transform);
        } else {
          Matrix4.multiplyTransformation(
            transform,
            computedModelMatrix,
            transform,
          );
        }
        transforms.push(transform);
      }
    }
  }

  if (transforms.length === 0) {
    transforms.push(computedModelMatrix);
  }

  return transforms;
}

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
 * Reads vertex positions from the position attribute.
 * Handles CPU typed arrays and GPU readback.
 * @private
 */
function readPositionData(positionAttribute) {
  const vertices = positionAttribute.typedArray;
  let attributeType = positionAttribute.type;

  const quantization = positionAttribute.quantization;
  if (defined(quantization)) {
    attributeType = quantization.type;
  }

  const numComponents = AttributeType.getNumberOfComponents(attributeType);

  const elementStride = numComponents;
  const offset = 0;

  return {
    vertices: vertices,
    elementStride: elementStride,
    offset: offset,
    quantization: quantization,
  };
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
 * Extracts positions from a single primitive grouped by feature ID.
 * Populates the result Map with feature ID keys and position arrays.
 * @private
 */
function extractAllPositionsFromPrimitive(
  primitive,
  featureIdLabel,
  instanceTransforms,
  result,
) {
  const positionAttribute = ModelUtility.getAttributeBySemantic(
    primitive,
    VertexAttributeSemantic.POSITION,
  );
  if (!defined(positionAttribute)) {
    return;
  }

  const vertexCount = positionAttribute.count;

  const featureIdMapping = findFeatureIdMapping(primitive, featureIdLabel);

  const posData = readPositionData(positionAttribute);
  if (!defined(posData.vertices)) {
    return;
  }

  const indices = readIndices(primitive);

  let featureIdData;
  if (defined(featureIdMapping)) {
    featureIdData = getPerVertexFeatureIds(
      primitive,
      featureIdMapping,
      vertexCount,
    );
  }

  // Group unique vertex indices by feature ID
  const featureVerticesMap = new Map();

  if (defined(indices)) {
    const indicesLength = indices.length;
    for (let i = 0; i < indicesLength; i++) {
      const vertexIndex = indices[i];
      const fid = defined(featureIdData)
        ? getFeatureIdValue(featureIdData, vertexIndex)
        : 0;

      let vertexSet = featureVerticesMap.get(fid);
      if (!defined(vertexSet)) {
        vertexSet = new Set();
        featureVerticesMap.set(fid, vertexSet);
      }
      vertexSet.add(vertexIndex);
    }
  } else {
    for (let i = 0; i < vertexCount; i++) {
      const fid = defined(featureIdData)
        ? getFeatureIdValue(featureIdData, i)
        : 0;

      let vertexSet = featureVerticesMap.get(fid);
      if (!defined(vertexSet)) {
        vertexSet = new Set();
        featureVerticesMap.set(fid, vertexSet);
      }
      vertexSet.add(i);
    }
  }

  // Transform each vertex and append to the result map
  for (const [featureId, vertexIndicesSet] of featureVerticesMap) {
    let positions = result.get(featureId);
    if (!defined(positions)) {
      positions = [];
      result.set(featureId, positions);
    }

    for (const vertexIndex of vertexIndicesSet) {
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
        positions.push(Cartesian3.clone(worldPos));
      }
    }
  }
}

export default ModelGeometryExtractor;
