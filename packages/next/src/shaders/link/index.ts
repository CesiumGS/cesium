// Shader composition (plan §3.4, step 5): units, boundaries, linkers.
export { declarations, blankComments } from "./declarations.ts";
export type { Declaration, DeclarationKind } from "./declarations.ts";
export { MAX_LOOP_ITERATIONS, unguardedLoop } from "./loopGuard.ts";
export { wgslUnit } from "./unit.ts";
export type { ShaderUnit } from "./unit.ts";
export {
  POINT_STYLE_BOUNDARY,
  POOL_STYLE_BOUNDARY,
  POST_STAGE_BOUNDARY,
  SURFACE_BOUNDARY,
  SURFACE_VERTEX_BOUNDARY,
} from "./boundary.ts";
export type { Boundary, FunctionSignature } from "./boundary.ts";
export {
  WgslLinker,
  canonicalType,
  compileFailure,
  linkChecked,
  linkFailure,
} from "./linker.ts";
export type {
  LinkDiagnostic,
  LinkRequest,
  LinkedModule,
  Linker,
} from "./linker.ts";
