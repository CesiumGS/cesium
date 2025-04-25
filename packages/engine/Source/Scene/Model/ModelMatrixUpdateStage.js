import SceneMode from "../SceneMode.js";
import ModelDrawCommands from "./ModelDrawCommands.js";

/**
 * The model matrix update stage is responsible for updating the model matrices and bounding volumes of the draw commands.
 *
 * @namespace ModelMatrixUpdateStage
 *
 * @private
 */
const ModelMatrixUpdateStage = {};
ModelMatrixUpdateStage.name = "ModelMatrixUpdateStage"; // Helps with debugging

/**
 * Processes a runtime node. This modifies the following parts of the scene graph and draw commands:
 * <ul>
 *  <li>updates the transforms the children of any nodes with a dirty transform</li>
 *  <li>updates the model matrix of each draw command in each primitive of the the dirty nodes and their children</li>
 *  <li>updates the bounding volume of each draw command in each primitive of the the dirty nodes and their children</li>
 * </ul>
 *
 * @param {ModelRuntimeNode} runtimeNode
 * @param {ModelSceneGraph} sceneGraph
 * @param {FrameState} frameState
 *
 * @private
 */
ModelMatrixUpdateStage.update = function (runtimeNode, sceneGraph, frameState) {
  // Skip the update stage if the model is being projected to 2D
  const use2D = frameState.mode !== SceneMode.SCENE3D;
  if (use2D && sceneGraph.projectTo2D) {
    return;
  }

  if (runtimeNode.isComputedTransformDirty) {
    sceneGraph.updateRuntimeNodeTransforms(
      runtimeNode,
      runtimeNode.transformToRoot,
    );
    updateDrawCommands(runtimeNode, sceneGraph, frameState);
  }
};

/**
 * Recursively update draw commands for all runtime primitives.
 * @private
 */
function updateDrawCommands(runtimeNode, sceneGraph, frameState) {
  const primitivesLength = runtimeNode.runtimePrimitives.length;
  for (let i = 0; i < primitivesLength; i++) {
    const runtimePrimitive = runtimeNode.runtimePrimitives[i];
    const drawCommand = runtimePrimitive.drawCommand;
    const model = runtimePrimitive.model;
    ModelDrawCommands.updateDrawCommand(
      drawCommand,
      model,
      runtimeNode,
      runtimePrimitive,
      frameState,
    );
  }

  const childrenLength = runtimeNode.children.length;
  for (let i = 0; i < childrenLength; i++) {
    const childRuntimeNode = sceneGraph._runtimeNodes[runtimeNode.children[i]];

    updateDrawCommands(childRuntimeNode, sceneGraph, frameState);
  }
}

export default ModelMatrixUpdateStage;
