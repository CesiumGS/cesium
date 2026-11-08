import { C, DataTable, Page, Section, Written } from "../parts.tsx";

const CONCEPTS = [
  {
    topic: "Graphics API",
    old: "WebGL 2",
    next: "Core WebGPU only. No WebGL fallback and no compatibility mode.",
  },
  {
    topic: "Top-level objects",
    old: "Viewer and Scene, one WebGL context per viewer",
    next: "Engine (one GPU device), World (content), View (camera and target). Viewer exists on top, in widgets.",
  },
  {
    topic: "Several views",
    old: "Separate viewers, each with its own copy of the scene",
    next: "Any number of views of one world, on one device and tile cache, with links between them (ViewLink).",
  },
  {
    topic: "Each tick's work",
    old: "Primitives' update(frameState) rebuilds a command list",
    next: "Objects register with the world and mark themselves dirty. Draws live in tables mirrored to GPU buffers, with culling in compute.",
  },
  {
    topic: "Math",
    old: "Classes such as Cartesian3, with optional result parameters",
    next: "Typed arrays, with required out parameters. The parity tests use 1.x math as an oracle.",
  },
  {
    topic: "Picking",
    old: "Synchronous, re-renders into a pick framebuffer",
    next: "view.pick returns a promise and reads back a feature-ID target, with no extra render.",
  },
  {
    topic: "Depth",
    old: "Logarithmic depth on by default, multi-frustum as fallback",
    next: "Reverse-Z depth32float, a fixed 0.1 m near plane and an infinite far plane.",
  },
  {
    topic: "Color",
    old: "HDR off by default",
    next: "HDR with tonemapping by default for lit color, LDR as a per-view option. Unlit color is never tonemapped.",
  },
  {
    topic: "Streaming",
    old: "Separate systems for the globe and for 3D Tiles",
    next: "One request scheduler and tile selection framework. Stepwise reproduces 1.x selection for comparisons; Budgeted is the default.",
  },
  {
    topic: "Custom shaders",
    old: "GLSL in CustomShader",
    next: "CustomShader in WGSL or Slang, against a versioned contract, joined by a linker. A shader that fails falls back to the engine's, with the error reported.",
  },
  {
    topic: "Large point data",
    old: "Entities and billboard collections, re-clamped on the CPU",
    next: "PointSource and VectorLayer: typed-array updates, clamped and culled on the GPU. Entities and DataSources aren't in the proof of concept.",
  },
  {
    topic: "Clamping",
    old: "HeightReference clamps to whatever has loaded, and moves content on each refinement",
    next: "A Clamp samples the most detailed ground first and settles once, then tracks the surface. Its state is explicit: settled and whenSettled().",
  },
  {
    topic: "Time and reference frames",
    old: "JulianDate, Transforms, the camera in one Earth-fixed space",
    next: "Instant and a frame tree in optional modules; a view's render space follows its camera rig.",
  },
  {
    topic: "Assets",
    old: "CESIUM_BASE_URL and copied static files",
    next: "Workers, wasm and assets are found from import.meta.url, with nothing to copy.",
  },
  {
    topic: "Content Security Policy",
    old: "The bundled Basis transcoder needs 'unsafe-eval' in workers",
    next: "Only 'wasm-unsafe-eval', and only for the worker. Nothing generates code at run time.",
  },
  {
    topic: "ion token",
    old: "A default token is built in",
    next: "None built in: the application sets ionDefaults.accessToken or passes one.",
  },
];

const CHOICES = [
  {
    choice: "Globe depth",
    old: "depthTestAgainstTerrain is off by default, so content behind mountains draws through them.",
    next: "Real terrain occludes like any other surface. The bare ellipsoid, a stand-in for ground, never hides content.",
    revisit:
      "Photogrammetry or BIM a little below terrain turns out to be common in practice.",
  },
  {
    choice: "Clamped content",
    old: "Clamps to the coarsest terrain first, kilometers off, and moves on each refinement.",
    next: "Stays where it was placed until the most detailed ground under it is sampled, then settles.",
    revisit: "Many clamped anchors make per-anchor sampling costly.",
  },
  {
    choice: "Loading in motion",
    old: "cullRequestsWhileMoving leaves content the camera sweeps past coarse or missing until it stops.",
    next: "Prefetches what the camera will reveal 1 s ahead, at half the detail, after everything visible. Sharper in motion, for more bytes.",
    revisit: "Bytes matter more than motion quality for a deployment.",
  },
];

