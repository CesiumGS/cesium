import createTaskProcessorWorker from "./createTaskProcessorWorker.js";
import { MeshoptDecoder } from "meshoptimizer/decoder";

async function decodeMeshopt(parameters, transferableObjects) {
  await MeshoptDecoder.ready;

  const result = new Uint8Array(parameters.count * parameters.byteStride);
  MeshoptDecoder.decodeGltfBuffer(
    result,
    parameters.count,
    parameters.byteStride,
    parameters.source,
    parameters.mode,
    parameters.filter,
  );

  transferableObjects.push(result.buffer);
  return result.buffer;
}

export default createTaskProcessorWorker(decodeMeshopt);
