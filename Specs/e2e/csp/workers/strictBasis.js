// This protocol fixture tests worker-side imports and Wasm loading under CSP.
// It does not transcode Basis data. The test uses an uncompressed KTX2 texture.
export default async function createBasis(options) {
  await WebAssembly.compile(options.wasmBinary);
  return { initializeBasis() {} };
}
