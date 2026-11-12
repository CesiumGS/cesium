import { Fragment, type ReactNode } from "react";
import { data } from "../data.ts";
import { CoreTiers } from "../modules.tsx";
import {
  C,
  DataTable,
  Figure,
  Flow,
  Note,
  Page,
  Section,
  Written,
  type Column,
} from "../parts.tsx";

interface Subsystem {
  name: string;
  folders: string[];
  seam: ReactNode;
  tabs: { href: string; label: string }[];
}

/** The core's subsystems: where each lives, how it meets the rest, and the tab that covers it. */
const SUBSYSTEMS: Subsystem[] = [
  {
    name: "Transform graph",
    folders: ["transform", "transforms", "georeference"],
    seam: (
      <>
        A camera route (<C>camera/route.ts</C>) is bridged to a graph route (
        <C>world/routeBridge.ts</C>) and compiled; a world resolves frames
        through the <C>FrameResolver</C>. Content only names a node.
      </>
    ),
    tabs: [
      { href: "#/transform-graph", label: "Transform graph" },
      { href: "#/georeferencing", label: "Georeferencing" },
    ],
  },
  {
    name: "B-reps",
    folders: ["brep", "scene/world/brep.ts", "scene/world/patches.ts"],
    seam: (
      <>
        A <C>BrepForm</C>. Kernels (SMLib, OCCT) and sections run in workers
        behind <C>kernelClient</C> and <C>sectionClient</C>; the world draws
        each face as a patch, diced per view on the GPU.
      </>
    ),
    tabs: [
      { href: "#/breps", label: "B-reps and geometry queries" },
      { href: "#/tessellation", label: "GPU tessellation" },
    ],
  },
  {
    name: "Geometry queries",
    folders: ["query", "scene/world/rays.ts", "scene/world/clips.ts"],
    seam: (
      <>
        <C>Engine.queries</C> (<C>SpatialQueries</C>) over ray backends for
        draws, terrain, the ellipsoid and a form&apos;s own geometry; every
        answer carries its accuracy. Clips are world objects the views read.
      </>
    ),
    tabs: [
      { href: "#/breps", label: "B-reps and geometry queries" },
      { href: "#/clipping", label: "Clipping" },
    ],
  },
  {
    name: "Vectors",
    folders: ["vector"],
    seam: (
      <>
        <C>VectorLayer</C> adds its points and models as draws of a world (
        <C>world.addDraw</C>); a <C>PointSource</C> gives a warp the frame
        kernel that carries points the GPU writes.
      </>
    ),
    tabs: [{ href: "#/vector", label: "Vector rendering" }],
  },
  {
    name: "Cameras",
    folders: ["camera", "scene/*Controller.ts", "scene/View.ts"],
    seam: (
      <>
        <C>CameraLayer</C> evaluates each view&apos;s rig at the clock&apos;s
        time and places its anchors by route; the controllers (orbit, globe,
        inspect) drive a view&apos;s camera and touch.
      </>
    ),
    tabs: [{ href: "#/cameras", label: "Cameras" }],
  },
  {
    name: "Streaming",
    folders: ["streaming", "tiles", "io"],
    seam: (
      <>
        <C>DrawSink</C> to draw and <C>TilesetHost</C> to load and schedule;
        decoding runs in the content workers (<C>io/WorkerPool.ts</C>).
      </>
    ),
    tabs: [{ href: "#/selection", label: "Tile selection" }],
  },
  {
    name: "Globe",
    folders: ["globe"],
    seam: (
      <>
        A <C>Tileset3D</C> of terrain and imagery, so it draws through the same
        sink. The renderer reads two of its things by name: the imagery provider
        and the city lights; a pick ray reads its terrain.
      </>
    ),
    tabs: [
      { href: "#/selection", label: "Tile selection" },
      { href: "#/rendering", label: "Rendering" },
    ],
  },
  {
    name: "Shaders and linker",
    folders: ["shaders", "scene/slang*.ts", "scene/ShaderCache.ts"],
    seam: (
      <>
        One Slang module per shader, compiled into the pipeline of every pass
        that draws content, so a vertex stage moves geometry the same way in all
        of them. Shaders read a draw only through <C>drawRecord(index)</C>.
      </>
    ),
    tabs: [{ href: "#/shading", label: "Shading and linker" }],
  },
  {
    name: "Frame graph",
    folders: ["render", "lighting", "atmosphere"],
    seam: (
      <>
        Passes declare the textures they read and write; a view&apos;s graph is
        built once and executed every frame. It reads the world&apos;s records
        and tables, and writes the target.
      </>
    ),
    tabs: [{ href: "#/rendering", label: "Rendering" }],
  },
];

