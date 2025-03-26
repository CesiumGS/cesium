import SceneMode from "../SceneMode.js";

/**
 * The model matrix update stage is responsible for updating the instancingTransformsBuffer of a runtime node.
 *
 * @namespace ModelInstancesUpdateStage
 *
 * @private
 */
const ModelInstancesUpdateStage = {};
ModelInstancesUpdateStage.name = "ModelInstancesUpdateStage"; // Helps with debugging

/**
 * Processes a runtime node. Updates the instancingTransformsBuffer.
 *
 * @param {ModelRuntimeNode} runtimeNode
 * @param {ModelSceneGraph} sceneGraph
 * @param {FrameState} frameState
 *
 * @private
 */
ModelInstancesUpdateStage.update = function (
  runtimeNode,
  sceneGraph,
  frameState,
) {
  if (!runtimeNode._apiInstancesDirty) {
    return;
  }

  const use2D = frameState.mode !== SceneMode.SCENE3D;
  if (use2D && sceneGraph._model._projectTo2D) {
    return;
  }

  updateRuntimeNode(runtimeNode, sceneGraph, frameState);
  runtimeNode._apiInstancesDirty = false;
};

/**
 * Recursively update all child runtime nodes and their runtime primitives.
 *
 * @private
 */
function updateRuntimeNode(runtimeNode, sceneGraph, frameState) {
  let i;

  const instances = runtimeNode._sceneGraph._model._apiInstances;
  const model = runtimeNode._sceneGraph._model;
  const buffer = runtimeNode.instancingTransformsBuffer;
  const transformsTypedArray = transformsToTypedArray(instances);

  runtimeNode.instancingTransformsBuffer.copyFromArrayView(
    transformsTypedArray,
  );

  model._modelResources.push(buffer);
  const keepTypedArray = model._enablePick && !frameState.context.webgl2;

  if (keepTypedArray) {
    runtimeNode.transformsTypedArray = transformsTypedArray;
  }

  runtimeNode.instancingTransformsBuffer = buffer;

  const childrenLength = runtimeNode.children.length;

  for (i = 0; i < childrenLength; i++) {
    const childRuntimeNode = sceneGraph._runtimeNodes[runtimeNode.children[i]];

    updateRuntimeNode(childRuntimeNode, sceneGraph, frameState);
  }
}

function transformsToTypedArray(transforms) {
  const elements = 12;
  const count = transforms.length;
  const transformsTypedArray = new Float32Array(count * elements);

  for (let i = 0; i < count; i++) {
    const transform = transforms[i];
    const offset = elements * i;

    transformsTypedArray[offset + 0] = transform[0];
    transformsTypedArray[offset + 1] = transform[4];
    transformsTypedArray[offset + 2] = transform[8];
    transformsTypedArray[offset + 3] = transform[12];
    transformsTypedArray[offset + 4] = transform[1];
    transformsTypedArray[offset + 5] = transform[5];
    transformsTypedArray[offset + 6] = transform[9];
    transformsTypedArray[offset + 7] = transform[13];
    transformsTypedArray[offset + 8] = transform[2];
    transformsTypedArray[offset + 9] = transform[6];
    transformsTypedArray[offset + 10] = transform[10];
    transformsTypedArray[offset + 11] = transform[14];
  }

  return transformsTypedArray;
}

export default ModelInstancesUpdateStage;
