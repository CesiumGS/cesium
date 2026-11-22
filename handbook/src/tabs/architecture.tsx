import { data, size } from "../data.ts";
import { LoadingStages } from "../flows.tsx";
import { LoadStories, ModuleRules, ModuleStack } from "../modules.tsx";
import {
  C,
  DataTable,
  Figure,
  Generated,
  Page,
  Section,
  Written,
} from "../parts.tsx";

const PATHS: Record<string, string> = {
  core: "@cesium/next",
  time: "@cesium/next/time",
  frames: "@cesium/next/frames",
  crs: "@cesium/next/crs",
  measure: "@cesium/next/measure",
};

/** Dynamic imports, and what makes each one load. */
const TRIGGERS: Record<string, string> = {
  "packages/frames/src/providers/earthOrientation.ts":
    'A reference frame asks for the "precise" level of Earth orientation (the IAU 2006/2000A series)',
  "packages/frames/src/providers/ephemeris.ts":
    "A reference frame needs the ephemeris (DE440 packs)",
  "packages/core/src/scene/slang.ts":
    "A custom shader compiles Slang at run time (CustomShader.fromSlang)",
};

const SEAMS = [
  {
    seam: "Frame resolver",
    fills: "Where is reference frame A in B at this scene time",
    default: "The core's transform table, or the frames module",
  },
  {
    seam: "Coordinate service",
    fills: "A content CRS to geodetic, grid factors, the recorded operation",
    default: "PROJ, through projCoordinateService",
  },
  {
    seam: "Curvilinear transforms",
    fills:
      "A deformation or a projection the engine doesn't ship, as a node of the transform graph",
    default:
      "Built-ins in Slang with a TypeScript mirror, or your own function as restricted JavaScript, which the engine parses and never evaluates",
  },
  {
    seam: "Snap service",
    fills: "Exact snaps, answered after a provisional client one",
    default: "ClientSnapService over retained tile geometry",
  },
  {
    seam: "Spatial queries",
    fills: "Rays, line of sight, heights, picks: asynchronous and batched",
    default: "CPU structures and compute traversal",
  },
  {
    seam: "Selection policy",
    fills: "Which tiles to draw and load",
    default: "Budgeted, with Stepwise for parity with 1.x",
  },
  {
    seam: "Controllers",
    fills: "Input, constraints, what a gesture means",
    default: "Globe and inspect controllers, replaceable",
  },
];

/** The package map's three kinds (docs/design/package-map.md), proposed. */
const PACKAGE_KINDS = [
  {
    kind: "Capability",
    packages:
      "@cesium/core, @cesium/time, @cesium/frames, @cesium/crs, @cesium/measure, @cesium/ui",
    does: "Defines the stable API and owns the interfaces it consumes. The order is today's: core, then time, frames, coordinates and measurement, with the widgets on top",
  },
  {
    kind: "Adapter",
    packages:
      "source-* (content sources), loader-* (formats and decoders), imagery-* (imagery and terrain), data-* (outside data), geocoder-*, crs-proj (PROJ), tiling-native; service bundles such as @cesium/ion",
    does: "Implements one of those interfaces, so an app can leave it out or supply its own",
  },
  {
    kind: "Umbrella",
    packages: "cesium",
    does: "Depends on the standard set, re-exports it, and is the one place that chooses defaults",
  },
];

const GRAPH_MODULES = [
  {
    module: "transform",
    holds:
      "The graph (affine, curvilinear and switch nodes), routes, the IR with its parser, autodiff, intervals and WGSL, the compiler, accuracy along a route, and point and measurement queries in any node",
    rule: "No geo knowledge, and it imports none of the modules below",
  },
  {
    module: "transforms",
    holds:
      "Generic built-in curvilinear transforms: bend, twist, taper, lattice, scale-about, bump, radial distortion, corridor unroll, velocity model",
    rule: "Imports only the transform core, math and closed forms",
  },
  {
    module: "georeference",
    holds:
      "The geo transforms on an ellipsoid (vertical exaggeration, height offset, flatten), reprojection nodes (UTM, transverse Mercator, Lambert, web Mercator, geocentric), and Georeference, which places a design model on a body",
    rule: "Same rule as transforms",
  },
  {
    module: "frames",
    holds:
      "The catalog of reference frames, Earth orientation and ephemerides: data feeding the graph, with curvilinearFrame and switchFrame putting nodes in it",
    rule: "Its own entry point, @cesium/next/frames",
  },
];

