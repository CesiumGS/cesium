// How the API reference groups the public API (scripts/apiReference.mjs). The
// groups are by entry point, then by domain, so a reader works down from "which
// import" to "which part of the engine" rather than through one flat list.
//
// A symbol's group comes from, in order:
//
//   1. OVERRIDES: its name (`Name`, or `entry:Name` outside the core entry
//      point), for a symbol that belongs elsewhere than its file says.
//   2. RULES: the first rule whose `entry` matches and whose `from` (a path
//      prefix ending in `/`, or a whole file) is where the symbol is declared.
//
// There is no catch-all. A symbol that matches nothing is reported by the
// generator and shown under "Unmapped", and test/apiReference.test.ts fails
// until a rule is added here. A rule or override that matches nothing is
// reported too, so the table doesn't collect dead lines.

/** The entry points, in the order the reference lists them. */
export const ENTRIES = [
  {
    id: ".",
    title: "Core",
    import: "@cesium/next",
    blurb:
      "The engine: the device, worlds, views, cameras, streaming and the globe. It imports none of the other entry points.",
  },
  {
    id: "widgets",
    title: "Widgets",
    import: "@cesium/next/widgets",
    blurb: "The Viewer and the panels that attach to an engine.",
  },
  {
    id: "frames",
    title: "Frames",
    import: "@cesium/next/frames",
    blurb:
      "The reference-frame tree, coordinates, accuracy, ephemerides and trajectories.",
  },
  {
    id: "time",
    title: "Time",
    import: "@cesium/next/time",
    blurb: "Instants, clocks, leap seconds, and the Sun and Moon by time.",
  },
  {
    id: "proj",
    title: "Projections",
    import: "@cesium/next/proj",
    blurb:
      "PROJ, coordinate reference systems, and engineering frames with alignments.",
  },
  {
    id: "measure",
    title: "Measurement",
    import: "@cesium/next/measure",
    blurb: "Measuring between points, with an accuracy statement.",
  },
];

/** The groups, in the order the reference lists them within each entry. */
export const GROUPS = [
  {
    id: "core.engine",
    entry: ".",
    title: "Engine & views",
    blurb: "The engine, its views and targets, and the GPU device it runs on.",
  },
  {
    id: "core.world",
    entry: ".",
    title: "Worlds & scene items",
    blurb:
      "A world and what goes in it: meshes, models, lights, and where they are placed.",
  },
  {
    id: "core.camera",
    entry: ".",
    title: "Cameras & controllers",
    blurb: "The camera, its rig and frame resolver, and the controllers.",
  },
  {
    id: "core.rendering",
    entry: ".",
    title: "Rendering, shading & sky",
    blurb:
      "Custom shaders, post stages, the observer's exposure, lighting and the atmosphere.",
  },
  {
    id: "core.tiles",
    entry: ".",
    title: "Tiles & streaming",
    blurb: "3D Tiles: the tileset, its selection, budgets and pipeline.",
  },
  {
    id: "core.globe",
    entry: ".",
    title: "Globe & terrain",
    blurb: "The globe, imagery providers, terrain and terrain regions.",
  },
  {
    id: "core.geometry",
    entry: ".",
    title: "Geometry & queries",
    blurb:
      "Mesh, B-rep and distance-field geometry, spatial queries, rays and picking.",
  },
  {
    id: "core.brep",
    entry: ".",
    title: "B-reps",
    blurb: "Boundary representations: building, validating and tessellating.",
  },
  {
    id: "core.vector",
    entry: ".",
    title: "Vector & styling",
    blurb: "Point sources, vector layers and their styles.",
  },
  {
    id: "core.io",
    entry: ".",
    title: "Loading & Cesium ion",
    blurb: "Loading assets, glTF tables, and resolving Cesium ion assets.",
  },
  {
    id: "core.math",
    entry: ".",
    title: "Math & coordinates",
    blurb: "Vectors, matrices, the ellipsoid and cartographic positions.",
  },
  {
    id: "core.util",
    entry: ".",
    title: "Errors & utilities",
    blurb: "Events, bulk scheduling and the engine's errors.",
  },

  {
    id: "widgets.viewer",
    entry: "widgets",
    title: "Viewer & orbit",
    blurb: "The Viewer, its options, and orbiting and zooming to a target.",
  },
  {
    id: "widgets.panels",
    entry: "widgets",
    title: "Panels & inspection",
    blurb: "Credits, the inspector, the observer panel and time controls.",
  },

  {
    id: "frames.tree",
    entry: "frames",
    title: "Frame tree & routes",
    blurb: "Frames, the catalog, routes between frames, and derived frames.",
  },
  {
    id: "frames.coordinates",
    entry: "frames",
    title: "Coordinates & picking",
    blurb: "The coordinate service, framed points and picked placements.",
  },
  {
    id: "frames.accuracy",
    entry: "frames",
    title: "Accuracy",
    blurb: "What each frame and point can claim, and where it comes from.",
  },
  {
    id: "frames.sky",
    entry: "frames",
    title: "Sky & Earth orientation",
    blurb: "The sky state and the Earth's orientation parameters.",
  },
  {
    id: "frames.ephemeris",
    entry: "frames",
    title: "Ephemerides & trajectories",
    blurb: "Reading SPK kernels and OEM trajectories.",
  },

  {
    id: "time.instants",
    entry: "time",
    title: "Instants & clocks",
    blurb: "Instants, the clock, leap seconds and time zones.",
  },
  {
    id: "time.sun-moon",
    entry: "time",
    title: "Sun & Moon",
    blurb: "Sun and Moon positions and axes, and sidereal time.",
  },

  {
    id: "proj.engineering",
    entry: "proj",
    title: "Engineering frames & alignments",
    blurb:
      "Engineering frames, georeferencing, alignments, snapping and design picks.",
  },
  {
    id: "proj.crs",
    entry: "proj",
    title: "CRS, PROJ & grids",
    blurb:
      "Coordinate reference systems, PROJ pipelines, grids and the PROJ API.",
  },

  {
    id: "measure.measuring",
    entry: "measure",
    title: "Measuring",
    blurb: "Distances, light time, Doppler and line of sight, with accuracy.",
  },
  {
    id: "measure.constants",
    entry: "measure",
    title: "Constants",
    blurb: "Physical constants.",
  },
];

