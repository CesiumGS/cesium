// Cesium IR's core: the program structure, the builder, the vocabulary, the
// float64 evaluator and the JSON form. It imports nothing outside this folder, so it can
// become the `cesium-ir` package unchanged.

export * from "./types.ts";
export { OPS, applyValue, typeOf, typeOfValue } from "./ops.ts";
export { Builder, shapeKey } from "./builder.ts";
export { evaluate, print } from "./evaluate.ts";
// The versioned JSON form (cesium-ir/0.1, experimental): writer, checking reader, extensions.
export {
  EXTENSIONS,
  type ExtensionOp,
  type ExtensionTable,
} from "./extensions.ts";
export {
  IrFormatError,
  programFromDocument,
  programToDocument,
  readProgram,
  writeProgram,
  type CirDocument,
  type FormatOptions,
  type JsonEquation,
  type JsonNumber,
  type JsonValue,
} from "./json.ts";
// The passes, each an interpretation of the one program structure.
export {
  derivativeName,
  differentiate,
  hessianProgram,
  jacobianProgram,
  jvp,
  parameterProgram,
  type Direction,
} from "./ad.ts";
export {
  evaluateInterval,
  evaluateIntervalSplit,
  hull,
  type Breakpoints,
  type Interval,
  type Range,
  type SplitBounds,
  type SplitOptions,
} from "./interval.ts";
export {
  hoistUniforms,
  hoistedValues,
  literalsToUniforms,
  rates,
  type Hoisted,
  type Uniforms,
} from "./rates.ts";
export { KINK_OPS, STEP_OPS, kinks, type OutputKinks } from "./kinks.ts";
export { scalarize } from "./scalarize.ts";
export {
  evaluateScalars,
  intervalReaches,
  mapIr,
  taylorChain,
  type MapIr,
  type ParamRange,
  type TaylorBox,
  type TaylorChain,
  type TaylorLink,
  type TaylorOptions,
  type TaylorRefusal,
} from "./taylor.ts";
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
export {
  GLSL_KERNEL_FRAGMENT,
  emitGlsl,
  emitGlslKernel,
  type EmittedGlsl,
  type GlslEmitOptions,
} from "./glsl.ts";
