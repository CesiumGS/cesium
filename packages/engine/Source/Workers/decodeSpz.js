import createTaskProcessorWorker from "./createTaskProcessorWorker.js";
import { loadSpz } from "@spz-loader/core";

async function decodeSpz(parameters, transferableObjects) {
  const result = await loadSpz(parameters.spzData, {
    unpackOptions: { coordinateSystem: "UNSPECIFIED" },
  });

  transferableObjects.push(
    result.positions.buffer,
    result.scales.buffer,
    result.rotations.buffer,
    result.alphas.buffer,
    result.colors.buffer,
    result.sh.buffer,
  );
  return result;
}

export default createTaskProcessorWorker(decodeSpz);
