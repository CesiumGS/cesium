import type { ReactNode } from "react";
import { count, data, libraryEntry, size } from "./data.ts";
import { C } from "./parts.tsx";

/**
 * The engine's modules as a stack: each block can use what's under it, so
 * position says what an arrow would. Layers, their rules and sizes are
 * generated; a block's words are written here. A layer the test gains shows
 * under "Not yet described" until it has words.
 */

const file = (name: string) =>
  data.runtime.flatMap((g) => g.files).find((f) => f.name === name);

const lazyChunk = (name: string) =>
  data.bundles.globeOnly.lazy.find((c) => c.name === name);

const asset = (name: string) =>
  data.bundles.library.assets.find((a) => a.name.startsWith(name));

/** "170 KB with what it imports, 64 KB gzipped". */
const entrySize = (id: string) => {
  const entry = libraryEntry(id);
  return entry
    ? `${size(entry.loadKb)} with what it imports, ${size(entry.loadGzipKb)} gzipped`
    : undefined;
};

interface ModuleWords {
  title: string;
  optional: boolean;
  /** No entry point, or the path you import. */
  path: string | undefined;
  forWhat: string;
  loads: ReactNode;
  onDemand?: ReactNode;
  downloads: ReactNode;
}

const MODULES: Record<string, () => ModuleWords> = {
  widgets: () => ({
    title: "Widgets",
    optional: true,
    path: "widgets/index.ts",
    forWhat:
      "Viewer, for a working globe in one call, and the inspector. Kept apart from the engine, as 1.x keeps its widgets.",
    loads: (
      <>
        With the page, if you import it. A globe-only Viewer is{" "}
        {size(data.bundles.globeOnly.main.kb)} in all, or{" "}
        {size(data.bundles.globeOnly.main.gzipKb)} gzipped.
      </>
    ),
    downloads: "Nothing of its own.",
  }),
  measure: () => ({
    title: "Measure",
    optional: true,
    path: "@cesium/next/measure",
    forWhat:
      "Light time, Doppler, geodesics, occultation and line of sight, each with a stated accuracy.",
    loads: <>With the page, if you import it. {entrySize("measure")}.</>,
    downloads: "Nothing of its own: it uses what frames and proj load.",
  }),
  proj: () => ({
    title: "Proj",
    optional: true,
    path: "@cesium/next/proj",
    forWhat:
      "PROJ for any coordinate operation the core's built-in reprojections don't cover (datum grids, the EPSG catalogue), plus snapping and alignments with stations.",
    loads: <>With the page, if you import it. {entrySize("proj")}.</>,
    downloads: (
      <>
        The first time coordinates are converted: PROJ's WebAssembly (
        {size(file("proj_capi.wasm")?.kb)}), its database (
        {size(file("proj.db")?.kb)}), then only the grids an operation names.
      </>
    ),
  }),
  frames: () => ({
    title: "Frames",
    optional: true,
    path: "@cesium/next/frames",
    forWhat:
      "The catalogue of reference frames (ICRF, ITRF, the bodies), Earth orientation, ephemerides and trajectories: data feeding the transform graph, answering where one frame is in another at a given time. smoothFrame and switchFrame put the graph's smooth and per-view nodes in it.",
    loads: <>With the page, if you import it. {entrySize("frames")}.</>,
    onDemand: (
      <>
        Earth orientation ({size(lazyChunk("earthOrientation")?.kb)}) and the
        ephemeris reader ({size(lazyChunk("ephemeris")?.kb)}), when a reference
        frame is asked for at <C>"precise"</C>.
      </>
    ),
    downloads: (
      <>
        Only at <C>"precise"</C>: planet and Moon ephemerides (
        {size(file("planets-de440-2000-2050.pack")?.kb)} and{" "}
        {size(file("moon-pa-de440-2000-2050.pack")?.kb)}) and the Earth
        orientation table ({size(file("EOP-All.csv")?.kb)}). Analytic stand-ins
        answer until then, with no data.
      </>
    ),
  }),
  time: () => ({
    title: "Time",
    optional: true,
    path: "@cesium/next/time",
    forWhat:
      "Instant, time scales, leap seconds and the scene clock. An app with a timeline needs it, without the frames catalogue.",
    loads: <>With the page, if you import it. {entrySize("time")}.</>,
    downloads:
      "Nothing it must have: a leap-second table is built in, and a newer one is used only if it's supplied.",
  }),
  core: () => ({
    title: "Core",
    optional: false,
    path: "@cesium/next",
    forWhat:
      "Engine, World, View and Camera, with tilesets, the globe, vector layers, b-reps and the camera layer, and the transform graph that places, reprojects and deforms all of it. Everything that draws.",
    loads: <>Always, with the page. {entrySize("core")}.</>,
    onDemand: (
      <>
        The content worker ({size(asset("worker")?.kb)}) when the engine starts.
        Basis ({size(asset("basis_transcoder")?.kb)}) and Draco (
        {size(asset("draco_decoder")?.kb)}) when content needs them. The Slang
        compiler ({size(file("slang-wasm.wasm")?.kb)}) only through{" "}
        <C>CustomShader.fromSlang</C>.
      </>
    ),
    downloads: "Only the tiles, terrain and imagery you point it at.",
  }),
  utilities: () => ({
    title: "Utilities",
    optional: false,
    path: undefined,
    forWhat:
      "Math, the event emitter, the clock interface and a byte reader. Every module may use them, and they use nothing else.",
    loads: "With whatever imports it. It has no entry point of its own.",
    downloads: "Nothing.",
  }),
};

