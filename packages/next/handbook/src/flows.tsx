import { data, size } from "./data.ts";
import { Board, type BoardEdge, type BoardStep } from "./diagram.tsx";
import { C } from "./parts.tsx";

/**
 * The tabs' swim-lane figures, drawn by hand from the code. Listed in
 * DESIGN.md with the date each was checked. Sizes in them are generated.
 */

const LIFECYCLE: BoardStep[] = [
  {
    id: "unloaded",
    lane: 0,
    row: 0,
    title: "unloaded",
    body: "Known to the tree, with no content. Where every tile starts, and where an evicted or cancelled tile returns.",
  },
  {
    id: "wanted",
    lane: 0,
    row: 1,
    title: "Wanted",
    body: (
      <>
        Selection asked for it. It's still <C>unloaded</C>, waiting in priority
        order for a slot in its origin's window.
      </>
    ),
    flow: "The wait is recorded as queue time.",
  },
  {
    id: "loading",
    lane: 1,
    row: 1,
    title: "loading",
    body: "Holds a request slot. A worker fetches and decodes it, with an AbortController to cancel it.",
  },
  {
    id: "decoded",
    lane: 1,
    row: 2,
    title: "Decoded, waiting to upload",
    body: (
      <>
        Still <C>loading</C>, in the tileset's upload queue. More than 32
        waiting holds the origin's window, as the network isn't the bottleneck
        then.
      </>
    ),
    flow: "It goes on when the upload budget allows. A full world pool puts it back at the front, to retry.",
  },
  {
    id: "ready",
    lane: 2,
    row: 2,
    accent: true,
    title: "ready",
    body: "Placed in the world's tables and counted against the byte budget. It draws in the views that select it.",
    flow: "Terrain also waits for imagery before it draws.",
  },
  {
    id: "cold",
    lane: 2,
    row: 3,
    title: "Cold",
    body: "No view touched it this tick, and the cache is over budget or a world pool is near full. Coldest goes first.",
  },
  {
    id: "evicted",
    lane: 0,
    row: 3,
    title: "Evicted",
    body: (
      <>
        Its GPU resources are freed and its bytes returned. It's <C>unloaded</C>{" "}
        again, and selection can ask for it.
      </>
    ),
  },
  {
    id: "failed",
    lane: 1,
    row: 4,
    title: "failed",
    body: "The request or upload failed. It stays failed for the session, with a warning: there's no retry yet.",
  },
];

const LIFECYCLE_EDGES: BoardEdge[] = [
  { from: "unloaded", to: "wanted" },
  { from: "wanted", to: "loading" },
  { from: "loading", to: "decoded" },
  { from: "decoded", to: "ready" },
  { from: "ready", to: "cold" },
];

const LIFECYCLE_BACK: BoardEdge[] = [
  { from: "decoded", to: "failed" },
  { from: "cold", to: "evicted" },
  { from: "loading", to: "unloaded", label: "cancelled", vertical: true },
];

/** A tile from request to resident, and back. */
export function TileLifecycle() {
  return (
    <Board
      label="The states of a tile's content"
      lanes={["Not resident", "In flight", "Resident"]}
      steps={LIFECYCLE}
      edges={LIFECYCLE_EDGES}
      back={LIFECYCLE_BACK}
    />
  );
}

const FRAME_TICK: BoardStep[] = [
  {
    id: "ask",
    lane: 0,
    title: "The camera layer asks",
    body: (
      <>
        For each view, each anchor: where is it in the view's render root at
        this scene time? <C>resolve(frame, base, seconds, out)</C>
      </>
    ),
  },
  {
    id: "resolver",
    lane: 1,
    row: 0,
    accent: true,
    title: "The frame resolver",
    body: (
      <>
        <C>createFramesResolver</C> looks up each anchor's bound reference
        frame, and walks the tree between it and the root.
      </>
    ),
    flow: "A host can bring its own resolver here.",
  },
  {
    id: "edges",
    lane: 1,
    row: 1,
    title: "Each edge on the route",
    body: "Composed in float64. Each edge answers from what the catalog has now: a constant, a stand-in or its full data.",
  },
  {
    id: "provider",
    lane: 2,
    row: 1,
    title: "A provider, on demand",
    body: (
      <>
        If <C>"precise"</C> was asked for, Earth orientation or the ephemeris
        loads by dynamic import, asynchronously. Queries don't wait: the edge
        answers from its stand-in meanwhile.
      </>
    ),
  },
  {
    id: "revision",
    lane: 2,
    row: 2,
    title: "The revision goes up",
    body: (
      <>
        When data arrives, <C>routeRevision</C> rises and the resolver's{" "}
        <C>watch</C> wakes the engine, so the view updates without the clock
        moving.
      </>
    ),
  },
  {
    id: "placed",
    lane: 0,
    row: 3,
    title: "The anchor is placed",
    body: (
      <>
        <C>View.setAnchorPlacement</C>. If an edge can't answer, the view keeps
        its last good placement, and one error is reported. Rendering falls back
        where measuring throws.
      </>
    ),
  },
  {
    id: "skip",
    lane: 0,
    row: 4,
    title: "The next tick may skip all this",
    body: "While the time, the root and every route's revision stay as they were, the camera layer does nothing.",
  },
];

