import PrimitivePipeline from "../Scene/PrimitivePipeline.js";
import createTaskProcessorWorker from "./createTaskProcessorWorker.js";

function combineGeometry(packedParameters, transferableObjects) {
  return PrimitivePipeline.unpackCombineGeometryParameters(
    packedParameters
  ).then(function (parameters) {
    var results = PrimitivePipeline.combineGeometry(parameters);
    return PrimitivePipeline.packCombineGeometryResults(
      results,
      transferableObjects
    );
  });
}
export default createTaskProcessorWorker(combineGeometry);
