// The protocol table of the worker-mode façade: the thread kind of every name
// in `api/surface.txt` (docs/superpowers/plans/2026-11-13-worker-facade.md,
// section 1, "Exported names by entry point"). The encoder, the decoder and the
// parity test read this table, and `test/threadProtocol.test.ts` compares it
// with the surface map, so a new export can't skip the classification.
//
// There are three kinds:
//
// - `type`: an interface or type alias that carries data or describes a shape.
//   It crosses as data and needs nothing from the façade.
// - `local`: pure functions, constants and value classes with no engine state
//   (math, the frames, time and projection computations, builders of plain
//   data). They run on the page in both modes.
// - `engine`: touches engine state. It is a live engine object (`Engine`,
//   `World`, `View`, `Tileset3D`, a controller), a function that takes, holds
//   or returns one, or, among the interfaces and type aliases, an object the
//   engine owns or calls with its own state (a service, a GPU object, a
//   scheduler). The façade gives each a page-side shape.
//
// A name is classified by what it touches, not by its declaration, so a few
// interfaces are `engine` (the core has 20 of them) and no class is `type`.
// The kinds of the members of the engine names (the plan's second table) and
// each member's opcode, argument schema and transfer list come after this
// table, member by member.

/** The three thread kinds of an exported name. */
export type ThreadKind = "type" | "local" | "engine";

/** Every thread kind, in the table's order. */
export const THREAD_KINDS: readonly ThreadKind[] = ["type", "local", "engine"];

/** An entry's names by kind, each list written as space-separated names. */
type EntryTable = Partial<Record<ThreadKind, string>>;

/**
 * Every exported name by entry point (the key is the entry in
 * `api/surface.txt`: `.` is the core) and thread kind. Names of a namespace
 * are written as the surface map writes them (`vec3.add`).
 */