const FRAME_EDGES: BoardEdge[] = [
  { from: "ask", to: "resolver" },
  { from: "resolver", to: "edges" },
  { from: "edges", to: "provider" },
  { from: "provider", to: "revision" },
  { from: "edges", to: "placed", label: "a float64 matrix" },
  { from: "placed", to: "skip" },
];

/** One tick of a reference frame's answer. */
export function FrameTick() {
  return (
    <Board
      label="One tick of answering where a reference frame is"
      lanes={["Camera layer", "Frames module", "Providers, on demand"]}
      steps={FRAME_TICK}
      edges={FRAME_EDGES}
    />
  );
}

const CAMERA_TICK: BoardStep[] = [
  {
    id: "listeners",
    lane: 0,
    title: "Tick listeners",
    body: "An application or controller moves the clock or a rig's node.",
  },
  {
    id: "update",
    lane: 1,
    row: 1,
    title: "cameras.update()",
    body: "Runs after the listeners and before change detection, so its placements render in this tick.",
  },
  {
    id: "root",
    lane: 1,
    row: 2,
    title: "Pick the render root",
    body: "The rig's position reference frame, or a running transition's blend reference frame.",
  },
  {
    id: "rig",
    lane: 1,
    row: 3,
    title: "Evaluate the rig",
    body: "In that root, giving the camera's pose in render space.",
  },
  {
    id: "anchors",
    lane: 2,
    row: 3,
    title: "Place each anchor",
    body: (
      <>
        <C>setAnchorPlacement</C>, through the resolver. Each view keeps its own
        placements.
      </>
    ),
  },
  {
    id: "selection",
    lane: 2,
    row: 4,
    title: "Selection inputs",
    body: "Each view's camera, re-expressed in the tileset's anchor, once per update.",
  },
  {
    id: "eyes",
    lane: 2,
    row: 5,
    title: "An eye per anchor",
    body: (
      <>
        <C>computeAnchorEyes</C>, in float64: the eye in each anchor, and the
        rotation to the view's shading axes.
      </>
    ),
  },
  {
    id: "matrix",
    lane: 3,
    row: 5,
    accent: true,
    title: "relativeMatrix",
    body: "In the cull kernel. Split values arrive, the highs subtract as integers, and the small result turns to the shading axes.",
  },
];

const CAMERA_EDGES: BoardEdge[] = [
  { from: "listeners", to: "update" },
  { from: "update", to: "root" },
  { from: "root", to: "rig" },
  { from: "rig", to: "anchors" },
  { from: "anchors", to: "selection" },
  { from: "selection", to: "eyes" },
  { from: "eyes", to: "matrix" },
];

/** One tick down the camera chain. */
export function CameraTick() {
  return (
    <Board
      label="One tick down the camera chain"
      lanes={["Application", "Camera layer", "Scene core", "GPU"]}
      steps={CAMERA_TICK}
      edges={CAMERA_EDGES}
    />
  );
}

