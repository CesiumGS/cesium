import basis from "../../packages/engine/Source/ThirdParty/Workers/basis_transcoder.js";

export default function createBasis(options) {
  if (!(options.wasmBinary instanceof ArrayBuffer)) {
    throw new Error("The worker must fetch the configured Wasm binary.");
  }
  return basis(options);
}
