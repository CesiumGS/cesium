/**
 * What the Rendering tab says about the pipeline that code can't say itself:
 * what each pass does, where the seams are, and why choices were made. Which
 * passes exist, what they read and write, and each target's format are
 * generated (scripts/handbookData.mjs `readPipeline`). The build warns when a
 * pass has no note here, or a note names a pass, test or code name that no
 * longer exists.
 *
 * Plain data, with no imports: the data script reads this file too.
 */

export type PassKind = "compute" | "render" | "copy" | "compute, render";

export interface PassNote {
  group: string;
  kind: PassKind;
  /** What it's for, in a line. */
  summary: string;
  /** More, for its entry below the chart. */
  detail: string;
  /** When it does nothing. */
  skipped?: string;
  /** Buffers and persistent textures the graph doesn't track. */
  reads?: readonly string[];
  writes?: readonly string[];
}

/** Buffers and persistent textures, as columns of the chart (by hand). */
export const BUFFERS = [
  "view block",
  "draw records",
  "transforms",
  "clip regions",
  "items",
  "draw arguments",
  "lights and froxels",
  "shadow map",
  "AO buffer",
] as const;

export const PASS_GROUPS = [
  "Set up the view",
  "Depth and occlusion",
  "The opaque scene",
  "Translucency",
  "Read back",
  "To the screen",
] as const;

