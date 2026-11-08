// @cesium/next/proj: engineering frames over PROJ, tileset placements and
// their declarations, alignments, design picks and snapping.
export {
  EngineeringFrame,
  RigidPlacement,
  designPoint,
  type DesignPoint,
  type DesignPointObtained,
  type EngineeringFrameDefinition,
  type EngineeringFrameFallback,
  type EngineeringFrameLoadOptions,
  type FallbackSigmaSource,
  type GeoidModel,
  type SiteTransform,
  type SnapKind,
} from "../engineering/EngineeringFrame.ts";
export {
  engineeringPlacement,
  placeHosted,
  placeReprojected,
  placeRigid,
  type TilesetPlacement,
} from "../engineering/placement.ts";
export {
  projCoordinateService,
  type ProjCoordinateRequest,
  type ProjRequestOptions,
  type ProjResolvedCoordinates,
} from "../engineering/projCoordinates.ts";
export {
  ALIGNMENTS_EXTENSION,
  ENGINEERING_FRAME_EXTENSION,
  GeoreferenceError,
  alignmentsExtension,
  type DeclaredCrs,
  type DeclaredPlacement,
  type GeoreferenceSources,
  type TilesetGeoreference,
} from "../engineering/georeference.ts";
export {
  checkRigidTransform,
  georeferenceTileset,
  readGeoreference,
  tilesetGeoreference,
} from "../engineering/georeferenceTileset.ts";
export { WKT2_CRS_KEYWORDS, wkt2Problem } from "../engineering/wkt2.ts";
// @internal, both: for the frames explorer, whose catalog uses only the index.
export { projTokenProblem } from "../engineering/wkt2.ts";
export { strictWkt2 } from "../engineering/crs.ts";
export {
  Alignment,
  type AlignmentDefinition,
  type AlignmentElement,
  type HorizontalElement,
  type ProfileGrade,
  type ProfileParabola,
  type ProfileSegment,
  type StationOffset,
  type VerticalProfile,
} from "../engineering/alignment.ts";
export { fresnel } from "../engineering/fresnel.ts";
export {
  DESIGN_NOT_INVERTED,
  pickDesign,
  type DesignPick,
  type PickCamera,
  type PickView,
} from "../engineering/pick.ts";
// Snapping, split as 1.x splits Scene#snap (client) and SnapService
// (server); plan 5 replaces the CPU client side with a GPU snap pass.
export {
  ClientSnapService,
  GEOMETRY_NOT_RETAINED,
  SNAP_SERVER_FAILED,
  SNAP_SERVER_ALWAYS_OUT_OF_SIGHT,
  SNAP_SERVER_REFUSED,
  SNAP_UPDATE_FAILED,
  refiningSnap,
  type ServiceSnapRequest,
  type SnapCamera,
  type SnapRequest,
  type SnapResult,
  type SnapService,
} from "../engineering/snap.ts";
export {
  gridSource,
  loadedGrids,
  loadGrids,
  loadProj,
  type GridSource,
  type GridSourceOptions,
  type LoadGridsOptions,
  type LoadProjOptions,
  type ProjApi,
} from "../engineering/proj.ts";
// The types ProjApi's methods name (proj.js's C API, handles and records).
export type {
  PJ,
  PjAxisInfo,
  PjComparisonCriterion,
  PjCoord,
  PjDirection,
  PjEllipsoidParameters,
  PjFactors,
  PjGridAvailabilityUse,
  PjGridInfo,
  PjGridUsed,
  PjInfo,
  PjLogLevel,
  PjMethodInfo,
  PjObjList,
  PjOperationFactoryContext,
  PjProjStringType,
  PjType,
  PjWktType,
} from "../engineering/projApi.ts";
export { GridCatalog, type GridEntry } from "../engineering/gridCatalog.ts";
export {
  crsDefinition,
  crsUnits,
  listOperations,
  MOON_GEOGRAPHIC_CRS,
  resolveOperation,
  type BetterCandidate,
  type ListOperationsOptions,
  type OperationCandidate,
  type RecordedOperation,
  type ResolveOptions,
} from "../engineering/crs.ts";
export {
  formatPipeline,
  parsePipeline,
  pipelineGrids,
  type GridKey,
  type ParamValue,
  type Pipeline,
  type PipelineGrid,
  type PipelineStep,
} from "../engineering/pipeline.ts";
export { gridFactors } from "../engineering/factors.ts";
// AreaOfInterest, CrsRef, CrsUnits and GridFactors are the frames entry's
// (with the coordinate service they belong to; the plan's call 36).