const SUBSYSTEM_COLUMNS: Column<Subsystem>[] = [
  { head: "Subsystem", cell: (s) => <strong>{s.name}</strong> },
  {
    head: "Folders",
    cell: (s) => (
      <>
        {s.folders.map((f, i) => (
          <Fragment key={f}>
            {i > 0 ? ", " : ""}
            <C>{f}</C>
          </Fragment>
        ))}
      </>
    ),
  },
  { head: "Its seam to the rest", cell: (s) => s.seam },
  {
    head: "Covered in",
    cell: (s) => (
      <>
        {s.tabs.map((t, i) => (
          <Fragment key={t.href}>
            {i > 0 ? ", " : ""}
            <a href={t.href}>{t.label}</a>
          </Fragment>
        ))}
      </>
    ),
  },
];

type State = "built" | "partly" | "planned";

const STATE_TEXT: Record<State, string> = {
  built: "Built",
  partly: "Partly built",
  planned: "Planned",
};

interface Block {
  name: string;
  what: string;
  state: State;
}

/** The engine's public mechanisms, in the matrix's column order. */
const MECHANISMS: (Block & { short: string })[] = [
  {
    short: "Transforms",
    name: "The transform graph",
    what: "One tree of frames whose edges are affine or smooth: georeferencing, projections, exaggeration, bends and lenses. Content sits at a node, and where it sits decides what is deformed. One compiled GPU function per route, and picks, measurements, accuracy and clips answer through it in float64. A lens on the camera isn't wired for streamed tilesets.",
    state: "partly",
  },
  {
    short: "Geometry",
    name: "Representations",
    what: "Meshes, B-reps, implicit surfaces, points and splats, volumes, subdivision: each drawn, each answering queries.",
    state: "partly",
  },
  {
    short: "Styling",
    name: "Styling and scalar fields",
    what: "One language compiled to the GPU, per feature: colour ramps, run-time data by element ID, time, emphasis.",
    state: "partly",
  },
  {
    short: "Clipping",
    name: "Sections and clipping",
    what: "Planes, boxes and polygon prisms that cut every representation, in any frame, with capped faces: instant on the GPU, exact on a b-rep, joined loops on a mesh. A clip across a deformed route is cut along a fitted distance, and has no GPU cap. Effects: discard, a translucent ghost, or shade.",
    state: "partly",
  },
  {
    short: "Queries",
    name: "Queries",
    what: "Rays, picks, snaps and measurements, each with its accuracy, refined in stages by a host's services.",
    state: "partly",
  },
  {
    short: "Views",
    name: "Views and cameras",
    what: "Many views, viewports and linked views, controllers and touch; orthographic and XR cameras later.",
    state: "partly",
  },
  {
    short: "Time",
    name: "Time",
    what: "The scene clock, and values bound to it.",
    state: "partly",
  },
  {
    short: "Light",
    name: "Physical light",
    what: "Sun, sky and atmosphere in physical units, shadows and exposure.",
    state: "built",
  },
];

const MACHINERY: Block[] = [
  {
    name: "GPU tessellation and curves",
    what: "Patches by screen-space error; one curve, coverage and stroke kernel for vectors and B-reps. Built for B-reps: every face diced each view at degrees 1 to 7, with per-pixel trims. Vectors don't share it yet, and tessellating a reprojected model is a spike.",
    state: "partly",
  },
  {
    name: "GPU-driven drawing",
    what: "Culling and listing in compute, indirect draws, the world's shared tables.",
    state: "built",
  },
  {
    name: "The frame graph",
    what: "Passes and the textures between them, sized and scheduled per view.",
    state: "built",
  },
  {
    name: "Streaming",
    what: "3D Tiles selection, loading and caching. Stable IDs across tiles are planned.",
    state: "partly",
  },
];

