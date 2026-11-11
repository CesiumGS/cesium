// B-reps (overall plan §13.33): the engine's render form as typed arrays,
// exact evaluation, the exact NURBS split, a builder and a validator, and the
// draft glTF extension BENTLEY_brep, and a small CPU tessellator. A draft before
// the API review.
export {
  SurfaceKind,
  faceCount,
  edgeCount,
  vertexCount,
  surfaceCount,
  type BezierCurves,
  type BrepForm,
} from "./form.ts";
export {
  evaluateSurface,
  faceNormal,
  evaluateCurve2,
  evaluateCurve3,
  type SurfaceSample,
} from "./evaluate.ts";
export {
  nurbsSurfaceToPatches,
  nurbsCurveToSegments,
  type NurbsCurve,
  type NurbsSurface,
} from "./nurbs.ts";
export { BrepBuilder, type BrepUse, type SurfaceIdentity } from "./build.ts";
export { validateBrep, type BrepProblem } from "./validate.ts";
export { readBrepExtension, writeBrepExtension } from "./gltf.ts";
export {
  tessellateBrep,
  faceTrim,
  type FaceTrim,
  type BrepMesh,
  type TessellateOptions,
} from "./tessellate.ts";
export {
  MAX_CELLS,
  MAX_GPU_DEGREE,
  NO_TRIM,
  SPAN_WORDS,
  TRIM_PENDING,
  diceCounts,
  diceDensity,
  diceSpan,
  evaluateSpan,
  packGpuPatches,
  prepareGpuPatches,
  spanError,
  type GpuFace,
  type GpuPatchData,
  type GpuPatches,
  type GpuSpan,
  type PrepareOptions,
} from "./gpuPatches.ts";
export {
  MAX_TRIM_BANDS,
  TRIM_BAND_WORDS,
  TRIM_HEADER_WORDS,
  TRIM_SEGMENT_WORDS,
  buildFaceTrim,
  trimCovers,
  trimCrossings,
  trimTolerance,
  type FaceTrimData,
  type TrimToleranceInput,
} from "./gpuTrims.ts";
