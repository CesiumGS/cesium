// Cesium IR's core: the program structure, the builder, the vocabulary and
// the float64 evaluator. It imports nothing outside this folder, so it can
// become the `cesium-ir` package unchanged.

export * from "./types.ts";
export { OPS, applyValue, typeOf, typeOfValue } from "./ops.ts";
export { Builder, shapeKey } from "./builder.ts";
export { evaluate, print } from "./evaluate.ts";
export {
  emitWgsl,
  emitWgslKernel,
  f32Literal,
  packUniforms,
  uniformSlots,
  type EmitOptions,
  type EmittedWgsl,
  type UniformSlot,
} from "./wgsl.ts";
