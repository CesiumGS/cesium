// @cesium/next/frames: reference frames, Earth orientation, ephemerides,
// trajectories and the sky from frames data (`npm run setup` fetches it).
export { EarthOrientationParameters, type EopSample } from "../time/eop.ts";
export { celestialToTerrestrial } from "../time/earthOrientation.ts";
export { frameBias } from "../time/erfa/bias.ts";
export { Ephemeris } from "../ephemeris/Ephemeris.ts";
export {
  FRAME_DATA_ROLES,
  loadFrameData,
  loadFrameRoles,
  type FrameData,
  type FrameDataLoadOptions,
  type FrameDataRole,
  type FrameDataWarning,
} from "../ephemeris/loadFrameData.ts";
export { readSpk, type StateSegment } from "../ephemeris/spk.ts";
export {
  Frame,
  frameTransform,
  routeRevision,
  type FrameOptions,
} from "./Frame.ts";
export type {
  AccuracyFigure,
  Confidence,
  FrameAccuracy,
  SharedSource,
} from "./frameAccuracy.ts";
export {
  pointAccuracy,
  separationAccuracy,
  routeLegs,
  dominantTerm,
  type PointAccuracy,
  type PointAccuracyOptions,
  type PointAccuracyTerm,
  type RouteTerm,
} from "./pointAccuracy.ts";
export {
  earthOrientationSigma,
  type EarthOrientationSigma,
} from "./orientationSigma.ts";
export { rotationPart, toParentMatrix } from "./matrix.ts";
export { MOON_ME_ORIENTATION_RADIANS } from "./frameAccuracy.ts";
export {
  twoVectorFrame,
  axesAt,
  TwoVectorFrame,
  TwoVectorDegenerateError,
  type Axis,
  type TwoVectorDefinition,
  type VectorDefinition,
} from "./twoVector.ts";
export {
  rigPreset,
  type RigPreset,
  type RigPresetName,
  type RigPresetOptions,
} from "./presets.ts";
export {
  piecewiseFrame,
  PiecewiseFrame,
  PiecewiseJumpError,
  type FramePiece,
  type PiecewiseOptions,
} from "./piecewise.ts";
export { samplePath, accuracySpan, type PathSamples } from "./bulk.ts";
export { frameVelocity, angularVelocity } from "./motion.ts";
export { createFrames, type Frames } from "./frames.ts";
export {
  createFrameCatalog,
  type CatalogFrameName,
  type FrameCatalog,
  type FrameCatalogOptions,
  type FrameLoadProgress,
  type FrameInUse,
  type FrameUser,
  type Precision,
} from "./catalog.ts";
export { createSkyState, skyState, type SkyState } from "./sky.ts";
export {
  framePoint,
  convertPoint,
  eastNorthUpFrame,
  worldTransformFrame,
  type FramePoint,
} from "./local.ts";
export {
  Trajectory,
  type TrajectoryAccuracy,
} from "../trajectory/Trajectory.ts";
export { parseOem, type OemSegment } from "../trajectory/oem.ts";
export {
  createFramesResolver,
  type FramesResolver,
  type FramesResolverOptions,
  type FrameStandInWarning,
} from "./resolver.ts";
export { placementOf, type DrawPlacementInfo } from "./placementQuery.ts";
export {
  createFramesPickInterpreter,
  type FramedPoint,
  type FramesPickInterpreterOptions,
} from "./pickInterpreter.ts";
export type {
  AreaOfInterest,
  CoordinateOperation,
  CoordinateRequest,
  CoordinateService,
  CrsRef,
  CrsUnits,
  GridFactors,
  ResolvedCoordinates,
} from "./coordinates.ts";
export {
  attachSky,
  type AttachSkyOptions,
  type SkyInputs,
} from "./attachSky.ts";
