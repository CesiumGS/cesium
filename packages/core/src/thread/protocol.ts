// The protocol table of the worker-mode façade, in two parts
// (docs/superpowers/plans/2026-11-13-worker-facade.md, section 1).
//
// 1. The thread kind of every exported name in `api/surface.txt` ("Exported
//    names by entry point"). The encoder, the decoder and the parity test read
//    this table, and `test/threadProtocol.test.ts` compares it with the surface
//    map, so a new export can't skip the classification.
// 2. The kind of every public member of the engine names that are classes or
//    interfaces ("Members of the engine types, by kind"). The surface map
//    lists exports, not members, so `scripts/surfaceMap.mjs`'s `memberRows`
//    lists them with the TypeScript checker, and the same test compares that
//    list with this table. A new member of an engine type, or one that is gone,
//    fails it by name.
//
// No count is pinned anywhere: a change that adds or removes an export or a
// member adds or removes one name here. `checkProtocol` finds a name with no
// kind (unclassified), a name the code no longer has (stale), a name listed
// twice (duplicated) and a kind the declaration can't have (misclassified).
//
// There are three kinds of exported name:
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
//
// A member of an engine type has one of ten kinds, by what the façade does
// with it. A member is classified by its declaration and its documented use;
// a closure an argument carries is the arguments' business (the schema that
// follows this table), not a reason for a different kind.
//
// - `snapshot`: a read of a value the page mirrors (what the app wrote) or of
//   a snapshot field (what the engine computed). Zero-argument methods that
//   only read (`pixelRect()`) are snapshots too.
// - `command`: a call with no reply, sent as an ordered message.
// - `handle`: a call that makes something and returns a handle the page names
//   itself (an `add...`, a `create...`, an index into a table).
// - `query`: the answer is a promise, a promise property included.
// - `event`: a notification delivered on the page after the tick (a listener
//   registration, an emitter).
// - `sync-read`: a read that takes arguments and can't be a snapshot (a
//   lookup by handle, a computation against engine state); the page's mirror
//   answers it, or it needs section 2.2's answer.
// - `mutation`: written in place by the app (a setter, a field the app
//   assigns, an object whose contents it changes, such as `Camera.position`),
//   so a write sends a command.
// - `callback`: a function or an object the app supplies that the engine
//   calls inside the tick (`Engine.onTick`, `FrameResolver.resolve`, the
//   members of an interface the engine calls), or a member that registers one.
// - `dom`: bound to the page's DOM (a canvas, an element, a controller's
//   input handling); it stays on the page.
// - `cannot-cross`: can't cross as it stands: it holds or takes a GPU object
//   or the render context, or it is an engine internal the package exports
//   today (tagged `@internal`, or the tile graph's links). These move to an
//   advanced, main-thread-only entry or become a module (CS-107).
//
// Where a member's kind is a call the plan doesn't settle, the rule above
// decides: an engine-written counter or flag the app only reads is a
// `snapshot` even when its declaration is writable; `GpuDevice` is wholly
// `cannot-cross` (a device can't cross threads) while `Capabilities`, plain
// data the device reports, is `snapshot`. The opcode, argument schema and
// transfer list of each member come after this table.

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
      Attribution BezierCurves BlendedCurvilinearMap Body BrepCapsOptions BrepCapsReport
      BrepForm BrepGeometry BrepGeometryOptions BrepMesh BrepProblem BrepUse
      BudgetedOptions BulkOptions BulkProgress CameraDistortion
      CameraDistortionModel CameraExposure CameraIntrinsics CameraPose
      CameraRecord CameraRecordPose
      CapBias CapColor CapDrawOptions CapDraws CapFace CapHatch CapPlacement
      EmbeddingSpace EmbeddingTable Embeddings Identified Identity
      IdentityDeclaration Labels PickBasis StableId StableKey
      TaxonomyDeclaration
      CapPlane CapRgba CapSchedulerOptions CapStyle CapStyleInput CapTick
      Cartographic CastOptions CastRay ChangeableCurvilinearMap Clamp ClampOptions
      ClipCaps ClipEffect ClipFilter ClipSet ClipShape ClipsOption ClockChange
      ClosestPoint ClosestPointOptions CompiledSlangEntry CompiledStyle
      ContentSummary ContentTotals CorePick CorridorElement CorridorOptions
      CustomShaderOptions DebugLegend DebugLegendEntry DebugView Degree
      DisplayMesh DistanceField DrawHandle DrawOptions DualPosition
      EffectiveFeature EffectiveSettings ElementCap
      EngineError EngineErrorKind EngineErrorListener EngineErrorLog
      EngineOptions EntityInfo EntityKind
      EntityRef Exposure EyeExposure FaceTrim FeatureStyleOptions FeatureTable
      FeatureValue FittedOperation FrameKey FrameMotion FrameStats
      FromFunctionOptions FunctionCurvilinearMap GeometryAccuracy GeometryBounds
      GeometryHit GeometryKind GeometryQueries GeometryRayAnswer Georeference
      GlareKernelHandle GlarePupil GlareSettings GlareTier GlobeImageryOptions
      GlobeOptions GltfAsset HdrImage HeightOffset HeightOffsetOptions
      HeightReference ITwinOptions Importance InspectControllerOptions
      InstanceOptions
      IonAsset IonOptions LightHandle LightOptions LimitsTier LiveEdgeOptions
      CredentialOptions CredentialValue FetchProviderOptions FetchTransport
      IncomingResponse OriginRule OutgoingRequest ProviderRequestInit
      RequestKind
      LoadProgress LodTransitions MaterialOptions MeasureIn MeasureInOptions
      MeshCapHit MeshCapRegion MeshCapReport
      MeshCapSurface MeshCapSurfaceHit MeshCapTile MeshCapsOptions
      MeshCapsReport MeshData MeshGeometryOptions MeshHandle MeshSource
      ModelGeometry ModelInstances ModelResourceOptions ModelUsage MoonMap
      NamedType NodePoint Notice NurbsCurve NurbsSurface ObserverReadout
      ObserverSettings ObserverStage OrbitBasis OrbitFrame OutputEncoding
      Params PickCamera PickDomain PickHint PickInterpreter PickPoint
      PickPositionResult PickResult Placement PlacementBlend PlacementMode
      PlacementOptions
      PlacementParameter PointFunction PointIn PointInOptions PointProperty
      PointPropertyType PointSourceOptions PointSpread PostStageFormat
      PostStageImage PostStageKind PostStageLevel PostStageOptions
      PostStagePass PostStageRead PostStageSlot PostStageTarget
      PostStageViewInfo PostStageViewValues PurposeStats QueryAnswer QueryRay
      RayAnswer RayHitOptions RayQuery RayTargetName RayVerdict Reason
      ReferenceSurface RefinedPick RendererOption RequestPurpose ResolveView Rig
      RigOrientation RigPosition Route RouteAccuracy RouteStep ScaleAbout
      ScaleAboutOptions
      SceneItemOptions SdfGeometryOptions SectionOptions SectionOutcome
      SectionPlaneInput SectionReport SectionRequest SectionResult
      SegmentDistance SelectionView ShaderControl ShaderOverrides ShaderUnit
      SigmaIn SkyOptions SkyPackManifest SlangCache SlangPostLayout
      SlangPostShader CurvilinearEdge CurvilinearFrameSpec Stage StageInfo StageStats
      Step SupportReport
      StandingQuery StyleExpression StyleField StyleLayer StyleParameter
      StyleScale SubmissionMode SurfaceIdentity SurfacePatch SurfaceSample
      TerrainQueryOptions TerrainRayPatch
      TerrainRayTile TerrainRegion TerrainRegionOptions TerrainRegionPosition
      TerrainRegionRectangle TerrainRegionShape TessellateOptions
      TextureHandle TextureSetOptions TextureSource TextureUniform TileContent
      TileGeometry TileSection TilesetEvents TilesetOptions TilesetStats
      ToneMapping TransformFrameKey TransformHandle TranslucencyMethod
      UniformDeclaration UniformType UnknownReason UnknownSpan Usage
      ValueUniform VectorLayerOptions VectorStyleDocument VerticalExaggeration
      VerticalExaggerationOptions ViewBackground ViewLighting ViewLinkMode
      ViewLinkOptions Viewport CurvilinearMap CurvilinearScale CurvilinearStats WorldClip WorldMemory
      mat4.Mat4 vec3.Vec3
    `,
    local: `
      AEROSOLS BREP_CAP_NAME
      BingImagery BrepBuilder CESIUM_MOON_TERRAIN CapacityError CustomShader
      DAYLIGHT_EXPOSURE DAYLIGHT_SUN_ILLUMINANCE DEFAULT_CAP_COLOR
      DEFAULT_CLIP_CAP_COLOR DEFAULT_IMAGERY_SLICES DEFAULT_SECTION_LINE_COLOR
      DEFAULT_SKY EARTH EYE Ellipsoid Emitter EngineErrors FeatureStyle
      FrameUnavailableError IonTmsImagery MAX_ANCHORS
      MAX_CLIP_FRAGMENT_EDGES MAX_CLIP_POLYGON_VERTICES MAX_CLIP_SETS
      MAX_CLIP_SHAPES MAX_TERRAIN_CLIPS MAX_TERRAIN_CLIP_VERTICES
      MAX_WORLD_CLIPS MESH_CAP_LINE_NAME MESH_CAP_NAME MOON MOON_ALBEDO
      MaterialFlags NO_ACCELERATION PLACEMENT_MONOMIALS PLACEMENT_TERMS
      PostStageError REQUEST_PURPOSES STAGES SurfaceKind
      TICK_REASONS TerrainRegionError TilesetBodyError UNITLESS_EXPOSURE
      UNITLESS_SKY DEFAULT_TAXONOMY canonicalSource parseStableId stableIdOf stableIdToHex
      UNITLESS_SUN_ILLUMINANCE UrlTemplateImagery accuracyAlong
      bend brepGeometry bump cameraGlare cameraObserver
      capPlanes cartographic clipFilter clipSetDistance
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
      meshGeometry nurbsCurveToSegments nurbsSurfaceToPatches
      observerPointSpread orbitBasis orbitPose placePosition pointIn
      radialDistortion readBrepExtension readWithProgress
      resamplable resolveITwinIModel resolveIonAsset runBulk
      scaleAboutEdge scaleAlongAxes scaleToEv100 sdfGeometry
      secondDerivativeBound sectionBrep slangPostShader
      summarizeContent surfaceCount taper tessellateBrep
      tileHeaderKey timeSlices transverseMercator
      transverseMercatorToGeographic twist utm
      utmToGeographic validateBrep vec3 vec3.add vec3.copy vec3.cross
      vec3.distance vec3.dot vec3.length vec3.mul vec3.negate vec3.normalize
      vec3.scale vec3.scaleAndAdd vec3.set vec3.sub vec3.vec3 velocityModel
      vertexCount webMercator webMercatorToGeographic wgslUnit
      writeBrepExtension DefaultProxy ForwardingProxy
    `,
    engine: `
      Credential FetchProvider RequestProxy
      AccelerationStructures BrepCaps BudgetedSelection Camera CameraLayer
      CanvasTarget CapEngine CapScheduler Capabilities ChainIo Engine
      FrameResolver GlareIo Globe GlobeController GlobeImagery
      GlobeStepwiseSelection GlobeTerrain GpuDevice GraphStage
      GraphStageBuilder ImageryProvider InspectController LiveEdge MeshCaps
      ModelPlacement ModelPool ModelResource OffscreenTarget OrbitController
      PointSource PostStage QueryHost RayBackend RayTarget RenderTarget
      SceneClock SceneItem SectionRunner SliceScheduler SliceUser
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
      CrsRef CrsUnits DrawPlacementInfo DrawnThrough DrawnCurvilinearMap
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
      TwoVectorDefinition VectorDefinition CurvilinearMap CurvilinearScale
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
      switchFrame toParentMatrix truePick twoVectorFrame curvilinearForward
      curvilinearInverse
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
  crs: {
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
      ReprojectionCurvilinearMapOptions ResolveOptions ServiceSnapRequest SiteTransform
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
      projCoordinateService projTokenProblem readGeoreference reprojectionCurvilinearMap
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
  ui: {
    type: `
      ContentMix CreditSource CreditsHandle EngineInspectOptions
      EngineSnapshotOptions GlobeKind Inspectable InspectorHandle
      InspectorOptions InspectorSnapshot MemoryRow ModelLoad
      ObserverControlKind ObserverPanelHandle ObserverPanelOptions
      ObserverPanelSection OrbitContext OrbitOptions OrbitPlan PickInfo
      Recordable StagePercentiles TickEvent TilesetSource TimeControlsHandle
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

/** The ten kinds of a member of an engine type. */
export type MemberKind =
  | "snapshot"
  | "mutation"
  | "command"
  | "handle"
  | "query"
  | "event"
  | "sync-read"
  | "callback"
  | "dom"
  | "cannot-cross";

/** Every member kind, in the table's order. */
export const MEMBER_KINDS: readonly MemberKind[] = [
  "snapshot",
  "mutation",
  "command",
  "handle",
  "query",
  "event",
  "sync-read",
  "callback",
  "dom",
  "cannot-cross",
];

/** An owner's members by kind, each list written as space-separated names. */
type MemberTable = Partial<Record<MemberKind, string>>;

/**
 * Every public member of the engine names that are classes or interfaces, by
 * entry point, owner and member kind. A static member of a class is written
 * `static.name`. The list is the TypeScript checker's own: the instance
 * members (own and inherited) and the statics that aren't private or
 * protected.
 */
const MEMBERS: Record<string, Record<string, MemberTable>> = {
  ".": {
    AccelerationStructures: {
      callback: `
        drawAdded drawRemoved tilePlaced tileUnloaded
      `,
    },
    BrepCaps: {
      snapshot: `
        capForm changedAt dirty draw report waiting
      `,
      command: `
        dispose setClip
      `,
      "sync-read": `
        rebuild
      `,
      callback: `
        onChange
      `,
    },
    BudgetedSelection: {
      snapshot: `
        castsShadows expectedLoadSeconds memoryAdjustedScreenSpaceError
        prefetchAfterVisible
      `,
      mutation: `
        casterErrorScale cullWithChildrenBounds dynamicScreenSpaceError
        dynamicScreenSpaceErrorDensity dynamicScreenSpaceErrorFactor
        dynamicScreenSpaceErrorHeightFalloff horizonCulling
        maximumScreenSpaceError mixedLod motionBenefit opportunisticRatio
        prefetchErrorScale skipLevels
      `,
      "sync-read": `
        purpose select selectCasters
      `,
    },
    Camera: {
      snapshot: `
        version
      `,
      mutation: `
        copyFrom direction fov lookAt lookAtInFrame near orient position
        right rotateAroundCenter setIntrinsics up
      `,
      event: `
        watch
      `,
      "sync-read": `
        fovy frustumPlanes intrinsics projection rayDirection record
        viewRotation
      `,
      "cannot-cross": `
        centered copyLens lens pixelAspect shiftX shiftY
      `,
    },
    CameraLayer: {
      command: `
        setClock setResolver setRig update
      `,
      "sync-read": `
        clock held resolver rig root
      `,
      "cannot-cross": `
        forget
      `,
    },
    CanvasTarget: {
      snapshot: `
        kind
      `,
      dom: `
        canvas destroy fixedPixelRatio height pixelRatio watch webgl2 width
      `,
      "cannot-cross": `
        acquire texture
      `,
    },
    CapEngine: {
      command: `
        wake
      `,
      event: `
        onAfterTick
      `,
    },
    CapScheduler: {
      command: `
        add dispose remove tick
      `,
    },
    Capabilities: {
      snapshot: `
        float32Blendable indirectFirstInstance shaderF16 subgroups
        textureCompression timestampQuery
      `,
    },
    ChainIo: {
      snapshot: `
        depth glare height ids output pixelAngle preExposure source
        sources width
      `,
      "cannot-cross": `
        device passWrites
      `,
    },
    Credential: {
      snapshot: `
        generation headers query renewable
      `,
      command: `
        rotate
      `,
      query: `
        renew
      `,
      "sync-read": `
        appliesTo static.of
      `,
    },
    Engine: {
      snapshot: `
        bulk cameras capabilities clamping environment errors gpuPasses
        gpuSample links occlusionCullStats occlusionStats queries
        renderTargetMemory requests stats tilesets time views worlds
      `,
      mutation: `
        aerosol curvilinearBudgetMs icrfToFixed jobBudgetMs
        maximumUploadBytesPerFrame minimumUploadBytesPerFrame moonAxes
        moonPosition occlusionCulling occlusionFeedback renderMode
        sunDirection treeBuildMsPerFrame uploadBytesPerFrame visibility
      `,
      command: `
        destroy removeHeightCapture removeTileset removeView removeWorld
        renderFrame reportError requestRender setStarMap start stop
        trackGpuWork unlink wake
      `,
      handle: `
        addEllipsoid addHeightCapture addView createWorld link uploadModel
      `,
      query: `
        addTerrain addTileset compileShader loadGltf loadModel loadTileset
        setSkyPack static.create whenReady
      `,
      event: `
        onAfterTick onError
      `,
      "sync-read": `
        clipFilter sampleHeightMostDetailed viewBit
      `,
      callback: `
        onTick
      `,
      dom: `
        setMoonMap
      `,
      "cannot-cross": `
        adoptTileset bodyCamera choice ctx device gpu notices raster renderers
        reportFarAnchors scene
      `,
    },
    FetchProvider: {
      query: `
        fetch
      `,
      mutation: `
        static.default
      `,
    },
    FrameResolver: {
      "sync-read": `
        accuracy
      `,
      callback: `
        bindAnchor binding motion resolve route routeRevision watch
      `,
    },
    GlareIo: {
      snapshot: `
        kernel
      `,
      "cannot-cross": `
        sources
      `,
    },
    Globe: {
      snapshot: `
        active anchor attributions body casterIdle changedAt createdAt
        credits extensions firstContentAt geometricError idle
        imageryPending isDestroyed isGlobe items lastSelected morphing
        needsFrames pipeline resident retainGeometry root settledAt stats
        terrain undrawnReasons url warnings world
      `,
      mutation: `
        debugColorizeTiles debugShowBoundingVolume
        debugShowContentBoundingVolume enableCollision frame
        freezeSelection imagery lights modelMatrix placement selection
        shader show
      `,
      command: `
        destroy setPolicy tilesAdded undrawnTile update
      `,
      query: `
        queryRays static.load
      `,
      event: `
        events onHeightsChanged
      `,
      "sync-read": `
        exactHeight sampleHeight stoppingTerrainHit surfaceHeight
        terrainClipped terrainRayTarget tileOfDraw
      `,
      callback: `
        debugTileColor
      `,
      "cannot-cross": `
        addItem bodyless changed clips dualPosition ellipsoid engine evict
        evictForCapacity imageryReady imageryRefines itemOfDraw
        markCastsOnly moveVolumes movesVertices ownsDraw regionsChanged
        shownViews sourceOfDraw state static.create surfaceChanged touched
        updateVolumePad useOrigin volumePad
      `,
    },
    GlobeController: {
      snapshot: `
        inputs moving target view
      `,
      mutation: `
        enabled heading inertiaSpin maximumHeight minimumHeight pitch
        range wheelZoomRate zoomKick zoomResponse
      `,
      command: `
        focus stop
      `,
      callback: `
        surfaceHeight update
      `,
      dom: `
        dispose element ignore
      `,
    },
    GlobeImagery: {
      snapshot: `
        busy fadeSeconds fading heldSlices needed provider role size stats
      `,
      command: `
        credits destroy relocate update
      `,
      "sync-read": `
        hasImagery refines
      `,
      callback: `
        fadeStart
      `,
      "cannot-cross": `
        texture
      `,
    },
    GlobeStepwiseSelection: {
      snapshot: `
        memoryAdjustedScreenSpaceError
      `,
      mutation: `
        fog loadingDescendantLimit maximumScreenSpaceError
        preloadAncestors preloadSiblings
      `,
      "sync-read": `
        purpose select
      `,
      callback: `
        imageryReady
      `,
    },
    GlobeTerrain: {
      snapshot: `
        regions
      `,
      handle: `
        addRegion
      `,
      "cannot-cross": `
        entryOf remove setGround setOpacity setPickThrough
      `,
    },
    GpuDevice: {
      "cannot-cross": `
        adapter adapterInfo caps destroy device events facts limitsTier
        preferredCanvasFormat static.create
      `,
    },
    GraphStage: {
      snapshot: `
        kind label name shadowGain slot
      `,
      mutation: `
        enabled
      `,
      callback: `
        register
      `,
    },
    ImageryProvider: {
      snapshot: `
        attributions headers maximumLevel minimumLevel name tileSize
        tilingScheme
      `,
      callback: `
        tileCredits tileUrl
      `,
    },
    InspectController: {
      snapshot: `
        dragging target view
      `,
      mutation: `
        frame heading maxRange minRange pitch range
      `,
      command: `
        focus syncFromCamera
      `,
      callback: `
        onChange
      `,
      dom: `
        dispose element ignore
      `,
    },
    LiveEdge: {
      snapshot: `
        accuracy curvilinear description domain params revision scale
      `,
      command: `
        attach changed setParams
      `,
      callback: `
        forward inverse
      `,
    },
    MeshCaps: {
      snapshot: `
        changedAt dirty report surfaces
      `,
      command: `
        dispose removeTile setClip setTile
      `,
      "sync-read": `
        rayHit rebuild
      `,
      callback: `
        onChange
      `,
    },
    ModelPlacement: {
      snapshot: `
        bounds clamp draws geometry instanceCount lights model removed
        transform
      `,
      command: `
        remove setInstance setShader setTransform setVisible
      `,
      "cannot-cross": `
        anchor instanceFrames
      `,
    },
    ModelPool: {
      snapshot: `
        placement slots
      `,
      command: `
        destroy setUniform
      `,
    },
    ModelResource: {
      snapshot: `
        axes bytes colorTransfer freed name placementCount released world
      `,
      command: `
        release releaseSourceData
      `,
      handle: `
        place
      `,
      "cannot-cross": `
        host placed retained source template unplaced upload
      `,
    },
    OffscreenTarget: {
      snapshot: `
        height kind width
      `,
      command: `
        destroy
      `,
      query: `
        read
      `,
      "cannot-cross": `
        acquire texture
      `,
    },
    OrbitController: {
      snapshot: `
        view
      `,
      mutation: `
        camera
      `,
      dom: `
        dispose element ignore
      `,
    },
    PointSource: {
      snapshot: `
        anchor capacity frame heights layout mesh origin stride world
      `,
      mutation: `
        count delay
      `,
      command: `
        destroy setProperties update
      `,
      "sync-read": `
        packProperties
      `,
      "cannot-cross": `
        carrier
      `,
    },
    PostStage: {
      snapshot: `
        error kind label name reads shadowGain slot
      `,
      mutation: `
        enabled
      `,
      command: `
        setUniform
      `,
      callback: `
        perView
      `,
      "cannot-cross": `
        fail passes textures uniformData uniformLayout uniformVersion
        unwatch watch writeUniform
      `,
    },
    QueryHost: {
      callback: `
        check frameRays loading onTick report revision
      `,
    },
    RayBackend: {
      callback: `
        answer
      `,
    },
    RequestProxy: {
      callback: `
        getURL headers
      `,
    },
    RenderTarget: {
      snapshot: `
        height kind width
      `,
      "cannot-cross": `
        acquire texture
      `,
    },
    SceneClock: {
      callback: `
        change paused rate seconds watch
      `,
    },
    SceneItem: {
      snapshot: `
        anchor georeference removed tileset
      `,
      mutation: `
        curvilinearAt opacity placement shader show tint viewMask
      `,
      command: `
        remove
      `,
      "cannot-cross": `
        applyCasterMask applyPlaceholder applyViewMask bytes castViews
        destroyed discard drawColor drawsOf holdsBase identity moves place reach
        setSurface shownIn surfaceRank unplace views
      `,
    },
    SectionRunner: {
      query: `
        run
      `,
    },
    SliceScheduler: {
      callback: `
        run
      `,
    },
    SliceUser: {
      callback: `
        heldSlices needed relocate
      `,
    },
    SpatialQueries: {
      query: `
        castRays
      `,
      callback: `
        standing
      `,
    },
    StepwiseSelection: {
      snapshot: `
        memoryAdjustedScreenSpaceError
      `,
      mutation: `
        cullWithChildrenBounds dynamicScreenSpaceError
        dynamicScreenSpaceErrorDensity dynamicScreenSpaceErrorFactor
        dynamicScreenSpaceErrorHeightFalloff maximumScreenSpaceError
      `,
      "sync-read": `
        select
      `,
    },
    TerrainRayTarget: {
      snapshot: `
        ellipsoid maximumHeight
      `,
      callback: `
        clipped patchAt
      `,
    },
    TextureBinding: {
      "cannot-cross": `
        sampler view
      `,
    },
    Tile: {
      snapshot: `
        appliedCasterMask appliedMask appliedPlaceholderMask baseUrl bytes
        casterMask castsOnly childrenPartition childrenWithinParent clip
        contentAvailable contentOrigin contentUrl contentVolume copyright
        debugColor debugWord depth drawnOnce empty external fetchStartAt
        fillFromParent geometricError geometry hasContent headerKey
        lastBytes morphStart noFitAt ownContentVolume ownVolume
        placeholderMask purpose refine renderable requestPriority
        requestVolume residentBelow standInMask state summary touchSeq
        touchedFrame transform viewMask viewedAt volume wantedAt
      `,
      "sync-read": `
        viewState
      `,
      "cannot-cross": `
        appliedHoles children drawnCache drawnOthers globe holes items
        occludee parent placement tileset touchNext touchPrev views
      `,
    },
    Tileset3D: {
      snapshot: `
        active anchor attributions body casterIdle changedAt createdAt
        credits extensions firstContentAt geometricError idle
        imageryPending isDestroyed isGlobe items lastSelected morphing
        needsFrames pipeline resident retainGeometry root settledAt stats
        undrawnReasons url warnings world
      `,
      mutation: `
        debugColorizeTiles debugShowBoundingVolume
        debugShowContentBoundingVolume enableCollision freezeSelection
        imagery lights modelMatrix placement selection show
      `,
      command: `
        destroy setPolicy tilesAdded undrawnTile update
      `,
      query: `
        queryRays static.load
      `,
      event: `
        events onHeightsChanged
      `,
      "sync-read": `
        exactHeight sampleHeight surfaceHeight terrainClipped
        terrainRayTarget tileOfDraw
      `,
      callback: `
        debugTileColor
      `,
      "cannot-cross": `
        addItem bodyless changed dualPosition ellipsoid engine evict
        evictForCapacity imageryReady imageryRefines itemOfDraw
        markCastsOnly moveVolumes movesVertices ownsDraw regionsChanged
        shownViews sourceOfDraw state surfaceChanged updateVolumePad
        useOrigin volumePad
      `,
    },
    TransformNode: {
      snapshot: `
        depth edge graph name parent revision
      `,
    },
    VectorLayer: {
      snapshot: `
        parameters
      `,
      command: `
        destroy setParameter
      `,
      query: `
        static.create
      `,
      "sync-read": `
        getParameter
      `,
    },
    View: {
      snapshot: `
        anchorRevision aspect body bodyAnchor capFaces capNote clipSets
        debugLegend effective observerRevision pixelRect readout support
      `,
      mutation: `
        aerialPerspective ambientOcclusion ambientOcclusionRadius
        background camera cityLights clearColor clipCaps clipMask debug
        enabled fxaa lighting lodExponent lodTransitions observer
        occlusionCulling occlusionFeedback occlusionState outputEncoding
        overlays shadows sunDisk translucencyMethod viewport world
      `,
      command: `
        setAnchorPlacement setCameraFromAnchor setClips setParameter
      `,
      query: `
        pick pickPoint pickPosition readHdr
      `,
      "sync-read": `
        anchorCamera anchorPlacement anchorRoute contains explain
        parameterValue toPixel
      `,
      callback: `
        renderRoot
      `,
      dom: `
        target
      `,
      "cannot-cross": `
        anchorRoutes anchorState autoExposure clipMaskRevision debugMode
        exposureScale glareResolved hasParameterValue parameterRevision
        pendingGlareReads pendingHdrReads pendingPicks pickPlacements profile
        profileContext releaseParameters releaseStages setAnchorRoute
        stagesRevision wake
      `,
    },
    ViewLink: {
      snapshot: `
        options source target
      `,
      command: `
        dispose evaluate
      `,
    },
    World: {
      snapshot: `
        anchorPlaceRevision anchors arenaBytes batchCount changedViews
        clipsRevision contentRevision curvilinearStats destroyed id
        instanceGeneration items lightCount materialsInUse maxDraws
        maxInstances maxMaterials maxPointSets maxTransforms memory
        pressure raysCast recordCount root slabs tableGeneration
        transformRevision version
      `,
      mutation: `
        submission
      `,
      command: `
        destroy flushUploads freeClip placeAnchor rebind removeAnchor
        removeClip removeDraw removeLight removeMaterial removeMesh
        removeTextureSet removeTransform setCasterMask setClip
        setClipExempt setCollision setColor setCurvilinearAt setDrawDebug
        setDrawMorph setDrawShader setImagery setImageryFade setInstance
        setInstanceStreams setLight setLights setPlaceholder setPlacement
        setPointCuller setPointProperties setSolid setTransform
        setTransformVisible setViewMask setVisible
      `,
      handle: `
        add addAnchor addClip addDraw addLight addMaterial addMesh
        addPointMesh addTransform allocateClip createPlacementParameter
        createPointCuller createTextureSet
      `,
      query: `
        castRays
      `,
      "sync-read": `
        anchorMatrix anchorOf bodyAnchor clipOf drawAnchor
        drawCurvilinearAt drawMatrix drawPlacement feature frameOf hasDraw
        instanceFirst lightAlive localMatrix textureRefs transformAlive
        translucentRange worldMatrix
      `,
      callback: `
        acceleration addFrameCompute addOccluder
      `,
      "cannot-cross": `
        addBrep addPatchMesh addTerrainClipRegion anchorRemovals
        clipBuffer clipSets clippedBundle copyOcclusionCounters ctx
        curvilinearMaps depthBundle drawForRoute drawHasPosition
        drawMaterial drawOverheadBytes draws drawSplats encodeCull encodeRetest
        encodeTranslucent featureIdOf findBodyAnchor forEachLight
        heightBundle identities identity instanceBuffer itemBuffer
        itemIdentity itemOfDraw itemRemoved
        markDirty markGpuInstances materialBuffer materialWithFlags mirror
        occluders occlusionLayout pickBundle pickSource placementBuffer
        placementOf positionRefusal prepareFrame prepassBundle raster
        readPatchStats ready recordBuffer releasePlacementParameter
        removeBrep removeTerrainClipRegion retestBundle scene
        setDrawGeometricError setDrawHeightNormal setDrawMaterial
        setGround setImageryArray setPatchDisplay setPatchErrorPixels
        setPickSource setTerrainClip setTerrainClipGround
        setTerrainClipOpacity shaderReady shadowBundle
        tileCurvilinearMap transformBuffer transformsF32Scale twinDraw
        vertexBufferOf
      `,
    },
  },
  crs: {
    ClientSnapService: {
      snapshot: `
        tilesets
      `,
      query: `
        snap
      `,
      "cannot-cross": `
        hides
      `,
    },
  },
  ui: {
    Viewer: {
      snapshot: `
        clock controls credits engine frames globe orbitDragging
        orbitPivot presentationSuspended skyPackManifest view views
        warnings world
      `,
      mutation: `
        cityLights creditsShown overview policy showGlobe sky split
        sunFromClock
      `,
      command: `
        addAttributions destroy remove setFrameData setSun zoomTo
      `,
      query: `
        addTileset frameData loadModel pick ready setGlobe setSkyPack
        skyPackReady
      `,
      event: `
        events
      `,
      "sync-read": `
        inspectable
      `,
      callback: `
        onOrbitChange onPresentationChange
      `,
      dom: `
        canvas container controller resumePresentation setControls
        static.create suspendPresentation
        suspendPresentationUntil target timeControls
      `,
      "cannot-cross": `
        applyClockSun state
      `,
    },
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

/** One row of the member table. */
export interface MemberRow {
  readonly entry: string;
  readonly owner: string;
  readonly name: string;
  readonly kind: MemberKind;
}

/** A public member found in the code: what the check needs of it. */
export interface MemberSurfaceRow {
  readonly entry: string;
  readonly owner: string;
  readonly name: string;
  /** A method, or a property whose type is a function. */
  readonly callable: boolean;
}

/** The member table, one row per member, in the order the table lists them. */
export function memberRows(
  table: Record<string, Record<string, MemberTable>> = MEMBERS,
) {
  const rows: MemberRow[] = [];
  for (const [entry, owners] of Object.entries(table)) {
    for (const [owner, kinds] of Object.entries(owners)) {
      for (const kind of MEMBER_KINDS) {
        for (const name of split(kinds[kind])) {
          rows.push({ entry, owner, name, kind });
        }
      }
    }
  }
  return rows;
}

const memberKey = (entry: string, owner: string, name: string) =>
  `${entry}\t${owner}.${name}`;

const memberKinds = new Map<string, MemberKind>(
  memberRows().map((row) => [
    memberKey(row.entry, row.owner, row.name),
    row.kind,
  ]),
);

/** The kind of a member of an engine type, or `undefined` without one. */
export function memberKindOf(
  entry: string,
  owner: string,
  name: string,
): MemberKind | undefined {
  return memberKinds.get(memberKey(entry, owner, name));
}

/**
 * The owners of the member table in the surface map: the exports that are
 * classes or interfaces and have the `engine` kind. The code's member list
 * (`memberRows` of `scripts/surfaceMap.mjs`) is made for these.
 */
export function engineOwners(
  surface: readonly SurfaceRow[],
  rows: readonly ProtocolRow[] = protocolRows(),
): { entry: string; name: string }[] {
  const engine = new Set(
    rows
      .filter((row) => row.kind === "engine")
      .map((row) => key(row.entry, row.name)),
  );
  return surface
    .filter((row) => {
      const declared = row.kind.split("+");
      return (
        engine.has(key(row.entry, row.name)) &&
        (declared.includes("class") || declared.includes("interface"))
      );
    })
    .map(({ entry, name }) => ({ entry, name }));
}

/** The members the code has, and the member table to compare them with. */
export interface MemberCheck {
  readonly actual: readonly MemberSurfaceRow[];
  readonly rows?: readonly MemberRow[];
}

/** Kinds whose member has to be callable. */
const CALLABLE_KINDS: readonly MemberKind[] = [
  "command",
  "handle",
  "sync-read",
];

/**
 * Compares the table with the surface map's rows. Every row needs exactly one
 * kind, nothing in the table may be missing from the surface map, and a name
 * the surface map declares as a class, function, constant, enum or namespace
 * is never a `type`. With `members` it does the same for the members of the
 * engine types: each member the code has needs exactly one kind, the table may
 * not name a member the code doesn't have, and a `command`, `handle` or
 * `sync-read` has to be callable.
 */
export function checkProtocol(
  surface: readonly SurfaceRow[],
  rows: readonly ProtocolRow[] = protocolRows(),
  members?: MemberCheck,
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
  if (members !== undefined) {
    const found = checkMembers(members.actual, members.rows ?? memberRows());
    unclassified.push(...found.unclassified);
    stale.push(...found.stale);
    duplicated.push(...found.duplicated);
    misclassified.push(...found.misclassified);
  }
  return { unclassified, stale, duplicated, misclassified };
}

function checkMembers(
  actual: readonly MemberSurfaceRow[],
  rows: readonly MemberRow[],
): ProtocolProblems {
  const listed = new Map<string, MemberKind[]>();
  for (const row of rows) {
    const k = memberKey(row.entry, row.owner, row.name);
    listed.set(k, [...(listed.get(k) ?? []), row.kind]);
  }
  const unclassified: string[] = [];
  const misclassified: string[] = [];
  const seen = new Set<string>();
  for (const member of actual) {
    const k = memberKey(member.entry, member.owner, member.name);
    seen.add(k);
    const kind = listed.get(k)?.[0];
    const label = `${member.entry === "." ? "" : `${member.entry}:`}${member.owner}.${member.name}`;
    if (kind === undefined) {
      unclassified.push(`${label} has no thread kind`);
    } else if (CALLABLE_KINDS.includes(kind) && !member.callable) {
      misclassified.push(`${label} can't be called, so it is not a ${kind}`);
    }
  }
  const stale = [...listed.keys()]
    .filter((k) => !seen.has(k))
    .map((k) => `${k.replace("\t", " ")} is not a public member`);
  const duplicated = [...listed]
    .filter(([, list]) => list.length > 1)
    .map(
      ([k, list]) =>
        `${k.replace("\t", " ")} is listed ${list.length} times (${list.join(", ")})`,
    );
  return { unclassified, stale, duplicated, misclassified };
}
