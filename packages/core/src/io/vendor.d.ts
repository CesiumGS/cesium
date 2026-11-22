// Untyped third-party decoder modules.

declare module "draco3d/draco_decoder_nodejs.js" {
  /** Emscripten module factory for the Draco decoder. */
  const createDecoderModule: (options?: object) => Promise<unknown>;
  export default createDecoderModule;
}
