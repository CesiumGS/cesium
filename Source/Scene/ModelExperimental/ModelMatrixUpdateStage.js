import BoundingSphere from "../../Core/BoundingSphere.js";
import Matrix4 from "../../Core/Matrix4.js";

var ModelMatrixUpdateStage = {};

ModelMatrixUpdateStage.update = function (runtimeNode, sceneGraph, frameState) {
  if (runtimeNode._transformDirty) {
    updateRuntimeNode(runtimeNode, sceneGraph);
    runtimeNode._transformDirty = false;
  }
};

/**
 * Recursively update runtime nodes.
 */
function updateRuntimeNode(runtimeNode, sceneGraph) {
  var i, j;

  // Update the DrawCommand's model matrix and bounding volume for each runtime primitive that belongs to this runtime node.
  for (i = 0; i < runtimeNode.runtimePrimitives.length; i++) {
    var runtimePrimitive = runtimeNode.runtimePrimitives[i];
    for (j = 0; j < runtimePrimitive.drawCommands.length; j++) {
      var drawCommand = runtimePrimitive.drawCommands[j];

      Matrix4.clone(runtimeNode.computedTransform, drawCommand.modelMatrix);

      BoundingSphere.transform(
        runtimePrimitive.boundingSphere,
        drawCommand.modelMatrix,
        drawCommand.boundingVolume
      );
    }
  }

  // Update all children runtime nodes.
  for (i = 0; i < runtimeNode.children.length; i++) {
    var childRuntimeNode = sceneGraph.runtimeNodes[runtimeNode.children[i]];

    Matrix4.multiply(
      runtimeNode.transform,
      childRuntimeNode.transform,
      childRuntimeNode.transform
    );

    updateRuntimeNode(childRuntimeNode, sceneGraph);
  }
}

export default ModelMatrixUpdateStage;
