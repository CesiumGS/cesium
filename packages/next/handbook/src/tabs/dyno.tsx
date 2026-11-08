import type { ReactNode } from "react";
import { count, data } from "../data.ts";
import { Board, type BoardStep } from "../diagram.tsx";
import {
  C,
  CodeBlock,
  Figure,
  Note,
  Page,
  Section,
  Written,
} from "../parts.tsx";

const SHOTS = import.meta.glob("../../shots/*.webp", {
  query: "?inline",
  import: "default",
  eager: true,
}) as Record<string, string>;

/** A capture of the app, following the page's theme where both exist. */
function Shot({ name, alt }: { name: string; alt: string }) {
  const light = SHOTS[`../../shots/${name}-light.webp`];
  const dark = SHOTS[`../../shots/${name}-dark.webp`];
  if (!light && !dark) {
    return null;
  }
  return (
    <div className="dyno-shot">
      {light ? (
        <img
          className={dark ? "only-light" : undefined}
          src={light}
          alt={alt}
          decoding="async"
        />
      ) : null}
      {dark ? (
        <img
          className={light ? "only-dark" : undefined}
          src={dark}
          alt={light ? "" : alt}
          decoding="async"
        />
      ) : null}
    </div>
  );
}

const QUESTIONS = [
  {
    q: "Did this change make us slower?",
    a: (
      <>
        <C>cli.mjs run --changed --tier standard</C> runs the scenes the change
        can touch. Compare shows it per scene, with intervals.
      </>
    ),
  },
  {
    q: "When did this metric move, and in which commits?",
    a: "Trends follows it run to run, and Alerts names the commit range of each change it finds.",
  },
  {
    q: "Which release got slower?",
    a: (
      <>
        <C>cli.mjs run --releases 1.120.0..1.146.0</C> runs a range of CesiumJS
        releases, and Analysis plots each metric against them.
      </>
    ),
  },
  {
    q: "Does this tileset select the same tiles as 1.x?",
    a: "The Explorer's selection by depth counts each engine's tiles per level and how many only one draws. It can tint tiles by which engine selects them. The Lab's selection parity pages test it.",
  },
  {
    q: "Does this look the same?",
    a: (
      <>
        <C>cli.mjs images --parity</C> checks 2.0 against 1.x, and against its
        own approved images. Images shows what changed, with a FLIP heatmap, to
        approve or reject.
      </>
    ),
  },
  {
    q: "What does this setting do to everything else?",
    a: (
      <>
        <C>--sweep maximumScreenSpaceError=8,16,32</C> varies one parameter, and
        Analysis draws every metric against it.
      </>
    ),
  },
  {
    q: "Why does this content load slowly, or look wrong?",
    a: "The Viewer opens any content in one engine at a time, with the inspector showing what it draws, streams and holds.",
  },
];

const PIECES: BoardStep[] = [
  {
    id: "engines",
    lane: 0,
    row: 0,
    title: "Engines",
    body: "A CesiumJS release, the working tree, or either engine built at a git ref, with settings such as stepwise selection.",
  },
  {
    id: "scenes",
    lane: 0,
    row: 1,
    title: "Scenes",
    body: `A catalog of content and camera paths, with its licences. Public, plus a private manifest if you have one.`,
  },
  {
    id: "runner",
    lane: 1,
    row: 0,
    title: "The runner",
    body: (
      <>
        <C>cli.mjs</C> freezes the tree into a production build. It then
        alternates the engines over repetitions, each in a fresh browser
        context, waiting for the machine to cool and go quiet.
      </>
    ),
  },
  {
    id: "images",
    lane: 1,
    row: 1,
    title: "Image checks",
    body: (
      <>
        <C>cli.mjs images</C> captures each check once settled, against an
        approved image per renderer class.
      </>
    ),
  },
  {
    id: "results",
    lane: 2,
    row: 0,
    rows: 2,
    title: "Results, outside the repository",
    body: (
      <>
        One JSON file and a summary per run, in <C>~/.cesium-bench/results</C>,
        with triage state and notes beside them. They carry machine details, so
        they stay on your machine.
      </>
    ),
  },
  {
    id: "readers",
    lane: 3,
    row: 0,
    title: "Views that read results",
    body: "Overview, Trends, Runs and reports, Compare, Alerts, Scenes, Images and Analysis. The command line reads the same files.",
  },
  {
    id: "live",
    lane: 3,
    row: 1,
    title: "Views that run engines live",
    body: "Explorer, Viewer, Examples and Lab, for looking. They load the engines directly, and don't write results.",
  },
];

interface ViewNote {
  name: string;
  partly?: string;
  what: ReactNode;
  when: string;
  how: string;
  shot?: { name: string; alt: string };
}

