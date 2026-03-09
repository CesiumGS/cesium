import ComponentDatatype from "../../Core/ComponentDatatype.js";
import defined from "../../Core/defined.js";
import Matrix4 from "../../Core/Matrix4.js";

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

export default ModelMeshUtility;
