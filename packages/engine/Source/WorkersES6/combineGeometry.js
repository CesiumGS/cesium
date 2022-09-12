import PrimitivePipeline from "../Scene/PrimitivePipeline.js";
import createTaskProcessorWorker from "./createTaskProcessorWorker.js";

function combineGeometry(packedParameters, transferableObjects) {
  const parameters = PrimitivePipeline.unpackCombineGeometryParameters(
    packedParameters
  );
  const results = PrimitivePipeline.combineGeometry(parameters);
  return PrimitivePipeline.packCombineGeometryResults(
    results,
    transferableObjects
  );
}
export default createTaskProcessorWorker(combineGeometry);