const GROUPS: readonly { title: string; views: readonly ViewNote[] }[] = [
  {
    title: "Results",
    views: [
      {
        name: "Overview",
        what: "The latest ordinary run against 1.x: whether it can be trusted, which budgets it meets, and what needs a look, such as new regressions and images to review.",
        when: "The first look of the day, or after a run.",
        how: "The first item in the rail, or g o.",
        shot: {
          name: "overview",
          alt: "Dyno's Overview: the latest run's verdict and budgets, what to look at, and recent runs.",
        },
      },
      {
        name: "Trends",
        what: "Every metric run to run, with intervals, a control band, budgets, and notes where the hardware or settings changed. A panel can split by scene, and clicking a point opens that run. A view can be saved or shared by its URL.",
        when: "To follow a metric over time, or see whether a change has held.",
        how: "Trends in the rail, or g t.",
      },
      {
        name: "Runs and a run's report",
        what: "Every run with its commit, note, hardware, verdict and headline changes. A report leads with validity and a scorecard, then forest plots, conditions over the run, frame timelines along the camera path, and a filmstrip with FLIP.",
        when: "To understand one run, or to find one.",
        how: "Runs in the rail, or g r. Runs start from the command line: the app can't start a measured one.",
        shot: {
          name: "runs",
          alt: "Dyno's Runs: a table of runs with commit, note, hardware, verdict and headline changes.",
        },
      },
      {
        name: "Compare",
        what: "Two runs per scene, as a forest plot per metric, with the overall change in words. It warns when the machines or render settings differ.",
        when: "Before and after a change, commit to commit.",
        how: "Select two runs in Runs, or follow a link from an alert.",
      },
      {
        name: "Alerts",
        what: "Each significant change across runs, with its commit range and the series around it, and a triage state: new, acknowledged, expected, invalid or fixed. One change across several scenes is one card.",
        when: "To catch regressions nobody was looking for.",
        how: "Alerts in the rail, or g a. A badge counts new ones.",
      },
    ],
  },
  {
    title: "Scenes",
    views: [
      {
        name: "Scenes",
        partly:
          "A scene an engine can't draw shows as not run for that engine: point clouds and splats in 2.0, and instancing at this scale in 1.x.",
        what: "The catalog as cards, each with its best results per engine. A scene's page adds its history, the changes that moved it, a filmstrip over time, and its content and licences.",
        when: "To see what's measured, or how one scene has changed.",
        how: "Scenes in the rail, or g s.",
      },
      {
        name: "Explorer",
        partly:
          "Picks show per engine: a click picks in that pane, and each engine's inspector shows its own, so comparing means clicking in both.",
        what: "A catalog scene live in one or two engines side by side. Play or scrub the benchmark's camera path, or fly with linked cameras. Pause streaming, tint tiles by depth or by which engine selects them, show bounding volumes, and read the tile table: selection by depth, with how many tiles only one engine draws.",
        when: "To see why two engines differ. It's for looking, since the two share a GPU and main thread, and it says so.",
        how: "Explorer in the rail, g e, or a link from a report to that place on the path.",
        shot: {
          name: "explorer",
          alt: "Dyno's Explorer: 1.x and 2.0 side by side on the instanced milk truck scene, with each engine's inspector.",
        },
      },
      {
        name: "Viewer and the inspector",
        what: "Any content in one engine at a time, with settings beside it for selection, lighting, globe and rendering. The inspector over it shows problems, frame, streaming and its load timeline, the content pipeline and mix, memory, the GPU, the last 30 seconds and the last pick.",
        when: "To debug content or try settings, with the whole machine for one engine.",
        how: "Viewer in the rail, or g v. An app can also attach the inspector itself.",
      },
      {
        name: "Images",
        what: "Image regression: changed and new checks first, as a queue. Each shows baseline and new image side by side, with a swipe, a flicker toggle and the FLIP heatmap, plus 1.x for a parity run. Approving updates the baseline.",
        when: "After a change that might alter what's drawn.",
        how: "Images in the rail, or g i, after a run of cli.mjs images.",
      },
      {
        name: "Examples",
        what: "What 2.0 is for, one use case each, with its source: real-time tracks, translucency, the Slang playground, frames and projections, and design coordinates on the globe.",
        when: "To see a feature working, or read how it's used.",
        how: "Examples in the rail, or g x.",
      },
    ],
  },
  {
    title: "Workbench",
    views: [
      {
        name: "Analysis",
        what: "Two tabs. Sweeps plots each metric against a varied parameter or a range of releases. Machines shows the latest run on each machine.",
        when: "To tune a setting, find which release changed something, or compare machines.",
        how: "Analysis in the rail, or g n, after a sweep or runs on several machines.",
      },
      {
        name: "Lab",
        what: "Focused pages, one engine behaviour each: parity checks, costs, and spikes. These are the pages the scripted suites open, and in the app they're for looking.",
        when: "To look closely at one behaviour.",
        how: "Lab in the rail, or g l.",
        shot: {
          name: "lab",
          alt: "Dyno's Lab: a list of parity checks, microbenchmarks and spikes.",
        },
      },
    ],
  },
  {
    title: "Getting around",
    views: [
      {
        name: "Getting started",
        what: "Checks the setup live: WebGPU, the 1.x builds and the results folder. It gives one command for a first run, and says where to look after it.",
        when: "On a new machine. It also appears where a view has no runs.",
        how: "The rail's footer.",
      },
      {
        name: "The ion token",
        what: "One token for every view, example, Lab page and benchmark. Paste it for this session, or remember it on this device. It's never shown once saved, and never goes into a URL, a report or the console.",
        when: "To load ion content. Without one, the evaluation token reaches public assets only.",
        how: "The rail's footer.",
      },
      {
        name: "Go to, and shortcuts",
        what: "A palette that finds views, scenes, examples, Lab pages and runs by name, and keyboard shortcuts for each view.",
        when: "Any time.",
        how: "Ctrl K for the palette, and ? for the shortcuts.",
      },
    ],
  },
];

