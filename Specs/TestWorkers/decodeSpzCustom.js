import { createTaskProcessorWorker } from "@cesium/engine";

function decodeSpz(parameters, transferableObjects) {
  if (!(parameters.spzData instanceof Uint8Array)) {
    throw new Error("Expected spzData to be a Uint8Array.");
  }

  const result = {
    numPoints: 1,
    shDegree: 0,
    positions: new Float32Array([1.0, 2.0, 3.0]),
    scales: new Float32Array([4.0, 5.0, 6.0]),
    rotations: new Float32Array([0.0, 0.0, 0.0, 1.0]),
    alphas: new Float32Array([1.0]),
    colors: new Float32Array([0.5, 0.25, 0.75]),
    sh: new Float32Array(),
  };

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
