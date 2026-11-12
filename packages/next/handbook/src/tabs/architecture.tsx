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
  proj: "@cesium/next/proj",
  measure: "@cesium/next/measure",
};

/** Dynamic imports, and what makes each one load. */
const TRIGGERS: Record<string, string> = {
  "src/frames/providers/earthOrientation.ts":
    'A reference frame asks for the "precise" level of Earth orientation (the IAU 2006/2000A series)',
  "src/frames/providers/ephemeris.ts":
    "A reference frame needs the ephemeris (DE440 packs)",
  "src/scene/slang.ts":
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
    seam: "Smooth transforms",
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

const GRAPH_MODULES = [
  {
    module: "transform",
    holds:
      "The graph (affine, smooth and switch nodes), routes, the IR with its parser, autodiff, intervals and WGSL, the compiler, accuracy along a route, and point and measurement queries in any node",
    rule: "No geo knowledge, and it imports none of the modules below",
  },
  {
    module: "transforms",
    holds:
      "Generic built-in smooth transforms: bend, twist, taper, lattice, scale-about, bump, radial distortion, corridor unroll, velocity model",
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
      "The catalogue of reference frames, Earth orientation and ephemerides: data feeding the graph, with smoothFrame and switchFrame putting nodes in it",
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
              <C>test/importBoundary.test.ts</C>'s layers, a library build, the
              bundle check and the setup store
            </>
          }
        />
        <ModuleRules />
        <p>
          Two details the stack leaves out. <C>frames</C> may import core types,
          and values from only{" "}
          {data.layers.framesCoreValues.map((f, i) => (
            <span key={f}>
              {i > 0 ? " and " : ""}
              <C>{f}</C>
            </span>
          ))}
          . And <C>time</C> uses only utilities, not the core. The boundary test
          fails on any import that breaks these rules.
        </p>
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
          rows={["core", "time", "frames", "proj", "measure"].flatMap((id) =>
            library.entries.filter((e) => e.entry === id),
          )}
        />
        <Generated
          from={
            <>
              a build with <C>vite.lib.config.ts</C>
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
          coordinate operation, a smooth edge fitted per tile. A local CRS with
          a site transform is a rigid edge. The mode field is still in the code,
          and goes with the API review (plan 5i).
        </p>
        <Written
          from="the plan 5 spec, sections 7.2, 7.7, 7.9 and 7.10, and the overall plan, section 13.26"
          on="2026-11-12"
        />
      </Section>

      <Section title="Inside the core: the transform graph">
        <p>
          Where content sits decides how it is drawn. A tree of nodes joins it
          to the camera, each edge either affine (a matrix, cheap to recompute
          every frame) or smooth (a differentiable function with parameters,
          such as vertical exaggeration or a projection). The core compiles each
          route into one GPU function, and the same route answers picks,
          measurements, accuracy and clips on the CPU, in float64. It is built,
          and the <a href="#/transform-graph">Transform graph tab</a> tours it.
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
          a built-in, or a built-in reaches past the transform core. Warps are
          gone as a separate idea: a deformer is a smooth node over the content
          it deforms, and a Moon beside it is not under that node, so it isn't
          warped.
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

      <Section title="Splitting the core later">
        <p>
          The plan's current answer (section 13.36, notes for later) is to keep
          one package until a second consumer needs a part left out: for example
          a b-rep viewer with no tilesets. What lets the split happen cheaply is
          already built, and tested:
        </p>
        <ul>
          <li>
            Streaming reads the engine only through <C>TilesetHost</C> and{" "}
            <C>DrawSink</C>, so content never holds the world or the renderer.
          </li>
          <li>
            The core's files are in tiers (<C>gpu</C>, <C>renderer</C>,{" "}
            <C>scene</C>, <C>content</C>), and the boundary test fails on an
            import across them that isn't a named, explained exception.
          </li>
          <li>
            Draw records, a <C>BrepForm</C>, a compiled style and a query and
            its answer are plain data, so a module can move to a worker or be
            replaced.
          </li>
        </ul>
        <p>
          Next would come a <C>tiles</C> entry point, then moving the styling
          compiler apart from its 3D Tiles binding, and a package only if the
          bundle check shows tilesets cost an app that doesn't use them. None of
          that is started.
        </p>
        <Written from="the overall plan, section 13.36" on="2026-11-12" />
      </Section>
    </Page>
  );
}