export const PASSES: Record<string, PassNote> = {
  shadows: {
    group: "Set up the view",
    kind: "compute, render",
    summary: "Each cascade: its own cull, then the casters' depth.",
    detail:
      "For each of the 4 cascades, the cascade's view block is copied in, the world is culled again for it, without point sets, and the casters' bundle draws depth into that layer of the shadow map. The Shadows tab follows this through.",
    skipped: "When the view has no shadows this tick.",
    reads: ["view block", "draw records", "transforms", "clip regions"],
    writes: ["items", "draw arguments", "shadow map"],
  },
  "height-captures": {
    group: "Set up the view",
    kind: "compute, render",
    summary: "Ground only, straight down, for heights.",
    detail:
      "A capture this view owes draws the ground into its own depth texture from above, after a cull of its own. Reverse-Z clears to 0, which means nothing below the capture's bottom.",
    skipped: "When no capture is due from this view.",
    reads: ["view block", "draw records", "transforms", "clip regions"],
    writes: ["items", "draw arguments"],
  },
  "select-view": {
    group: "Set up the view",
    kind: "copy",
    summary: "This view's blocks, copied into the current buffers.",
    detail:
      "The view, shadow and light blocks go from staging into one global buffer each. Render bundles are recorded once, so they never need a per-view binding: the buffers they read are rewritten per view instead.",
    writes: ["view block", "lights and froxels"],
  },
  lights: {
    group: "Set up the view",
    kind: "compute",
    summary: "Point and spot lights into froxels.",
    detail:
      "One workgroup per tile of a 32 × 18 × 32 froxel grid assigns the view's lights, for the opaque pass to read.",
    skipped: "When the view has no point or spot lights.",
    reads: ["view block"],
    writes: ["lights and froxels"],
  },
  cull: {
    group: "Set up the view",
    kind: "compute",
    summary: "Which draws this view sees, and their draw arguments.",
    detail:
      "The first view's cull uploads changed table rows. Then the batches' counts clear, cullRecords and cullInstances append visible items, and writeDrawArgs writes the indirect arguments. Point sets follow, with cullPoints and writePointArgs. This is also the one place large coordinates meet the camera.",
    reads: ["view block", "draw records", "transforms"],
    writes: ["items", "draw arguments"],
  },
  "sky-view": {
    group: "Set up the view",
    kind: "render",
    summary: "The sky around the camera, as a table.",
    detail: "Built before the opaque pass draws from it.",
    skipped: "When the view draws no sky, or the camera is outside the air.",
    reads: ["view block"],
  },
  environment: {
    group: "Set up the view",
    kind: "compute, render",
    summary: "Environment lighting, rebuilt from the sky if due.",
    detail: "The view's probe is rebuilt only when it's pending.",
    skipped: "When the probe isn't due.",
    reads: ["view block"],
  },
  "aerial-perspective": {
    group: "Set up the view",
    kind: "compute, render",
    summary: "The air between the camera and the scene.",
    detail:
      "A volume for the opaque pass to read. From high up, it's marched per vertex instead, with no volume.",
    skipped: "When the view draws none, or marches per vertex.",
    reads: ["view block"],
  },
  prepass: {
    group: "Depth and occlusion",
    kind: "render",
    summary: "Single-sampled depth and normals, for ambient occlusion.",
    detail:
      "Draws what the view culled, with the casters' vertex stage and the opaque pass's discards. Its targets are what screen-space passes read.",
    skipped: "When ambient occlusion is off for the view.",
    reads: [
      "view block",
      "draw records",
      "clip regions",
      "items",
      "draw arguments",
    ],
  },
  "ambient-occlusion": {
    group: "Depth and occlusion",
    kind: "compute",
    summary: "A horizon search at half resolution, then a blur.",
    detail:
      "The trace runs at half resolution. The blur upsamples to full resolution and packs the result into a buffer the opaque pass reads, one global buffer rewritten per view, like the shadow map.",
    skipped: "When ambient occlusion is off for the view.",
    reads: ["view block"],
    writes: ["AO buffer"],
  },
  stars: {
    group: "The opaque scene",
    kind: "render",
    summary: "The stars, into a layer the sky draws from.",
    detail: "A layer of its own, read by the sky's draw in the opaque pass.",
  },
  opaque: {
    group: "The opaque scene",
    kind: "render",
    summary: "Depth first, then shading where that depth is, at 4 × MSAA.",
    detail:
      "The world's depth bundle draws first with no color, then its shading bundle shades where depth is equal, so each sample shades once. Point symbols the cull rasterized draw next, then the sky. Lit color goes to rgba16float, unlit color to a separate display-referred target, and feature IDs to rg16uint.",
    reads: [
      "view block",
      "draw records",
      "clip regions",
      "items",
      "draw arguments",
      "lights and froxels",
      "shadow map",
      "AO buffer",
    ],
  },
  translucent: {
    group: "Translucency",
    kind: "compute, render",
    summary: "Per-pixel lists, or moments, chosen per view.",
    detail:
      'In "exact" mode, blended fragments go into per-pixel lists, and a compute pass sorts and blends each list. In "moments" mode, one pass writes their moments and a second their weighted light. Translucent terrain is drawn here like any other blended surface, with no pass of its own.',
    reads: [
      "view block",
      "draw records",
      "clip regions",
      "items",
      "draw arguments",
    ],
  },
  composite: {
    group: "Translucency",
    kind: "render",
    summary: "Translucency over the opaque pass's resolved targets.",
    detail: "A full-screen pass, before anything reads those targets.",
  },
  "depth-range": {
    group: "Read back",
    kind: "compute",
    summary: "The nearest and farthest surface shown.",
    detail: "Read back a tick or so late, for the next tick's shadow cascades.",
  },
  "hdr-readback": {
    group: "Read back",
    kind: "copy",
    summary: "The image's HDR values, when something asks.",
    detail: "Copies what was asked for into a readback buffer.",
    skipped: "When no read is pending.",
  },
  meter: {
    group: "Read back",
    kind: "compute",
    summary: "A reading of the image, for automatic exposure.",
    detail:
      "It takes the scene's light alone: the surface writes light's share of each pixel to the target's alpha, so emission, added after exposure, doesn't pull the reading. Read back later, and a reading that moves the state asks for a tick.",
    skipped: "When the view's exposure is fixed.",
  },
  pick: {
    group: "Read back",
    kind: "compute",
    summary: "Feature ID and depth at one pixel.",
    detail:
      "Reads sample 0, because integer targets can't be MSAA-resolved. One pick per tick keeps the shared buffers simple. A view that isn't rendering serves a pick from its last image with this pass alone.",
    skipped: "When no pick is pending.",
  },
  adaptation: {
    group: "To the screen",
    kind: "compute",
    summary: "The eye's local adaptation, as a bilateral grid.",
    detail:
      "The image's log luminance at a sixteenth of its size by 16 levels, blurred, for the present pass.",
    skipped: "When the view's exposure isn't the \"eye\" kind.",
  },
  present: {
    group: "To the screen",
    kind: "render",
    summary: "Tone mapping to the target, with optional FXAA.",
    detail:
      "Combines lit and unlit color, tone maps and encodes. With FXAA on, it tone maps into the ldr target first, and FXAA reads that into the view's rectangle.",
  },
};

