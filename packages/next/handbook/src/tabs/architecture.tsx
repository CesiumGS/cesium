import { useId } from "react";
import { count, data, libraryEntry, size, type LayerEdge } from "../data.ts";
import {
  C,
  DataTable,
  Figure,
  Flow,
  Generated,
  Page,
  Section,
  Written,
} from "../parts.tsx";

/** What each layer is, and how it's imported. Layers come from the test. */
const ABOUT: Record<string, { path: string; what: string }> = {
  core: {
    path: "@cesium/next",
    what: "Engine, World, View, Camera, tilesets, globe, vector layers, the camera layer. It sees time only through a clock interface.",
  },
  time: {
    path: "@cesium/next/time",
    what: "Instant, time scales, leap seconds, the scene clock, the analytic sun and Moon. An app with a timeline needs no frame tree.",
  },
  frames: {
    path: "@cesium/next/frames",
    what: "The frame tree, its catalog, providers on demand, trajectories, and the resolver over the tree.",
  },
  proj: {
    path: "@cesium/next/proj",
    what: "Engineering coordinates, PROJ and grids (loaded lazily), tileset placement, snapping, alignments.",
  },
  measure: {
    path: "@cesium/next/measure",
    what: "Light time, Doppler, geodesics, occultation, line of sight, and stated accuracy.",
  },
  widgets: {
    path: "widgets/index.ts",
    what: "Viewer and the inspector, kept apart from the engine as 1.x keeps its widgets. Not yet an entry point in package.json.",
  },
  neutral: {
    path: "no entry point",
    what: "Math, shared core utilities and the byte reader. Everything may import it, and it imports nothing else.",
  },
};

const edgesBetween = (from: string, to: string): LayerEdge | undefined =>
  data.layers.edges.find((e) => e.from === from && e.to === to);

const edgeLabel = (e: LayerEdge) =>
  e.typeOnly > 0 && e.value > 0
    ? `${e.value} + ${e.typeOnly}`
    : e.value > 0
      ? `${e.value}`
      : `${e.typeOnly} types`;

const edgeWeight = (e: LayerEdge) =>
  1 + Math.log2(1 + e.value + e.typeOnly / 2) * 0.55;

