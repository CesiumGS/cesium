// @cesium/next: the engine. The time library, the frames module, PROJ and
// engineering frames, and measuring are their own entry points
// (`@cesium/next/time`, `/frames`, `/proj`, `/measure`); the core imports
// none of them (spec section 7.7, test/importBoundary.test.ts).
export type { ClockChange, SceneClock } from "./core/sceneClock.ts";
export { Emitter } from "./core/Emitter.ts";
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
export { World } from "./scene/World.ts";
export {
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
  type AnchorHandle,
  type TransformFrameKey,
  type InstanceOptions,
  type CastRay,
  type CastOptions,
} from "./scene/world/types.ts";
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
  type HdrImage,
  type OutputEncoding,
  type TranslucencyMethod,
  type ViewBackground,
  type PickResult,
} from "./scene/View.ts";
export {
  type Aperture,
  type Exposure,
  type GlareSettings,
  type GlareTier,
  type ObserverReadout,
  type ObserverSettings,
  type PointSpread,
  type ToneMapping,
  DAYLIGHT_EXPOSURE,
  EYE,
  UNITLESS_EXPOSURE,
  cameraObserver,
  ev100ToScale,
  eyeObserver,
  scaleToEv100,
} from "./scene/observer.ts";
export {
  CanvasTarget,
  OffscreenTarget,
  type RenderTarget,
  type Viewport,
} from "./scene/renderTarget.ts";
export type { CorePick, PickCamera, PickInterpreter } from "./scene/pick.ts";
export {
  PLACEMENT_MONOMIALS,
  PLACEMENT_TERMS,
  maxDisplacement,
  placePosition,
  resamplable,
  secondDerivativeBound,
  type AffinePlacement,
  type DualPosition,
  type FittedOperation,
  type Placement,
  type PlacementBlend,
  type PlacementParameter,
} from "./scene/placement.ts";
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
export { Tileset3D } from "./streaming/Tileset3D.ts";
export {
  type PurposeStats,
  type TilesetEvents,
  type TilesetOptions,
  type TilesetStats,
} from "./streaming/tilesetTypes.ts";
export type {
  DesignPlacement,
  PlacementMode,
} from "./streaming/designPlacement.ts";
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
  DEFAULT_IMAGERY_SLICES,
  GlobeImagery,
  type GlobeImageryOptions,
} from "./globe/GlobeImagery.ts";
export {
  MAX_CLIP_FRAGMENT_EDGES,
  MAX_TERRAIN_CLIP_VERTICES,
  TerrainRegionError,
  type TerrainRegionPosition,
  type TerrainRegionRectangle,
  type TerrainRegionShape,
} from "./globe/terrainClip.ts";
export {
  Globe,
  GlobeTerrain,
  type TerrainRegion,
  type TerrainRegionOptions,
} from "./globe/Globe.ts";
export { MAX_ANCHORS, MAX_TERRAIN_CLIPS } from "./render/layout.ts";
export {
  BudgetedSelection,
  type BudgetedOptions,
} from "./streaming/Budgeted.ts";
export { Tile, tileHeaderKey, type TileGeometry } from "./streaming/Tile.ts";
export { SceneItem, type SceneItemOptions } from "./scene/SceneItem.ts";
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
export { SlicePool, type SliceUser } from "./globe/SlicePool.ts";
export { CapacityError, isCapacityError } from "./scene/CapacityError.ts";
export {
  Ellipsoid,
  cartographic,
  fromDegrees,
  type Cartographic,
} from "./math/ellipsoid.ts";
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
  type IonAsset,
  type Attribution,
  type IonOptions,
} from "./io/ion.ts";
export { resolveUri } from "./io/resolveUri.ts";
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
export { MOON_ALBEDO } from "./atmosphere/moonLight.ts";
export { CESIUM_MOON_TERRAIN } from "./io/moonMap.ts";
export { loadIonMoonMap, type MoonMap } from "./io/moonMapLoad.ts";

// The atmosphere's haze: kinds of aerosols (Engine.visibility, .aerosol).
export { AEROSOLS, type AerosolType } from "./atmosphere/model.ts";
export { readWithProgress, type LoadProgress } from "./io/readWithProgress.ts";
export {
  castTerrainRay,
  type TerrainRayOptions,
  type TerrainRayPatch,
  type TerrainRayResult,
  type TerrainRayTarget,
  type TerrainRayTile,
} from "./globe/terrainRay.ts";
export { LEVEL_ZERO_ERROR } from "./globe/TerrainSource.ts";
// One query interface for rays (spec section 7.10): Engine.queries, or
// terrainQueries over a terrain built by hand; a later engine plugs in
// through createSpatialQueries.
export {
  createSpatialQueries,
  type QueryAnswer,
  type QueryHost,
  type QueryRay,
  type RayAnswer,
  type RayBackend,
  type RayQuery,
  type RayTarget,
  type RayVerdict,
  type SpatialQueries,
  type StandingQuery,
  type TerrainQueryOptions,
  type UnknownReason,
  type UnknownSpan,
} from "./query/queries.ts";
export { terrainQueries } from "./query/terrainBackend.ts";
export {
  NO_ACCELERATION,
  type AccelerationStructures,
} from "./streaming/acceleration.ts";
export { EARTH, MOON, type Body } from "./scene/Body.ts";
export {
  FrameUnavailableError,
  type FrameKey,
  type FrameMotion,
  type FrameResolver,
} from "./camera/frameResolver.ts";
export { tableResolver } from "./camera/tableResolver.ts";
export {
  defaultRig,
  type Rig,
  type RigOrientation,
  type RigPosition,
} from "./camera/rig.ts";
export { CameraLayer } from "./camera/CameraLayer.ts";
