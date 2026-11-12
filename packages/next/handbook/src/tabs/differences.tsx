import { C, DataTable, Page, Section, Written } from "../parts.tsx";
import { WhyApiChanges } from "../whyApi.tsx";

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
    old: "Separate viewers, each with its own copy of the scene. SharedContext, marked private, lets scenes share a WebGL context.",
    next: "Any number of views of one world, on one device and tile cache, with links between them (ViewLink). A view can hold its own transform parameters, such as its own exaggeration, or take its own route through a switch node.",
  },
  {
    topic: "Content and what's drawn",
    old: "A Cesium3DTileset is both: its tree and cache, and its style, modelMatrix and show",
    next: "engine.loadTileset gives the content, and world.add a SceneItem: that content in a world, with its own placement, tint, opacity and view mask. Several items share one selection and one cache.",
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
    old: "Logarithmic depth on by default, with the view split into several frustums by a far-to-near ratio",
    next: "Reverse-Z depth32float, a fixed 0.1 m near plane and an infinite far plane.",
  },
  {
    topic: "Color",
    old: "HDR off by default",
    next: "HDR with tonemapping by default for lit color, LDR as a per-view option. Unlit color is never tonemapped. A view's observer sets the exposure in EV100 (a camera, metered or fixed, or the eye), the tone mapping, glare and post stages, each marked physics, a model or a look.",
  },
  {
    topic: "Flat views",
    old: "2D and Columbus view on a fixed map projection, with a scene morph to 3D, for the whole world",
    next: "Planned in 5f, not built: a design view, flat in the project's own CRS, with a morph to the globe. The projections it needs exist as transform-graph nodes. An orthographic camera (5d) gives the 2D look. It's regional, within the CRS's area of use. Whole-world flat maps are an open point.",
  },
  {
    topic: "Streaming",
    old: "Separate systems for the globe and for 3D Tiles",
    next: "One request scheduler and tile selection framework. Stepwise reproduces 1.x selection for comparisons; Budgeted is the default.",
  },
  {
    topic: "Custom shaders",
    old: "GLSL in CustomShader",
    next: "CustomShader in WGSL or Slang, against a versioned contract, joined by a linker. A shader that fails falls back to the engine's, with the error reported. A vertex stage that moved vertices to exaggerate or reproject is better as a transform-graph node: picks, bounds, normals and clips then follow it.",
  },
  {
    topic: "Vertical exaggeration",
    old: "scene.verticalExaggeration and a relative height: one setting for the whole scene",
    next: "A node of the transform graph over the content it exaggerates, from verticalExaggeration and smoothFrame. What isn't under it (the Moon, the camera) isn't exaggerated, picks and measurements keep true heights, and a ceiling shifts the sky instead of stretching it. A slider is one float, and each view can hold its own value.",
  },
  {
    topic: "Placing and reprojecting content",
    old: "A tileset's transform and modelMatrix, with 3D Tiles' ECEF coordinates. Content authored in a projected CRS isn't reprojected",
    next: "A tree of frames whose edges are affine or smooth. A tileset's declared CRS picks its route to the body: the identity for a geocentric one, a fitted coordinate operation for a projected one, a rigid site transform for a local one. There are no placement modes. The tree is compiled to one GPU function per route.",
  },
  {
    topic: "Clipping",
    old: "ClippingPlaneCollection and ClippingPolygonCollection set on a tileset, a model or the globe, with an edge highlight and no caps",
    next: "Clips are world objects in any frame: planes, boxes and polygon prisms, joined by union or intersection, that views opt into. They cut every representation, picks and queries included. Cut faces are capped (on the GPU, exact for a b-rep), and an effect can leave what's cut as a translucent ghost.",
  },
  {
    topic: "Knowing it has loaded",
    old: "Events on each tileset (initialTilesLoaded, allTilesLoaded)",
    next: "await engine.whenReady(view): one promise for everything a view draws, resolved after the first frame with no stand-ins. It is provisional.",
  },
  {
    topic: "3D Tiles styling",
    old: "Cesium3DTileStyle expressions evaluated per feature on the CPU, including strings and regExp",
    next: "FeatureStyle compiles the same language to WGSL, evaluated on the GPU. Strings compare with === and !==. Regular expressions, isDefined() and undefined checks are refused, and blends are in linear light.",
  },
  {
    topic: "The analytic Moon",
    old: "Simon et al. (1994)'s main terms: up to 0.31° and 2,051 km from DE440, sampled daily over 2000 to 2050",
    next: "Meeus's chapter 47: within 16″ and 27 km of DE440 over the same span. The globe-only sky's Moon disk no longer matches 1.x's.",
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
    next: "Instant and a frame tree in optional modules; a view's render space follows its camera rig, and a tileset sits under a node of the transform graph.",
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
  {
    topic: "Credits",
    old: "A primitive's credits go to the frame state, and CreditDisplay shows them",
    next: "A tileset carries its attributions, and the Viewer credits every tileset with an item some view shows.",
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
    what: "KHR_materials_unlit, KHR_mesh_quantization, Draco, meshopt (EXT_ and KHR_), KHR_texture_basisu, EXT_mesh_features, EXT_structural_metadata, EXT_mesh_gpu_instancing, EXT_instance_features, KHR_lights_punctual (point and spot), CESIUM_RTC, 3DTILES_batch_table_hierarchy",
  },
  {
    state: "Read, with limits",
    what: "3DTILES_multiple_contents (only the first content is drawn, with a warning), KHR_texture_transform (ignored, with a warning), CESIUM_primitive_outline (tolerated, not drawn), BENTLEY_brep (drawn through World.addBrep, not by the model path)",
  },
  {
    state: "Planned",
    what: "Implicit tiling (subtree files aren't read), more bounding volumes, point clouds, Gaussian splats, vector content, classification, and the 3D Tiles 2.0 draft's EXT_geospatial_crs and EXT_georeference, with the API review",
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
      <WhyApiChanges />

      <Section title="Concept by concept">
        <p>
          For API names and code, area by area, the 1.x to 2.0 API tab shows
          breaking changes first.
        </p>
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
          from="the overall plan, sections 2, 3, 8 and 13.37, and the source"
          on="2026-11-12"
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
        <Written from="the overall plan, section 8" on="2026-11-08" />
      </Section>

      <Section title="What 2.0 doesn't do yet">
        <p>
          Not in the proof of concept: Entities and DataSources; Primitive,
          Geometry and Appearance; CZML, KML and GeoJSON; underground viewing;
          imagery draped on 3D Tiles.
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
          Read from the loaders' supported lists in the code on 2026-11-12. The
          overall plan's section 4.1 table, from revision r33, says more is
          planned than this lists.
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
          Details are in the overall plan's section 14 and{" "}
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