/** The routes a shader takes to a pipeline. */
export function ShaderRoutes() {
  const files = data.runtime.flatMap((g) => g.files);
  const compiler = files.find((f) => f.name === "slang-wasm.wasm");
  const steps: BoardStep[] = [
    {
      id: "engine",
      lane: 0,
      row: 0,
      title: "Engine shaders in Slang",
      body: (
        <>
          On the build machine: <C>npm run shaders</C> runs native <C>slangc</C>
          , and WGSL and reflection JSON are checked in.
        </>
      ),
    },
    {
      id: "built",
      lane: 0,
      row: 1,
      title: "User Slang, built",
      body: (
        <>
          On the build machine: <C>scripts/slangShader.mjs</C> writes WGSL for
          the <C>wgsl</C> option. Nothing extra to download.
        </>
      ),
    },
    {
      id: "written",
      lane: 0,
      row: 2,
      title: "User WGSL",
      body: (
        <>
          No compile of ours: passed straight to <C>CustomShader</C>'s{" "}
          <C>wgsl</C> option.
        </>
      ),
    },
    {
      id: "style",
      lane: 0,
      row: 3,
      title: "A 3D Tiles style",
      body: (
        <>
          On the main thread: <C>compileStyleExpression</C> writes WGSL in
          TypeScript, and <C>FeatureStyle</C> passes it as <C>wgsl</C>. Never
          loads Slang.
        </>
      ),
    },
    {
      id: "runtime",
      lane: 0,
      row: 4,
      title: "User Slang, at run time",
      body: (
        <>
          In a worker: <C>CustomShader.fromSlang</C> loads the compiler (
          {size(compiler?.kb)}), or takes its output from IndexedDB if it's been
          compiled before.
        </>
      ),
    },
    {
      id: "units",
      lane: 1,
      row: 0,
      rows: 5,
      title: "Units",
      body: (
        <>
          Each arrives as WGSL with a name and a symbol table: what it defines,
          and what it uses. Slang's output also gets an adapter unit, which
          bridges it to the contract's stages.
        </>
      ),
    },
    {
      id: "link",
      lane: 1,
      row: 5,
      accent: true,
      title: "Link across a boundary",
      body: "On the main thread. Each required symbol is defined exactly once, with the boundary's signatures. A mismatch names the unit and line.",
    },
    {
      id: "pipeline",
      lane: 2,
      row: 5,
      title: "The pipeline",
      body: (
        <>
          <C>createRenderPipelineAsync</C>, cached by the linked code, so
          identical sources share. Content draws with its default material until
          it's ready, and stays that way if it fails.
        </>
      ),
    },
  ];
  const edges: BoardEdge[] = [
    { from: "engine", to: "units" },
    { from: "built", to: "units" },
    { from: "written", to: "units" },
    { from: "style", to: "units" },
    { from: "runtime", to: "units" },
    { from: "units", to: "link" },
    { from: "link", to: "pipeline" },
  ];
  return (
    <Board
      label="The routes a shader takes to a pipeline"
      lanes={["Five sources", "One linker", "GPU"]}
      steps={steps}
      edges={edges}
    />
  );
}

/** What loads when, with what it costs. */
export function LoadingStages() {
  const { globeOnly, library } = data.bundles;
  const asset = (name: string) =>
    library.assets.find((a) => a.name.startsWith(name))?.kb;
  const file = (name: string) =>
    data.runtime.flatMap((g) => g.files).find((f) => f.name === name)?.kb;
  const lazy = (name: string) =>
    globeOnly.lazy.find((c) => c.name === name)?.kb;
  const steps: BoardStep[] = [
    {
      id: "page",
      lane: 0,
      row: 0,
      accent: true,
      title: "The main chunk",
      body: (
        <>
          What the app imports. A globe-only Viewer is {size(globeOnly.main.kb)}
          , or {size(globeOnly.main.gzipKb)} gzipped.
        </>
      ),
      flow: "scripts/checkBundle.mjs fails if precise series or the DAF reader appear here.",
    },
    {
      id: "worker",
      lane: 1,
      row: 1,
      title: "The content worker",
      body: (
        <>
          {size(asset("worker"))}, found from <C>import.meta.url</C>, with no{" "}
          <C>CESIUM_BASE_URL</C> and nothing to copy by hand.
        </>
      ),
    },
    {
      id: "decoders",
      lane: 1,
      row: 2,
      title: "Decoders, when content needs them",
      body: (
        <>
          In the worker: Basis ({size(asset("basis_transcoder"))}) and Draco (
          {size(asset("draco_decoder"))}) WebAssembly.
        </>
      ),
    },
    {
      id: "frames",
      lane: 2,
      row: 3,
      title: 'Asked for at "precise"',
      body: (
        <>
          <C>earthOrientation</C> ({size(lazy("earthOrientation"))}) and{" "}
          <C>ephemeris</C> ({size(lazy("ephemeris"))}) chunks, then their data.
        </>
      ),
      flow: "Stand-ins answer meanwhile.",
    },
    {
      id: "proj",
      lane: 2,
      row: 4,
      title: "Engineering coordinates",
      body: (
        <>
          PROJ's WebAssembly ({size(file("proj_capi.wasm"))}), its database (
          {size(file("proj.db"))}) and the grids a coordinate operation names.
        </>
      ),
    },
    {
      id: "slang",
      lane: 2,
      row: 5,
      title: "Slang at run time",
      body: (
        <>
          Only through <C>CustomShader.fromSlang</C>: the compiler (
          {size(file("slang-wasm.wasm"))}), in a worker. Styling never needs it.
        </>
      ),
    },
  ];
  const edges: BoardEdge[] = [
    { from: "page", to: "worker", label: "engine starts" },
    { from: "worker", to: "decoders" },
    { from: "decoders", to: "frames", label: "a feature asks" },
    { from: "frames", to: "proj" },
    { from: "proj", to: "slang" },
  ];
  return (
    <Board
      label="What loads when"
      lanes={["With the page", "When the engine starts", "When a feature asks"]}
      steps={steps}
      edges={edges}
    />
  );
}