function ModuleBlock({
  id,
  wide = false,
  children,
}: {
  id: string;
  wide?: boolean;
  children?: ReactNode;
}) {
  const m = MODULES[id]?.();
  if (!m) {
    return (
      <section className="module">
        <h3>{id}</h3>
        <p>Not yet described.</p>
      </section>
    );
  }
  return (
    <section
      className={[
        "module",
        m.optional ? "optional" : "required",
        id === "core" ? "core" : "",
        wide ? "wide" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <header>
        <h3>{m.title}</h3>
        <span className="module-tag">
          {m.optional ? "Optional" : id === "core" ? "Always there" : "Shared"}
        </span>
      </header>
      {m.path ? <C>{m.path}</C> : null}
      <p className="module-for">{m.forWhat}</p>
      <dl>
        <dt>Loads</dt>
        <dd>{m.loads}</dd>
        {m.onDemand ? (
          <>
            <dt>On demand</dt>
            <dd>{m.onDemand}</dd>
          </>
        ) : null}
        <dt>Downloads</dt>
        <dd>{m.downloads}</dd>
      </dl>
      {children}
    </section>
  );
}

/** Layers the test has, placed in the stack: most dependencies at the top. */
function stackOrder() {
  const known = new Set(["widgets", "core", "utilities"]);
  return data.layers.layers
    .map((l) => l.id)
    .filter((id) => !known.has(id))
    .sort(
      (a, b) =>
        (data.layers.allowed[b]?.length ?? 0) -
        (data.layers.allowed[a]?.length ?? 0),
    );
}

/** The modules as a stack. */
export function ModuleStack() {
  return (
    <div className="stack-map">
      <ModuleBlock id="widgets" wide />
      <div className="stack-optional">
        {stackOrder().map((id) => (
          <ModuleBlock id={id} key={id} />
        ))}
      </div>
      <ModuleBlock id="core" wide>
        <div
          className="stack-inner"
          aria-label="The transform graph inside the core"
        >
          <p className="stack-rule">
            <strong>Inside the core, the transform graph:</strong>{" "}
            <C>transform</C> (the graph, routes, the restricted-JS parser, IR,
            autodiff and the route compiler) ← <C>transforms</C> (generic smooth
            transforms: bend, twist, taper, lattice, lens, corridor, velocity
            model) and <C>georeference</C> (exaggeration, height offset,
            flatten, the built-in reprojections, <C>Georeference</C>). The
            built-ins use only the transform core; the transform core uses none
            of them. Details on the{" "}
            <a href="#/transform-graph">Transform graph</a> and{" "}
            <a href="#/georeferencing">Georeferencing</a> tabs.
          </p>
        </div>
        <p className="stack-rule">
          Optional modules may use the core. The core never uses them: it
          reaches them only through its frame resolver and clock interfaces, so
          an app that doesn&apos;t import them doesn&apos;t load them.
        </p>
      </ModuleBlock>
      <ModuleBlock id="utilities" wide />
    </div>
  );
}

/** What three kinds of app load, on the same scale. */
export function LoadStories() {
  const combination = (id: string) =>
    data.bundles.library.combinations.find((c) => c.id === id);
  const groups = (...names: string[]) =>
    names.reduce((n, name) => n + (file(name)?.kb ?? 0), 0);
  const withTime = combination("core+time");
  const all = combination("core+measure");
  const ephemerides = groups(
    "planets-de440-2000-2050.pack",
    "moon-pa-de440-2000-2050.pack",
    "EOP-All.csv",
  );
  const proj = groups("proj_capi.wasm", "proj.db");
  const content =
    (asset("worker")?.kb ?? 0) +
    (asset("basis_transcoder")?.kb ?? 0) +
    (asset("draco_decoder")?.kb ?? 0);
  const contentWords = `The content worker and decoders (${size(content)}), then the tiles and imagery you show.`;
  const stories = [
    {
      title: "A globe",
      imports: <C>Viewer</C>,
      startupKb: data.bundles.globeOnly.main.kb,
      startupGzipKb: data.bundles.globeOnly.main.gzipKb,
      laterKb: content,
      later: `${contentWords} The sky is analytic, with no data.`,
    },
    {
      title: "An engine with a timeline",
      imports: (
        <>
          <C>@cesium/next</C> and <C>/time</C>
        </>
      ),
      startupKb: withTime?.loadKb ?? 0,
      startupGzipKb: withTime?.loadGzipKb ?? 0,
      laterKb: content,
      later: contentWords,
    },
    {
      title: "An engine with frames and measurement",
      imports: (
        <>
          <C>@cesium/next</C> and <C>/measure</C>, which brings <C>/frames</C>,{" "}
          <C>/proj</C> and <C>/time</C>
        </>
      ),
      startupKb: all?.loadKb ?? 0,
      startupGzipKb: all?.loadGzipKb ?? 0,
      laterKb: content + ephemerides + proj,
      later: (
        <>
          {contentWords} {size(ephemerides)} of ephemerides and Earth
          orientation at <C>"precise"</C>, and {size(proj)} of PROJ for
          engineering coordinates, plus any grids. Each only if it's used.
        </>
      ),
    },
  ];
  const max = Math.max(...stories.map((s) => s.startupKb + s.laterKb));
  const share = (kb: number) => `${(kb / max) * 100}%`;
  return (
    <div className="stories">
      {stories.map((s) => (
        <section className="story" key={s.title}>
          <h3>{s.title}</h3>
          <p className="story-imports">Imports {s.imports}</p>
          <div className="story-bar" aria-hidden="true">
            <span
              className="startup"
              style={{ inlineSize: share(s.startupKb) }}
            />
            <span className="later" style={{ inlineSize: share(s.laterKb) }} />
          </div>
          <dl>
            <dt>With the page</dt>
            <dd>
              {size(s.startupKb)} of code, or {size(s.startupGzipKb)} gzipped
            </dd>
            <dt>Only if asked</dt>
            <dd>{s.later}</dd>
          </dl>
        </section>
      ))}
      <p className="story-key">
        <span className="startup" aria-hidden="true" /> Loads with the page{" "}
        <span className="later" aria-hidden="true" /> Downloads only if asked.
        The bars share one scale, of uncompressed bytes.
      </p>
    </div>
  );
}

/** The rule behind the stack, with the import counts it was measured from. */
export function ModuleRules() {
  const counts = (from: string) =>
    data.layers.edges.filter((e) => e.from === from);
  return (
    <details className="pass-entry">
      <summary>The rule, layer by layer, with import counts</summary>
      <div
        className="table-wrap"
        tabIndex={0}
        role="group"
        aria-label="Layer rules"
      >
        <table className="seams">
          <thead>
            <tr>
              <th scope="col">Layer</th>
              <th scope="col">May import</th>
              <th scope="col">Imports today</th>
              <th scope="col">Size of its source</th>
            </tr>
          </thead>
          <tbody>
            {data.layers.layers.map((l) => (
              <tr key={l.id}>
                <th scope="row">{l.id}</th>
                <td>
                  {l.id === "widgets"
                    ? "anything"
                    : (data.layers.allowed[l.id] ?? [])
                        .filter((x) => x !== l.id)
                        .join(", ") || "only itself"}
                </td>
                <td>
                  {counts(l.id)
                    .map(
                      (e) =>
                        `${e.to}: ${e.value} value${e.value === 1 ? "" : "s"}, ${e.typeOnly} type-only`,
                    )
                    .join("; ") || "nothing outside itself"}
                </td>
                <td>
                  {count(l.lines)} lines in {count(l.files)} files
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