/** Where a symbol that matches no rule goes, so it can be seen. */
export const UNMAPPED = {
  id: "unmapped",
  entry: "",
  title: "Unmapped",
  blurb:
    "Not in a group yet. Add a rule or an override in scripts/apiGroups.mjs.",
};

/** By declaring file, first match wins. `from` ending in `/` is a directory. */
export const RULES = [
  // Core: the scene directory is mixed, so its files are named one by one.
  { entry: ".", from: "src/scene/Engine.ts", group: "core.engine" },
  { entry: ".", from: "src/scene/View.ts", group: "core.engine" },
  { entry: ".", from: "src/scene/renderTarget.ts", group: "core.engine" },
  { entry: ".", from: "src/scene/Body.ts", group: "core.engine" },
  { entry: ".", from: "src/gpu/GpuDevice.ts", group: "core.engine" },
  { entry: ".", from: "src/gpu/limits.ts", group: "core.engine" },
  { entry: ".", from: "src/core/sceneClock.ts", group: "core.engine" },

  { entry: ".", from: "src/scene/World.ts", group: "core.world" },
  { entry: ".", from: "src/scene/SceneItem.ts", group: "core.world" },
  { entry: ".", from: "src/scene/world/", group: "core.world" },
  { entry: ".", from: "src/scene/meshes.ts", group: "core.world" },
  { entry: ".", from: "src/scene/gltfModel.ts", group: "core.world" },
  { entry: ".", from: "src/scene/lights.ts", group: "core.world" },
  { entry: ".", from: "src/scene/placement.ts", group: "core.world" },
  { entry: ".", from: "src/scene/HeightClamping.ts", group: "core.world" },
  { entry: ".", from: "src/georeference/", group: "core.world" },
  { entry: ".", from: "src/transforms/", group: "core.world" },
  { entry: ".", from: "src/transform/", group: "core.world" },

  { entry: ".", from: "src/scene/Camera.ts", group: "core.camera" },
  { entry: ".", from: "src/camera/", group: "core.camera" },
  { entry: ".", from: "src/scene/GlobeController.ts", group: "core.camera" },
  { entry: ".", from: "src/scene/InspectController.ts", group: "core.camera" },
  { entry: ".", from: "src/scene/OrbitController.ts", group: "core.camera" },
  { entry: ".", from: "src/scene/ViewLink.ts", group: "core.camera" },
  { entry: ".", from: "src/scene/touchGestures.ts", group: "core.camera" },

  { entry: ".", from: "src/scene/CustomShader.ts", group: "core.rendering" },
  { entry: ".", from: "src/scene/uniforms.ts", group: "core.rendering" },
  { entry: ".", from: "src/scene/slangCache.ts", group: "core.rendering" },
  { entry: ".", from: "src/scene/slangControls.ts", group: "core.rendering" },
  { entry: ".", from: "src/scene/contract.ts", group: "core.rendering" },
  { entry: ".", from: "src/scene/contentLimits.ts", group: "core.rendering" },
  { entry: ".", from: "src/scene/RenderContext.ts", group: "core.rendering" },
  { entry: ".", from: "src/scene/postStage.ts", group: "core.rendering" },
  { entry: ".", from: "src/scene/observer.ts", group: "core.rendering" },
  { entry: ".", from: "src/scene/eyeLimit.ts", group: "core.rendering" },
  { entry: ".", from: "src/scene/pointSpread.ts", group: "core.rendering" },
  { entry: ".", from: "src/gpu/Environment.ts", group: "core.rendering" },
  { entry: ".", from: "src/render/", group: "core.rendering" },
  { entry: ".", from: "src/atmosphere/", group: "core.rendering" },
  { entry: ".", from: "src/shaders/", group: "core.rendering" },

  { entry: ".", from: "src/streaming/", group: "core.tiles" },
  { entry: ".", from: "src/tiles/", group: "core.tiles" },

  { entry: ".", from: "src/globe/", group: "core.globe" },
  { entry: ".", from: "src/io/moonMap.ts", group: "core.globe" },
  { entry: ".", from: "src/io/moonMapLoad.ts", group: "core.globe" },
  { entry: ".", from: "src/query/terrainBackend.ts", group: "core.globe" },

  { entry: ".", from: "src/geometry/", group: "core.geometry" },
  { entry: ".", from: "src/query/", group: "core.geometry" },
  { entry: ".", from: "src/scene/pick.ts", group: "core.geometry" },
  { entry: ".", from: "src/scene/pickDomain.ts", group: "core.geometry" },

  { entry: ".", from: "src/brep/", group: "core.brep" },

  { entry: ".", from: "src/vector/", group: "core.vector" },
  { entry: ".", from: "src/scene/FeatureStyle.ts", group: "core.vector" },

  { entry: ".", from: "src/io/", group: "core.io" },
  { entry: ".", from: "src/math/", group: "core.math" },

  { entry: ".", from: "src/core/", group: "core.util" },
  { entry: ".", from: "src/scene/CapacityError.ts", group: "core.util" },
  { entry: ".", from: "src/gpu/EngineErrors.ts", group: "core.util" },

  // Widgets.
  { entry: "widgets", from: "widgets/Viewer.ts", group: "widgets.viewer" },
  { entry: "widgets", from: "widgets/orbitFocus.ts", group: "widgets.viewer" },
  { entry: "widgets", from: "widgets/", group: "widgets.panels" },

  // Frames.
  {
    entry: "frames",
    from: "src/frames/frameAccuracy.ts",
    group: "frames.accuracy",
  },
  {
    entry: "frames",
    from: "src/frames/pointAccuracy.ts",
    group: "frames.accuracy",
  },
  {
    entry: "frames",
    from: "src/frames/orientationSigma.ts",
    group: "frames.accuracy",
  },
  {
    entry: "frames",
    from: "src/frames/coordinates.ts",
    group: "frames.coordinates",
  },
  {
    entry: "frames",
    from: "src/frames/pickInterpreter.ts",
    group: "frames.coordinates",
  },
  {
    entry: "frames",
    from: "src/frames/pickIn.ts",
    group: "frames.coordinates",
  },
  {
    entry: "frames",
    from: "src/frames/placementQuery.ts",
    group: "frames.coordinates",
  },
  { entry: "frames", from: "src/frames/sky.ts", group: "frames.sky" },
  { entry: "frames", from: "src/frames/skyAnalytic.ts", group: "frames.sky" },
  { entry: "frames", from: "src/frames/attachSky.ts", group: "frames.sky" },
  { entry: "frames", from: "src/time/", group: "frames.sky" },
  { entry: "frames", from: "src/ephemeris/", group: "frames.ephemeris" },
  { entry: "frames", from: "src/trajectory/", group: "frames.ephemeris" },
  { entry: "frames", from: "src/frames/", group: "frames.tree" },

  // Time.
  { entry: "time", from: "src/time/sun.ts", group: "time.sun-moon" },
  { entry: "time", from: "src/time/moon.ts", group: "time.sun-moon" },
  { entry: "time", from: "src/time/celestial.ts", group: "time.sun-moon" },
  { entry: "time", from: "src/time/erfa/", group: "time.sun-moon" },
  { entry: "time", from: "src/time/", group: "time.instants" },

  // Projections.
  {
    entry: "proj",
    from: "src/engineering/EngineeringFrame.ts",
    group: "proj.engineering",
  },
  {
    entry: "proj",
    from: "src/engineering/alignment.ts",
    group: "proj.engineering",
  },
  {
    entry: "proj",
    from: "src/engineering/placement.ts",
    group: "proj.engineering",
  },
  {
    entry: "proj",
    from: "src/engineering/georeference.ts",
    group: "proj.engineering",
  },
  {
    entry: "proj",
    from: "src/engineering/georeferenceTileset.ts",
    group: "proj.engineering",
  },
  { entry: "proj", from: "src/engineering/snap.ts", group: "proj.engineering" },
  { entry: "proj", from: "src/engineering/pick.ts", group: "proj.engineering" },
  {
    entry: "proj",
    from: "src/engineering/fresnel.ts",
    group: "proj.engineering",
  },
  { entry: "proj", from: "src/engineering/", group: "proj.crs" },
  { entry: "proj", from: "src/proj/", group: "proj.crs" },

  // Measurement.
  {
    entry: "measure",
    from: "src/math/constants.ts",
    group: "measure.constants",
  },
  { entry: "measure", from: "src/measure/", group: "measure.measuring" },
];

/** By name, ahead of the rules: `Name`, or `entry:Name` outside the core. */
export const OVERRIDES = {
  // Declared with the catalog, but it's how accurate a frame is.
  "frames:Precision": "frames.accuracy",
};