/** What an imported target's format is: the graph doesn't declare these. */
export const IMPORTED_FORMATS: Record<string, string> = {
  "featureId.msaa": "rg16uint",
  "depth.msaa": "depth32float",
  output: "the canvas's",
};

/** Formats chosen in code by what the device offers. */
export const EXPRESSION_FORMATS: Record<string, string> = {
  "moments.zero": "chosen by device",
  "moments.higher": "chosen by device",
};

export interface SeamNote {
  id: string;
  name: string;
  /** Code names, each checked to exist in its file. */
  code: readonly { name: string; file: string }[];
  /** Passes it's drawn on in the chart. */
  passes: readonly string[];
  today: string;
  readyFor: string;
  guards: readonly { file: string; title: string }[];
}

export const SEAMS: readonly SeamNote[] = [
  {
    id: "S1",
    name: "Per-draw constants",
    code: [
      { name: "DrawConstants", file: "src/render/drawConstants.ts" },
      { name: "drawRecord", file: "src/shaders/cullTables.slang" },
    ],
    passes: ["shadows", "cull", "prepass", "opaque", "translucent"],
    today: "A 160-byte record per draw in a table mirrored to the GPU.",
    readyFor: "Immediates or push constants",
    guards: [
      {
        file: "test/seams.test.ts",
        title: "writes draw records only in src/render/drawConstants.ts",
      },
      {
        file: "test/seams.test.ts",
        title: "reads draw records in Slang only through drawRecord",
      },
      {
        file: "test/seams.test.ts",
        title: "writes the records' GPU table only through the seam",
      },
    ],
  },
  {
    id: "S2",
    name: "Draw arguments",
    code: [
      { name: "DrawArguments", file: "src/render/drawArguments.ts" },
      { name: "argumentSlot", file: "src/shaders/cullTables.slang" },
    ],
    passes: ["shadows", "cull", "prepass", "opaque", "translucent"],
    today: "One indirect draw per batch, its items bound as a vertex buffer.",
    readyFor:
      "Multi-draw indirect, GPU-driven submission, or a later compute pass writing the counts",
    guards: [
      {
        file: "test/seams.test.ts",
        title:
          "issues indexed and indirect draws only in src/render/drawArguments.ts",
      },
      {
        file: "test/seams.test.ts",
        title:
          "reaches draw arguments in Slang only through cullTables' accessors",
      },
    ],
  },
  {
    id: "S3",
    name: "Geometry submission",
    code: [{ name: "drawBatch", file: "src/render/drawArguments.ts" }],
    passes: ["prepass", "opaque", "translucent"],
    today: "Vertex and index buffers bound on one path only.",
    readyFor: "A mesh-shader backend replacing the compute-plus-indirect stage",
    guards: [
      {
        file: "test/seams.test.ts",
        title: "binds vertex and index buffers only on the submission path",
      },
    ],
  },
  {
    id: "S4",
    name: "Per-vertex placements",
    code: [
      { name: "placementRow", file: "src/shaders/placement.slang" },
      { name: "placements", file: "src/scene/placementTable.ts" },
      { name: "placementOf", file: "src/frames/placementQuery.ts" },
    ],
    passes: ["shadows", "prepass", "opaque", "translucent"],
    today: "A placements buffer, evaluated in the vertex stage.",
    readyFor: "Another per-draw data backend, or later tessellation",
    guards: [
      {
        file: "test/seams.test.ts",
        title: "is read in Slang only through placement.slang's placementRow",
      },
      {
        file: "test/seams.test.ts",
        title: "is written only by src/scene/placementTable.ts",
      },
    ],
  },
  {
    id: "S5",
    name: "Bindless resources",
    code: [{ name: "materialTexture", file: "src/shaders/surface.slang" }],
    passes: ["opaque", "translucent"],
    today: "A per-material bind group, baked into the bundle.",
    readyFor: "WebGPU resource tables",
    guards: [
      {
        file: "test/bindless.test.ts",
        title: "reads material textures only through materialTexture",
      },
    ],
  },
  {
    id: "S6",
    name: "Ray queries",
    code: [
      { name: "queries", file: "src/scene/Engine.ts" },
      { name: "QueryHost", file: "src/query/queries.ts" },
    ],
    passes: [],
    today:
      "Beside the frame graph: CPU structures for drawn terrain, and a brute-force GPU cast for draws. Asynchronous, batched, with three-way answers.",
    readyFor: "A hardware ray-query engine",
    guards: [
      {
        file: "test/seams.test.ts",
        title:
          "examples and measure reach rays only through the query interface",
      },
      {
        file: "test/seams.test.ts",
        title: "the query interface's backends are where rays are reached",
      },
    ],
  },
  {
    id: "S7",
    name: "The linker's named boundaries",
    code: [
      { name: "SURFACE_BOUNDARY", file: "src/shaders/link/boundary.ts" },
      { name: "SURFACE_VERTEX_BOUNDARY", file: "src/shaders/link/boundary.ts" },
      { name: "POINT_STYLE_BOUNDARY", file: "src/shaders/link/boundary.ts" },
      { name: "POOL_STYLE_BOUNDARY", file: "src/shaders/link/boundary.ts" },
    ],
    passes: ["cull", "prepass", "opaque", "translucent"],
    today:
      "User shaders and styles join engine shaders through a declared boundary. A mismatch is a diagnostic naming the unit and line.",
    readyFor: "Slang module linking, WESL-style imports, or WGSL linking",
    guards: [
      { file: "test/linker.test.ts", title: "is what surface.slang exports" },
      {
        file: "test/linker.test.ts",
        title: "is met by a custom shader's units, named values included",
      },
    ],
  },
  {
    id: "S8",
    name: "Module boundaries a host can replace",
    code: [
      { name: "FrameResolver", file: "src/camera/frameResolver.ts" },
      { name: "CoordinateService", file: "src/frames/index.ts" },
      { name: "SnapService", file: "src/proj/index.ts" },
    ],
    passes: [],
    today:
      "Frame resolver, coordinate service, snap service, selection policy and controllers are interfaces. The core imports none of the modules behind them.",
    readyFor: "A host application's own services",
    guards: [
      {
        file: "test/importBoundary.test.ts",
        title: "the core imports nothing from time, frames, proj or measure",
      },
    ],
  },
  {
    id: "S9",
    name: "Acceleration-structure lifetime",
    code: [
      { name: "acceleration", file: "src/scene/World.ts" },
      { name: "AccelerationStructures", file: "src/streaming/acceleration.ts" },
    ],
    passes: [],
    today:
      "A hook told of every tile placed and unloaded, with nothing behind it yet.",
    readyFor: "Per-tile and per-tick acceleration structures for ray queries",
    guards: [
      {
        file: "test/acceleration.test.ts",
        title:
          "sees every tile placed and unloaded, with its draws, on a streamed tileset",
      },
    ],
  },
];

