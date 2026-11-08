export {
  Engine,
  type EngineOptions,
  type FrameStats,
  type GlobeOptions,
} from "./scene/Engine.ts";
export { type ShaderOverrides } from "./scene/RenderContext.ts";
export {
  CustomShader,
  type CustomShaderOptions,
  type NamedType,
  type ShaderControl,
  type TextureSource,
  type TextureUniform,
  type UniformDeclaration,
  type UniformType,
  type ValueUniform,
  type SlangCache,
  type CompiledSlangEntry,
} from "./scene/CustomShader.ts";
export { memorySlangCache } from "./scene/slangCache.ts";
export {
  PointSource,
  type PointProperty,
  type PointPropertyType,
  type PointSourceOptions,
} from "./vector/PointSource.ts";
export { VectorLayer, type VectorLayerOptions } from "./vector/VectorLayer.ts";
export {
  compileVectorStyle,
  type CompiledStyle,
  type StyleField,
  type StyleLayer,
  type StyleParameter,
  type StyleScale,
  type VectorStyleDocument,
} from "./vector/VectorStyle.ts";
export { ModelPool } from "./vector/ModelPool.ts";
export {
  FeatureStyle,
  type FeatureStyleOptions,
  type StyleExpression,
} from "./scene/FeatureStyle.ts";
export {
  World,
  type DrawHandle,
  type DrawOptions,
  type MaterialOptions,
  type MeshHandle,
  type TextureBinding,
  type TextureSetOptions,
  type Usage,
  type WorldMemory,
  type SubmissionMode,
  type TransformHandle,
  type InstanceOptions,
  type CastRay,
  type CastOptions,
} from "./scene/World.ts";
export {
  lightReach,
  type LightHandle,
  type LightOptions,
} from "./scene/lights.ts";
export {
  type HeightReference,
  type Clamp,
  type ClampOptions,
} from "./scene/HeightClamping.ts";
export {
  View,
  CanvasTarget,
  OffscreenTarget,
  type HdrImage,
  type Exposure,
  DAYLIGHT_EXPOSURE,
  EYE,
  UNITLESS_EXPOSURE,
  ev100ToScale,
  type OutputEncoding,
  type ToneMapping,
  type Translucency,
  type ViewBackground,
  type PickResult,
  type RenderTarget,
  type Viewport,
} from "./scene/View.ts";
export {
  ViewLink,
  type ViewLinkMode,
  type ViewLinkOptions,
} from "./scene/ViewLink.ts";
export { Camera, type CameraPose } from "./scene/Camera.ts";
export { OrbitController } from "./scene/OrbitController.ts";
export {
  InspectController,
  enuBasis,
  orbitBasis,
  orbitPose,
  type InspectControllerOptions,
  type OrbitBasis,
  type OrbitFrame,
} from "./scene/InspectController.ts";
export { GlobeController } from "./scene/GlobeController.ts";
export {
  collectFullDetailContents,
  type TileContent,
} from "./tiles/fullDetail.ts";
export {
  Tileset3D,
  type PurposeStats,
  type TilesetEvents,
  type TilesetOptions,
  type TilesetStats,
} from "./streaming/Tileset3D.ts";
export {
  StepwiseSelection,
  REQUEST_PURPOSES,
  type RequestPurpose,
  type SelectionView,
} from "./streaming/Stepwise.ts";
export { GlobeStepwiseSelection } from "./globe/GlobeStepwise.ts";
export {
  BingImagery,
  IonTmsImagery,
  UrlTemplateImagery,
  type ImageryProvider,
} from "./globe/ImageryProvider.ts";
export {
  GlobeImagery,
  type GlobeImageryOptions,
} from "./globe/GlobeImagery.ts";
export {
  MAX_TERRAIN_CLIP_VERTICES,
  type TerrainClip,
  type TerrainClipPosition,
  type TerrainClipRectangle,
  type TerrainClipRegion,
} from "./globe/terrainClip.ts";
export { MAX_TERRAIN_CLIPS } from "./render/layout.ts";
export {
  BudgetedSelection,
  type BudgetedOptions,
} from "./streaming/Budgeted.ts";
export { Tile, tileHeaderKey, type TileGeometry } from "./streaming/Tile.ts";
export {
  createBillboard,
  createBox,
  createSurfacePatch,
  type MeshData,
  type SurfacePatch,
} from "./scene/meshes.ts";
export { GpuDevice, type Capabilities } from "./gpu/GpuDevice.ts";
export {
  BASE_BINDING_LIMITS,
  BASE_CAPACITY_LIMITS,
  type LimitsTier,
} from "./gpu/limits.ts";
export { SlicePool } from "./globe/SlicePool.ts";
export { CapacityError, isCapacityError } from "./scene/CapacityError.ts";
export {
  Ellipsoid,
  cartographic,
  fromDegrees,
  type Cartographic,
} from "./math/ellipsoid.ts";
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
} from "./engineering/EngineeringFrame.ts";
export {
  placeReprojected,
  placeRigid,
  type PlacementMode,
  type TilesetPlacement,
} from "./engineering/placement.ts";
export {
  ALIGNMENTS_EXTENSION,
  ENGINEERING_FRAME_EXTENSION,
  GeoreferenceError,
  alignmentsExtension,
  type DeclaredCrs,
  type DeclaredPlacement,
  type GeoreferenceSources,
  type TilesetGeoreference,
} from "./engineering/georeference.ts";
export {
  checkRigidTransform,
  georeferenceTileset,
  readGeoreference,
} from "./engineering/georeferenceTileset.ts";
export { WKT2_CRS_KEYWORDS, wkt2Problem } from "./engineering/wkt2.ts";
// @internal, both: for the frames explorer, whose catalog uses only the index.
export { projTokenProblem } from "./engineering/wkt2.ts";
export { strictWkt2 } from "./engineering/crs.ts";
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
} from "./engineering/alignment.ts";
export { fresnel } from "./engineering/fresnel.ts";
export {
  DESIGN_NOT_INVERTED,
  pickDesign,
  type DesignPick,
  type PickCamera,
  type PickView,
} from "./engineering/pick.ts";
// Snapping, split as 1.x splits Scene#snap (client) and SnapService
// (server); plan 5 replaces the CPU client side with a GPU snap pass.
export {
  ClientSnapService,
  GEOMETRY_NOT_RETAINED,
  SNAP_SERVER_FAILED,
  SNAP_SERVER_REFUSED,
  SNAP_UPDATE_FAILED,
  refiningSnap,
  type ServiceSnapRequest,
  type SnapCamera,
  type SnapRequest,
  type SnapResult,
  type SnapService,
} from "./engineering/snap.ts";
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
} from "./engineering/proj.ts";
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
} from "./engineering/projApi.ts";
export { GridCatalog, type GridEntry } from "./engineering/gridCatalog.ts";
export {
  crsDefinition,
  crsUnits,
  listOperations,
  MOON_GEOGRAPHIC_CRS,
  resolveOperation,
  type AreaOfInterest,
  type BetterCandidate,
  type CrsRef,
  type CrsUnits,
  type ListOperationsOptions,
  type OperationCandidate,
  type RecordedOperation,
  type ResolveOptions,
} from "./engineering/crs.ts";
export {
  formatPipeline,
  parsePipeline,
  pipelineGrids,
  type GridKey,
  type ParamValue,
  type Pipeline,
  type PipelineGrid,
  type PipelineStep,
} from "./engineering/pipeline.ts";
export { gridFactors, type GridFactors } from "./engineering/factors.ts";
export { eastNorthUpToFixedFrame } from "./math/transforms.ts";
export * as vec3 from "./math/vec3.ts";
export * as mat4 from "./math/mat4.ts";
export {
  type FeatureTable,
  type FeatureValue,
  type GltfAsset,
} from "./io/gltfTypes.ts";
export {
  ionDefaults,
  resolveIonAsset,
  resolveUri,
  type IonAsset,
  type IonAttribution,
  type IonOptions,
} from "./io/ion.ts";
export { resolveITwinIModel, type ITwinOptions } from "./io/itwin.ts";
export {
  STAGES,
  summarizeContent,
  type ContentSummary,
  type ContentTotals,
  type Stage,
  type StageStats,
} from "./streaming/pipeline.ts";
export {
  ModelPlacement,
  ModelResource,
  modelUsage,
  type ModelInstances,
  type ModelResourceOptions,
  type ModelUsage,
  type PlacementOptions,
} from "./scene/gltfModel.ts";
export {
  EngineErrors,
  type EngineError,
  type EngineErrorKind,
} from "./gpu/EngineErrors.ts";
export { MaterialFlags } from "./render/layout.ts";
export {
  DAYLIGHT_SUN_ILLUMINANCE,
  UNITLESS_SUN_ILLUMINANCE,
  type ViewLighting,
} from "./render/layout.ts";
export {
  DEFAULT_SKY,
  UNITLESS_SKY,
  type SkyOptions,
} from "./gpu/Environment.ts";