const TABLE: Record<string, EntryTable> = {
  ".": {
    type: `
      AccuracyOptions AccuracyPart AerosolType AffinePlacement AnchorHandle
      Attribution BezierCurves BlendedWarp Body BrepCapsOptions BrepCapsReport
      BrepForm BrepGeometry BrepGeometryOptions BrepMesh BrepProblem BrepUse
      BudgetedOptions BulkOptions BulkProgress CameraExposure CameraPose
      CapBias CapColor CapDrawOptions CapDraws CapFace CapHatch CapPlacement
      CapPlane CapRgba CapSchedulerOptions CapStyle CapStyleInput CapTick
      Cartographic CastOptions CastRay ChangeableWarp Clamp ClampOptions
      ClipCaps ClipEffect ClipFilter ClipSet ClipShape ClipsOption ClockChange
      ClosestPoint ClosestPointOptions CompiledSlangEntry CompiledStyle
      ContentSummary ContentTotals CorePick CorridorElement CorridorOptions
      CustomShaderOptions DebugLegend DebugLegendEntry DebugView Degree
      DisplayMesh DistanceField DrawHandle DrawOptions DualPosition ElementCap
      EngineError EngineErrorKind EngineOptions EntityInfo EntityKind
      EntityRef Exposure EyeExposure FaceTrim FeatureStyleOptions FeatureTable
      FeatureValue FittedOperation FrameKey FrameMotion FrameStats
      FromFunctionOptions FunctionWarp GeometryAccuracy GeometryBounds
      GeometryHit GeometryKind GeometryQueries GeometryRayAnswer Georeference
      GlareKernelHandle GlarePupil GlareSettings GlareTier GlobeImageryOptions
      GlobeOptions GltfAsset HdrImage HeightOffset HeightOffsetOptions
      HeightReference ITwinOptions InspectControllerOptions InstanceOptions
      IonAsset IonOptions LightHandle LightOptions LimitsTier LiveEdgeOptions
      LoadProgress LodTransitions MaterialOptions MeasureIn MeasureInOptions
      MeshCapGeometry MeshCapHit MeshCapPlane MeshCapRegion MeshCapReport
      MeshCapSurface MeshCapSurfaceHit MeshCapTile MeshCapsOptions
      MeshCapsReport MeshData MeshGeometryOptions MeshHandle MeshSource
      ModelGeometry ModelInstances ModelResourceOptions ModelUsage MoonMap
      NamedType NodePoint NurbsCurve NurbsSurface ObserverReadout
      ObserverSettings ObserverStage OrbitBasis OrbitFrame OutputEncoding
      Params PickCamera PickDomain PickHint PickInterpreter PickPoint
      PickResult Placement PlacementBlend PlacementMode PlacementOptions
      PlacementParameter PointFunction PointIn PointInOptions PointProperty
      PointPropertyType PointSourceOptions PointSpread PostStageFormat
      PostStageImage PostStageKind PostStageLevel PostStageOptions
      PostStagePass PostStageRead PostStageSlot PostStageTarget
      PostStageViewInfo PostStageViewValues PurposeStats QueryAnswer QueryRay
      RayAnswer RayHitOptions RayQuery RayTargetName RayVerdict
      ReferenceSurface RefinedPick RequestPurpose ResolveView Rig
      RigOrientation RigPosition RouteAccuracy ScaleAbout ScaleAboutOptions
      SceneItemOptions SdfGeometryOptions SectionOptions SectionOutcome
      SectionPlaneInput SectionReport SectionRequest SectionResult
      SegmentDistance SelectionView ShaderControl ShaderOverrides ShaderUnit
      SigmaIn SkyOptions SkyPackManifest SlangCache SlangPostLayout
      SlangPostShader CurvilinearEdge CurvilinearFrameSpec Stage StageInfo StageStats
      StandingQuery StyleExpression StyleField StyleLayer StyleParameter
      StyleScale SubmissionMode SurfaceIdentity SurfacePatch SurfaceSample
      TerrainQueryOptions TerrainRayOptions TerrainRayPatch TerrainRayResult
      TerrainRayTile TerrainRegion TerrainRegionOptions TerrainRegionPosition
      TerrainRegionRectangle TerrainRegionShape TessellateOptions
      TextureHandle TextureSetOptions TextureSource TextureUniform TileContent
      TileGeometry TileSection TilesetEvents TilesetOptions TilesetStats
      ToneMapping TransformFrameKey TransformHandle TranslucencyMethod
      UniformDeclaration UniformType UnknownReason UnknownSpan Usage
      ValueUniform VectorLayerOptions VectorStyleDocument VerticalExaggeration
      VerticalExaggerationOptions ViewBackground ViewLighting ViewLinkMode
      ViewLinkOptions Viewport Warp WarpScale WarpStats WorldClip WorldMemory
      mat4.Mat4 vec3.Vec3
    `,
    local: `
      AEROSOLS BASE_BINDING_LIMITS BASE_CAPACITY_LIMITS BREP_CAP_NAME
      BingImagery BrepBuilder CESIUM_MOON_TERRAIN CapacityError CustomShader
      DAYLIGHT_EXPOSURE DAYLIGHT_SUN_ILLUMINANCE DEFAULT_CAP_COLOR
      DEFAULT_CLIP_CAP_COLOR DEFAULT_IMAGERY_SLICES DEFAULT_SECTION_LINE_COLOR
      DEFAULT_SKY EARTH EYE Ellipsoid Emitter EngineErrors FeatureStyle
      FrameUnavailableError IonTmsImagery LEVEL_ZERO_ERROR MAX_ANCHORS
      MAX_CLIP_FRAGMENT_EDGES MAX_CLIP_POLYGON_VERTICES MAX_CLIP_SETS
      MAX_CLIP_SHAPES MAX_TERRAIN_CLIPS MAX_TERRAIN_CLIP_VERTICES
      MAX_WORLD_CLIPS MESH_CAP_LINE_NAME MESH_CAP_NAME MOON MOON_ALBEDO
      MaterialFlags NO_ACCELERATION PLACEMENT_MONOMIALS PLACEMENT_TERMS
      PostStageError REQUEST_PURPOSES STAGES SectionJob SurfaceKind
      TICK_REASONS TerrainRegionError TilesetBodyError UNITLESS_EXPOSURE
      UNITLESS_SKY
      UNITLESS_SUN_ILLUMINANCE UrlTemplateImagery accuracyAlong
      assembleMeshCaps bend brepGeometry bump cameraGlare cameraObserver
      capPlanes cartographic castTerrainRay clipFilter clipSetDistance
      clipSetKeeps clipSetsOf collectFullDetailContents compileVectorStyle
      corridorUnroll createBillboard createBox createSurfacePatch
      eastNorthUpToFixedFrame edgeCount enuBasis ev100ToScale evaluateCurve2
      evaluateCurve3 evaluateSurface eyeGlare eyeObserver faceCount faceNormal
      faceTrim flatten fromDegrees fromFunction geocentricToGeographic
      geographicToGeocentric holdBrowserGestures ionDefaults isCapacityError
      lambertConformalConic lambertConformalConicToGeographic lattice
      lightReach loadIonMoonMap mat4 mat4.copy mat4.fromBasis mat4.fromScale
      mat4.identity mat4.invertAffine mat4.mat4 mat4.multiply
      mat4.perspectiveReverseZInfinite mat4.setTranslation
      mat4.transformDirection mat4.transformPoint mat4.transformVec4
      mat4.viewRotation maxDisplacement measureIn memorySlangCache
      meshGeometry meshPlane nurbsCurveToSegments nurbsSurfaceToPatches
      observerPointSpread orbitBasis orbitPose placePosition pointIn
      radialDistortion rayHitRegions readBrepExtension readWithProgress
      resamplable resolveITwinIModel resolveIonAsset resolveUri runBulk
      runSection scaleAboutEdge scaleAlongAxes scaleToEv100 sdfGeometry
      secondDerivativeBound sectionBrep sectionTile slangPostShader
      summarizeContent surfaceCount taper tessellateBrep tileBounds
      tileHeaderKey timeSlices transverseMercator
      transverseMercatorToGeographic triangulateRegion twist utm
      utmToGeographic validateBrep vec3 vec3.add vec3.copy vec3.cross
      vec3.distance vec3.dot vec3.length vec3.mul vec3.negate vec3.normalize
      vec3.scale vec3.scaleAndAdd vec3.set vec3.sub vec3.vec3 velocityModel
      vertexCount webMercator webMercatorToGeographic wgslUnit
      writeBrepExtension
    `,
    engine: `
      AccelerationStructures BrepCaps BudgetedSelection Camera CameraLayer
      CanvasTarget CapEngine CapScheduler Capabilities ChainIo Engine
      FrameResolver GlareIo Globe GlobeController GlobeImagery
      GlobeStepwiseSelection GlobeTerrain GpuDevice GraphStage
      GraphStageBuilder ImageryProvider InspectController LiveEdge MeshCaps
      ModelPlacement ModelPool ModelResource OffscreenTarget OrbitController
      PointSource PostStage QueryHost RayBackend RayTarget RenderTarget
      SceneClock SceneItem SectionRunner SlicePool SliceScheduler SliceUser
      SpatialQueries StepwiseSelection TerrainRayTarget TextureBinding Tile
      Tileset3D TransformNode VectorLayer View ViewLink World
      astrophotoCurveStage blend createPostStage createSpatialQueries
      defaultRig eyeLimitStage heightOffset liveEdge modelUsage scaleAbout
      tableResolver terrainQueries verticalExaggeration
    `,
  },
  frames: {
    type: `
      AccuracyFigure AreaOfInterest AttachSkyOptions Axis CatalogFrameName
      Confidence CoordinateOperation CoordinateRequest CoordinateService
      CrsRef CrsUnits DrawPlacementInfo DrawnThrough DrawnWarp
      EarthOrientationSigma EopSample FrameAccuracy FrameCatalog
      FrameCatalogOptions FrameData FrameDataLoadOptions FrameDataRole
      FrameDataWarning FrameGraph FrameInUse FrameLoadProgress FrameOptions
      FramePiece FramePoint FrameStandInWarning FrameUser FramedPoint Frames
      FramesPickInterpreterOptions FramesResolver FramesResolverOptions
      GridFactors OemSegment PathSamples PickInOptions PickTarget PickedIn
      PiecewiseOptions PointAccuracy PointAccuracyOptions PointAccuracyTerm
      Precision ResolvedCoordinates RigPreset RigPresetName RigPresetOptions
      Route RouteTerm SharedSource SkyInputs SkyState StateSegment
      SwitchChoice SwitchFrameOptions TrajectoryAccuracy TruePick TruthHow
      TwoVectorDefinition VectorDefinition Warp WarpScale
    `,
    local: `
      EarthOrientationParameters Ephemeris FRAME_DATA_ROLES Frame
      MOON_ME_ORIENTATION_RADIANS PiecewiseFrame PiecewiseJumpError
      CurvilinearFrame SwitchFrame Trajectory TwoVectorDegenerateError
      TwoVectorFrame accuracySpan angularVelocity axesAt
      celestialToTerrestrial convertPoint createFrameCatalog createFrames
      createFramesPickInterpreter createSkyState dominantTerm drawnThrough
      earthOrientationSigma eastNorthUpFrame frameBias framePoint
      frameTransform frameVelocity isCurvilinearFrame isSwitchFrame loadFrameData
      loadFrameRoles parseOem pickIn piecewiseFrame pointAccuracy readSpk
      rigPreset rotationPart routeForward routeInverse routeLegs routeRevision
      samplePath separationAccuracy skyState curvilinearEdgeOf curvilinearFrame
      switchFrame toParentMatrix truePick twoVectorFrame warpForward
      warpInverse
    `,
    engine: `
      attachSky createFramesResolver graphOfFrames placementOf
      worldTransformFrame
    `,
  },
  measure: {
    type: `
      AccuracyStatement AccuracyTerm AlignmentMeasurement CurveOptions
      DesignMeasurement DrawnAnchor DrawnDistance DrawnDistanceOptions
      DrawnSamples DrawnView Leg MeasureOptions MeasurePoint Measurement
      ScreenScale ShapiroBody SurfaceDistance TerrainLineOfSight
      TerrainLineOfSightOptions WarningCode
    `,
    local: `
      C DrawnCurve EARTH_ROTATION_RATE GM_EARTH GM_MOON GM_SUN L_C
      drawnDistance measure measureSpan properTimeRate sampleSegment
      surfaceDistance
    `,
    engine: `
      terrainLineOfSight
    `,
  },
  proj: {
    type: `
      AlignmentDefinition AlignmentElement BetterCandidate DeclaredCrs
      DeclaredPlacement DesignPick DesignPoint DesignPointObtained
      EngineeringFrameDefinition EngineeringFrameFallback
      EngineeringFrameLoadOptions FallbackSigmaSource GeoidModel
      GeoreferenceSources GridEntry GridKey GridSource GridSourceOptions
      HorizontalElement ListOperationsOptions LoadGridsOptions LoadProjOptions
      OperationCandidate PJ ParamValue PickCamera PickView Pipeline
      PipelineGrid PipelineStep PjAxisInfo PjComparisonCriterion PjCoord
      PjDirection PjEllipsoidParameters PjFactors PjGridAvailabilityUse
      PjGridInfo PjGridUsed PjInfo PjLogLevel PjMethodInfo PjObjList
      PjOperationFactoryContext PjProjStringType PjType PjWktType ProfileGrade
      ProfileParabola ProfileSegment ProjApi ProjCoordinateRequest
      ProjRequestOptions ProjResolvedCoordinates RecordedOperation
      ReprojectionWarpOptions ResolveOptions ServiceSnapRequest SiteTransform
      SnapCamera SnapKind SnapRequest SnapResult SnapService StationOffset
      TilesetGeoreference TilesetPlacement VerticalProfile
    `,
    local: `
      ALIGNMENTS_EXTENSION Alignment DESIGN_NOT_INVERTED
      ENGINEERING_FRAME_EXTENSION EngineeringFrame GEOMETRY_NOT_RETAINED
      GeoreferenceError GridCatalog MOON_GEOGRAPHIC_CRS RigidPlacement
      SNAP_SERVER_ALWAYS_OUT_OF_SIGHT SNAP_SERVER_FAILED SNAP_SERVER_REFUSED
      SNAP_UPDATE_FAILED WKT2_CRS_KEYWORDS alignmentsExtension
      checkRigidTransform crsDefinition crsUnits designPoint
      engineeringPlacement formatPipeline fresnel gridFactors gridSource
      listOperations loadGrids loadProj loadedGrids parsePipeline
      pipelineGrids placeHosted placeReprojected placeRigid
      projCoordinateService projTokenProblem readGeoreference reprojectionWarp
      resolveOperation strictWkt2 wkt2Problem
    `,
    engine: `
      ClientSnapService georeferenceTileset pickDesign refiningSnap
      tilesetGeoreference
    `,
  },
  time: {
    type: `
      ClockMode SunTimes TimeParts TimeZone ZoneLookup
    `,
    local: `
      Clock Instant LeapSeconds MOON_RADIUS greenwichSiderealTime
      ianaAbbreviation ianaOffsetMinutes icrfToFixed julianDate moonAxes
      moonPosition placeZone sunDirection sunElevation sunPosition sunTimes
      tdbMinusTt timeParts
    `,
  },
  widgets: {
    type: `
      ContentMix CreditSource CreditsHandle EngineInspectOptions
      EngineSnapshotOptions GlobeKind Inspectable InspectorHandle
      InspectorOptions InspectorSnapshot MemoryRow ModelLoad
      ObserverControlKind ObserverPanelHandle ObserverPanelOptions
      ObserverPanelSection OrbitContext OrbitOptions OrbitPlan PickInfo
      StagePercentiles TickEvent TilesetSource TimeControlsHandle
      TimeControlsOptions TimeMark TimeZoneChoice ViewerOptions ViewerWarning
      ZoomTarget
    `,
    local: `
      planOrbit zoneOf
    `,
    engine: `
      Viewer attachCredits attachInspector attachObserverPanel
      attachTimeControls engineSnapshot followZoom inspectEngine orbitState
    `,
  },
};

