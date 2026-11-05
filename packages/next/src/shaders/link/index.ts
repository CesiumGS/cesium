// Shader composition (plan §3.4, step 5): units, boundaries, linkers.
export { declarations, blankComments } from "./declarations.ts";
export type { Declaration, DeclarationKind } from "./declarations.ts";
export { wgslUnit } from "./unit.ts";
export type { ShaderUnit } from "./unit.ts";
export {
  POINT_STYLE_BOUNDARY,
  POOL_STYLE_BOUNDARY,
  SURFACE_BOUNDARY,
} from "./boundary.ts";
export type { Boundary, FunctionSignature } from "./boundary.ts";
export {
  WgslLinker,
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
