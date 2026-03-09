import AttributeCompression from "../../Core/AttributeCompression.js";
import Cartesian3 from "../../Core/Cartesian3.js";
import ComponentDatatype from "../../Core/ComponentDatatype.js";
import defined from "../../Core/defined.js";
import IndexDatatype from "../../Core/IndexDatatype.js";
import Matrix4 from "../../Core/Matrix4.js";
import AttributeType from "../AttributeType.js";
import VertexAttributeSemantic from "../VertexAttributeSemantic.js";
import ModelUtility from "./ModelUtility.js";

/**
 * Shared utilities for traversing model scene graphs.
 * Used by pickModel and ModelGeometryExtractor.
 *
 * @namespace ModelMeshUtility
 * @private
 */
const ModelMeshUtility = {};

/**
 * Computes the model matrix for a runtime node, accounting for instancing
 * and world-space transforms.
 *
 * @param {object} runtimeNode The runtime node.
 * @param {ModelSceneGraph} sceneGraph The model scene graph.
 * @param {Model} model The model.
 * @param {object} result An object with scratch matrices: { nodeComputedTransform: Matrix4, modelMatrix: Matrix4, computedModelMatrix: Matrix4 }.
 * @returns {object} The result parameter, populated with the computed transforms.
 *
 * @private
 */
