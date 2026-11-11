import type { ReactNode } from "react";
import { count, data, libraryEntry, referenceAdapter, size } from "./data.ts";
import { C } from "./parts.tsx";
import { SEAMS } from "./pipeline.ts";

/**
 * The design targets at the top of the Overview, with each one's evidence.
 * Words by hand, figures generated. Listed in DESIGN.md with its checked
 * date. State 1.x's side as facts about a design, where it's good say so,
 * and where there's no evidence say it's a design argument or leave it out.
 */
export type GoalState =
  "measured" | "built" | "partly" | "planned" | "target" | "idea";

const STATE_LABEL: Record<GoalState, string> = {
  measured: "Measured",
  built: "Built",
  partly: "Partly built",
  planned: "Planned",
  target: "Still a target",
  idea: "An idea",
};

/** Each state's colours, shared with the 1.x comparison's badges. */
const STATE_CLASS: Record<GoalState, string> = {
  measured: "api-same",
  built: "api-renamed",
  partly: "api-changed",
  planned: "goal-open",
  target: "goal-open",
  idea: "goal-open",
};

interface Goal {
  id: string;
  title: string;
  sentence: ReactNode;
  state: GoalState;
  /** Stressed on the page. */
  stress?: boolean;
  oneX: ReactNode;
  today: readonly (readonly [GoalState, ReactNode])[];
  tab: string;
  tabLabel: string;
}

/** Bytes allocated per tick, on the machine the benchmarks refer to. */
function allocation() {
  const row = referenceAdapter()?.alloc[0];
  const bytes = row?.bytesPerFrame;
  return typeof bytes === "number"
    ? `${count(Math.round(bytes))} bytes per tick at ${count(row!.draws as number)} draws`
    : "not recorded on this build's machine";
}