const TRANSLUCENT_TERRAIN: BoardStep[] = [
  {
    id: "slot",
    lane: 0,
    row: 0,
    title: "A region takes a slot",
    body: (
      <>
        A rectangle or polygon compiles to rows in <C>clipBoxes</C>, in one of
        32 slots shared with clips. Its directory row holds its opacity: 0 is a
        clip, and above 0 is translucent. <C>setTerrainOpacity</C> takes a slot
        with no shape, which holds everywhere.
      </>
    ),
  },
  {
    id: "mask",
    lane: 0,
    row: 1,
    title: "Each tile gets a mask",
    body: (
      <>
        A tile's draw records hold the slots its rectangle touches, in{" "}
        <C>terrainClip</C>. The CPU filters per tile, so only tiles a region
        touches change.
      </>
    ),
  },
  {
    id: "twin",
    lane: 0,
    row: 2,
    title: "A blended twin of the material",
    body: (
      <>
        A tile a translucent slot reaches draws with a twin of its material,
        flagged <C>alphaBlend</C>, through <C>World.setDrawMaterial</C>.
        Changing a region's opacity needs no new twin and no recompile, so a
        fade can run every tick.
      </>
    ),
  },
  {
    id: "opacity",
    lane: 1,
    row: 0,
    title: "Opacity per fragment",
    body: (
      <>
        <C>terrainOpacity</C> takes the least opacity of the slots in the mask
        that hold the fragment. A clip gives 0, so it wins over any translucent
        region. The loops have constant bounds, and a budget caps edges tested
        per fragment.
      </>
    ),
  },
  {
    id: "skirt",
    lane: 1,
    row: 1,
    title: "Skirts hide",
    body: (
      <>
        A skirt's opacity is 0 wherever the terrain is less than opaque. Each
        skirt triangle starts at a skirt vertex (<C>skirtStart</C> in the
        record), and a flat bit in <C>ids.z</C> tells the fragment shader.
      </>
    ),
  },
  {
    id: "opaque",
    lane: 2,
    row: 0,
    title: "Opacity 0.999 and up: the opaque pass",
    body: "With depth, shadows, picks and ambient occlusion as usual, so the rest of the tile looks as it did.",
  },
  {
    id: "translucent",
    lane: 2,
    row: 1,
    title: "Below that: the translucent passes",
    body: "Ordered with all other blended content by the view's translucency mode, and tested against the opaque depth per sample. It casts no shadow and takes no ambient occlusion.",
  },
];

/** Translucent terrain, from a region to the passes that draw it. */
export function TranslucentTerrainFlow() {
  return (
    <Board
      label="How translucent terrain draws"
      lanes={[
        "On the CPU, when regions change",
        "In the shader",
        "Where it lands",
      ]}
      steps={TRANSLUCENT_TERRAIN}
      edges={[
        { from: "slot", to: "mask", vertical: true },
        { from: "mask", to: "twin", vertical: true },
        { from: "opacity", to: "skirt", vertical: true },
        { from: "opacity", to: "opaque" },
        { from: "skirt", to: "translucent" },
      ]}
    />
  );
}

