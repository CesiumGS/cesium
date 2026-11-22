// The Basis transcoder glue loaded through basisTranscoderEsm.ts.
declare module "*/basis_transcoder.js?basis-esm" {
  const createBasisModule: (options: {
    wasmBinary: ArrayBuffer;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Emscripten modules are untyped
  }) => Promise<any>;
  export default createBasisModule;
}