/** One row of the protocol table. */
export interface ProtocolRow {
  readonly entry: string;
  readonly name: string;
  readonly kind: ThreadKind;
}

/** A row of `api/surface.txt`: what the check needs of it. */
export interface SurfaceRow {
  readonly entry: string;
  readonly name: string;
  /** The declaration kind in the surface map (`class`, `interface`...). */
  readonly kind: string;
}

/** What `checkProtocol` found wrong, each as a sentence naming the row. */
export interface ProtocolProblems {
  /** Exports in the surface map with no kind. */
  readonly unclassified: string[];
  /** Names in the table that the surface map no longer exports. */
  readonly stale: string[];
  /** Names the table lists under more than one kind, or twice. */
  readonly duplicated: string[];
  /** Names classified `type` that are not an interface or a type alias. */
  readonly misclassified: string[];
}

const split = (list: string | undefined): string[] =>
  list === undefined ? [] : list.split(/\s+/).filter((n) => n.length > 0);

/** The table, one row per name, in the order the table lists them. */
export function protocolRows(table: Record<string, EntryTable> = TABLE) {
  const rows: ProtocolRow[] = [];
  for (const [entry, kinds] of Object.entries(table)) {
    for (const kind of THREAD_KINDS) {
      for (const name of split(kinds[kind])) {
        rows.push({ entry, name, kind });
      }
    }
  }
  return rows;
}