ModelMeshUtility.computeNodeTransforms = function (
  runtimeNode,
  sceneGraph,
  model,
  result,
) {
  const node = runtimeNode.node;

  let nodeComputedTransform = Matrix4.clone(
    runtimeNode.computedTransform,
    result.nodeComputedTransform,
  );
  let modelMatrix = Matrix4.clone(
    sceneGraph.computedModelMatrix,
    result.modelMatrix,
  );

  const instances = node.instances;
  if (defined(instances)) {
    if (instances.transformInWorldSpace) {
      // Replicate the multiplication order in LegacyInstancingStageVS.
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
    result.computedModelMatrix,
  );

  result.computedModelMatrix = computedModelMatrix;
  result.nodeComputedTransform = nodeComputedTransform;
  result.modelMatrix = modelMatrix;
  return result;
};

/**
 * Builds an array of instance transforms for a node.
 * If the node is not instanced, returns an array containing only the
 * computedModelMatrix.
 *
 * @param {object} runtimeNode The runtime node.
 * @param {Matrix4} computedModelMatrix The computed model matrix.
 * @param {Matrix4} nodeComputedTransform The node computed transform.
 * @param {Matrix4} modelMatrix The model matrix.
 * @param {FrameState} [frameState] Frame state, needed for GPU readback.
 * @returns {Matrix4[]}
 *
 * @private
 */
ModelMeshUtility.getInstanceTransforms = function (
  runtimeNode,
  computedModelMatrix,
  nodeComputedTransform,
  modelMatrix,
  frameState,
) {
  const transforms = [];
  const node = runtimeNode.node;
  const instances = node.instances;

  if (defined(instances)) {
    const transformsCount = instances.attributes[0].count;
    const instanceComponentDatatype = instances.attributes[0].componentDatatype;

    const transformElements = 12;
    let transformsTypedArray = runtimeNode.transformsTypedArray;

    if (!defined(transformsTypedArray) && defined(frameState)) {
      const instanceTransformsBuffer = runtimeNode.instancingTransformsBuffer;
      if (defined(instanceTransformsBuffer) && frameState.context.webgl2) {
        transformsTypedArray = ComponentDatatype.createTypedArray(
          instanceComponentDatatype,
          transformsCount * transformElements,
        );
        instanceTransformsBuffer.getBufferData(transformsTypedArray);
      }
    }

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
};

/**
 * Reads the position attribute data from a primitive, including
 * quantization metadata and stride/offset info.
 *
 * @param {object} primitive The model primitive.
 * @param {FrameState} [frameState] Frame state, needed for GPU readback of vertex buffers.
 * @returns {object|undefined} An object with { vertices, elementStride, offset, quantization, vertexCount }, or undefined if data is unavailable.
 *
 * @private
 */
ModelMeshUtility.readPositionData = function (primitive, frameState) {
  const positionAttribute = ModelUtility.getAttributeBySemantic(
    primitive,
    VertexAttributeSemantic.POSITION,
  );

  if (!defined(positionAttribute)) {
    return undefined;
  }

  const byteOffset = positionAttribute.byteOffset;
  const byteStride = positionAttribute.byteStride;
  const vertexCount = positionAttribute.count;

  let vertices = positionAttribute.typedArray;
  let componentDatatype = positionAttribute.componentDatatype;
  let attributeType = positionAttribute.type;

  const quantization = positionAttribute.quantization;
  if (defined(quantization)) {
    componentDatatype = quantization.componentDatatype;
    attributeType = quantization.type;
  }

  const numComponents = AttributeType.getNumberOfComponents(attributeType);
  const bytes = ComponentDatatype.getSizeInBytes(componentDatatype);
  const isInterleaved =
    !defined(vertices) &&
    defined(byteStride) &&
    byteStride !== numComponents * bytes;

  let elementStride = numComponents;
  let offset = 0;
  if (isInterleaved) {
    elementStride = byteStride / bytes;
    offset = byteOffset / bytes;
  }
  const elementCount = vertexCount * elementStride;

  if (!defined(vertices)) {
    const verticesBuffer = positionAttribute.buffer;

    if (
      defined(verticesBuffer) &&
      defined(frameState) &&
      frameState.context.webgl2
    ) {
      vertices = ComponentDatatype.createTypedArray(
        componentDatatype,
        elementCount,
      );
      verticesBuffer.getBufferData(
        vertices,
        isInterleaved ? 0 : byteOffset,
        0,
        elementCount,
      );
    }

    if (quantization && positionAttribute.normalized) {
      vertices = AttributeCompression.dequantize(
        vertices,
        componentDatatype,
        attributeType,
        vertexCount,
      );
    }
  }

  if (!defined(vertices)) {
    return undefined;
  }

  return {
    vertices: vertices,
    elementStride: elementStride,
    offset: offset,
    quantization: quantization,
    vertexCount: vertexCount,
  };
};

/**
 * Reads the index data from a primitive, falling back to GPU readback
 * when the CPU typed array is not available.
 *
 * @param {object} primitive The model primitive.
 * @param {FrameState} [frameState] Frame state, needed for GPU readback of index buffers.
 * @returns {Uint8Array|Uint16Array|Uint32Array|undefined} The index array, or undefined if data is unavailable.
 *
 * @private
 */
ModelMeshUtility.readIndices = function (primitive, frameState) {
  if (!defined(primitive.indices)) {
    return undefined;
  }

  let indices = primitive.indices.typedArray;
  if (!defined(indices)) {
    const indicesBuffer = primitive.indices.buffer;
    const indicesCount = primitive.indices.count;
    const indexDatatype = primitive.indices.indexDatatype;

    if (
      defined(indicesBuffer) &&
      defined(frameState) &&
      frameState.context.webgl2
    ) {
      if (indexDatatype === IndexDatatype.UNSIGNED_BYTE) {
        indices = new Uint8Array(indicesCount);
      } else if (indexDatatype === IndexDatatype.UNSIGNED_SHORT) {
        indices = new Uint16Array(indicesCount);
      } else if (indexDatatype === IndexDatatype.UNSIGNED_INT) {
        indices = new Uint32Array(indicesCount);
      }

      indicesBuffer.getBufferData(indices);
    }
  }

  return indices;
};

/**
 * Decodes a vertex position from the position data, applying quantization
 * dequantization if necessary, then transforms it by the instance transform
 * to produce a world-space position.
 *
 * @param {Float32Array|Uint16Array|Uint8Array} vertices The vertex data array.
 * @param {number} index The vertex index.
 * @param {number} offset Element offset within a stride for interleaved data.
 * @param {number} elementStride Number of elements per vertex (may be larger than 3 for interleaved).
 * @param {object} [quantization] Quantization metadata from the position attribute.
 * @param {Matrix4} instanceTransform The instance transform matrix.
 * @param {Cartesian3} result Scratch Cartesian3 to store the result.
 * @returns {Cartesian3} The decoded and transformed position.
 *
 * @private
 */
ModelMeshUtility.decodeAndTransformPosition = function (
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
        result.x, // 260309 Fixes a bug from pickModel.js where parameter was mistakenly sent as a vector instead of expanded floats
        result.y,
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
};

export default ModelMeshUtility;