/** The layer diagram. Its boxes are placed here; everything in them is read. */
function LayerDiagram() {
  const head = useId();
  const stack = ["measure", "proj", "frames", "time"];
  const X = 600;
  const W = 300;
  const H = 62;
  const GAP = 34;
  const TOP = 118;
  const yOf = (i: number) => TOP + i * (H + GAP);
  const coreBottom = yOf(stack.length - 1) + H;
  const layer = (id: string) => data.layers.layers.find((l) => l.id === id);
  const sub = (id: string) => {
    const l = layer(id);
    const load = libraryEntry(id);
    return `${count(l?.lines ?? 0)} lines${load ? `, loads ${size(load.loadKb)}` : ""}`;
  };
  const edges: React.ReactNode[] = [];
  const arrow = (
    key: string,
    d: string,
    e: LayerEdge,
    lx: number,
    ly: number,
  ) =>
    edges.push(
      <g key={key}>
        <path
          className="d-edge"
          d={d}
          strokeWidth={edgeWeight(e)}
          strokeDasharray={e.value === 0 ? "5 4" : undefined}
          markerEnd={`url(#${CSS.escape(head)})`}
        />
        <text className="d-edge-label" x={lx} y={ly} textAnchor="middle">
          {edgeLabel(e)}
        </text>
      </g>,
    );
  // Into the core: each stack layer, straight left. Nothing comes back.
  stack.forEach((id, i) => {
    const e = edgesBetween(id, "core");
    if (e) {
      const y = yOf(i) + H / 2;
      arrow(`${id}-core`, `M${X} ${y} L${348} ${y}`, e, 472, y - 6);
    }
  });
  // Down the stack: straight between neighbours, an arc to the right otherwise.
  stack.forEach((from, i) => {
    stack.forEach((to, j) => {
      const e = j > i ? edgesBetween(from, to) : undefined;
      if (!e) {
        return;
      }
      if (j === i + 1) {
        const x = X + W / 2;
        arrow(
          `${from}-${to}`,
          `M${x} ${yOf(i) + H} L${x} ${yOf(j) - 2}`,
          e,
          x + 44,
          yOf(i) + H + GAP / 2 + 4,
        );
      } else {
        const bulge = X + W + 26 + (j - i) * 24;
        const y1 = yOf(i) + H / 2 + 8;
        const y2 = yOf(j) + H / 2 - 8;
        arrow(
          `${from}-${to}`,
          `M${X + W} ${y1} C${bulge} ${y1} ${bulge} ${y2} ${X + W + 4} ${y2}`,
          e,
          // The curve's rightmost point, where its label sits.
          (X + W) * 0.25 + bulge * 0.75,
          (y1 + y2) / 2 + 4,
        );
      }
    });
  });
  // Widgets, across the top.
  const wc = edgesBetween("widgets", "core");
  if (wc) {
    arrow("widgets-core", `M190 90 L190 ${TOP - 2}`, wc, 214, 108);
  }
  stack.forEach((to, j) => {
    const e = edgesBetween("widgets", to);
    if (e) {
      const bulge = X + W + 90 + j * 26;
      const y2 = yOf(j) + H / 2 + 14;
      arrow(
        `widgets-${to}`,
        `M${X + W} 56 C${bulge} 56 ${bulge} ${y2} ${X + W + 4} ${y2}`,
        e,
        (X + W) * 0.25 + bulge * 0.75,
        (56 + y2) / 2 + 4,
      );
    }
  });
  const box = (id: string, x: number, y: number, w: number, h: number) => (
    <g key={id}>
      <rect
        className={id === "core" ? "d-box d-box-accent" : "d-box"}
        x={x}
        y={y}
        width={w}
        height={h}
        rx={8}
      />
      <text className="d-title" x={x + 14} y={y + 24}>
        {id}
      </text>
      <text className="d-text d-mono" x={x + 14} y={y + 42}>
        {ABOUT[id]?.path ?? ""}
      </text>
      <text className="d-text" x={x + w - 14} y={y + 24} textAnchor="end">
        {sub(id)}
      </text>
    </g>
  );
  const coreWords = [
    "Nothing leaves the core toward",
    "time, frames, proj or measure.",
    "Reference frames reach it through",
    "the frame resolver interface, and",
    "time through the clock interface.",
  ];
  return (
    <svg viewBox="0 0 1064 576" role="img" aria-labelledby={`${head}t`}>
      <title id={`${head}t`}>
        The engine's layers and the imports between them. Every arrow points
        toward the core or down the stack; none leaves the core.
      </title>
      <defs>
        <marker
          id={head}
          viewBox="0 0 8 8"
          refX="7"
          refY="4"
          markerWidth="7"
          markerHeight="7"
          markerUnits="userSpaceOnUse"
          orient="auto"
        >
          <path className="d-head" d="M0 0 L8 4 L0 8 z" />
        </marker>
      </defs>
      {edges}
      {box("widgets", 20, 22, X + W - 20, 68)}
      {box("core", 20, TOP, 326, coreBottom - TOP)}
      {coreWords.map((line, i) => (
        <text className="d-text" x={34} y={TOP + 112 + i * 20} key={line}>
          {line}
        </text>
      ))}
      {stack.map((id, i) => box(id, X, yOf(i), W, H))}
      {box("neutral", 20, coreBottom + 34, X + W - 20, 62)}
    </svg>
  );
}

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
    fills: "Design CRS to geodetic, grid factors, the recorded operation",
    default: "PROJ, through projCoordinateService",
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