const DOMAINS = [
  "Design and engineering",
  "Construction",
  "Reality capture",
  "Analysis",
  "Geoscience",
  "Operations",
  "Simulation",
];

/** Each gallery example, the mechanisms it proves (indices into MECHANISMS), and whether it exists. */
const EXAMPLES: {
  domain: string;
  name: string;
  uses: number[];
  built?: boolean;
}[] = [
  {
    domain: "Design and engineering",
    name: "B-reps: a first look",
    uses: [1, 4, 5],
    built: true,
  },
  {
    domain: "Design and engineering",
    name: "Solid modeling with CSG, two kernels",
    uses: [1, 2, 4, 5],
    built: true,
  },
  {
    domain: "Design and engineering",
    name: "Clipping and sections, with caps and effects",
    uses: [1, 3, 4, 5],
    built: true,
  },
  {
    domain: "Design and engineering",
    name: "The transform graph, in eight scenes",
    uses: [0, 1, 4, 5, 6],
    built: true,
  },
  {
    domain: "Design and engineering",
    name: "A process plant: isolate, X-ray",
    uses: [1, 2, 3, 4, 5],
  },
  {
    domain: "Design and engineering",
    name: "A building by storey",
    uses: [2, 3, 4, 5],
  },
  {
    domain: "Design and engineering",
    name: "A drawing sheet printed to scale",
    uses: [0, 2, 3, 5],
  },
  {
    domain: "Design and engineering",
    name: "Changes between two design versions",
    uses: [2, 5],
  },
  {
    domain: "Design and engineering",
    name: "Rail clearance along a track",
    uses: [0, 1, 2, 4],
  },
  {
    domain: "Construction",
    name: "A construction sequence on a timeline",
    uses: [2, 5, 6],
  },
  { domain: "Construction", name: "Cut and fill", uses: [1, 2, 3, 4] },
  {
    domain: "Reality capture",
    name: "Change between two scans, with a swipe",
    uses: [1, 2, 5],
  },
  {
    domain: "Reality capture",
    name: "Inspection photos on the model",
    uses: [0, 1, 4, 5],
  },
  {
    domain: "Analysis",
    name: "A bridge's analysis results",
    uses: [0, 1, 2, 6],
  },
  {
    domain: "Analysis",
    name: "Vertical exaggeration with true heights",
    uses: [0, 1, 4, 5],
    built: true,
  },
  { domain: "Analysis", name: "A viewshed", uses: [2, 4, 7] },
  { domain: "Analysis", name: "Sun hours on a city", uses: [2, 6, 7] },
  {
    domain: "Geoscience",
    name: "Drillholes and geological surfaces",
    uses: [0, 1, 2, 3, 5],
  },
  {
    domain: "Geoscience",
    name: "A tunnel through geology",
    uses: [0, 1, 3, 4, 5],
  },
  {
    domain: "Geoscience",
    name: "A block model cut by a section",
    uses: [1, 2, 3],
  },
  { domain: "Geoscience", name: "A geophysical survey", uses: [0, 1, 2] },
  {
    domain: "Operations",
    name: "Underground utilities",
    uses: [0, 1, 2, 4],
  },
  { domain: "Operations", name: "A flood over terrain", uses: [1, 2, 6] },
  {
    domain: "Operations",
    name: "A transmission line",
    uses: [0, 1, 2, 4],
  },
  {
    domain: "Simulation",
    name: "An agent replay in a station",
    uses: [1, 2, 6],
  },
];

function Blocks({ blocks }: { blocks: readonly Block[] }) {
  return (
    <div className="vision-blocks">
      {blocks.map((b) => (
        <section key={b.name} className={`vision-block ${b.state}`}>
          <h3>{b.name}</h3>
          <p>{b.what}</p>
          <span className="vision-state">{STATE_TEXT[b.state]}</span>
        </section>
      ))}
    </div>
  );
}

