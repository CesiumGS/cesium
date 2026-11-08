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
export type { FrameAccuracy } from "./frameAccuracy.ts";
export {
  pointAccuracy,
  dominantTerm,
  type PointAccuracy,
  type PointAccuracyTerm,
} from "./pointAccuracy.ts";
export {
  earthOrientationSigma,
  type EarthOrientationSigma,
} from "./orientationSigma.ts";
export { rotationPart, toParentMatrix } from "./matrix.ts";
export { createFrames, type Frames } from "./frames.ts";
export {
  createFrameCatalog,
  type CatalogFrameName,
  type FrameCatalog,
  type FrameCatalogOptions,
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
export {
  attachSky,
  type AttachSkyOptions,
  type SkyInputs,
} from "./attachSky.ts";
