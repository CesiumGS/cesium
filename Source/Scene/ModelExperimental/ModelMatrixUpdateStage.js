import BoundingSphere from "../../Core/BoundingSphere.js";
import defined from "../../Core/defined.js";
import Matrix4 from "../../Core/Matrix4.js";

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
 * @param {ModelExperimentalNode} runtimeNode
 * @param {ModelExperimentalSceneGraph} sceneGraph
 * @param {FrameState} frameState
 *
 * @private
 */
ModelMatrixUpdateStage.update = function (runtimeNode, sceneGraph, frameState) {
  if (runtimeNode._transformDirty) {
    updateRuntimeNode(runtimeNode, sceneGraph, runtimeNode.transformToRoot);
    runtimeNode._transformDirty = false;
  }
};

/**
 * Recursively update all child runtime nodes and their runtime primitives.
 *
 * @private
 */
function updateRuntimeNode(runtimeNode, sceneGraph, transformToRoot) {
  let i, j;

  // apply the current node's transform to the end of the chain
  transformToRoot = Matrix4.multiplyTransformation(
    transformToRoot,
    runtimeNode.transform,
    new Matrix4()
  );

  // update runtimeNode.computedTransform and related matrices
  runtimeNode.updateTransforms();

  for (i = 0; i < runtimeNode.runtimePrimitives.length; i++) {
    const runtimePrimitive = runtimeNode.runtimePrimitives[i];
    for (j = 0; j < runtimePrimitive.drawCommands.length; j++) {
      const drawCommand = runtimePrimitive.drawCommands[j];

      drawCommand.modelMatrix = Matrix4.multiplyTransformation(
        sceneGraph._computedModelMatrix,
        transformToRoot,
        drawCommand.modelMatrix
      );
      drawCommand.boundingVolume = BoundingSphere.transform(
        runtimePrimitive.boundingSphere,
        drawCommand.modelMatrix,
        drawCommand.boundingVolume
      );
    }
  }

  if (defined(runtimeNode.children)) {
    for (i = 0; i < runtimeNode.children.length; i++) {
      const childRuntimeNode =
        sceneGraph._runtimeNodes[runtimeNode.children[i]];

      // Update transformToRoot to accommodate changes in the transforms of this node and its ancestors
      childRuntimeNode._transformToRoot = Matrix4.clone(
        transformToRoot,
        childRuntimeNode._transformToRoot
      );

      updateRuntimeNode(childRuntimeNode, sceneGraph, transformToRoot);
      childRuntimeNode._transformDirty = false;
    }
  }
}

export default ModelMatrixUpdateStage;