export function Architecture() {
  const { globeOnly, library } = data.bundles;
  const lazyChunks = [
    ...globeOnly.lazy.map((c) => c.name),
    ...library.entries.flatMap((e) => e.lazy.map((c) => c.name)),
  ];
  return (
    <Page
      title="System architecture"
      status="current"
      lede={
        <>
          One package, where only the core is required. Time, reference frames,
          coordinates and measurement are optional modules on top of it, so an
          app pays only for what it imports, and a host application can replace
          any of them. The transform graph, which places, reprojects and deforms
          content, is part of the core.
        </>
      }
    >
      <Section title="The modules, and what each one costs">
        <p>
          Read the stack from the top: each block can use what's under it. Only
          the core is always there. Everything marked optional stays out of your
          app unless you import it.
        </p>
        <Figure caption="Sizes are uncompressed unless they say gzipped. They count shared code, so they don't add up.">
          <ModuleStack />
        </Figure>
        <Generated
          from={
            <>
              the packages&apos; package.json files and their imports, a library
              build, the bundle check and the setup store
            </>
          }
        />
        <ModuleRules />
        <p>
          One detail the stack leaves out. A package reaches names another
          doesn&apos;t publish only through that package&apos;s internal entry (
          {data.layers.internalEntries.map((f, i) => (
            <span key={f}>
              {i > 0 ? ", " : ""}
              <C>{f}</C>
            </span>
          ))}
          ), and only the names the boundary test lists. It fails on any import
          that breaks these rules.
        </p>
      </Section>

      <Section title="From entry points to packages">
        <p>
          The entry points above re-export packages of their own, which 2.0's
          code moved into (CS-835), planned to be released together at one
          version. Their names are under review with the public API review (the
          design note docs/design/package-map.md). There are three kinds of
          package, and one rule between them: a capability package never depends
          on an adapter.
        </p>
        <DataTable
          label="Kinds of package"
          columns={[
            { head: "Kind", cell: (r) => r.kind },
            { head: "Packages", cell: (r) => r.packages },
            { head: "What it does", cell: (r) => r.does },
          ]}
          rows={PACKAGE_KINDS}
        />
        <p>
          Each adapter is named for the interface it implements, so a host
          application can see what it would replace. A module that isn't ready
          when the API freezes ships on a 0.x version line, outside the
          umbrella, until it passes review.
        </p>
        <Written
          from="the design note docs/design/package-map.md"
          on="2026-11-21"
        />
      </Section>

      <Section title="What your app loads">
        <p>
          What you pay for depends on what you import, and most of the weight
          only arrives if it's used.
        </p>
        <Figure caption="Generated from a library build, the bundle check and the setup store on the machine that built this page. A Viewer also brings its widgets.">
          <LoadStories />
        </Figure>
      </Section>

      <Section title="What loads when">
        <Figure caption="Each stage loads only when something asks for it. Sizes are generated, from a library build and the setup store on the machine that built this page.">
          <LoadingStages />
        </Figure>
        <p>
          <C>scripts/checkBundle.mjs</C> guards the first stage: it fails if a
          globe-only Viewer's page-load chunks hold the X, Y or s series or the
          DAF reader. Its current verdict:{" "}
          {globeOnly.clean ? "clean" : "failing"}.
        </p>
        <DataTable
          label="Dynamic imports"
          columns={[
            {
              head: "Loaded on demand",
              cell: (r) => <C>{r.to}</C>,
            },
            { head: "From", cell: (r) => <C>{r.from}</C> },
            {
              head: "What makes it load",
              cell: (r) => TRIGGERS[r.to] ?? "Not yet described",
            },
          ]}
          rows={data.layers.dynamicImports}
        />
      </Section>

      <Section title="Bundle sizes">
        <DataTable
          label="Bundle sizes per entry point"
          columns={[
            { head: "Entry point", cell: (r) => <C>{PATHS[r.entry]}</C> },
            {
              head: "Its own module",
              numeric: true,
              cell: (r) => size(r.ownKb),
            },
            {
              head: "With what it imports",
              numeric: true,
              cell: (r) => size(r.loadKb),
            },
            {
              head: "Gzipped",
              numeric: true,
              cell: (r) => size(r.loadGzipKb),
            },
            {
              head: "On demand",
              numeric: true,
              cell: (r) => (r.lazyKb > 0 ? size(r.lazyKb) : "none"),
            },
          ]}
          rows={["core", "time", "frames", "crs", "measure"].flatMap((id) =>
            library.entries.filter((e) => e.entry === id),
          )}
        />
        <Generated
          from={
            <>
              the browser build, <C>scripts/build/browser.mjs</C>
            </>
          }
        />
        <p>
          Entry points share chunks, so these sizes don't add up: an app that
          imports two pays for their shared code once. Worker and WebAssembly
          files are separate from these sizes.
        </p>
        <h3>Globe-only Viewer</h3>
        <DataTable
          label="Chunks of a globe-only Viewer"
          columns={[
            { head: "Chunk", cell: (r) => r.name },
            { head: "Loads", cell: (r) => r.when },
            { head: "Size", numeric: true, cell: (r) => size(r.kb) },
          ]}
          rows={[
            { name: "main", when: "with the page", kb: globeOnly.main.kb },
            ...globeOnly.eager.map((c) => ({
              name: c.name,
              when: "with the page",
              kb: c.kb,
            })),
            ...globeOnly.lazy.map((c) => ({
              name: c.name,
              when: "on demand",
              kb: c.kb,
            })),
          ]}
        />
        <Generated from={<C>scripts/checkBundle.mjs</C>} />
        <h3>Fetched at run time</h3>
        <DataTable
          label="Files fetched at run time"
          columns={[
            { head: "What", cell: (r) => r.what },
            { head: "File", cell: (r) => <C>{r.name}</C> },
            { head: "Size", numeric: true, cell: (r) => size(r.kb) },
          ]}
          rows={data.runtime.flatMap((g) =>
            g.files.map((f) => ({ what: g.what, ...f })),
          )}
        />
        <Generated from="the setup store on the machine that built this page" />
        <p className="provenance">
          Chunks seen in these builds: {[...new Set(lazyChunks)].join(", ")}.
        </p>
      </Section>

      <Section title="Seams a host application can fill">
        <p>
          The engine is designed so an outside application layer can bring its
          own coordinates, snapping, measurement, tools and content loading.
          Each seam is an interface, and the shipped implementation is one
          implementation of it.
        </p>
        <DataTable
          label="Seams for a host application"
          columns={[
            { head: "Seam", cell: (r) => r.seam },
            { head: "What it answers", cell: (r) => r.fills },
            { head: "What ships", cell: (r) => r.default },
          ]}
          rows={SEAMS}
        />
        <p>
          There are no placement modes. A tileset's declared CRS says how it
          reaches the body: a geocentric CRS is the identity route, so content a
          host reprojected itself is drawn as delivered, with design coordinates
          from the host's coordinate service. A projected or geographic CRS is a
          coordinate operation, a curvilinear edge fitted per tile. A local CRS
          with a site transform is an affine edge. The mode field is still in
          the code, and goes with the public API review (CS-102).
        </p>
        <Written
          from="the plan 5 spec, sections 7.2, 7.7, 7.9 and 7.10, and the design note docs/design/geometry-through-placement-review.md"
          on="2026-11-12"
        />
      </Section>

      <Section title="Inside the core: the transform graph">
        <p>
          Where content sits decides how it is drawn. A tree of nodes joins it
          to the camera, each edge either affine (a matrix, cheap to recompute
          every frame) or curvilinear (a differentiable function with
          parameters, such as vertical exaggeration or a projection). The core
          compiles each route into one GPU function, and the same route answers
          picks, measurements, accuracy and clips on the CPU, in float64. It is
          built, and the <a href="#/transform-graph">Transform graph tab</a>{" "}
          tours it.
        </p>
        <DataTable
          label="Modules of the transform graph"
          columns={[
            { head: "Module", cell: (r) => <C>{r.module}</C> },
            { head: "What it holds", cell: (r) => r.holds },
            { head: "Rule", cell: (r) => r.rule },
          ]}
          rows={GRAPH_MODULES}
        />
        <p>
          These are folders of the core except <C>frames</C>, so one import
          reaches them. The boundary test fails when the transform core imports
          a built-in, or a built-in reaches past the transform core. Curvilinear
          maps are gone as a separate idea: a curvilinear frame is a curvilinear
          node over the content it deforms, and a Moon beside it is not under
          that node, so it isn't curvilinear.
        </p>
      </Section>

      <Section title="Seams for later WebGPU features">
        <p>
          Per-draw constants, draw arguments, geometry submission, bindless
          resources and ray queries each pass through one seam, and a test fails
          naming the line of any bypass. Adopting a later WebGPU feature is
          meant to be a backend swap, not a refactor. The Spec extensions tab
          lists those features and where they stand.
        </p>
      </Section>

      <Section title="Planned: threads, jobs, renderers and profiles">
        <p>
          These are decisions in the plans, written down and reviewed on
          2026-11-13. Only the first slice of the job system is merged; the rest
          is planned. They matter to a host because they set what the API may
          and may not promise. The order they are built in is below.
        </p>
        <ul>
          <li>
            <strong>One API, the engine on either thread</strong> (the
            worker-mode façade, reviewed; work items CS-101 to CS-120). The app
            calls the same API on the main thread. A thin layer either runs the
            engine there or forwards to an engine thread, a worker with an{" "}
            <C>OffscreenCanvas</C>. Commands are ordered messages batched per
            tick. Reads come from a snapshot taken each tick. Queries return
            promises. Code that must run inside the engine, such as a
            curvilinear map, a style or a per-tick callback, loads as a module
            on the engine's thread. The main-thread mode offers no synchronous
            read that the worker mode can't, and the API tests run in both. A
            probe chooses the mode, not browser sniffing, and the host can force
            it with <C>thread: "auto" | "main" | "worker"</C>. Review decisions:
            a closure the engine would run on its own thread is refused in both
            modes, but only once Cesium IR's self-contained function path
            exists, so examples migrate once. HTML overlays are the app's: the
            engine publishes tracked points (pixel, height, visibility) each
            tick. After a lost worker or device the host can call{" "}
            <C>restart()</C>, and may opt in to rebuilding the scene from the
            façade's mirror. The façade waits for the public API review, which
            also designs observed value types so that a write such as{" "}
            <C>camera.position.x = 5</C> becomes a command.
          </li>
          <li>
            <strong>Jobs. The first slice is built</strong> (
            <C>src/io/Jobs.ts</C>, the design note docs/design/job-system.md):
            priorities, dependencies, cancellation, a budgeted apply phase (4 ms
            by default) and shared memory when isolated. Terrain decode
            completion and the refit fallback run on it. Moving the other work
            onto it (CS-87 to CS-98), app jobs and the inspector's Jobs section
            are planned. On its before-and-after runs the tick spacing differed
            between runs of one build by more than between builds, so the slice
            is not shown to change smoothness; what it changes is where work
            runs, and that it is bounded and visible. <C>WorkerPool</C> stays as
            the transport. The scheduler orders work by visible screen-space
            error, with dependencies, cancellation and one main-thread apply
            phase with a millisecond budget. Shared memory is used when the page
            is cross-origin isolated and never required. A job may return
            partial results that are sound, such as the horizon occluder's walk.
          </li>
          <li>
            <strong>Loading is refinement.</strong> A scene is interactive at
            once. A card blocks only until something first draws. After that, a
            small chip of fixed size says what still refines. The curvilinear
            map examples show it now, for example "Refining · 12 tiles, 3 fits".
            It blocks nothing. The plan generalizes it: <C>view.refinement</C>{" "}
            lists the active sources (streaming, transitions, shader compiles,
            occlusion feedback, accumulation), and <C>view.converged()</C>{" "}
            resolves when they are done, for screenshots, tests and exports. It
            is reviewed (CS-15): <C>converged()</C> replaces <C>whenReady</C>,
            takes a level (<C>"drawn"</C>, <C>"correct"</C> or{" "}
            <C>"converged"</C>) and deadlines, and a <C>freeze</C> option holds
            the view's selection so fades and fits finish on what has loaded.
            Transitions, pending shader swaps and the resolution governor report
            as sources. Jobs report through <C>JobSpec.refinement</C>. Only the
            chip is built.
          </li>
          <li>
            <strong>A renderer behind each view.</strong> The seam for a second
            renderer, such as a WebGL 2 one, is a renderer behind a view, not a
            GPU backend under one renderer. Each view reports what it supports
            in the scene's terms (<C>view.support</C>): an unmet request warns
            once and falls back, or throws in a strict mode. Every renderer must
            draw the globe, terrain, imagery and meshes. Outputs are named
            (color, display color, IDs, depth). <C>GpuDevice</C>,{" "}
            <C>Capabilities</C> and <C>LimitsTier</C> move to an advanced entry
            point, so the main API doesn't name the GPU.
          </li>
          <li>
            <strong>Streaming robustness</strong> (CS-16, reviewed). Every fetch
            gets a deadline from its origin's measured latency. Transient
            failures retry with backoff inside per-origin budgets. A 404 or 204
            on 3D Tiles content is empty content and the parent stays drawn.
            Failed tiles get another chance after cool-downs, and ion tokens
            refresh once per generation. Request options reach 1.x's parity: a
            proxy (a prefix or a function), query parameters and headers
            inherited by derived requests, credentials for trusted origins, and
            an app hook that refreshes authorization.
          </li>
          <li>
            <strong>Cesium IR, MaterialX and a WebGL 2 renderer</strong> are
            described on the Shading tab and under Browser compatibility; their
            plans are reviewed and none is built.
          </li>
          <li>
            <strong>Engine profiles.</strong> The plan in{" "}
            <C>docs/superpowers/plans/2026-11-13-engine-profiles.md</C> has the
            app describe a look, and the engine keep as much of it as the device
            allows. Each feature has a short ladder of cheaper steps, including
            render resolution, multisampling and aerial perspective's three
            methods. Rules are data. Fidelity is automatic unless the app pins
            it. An opt-in governor may change only the render scale. Built so
            far: the device's facts, the catalog, its rules and the resolver,
            the hardware paths chosen in one place, and the reports on each
            view. <C>view.support</C> lists what the view can do on its device,{" "}
            <C>view.effective</C> gives each feature what was asked, what was
            given and the rules behind it, and <C>view.explain(feature)</C>{" "}
            gives one feature's trail. They are resolved again after a resize
            and after device loss. Glare's automatic tier comes from the
            resolver. Notices go to the engine's errors as kind <C>"support"</C>
            ; those that matter warn once, and <C>strict</C> makes them throw.
            The view's options are its look for now; resolution, multisampling,
            the inspector's section and the advanced entry point are next.
          </li>
        </ul>
        <Written
          from="the overall plan, sections 13.41 and 13.43, and the plans for engine profiles, the worker-mode façade, refinement and streaming robustness"
          on="2026-11-20"
        />
      </Section>

      <Section title="The planned work, by project">
        <p>
          The work items in <C>work/</C>, one file per item, grouped by project;
          each project is a plan reviewed by the owner on 2026-11-13. Items list
          order and dependencies only. "Not built" means no code is merged.
        </p>
        <DataTable
          label="Planned work by project"
          columns={[
            { head: "Project", cell: (r) => r.m },
            { head: "What", cell: (r) => r.what },
            { head: "State", cell: (r) => r.state },
          ]}
          rows={[
            {
              m: "CS-8 Engine profiles",
              what: "Facts and personas, the catalog and resolver, wiring into Engine and View, features, the inspector, the gpu entry point, the Viewer's defaults, then the WebGL 2 and worker hooks (CS-20 to CS-31).",
              state: "Reviewed; not built",
            },
            {
              m: "CS-10 Cesium IR",
              what: "The core, format, passes and emitters; transforms and styles moved onto it; the front ends and API surface; then gaps for noise, textures, matrices, derivatives, loops and structs (CS-48 to CS-69).",
              state: "Reviewed; not built",
            },
            {
              m: "CS-9 The WebGL 2 renderer",
              what: "The shader route spike, the seam, first draws, the globe, lighting, styles and curvilinear maps, picks and user code, the atmosphere and further steps (CS-32 to CS-47). The browser research (CS-43) is done and ordered the further steps.",
              state: "Reviewed; not built",
            },
            {
              m: "CS-12 The job system's ports",
              what: "The first slice (CS-86), then CS-87 to CS-100 move existing work onto it.",
              state: "First slice built; the rest planned",
            },
            {
              m: "CS-14 Level-of-detail transitions",
              what: "Coarsening and 3D Tiles both ways, then measurement and the options it decides (CS-121 to CS-133).",
              state: "Reviewed; not built",
            },
            {
              m: "CS-11 Live MaterialX graph editing",
              what: "A gallery example (CS-70 to CS-85); after Cesium IR's MaterialX front end (CS-63) and noise (CS-64).",
              state: "Reviewed; not built",
            },
            {
              m: "CS-15 Refinement and convergence",
              what: "view.refinement, converged(), and the loop's reasons (CS-134 to CS-143).",
              state: "Reviewed; not built",
            },
            {
              m: "CS-16 Streaming robustness",
              what: "Streaming robustness and request options (CS-144 to CS-158).",
              state: "Reviewed; not built",
            },
            {
              m: "CS-13 The worker-mode façade",
              what: "The protocol table, the public API review (CS-102), then the façade and worker mode (CS-101 to CS-120).",
              state: "Reviewed; not built",
            },
          ]}
        />
        <p>
          The kickoff order groups work so that no two agents write the same
          files. Wave A starts in parallel on new files: Cesium IR's core and
          our naga build, the façade's protocol table, the WebGL 2 shader route
          spike, the MaterialX document layer, the LOD measurement script and
          the profiles' device facts. Wave B is the renderer seam alone, as pure
          moves. Wave C runs by area once it lands: the signed transition word,
          swap-when-ready shaders, the refinement registry, content decode on
          jobs, the profiles' catalog and Cesium IR's passes. Wave D follows
          each item's inputs.
        </p>
        <Written
          from="the work items in work (views.mjs lists)"
          on="2026-11-13"
        />
      </Section>

      <Section title="Content sources as modules">
        <p>
          Every kind of content will load through one interface,{" "}
          <C>ContentSource</C>: 3D Tiles, the globe's terrain and imagery, glTF
          files, vector tiles, Esri services, USD, and sources an application or
          its host writes. Each is a module, so an app pays only for the sources
          it imports. This is designed, not built (the design note
          docs/design/content-source-seam.md).
        </p>
        <ul>
          <li>
            A source decides what to load: a tree chosen by view, a whole asset,
            tiles chosen by what they land on, or changes pushed to it. The
            engine decides how much any source may load, from one budget shared
            by all of them.
          </li>
          <li>
            A source sees only what the engine hands it: requests through the
            host's fetch and credential provider, decode on the worker pool, and
            sinks that take meshes, images, vector features and points as plain
            data. So the same source runs on the main thread or in a worker, and
            a host can supply its own services underneath.
          </li>
          <li>
            Where an asset lives is a separate interface: a resolver turns a
            reference (a URL, an ion asset, a host's own ID) into a location,
            credentials, credits and a kind. ion is one resolver among others.
          </li>
          <li>
            Everything a source writes carries a stable ID, which picks, edits
            and live updates key by.
          </li>
        </ul>
        <p>
          What is already built, and tested, is what makes the split cheap:
          streaming reaches the engine only through <C>TilesetHost</C> and{" "}
          <C>DrawSink</C>, the core's files are in tiers (<C>gpu</C>,{" "}
          <C>renderer</C>, <C>scene</C>, <C>content</C>) that the boundary test
          enforces, and draw records, compiled styles and queries are plain
          data. The bundle check measures what an app with no tilesets pays
          today, as the baseline the modules are checked against. Stable IDs are
          built as well: a pick, a ray hit and an ID image all name a feature by
          a 64-bit hash of what it is (its item, its source, its content and
          feature), never by the order it loaded in, with labels by taxonomy
          beside it.
        </p>
        <Written
          from="the design note docs/design/content-source-seam.md, and the stable IDs in packages/core/src/scene/identity.ts"
          on="2026-11-22"
        />
      </Section>
    </Page>
  );
}
