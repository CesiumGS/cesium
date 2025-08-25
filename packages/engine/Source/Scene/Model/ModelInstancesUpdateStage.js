import SceneMode from "../SceneMode.js";
import RuntimeModelInstancingPipelineStage from "./RuntimeModelInstancingPipelineStage.js";

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
  if (
    (!sceneGraph.modelInstances._dirty &&
      sceneGraph._model.minimumPixelSize === 0) ||
    !sceneGraph._model._drawCommandsBuilt
  ) {
    return;
  }

  const use2D = frameState.mode !== SceneMode.SCENE3D;
  if (use2D && sceneGraph._model._projectTo2D) {
    return;
  }

  updateRuntimeNode(runtimeNode, sceneGraph, frameState);
  sceneGraph.modelInstances._dirty = false;
};

/**
 * Recursively update all child runtime nodes and their runtime primitives.
 *
 * @private
 */
function updateRuntimeNode(runtimeNode, sceneGraph, frameState) {
  const modelInstances = sceneGraph.modelInstances._instances;

  const showsTypedArray =
    RuntimeModelInstancingPipelineStage._getShowsTypedArray(modelInstances);
  runtimeNode.instanceShowsBuffer.copyFromArrayView(showsTypedArray);

  const transformsTypedArray =
    RuntimeModelInstancingPipelineStage._getTransformsTypedArray(
      modelInstances,
      sceneGraph._model,
      frameState,
    );

  runtimeNode.instancingTransformsBuffer.copyFromArrayView(
    transformsTypedArray,
  );
  const colorsTypedArray =
    RuntimeModelInstancingPipelineStage._getColorsTypedArray(modelInstances);
  runtimeNode.instanceColorsBuffer.copyFromArrayView(colorsTypedArray);

  const childrenLength = runtimeNode.children.length;

  for (let i = 0; i < childrenLength; i++) {
    const childRuntimeNode = sceneGraph._runtimeNodes[runtimeNode.children[i]];

    updateRuntimeNode(childRuntimeNode, sceneGraph, frameState);
  }
}

export default ModelInstancesUpdateStage;
