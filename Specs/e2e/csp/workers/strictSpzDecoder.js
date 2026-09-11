import createTaskProcessorWorker from "/packages/engine/Source/Workers/createTaskProcessorWorker.js";

// This intentionally small decoder is a protocol fixture, not an SPZ
// implementation. It proves that an application can supply a strict-CSP SPZ
// worker while an upstream SPZ decoder build without dynamic evaluation is
// unavailable.
async function decodeSpz(parameters, transferableObjects) {
  if (!(parameters.spzData instanceof Uint8Array)) {
    throw new Error("Expected spzData to be a Uint8Array.");
  }

  // Exercise the CSP permission this replacement decoder requires. A strict
  // SPZ decoder will compile its own WASM module here instead of relying on
  // the bundled decoder's Emscripten glue.
  await WebAssembly.compile(
    // smallest valid empty WASM module (only header)
    new Uint8Array([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]),
  );

  let dynamicExecutionBlocked = false;
  try {
    new Function("return 'dynamic execution is allowed';")();
  } catch (error) {
    dynamicExecutionBlocked = true;
  }

  if (!dynamicExecutionBlocked) {
    throw new Error(
      "The strict SPZ protocol fixture expected CSP to block dynamic execution.",
    );
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
    // Test-only evidence from this protocol fixture. It is not SPZ metadata
    // and must not be interpreted as a decoder implementation.
    strictCspChecks: {
      dynamicExecutionBlocked: dynamicExecutionBlocked,
      wasmCompilationSucceeded: true,
    },
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