/** What each axis of a result is, and how thinly it's sampled. */
const axes = (scenes: number, scenarios: number) => [
  {
    axis: "Scene and scenario",
    varies: `${scenes} scenes in the public catalog, ${scenarios} scenarios, and private ones if you have a manifest`,
    kept: "Named in every result. A series is one scene, or one scene and scenario.",
    sampled:
      "A full tier runs every scene. Quick and standard run a few, chosen by what changed.",
    thin: false,
  },
  {
    axis: "Engine, version and settings",
    varies:
      "A release, the working tree, or a git ref, with settings after + such as 2.0+stepwise",
    kept: "A pinned release, so a new release starts a new trend line. Settings are part of the name.",
    sampled:
      "2.0 against one pinned release by default. Others when asked for, by sweep.",
    thin: false,
  },
  {
    axis: "Content and link",
    varies:
      "Datasets pinned by hash, or streamed live, and a fast or throttled link",
    kept: "A run refuses a mirrored dataset whose hash changed. Streamed content can change underneath, so a run counts its requests and bytes.",
    sampled:
      "Most of the catalog runs over the live network, and only one suite throttles. See the network, below.",
    thin: true,
  },
  {
    axis: "Environment",
    varies: "GPU, CPU, memory, OS, browser, driver and display",
    kept: "A series is keyed by the GPU's description alone, and Compare warns on that. The fuller machine key is only used for reusing stored runs.",
    sampled: "Thin: one browser, a few machines, mostly laptops.",
    thin: true,
  },
  {
    axis: "Repetition",
    varies:
      "Usually 3, alternating engines. Stored ones reused, or stopped early",
    kept: "Reuse needs the same machine, method, build, settings, scene and data, and never applies to the candidate.",
    sampled:
      "Thin for small changes: a 3% difference needs every repetition, and three still isn't many.",
    thin: true,
  },
];

const SLICES: readonly { view: string; cells: readonly string[] }[] = [
  { view: "Trends", cells: ["Pick one", "A line each", "Filter", "Over time"] },
  { view: "Compare", cells: ["Each scene", "Pick one", "Warns", "Two runs"] },
  {
    view: "Alerts",
    cells: ["Each scene", "Each setup", "Each machine", "Finds changes"],
  },
  {
    view: "Analysis: sweeps",
    cells: ["Each scene", "Varies", "One", "One run"],
  },
  {
    view: "Analysis: machines",
    cells: ["Across scenes", "Two", "Varies", "Latest"],
  },
  {
    view: "Scenes",
    cells: ["One card each", "Best of each", "All", "History"],
  },
];

const WATCHES = [
  "On NVIDIA, through nvidia-smi: GPU and memory clocks, temperature, power, utilization, the driver's slowdown reasons, and headroom under the throttle limit.",
  "On Windows, through its counters: CPU speed against nominal, how busy the machine is, the power plan, and battery or AC.",
  "From the browser: the WebGPU adapter with its features and limits, the WebGL renderer, and the software stack.",
  "It acts on some of this: it waits for the GPU to cool to within 3 °C of idle, for up to a minute, and for the CPU to go quiet, for up to 30 s. It holds a wake lock on Windows.",
  "It flags the rest: a warning if a run throttled or came within 5 °C of the limit, and a note when one engine's conditions differed, by more than 3 °C at the start, a share of 0.2 thermal slowdowns, or 10% CPU speed.",
];

const BROWSER_LIMITS = [
  "Clock speeds and power states. The browser can't set them, and Dyno only reads them, on the machines above. Timings aren't scaled by clock, because the relation isn't linear.",
  "Other work on the machine. It waits for quiet, and can't stop an update or a scan starting mid-run.",
  "Timer resolution. Chrome quantizes GPU timestamps to 100 µs unless a developer flag is set, so the runner sets it, and small passes need many draws per reading. The page's own clock is coarsened to 0.1 ms, so very small CPU numbers are upper bounds.",
  "Vsync, which hides anything under 16.7 ms. So an uncapped scenario runs in a second browser, with no frame-rate limit. Since 1.x has no GPU timer in Chromium, that's the only view of its GPU-bound cost.",
  "The network for streamed content. Philadelphia's first content ranged 1.3 to 2.7 s for 1.x alone over the live network.",
];

const RUNNER_NEEDS = [
  "Locked GPU clocks, where the driver allows it. Laptops often don't.",
  "CPU minimum and maximum processor state at 100%, in a high-performance plan.",
  'The driver\'s "prefer maximum performance", and laptop power sharing off where possible.',
  "AC power, a fixed display refresh, and updates, indexing and scans paused.",
  "A machine doing nothing else, and GPUs that shared CI doesn't have.",
];

