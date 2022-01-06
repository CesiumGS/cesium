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
var ModelMatrixUpdateStage = {};
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
    updateRuntimeNode(runtimeNode, sceneGraph, runtimeNode.transform);
    runtimeNode._transformDirty = false;
  }
};

var transformScratch = new Matrix4();

/**
 * Recursively update all child runtime nodes and their runtime primitives.
 *
 * @private
 */
function updateRuntimeNode(runtimeNode, sceneGraph, transform) {
  var i, j;

  for (i = 0; i < runtimeNode.runtimePrimitives.length; i++) {
    var runtimePrimitive = runtimeNode.runtimePrimitives[i];
    for (j = 0; j < runtimePrimitive.drawCommands.length; j++) {
      var drawCommand = runtimePrimitive.drawCommands[j];

      Matrix4.multiplyTransformation(
        sceneGraph._computedModelMatrix,
        transform,
        drawCommand.modelMatrix
      );

      BoundingSphere.transform(
        runtimePrimitive.boundingSphere,
        drawCommand.modelMatrix,
        drawCommand.boundingVolume
      );
    }
  }

  if (defined(runtimeNode.children)) {
    for (i = 0; i < runtimeNode.children.length; i++) {
      var childRuntimeNode = sceneGraph._runtimeNodes[runtimeNode.children[i]];

      Matrix4.multiplyTransformation(
        runtimeNode.transform,
        childRuntimeNode.transform,
        transformScratch
      );

      updateRuntimeNode(childRuntimeNode, sceneGraph, transformScratch);
    }
  }
}

export default ModelMatrixUpdateStage;