const goals = (): readonly Goal[] => [
  {
    id: "one",
    title: "One renderer for the built and natural worlds",
    sentence:
      "Design, BIM and CAD data on real terrain, under one light and one camera.",
    state: "built",
    oneX: (
      <>
        1.x has drawn 3D Tiles on a globe for years, across a wide range of
        data. Its globe and its tilesets are separate systems, each with its own
        streaming. Terrain occlusion is opt-in: <C>depthTestAgainstTerrain</C>{" "}
        is off by default, so content behind a mountain draws through it until
        an app turns it on.
      </>
    ),
    today: [
      [
        "built",
        "One streaming and selection framework for terrain and tilesets, where the globe is a tileset. Real terrain occludes like any other surface.",
      ],
      [
        "built",
        "A design model placed on terrain, in the design globe example, with buried work showing through translucent ground.",
      ],
      ["target", "Imagery draped on 3D Tiles isn't built."],
    ],
    tab: "rendering",
    tabLabel: "Rendering",
  },
  {
    id: "performance",
    title: "Performance",
    sentence:
      "Less main-thread time, fewer allocations, and less time from a tile's request to its appearance.",
    state: "measured",
    oneX: (
      <>
        Each tick, 1.x's primitives rebuild a command list and set uniforms per
        draw. WebGL 2 has no compute or render bundles, so that follows the API
        it was built on. On a matched flat-coloured workload of 5,000 draws, it
        measured 21.4 ms of CPU and 30,140 API calls per tick. One hypothesis
        wasn't shown: log depth made no difference there, because that workload
        is limited by CPU, not fill.
      </>
    ),
    today: [
      ["measured", "The same workload: at most 0.2 ms and 34 API calls."],
      [
        "measured",
        "The full scene catalog at plan revision r38: main-thread CPU 73% lower (geomean), which meets the 3× target. Time to settle 26% lower, which doesn't yet meet the 2× target. Frame p95 56% lower, bytes until settled 5% lower. That run failed two guardrails, later fixed, and the rerun of those scenes passes. These predate plan 5a.",
      ],
      [
        "measured",
        "2.0 loads more during a flight, by choice. In one tuning run from Philadelphia to Tokyo: 8.5 MB against 2.1 MB in flight, then 9.9 MB against 11.2 MB after arrival.",
      ],
      ["target", `No steady-state allocations. Today: ${allocation()}.`],
    ],
    tab: "benchmarks",
    tabLabel: "Benchmarks",
  },
  {
    id: "last",
    title: "Built to last",
    sentence:
      "New capabilities go in without another rewrite: vectors, splats, ray queries, tessellation and XR.",
    state: "partly",
    oneX: (
      <>
        This is a design argument, not a measurement. In 1.x, passes and derived
        commands multiply state and draws, so a new feature touches many paths.
        Even so, 1.x keeps absorbing new things, such as Gaussian splats, voxels
        and buffer primitives.
      </>
    ),
    today: [
      [
        "built",
        `${SEAMS.length} seams for later features, with tests that fail on a bypass. Translucent terrain went in with no new pass.`,
      ],
      ["built", "Vectors: styled point layers, up to 10 million points."],
      [
        "partly",
        "Ray queries: CPU structures and a GPU cast, with more designed.",
      ],
      [
        "target",
        "Splats and XR aren't built. B-reps are diced on the GPU, but nothing subdivides an ordinary mesh. The Tessellation tab has the detail.",
      ],
    ],
    tab: "rendering",
    tabLabel: "Rendering",
  },
  {
    id: "visual",
    title: "Visual quality",
    sentence:
      "Physically based, in linear colour, with exact translucency available and a sky built from the atmosphere. It may differ from 1.x on purpose.",
    state: "partly",
    oneX: (
      <>
        1.x is the reference the image tests compare against, after years of
        tuning, and it already has order-independent translucency and an
        atmosphere. Its HDR is off by default. Nothing here measures either as
        looking better, and 2.0's linear blending differs from it on purpose.
      </>
    ),
    today: [
      [
        "measured",
        "On the first parity scenes the image matches 1.x: mean ΔE 0.05 to 0.91, with only anti-aliased edges differing.",
      ],
      [
        "built",
        "HDR with tone mapping by default, linear shading, exact or moment-based translucency per view, and a sky built from the atmosphere.",
      ],
      [
        "target",
        "Which looks better is a judgement so far. No study has compared how the two look.",
      ],
    ],
    tab: "shading",
    tabLabel: "Shading and linker",
  },
  {
    id: "accuracy",
    title: "Accuracy you can trust and state",
    sentence:
      'Positions carry their datums and error, and "can\'t tell" is a valid answer.',
    state: "built",
    oneX: (
      <>
        1.x's math agrees with 2.0's to 10⁻¹² in the parity tests, and 2.0 uses
        it as an oracle. It doesn't attach a stated error to a position. Its
        analytic Moon is up to 0.31° and 2,051 km from DE440, sampled over 2000
        to 2050. Some height queries also miss what's drawn: on OSM Buildings,{" "}
        <C>Cesium3DTileset.getHeight</C> found no surface at 25 of 49 grid
        points that <C>Scene.sampleHeight</C> hits.
      </>
    ),
    today: [
      [
        "measured",
        "The analytic Moon: within 16″ and 27 km of DE440 over the same span.",
      ],
      [
        "built",
        <>
          Reference frames and points carry accuracy statements (
          <C>Frame.accuracy</C>, <C>pointAccuracy</C>), and queries can answer
          that they don't know yet.
        </>,
      ],
    ],
    tab: "precision",
    tabLabel: "Precision and accuracy",
  },
  {
    id: "scale",
    title: "From the solar system to a bolt",
    sentence:
      "One engine, precise across bodies in the solar system and down to engineering detail.",
    state: "partly",
    oneX: (
      <>
        1.x's ellipsoid can already be set to the Moon or Mars. Content and the
        camera share one fixed space on that body, with relative-to-eye
        rendering keeping it precise there.
      </>
    ),
    today: [
      [
        "measured",
        "Precision on the GPU: about 4 × 10⁻⁸ of the distance, so 31 µm at 1 km.",
      ],
      [
        "built",
        "The bolt end: engineering coordinates over PROJ with its grids, placing models, alignments and snapping.",
      ],
      [
        "built",
        "The Moon in the sky, with its phase, libration and map, and reference frames that reach it.",
      ],
      ["partly", "Render space, anchors and the camera chain (plan 5a)."],
      [
        "planned",
        <>
          The Moon's content in one world with the Earth's, drawn far away as an
          impostor, a visual stand-in, that hands over to its tileset (plan 5c,{" "}
          <C>docs/superpowers/plans/2026-11-07-frames-5c-second-body.md</C>).
        </>,
      ],
      [
        "planned",
        "Mars as 3D Tiles in its own reference frame. The plan names it; there's no Mars body or reference frame in the code yet. Cesium Mars, on ion, is data that exists, with testing still to come: nothing in the engine has drawn it.",
      ],
      [
        "idea",
        "Other planets as impostors. The spec gives one to any body with an appearance, but only the Moon's is planned.",
      ],
    ],
    tab: "frames",
    tabLabel: "Frame tree",
  },
  {
    id: "modular",
    title: "Modular and embeddable",
    sentence:
      "A small core with optional modules, and seams where a host application supplies its own services.",
    state: "built",
    oneX: (
      <>
        A design difference, not a measurement. 1.x keeps its widgets and core
        math in their own packages, and bundlers can leave out modules an app
        doesn't use. It has no dependency rule that keeps parts of the engine
        optional.
      </>
    ),
    today: [
      [
        "built",
        `${data.surface.entries.length} entry points. A boundary test fails on an import that breaks the dependency rule, and each host seam is an interface.`,
      ],
      ["partly", "The widgets' own entry point is under way, and not merged."],
    ],
    tab: "architecture",
    tabLabel: "System architecture",
  },
  {
    id: "small",
    title: "Small and loaded on demand",
    sentence: "You pay only for what you use, in download and data.",
    state: "measured",
    oneX: "We haven't measured 1.x's bundle on the same terms, so there's no claim to make here.",
    today: [
      [
        "measured",
        `The core loads at ${size(libraryEntry("core")?.loadKb)} (${size(libraryEntry("core")?.loadGzipKb)} gzipped), and a globe-only Viewer at ${size(data.bundles.globeOnly.main.kb)} (${size(data.bundles.globeOnly.main.gzipKb)} gzipped).`,
      ],
      [
        "built",
        `High-accuracy data loads only when asked for, and a bundle check guards that. Its verdict: ${data.bundles.globeOnly.clean ? "clean" : "failing"}.`,
      ],
    ],
    tab: "architecture",
    tabLabel: "System architecture",
  },
  {
    id: "views",
    title: "Several views, one device",
    sentence:
      "Split views, multiple canvases and offscreen views sharing one GPU device and one tile cache.",
    state: "measured",
    oneX: (
      <>
        1.x has one <C>Scene</C> and, by default, one WebGL context per viewer,
        so several views are several copies, and browsers limit live contexts.{" "}
        <C>SharedContext</C>, marked private, lets scenes share a context. Four
        views of 1,000 draws measured 11.9 ms of CPU per tick, with four scene
        copies.
      </>
    ),
    today: [
      [
        "measured",
        "The same four views: at most 0.3 ms of CPU, with one shared world.",
      ],
      ["built", "Views can link to each other and render off screen."],
    ],
    tab: "rendering",
    tabLabel: "Rendering",
  },
  {
    id: "standards",
    title: "Open standards",
    sentence: (
      <>
        3D Tiles and glTF at the centre, with proposed extensions offered back
        to the community in the open: see <a href="#/specs">Spec extensions</a>.
      </>
    ),
    state: "partly",
    stress: true,
    oneX: "Here 1.x is the reference. These standards grew up alongside it, and it supports more of their extensions than 2.0 does today.",
    today: [
      ["built", "3D Tiles and glTF are how content reaches the engine."],
      [
        "partly",
        "Extension coverage is narrower than 1.x's. The Differences tab lists it.",
      ],
      [
        "target",
        "Offering extensions back. Proposals are drafted on the Spec extensions tab, and none has been offered yet.",
      ],
    ],
    tab: "specs",
    tabLabel: "Spec extensions",
  },
  {
    id: "developer",
    title: "A better developer experience",
    sentence:
      "A typed API, errors that say what to change, loading from a bundler with no setup, and safe linked shaders.",
    state: "built",
    oneX: (
      <>
        1.x ships types generated from its docs, and a long-established API.
        Loading it from a CDN or bundler is a common struggle, with{" "}
        <C>CESIUM_BASE_URL</C> and assets to copy, and its bundled Basis
        transcoder needs <C>'unsafe-eval'</C> in workers. The plan notes that
        2.0's approach to loading could be backported to 1.x.
      </>
    ),
    today: [
      [
        "built",
        `TypeScript source, with ${count(data.surface.total)} exports in a map a test keeps current. Workers and WebAssembly are found from the module's own URL.`,
      ],
      [
        "built",
        "A shader that fails to link falls back to the engine's, with the error reported.",
      ],
      ["planned", "The API review (plan 5i), so names can still change."],
    ],
    tab: "api",
    tabLabel: "Public API",
  },
  {
    id: "proven",
    title: "Proven by measurement",
    sentence:
      "Parity against 1.x, benchmarks and image regression, so claims have numbers.",
    state: "measured",
    oneX: "1.x's own test suite and years of production use are what make it a useful oracle. The parity tests compare against it, and building 2.0 this way turned up follow-ups for 1.x, in the plan's section 14.",
    today: [
      [
        "built",
        <>
          <a href="#/dyno">Dyno</a>, the workbench that runs and reads all this.
        </>,
      ],
      [
        "built",
        `${count(data.counts.testFiles)} test files, parity suites that run both engines, and a scene catalog with verdicts and FLIP image checks. ${count(data.bench.runs)} benchmark runs are on record here.`,
      ],
      [
        "target",
        "A baseline on the RTX machine since plan 5a. The Benchmarks tab holds its place.",
      ],
    ],
    tab: "benchmarks",
    tabLabel: "Benchmarks",
  },
  {
    id: "live",
    title: "Live data at scale",
    sentence: "Moving things and time-dynamic scenes as first-class.",
    state: "partly",
    oneX: (
      <>
        1.x has the richer model today: Entities, CZML, sampled properties and
        time-dynamic imagery and point clouds are all there. Clamped points are
        re-clamped on the CPU. We have no matched measurement against 2.0 at
        scale.
      </>
    ),
    today: [
      [
        "measured",
        "Moving points in the full viewer, on an RTX laptop GPU: 100,000 at 60 fps with 1.0 ms of CPU and 3.7 ms of GPU per tick, and 1,000,000 at 60 fps with 13.1 ms of GPU.",
      ],
      ["built", "A scene clock, and clamps that track the surface."],
      [
        "target",
        "Entities, CZML, glTF animation and time-dynamic content aren't built.",
      ],
    ],
    tab: "vector",
    tabLabel: "Vector rendering",
  },
  {
    id: "machine",
    title: "Considerate of the machine",
    sentence:
      "Stays within its memory budget, sleeps when nothing changes, and shares the GPU safely.",
    state: "built",
    oneX: (
      <>
        1.x has tileset cache budgets too. It renders every tick by default.{" "}
        <C>requestRenderMode</C> is opt-in, because 1.x can't see every change
        an app makes, such as an entity property edit.
      </>
    ),
    today: [
      [
        "built",
        "On demand by default, since every change goes through engine APIs, so the loop sleeps. Tests hold this.",
      ],
      [
        "built",
        "Byte budgets for each tileset's cache, capacities that press on those budgets when full, and a replacement device when one is lost.",
      ],
      ["target", "Memory with several views, measured against one view."],
    ],
    tab: "selection",
    tabLabel: "Tile selection",
  },
];

function StateBadge({ state }: { state: GoalState }) {
  return (
    <span className={`api-badge ${STATE_CLASS[state]}`}>
      {STATE_LABEL[state]}
    </span>
  );
}

/** Each target on one line, its evidence a click away. */
export function GoalList() {
  return (
    <div className="goals">
      {goals().map((g) => (
        <details
          className={g.stress ? "goal goal-stress" : "goal"}
          key={g.id}
          id={`goal-${g.id}`}
        >
          <summary>
            <span className="goal-title">{g.title}</span>
            <span className="goal-sentence">{g.sentence}</span>
            <StateBadge state={g.state} />
          </summary>
          <div className="goal-body">
            <div>
              <h4>Where 1.x stands</h4>
              <p>{g.oneX}</p>
            </div>
            <div>
              <h4>What 2.0 has today</h4>
              <ul>
                {g.today.map(([state, text], i) => (
                  <li key={i}>
                    <StateBadge state={state} /> <span>{text}</span>
                  </li>
                ))}
              </ul>
              <p className="goal-link">
                Goes deeper: <a href={`#/${g.tab}`}>{g.tabLabel}</a>
              </p>
            </div>
          </div>
        </details>
      ))}
    </div>
  );
}