export function Architecture() {
  const { globeOnly, library } = data.bundles;
  const lazyChunks = [
    ...globeOnly.lazy.map((c) => c.name),
    ...library.entries.flatMap((e) => e.lazy.map((c) => c.name)),
  ];
  const workerKb = library.assets.find((a) => a.name === "worker")?.kb;
  const assetKb = (name: string) =>
    library.assets.find((a) => a.name.startsWith(name))?.kb;
  const runtimeKb = (name: string) =>
    data.runtime.flatMap((g) => g.files).find((f) => f.name === name)?.kb;
  return (
    <Page
      title="System architecture"
      status="current"
      lede={
        <>
          One package with five entry points and a widgets module. A dependency
          rule keeps the core free of time, reference frames, coordinates and
          measurement, so an app pays only for what it imports, and a host
          application can replace any of them.
        </>
      }
    >
      <Section title="Modules and how they depend on each other">
        <Figure
          scroll
          label="Layer diagram"
          caption="Every arrow points toward the core or down the stack, and none leaves the core: the boundary test fails on any import that would. An arrow means imports. Labels count them as value + type-only, and dashes mean types only. Arrows into neutral are left out, as every layer has one."
        >
          <LayerDiagram />
        </Figure>
        <Generated
          from={
            <>
              <C>test/importBoundary.test.ts</C>'s layer table, run over today's
              imports
            </>
          }
        />
        <DataTable
          label="Layers and their rules"
          columns={[
            { head: "Layer", cell: (r) => <strong>{r.id}</strong> },
            { head: "What it holds", cell: (r) => ABOUT[r.id]?.what ?? "" },
            {
              head: "May import",
              cell: (r) =>
                r.id === "widgets"
                  ? "anything"
                  : (data.layers.allowed[r.id] ?? [])
                      .filter((l) => l !== r.id)
                      .join(", ") || "only itself",
            },
            {
              head: "Files",
              numeric: true,
              cell: (r) => count(r.files),
            },
            {
              head: "Lines",
              numeric: true,
              cell: (r) => count(r.lines),
            },
          ]}
          rows={[
            "core",
            "time",
            "frames",
            "proj",
            "measure",
            "widgets",
            "neutral",
          ].flatMap((id) => data.layers.layers.filter((l) => l.id === id))}
        />
        <p>
          One allowed exception: <C>frames</C> may import core types, and values
          from only{" "}
          {data.layers.framesCoreValues.map((f, i) => (
            <span key={f}>
              {i > 0 ? " and " : ""}
              <C>{f}</C>
            </span>
          ))}
          . The test assigns layers by file rather than by folder: the ERFA
          series in <C>src/time/erfa/</C> count as <C>frames</C>, not{" "}
          <C>time</C>.
        </p>
      </Section>

      <Section title="What loads when">
        <Flow
          label="Stages of loading"
          steps={[
            {
              title: "With the page",
              body: (
                <>
                  The main chunk of what the app imports. A globe-only Viewer is{" "}
                  {size(globeOnly.main.kb)}, or {size(globeOnly.main.gzipKb)}{" "}
                  gzipped.
                </>
              ),
            },
            {
              title: "When the engine starts",
              body: (
                <>
                  The content worker ({size(workerKb)}), found from{" "}
                  <C>import.meta.url</C>. Nothing needs <C>CESIUM_BASE_URL</C>{" "}
                  or files copied by hand.
                </>
              ),
            },
            {
              title: "When content needs a decoder",
              body: (
                <>
                  Basis ({size(assetKb("basis_transcoder"))}) and Draco (
                  {size(assetKb("draco_decoder"))}) WebAssembly, in the worker.
                </>
              ),
            },
            {
              title: "When a feature asks",
              body: (
                <>
                  Earth orientation series, ephemeris readers, PROJ (
                  {size(runtimeKb("proj_capi.wasm"))} of wasm,{" "}
                  {size(runtimeKb("proj.db"))} database) and its grids, or the
                  Slang compiler ({size(runtimeKb("slang-wasm.wasm"))}).
                </>
              ),
              aside: "Asynchronous and cancellable.",
            },
          ]}
        />
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
            { head: "Entry point", cell: (r) => <C>{ABOUT[r.entry]?.path}</C> },
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
          A <C>hosted</C> placement mode is specified in plan 5 for content the
          host reprojected itself: it is placed as delivered, and design
          coordinates come only from the host's coordinate service.
        </p>
        <Written
          from="the plan 5 spec, sections 7.2, 7.7, 7.9 and 7.10"
          on="2026-11-08"
        />
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
    </Page>
  );
}