const VECTOR: BoardStep[] = [
  {
    id: "feed",
    lane: 0,
    row: 0,
    title: "A feed",
    body: (
      <>
        Typed-array slices through <C>PointSource.update</C>. A point isn't a
        JavaScript object on the hot path, and decoding can run in a worker.
      </>
    ),
    flow: "2.3 ms of CPU for 250,000 points, at 10 Hz.",
  },
  {
    id: "style",
    lane: 0,
    row: 1,
    title: "A style document",
    body: (
      <>
        <C>VectorStyle</C> compiles it to WGSL, and the linker joins it across{" "}
        <C>POINT_STYLE_BOUNDARY</C> or <C>POOL_STYLE_BOUNDARY</C>.
      </>
    ),
  },
  {
    id: "capture",
    lane: 1,
    row: 2,
    title: "Ground capture",
    body: "The height-captures pass draws the ground from above into a depth texture, for points that are clamped.",
  },
  {
    id: "cull",
    lane: 1,
    row: 3,
    accent: true,
    title: "cullPoints",
    body: "In the cull pass: culls each point, clamps it to the capture, and interpolates in time between feed samples.",
  },
  {
    id: "splat",
    lane: 1,
    row: 4,
    title: "Splats, at 6 pixels and below",
    body: "Rasterized in compute, a few threads a point rather than six vertices.",
  },
  {
    id: "quads",
    lane: 2,
    row: 3,
    title: "Quads",
    body: "Larger symbols, drawn in the opaque pass from the cull's list and arguments.",
  },
  {
    id: "drawn",
    lane: 2,
    row: 4,
    title: "drawSplats",
    body: "The splats, depth-tested over the opaque scene.",
  },
  {
    id: "pool",
    lane: 2,
    row: 5,
    title: "ModelPool",
    body: "A few thousand slots of one model for the nearest points that pass the style. Memory follows the slots, not the points.",
  },
];

const VECTOR_EDGES: BoardEdge[] = [
  { from: "feed", to: "style" },
  { from: "style", to: "capture", label: "pipelines" },
  { from: "capture", to: "cull" },
  { from: "cull", to: "quads" },
  { from: "cull", to: "splat" },
  { from: "splat", to: "drawn" },
  { from: "drawn", to: "pool" },
];

/** A point from a feed to the screen. */
export function VectorFlow() {
  return (
    <Board
      label="A point from a feed to the screen"
      lanes={["Main thread", "GPU compute", "GPU render"]}
      steps={VECTOR}
      edges={VECTOR_EDGES}
    />
  );
}

const ION: BoardStep[] = [
  {
    id: "app",
    lane: 0,
    row: 0,
    title: "The application",
    body: (
      <>
        Sets <C>ionDefaults.accessToken</C>, or passes one per call. No token is
        built in.
      </>
    ),
  },
  {
    id: "resolve",
    lane: 1,
    row: 0,
    accent: true,
    title: "resolveIonAsset",
    body: "Reuses a resolved endpoint for 45 minutes, since asset tokens last about an hour and a request costs a round trip of 300 ms or more. Only on a miss does it ask ion. Failures aren't kept.",
  },
  {
    id: "endpoint",
    lane: 2,
    row: 0,
    title: "ion's API",
    body: (
      <>
        <C>v1/assets/id/endpoint</C>, with the application's token.
      </>
    ),
    flow: "Answers with a root URL, an asset token and attributions.",
  },
  {
    id: "credits",
    lane: 1,
    row: 1,
    title: "Show attributions",
    body: "Those not marked collapsible stay on screen.",
  },
  {
    id: "schedule",
    lane: 1,
    row: 2,
    title: "The request scheduler",
    body: "Each request under the asset carries the asset token, in the origin's adaptive window.",
  },
  {
    id: "cdn",
    lane: 2,
    row: 2,
    title: "The asset's host",
    body: "Tiles and terrain. An external asset, such as Photorealistic 3D Tiles, has that service's key in its URL, and sends no ion token.",
  },
];

const ION_EDGES: BoardEdge[] = [
  { from: "app", to: "resolve" },
  { from: "resolve", to: "endpoint" },
  { from: "endpoint", to: "credits", vertical: true },
  { from: "credits", to: "schedule" },
  { from: "schedule", to: "cdn" },
];

/** An ion asset from token to tiles. */
export function IonFlow() {
  return (
    <Board
      label="An ion asset from token to tiles"
      lanes={["Application", "Engine", "ion"]}
      steps={ION}
      edges={ION_EDGES}
    />
  );
}
