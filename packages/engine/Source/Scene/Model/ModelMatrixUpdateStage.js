import Matrix4 from "../../Core/Matrix4.js";
import ModelUtility from "./ModelUtility.js";
import SceneMode from "../SceneMode.js";

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
  if (use2D && sceneGraph._model._projectTo2D) {
    return;
  }

  if (runtimeNode._transformDirty) {
    const modelMatrix = use2D
      ? sceneGraph._computedModelMatrix2D
      : sceneGraph._computedModelMatrix;

    updateRuntimeNode(
      runtimeNode,
      sceneGraph,
      modelMatrix,
      runtimeNode.transformToRoot
    );
    runtimeNode._transformDirty = false;
  }
};

/**
 * Recursively update all child runtime nodes and their runtime primitives.
 *
 * @private
 */
function updateRuntimeNode(
  runtimeNode,
  sceneGraph,
  modelMatrix,
  transformToRoot
) {
  let i;

  // Apply the current node's transform to the end of the chain
  transformToRoot = Matrix4.multiplyTransformation(
    transformToRoot,
    runtimeNode.transform,
    new Matrix4()
  );

  runtimeNode.updateComputedTransform();

  const primitivesLength = runtimeNode.runtimePrimitives.length;
  for (i = 0; i < primitivesLength; i++) {
    const runtimePrimitive = runtimeNode.runtimePrimitives[i];
    const drawCommand = runtimePrimitive.drawCommand;
    drawCommand.modelMatrix = Matrix4.multiplyTransformation(
      modelMatrix,
      transformToRoot,
      drawCommand.modelMatrix
    );
    drawCommand.cullFace = ModelUtility.getCullFace(
      drawCommand.modelMatrix,
      drawCommand.primitiveType
    );
  }

  const childrenLength = runtimeNode.children.length;
  for (i = 0; i < childrenLength; i++) {
    const childRuntimeNode = sceneGraph._runtimeNodes[runtimeNode.children[i]];

    // Update transformToRoot to accommodate changes in the transforms of this node and its ancestors
    childRuntimeNode._transformToRoot = Matrix4.clone(
      transformToRoot,
      childRuntimeNode._transformToRoot
    );

    updateRuntimeNode(
      childRuntimeNode,
      sceneGraph,
      modelMatrix,
      transformToRoot
    );
    childRuntimeNode._transformDirty = false;
  }
}

export default ModelMatrixUpdateStage;