const FUTURE: BoardStep[] = [
  {
    id: "source",
    lane: 0,
    row: 0,
    planned: true,
    title: "Source, tiler, tileset",
    body: "Each dataset records its source and how it was derived: tiler, version and settings. So a tiler change becomes a comparable run of the same source.",
  },
  {
    id: "store",
    lane: 0,
    row: 1,
    planned: true,
    title: "An asset store",
    body: "Versioned object storage with access control, a registry, and dataset cards with previews, behind today's manifest schema.",
  },
  {
    id: "catalog",
    lane: 0,
    row: 2,
    title: "Catalog and pinned datasets",
    body: "Built: scenes on datasets with hashes and licences.",
  },
  {
    id: "runners",
    lane: 1,
    row: 0,
    planned: true,
    title: "Dedicated runners",
    body: "Machines configured once, with real GPUs, running nightly and on each merge.",
  },
  {
    id: "matrix",
    lane: 1,
    row: 1,
    planned: true,
    title: "A wider matrix",
    body: "Across OS, browser, GPU vendor and driver, and device class, with native runtimes as adapters.",
  },
  {
    id: "cli",
    lane: 1,
    row: 2,
    title: "The runner today",
    body: "Built: by hand or by script, on one machine at a time.",
  },
  {
    id: "results",
    lane: 2,
    row: 0,
    planned: true,
    title: "A results store and dashboard",
    body: "A time series the whole team reads, in place of files on one machine.",
  },
  {
    id: "alerts",
    lane: 2,
    row: 1,
    title: "Change points and alerts",
    body: (
      <>
        Built: <C>cli.mjs alerts --fail-on-new</C> is ready for a nightly job.
        There isn't a nightly job yet.
      </>
    ),
  },
  {
    id: "bisect",
    lane: 2,
    row: 2,
    planned: true,
    title: "Automatic bisection",
    body: "Finds the commit, with traces attached on a regression and comments on pull requests.",
  },
  {
    id: "reports",
    lane: 2,
    row: 3,
    planned: true,
    title: "Shared public reports",
    body: "Once publishing results is cleared.",
  },
];

const ENV_RECORDED = [
  "OS version, CPU model and cores, and total memory.",
  "Browser and version, its flags, headed or headless, and viewport and device scale.",
  "The WebGPU adapter's vendor, architecture, device and description, with whether it's a fallback, its features, limits and WGSL features.",
  "The WebGL renderer string, for 1.x.",
  "Screen size, device pixel ratio, and refresh rate as measured from animation frames.",
  "On NVIDIA: driver version, top clocks, power limit, and temperature limits.",
  "On Windows: power plan, and AC or battery.",
  "Node, Playwright and Vite versions, with the engine builds.",
];

const ENV_BROWSER = [
  "The WebGPU backend, such as D3D12, Metal or Vulkan. WebGPU doesn't report it directly, and only the WebGL renderer string hints at it.",
  "Connection hints from the Network Information API. These are coarse, and network conditions are read per request instead.",
];

const ENV_OS = [
  "GPU driver version on anything but NVIDIA.",
  "Bus information: PCIe generation and width, and whether a laptop's GPU has a shared link.",
  "GPU memory type and clocks, VBIOS version, and a laptop's power-sharing state.",
  "System memory speed and channels, and the machine's model.",
  "Which display a window is on, its true refresh mode, and any HDR state.",
  "Live clocks, temperature and throttling on Apple, AMD and Intel GPUs. Apple needs administrator rights for these.",
];

const NETWORK = [
  {
    what: "Live servers, for most catalog scenes",
    state: "Built",
    badge: "api-renamed",
    means:
      "Most of the catalog's datasets stream from ion each run, from a cold cache, over whatever link the machine has. A CDN's bad moment lands in the result: Philadelphia's first content ranged 1.3 to 2.7 s for 1.x alone. A run counts requests and bytes, but the ion CDN hides per-request timing from pages (the plan's follow-up 4).",
  },
  {
    what: "Local files, for what can be redistributed",
    state: "Built",
    badge: "api-renamed",
    means:
      "Generated and sample content comes from a local store, checked by hash, with no network dependency. Today that's the fleet and the milk truck.",
  },
  {
    what: "A throttled link, in one suite",
    state: "Built",
    badge: "api-renamed",
    means: (
      <>
        <C>bench/run.mjs lod</C> and <C>lod-matrix.mjs</C> delay responses at
        Playwright's request router, as a shared 20 Mbit/s link with 80 ms
        latency and no HTTP cache. That router also sees workers, which
        Chromium's network emulation can't attach to. The tiles still come from
        the live server, so this adds a limit and doesn't remove the server's
        variation.
      </>
    ),
  },
  {
    what: "A simulated network: tiles from a local server, with shaped links",
    state: "Planned",
    badge: "goal-open",
    means:
      "Content from the local store, through a server that shapes latency, bandwidth and HTTP/2 per connection, for main threads and workers in both engines, so a result doesn't depend on a live server. Only where licences allow mirroring: Google's tiles stay live.",
  },
  {
    what: "Network profiles from real users",
    state: "Planned",
    badge: "goal-open",
    means:
      "Profiles from field data, when there is some. Until then they're synthetic: fast, and 20 Mbit/s with 80 ms.",
  },
  {
    what: "Recorded tiles, replayed",
    state: "An idea",
    badge: "goal-open",
    means:
      "A recording could bring stream-only content into the simulated network too. The plan doesn't describe it, and those licences don't allow mirroring as they stand, so this would need clearing first.",
  },
];