export interface DecisionNote {
  id: string;
  title: string;
  chosen: string;
  /** What it was instead of; left out where the sources don't say. */
  insteadOf?: string;
  /** Why; left out where the sources don't say. */
  why?: string;
  source: string;
  passes: readonly string[];
}

export const DECISIONS: readonly DecisionNote[] = [
  {
    id: "D1",
    title: "GPU-driven culling, with one indirect draw per batch",
    chosen:
      "A compute cull per view appends visible items, and each batch of records sharing a mesh and material is one indirect draw.",
    insteadOf: "A command list rebuilt on the CPU each tick, as in 1.x.",
    why: "An indirect call's cost scales with the number of calls: at 20,000 draws, on an Intel iGPU, GPU time in the pass was 8.67 ms against 4.37 ms for direct draws. So calls are batched rather than one per draw.",
    source: "Overall plan, sections 3.3 and 10",
    passes: ["cull"],
  },
  {
    id: "D2",
    title: "Render bundles, recorded once",
    chosen:
      "A world's draws are recorded into bundles, re-recorded only when its batches change. Per-view data lives in buffers rewritten per view.",
    why: "CPU time per tick stayed flat, at 0.6 to 0.9 ms, from 1,000 to 20,000 draws.",
    source: "Overall plan, section 10",
    passes: ["select-view", "opaque"],
  },
  {
    id: "D3",
    title: "Depth first inside the MSAA opaque pass",
    chosen:
      "The opaque pass draws its depth, then shades only where depth is equal. Positions are @invariant, so both stages agree to the bit.",
    insteadOf: "Shading every fragment that passes the depth test as drawn.",
    why: "With lights, cost was per fragment drawn, not per pixel. Over lower Manhattan by night, the opaque pass took 6.9 ms against 10.0 with 576 spots, and 4.3 against 6.4 without lights.",
    source: "Overall plan, section 4.2, r44",
    passes: ["opaque"],
  },
  {
    id: "D4",
    title: "A depth and normal prepass for screen-space work",
    chosen:
      "A separate, single-sampled prepass drawn from the same culled batches.",
    insteadOf: "A visibility buffer.",
    why: "Ambient occlusion needs depth and normals before shading. A visibility buffer's deferred shading waits on bindless textures, and writing triangle IDs needs primitive_index, an optional feature. A visibility buffer can replace the prepass later without changing what reads its targets.",
    source: "Overall plan, section 4.2",
    passes: ["prepass", "ambient-occlusion"],
  },
  {
    id: "D5",
    title: "On-demand rendering by default",
    chosen:
      "The engine tracks what changed, per view, and renders only what can show it. Continuous rendering is an option.",
    insteadOf: "Rendering every tick, 1.x's default.",
    why: "Every scene change already goes through engine APIs, so the engine can see them. 1.x can't see every change, so its on-demand mode is opt-in.",
    source: "Overall plan, section 13.8",
    passes: [],
  },
  {
    id: "D6",
    title: "A 160-byte record and a separate transform table",
    chosen:
      "A draw record holds a transform index. Transforms live in their own table, composed in float64 on the CPU.",
    insteadOf: "A flattened placement in every record (192 bytes then).",
    why: "With placements flattened into records, moving anything meant rewriting every one of its records. The record is 148 bytes used, padded to WGSL's 16-byte alignment.",
    source: "Overall plan, section 13.9; src/render/layout.ts",
    passes: ["cull"],
  },
  {
    id: "D7",
    title: "HDR for lit color, a display target for unlit",
    chosen:
      "Lit color in rgba16float, tone mapped at the end. Unlit color in rgba8unorm-srgb, never tone mapped.",
    why: "It matches the parity baseline: 1.x with HDR on for lit color, and off for unlit.",
    source: "Overall plan, section 8",
    passes: ["opaque", "present"],
  },
  {
    id: "D8",
    title: "Feature IDs in rg16uint, read at sample 0",
    chosen:
      "A 32-bit ID split across two channels, read with a custom sample-0 resolve at pick time.",
    insteadOf: "r32uint.",
    why: "WebGPU doesn't allow multisampled r32uint, and integer targets can't be MSAA-resolved.",
    source: "Overall plan, sections 3.5 and 10",
    passes: ["opaque", "pick"],
  },
  {
    id: "D9",
    title: "Asynchronous picks",
    chosen: "A pick reads targets already drawn and answers through a promise.",
    insteadOf:
      "1.x's synchronous pick, which re-renders into a pick framebuffer.",
    why: "mapAsync takes a tick or more, so the API exposes that as a promise.",
    source: "Overall plan, sections 2 and 3.5",
    passes: ["pick"],
  },
  {
    id: "D10",
    title: "Two translucency modes, chosen per view",
    chosen:
      'Translucent fragments are composited in a dedicated pass, as exact per-pixel lists ("exact") or by moments ("moments").',
    source: "Overall plan, section 3.5",
    passes: ["translucent", "composite"],
  },
];

export const COMING = [
  "Presentations of a tileset: one selection with several draws.",
  "A GPU tessellation engine, later: not built, with its seam (S4 and S2) kept open. The Tessellation tab holds its place.",
];

/** A pass the plan calls for and nothing builds: the chart's dashed row. */
export const PLANNED_PASS = {
  after: "cull",
  name: "tessellation",
  kind: "compute, not built",
  seams: ["S4", "S2"],
  reads: ["draw records"],
  writes: ["draw arguments"],
};
