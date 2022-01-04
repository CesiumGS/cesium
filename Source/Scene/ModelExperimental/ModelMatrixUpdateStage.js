import BoundingSphere from "../../Core/BoundingSphere.js";
import Matrix4 from "../../Core/Matrix4.js";

var ModelMatrixUpdateStage = {};

ModelMatrixUpdateStage.update = function (runtimePrimitive) {
  for (var i = 0; i < runtimePrimitive.drawCommands; i++) {
    var command = runtimePrimitive.drawCommands[i];
    command.modelMatrix = Matrix4.clone(
      runtimePrimitive.runtimeNode.transform,
      command.modelMatrix
    );

    BoundingSphere.transform(
      command.boundingSphere,
      command.modelMatrix,
      command.boundingVolume
    );
  }
};

export default ModelMatrixUpdateStage;