function VisionStack() {
  return (
    <div className="vision">
      <div className="vision-layer apps">
        <p className="vision-label">Applications</p>
        <div className="vision-domains">
          {DOMAINS.map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
        <p className="vision-brings">
          They bring the policy: exaggeration settings, comparison layouts,
          modeling kernels, analyses, the data that styles their elements, and
          their own query services.
        </p>
      </div>
      <div className="vision-layer">
        <p className="vision-label">Engine mechanisms: the public surface</p>
        <Blocks blocks={MECHANISMS} />
      </div>
      <div className="vision-layer">
        <p className="vision-label">Shared GPU machinery</p>
        <Blocks blocks={MACHINERY} />
      </div>
      <div className="vision-layer platform">
        <p className="vision-label">Platform</p>
        <p>WebGPU, with shaders in WGSL and Slang</p>
      </div>
    </div>
  );
}

function UsesMatrix() {
  let lastDomain = "";
  return (
    <div className="table-wrap vision-matrix">
      <table>
        <caption className="visually-hidden">
          Gallery examples by domain, and the engine mechanisms each uses
        </caption>
        <thead>
          <tr>
            <th scope="col">Example</th>
            {MECHANISMS.map((m) => (
              <th scope="col" key={m.short} title={m.name}>
                {m.short}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {EXAMPLES.map((e) => {
            const head = e.domain !== lastDomain;
            lastDomain = e.domain;
            return (
              <Fragment key={e.name}>
                {head ? (
                  <tr className="vision-domain">
                    <th scope="colgroup" colSpan={MECHANISMS.length + 1}>
                      {e.domain}
                    </th>
                  </tr>
                ) : null}
                <tr>
                  <th scope="row">
                    {e.name}
                    {e.built ? (
                      <span className="vision-built"> · in the gallery</span>
                    ) : null}
                  </th>
                  {MECHANISMS.map((m, i) => (
                    <td key={m.short}>
                      {e.uses.includes(i) ? (
                        <span aria-label="uses" className="vision-dot">
                          ●
                        </span>
                      ) : (
                        <span className="visually-hidden">no</span>
                      )}
                    </td>
                  ))}
                </tr>
              </Fragment>
            );
          })}
          <tr className="vision-total">
            <th scope="row">Examples using it</th>
            {MECHANISMS.map((m, i) => (
              <td key={m.short}>
                {EXAMPLES.filter((e) => e.uses.includes(i)).length}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export function Unified() {
  const core = data.layers.core;
  return (
    <Page
      title="Inside the core"
      status="sketch"
      lede={
        <>
          The core is four tiers: content that loads and decodes, a scene that
          holds worlds, views and the transform graph, a renderer that draws
          what the scene recorded, and the GPU layer under it. Content reaches
          the scene through two small interfaces, the scene writes draw records
          the renderer reads, and every frame runs the same path from the clock
          to the picks. Below are the tiers, that frame, the subsystems that
          live in them, and the few mechanisms every use is built from.
        </>
      }
    >
      <Section title="The tiers">
        <Figure caption="The core's tiers with their folders, sizes and the imports between neighbours, as the boundary test counts them.">
          <CoreTiers deeper={false} />
        </Figure>
        <p>
          The tiers exist so that what loads data, what holds it and what draws
          it can change apart. A boundary test assigns every core file one tier
          and fails on an import a tier&apos;s rule refuses, but for{" "}
          {core.exceptions} named exceptions, each with its reason.
        </p>
        <h3>Content: what loads and decodes</h3>
        <p>
          Streaming, 3D Tiles, the globe and the worker I/O decide what is
          needed, fetch it and hand it on. Content imports no renderer, no GPU
          type and none of the whole classes, and reaches the scene through two
          interfaces:
        </p>
        <ul>
          <li>
            <C>DrawSink</C> (<C>streaming/DrawSink.ts</C>) is what content asks
            of the place it draws in: add and remove meshes, transforms, draws
            and clips; set a draw&apos;s colour, material, collision and ground
            flags; read how full the world&apos;s tables are (<C>pressure()</C>
            ). It has no GPU types, and a <C>World</C> is one as it is.
          </li>
          <li>
            <C>TilesetHost</C> is what streaming reads of the engine: the
            request scheduler, the tilesets, the upload budget per frame, glTF
            loading and model upload, and <C>wake()</C>. An <C>Engine</C> is one
            as it is.
          </li>
        </ul>
        <p>
          Why: streaming can be tested against a fake sink, the renderer can
          change how it keeps a draw without touching a tile loader, and a
          worker can import content without pulling in a device.
        </p>
        <h3>Scene: where the content is, and who sees it</h3>
        <p>
          The middle tier holds the whole classes, and is the only one that sees
          both sides:
        </p>
        <ul>
          <li>
            <C>Engine</C> owns the loop, the worlds and views, the camera layer
            (<C>CameraLayer</C>), <C>Engine.queries</C> and the tilesets, and
            decides each tick which views need a frame.
          </li>
          <li>
            <C>World</C> is content shared by any number of views: geometry
            slabs, a material table, the transform tree and anchors, the draw
            records and the clips, caps and warps that act on them. It has two
            halves: <C>WorldScene</C> (what exists and where) and{" "}
            <C>WorldRaster</C> (records, batches, bundles and GPU tables, in{" "}
            <C>render/world</C>).
          </li>
          <li>
            <C>View</C> is a camera, a viewport and a target looking at one
            world. <C>RenderContext</C> is the device-level state they share:
            pipelines, the shader cache and the error sink.
          </li>
        </ul>
        <p>
          Why whole classes: a <C>World</C> or <C>Engine</C> reaches both
          content and rasterizer data, so content that imported one could read
          what the renderer owns. A test also holds content off a world&apos;s
          rasterizer data and an engine&apos;s GPU context. The scene&apos;s
          folder <C>scene/world</C> is the world&apos;s parts: draws,
          placements, transforms, warps, routes, clips, caps, b-reps and rays.
        </p>
        <h3>Renderer: what it reads, and what it draws</h3>
        <p>
          Passes, bundles, culling and dicing, the shaders with their linker,
          lighting and the atmosphere. The renderer reads draw records, not
          draws: every write of a record goes through one class,{" "}
          <C>DrawConstants</C> (<C>render/drawConstants.ts</C>), in the layout
          of <C>render/layout.ts</C>, and shaders read one only through{" "}
          <C>drawRecord(index)</C>. A record&apos;s placement word points into
          the world&apos;s placement table, so a different home for per-draw
          data (immediates, push constants) would replace that class and one
          function, not their callers. Only the renderer and <C>World</C> import
          the draw bundles. The renderer reaches content in a few named places:
          the imagery provider, the city lights and a globe&apos;s pick rays.
        </p>
        <h3>GPU: the device and nothing above it</h3>
        <p>
          The device and its limits, buffers and ranges, textures and mips, the
          timer, error reporting and the environment&apos;s prefiltering. It
          imports nothing above it, but for the environment kernel&apos;s
          generated WGSL.
        </p>
        <Written
          from="importBoundary.test.ts and the scene, render and streaming code"
          on="2026-11-12"
        />
      </Section>

      <Section title="A frame, end to end">
        <p>
          One pass of <C>Engine</C>&apos;s loop, in this order whatever woke it.
          On demand, the loop sleeps after step 6 when no view needs a frame;
          steps 7 to 9 are per drawn view.
        </p>
        <Figure caption="One frame, from the clock to the picks. Steps 1 to 6 run once for the engine; 7 to 9 for each view that is drawn.">
          <Flow
            label="One frame, end to end"
            steps={[
              {
                title: "Clock and tick listeners",
                body: (
                  <>
                    The tick listeners run (<C>onTick</C>); a playing scene
                    clock has moved its seconds and woken the loop.
                  </>
                ),
              },
              {
                title: "Camera layer",
                body: (
                  <>
                    <C>cameras.update()</C> evaluates each view&apos;s rig at
                    the clock and places its anchors by their routes to the
                    render root.
                  </>
                ),
              },
              {
                title: "What changed",
                body: (
                  <>
                    Each view&apos;s fingerprint (target size, viewport, camera,
                    exposure, lighting, world, anchors) is compared with its
                    last frame. After selection, a view whose world changed what
                    it shows is added.
                  </>
                ),
              },
              {
                title: "Selection and requests",
                body: (
                  <>
                    <C>updateTilesets</C> runs the selection of each due
                    tileset, streaming and the globe, for its world&apos;s
                    views, starting with a different one each frame, and
                    requests and uploads within a shared budget.
                  </>
                ),
              },
              {
                title: "Draw records",
                body: (
                  <>
                    Content writes through <C>DrawSink</C>; the world writes a
                    record per draw and its placement, among them the{" "}
                    <C>WARP_ROUTE</C> term and a compiled route&apos;s centre
                    constants.
                  </>
                ),
              },
              {
                title: "Warps and routes",
                body: (
                  <>
                    <C>WorldWarps</C> ticks (it also did after the placements,
                    in step 2): compiled routes get their uniforms, a fit covers
                    what the compiler refuses, and a view whose route differs in
                    shape gets twins of the draws. A draw is held hidden until
                    its first fit.
                  </>
                ),
              },
              {
                title: "Per-view blocks",
                body: (
                  <>
                    Each drawn view writes its view block, clip table (with the
                    section caps&apos; faces), environment and translucency
                    ranges. Each world prepares its bundle once; it is rebuilt
                    only when draws are added, and every view runs it.
                  </>
                ),
              },
              {
                title: "Shadows, lights and cull",
                body: (
                  <>
                    Shadow cascades and height captures; the light lists; the{" "}
                    <C>cull</C> compute lists each batch&apos;s visible
                    instances; the <C>dice</C> compute meshes b-rep patches at
                    the view&apos;s error.
                  </>
                ),
              },
              {
                title: "The frame graph",
                body: (
                  <>
                    Sky and aerial perspective; a depth and normal prepass and
                    ambient occlusion; stars; section caps (parity bits); the
                    opaque pass; translucency (exact lists or moments) and its
                    composite; the exposure meter; then the post chain (glare,
                    stages) and present.
                  </>
                ),
              },
              {
                title: "Submit, picks and readbacks",
                body: (
                  <>
                    The encoder is submitted once. A pick pass writes ids and
                    depth; the pick answers, the depth range for the next
                    frame&apos;s cascades and the HDR readback map
                    asynchronously.
                  </>
                ),
              },
              {
                title: "After the tick",
                body: (
                  <>
                    The after-tick listeners run. A <C>CapScheduler</C> given
                    the engine is one: it rebuilds moved clips&apos; caps within
                    its own budget and wakes the loop, so a cap lands a frame
                    later.
                  </>
                ),
              },
            ]}
          />
        </Figure>
        <p>
          The pass names are those of the code: <C>shadows</C>,{" "}
          <C>height-captures</C>, <C>select-view</C>, <C>lights</C>, <C>cull</C>
          , <C>sky-view</C>, <C>environment</C>, <C>aerial-perspective</C>,{" "}
          <C>prepass</C>, <C>ambient-occlusion</C>, <C>stars</C>,{" "}
          <C>section-caps</C>, <C>opaque</C>, <C>translucent</C>, <C>meter</C>,{" "}
          <C>composite</C>, <C>depth-range</C>, <C>hdr-readback</C>, <C>pick</C>
          , <C>adaptation</C>, then the chain, <C>present</C>. The graph
          compiles away a pass nobody reads and allocates each transient texture
          at its first use, so views share them. The{" "}
          <a href="#/rendering">Rendering tab</a> draws it in full.
        </p>
        <Written
          from="Engine.loop and tick, render/view/renderTick.ts and viewFrame.ts"
          on="2026-11-12"
        />
      </Section>

      <Section title="Subsystems">
        <p>
          What lives in the tiers, by subject. A seam is the one place a
          subsystem meets the others; each has a tab of its own.
        </p>
        <DataTable
          label="The core's subsystems, their folders, seams and tabs"
          columns={SUBSYSTEM_COLUMNS}
          rows={SUBSYSTEMS}
        />
        <Written
          from="the folders under src/ and their headers"
          on="2026-11-12"
        />
      </Section>

      <Section title="The vision: engine and applications">
        <Note title="How far it goes">
          <p>
            The tiers, frame and subsystems above are the code today. The rest
            of this tab is a vision, from the overall plan&apos;s sections
            13.26, 13.33, 13.34 and 13.37. Each block says whether it is built,
            partly built or planned. The{" "}
            <a href="#/architecture">System architecture tab</a> shows the
            modules as they are.
          </p>
        </Note>
        <Figure caption="Every domain sits on the same eight mechanisms, and they on the same four pieces of GPU machinery. Solid blocks are built, striped ones partly built, dashed ones planned.">
          <VisionStack />
        </Figure>
        <p>
          The line between applications and the engine kept landing in the same
          place as the plan grew:
        </p>
        <ul>
          <li>
            <strong>Vertical exaggeration</strong> is an application's node in
            the transform graph, not a scene setting. It sits over the content
            it exaggerates, so the Earth's terrain and buildings are drawn
            exaggerated, the Moon and the camera aren't, and the application
            still measures true heights.
          </li>
          <li>
            <strong>Comparison</strong> is linked views and viewports. A
            difference between two captures is an analysis drawn as a scalar
            field. Two views of one world can take their own exaggeration or
            their own route, through per-view parameters and switch nodes.
          </li>
          <li>
            <strong>Overrides</strong> for millions of elements are the styling
            language with data an application supplies, not a separate system.
          </li>
          <li>
            <strong>Modeling</strong> stays with the application or a kernel it
            brings. Two different kernels can feed the same B-rep form.
          </li>
        </ul>
        <Written
          from="the overall plan, sections 13.26, 13.33, 13.34 and 13.37"
          on="2026-11-12"
        />
      </Section>

      <Section title="What became one">
        <p>
          Several separate ideas collapsed into single mechanisms as the plan
          grew. The newest is the transform graph.
        </p>
        <ul>
          <li>
            <strong>
              One tree for where things are and how they're drawn.
            </strong>{" "}
            Georeferencing, a projection, vertical exaggeration, a bend, a plan
            and profile sheet and a lens are all nodes: an edge is an affine
            matrix, or a smooth function with parameters. This replaces warps as
            their own idea, regions that said which content a warp touched, and
            placement modes: a node's position in the tree and a tileset's
            declared CRS decide it.
          </li>
          <li>
            <strong>One compiler for every route.</strong> It collapses affine
            runs, differentiates smooth nodes for normals and bounds, and emits
            one GPU function per route shape. A built-in is written once in
            Slang and mirrored in TypeScript; your own function is restricted
            JavaScript that the engine parses and never evaluates.
          </li>
          <li>
            <strong>One answer on the CPU, in float64.</strong> Picks,
            measurements in a named node, clips and the accuracy along a route
            (Σ out = J Σ Jᵀ plus each node's own figure) all read the same
            route.
          </li>
          <li>
            <strong>One clip model</strong> for every representation and frame,
            and one geometry query interface under a b-rep or a mesh.
          </li>
          <li>
            <strong>One IR, perhaps.</strong> The transform graph's IR could
            also sit under 3D Tiles styling and vector styling, with JavaScript
            as one front end. That is a brainstorm (plan section 13.38): nothing
            is decided.
          </li>
        </ul>
        <Written
          from="the overall plan, sections 13.34, 13.37 and 13.38"
          on="2026-11-12"
        />
      </Section>

      <Section title="What each use needs">
        <p>
          The gallery examples that prove the mechanisms, by domain: some are
          built, the rest planned. Read down a column for how far a mechanism
          reaches, across a row for what a use needs. Styling and
          representations carry the most.
        </p>
        <Figure
          caption={`Gallery examples and the mechanisms each uses. ${EXAMPLES.filter((e) => e.built).length} are in the gallery today; the rest are planned.`}
        >
          <UsesMatrix />
        </Figure>
        <Written from="the overall plan, section 13.34" on="2026-11-12" />
      </Section>

      <Section title="The rule it gives">
        <p>
          When a new use arrives, the first question is whether it is an
          application's use of a mechanism that exists or is planned. Only when
          it isn't does the engine grow, and then the new mechanism should be
          general enough to serve uses beyond the one that asked. A feature that
          serves one use is a sign the line between application and engine is in
          the wrong place.
        </p>
      </Section>
    </Page>
  );
}