const EXTENSIONS = [
  {
    state: "Supported",
    what: "KHR_materials_unlit, KHR_mesh_quantization, Draco, meshopt, KHR_texture_basisu, EXT_mesh_features, EXT_structural_metadata, EXT_mesh_gpu_instancing, EXT_instance_features, CESIUM_RTC, 3DTILES_batch_table_hierarchy",
  },
  {
    state: "Planned",
    what: "Implicit tiling, multiple contents, more bounding volumes, point clouds, Gaussian splats, vector content, classification",
  },
  {
    state: "Later or undecided",
    what: "Voxels, KHR_implicit_shapes, AGI_articulations, NGA_gpm_local; older extensions to upgrade on load or drop",
  },
];

const FINDINGS = [
  "A tileset without the required top-level geometricError makes the root's early-out SSE NaN, so the root is never skipped.",
  "A parent can stay visible while every child is culled by its own children-bounds check, selecting a very coarse tile.",
  "QuantizedMeshTerrainData.interpolateHeight returns undefined for every loaded globe tile. sampleTerrain works only because it fetches fresh data.",
  "Cesium3DTileset.getHeight misses geometry the renderer draws: on OSM Buildings it found no surface at 25 of 49 grid points that Scene.sampleHeight hits.",
  "sampleTerrain keeps a position's input height when sampling fails after a mesh was built.",
  "Terrain height callbacks pass terrain-only heights, so a clamp-to-ground billboard can drop off a tileset's roof.",
  "Model.pick passes 5 arguments to pickModel's 7, so result lands in ellipsoid. Tile content works by accident.",
  "HeightmapTerrainData's mesh-path heights ignore heightScale and heightOffset after createMesh.",
];

const BACKPORTS = [
  "Locating workers, wasm and assets from import.meta.url in the ESM build, keeping the blob shim 1.x already uses for cross-origin workers. It should first be confirmed against the failures users report.",
  "Patching the Basis glue's four embind code generators at build time, so a strict worker policy needs only 'wasm-unsafe-eval'. 2.0's patch gave identical output on 72 transcodes.",
];

export function Differences() {
  return (
    <Page
      title="Differences from 1.x"
      status="current"
      lede={
        <>
          2.0 shares no runtime code with 1.x, and its API breaks on purpose.
          The rule for behavior: mirror 1.x where its behavior is what users
          want. Where it works around 1.x's architecture, or trades correctness
          for convenience, do what 2.0's design implies, keep a setting when
          users depend on the old way, and record the choice.
        </>
      }
    >
      <Section title="Concept by concept">
        <DataTable
          label="1.x and 2.0, concept by concept"
          columns={[
            { head: "Topic", cell: (r) => r.topic },
            { head: "1.x", cell: (r) => r.old },
            { head: "2.0", cell: (r) => r.next },
          ]}
          rows={CONCEPTS}
        />
        <Written
          from="the master plan, sections 2, 3 and 8, and the source"
          on="2026-11-08"
        />
      </Section>

      <Section title="Product choices, and when to revisit them">
        <p>
          Where 2.0 behaves differently on purpose, the plan records the choice
          and what would change it.
        </p>
        <DataTable
          label="Product choices"
          columns={[
            { head: "Choice", cell: (r) => r.choice },
            { head: "1.x", cell: (r) => r.old },
            { head: "2.0", cell: (r) => r.next },
            { head: "Revisit if", cell: (r) => r.revisit },
          ]}
          rows={CHOICES}
        />
        <Written from="the master plan, section 8" on="2026-11-08" />
      </Section>

      <Section title="What 2.0 doesn't do yet">
        <p>
          Not in the proof of concept: Entities and DataSources; Primitive,
          Geometry and Appearance; 2D and Columbus view; CZML, KML and GeoJSON;
          underground and globe translucency; imagery draped on 3D Tiles.
        </p>
        <h3>Tileset and glTF extensions</h3>
        <DataTable
          label="Extension coverage"
          columns={[
            { head: "State", cell: (r) => r.state },
            { head: "Extensions", cell: (r) => r.what },
          ]}
          rows={EXTENSIONS}
        />
        <p className="provenance">
          Summarized from the master plan, section 4.1, whose table dates from
          revision r33. It needs a refresh against M4's work before anyone
          relies on the details.
        </p>
      </Section>

      <Section title="Found in 1.x along the way">
        <p>
          Using 1.x as an oracle turned up the following. None is filed yet, or
          only asked about informally. They are for the 1.x team to weigh.
        </p>
        <ul>
          {FINDINGS.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
        <p>
          Details are in the master plan's section 14 and{" "}
          <C>packages/next/docs/clamping-1x-spec.md</C>.
        </p>
        <h3>Worth backporting to 1.x</h3>
        <ul>
          {BACKPORTS.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      </Section>
    </Page>
  );
}