const COMMANDS = `# The app, on http://127.0.0.1:5190
npm run dev

# One scene in both engines, while developing
node bench/suite/cli.mjs run --scenes osm-philadelphia --engines 1.147.0,2.0 --tier quick

# Only the scenes a change can touch
node bench/suite/cli.mjs run --changed --tier standard

# Image checks, and change points. Each exits 1 when there's something to look at
node bench/suite/cli.mjs images
node bench/suite/cli.mjs alerts --fail-on-new

# The engine's own suites, against a commit so work can carry on
BENCH_COMMIT=HEAD node bench/run.mjs baseline alloc hitch
node bench/lod-matrix.mjs --links fast,slow`;

export function Dyno() {
  const fullReps = data.catalog.tiers.find((t) => t.id === "full")?.reps ?? 3;
  return (
    <Page
      title="Dyno"
      status="current"
      lede={
        <>
          Dyno is the workbench for measuring the engine, comparing it with 1.x,
          and exploring what each one does. It's a browser app and a command
          line over the same results, both local to your machine. It isn't part
          of the engine, and most of the numbers in this handbook come from it.
        </>
      }
    >
      <Section title="What it's for">
        <p>
          It's for the engineers working on 2.0. Coding agents use it too,
          through its scripts. These are the questions it answers:
        </p>
        <div
          className="table-wrap"
          tabIndex={0}
          role="group"
          aria-label="Questions Dyno answers"
        >
          <table className="seams">
            <thead>
              <tr>
                <th scope="col">The question</th>
                <th scope="col">How Dyno answers it</th>
              </tr>
            </thead>
            <tbody>
              {QUESTIONS.map((row) => (
                <tr key={row.q}>
                  <th scope="row">{row.q}</th>
                  <td>{row.a}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="How the pieces fit">
        <Figure caption="Measured views read stored results. Live views run the engines in the page, which is why their timings don't compare.">
          <Board
            label="How Dyno's pieces fit together"
            lanes={[
              "What's measured",
              "What measures it",
              "What's stored",
              "Where you read it",
            ]}
            steps={PIECES}
            edges={[
              { from: "engines", to: "runner" },
              { from: "scenes", to: "images" },
              { from: "runner", to: "results" },
              { from: "images", to: "results" },
              { from: "results", to: "readers" },
            ]}
          />
        </Figure>
      </Section>

      <Section title="What a scene is">
        <p>
          Four things make a measurement. A <strong>dataset</strong> is one
          piece of content, with its licence and hash. A <strong>scene</strong>{" "}
          places datasets on a globe with a camera path. A{" "}
          <strong>scenario</strong> says what happens: motion, cache state and
          how long to wait for it to settle. A <strong>setup</strong> is an
          engine's settings. A real scene from the catalog, and the scenario it
          usually runs:
        </p>
        <div className="dyno-pair">
          <CodeBlock
            language="json"
            code={JSON.stringify(data.catalog.example, null, 2)}
          />
          <CodeBlock
            language="json"
            code={JSON.stringify(data.catalog.exampleScenario, null, 2)}
          />
        </div>
        <p>
          So this run loads OSM Buildings on Cesium World Terrain with Bing
          imagery, orbits 180° at 1,500 m, over Philadelphia, for 15 s, from a
          cold cache, then waits up to 90 s to settle.
        </p>
        <div className="dyno-held">
          <div>
            <h3>Held the same in both engines</h3>
            <ul>
              <li>Content and camera path, as Earth-fixed poses</li>
              <li>
                A 1280 × 720 canvas, at pixel ratio{" "}
                {String(data.catalog.render.pixelRatio)}
              </li>
              <li>
                {String(data.catalog.render.msaaSamples)}× MSAA, with no FXAA,
                fog or outlines
              </li>
              <li>
                A fixed sun: elevation 40°, azimuth 150°, not the wall clock
              </li>
              <li>A screen-space error of 16 in each setup</li>
              <li>
                A fresh browser context, the same browser build and machine
              </li>
            </ul>
          </div>
          <div>
            <h3>Can't be, and how the page says so</h3>
            <ul>
              <li>
                HDR: 1.x tone-maps everything when it's on, so it's off for
                mostly unlit scenes. Mixed scenes can't match exactly.
              </li>
              <li>
                Live networks, for streamed content. Their conditions are
                recorded, so they're compared with care.
              </li>
              <li>
                What 1.x can't do at all, such as this fleet of instances. That
                engine shows as not run, and with one engine there's no verdict.
              </li>
              <li>
                Each run records what the engine really used, such as its
                buffer, MSAA and HDR, and the report flags any difference.
              </li>
            </ul>
          </div>
        </div>
        <Written
          from={
            <>
              <C>bench/suite/catalog/public.json</C>, generated into this page,
              and the overall plan, sections 16.1 and 16.3
            </>
          }
          on="2026-11-08"
        />
      </Section>

      <Section title="The space results live in">
        <p>
          A result is one point in a space. Dyno keeps its axes apart, so unlike
          things never get compared.
        </p>
        <p
          className="dyno-formula"
          aria-label="A result is a scene and scenario, times an engine, version and settings, times content and link, times environment, times repetition"
        >
          <span>Scene and scenario</span>
          <b aria-hidden="true">×</b>
          <span>Engine, version and settings</span>
          <b aria-hidden="true">×</b>
          <span>Content and link</span>
          <b aria-hidden="true">×</b>
          <span>Environment</span>
          <b aria-hidden="true">×</b>
          <span>Repetition</span>
        </p>
        <div
          className="table-wrap"
          tabIndex={0}
          role="group"
          aria-label="The axes of a result"
        >
          <table className="seams">
            <thead>
              <tr>
                <th scope="col">Axis</th>
                <th scope="col">What varies</th>
                <th scope="col">How it's kept apart</th>
                <th scope="col">How well it's sampled</th>
              </tr>
            </thead>
            <tbody>
              {axes(data.catalog.scenes, data.catalog.scenarios.length).map(
                (a) => (
                  <tr key={a.axis}>
                    <th scope="row">{a.axis}</th>
                    <td>{a.varies}</td>
                    <td>{a.kept}</td>
                    <td>
                      {a.thin ? (
                        <span className="api-badge api-changed">Thin</span>
                      ) : null}{" "}
                      {a.sampled}
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
        <p>
          It multiplies quickly. A full tier is {data.catalog.scenes} scenes × 2
          scenarios × 2 engines × {fullReps} repetitions, or{" "}
          {data.catalog.scenes * 2 * 2 * fullReps} runs. A terrain comparison of
          3 scenes, 3 engines and 3 repetitions once took 26.5 minutes. That's
          why tiers, areas, reuse and early stopping exist: most days run a
          small part of the space, chosen by what changed.
        </p>
        <p>
          <C>lod-matrix.mjs</C> is a separate, smaller grid for one question: is{" "}
          <C>Budgeted</C> better than <C>Stepwise</C>? It runs 5 pieces of
          content × a fast and a throttled link (20 Mbit/s, 80 ms) × 2 policies,
          and a cell passes when <C>Budgeted</C>'s FLIP is lower at equal or
          fewer bytes.
        </p>
        <h3>The environment, and what's recorded of it</h3>
        <p>
          The environment is a full axis of the space, but a browser sees little
          of it. Browsers hide hardware detail on purpose, to resist
          fingerprinting. <C>GPUAdapterInfo</C> gives a vendor, an architecture
          and a short description, with no driver version or bus details, and on
          some systems those are blank or generic.
        </p>
        <div className="dyno-control">
          <div>
            <h4>
              <span className="api-badge api-renamed">Built</span> Recorded with
              each run
            </h4>
            <ul>
              {ENV_RECORDED.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4>
              <span className="api-badge api-changed">Gap</span> A browser could
              see, and isn't recorded
            </h4>
            <ul>
              {ENV_BROWSER.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4>
              <span className="api-badge goal-open">Not built</span> Only the OS
              can provide
            </h4>
            <ul>
              {ENV_OS.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
            <p className="provenance">
              A dedicated runner would need a native collector for these.
            </p>
          </div>
        </div>
        <Note title="A gap in how results are keyed">
          <p>
            Recording an environment field doesn't yet mean results are kept
            apart by it. Trends, Alerts and Compare key on the GPU's description
            alone, so a driver, browser or OS update stays on the same line, as
            would another machine with the same GPU. Trends mark a hardware
            change, and a driver change gets a note only if someone adds one
            with <C>cli.mjs annotate</C>. Reusing stored runs is stricter: it
            needs the same OS, CPU, memory, browser, flags, driver, clocks and
            power.
          </p>
        </Note>
        <p>
          The link is the axis most exposed to the outside world, so{" "}
          <a
            href="#dyno-network"
            onClick={(e) => {
              e.preventDefault();
              document.getElementById("dyno-network")?.scrollIntoView();
            }}
          >
            the network
          </a>{" "}
          has its own section under methods.
        </p>
        <h3>How each view slices it</h3>
        <div
          className="table-wrap"
          tabIndex={0}
          role="group"
          aria-label="How each view slices the space"
        >
          <table className="dyno-slices">
            <thead>
              <tr>
                <th scope="col">View</th>
                <th scope="col">Scene</th>
                <th scope="col">Engine and setup</th>
                <th scope="col">Machine</th>
                <th scope="col">Runs and time</th>
              </tr>
            </thead>
            <tbody>
              {SLICES.map((row) => (
                <tr key={row.view}>
                  <th scope="row">{row.view}</th>
                  {row.cells.map((cell, i) => (
                    <td key={i}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          An alert's series is keyed by metric, scene, setup and hardware class,
          so a change on one machine can't be read as a change on another.
          Trends hide invalid runs by default.
        </p>
        <Written
          from={
            <>
              <C>bench/suite/changepoints.mjs</C>, <C>trendsModel.ts</C>,{" "}
              <C>reuse.mjs</C> and <C>bench/lod-matrix.mjs</C>
            </>
          }
          on="2026-11-08"
        />
      </Section>

      <Section title="How it's used day to day">
        <ul>
          <li>
            <strong>Engineers</strong> run a quick tier while working and a
            standard one before a commit that changes performance. Then they
            read Compare or a report, and triage Alerts. A full tier runs at
            milestones and overnight.
          </li>
          <li>
            <strong>Agents</strong> use the same runs through scripts. Every
            option is a flag, results are JSON, and failed checks exit non-zero.
            A run can state beforehand what it means to move, and{" "}
            <C>BENCH_COMMIT</C> measures a commit while work carries on in the
            tree.
          </li>
        </ul>
      </Section>

      <Section title="Each view, by its job">
        <p>
          <strong>The screenshots are sample data from a laptop</strong>, there
          to show the views. They aren't baselines or performance claims.
          They're short runs on an Apple M2 of the one catalog scene cleared for
          redistribution, and since 1.x can't draw that scene, they compare two
          2.0 settings. Baseline runs on the RTX machine come later.
        </p>
        {GROUPS.map((group) => (
          <div className="dyno-group" key={group.title}>
            <h3>{group.title}</h3>
            {group.views.map((v) => (
              <article className="dyno-view" key={v.name}>
                <div className="dyno-view-text">
                  <h4>
                    {v.name}{" "}
                    <span
                      className={`api-badge ${v.partly ? "api-changed" : "api-renamed"}`}
                    >
                      {v.partly ? "Partly built" : "Built"}
                    </span>
                  </h4>
                  <p>{v.what}</p>
                  {v.partly ? (
                    <p>
                      <strong>Partly:</strong> {v.partly}
                    </p>
                  ) : null}
                  <dl>
                    <dt>Reach for it</dt>
                    <dd>{v.when}</dd>
                    <dt>Get there</dt>
                    <dd>{v.how}</dd>
                  </dl>
                </div>
                {v.shot ? <Shot {...v.shot} /> : null}
              </article>
            ))}
          </div>
        ))}
        <Written
          from={
            <>
              <C>bench/suite/views/</C>, <C>shell.tsx</C> and{" "}
              <C>bench/suite/DESIGN.md</C>
            </>
          }
          on="2026-11-08"
        />
      </Section>

      <Section title="How it measures, and why to trust it">
        <ul>
          <li>
            <strong>Repeats.</strong> Engines alternate within each repetition,
            from a frozen production build and a fresh browser context, so drift
            spreads across them.
          </li>
          <li>
            <strong>A verdict before any number.</strong> A run is invalid if it
            failed or timed out, and valid with warnings if it throttled, the
            machine stayed busy, or the page reported errors. The reasons are
            listed.
          </li>
          <li>
            <strong>Statistics.</strong> Medians with bootstrap confidence
            intervals. A difference is reported only when the intervals
            separate. A scene stops early only when its primary metric lies
            wholly past the tolerance, after at least two repetitions. The plan
            notes that a bootstrap on so few repetitions is weak, and that a
            permutation bound would be sounder.
          </li>
          <li>
            <strong>Guardrails.</strong> A run can declare beforehand the metric
            it means to move and the ones that mustn't get worse. Its scorecard
            then passes, is marginal or fails. Image difference is a guardrail
            too, so a faster policy can't pass by drawing less.
          </li>
          <li>
            <strong>Change points.</strong> Alerts split a metric's series where
            its distribution changes, keep a split only if a permutation test
            finds it significant, and need it to be large enough to matter: 3%
            by default.
          </li>
          <li>
            <strong>Lineage.</strong> Each report records its command, commit,
            working-tree hash, catalog and dataset checksums, engine builds,
            plan and render settings. A result names a release by its version
            and a build by its branch or ref.
          </li>
        </ul>
        <h3>Controlling the machine</h3>
        <p>
          Conditions matter. One regression that seemed to reach 138 to 180 ms
          turned out to be the GPU's clock: software thermal slowdown had it
          well under half its top speed. So Dyno separates three things:
        </p>
        <div className="dyno-control">
          <div>
            <h4>
              <span className="api-badge api-renamed">Built</span> What it
              watches and detects
            </h4>
            <ul>
              {WATCHES.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
            <p className="provenance">
              On other GPUs and systems, such as an Apple laptop, the GPU and
              CPU readings aren't available, so these checks can't fire.
            </p>
          </div>
          <div>
            <h4>
              <span className="api-badge api-changed">Limit</span> What it can't
              control from a browser
            </h4>
            <ul>
              {BROWSER_LIMITS.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4>
              <span className="api-badge goal-open">Not built</span> What needs
              a dedicated runner
            </h4>
            <ul>
              {RUNNER_NEEDS.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
            <p className="provenance">
              These need administrator rights and change the machine's settings,
              so a person applies them once per machine. No dedicated runner
              exists yet.
            </p>
          </div>
        </div>
        <h3 id="dyno-network">The network</h3>
        <p>
          Today, most results depend on a live server. The plan doesn't mean to
          leave it there.
        </p>
        <div
          className="table-wrap"
          tabIndex={0}
          role="group"
          aria-label="How runs get their tiles"
        >
          <table className="seams">
            <thead>
              <tr>
                <th scope="col">How tiles arrive</th>
                <th scope="col">State</th>
                <th scope="col">What it means</th>
              </tr>
            </thead>
            <tbody>
              {NETWORK.map((row) => (
                <tr key={row.what}>
                  <th scope="row">{row.what}</th>
                  <td>
                    <span className={`api-badge ${row.badge}`}>
                      {row.state}
                    </span>
                  </td>
                  <td>{row.means}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          <strong>The RTX baseline.</strong> It's planned on the RTX 3000 Ada
          laptop used so far. That's a development laptop, not a dedicated
          runner, and nothing documents pinned clocks on it, so it has the
          watching and flagging above and not the control. The{" "}
          <a href="#/benchmarks">Benchmarks</a> tab has its commands and holds
          its place, with none recorded yet.
        </p>
        <Note title="What it can't tell you">
          <ul>
            <li>
              Anything from the Explorer or Viewer's timings against another
              engine. The Explorer's two engines share a GPU and main thread.
            </li>
            <li>
              How a machine it hasn't run on behaves, or what real users'
              networks do. It has a throttled link and live servers, not field
              data.
            </li>
            <li>
              Which of two different images is right. FLIP measures a
              difference, and 1.x isn't the reference for how light behaves or
              colours blend.
            </li>
            <li>
              1.x's GPU time where the browser doesn't expose its timer query.
              Frame time stands in.
            </li>
            <li>
              Anything about content outside its catalog, or about scenes an
              engine can't draw, which show as not run.
            </li>
          </ul>
        </Note>
        <Written
          from="the overall plan, sections 14, 16.2, 16.3, 16.9 and 16.10, and bench/run.mjs and telemetry.mjs"
          on="2026-11-08"
        />
      </Section>

      <Section title="How to run it">
        <CodeBlock language="shell" code={COMMANDS} />
        <ul>
          <li>
            <C>cli.mjs</C> writes to <C>~/.cesium-bench/results</C>, or{" "}
            <C>BENCH_RESULTS</C>, as a JSON file and a summary per run. Dyno
            serves that folder, and triage state and notes sit beside the runs.
          </li>
          <li>
            <C>bench/run.mjs</C> writes one JSON file per run to{" "}
            <C>bench/results</C>, which this handbook's Benchmarks tab reads. It
            holds {count(data.bench.runs)} runs on the machine that built this
            page.
          </li>
          <li>
            <C>lod-matrix.mjs</C> runs the quality check across content and
            links, and writes to <C>~/.cesium-bench/lod</C>.
          </li>
          <li>
            Downloaded content and 1.x builds stay in stores outside the
            repository, checked by hash. Most catalog content is streamed and
            never mirrored.
          </li>
        </ul>
      </Section>
      <Section title="Where it could go">
        <p>
          Today Dyno is a workbench that one person runs on one machine. The
          plan's later stages would make it a performance management tool for a
          whole team: content tracked from its source, machines that run on
          their own, regressions found and traced without anyone asking. These
          are ideas and plans, with nothing dated.
        </p>
        <Figure caption="Solid cards are built. Dashed cards are in the plan and aren't built.">
          <Board
            label="From today's workbench to a performance management tool"
            lanes={["Content", "Running", "Knowing"]}
            steps={FUTURE}
            edges={[
              { from: "source", to: "store", vertical: true },
              { from: "store", to: "catalog", vertical: true },
              { from: "runners", to: "matrix", vertical: true },
              { from: "matrix", to: "cli", vertical: true },
              { from: "results", to: "alerts", vertical: true },
              { from: "alerts", to: "bisect", vertical: true },
              { from: "bisect", to: "reports", vertical: true },
            ]}
          />
        </Figure>
        <ul>
          <li>
            <strong>Managing assets.</strong> The plan calls this a proper asset
            store, for later and for v3. It doesn't use the term digital asset
            manager, and it says nothing beyond storage, a registry and dataset
            cards, so treat a fuller manager as a direction, not a decision.
          </li>
          <li>
            <strong>Tiling and tiler versions.</strong> Lineage (for later)
            records how a dataset was derived, and v3 adds the tiling half:
            source, then tiler, then tileset, then runtime. Results then depend
            on a tiler version as they do on an engine version.
          </li>
          <li>
            <strong>Automation.</strong> v2 plans dedicated machines, nightly
            and per-merge runs, automatic bisection with <C>BENCH_COMMIT</C>,
            traces on regressions and comments on pull requests. Change points
            and alerts are built, and wait for something to run them on a
            schedule.
          </li>
          <li>
            <strong>Exploring.</strong> Also planned: parallel coordinates and
            parameter importance over sweeps, and hardware scaling once several
            runner machines exist.
          </li>
          <li>
            <strong>Images.</strong> Planned or deferred: image checks in CI on
            a software rasterizer, baselines on real GPUs across runners, and
            checks saved from the Explorer.
          </li>
          <li>
            <strong>A simulated network.</strong> Tiles from a local server with
            shaped links, so results don't lean on a live server. The network
            section above has what's built and what isn't.
          </li>
        </ul>
        <Written
          from="the overall plan, sections 16.2, 16.8, 16.9 and 16.10, and M5"
          on="2026-11-08"
        />
      </Section>
    </Page>
  );
}