const key = (entry: string, name: string) => `${entry}\t${name}`;

const kinds = new Map<string, ThreadKind>(
  protocolRows().map((row) => [key(row.entry, row.name), row.kind]),
);

/** The kind of `name` in `entry`, or `undefined` when the table has none. */
export function threadKindOf(
  entry: string,
  name: string,
): ThreadKind | undefined {
  return kinds.get(key(entry, name));
}

/**
 * Compares the table with the surface map's rows. Every row needs exactly one
 * kind, nothing in the table may be missing from the surface map, and a name
 * the surface map declares as a class, function, constant, enum or namespace
 * is never a `type`.
 */
export function checkProtocol(
  surface: readonly SurfaceRow[],
  rows: readonly ProtocolRow[] = protocolRows(),
): ProtocolProblems {
  const listed = new Map<string, ThreadKind[]>();
  for (const row of rows) {
    const k = key(row.entry, row.name);
    listed.set(k, [...(listed.get(k) ?? []), row.kind]);
  }
  const unclassified: string[] = [];
  const misclassified: string[] = [];
  const seen = new Set<string>();
  for (const row of surface) {
    const k = key(row.entry, row.name);
    seen.add(k);
    const kind = listed.get(k)?.[0];
    const label = `${row.entry === "." ? "" : `${row.entry}:`}${row.name}`;
    if (kind === undefined) {
      unclassified.push(`${label} has no thread kind`);
    } else if (
      kind === "type" &&
      row.kind !== "interface" &&
      row.kind !== "type"
    ) {
      misclassified.push(`${label} is a ${row.kind}, not a type`);
    }
  }
  const stale = [...listed.keys()]
    .filter((k) => !seen.has(k))
    .map((k) => `${k.replace("\t", " ")} is not in the surface map`);
  const duplicated = [...listed]
    .filter(([, list]) => list.length > 1)
    .map(
      ([k, list]) =>
        `${k.replace("\t", " ")} is listed ${list.length} times (${list.join(", ")})`,
    );
  return { unclassified, stale, duplicated, misclassified };
}