// Time: the scene's clock and the sun's position from it (plan §13.13).
export { Clock, type ClockMode } from "./time/Clock.ts";
export { icrfToFixed } from "./time/celestial.ts";
export {
  MOON_ALBEDO,
  MOON_RADIUS,
  moonAxes,
  moonPosition,
} from "./time/moon.ts";
export { CESIUM_MOON_TERRAIN } from "./io/moonMap.ts";
export { loadIonMoonMap, type MoonMap } from "./io/moonMapLoad.ts";
export {
  greenwichSiderealTime,
  julianDate,
  sunDirection,
  sunElevation,
  sunTimes,
  type SunTimes,
} from "./time/sun.ts";

// The atmosphere's haze: kinds of aerosols (Engine.visibility, .aerosol).
export { AEROSOLS, type AerosolType } from "./atmosphere/model.ts";

// Frames: exact time scales, Earth orientation and ephemerides (data from `npm run setup`).
export { Instant } from "./time/Instant.ts";
export { LeapSeconds } from "./time/leapSeconds.ts";
export { EarthOrientationParameters, type EopSample } from "./time/eop.ts";
export { celestialToTerrestrial } from "./time/earthOrientation.ts";
export { tdbMinusTt } from "./time/erfa/dtdb.ts";
export { Ephemeris } from "./ephemeris/Ephemeris.ts";
export {
  FRAME_DATA_ROLES,
  loadFrameData,
  type FrameData,
  type FrameDataWarning,
} from "./ephemeris/loadFrameData.ts";
export { readWithProgress, type LoadProgress } from "./io/readWithProgress.ts";
export { Frame, frameTransform, type FrameOptions } from "./frames/Frame.ts";
export type { FrameAccuracy } from "./frames/frameAccuracy.ts";
export {
  pointAccuracy,
  dominantTerm,
  type PointAccuracy,
  type PointAccuracyTerm,
} from "./frames/pointAccuracy.ts";
export { rotationPart, toParentMatrix } from "./frames/matrix.ts";
export {
  C,
  GM_SUN,
  GM_EARTH,
  GM_MOON,
  L_C,
  EARTH_ROTATION_RATE,
} from "./measure/constants.ts";
export {
  measure,
  measureSpan,
  type AlignmentMeasurement,
  type DesignMeasurement,
  type MeasurePoint,
  type Measurement,
  type MeasureOptions,
} from "./measure/measure.ts";
export { properTimeRate, type Leg } from "./measure/doppler.ts";
export {
  earthOrientationSigma,
  type AccuracyStatement,
  type AccuracyTerm,
  type EarthOrientationSigma,
  type WarningCode,
} from "./measure/accuracy.ts";
export { surfaceDistance, type SurfaceDistance } from "./measure/surface.ts";
export {
  terrainLineOfSight,
  type TerrainLineOfSight,
  type TerrainLineOfSightOptions,
} from "./measure/terrainLineOfSight.ts";
export {
  castTerrainRay,
  type TerrainRayOptions,
  type TerrainRayPatch,
  type TerrainRayResult,
  type TerrainRayTarget,
  type TerrainRayTile,
} from "./globe/terrainRay.ts";
export { LEVEL_ZERO_ERROR } from "./globe/TerrainSource.ts";
export type { ShapiroBody } from "./measure/lightTime.ts";
export { EARTH, MOON, type Body } from "./scene/Body.ts";
export { frameBias } from "./time/erfa/bias.ts";
export { createFrames, type Frames } from "./frames/frames.ts";
export { createSkyState, skyState, type SkyState } from "./frames/sky.ts";
export {
  framePoint,
  convertPoint,
  eastNorthUpFrame,
  worldTransformFrame,
  type FramePoint,
} from "./frames/local.ts";
export {
  Trajectory,
  type TrajectoryAccuracy,
} from "./trajectory/Trajectory.ts";
export { parseOem, type OemSegment } from "./trajectory/oem.ts";
export { readSpk, type StateSegment } from "./ephemeris/spk.ts";
