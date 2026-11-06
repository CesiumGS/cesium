// The frames explorer (plan Task 6): the frame tree and engineering frames,
// drawn on the globe and stress-tested in the page.
//
// `run` returns its panel at once (R17) and loads afterwards: frame data on
// the main thread (the triads follow the clock every frame), and everything
// else, the stress catalog, PROJ, GEOID18, Orion and the PROJ-dependent
// overlay geometry, through the compute worker (R13, protocol.ts). One view
// store (selection.ts) is the selection the tree, the globe and the tests
// share (R14), kept in step with the example's params (R15). Every async step
// stops on `context.signal`, and everything drawn goes through `scope`.
import { createElement } from "react";
import type { CrsRef } from "../../src/engineering/crs.ts";
import type { SiteTransform } from "../../src/engineering/EngineeringFrame.ts";
import { loadFrameData } from "../../src/ephemeris/loadFrameData.ts";
import { frameTransform, type Frame } from "../../src/frames/Frame.ts";
import { createFrames, type Frames } from "../../src/frames/frames.ts";
import { eastNorthUpFrame } from "../../src/frames/local.ts";
import { Ellipsoid, fromDegrees } from "../../src/math/ellipsoid.ts";
import { earthOrientationSigma } from "../../src/measure/accuracy.ts";
import { MOON } from "../../src/scene/Body.ts";
import { Instant } from "../../src/time/Instant.ts";
import type { ExampleContext, ExampleRun } from "../types.ts";
import { composedAccuracy, type PlacedNode } from "./composed.ts";
import { RESULT_LABELS, TOUR, type TourStopSpec } from "./content.ts";
import {
  Globe,
  SECONDARY,
  behindEarth,
  familyRgba,
  hexRgba,
  type Framing,
  type LabelSpec,
  type TriadSpec,
} from "./globe.ts";
import { LoadingModel } from "./loading.ts";
import {
  overlayMesh,
  roundTripMarkers,
  triad,
  type Extent,
  type OverlayChunk,
  type Sampling,
} from "./overlays.ts";
import { latestOnly, orionLegend, orionNode, planeFraming } from "./orion.ts";
import { familyMap } from "./panel/families.ts";
import { length, radians, sig } from "./panel/format.ts";
import type {
  ClockView,
  ComposedAccuracy,
  DistortionCrs,
  EnvironmentLine,
  OrionFrame,
  OverlayId,
  OverlayView,
  PanelActions,
  Reference,
  PanelModel,
  ResultExtras,
  RunView,
  UserCrsView,
} from "./panel/model.ts";
import { Panel, type ModelSource } from "./panel/Panel.tsx";
import {
  createClient,
  type ClientWorker,
  type DataItem,
  type FrameName,
  type FrameParams,
  type OverlayGeometry,
  type RunSummary,
  type TrajectoryInfo,
} from "./protocol.ts";
import { buildReport, type ReportEnvironment } from "./report.ts";
import {
  ViewStore,
  formatParams,
  loadLinkedResult,
  parseParams,
  type Known,
  type Tab,
} from "./selection.ts";
import { GROUP_INFO, groupInfo, type Lens } from "./stress/groupInfo.ts";
import type { StressResult } from "./tests.ts";
import { buildTree, pathToRoot, type TreeNode } from "./tree.ts";
import references from "./references.json";

const DATA = "/frames-data/";
const deg = Math.PI / 180;
const WGS84 = Ellipsoid.WGS84;
const EARTH_RADIUS = 6_371_000;

/** The Artemis II flyby (R4's clock preset), and the instant the page opens at. */
const FLYBY = Date.parse("2026-04-06T23:00:00Z");
/** The OEM's span, generously: samples it doesn't cover are skipped. */
const ORION_SPAN = ["2026-04-02T02:00:00", "2026-04-11T00:00:00"] as const;

/**
 * Orion's drawing (6c): a coarse step of an hour, refined where the path
 * bends until no segment departs from it by more than 0.05% of its distance
 * from the drawing frame's origin (500 m at 1,000 km), with no interval
 * under 5 s, within 8,000 samples and 2 s of worker time.
 */
const ORION_STEP = 3600;
const ORION_ADAPTIVE = {
  tolerance: 5e-4,
  minStep: 5,
  floor: 100,
  maxSamples: 8000,
  budgetMs: 2000,
} as const;

/** US survey feet per metre: EPSG:6420 is in ftUS. */
const FT = 3937 / 1200;
const CALIFORNIA: CrsRef = { format: "wkid", authority: "EPSG", wkid: 6420 };
/** The design grid: ±90 km about the central meridian (120.5°W), 37.0° to 38.7°N, 10 km lines. */
const GRID_EXTENT: Extent = {
  min: [1_910_000 * FT, 560_000 * FT],
  max: [2_090_000 * FT, 740_000 * FT],
};
const GRID_STEP = 10_000 * FT;
/** The catalog's California site (stress/shared.ts SITE_ORIGIN), θ = 12.5°, s = 1.0000375. */
const SITE: SiteTransform = {
  origin: [6_000_000, 2_100_000, 0],
  rotation: 12.5 * deg,
  scale: 1.0000375,
};
/** F32: the true-north lines' convergence, drawn this many times while not at true scale. */
const CONVERGENCE_FACTOR = 20;
/** S-C1: the rigid line's separation from the exact one, drawn this many times while not at true scale. */
const SAG_FACTOR = 50;

/** Ashby and Patla (2024)'s published lunar clock rate, as references.json quotes it. */
const LUNAR_RATE = (
  references.entries as unknown as Record<string, { rate?: string }>
)["ashby-patla-2024"]!.rate!.replace("μs", "µs");

const SACRAMENTO = fromDegrees(-121.4944, 38.5816, 0);
const LUNAR_SITE = fromDegrees(0, -89.5, 0);

const ITEM_NAME: Record<DataItem, string> = {
  frames: "frame data",
  proj: "PROJ",
  geoid: "GEOID18",
  orion: "Orion's OEM",
};

const OVERLAY_LABEL: Record<OverlayId, [label: string, short: string]> = {
  triads: ["Triads", "Triads"],
  designGrid: ["California design grid, with true north", "Design grid"],
  siteGrid: ["Site grid (θ = 12.5°, s = 1.0000375)", "Site grid"],
  rigidVsExact: ["Rigid and exact 20 km line", "Rigid vs exact"],
  roundTrip: ["Round-trip markers from the last run", "Round trips"],
  orion: ["Orion's path", "Orion"],
  distortion: ["Distortion", "Distortion"],
  bias: ["Frame bias exaggeration", "Frame bias"],
};
const OVERLAYS = Object.keys(OVERLAY_LABEL) as OverlayId[];

/** The data an overlay waits for (R9). */
const OVERLAY_NEEDS: Partial<Record<OverlayId, DataItem>> = {
  designGrid: "proj",
  siteGrid: "proj",
  rigidVsExact: "proj",
  distortion: "proj",
  orion: "orion",
};

const DRAW_IN: Record<OrionFrame, FrameName> = {
  GCRF: "gcrf",
  ITRF: "itrf",
  MOON_ME: "moonMe",
};

const DISTORTION: Record<
  DistortionCrs,
  {
    crs: CrsRef;
    extent: Extent;
    step: number;
    radius: number;
    height?: number;
    look: [lon: number, lat: number, range: number];
  }
> = {
  "6420": {
    crs: CALIFORNIA,
    extent: GRID_EXTENT,
    step: 30_000 * FT,
    radius: 4000,
    look: [-120.5, 37.8, 400_000],
  },
  "32610": {
    crs: { format: "wkid", authority: "EPSG", wkid: 32610 },
    extent: { min: [200_000, 3_600_000], max: [800_000, 4_600_000] },
    step: 100_000,
    radius: 15_000,
    look: [-123, 37, 1_600_000],
  },
  "3857": {
    crs: { format: "wkid", authority: "EPSG", wkid: 3857 },
    extent: { min: [-14_500_000, 0], max: [-12_500_000, 11_000_000] },
    step: 1_000_000,
    radius: 120_000,
    look: [-125, 40, 12_000_000],
  },
  ldp: {
    crs: { format: "wkid", authority: "EPSG", wkid: 6854 },
    extent: { min: [70_000, 20_000], max: [130_000, 80_000] },
    step: 5000,
    radius: 1000,
    height: 13,
    look: [-122.75, 45.5, 90_000],
  },
};

interface OverlayState {
  on: boolean;
  state: OverlayView["state"];
  problem?: string;
  accuracy?: string;
  /** What the figure means (S-I7); the default detail otherwise. */
  detail?: string;
  caution?: boolean;
  unbounded?: boolean;
  /** Bumped per request, so a late answer for an old one is dropped. */
  token: number;
}

const IDENTITY = Float64Array.from([
  1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1,
]);

/** a × b, column-major 4×4 (float64). */
function compose(a: ArrayLike<number>, b: ArrayLike<number>): Float64Array {
  const out = new Float64Array(16);
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) {
        sum += a[k * 4 + r]! * b[c * 4 + k]!;
      }
      out[c * 4 + r] = sum;
    }
  }
  return out;
}

/** An origin farther than this from the geocentre is off the scene (the barycentre, the Sun), m. */
const FAR_ORIGIN = 1e10;
/** The walk's stub toward an off-scene origin, m (past the Moon). */
const WALK_STUB = 5e8;
const AU = 1.495978707e11;

/** Meters as the panel writes them (SI prefixes, powers of ten written out). */
const meters = (x: number): string => length(x, 3);

const messageOf = (e: unknown): string =>
  e instanceof Error ? e.message : String(e);
const isAbort = (e: unknown): boolean =>
  e instanceof DOMException && e.name === "AbortError";

export function run(context: ExampleContext): ExampleRun {
  const { viewer, scope, signal, params } = context;
  const token = context.accessToken;
  /** The token never enters a message the page shows (R18). */
  const scrub = (text: string): string =>
    token !== undefined && token.length >= 8
      ? text.split(token).join("[redacted]")
      : text;

  // The HUD host over the canvas: the legend, tour captions and labels (R17).
  const hud = document.createElement("div");
  hud.className = "fx-hud-host";
  viewer.container.append(hud);
  scope.defer(() => hud.remove());

  const globe = new Globe(viewer, scope, hud);
  const loading = new LoadingModel();
  // Items left fetching when the example is left go back to idle: the
  // stopped client sends no final state (Task 4's deferred note).
  scope.defer(() => loading.reset());
  const view = new ViewStore();
  const initial = parseParams(params, { tours: TOUR.map((s) => s.id) });
  view.apply(initial);

  // ----------------------------------------------------------- the worker
  const worker = new Worker(new URL("./worker.ts", import.meta.url), {
    type: "module",
  });
  const client = createClient(worker as unknown as ClientWorker, signal);
  client.onProgress((reply) => {
    // Frame data's indicator is the main thread's own load; the worker's
    // second fetch (from the HTTP cache) shows only when it fails.
    if (
      reply.item === "frames" &&
      !(
        reply.type === "state" &&
        (reply.state === "missing" || reply.state === "error")
      )
    ) {
      return;
    }
    loading.reply(reply);
  });

  // ------------------------------------------------------------ page state
  let frames: Frames | undefined;
  let manifest:
    | {
        span?: readonly number[];
        files: readonly {
          file: string;
          role?: string;
          sha256: string;
          sourceUrl?: string;
        }[];
      }
    | undefined;
  let tree: TreeNode | undefined;
  let treeNote: string | undefined =
    "The frame tree draws once frame data is in.";
  let composed: ComposedAccuracy = { ITRF: {}, GCRF: {}, ICRF: {} };
  let local: Frame[] = [];
  /** The engineering frame the worker placed (known from its operation), for the tree. */
  let engineering: { node: TreeNode; placed: PlacedNode } | undefined;
  let results: StressResult[] = [];
  let userResults: StressResult[] = [];
  let runView: RunView = { state: "idle", done: 0, total: 0 };
  /** The run going on, settled either way (runs go one at a time). */
  let running: Promise<void> = Promise.resolve();
  /** The deep-linked result being loaded (`loadLinkedResult`). */
  let linking: string | undefined;
  /** A message for the panel's snackbar (a deep link that didn't resolve). */
  let notice: { id: number; text: string } | undefined;
  let lastRun: { startedAt: string; summary: RunSummary } | undefined;
  let userCrs: UserCrsView =
    initial.imodel !== undefined
      ? { state: "idle", id: initial.imodel }
      : { state: "idle" };
  let orionFrame: OrionFrame = "GCRF";
  /** Orion's node and statements from the worker (one reply), and the clock time they're for. */
  let orionInfo: { info: TrajectoryInfo; utc: number } | undefined;
  /** The last statement request's failure, and the clock time it was for; cleared by the next success. */
  let orionInfoError: { message: string; utc: number } | undefined;
  /** Orion's drawn path: the frame it's in, the instant it was placed at (TDB) and the inverse of that placement. */
  let orionBuilt:
    | {
        frame: OrionFrame;
        at: number;
        inverse: Float64Array;
        sampling?: Sampling;
        chunks: readonly OverlayChunk[];
      }
    | undefined;
  let distortionCrs: DistortionCrs = "6420";
  let distortionHeight = 0;
  let biasFactor = 1e6;
  let trueScale = false;
  let sagTrueScale = false;
  /** The rigid and exact lines' far ends as drawn, for stop 4's camera. */
  let rigidEnds: { exact: Float64Array; rigid: Float64Array } | undefined;
  const overlays = new Map<OverlayId, OverlayState>(
    OVERLAYS.map((id) => [
      id,
      {
        on: id === "triads",
        state: id === "triads" ? "drawn" : "off",
        token: 0,
      },
    ]),
  );
  /** Overlay labels on the globe (the sag, the convergence, contour values). */
  const overlayLabels = new Map<OverlayId | "callouts" | "walk", LabelSpec[]>();
  let disposed = false;
  scope.defer(() => {
    disposed = true;
  });

  // -------------------------------------------------------- the model
  let model: PanelModel | undefined;
  const listeners = new Set<() => void>();
  let notifyQueued = 0;
  /** The model is stale: rebuilt on the next read, listeners told once per frame (R13: a run streams 225 results). */
  const invalidate = () => {
    model = undefined;
    if (notifyQueued === 0 && !disposed) {
      notifyQueued = requestAnimationFrame(() => {
        notifyQueued = 0;
        for (const l of [...listeners]) {
          l();
        }
      });
    }
  };
  scope.defer(() => cancelAnimationFrame(notifyQueued));
  loading.subscribe(invalidate);
  const source: ModelSource = {
    subscribe: (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    get: () => (model ??= buildModel()),
  };

  const instantNow = (): Instant | undefined =>
    frames
      ? Instant.fromUtc(viewer.clock.time, frames.data.leapSeconds)
      : undefined;

  function clockView(): ClockView {
    const utc = new Date(viewer.clock.time)
      .toISOString()
      .replace(/\.\d+Z$/, "Z");
    const instant = instantNow();
    if (!frames || !instant) {
      return { utc, eop: { kind: "measured" } };
    }
    const sigma = earthOrientationSigma(frames, instant);
    return {
      utc,
      eop: sigma.degraded
        ? { kind: "outside", span: sigma.span }
        : sigma.predicted
          ? { kind: "predicted", ageDays: sigma.ageDays }
          : { kind: "measured" },
    };
  }

  /** The triads' line in the legend: GCRF against ITRF, the edge's own figure (R8). */
  function triadsAccuracy(): Pick<
    OverlayView,
    "accuracy" | "detail" | "unbounded"
  > {
    const itrf = tree && findNode(tree, "ITRF");
    const a = itrf?.edge.accuracy;
    if (a?.radians !== undefined) {
      // One line (S-I7): the figure and its one qualifier, "measured Earth
      // orientation" or "predicted Earth orientation, N days".
      const qualifier = a.note.split(/ \(|\. /)[0]!;
      return {
        accuracy: `±${radians(a.radians)} (1σ), ${qualifier}`,
        detail: `The axes of GCRF against ITRF: ${a.note}.`,
      };
    }
    return {
      accuracy: a ? `not bounded: ${a.note}` : "waiting for frame data",
      ...(a && { detail: `The axes of GCRF against ITRF: ${a.note}.` }),
      unbounded: a !== undefined,
    };
  }

  /** Orion's legend line (R8): computed from the worker's statement at the clock's instant. */
  function orionAccuracy(): Pick<
    OverlayView,
    "accuracy" | "detail" | "drawing" | "caution" | "unbounded"
  > {
    if (orionInfo === undefined && loading.get("orion").state !== "ready") {
      return { accuracy: defaultAccuracy("orion") };
    }
    const l = orionLegend(orionInfo?.info.composed.ITRF, {
      drawIn: orionBuilt?.frame ?? orionFrame,
      utc: new Date(
        orionInfoError?.utc ?? orionInfo?.utc ?? viewer.clock.time,
      ).toISOString(),
      ...(orionBuilt?.sampling && { sampling: orionBuilt.sampling }),
      ...(orionInfoError && { error: orionInfoError.message }),
    });
    return {
      accuracy: l.accuracy,
      detail: l.detail,
      ...(l.drawing !== undefined && { drawing: l.drawing }),
      ...(l.caution && { caution: true }),
      ...(l.unbounded && { unbounded: true }),
    };
  }

  function overlayViews(): OverlayView[] {
    return OVERLAYS.map((id) => {
      const s = overlays.get(id)!;
      const [label, short] = OVERLAY_LABEL[id];
      const need = OVERLAY_NEEDS[id];
      const base: OverlayView = {
        id,
        label,
        short,
        on: s.on,
        state: s.on ? s.state : "off",
        accuracy: s.accuracy ?? defaultAccuracy(id),
        ...((s.detail ?? defaultDetail(id)) !== undefined && {
          detail: s.detail ?? defaultDetail(id)!,
        }),
        ...(need !== undefined && { waitingFor: need }),
        ...(s.problem !== undefined && { problem: s.problem }),
        ...(s.caution && { caution: true }),
        ...(s.unbounded && { unbounded: true }),
      };
      if (id === "triads") {
        Object.assign(base, triadsAccuracy());
      }
      if (id === "orion") {
        Object.assign(base, orionAccuracy());
      }
      // An item the store doesn't have disables its toggles (R5).
      const item = need && loading.get(need);
      if (item?.state === "missing" && s.state !== "drawn") {
        base.state = "missing";
        base.problem = `${ITEM_NAME[need!]} isn't in the frames store: run npm run setup in packages/next, then reload.`;
      }
      return base;
    });
  }

  /** An overlay's one line before it draws (S-I7: the figure it will carry, briefly). */
  function defaultAccuracy(id: OverlayId): string {
    switch (id) {
      case "designGrid":
      case "siteGrid":
        return "the recorded PROJ operation's accuracy, once PROJ loads";
      case "rigidVsExact":
        return "the sag at 20 km, exact geometry";
      case "roundTrip":
        return "run the tests to place the markers";
      case "orion":
        return "Orion's 1σ at the clock's instant, once its OEM loads";
      case "distortion":
        return "contours from PROJ's scale factors";
      case "bias":
        return `exact by definition; drawn ×${sig(biasFactor, 1)}`;
      default:
        return "";
    }
  }

  /** What an overlay's figure means, behind "About this figure" (S-I7). */
  function defaultDetail(id: OverlayId): string | undefined {
    switch (id) {
      case "designGrid":
        return `The 10 km grid lines placed through the recorded PROJ operation to WGS 84; true north ${trueScale ? "at true scale" : `with its convergence drawn ×${CONVERGENCE_FACTOR}`}. The 2 km lines appear below 60 km.`;
      case "siteGrid":
        return "The site grid through the same operation; the site formula (rotation and scale) is exact to 1 nm.";
      case "rigidVsExact":
        return `A 20 km design line placed rigidly (dashed) against the exact one (solid); ${sagTrueScale ? "drawn at true scale" : `their separation drawn ×${SAG_FACTOR}`}, the leader labelled with the true sag.`;
      case "distortion":
        return "Tissot ellipses in true-north axes (convergence not applied); combined-factor contours from PROJ's factors, in ppm.";
      case "bias":
        return "The frame bias, 23 mas between EME2000 and GCRF: exact by definition (IAU 2006 adopted constants), drawn exaggerated so it shows.";
      default:
        return undefined;
    }
  }

  function extrasOf(r: StressResult): ResultExtras {
    const g = groupInfo(r.group);
    const label = RESULT_LABELS[r.id];
    return {
      ...(label !== undefined && { label }),
      ...(r.accuracyNote !== undefined && { accuracyNote: r.accuracyNote }),
      compared:
        r.expectedError !== undefined
          ? { kind: "error", text: `An error matching /${r.expectedError}/.` }
          : (g?.compared ?? {
              kind: "independent",
              text: "The case's own check.",
            }),
      ...(r.trace !== undefined && { trace: r.trace }),
      ...(r.source !== undefined && { source: r.source }),
      ...(r.group === "measurement" &&
        r.accuracy?.meters !== undefined && {
          relative: `The site's absolute placement is ±${meters(r.accuracy.meters)} (1σ); this check measures a distance, which that placement doesn't affect.`,
        }),
    };
  }

  /** Groups waiting for an item (R9): a need still loading, or not yet tried while a run goes on. */
  function waiting(): Record<string, DataItem> {
    const out: Record<string, DataItem> = {};
    for (const g of GROUP_INFO) {
      for (const need of g.needs) {
        const s = loading.get(need).state;
        const pending =
          s === "fetching" || (runView.state === "running" && s === "idle");
        const has = results.some((r) => r.group === g.id);
        if (pending && !has) {
          out[g.id] = need;
          break;
        }
      }
    }
    return out;
  }

  function environmentLines(): EnvironmentLine[] {
    const env = reportEnvironment();
    return [
      [
        "Run",
        lastRun
          ? `${env.startedAt.replace("T", " ").replace(/\.\d+Z$/, " UTC")}, ${(env.durationMs / 1000).toFixed(1)} s`
          : "not run yet",
      ],
      ["Package", env.packageVersion],
      ["PROJ", env.proj ?? "not loaded"],
      ...env.files.map((f): EnvironmentLine => [
        f.label,
        `${f.file}${f.sha256 ? `, sha256 ${f.sha256.slice(0, 12)}…` : f.note ? ` (${f.note})` : ""}`,
      ]),
      ...(env.frameDataSpan
        ? [["Frame data span", env.frameDataSpan] as EnvironmentLine]
        : []),
      ["Browser", env.userAgent],
    ];
  }

  function buildModel(): PanelModel {
    const all = [...results, ...userResults];
    const extras: Record<string, ResultExtras> = {};
    for (const r of all) {
      extras[r.id] = extrasOf(r);
    }
    return {
      items: loading.items,
      ...(tree ? { tree } : {}),
      ...(treeNote !== undefined && { treeNote }),
      composed,
      clock: clockView(),
      overlays: overlayViews(),
      orionFrame,
      distortionCrs,
      distortionHeight,
      biasFactor,
      trueScale,
      convergenceFactor: CONVERGENCE_FACTOR,
      sagTrueScale,
      sagFactor: SAG_FACTOR,
      triadScale:
        "triads drawn at 6% of the camera's distance, 2 m to 2,000 km; ITRF and GCRF at 1.5 Earth radii",
      groups: GROUP_INFO,
      results: all,
      extras,
      waiting: waiting(),
      run: runView,
      token: token !== undefined ? "available" : undefined,
      userCrs,
      exampleWkt2: (
        references.entries as unknown as Record<string, { wkt2?: string }>
      )["input-wkt2-tokyo-jprcs-ix"]!.wkt2!,
      tour: TOUR,
      environment: environmentLines(),
      ...(notice !== undefined && { notice }),
    };
  }

  // ------------------------------------------------------------ the tree
  function findNode(root: TreeNode, id: string): TreeNode | undefined {
    if (root.id === id) {
      return root;
    }
    for (const c of root.children) {
      const f = findNode(c, id);
      if (f) {
        return f;
      }
    }
    return undefined;
  }

  /** The tree and the walk's statements at the clock's instant. */
  function rebuildTree(): void {
    const instant = instantNow();
    if (!frames || !instant) {
      return;
    }
    const t = buildTree(frames, { local }, instant);
    if (engineering) {
      findNode(t, "ITRF")?.children.push(engineering.node);
    }
    // Orion, from the worker's reply: under its reference, with the
    // statements that came with it (the main thread has no trajectory).
    const placedOrion = orionNode(
      orionInfo?.info,
      orionInfoError?.message,
      new Date(orionInfoError?.utc ?? viewer.clock.time).toISOString(),
    );
    if (placedOrion) {
      findNode(t, placedOrion.parent)?.children.push({
        ...placedOrion.node,
        children: [],
      });
    }
    // Its statements only while they're current (not after a failure).
    const orion = orionInfoError === undefined ? orionInfo?.info : undefined;
    tree = t;
    treeNote = undefined;
    const placed = new Map<string, PlacedNode>(
      engineering ? [[engineering.node.id, engineering.placed]] : [],
    );
    const own = composedAccuracy(t, frames, instant, placed);
    composed = orion
      ? (Object.fromEntries(
          (Object.keys(own) as Reference[]).map((r) => [
            r,
            { ...own[r], [orion.node.id]: orion.composed[r] },
          ]),
        ) as ComposedAccuracy)
      : own;
    updateKnown();
    invalidate();
  }

  function treeIds(): Set<string> {
    const out = new Set<string>();
    const walk = (n: TreeNode) => {
      out.add(n.id);
      n.children.forEach(walk);
    };
    if (tree) {
      walk(tree);
    }
    return out;
  }

  function updateKnown(): void {
    const repro = groupInfo("reproducibility")!.lenses;
    const lensesOf = new Map<string, readonly Lens[]>();
    for (const r of [...results, ...userResults]) {
      const own = groupInfo(r.group)?.lenses ?? [];
      lensesOf.set(
        r.id,
        r.fingerprint ? [...new Set([...own, ...repro])] : own,
      );
    }
    // The groups that have run: a result of another group (a deep link
    // after a group's own run) is kept until its group runs (R15).
    const ran = new Set(results.map((r) => r.group));
    const known: Known = {
      ...(tree && { frames: treeIds() }),
      ...(lastRun !== undefined && { results: lensesOf, ran }),
      tours: TOUR.map((s) => s.id),
    };
    view.setKnown(known);
  }

  // --------------------------------------------------------------- triads
  const familyOf = (id: string) => (tree && familyMap(tree).get(id)) ?? "earth";

  function triadSpecs(): TriadSpec[] {
    if (!frames || !overlays.get("triads")!.on) {
      return [];
    }
    const byName = new Map<string, Frame>();
    for (const f of [
      frames.icrf,
      frames.hcrs,
      frames.gcrf,
      frames.earthIcrf,
      frames.eme2000,
      frames.moonIcrf,
      frames.itrf,
      frames.moonMe,
      frames.moonPa,
      ...local,
    ]) {
      byName.set(f.name, f);
    }
    const ids = new Set([
      "ITRF",
      "GCRF",
      "Sacramento ENU",
      "Lunar south-pole site",
    ]);
    const s = view.get().selection;
    if (s.kind === "frame" && tree) {
      for (const n of pathToRoot(tree, s.id)) {
        ids.add(n.id);
      }
    }
    for (const id of emphasisFrames()) {
      ids.add(id);
    }
    const out: TriadSpec[] = [];
    for (const id of ids) {
      const frame = byName.get(id);
      if (frame === undefined || id === "ICRF" || id === "HCRS") {
        // The barycentre's and the Sun's origins are far off the scene.
        continue;
      }
      const geocentric = id === "ITRF" || id === "GCRF" || id === "EME2000";
      const length = 1.5 * EARTH_RADIUS;
      out.push({
        id,
        label: id,
        frame,
        family: familyOf(id),
        // Geocentric: from the surface out, no cube inside the Earth (S-I2);
        // GCRF at the secondary strength beside ITRF's (S-I1).
        ...(geocentric && {
          length,
          surface: [
            WGS84.radii[0]! / length,
            WGS84.radii[1]! / length,
            WGS84.radii[2]! / length,
          ] as const,
        }),
        ...(id === "GCRF" && { strength: SECONDARY }),
        // Stop 6's subject at 15% of the camera's distance (S-I8).
        ...(id === "Lunar south-pole site" &&
          tourStop === "lunar-time" && { scale: 0.15 }),
      });
    }
    return out;
  }

  function refreshTriads(): void {
    const specs = triadSpecs();
    globe.setTriads(specs);
    const labels: LabelSpec[] = specs.map((t) => ({
      id: t.id,
      text: t.label,
      family: t.family,
      // The selected frame first, then the geocentric frames over sites (S-I1).
      priority: t.id === selectedFrame() ? 3 : t.length !== undefined ? 2 : 1,
      at: () => {
        const o = globe.triadOrigin(t.id);
        if (o === undefined) {
          return undefined;
        }
        // Geocentric triads are labelled on an axis, off the globe: x's,
        // or the first in front of the Earth (S-I1: ITRF's x often points
        // away, which hid its label).
        if (t.length === undefined || !frames) {
          return o;
        }
        const eye = viewer.view.camera.position;
        let first: Float64Array | undefined;
        for (const axis of [0, 1, 2]) {
          // Just outside the surface (0.78 of the shaft, 1.17 R), so a tip
          // past the view's edge doesn't take the label with it.
          const tip = axisTip(t.frame, 0.78 * t.length, axis);
          first ??= tip;
          if (tip && !behindEarth(eye, tip)) {
            return tip;
          }
        }
        return first;
      },
    }));
    globe.setLabels([...labels, ...[...overlayLabels.values()].flat()]);
  }

  function axisTip(
    frame: Frame,
    length: number,
    axis = 0,
  ): Float64Array | undefined {
    const instant = instantNow();
    if (!frames || !instant) {
      return undefined;
    }
    const m = frameTransform(frame, frames.itrf, instant);
    const c = 4 * axis;
    return Float64Array.from([
      m[12]! + m[c]! * length,
      m[13]! + m[c + 1]! * length,
      m[14]! + m[c + 2]! * length,
    ]);
  }

  const selectedFrame = () => {
    const s = view.get().selection;
    return s.kind === "frame" ? s.id : undefined;
  };

  // ------------------------------------------------------------- overlays
  const frameParams = (
    crs: CrsRef,
    name: string,
    site?: SiteTransform,
  ): FrameParams => ({
    name,
    body: "earth",
    crs,
    ...(site && { site }),
  });

  /** Asks the worker for an overlay, showing it waiting until it draws (R9). */
  async function request(
    id: OverlayId,
    build: () => Promise<{
      layers: Parameters<Globe["setOverlay"]>[1];
      accuracy: string;
      detail?: string;
      caution?: boolean;
      labels?: LabelSpec[];
    }>,
  ): Promise<void> {
    const s = overlays.get(id)!;
    const token = ++s.token;
    s.state = "waiting";
    delete s.problem;
    invalidate();
    try {
      const built = await build();
      if (token !== s.token || !s.on || disposed) {
        return;
      }
      globe.setOverlay(id, built.layers);
      s.state = "drawn";
      s.accuracy = built.accuracy;
      if (built.detail !== undefined) {
        s.detail = built.detail;
      } else {
        delete s.detail;
      }
      s.caution = built.caution === true;
      overlayLabels.set(id, built.labels ?? []);
      refreshTriads();
    } catch (error) {
      if (isAbort(error) || token !== s.token || disposed) {
        return;
      }
      const need = OVERLAY_NEEDS[id];
      const item = need && loading.get(need);
      s.state = item?.state === "missing" ? "missing" : "error";
      s.problem =
        item?.state === "missing"
          ? `${ITEM_NAME[need!]} isn't in the frames store: run npm run setup in packages/next, then reload.`
          : `It didn't draw: ${scrub(messageOf(error))}`;
    }
    invalidate();
  }

  /** The recorded operation's accuracy: one line, and its sentence for the detail. */
  const operationText = (
    g: OverlayGeometry,
  ): { text: string; sentence: string; caution: boolean } => {
    const op = g.operation;
    const grids =
      op && op.grids.length > 0 ? ` (grids: ${op.grids.join(", ")})` : "";
    if (!op) {
      return { text: "", sentence: "", caution: false };
    }
    if (op.ballpark || op.accuracy === undefined) {
      return {
        text: "not bounded: PROJ states no accuracy",
        sentence: `PROJ states no accuracy for the recorded operation${op.ballpark ? ", a ballpark operation" : ""}${grids}.`,
        caution: true,
      };
    }
    if (op.accuracy === 0) {
      return {
        text: "exact, a conversion",
        sentence: "The operation is a conversion, with no datum change.",
        caution: false,
      };
    }
    return {
      text: `±${meters(op.accuracy)} (1σ), the recorded operation`,
      sentence: `±${meters(op.accuracy)} (1σ): PROJ's stated accuracy for the recorded operation to WGS 84${grids}.`,
      caution: false,
    };
  };

  /** The first chunk's first vertex, Earth-fixed: where to hang a label. */
  const pointOf = (
    chunks: readonly OverlayChunk[],
    last = false,
  ): Float64Array | undefined => {
    const c = last ? chunks.at(-1) : chunks[0];
    if (!c) {
      return undefined;
    }
    const p = c.mesh.positions;
    const i = last ? p.length - 3 : 0;
    return Float64Array.from([
      c.origin[0]! + p[i]!,
      c.origin[1]! + p[i + 1]!,
      c.origin[2]! + p[i + 2]!,
    ]);
  };

  function noteEngineering(
    g: OverlayGeometry,
    center: ArrayLike<number>,
  ): void {
    if (engineering || !g.operation) {
      return;
    }
    const op = g.operation;
    const known = !op.ballpark && op.accuracy !== undefined;
    engineering = {
      node: {
        id: "engineering:California zone 3",
        label: "California zone 3",
        edge: {
          kind: "proj-operation",
          detail: op.pipeline,
          accuracy: known
            ? {
                meters: op.accuracy!,
                note: "PROJ's stated accuracy for the recorded operation",
              }
            : { note: "PROJ states no accuracy for the recorded operation" },
        },
        children: [],
      },
      placed: {
        itrf: center,
        projection: {
          source: "projection",
          meters: known ? op.accuracy : undefined,
          note: `engineering frame "California zone 3": PROJ operation (${op.grids.join(", ") || "no grids"})`,
        },
      },
    };
    rebuildTree();
  }

  function drawOverlay(id: OverlayId): void {
    const s = overlays.get(id)!;
    if (!s.on) {
      s.token++;
      if (id === "orion") {
        orionBuild.drop();
        orionBuilt = undefined;
        s.state = "off";
        refreshCallouts();
      }
      if (id === "designGrid") {
        globe.removeOverlay(`${id}:minor`);
        minorGrid = undefined;
      }
      globe.removeOverlay(id);
      overlayLabels.delete(id);
      s.state = "off";
      refreshTriads();
      invalidate();
      return;
    }
    const engineeringColor = familyRgba("engineering");
    switch (id) {
      case "triads":
        s.state = "drawn";
        refreshTriads();
        invalidate();
        return;
      case "designGrid":
        void request(id, async () => {
          const frame = frameParams(CALIFORNIA, "California zone 3");
          // The 2 km lines, shown only under 60 km range (DESIGN.md "The
          // tour", stop 3), built after the major ones and drawn apart.
          const minorToken = s.token;
          void client
            .overlay("designGrid", {
              frame,
              extent: GRID_EXTENT,
              step: GRID_STEP / 5,
              segment: 2000 * FT,
              skipEvery: 5,
            })
            .then((minor) => {
              if (minorToken !== s.token || !s.on || disposed) {
                return;
              }
              const chunks = minor.layers[0]!.chunks;
              globe.setOverlay(`${id}:minor`, [
                { chunks, color: engineeringColor, strength: SECONDARY },
              ]);
              minorGrid = chunks.map((c) => c.origin);
              updateMinorGrid();
            })
            .catch(() => {
              // The major lines say what failed; the minor ones just don't show.
            });
          const [grid, north] = await Promise.all([
            client.overlay("designGrid", {
              frame,
              extent: GRID_EXTENT,
              step: GRID_STEP,
              segment: 1000 * FT,
            }),
            client.overlay("trueNorthLines", {
              frame,
              extent: GRID_EXTENT,
              step: GRID_STEP,
              segment: 2000 * FT,
              ...(!trueScale && { exaggeration: CONVERGENCE_FACTOR }),
            }),
          ]);
          const op = operationText(grid);
          const center = pointOf(grid.layers[0]!.chunks) ?? new Float64Array(3);
          noteEngineering(grid, center);
          const west = pointOf(north.layers[0]!.chunks, true);
          return {
            layers: [
              { chunks: grid.layers[0]!.chunks, color: engineeringColor },
              {
                chunks: north.layers[0]!.chunks,
                color: familyRgba("earth"),
                strength: SECONDARY,
                dashed: true,
              },
            ],
            accuracy: op.text,
            detail: `${op.sentence} True north ${trueScale ? "at true scale" : `with its convergence drawn ×${CONVERGENCE_FACTOR}`}. The 2 km lines appear below 60 km.`,
            caution: op.caution,
            labels: west
              ? [
                  {
                    id: "label:true-north",
                    text: trueScale
                      ? "true north"
                      : `true north, convergence ×${CONVERGENCE_FACTOR}`,
                    at: west,
                    priority: 2,
                  },
                ]
              : [],
          };
        });
        return;
      case "siteGrid":
        void request(id, async () => {
          const half = 10_000 * FT;
          const g = await client.overlay("designGrid", {
            frame: frameParams(CALIFORNIA, "California zone 3 site", SITE),
            extent: { min: [-half, -half], max: [half, half] },
            step: 2000 * FT,
            segment: 100 * FT,
          });
          const op = operationText(g);
          return {
            layers: [
              {
                chunks: g.layers[0]!.chunks,
                color: engineeringColor,
                strength: SECONDARY,
                dashed: true,
              },
            ],
            accuracy: op.text,
            detail: `${op.sentence} The site formula (rotation and scale) is exact to 1 nm.`,
            caution: op.caution,
          };
        });
        return;
      case "rigidVsExact":
        void request(id, async () => {
          const from: [number, number] = [SITE.origin[0], SITE.origin[1]];
          const to: [number, number] = [from[0] + 20_000 * FT, from[1]];
          const k = sagTrueScale ? 1 : SAG_FACTOR;
          const g = await client.overlay("rigidVsExact", {
            frame: frameParams(CALIFORNIA, "California zone 3"),
            from,
            to,
            samples: 100,
            ...(k !== 1 && { exaggeration: k }),
          });
          const exact = g.layers.find((l) => l.name === "exact")!.chunks;
          const rigid = g.layers.find((l) => l.name === "rigid")!.chunks;
          const sag = g.sagAtEnd ?? NaN;
          const a = pointOf(exact, true);
          const b = pointOf(rigid, true);
          rigidEnds = a && b ? { exact: a, rigid: b } : undefined;
          // S-C1: a 1 px white leader between the two far ends, labelled
          // with the true sag; both lines at full strength, exact solid and
          // rigid dashed.
          const leader =
            a && b
              ? overlayMesh({
                  positions: Float64Array.from([...a, ...b]),
                  colors: Uint8Array.from([
                    255, 255, 255, 255, 255, 255, 255, 255,
                  ]),
                })
              : [];
          const mid = a && b ? a.map((v, i) => (v + b[i]!) / 2) : undefined;
          const drawn = k === 1 ? "" : ` (drawn ×${k})`;
          return {
            layers: [
              { chunks: exact, color: engineeringColor },
              { chunks: rigid, color: hexRgba("#ffffff"), dashed: true },
              { chunks: leader },
            ],
            accuracy: `sag ${sag.toFixed(1)} m at 20 km, exact geometry`,
            detail: `A 20 km design line placed rigidly at its start (dashed) against the exact one (solid): ${sag.toFixed(1)} m apart at the far end, by geometry, exact. ${k === 1 ? "Drawn at true scale." : `Their separation is drawn ×${k} so it shows; the leader carries the true figure.`}`,
            labels: mid
              ? [
                  {
                    id: "label:sag",
                    text: `sag ${sag.toFixed(1)} m at 20 km${drawn}`,
                    at: Float64Array.from(mid),
                    priority: 2,
                    leader: true,
                  },
                ]
              : [],
          };
        });
        return;
      case "roundTrip": {
        const marks = results
          .filter(
            (r) =>
              r.fingerprint &&
              r.value !== undefined &&
              r.tolerance !== undefined &&
              !r.userInput,
          )
          .flatMap((r) => {
            const c = r.fingerprint!.coordinates;
            const out = [];
            for (let i = 0; i + 2 < c.length; i += 3) {
              const p = [c[i]!, c[i + 1]!, c[i + 2]!];
              // Only points on the Earth (a few cases fingerprint other bodies' coordinates).
              const radius = Math.hypot(p[0]!, p[1]!, p[2]!);
              if (radius > 6.3e6 && radius < 6.4e6) {
                out.push({
                  position: p,
                  error: Math.abs(r.value!),
                  tolerance: r.tolerance!,
                });
              }
            }
            return out;
          });
        if (marks.length === 0) {
          s.state = "drawn";
          s.accuracy = "no markers yet: run the tests to place them";
          globe.removeOverlay(id);
          invalidate();
          return;
        }
        const worst = marks.reduce((a, m) =>
          m.error / m.tolerance > a.error / a.tolerance ? m : a,
        );
        globe.setOverlay(id, [
          { chunks: overlayMesh(roundTripMarkers(marks, 3000)) },
        ]);
        s.state = "drawn";
        s.accuracy = `${marks.length} points; worst round trip ${meters(worst.error)} against ${meters(worst.tolerance)}`;
        invalidate();
        return;
      }
      case "orion": {
        const instant = instantNow();
        if (!frames || !instant) {
          s.state = "error";
          s.problem = "It didn't draw: frame data isn't in yet";
          invalidate();
          return;
        }
        // A new frame shows waiting; the same one keeps its path until the
        // new build replaces it. Whatever is in flight for another frame is
        // dropped, never queued.
        if (orionBuilt?.frame !== orionFrame) {
          s.state = "waiting";
          delete s.problem;
        }
        orionBuild.drop();
        orionBuild.request({ frame: orionFrame, at: instant.tdb() });
        invalidate();
        return;
      }
      case "distortion":
        void request(id, async () => {
          const d = DISTORTION[distortionCrs];
          const g = await client.overlay("distortion", {
            frame: frameParams(
              d.crs,
              `distortion EPSG:${d.crs.format === "wkid" ? d.crs.wkid : ""}`,
            ),
            extent: d.extent,
            step: d.step,
            height: distortionHeight || (d.height ?? 0),
            tissotRadius: d.radius,
          });
          const tissot = g.layers.find((l) => l.name === "tissot")!.chunks;
          const contours = g.layers.find((l) => l.name === "contours")!.chunks;
          const labels: LabelSpec[] = [];
          if (g.labels) {
            const n = g.labels.values.length;
            for (let i = 0; i < Math.min(n, 12); i++) {
              const k = Math.floor((i * n) / Math.min(n, 12));
              const v = g.labels.values[k]!;
              labels.push({
                id: `label:ppm:${i}`,
                text: `${v > 0 ? "+" : ""}${v} ppm`,
                at: g.labels.positions.slice(3 * k, 3 * k + 3),
                priority: 0,
              });
            }
          }
          const op = operationText(g);
          return {
            layers: [
              { chunks: tissot, color: engineeringColor, strength: SECONDARY },
              { chunks: contours, color: familyRgba("earth") },
            ],
            accuracy: `contours from PROJ's scale factors${op.caution ? `; placement ${op.text}` : ""}`,
            detail: `Tissot ellipses in true-north axes (convergence not applied); combined-factor contours from PROJ's factors, in ppm${g.skipped ? `; ${g.skipped} nodes with no scale left out` : ""}. ${op.sentence}`,
            caution: op.caution,
            labels,
          };
        });
        return;
      case "bias": {
        const instant = instantNow();
        if (!frames || !instant) {
          return;
        }
        const g = triad(frames, frames.eme2000, instant, 1.5 * EARTH_RADIUS, {
          biasExaggeration: biasFactor,
        });
        globe.setOverlay(id, [{ chunks: overlayMesh(g) }]);
        biasAt = viewer.clock.time;
        s.state = "drawn";
        delete s.accuracy;
        const tip = Float64Array.from(g.positions.subarray(3, 6));
        overlayLabels.set(id, [
          {
            id: "label:bias",
            text: `EME2000 (bias ×${sig(biasFactor, 1)})`,
            at: tip,
            family: "celestial",
            priority: 2,
          },
        ]);
        refreshTriads();
        invalidate();
        return;
      }
    }
  }
  let biasAt = 0;

  /** The design grid's 2 km lines' chunk origins, once drawn. */
  let minorGrid: readonly ArrayLike<number>[] | undefined;
  const MINOR_GRID_RANGE = 60_000;
  /** The 2 km lines show only while the camera is within 60 km of them. */
  function updateMinorGrid(): void {
    if (minorGrid === undefined) {
      return;
    }
    const eye = viewer.view.camera.position;
    let near = Infinity;
    for (const o of minorGrid) {
      near = Math.min(
        near,
        Math.hypot(o[0]! - eye[0]!, o[1]! - eye[1]!, o[2]! - eye[2]!),
      );
    }
    // Within 60 km above the ground, and over the grid: a chunk spans up
    // to 100 km, so its origin can be that far from its nearest line.
    const height =
      WGS84.cartesianToCartographic(eye, {
        longitude: 0,
        latitude: 0,
        height: 0,
      })?.height ?? Infinity;
    globe.setOverlayVisible(
      "designGrid:minor",
      height < MINOR_GRID_RANGE && near < MINOR_GRID_RANGE + 1e5,
    );
  }

  // --------------------------------------------------------- the walk's path
  /**
   * The selected frame's path on the globe (DESIGN.md "A selection"): the
   * walk's origins, from ITRF through the common ancestor to the frame,
   * joined by a dotted 1 px line, revealed one
   * edge at a time with the walk's 90 ms stagger (at once under reduced
   * motion), and redrawn as the clock moves the origins.
   */
  let walk: { id: string; shown: number; timer: number } | undefined;
  /**
   * The walk's origins on the globe, from the reference (the shared
   * "Against", S-I5) through the common ancestor to the frame, coincident
   * ones merged. An origin far off the scene (the barycentre, the Sun) is
   * drawn as a stub toward it from the first near origin, with a label
   * naming it and its distance.
   */
  function walkOrigins(id: string): {
    points: Float64Array[];
    far?: { at: Float64Array; text: string };
  } {
    const instant = instantNow();
    if (!tree || !frames || !instant) {
      return { points: [] };
    }
    let path: TreeNode[];
    try {
      const up = pathToRoot(tree, view.get().against);
      const down = pathToRoot(tree, id);
      const common = up.findIndex((n) => down.some((d) => d.id === n.id));
      const at = down.findIndex((d) => d.id === up[common]!.id);
      path = [...up.slice(0, common + 1), ...down.slice(0, at).reverse()];
    } catch {
      return { points: [] };
    }
    const out: Float64Array[] = [];
    let far: { id: string; p: ArrayLike<number> } | undefined;
    for (const n of path) {
      let o: ArrayLike<number> | undefined;
      if (n.frame) {
        try {
          const m = frameTransform(n.frame, frames.itrf, instant);
          o = [m[12]!, m[13]!, m[14]!];
        } catch {
          continue;
        }
      } else if (n.id === orionInfo?.info.node.id) {
        o = orionInfo.info.itrf;
      } else if (n.id === engineering?.node.id) {
        o = engineering.placed.itrf;
      }
      if (o === undefined) {
        continue;
      }
      if (Math.hypot(o[0]!, o[1]!, o[2]!) > FAR_ORIGIN) {
        // The barycentre or the Sun: off the scene; pointed at, not drawn to.
        far ??= { id: n.id, p: o };
        continue;
      }
      const prev = out.at(-1);
      if (
        prev === undefined ||
        Math.hypot(o[0]! - prev[0]!, o[1]! - prev[1]!, o[2]! - prev[2]!) > 1
      ) {
        out.push(Float64Array.from(o));
      }
    }
    const first = out[0];
    if (!far || !first) {
      return { points: out };
    }
    const d = [0, 1, 2].map((i) => far!.p[i]! - first[i]!);
    const len = Math.hypot(d[0]!, d[1]!, d[2]!);
    const stub = Float64Array.from(
      [0, 1, 2].map((i) => first[i]! + (d[i]! / len) * WALK_STUB),
    );
    return {
      points: [stub, ...out],
      far: {
        at: stub,
        text: `→ ${far.id} origin, ${sig(len / AU, 2)} au`,
      },
    };
  }
  function drawWalk(): void {
    if (!walk) {
      globe.removeOverlay("walk");
      overlayLabels.delete("walk");
      refreshTriads();
      return;
    }
    const { points: origins, far } = walkOrigins(walk.id);
    overlayLabels.set(
      "walk",
      far
        ? [{ id: "label:walk-far", text: far.text, at: far.at, priority: 2 }]
        : [],
    );
    const points: number[] = [];
    const colors: number[] = [];
    const color = familyRgba(familyOf(walk.id));
    for (let k = 0; k + 1 < origins.length && k < walk.shown; k++) {
      const a = origins[k]!;
      const b = origins[k + 1]!;
      // 40 dots per edge: world-space segments, a dot and a gap each.
      const dots = 40;
      for (let d = 0; d < dots; d++) {
        const f0 = d / dots;
        const f1 = (d + 0.5) / dots;
        for (const f of [f0, f1]) {
          points.push(
            a[0]! + (b[0]! - a[0]!) * f,
            a[1]! + (b[1]! - a[1]!) * f,
            a[2]! + (b[2]! - a[2]!) * f,
          );
          colors.push(...color);
        }
      }
    }
    refreshTriads();
    if (points.length === 0) {
      globe.removeOverlay("walk");
      return;
    }
    globe.setOverlay("walk", [
      {
        // Dots up to 1e7 m long (an Earth–Moon edge): its own path's chunks.
        chunks: overlayMesh(
          {
            positions: Float64Array.from(points),
            colors: Uint8Array.from(colors),
          },
          { extent: 1e7 },
        ),
      },
    ]);
  }
  function startWalk(id: string | undefined): void {
    if (walk) {
      clearTimeout(walk.timer);
    }
    walk = undefined;
    if (id === undefined) {
      drawWalk();
      return;
    }
    const edges = Math.max(0, walkOrigins(id).points.length - 1);
    const reduced =
      typeof matchMedia === "function" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches;
    walk = { id, shown: reduced ? edges : 1, timer: 0 };
    const step = () => {
      if (!walk || walk.id !== id || disposed) {
        return;
      }
      drawWalk();
      if (walk.shown < edges) {
        walk.shown++;
        walk.timer = window.setTimeout(step, 90);
      }
    };
    step();
  }
  scope.defer(() => {
    if (walk) {
      clearTimeout(walk.timer);
    }
  });

  // ---------------------------------------------------------------- Orion
  const leapOf = () => frames!.data.leapSeconds;
  /** Builds Orion's path in the worker: one build in flight, the latest waiting (orion.ts). */
  const orionBuild = latestOnly(
    (arg: { frame: OrionFrame; at: number }) =>
      client.overlay("trajectoryPath", {
        drawIn: DRAW_IN[arg.frame],
        t0: Instant.fromIso(ORION_SPAN[0], "UTC", leapOf()).tdb(),
        t1: Instant.fromIso(ORION_SPAN[1], "UTC", leapOf()).tdb(),
        step: ORION_STEP,
        at: arg.at,
        adaptive: ORION_ADAPTIVE,
      }),
    (g, arg) => {
      const s = overlays.get("orion")!;
      if (!s.on || disposed || arg.frame !== orionFrame || !frames) {
        return;
      }
      const frame = frames[DRAW_IN[arg.frame]];
      const chunks = g.layers[0]!.chunks;
      globe.setOverlay("orion", [{ chunks, color: familyRgba("trajectory") }], {
        placement: IDENTITY,
      });
      orionBuilt = {
        frame: arg.frame,
        at: arg.at,
        inverse: frameTransform(frames.itrf, frame, Instant.fromTdb(arg.at)),
        chunks,
        ...(g.sampling && { sampling: g.sampling }),
      };
      orionPlacedAt = NaN;
      placeOrion();
      s.state = "drawn";
      delete s.problem;
      refreshCallouts();
      invalidate();
    },
    (error, arg) => {
      const s = overlays.get("orion")!;
      if (isAbort(error) || disposed || !s.on || arg.frame !== orionFrame) {
        return;
      }
      const missing = loading.get("orion").state === "missing";
      s.state = missing ? "missing" : "error";
      s.problem = missing
        ? `${ITEM_NAME.orion} isn't in the frames store: run npm run setup in packages/next, then reload.`
        : `It didn't draw: ${scrub(messageOf(error))}`;
      invalidate();
    },
  );

  /**
   * Orion's path follows the clock without a rebuild: drawn in GCRF or
   * MOON_ME at one instant, it is moved each frame by the drawing frame's
   * placement now times its inverse then (exact: both are rigid). In ITRF
   * the path doesn't depend on the clock at all.
   */
  let orionPlacedAt = NaN;
  function placeOrion(): void {
    const instant = instantNow();
    if (!orionBuilt || !frames || !instant || orionBuilt.frame === "ITRF") {
      return;
    }
    const tdb = instant.tdb();
    if (tdb === orionPlacedAt) {
      return;
    }
    let now: Float64Array;
    try {
      now = frameTransform(
        frames[DRAW_IN[orionBuilt.frame]],
        frames.itrf,
        instant,
      );
    } catch {
      // Outside the frame data's span: left where it was last placed.
      return;
    }
    globe.placeOverlay("orion", compose(now, orionBuilt.inverse));
    orionPlacedAt = tdb;
  }

  /** Orion's node and statements at the clock's instant: one in flight, the latest waiting. */
  const orionInfoRequest = latestOnly(
    (arg: { at: number; utc: number }) => client.trajectoryInfo(arg.at),
    (info, arg) => {
      if (disposed) {
        return;
      }
      orionInfo = { info, utc: arg.utc };
      orionInfoError = undefined;
      rebuildTree();
      refreshCallouts();
    },
    (error, arg) => {
      // Shown in the legend and on the tree's node; the next clock change
      // (a minute of clock time) asks again.
      if (disposed || isAbort(error)) {
        return;
      }
      orionInfoError = { message: scrub(messageOf(error)), utc: arg.utc };
      rebuildTree();
      refreshCallouts();
    },
  );
  let orionInfoAsked: { clock: number; real: number } | undefined;
  function askOrionInfo(): void {
    const instant = instantNow();
    if (!instant || loading.get("orion").state !== "ready") {
      return;
    }
    orionInfoAsked = { clock: viewer.clock.time, real: performance.now() };
    orionInfoRequest.request({ at: instant.tdb(), utc: viewer.clock.time });
  }
  // When Orion's OEM is in (its overlay or its tests loaded it), the tree
  // and the legend get Orion.
  scope.defer(
    loading.subscribe(() => {
      if (
        orionInfoAsked === undefined &&
        loading.get("orion").state === "ready"
      ) {
        askOrionInfo();
      }
    }),
  );

  function setOverlay(id: OverlayId, on: boolean): void {
    const s = overlays.get(id)!;
    if (s.on === on) {
      return;
    }
    s.on = on;
    drawOverlay(id);
  }

  // --------------------------------------------------------------- camera
  const framingAt = (
    lon: number,
    lat: number,
    range: number,
    heading = 0,
    pitch = -Math.PI / 2 + 1e-3,
  ): Framing => ({
    center: WGS84.cartographicToCartesian(
      fromDegrees(lon, lat, 0),
      new Float64Array(3),
    ),
    range,
    heading: heading * deg,
    pitch,
  });
  const OPENING = framingAt(-135, 25, 2 * EARTH_RADIUS);

  const cross = (a: ArrayLike<number>, b: ArrayLike<number>): number[] => [
    a[1]! * b[2]! - a[2]! * b[1]!,
    a[2]! * b[0]! - a[0]! * b[2]!,
    a[0]! * b[1]! - a[1]! * b[0]!,
  ];

  /** The Moon's centre in ITRF at the clock's instant. */
  function moonCenter(): Float64Array | undefined {
    const instant = instantNow();
    if (!frames || !instant) {
      return undefined;
    }
    const m = frameTransform(frames.moonIcrf, frames.itrf, instant);
    return Float64Array.from([m[12]!, m[13]!, m[14]!]);
  }

  function framing(
    camera: TourStopSpec["camera"] | "moon" | "site" | "portland",
  ): Framing | undefined {
    switch (camera) {
      case "opening":
        return OPENING;
      case "stay":
        return undefined;
      case "designGrid":
        return framingAt(-120.5, 37.85, 180_000, 0, -35 * deg);
      case "rigidVsExact": {
        // S-C1: from the side (south of the line, looking north, 10° down),
        // the whole 20 km line across the view, so the gap opening toward
        // the far end reads at a glance. Looking back along the line (the
        // first spec) foreshortened it to a short stroke.
        const ends = rigidEnds;
        if (ends) {
          const c = WGS84.cartesianToCartographic(ends.exact, {
            longitude: 0,
            latitude: 0,
            height: 0,
          });
          if (c) {
            return framingAt(
              c.longitude / deg - 0.11,
              c.latitude / deg,
              22_000,
              0,
              -10 * deg,
            );
          }
        }
        return framingAt(-122.31, 37.76, 22_000, 0, -10 * deg);
      }
      case "site":
        return framingAt(-122.43, 37.76, 8000, 0, -45 * deg);
      case "portland":
        return framingAt(-122.75, 45.5, 90_000, 0, -50 * deg);
      case "earthMoon": {
        // Down on the orbit plane (tour stop 5): along the normal of the
        // Moon's orbit at the flyby, where Orion's free return lies, with
        // the Earth–Moon line across the screen, framing the Earth, the
        // Moon and Orion's path as drawn.
        const moon = moonCenter();
        const instant = instantNow();
        if (!moon || !frames || !instant) {
          return undefined;
        }
        const leap = frames.data.leapSeconds;
        // In GCRF the Moon's motion is its orbit's; then turned to ITRF.
        const at = (ms: number) =>
          frameTransform(
            frames!.moonIcrf,
            frames!.gcrf,
            Instant.fromUtc(FLYBY + ms, leap),
          );
        const a = at(-1_800_000);
        const b = at(1_800_000);
        const g = cross([a[12]!, a[13]!, a[14]!], [b[12]!, b[13]!, b[14]!]);
        const m = frameTransform(frames.gcrf, frames.itrf, instant);
        const normal = [0, 1, 2].map(
          (i) => m[i]! * g[0]! + m[4 + i]! * g[1]! + m[8 + i]! * g[2]!,
        );
        // The Earth and the Moon with room around them, and Orion's path.
        const points: number[][] = [];
        for (const [c, radius] of [
          [[0, 0, 0], 2.5e7],
          [Array.from(moon), 2.5e7],
        ] as const) {
          for (const d of [-1, 1]) {
            for (let k = 0; k < 3; k++) {
              const p = [...c];
              p[k] = p[k]! + d * radius;
              points.push(p);
            }
          }
        }
        if (orionBuilt) {
          const place =
            orionBuilt.frame === "ITRF"
              ? IDENTITY
              : compose(
                  frameTransform(
                    frames[DRAW_IN[orionBuilt.frame]],
                    frames.itrf,
                    instant,
                  ),
                  orionBuilt.inverse,
                );
          for (const c of orionBuilt.chunks) {
            const o = c.origin;
            points.push(
              [0, 1, 2].map(
                (i) =>
                  place[i]! * o[0]! +
                  place[4 + i]! * o[1]! +
                  place[8 + i]! * o[2]! +
                  place[12 + i]!,
              ),
            );
          }
        }
        const canvas = viewer.canvas;
        const f = planeFraming(points, normal, moon, {
          fov: viewer.view.camera.fov,
          aspect: canvas.clientWidth / Math.max(1, canvas.clientHeight),
        });
        return {
          center: f.center,
          range: f.range,
          heading: 0,
          pitch: -Math.PI / 2,
          from: f.from,
        };
      }
      case "moon": {
        const moon = moonCenter();
        return moon
          ? { center: moon, range: 2e7, heading: 0, pitch: -60 * deg }
          : undefined;
      }
      case "lunarSite": {
        const o =
          globe.triadOrigin("Lunar south-pole site") ?? lunarSiteOrigin();
        return o
          ? { center: o, range: 100, heading: 0, pitch: -20 * deg }
          : undefined;
      }
    }
  }

  function lunarSiteOrigin(): Float64Array | undefined {
    const instant = instantNow();
    const site = local.find((f) => f.name === "Lunar south-pole site");
    if (!frames || !instant || !site) {
      return undefined;
    }
    const m = frameTransform(site, frames.itrf, instant);
    return Float64Array.from([m[12]!, m[13]!, m[14]!]);
  }

  /** Where "Show on globe" goes for a frame: Earth frames the opening shot, the Moon's at 20,000 km, sites close. */
  function frameFraming(id: string): Framing | undefined {
    if (id === "Lunar south-pole site") {
      return framing("lunarSite");
    }
    if (id === "Sacramento ENU") {
      return framingAt(-121.4944, 38.5816, 8000, 0, -45 * deg);
    }
    if (id.startsWith("engineering:")) {
      return framing("designGrid");
    }
    if (id.startsWith("MOON")) {
      return framing("moon");
    }
    if (id === orionInfo?.info.node.id) {
      return framing("earthMoon");
    }
    return OPENING;
  }

  /** Where a result's group points: its overlay's framing, its site, or its frames. */
  function resultFraming(id: string): {
    framing?: Framing;
    overlay?: OverlayId;
    engineering: boolean;
  } {
    const r =
      results.find((x) => x.id === id) ?? userResults.find((x) => x.id === id);
    const g = r && groupInfo(r.group);
    if (!g) {
      return { engineering: false };
    }
    const overlay: OverlayId | undefined =
      g.focus?.overlay === "designGrid"
        ? "designGrid"
        : g.focus?.overlay === "trajectoryPath"
          ? "orion"
          : g.id === "rigid-placement-budget"
            ? "rigidVsExact"
            : g.id === "distortion"
              ? "distortion"
              : undefined;
    const engineering = g.needs.includes("proj");
    if (g.id === "lunar-time") {
      return { framing: framing("lunarSite"), engineering: false };
    }
    if (g.id === "space" || g.id === "trajectory") {
      return {
        framing: framing("earthMoon"),
        overlay: "orion",
        engineering: false,
      };
    }
    if (overlay === "designGrid") {
      return { framing: framing("designGrid"), overlay, engineering };
    }
    if (overlay === "rigidVsExact") {
      return { framing: framing("rigidVsExact"), overlay, engineering };
    }
    if (overlay === "distortion") {
      const d = DISTORTION[distortionCrs].look;
      return {
        framing: framingAt(d[0], d[1], d[2], 0, -60 * deg),
        overlay,
        engineering,
      };
    }
    if (g.focus?.site === "california") {
      return { framing: framing("site"), engineering };
    }
    if (engineering) {
      // A check with no site of its own: show the fingerprint's first point.
      const c = r?.fingerprint?.coordinates;
      if (c && c.length >= 3 && Math.hypot(c[0]!, c[1]!, c[2]!) > 6.3e6) {
        return {
          framing: {
            center: [c[0]!, c[1]!, c[2]!],
            range: 30_000,
            heading: 0,
            pitch: -50 * deg,
          },
          engineering,
        };
      }
    }
    return { framing: OPENING, engineering: false };
  }

  // ------------------------------------------------- selection on the globe
  /** The frames the selection highlights (R14): a frame's path, a result's group's frames. */
  function emphasisFrames(): Set<string> {
    const s = view.get().selection;
    const out = new Set<string>();
    if (s.kind === "frame" && tree) {
      try {
        for (const n of pathToRoot(tree, s.id)) {
          out.add(n.id);
        }
      } catch {
        // Not in the tree: reconcile clears it.
      }
    } else if (s.kind === "result") {
      const r = results.find((x) => x.id === s.id);
      for (const f of (r && groupInfo(r.group)?.focus?.frames) ?? []) {
        out.add(f);
      }
    }
    return out;
  }

  let lastSelection = view.get().selection;
  let lastAgainst = view.get().against;
  function onView(): void {
    const v = view.get();
    context.setParams(formatParams(v));
    if (v.selection !== lastSelection) {
      lastSelection = v.selection;
      applySelection();
    } else if (v.against !== lastAgainst && v.selection.kind === "frame") {
      // The walk's reference changed: its path on the globe follows (S-I5).
      startWalk(v.selection.id);
    }
    lastAgainst = v.against;
    applyTour(v.tour);
    invalidate();
  }

  function applySelection(): void {
    const s = view.get().selection;
    refreshTriads();
    startWalk(s.kind === "frame" ? s.id : undefined);
    refreshCallouts();
    if (s.kind === "none") {
      globe.emphasize(undefined);
      if (tourStop === undefined) {
        globe.dimGround(false);
      }
      return;
    }
    if (s.kind === "frame") {
      // Selecting a frame highlights; flying is "Show on globe" (I6).
      globe.emphasize({ frames: emphasisFrames(), selected: s.id });
      return;
    }
    // A result not in hand (a deep link, back or forward): run its group
    // (retrying once), then show it, or clear it and say why (R15).
    const has = (id: string) =>
      results.some((r) => r.id === id) || userResults.some((r) => r.id === id);
    if (!has(s.id)) {
      if (linking !== s.id) {
        linking = s.id;
        void loadLinkedResult(view, s.id, {
          has,
          run: async (group) => {
            const outcome = await runCatalog([group]);
            if (outcome !== undefined) {
              throw new Error(outcome);
            }
          },
          notice: (text) => {
            notice = { id: (notice?.id ?? 0) + 1, text };
            invalidate();
          },
        })
          .then((outcome) => {
            if (
              outcome === "shown" &&
              !disposed &&
              view.get().selection === s
            ) {
              applySelection();
            }
          })
          .finally(() => {
            linking = undefined;
          });
      }
      return;
    }
    // A result: its overlay on, its frames highlighted, the camera at its site (R14).
    const where = resultFraming(s.id);
    if (where.overlay) {
      setOverlay(where.overlay, true);
    }
    globe.emphasize({
      ...(where.overlay && { overlay: where.overlay }),
      frames: emphasisFrames(),
    });
    globe.dimGround(where.engineering);
    if (where.framing) {
      globe.flyTo(where.framing);
    }
  }

  // ----------------------------------------------------------------- tour
  let tourStop: string | undefined;
  /**
   * Stop 2 (S-I6): at 3,600× the framed side passes into night, so the
   * globe is lit from the camera instead, set after the viewer's own sun
   * on every clock change (this listener comes after the viewer's).
   */
  let headlight = false;
  function lightFromCamera(): void {
    const p = viewer.view.camera.position;
    const l = Math.hypot(p[0]!, p[1]!, p[2]!);
    if (l > 0) {
      viewer.engine.sunDirection.set([p[0]! / l, p[1]! / l, p[2]! / l]);
      viewer.engine.requestRender();
    }
  }
  scope.defer(
    viewer.clock.events.on("change", () => {
      if (headlight) {
        lightFromCamera();
      }
    }),
  );
  scope.defer(() => {
    if (headlight) {
      viewer.sunFromClock = true;
    }
  });

  /**
   * On-canvas callouts (S-I8, minor 9): the lunar clock's rate at the
   * south-pole site during stop 6 or while the site is selected, and Orion
   * at the clock's instant while its path is drawn.
   */
  function refreshCallouts(): void {
    const out: LabelSpec[] = [];
    const s = view.get().selection;
    if (
      tourStop === "lunar-time" ||
      (s.kind === "frame" && s.id === "Lunar south-pole site")
    ) {
      out.push({
        id: "callout:lunar-time",
        text: `lunar clock +${LUNAR_RATE} against Earth's (Ashby & Patla 2024)`,
        at: () =>
          globe.triadOrigin("Lunar south-pole site") ?? lunarSiteOrigin(),
        priority: 4,
        leader: true,
      });
    }
    const o = overlays.get("orion")!;
    if (o.on && o.state === "drawn" && orionInfo && !orionInfoError) {
      const m = orionInfo.info.composed.ITRF.statement.meters;
      out.push({
        id: "callout:orion-now",
        text: `Orion now${m !== undefined ? `, ±${length(m, 2)}` : ""}`,
        at: orionInfo.info.itrf,
        family: "trajectory",
        priority: 3,
        leader: true,
      });
    }
    overlayLabels.set("callouts", out);
    refreshTriads();
  }
  let tourClock: { rate: number; mode: typeof viewer.clock.mode } | undefined;
  function applyTour(id: string | undefined): void {
    if (id === tourStop || !frames) {
      return;
    }
    tourStop = id;
    if (tourClock) {
      viewer.clock.rate = tourClock.rate;
      viewer.clock.mode = tourClock.mode;
      tourClock = undefined;
    }
    if (headlight) {
      headlight = false;
      viewer.sunFromClock = true;
    }
    const stop = TOUR.find((s) => s.id === id);
    refreshCallouts();
    if (!stop) {
      globe.dimGround(false);
      return;
    }
    if (stop.light === "camera") {
      headlight = true;
      lightFromCamera();
    }
    for (const o of stop.overlays) {
      setOverlay(o, true);
    }
    if (stop.orionFrame && stop.orionFrame !== orionFrame) {
      orionFrame = stop.orionFrame;
      drawOverlay("orion");
    }
    if (stop.rate !== undefined) {
      tourClock = { rate: viewer.clock.rate, mode: viewer.clock.mode };
      viewer.clock.rate = stop.rate;
      viewer.clock.mode = "playing";
    }
    globe.dimGround(stop.dim === true);
    const f = framing(stop.camera);
    if (f) {
      globe.flyTo(
        f,
        stop.camera === "lunarSite"
          ? 3.5
          : stop.camera === "earthMoon"
            ? 3
            : undefined,
      );
    }
  }

  // ------------------------------------------------------------------ runs
  const startedAt = { iso: "", ms: 0 };
  /** Runs the catalog (or groups of it). Resolves with why it failed, or undefined. */
  async function runCatalog(
    ids?: readonly string[],
  ): Promise<string | undefined> {
    if (runView.state === "running") {
      // One run at a time: wait for the one going on, then run.
      await running;
      if (disposed) {
        return "the example was left";
      }
    }
    const done = runCatalogNow(ids);
    running = done.then(
      () => undefined,
      () => undefined,
    );
    return done;
  }

  async function runCatalogNow(
    ids?: readonly string[],
  ): Promise<string | undefined> {
    const groups = ids && new Set(ids);
    results = groups ? results.filter((r) => !groups.has(r.group)) : [];
    const before = results.length;
    runView = {
      state: "running",
      done: 0,
      total: groups
        ? 0
        : lastRun
          ? lastRun.summary.passed +
            lastRun.summary.failed +
            lastRun.summary.skipped +
            lastRun.summary.shown
          : 225,
    };
    startedAt.iso = new Date().toISOString();
    startedAt.ms = performance.now();
    invalidate();
    try {
      const summary = await client.run(ids, (r) => {
        results.push(r);
        runView = {
          ...runView,
          done: results.length - before,
          total: Math.max(runView.total, results.length - before),
        };
        invalidate();
      });
      if (disposed) {
        return "the example was left";
      }
      lastRun = { startedAt: startedAt.iso, summary };
      runView = {
        state: summary.cancelled ? "cancelled" : "done",
        done: results.length - before,
        total: results.length - before,
        summary: wholeSummary(summary.ms),
      };
      updateKnown();
      if (overlays.get("roundTrip")!.on) {
        drawOverlay("roundTrip");
      }
    } catch (error) {
      if (isAbort(error) || disposed) {
        return "the example was left";
      }
      runView = {
        state: "cancelled",
        done: results.length - before,
        total: runView.total,
      };
      lastRun = {
        startedAt: startedAt.iso,
        summary: {
          ...wholeSummary(performance.now() - startedAt.ms),
          cancelled: true,
        },
      };
      invalidate();
      // Every count and the "known" results reflect what did come back.
      updateKnown();
      return scrub(messageOf(error));
    }
    invalidate();
    return undefined;
  }

  /** The counts over every result the page holds (a group's run joins the rest). */
  function wholeSummary(ms: number): RunSummary {
    const s: RunSummary = {
      passed: 0,
      failed: 0,
      skipped: 0,
      shown: 0,
      ms,
      cancelled: false,
    };
    for (const r of results) {
      if (r.missing !== undefined) {
        s.skipped++;
      } else if (r.displayOnly) {
        s.shown++;
      } else if (r.pass) {
        s.passed++;
      } else {
        s.failed++;
      }
    }
    return s;
  }

  // -------------------------------------------------------------- the report
  function reportEnvironment(): ReportEnvironment {
    const file = (name: string) => manifest?.files.find((f) => f.file === name);
    const projLoaded = loading.get("proj").state === "ready";
    const geoidLoaded = loading.get("geoid").state === "ready";
    const projSource = file("proj/proj_capi.wasm")?.sourceUrl ?? "";
    const version = /\/v(\d+\.\d+\.\d+)\//.exec(projSource)?.[1];
    const entry = (label: string, name: string, loaded: boolean) => {
      const f = file(name);
      return {
        label,
        file: name,
        ...(loaded && f && { sha256: f.sha256 }),
        ...(!loaded && {
          note:
            loading.get(
              label === "GEOID18"
                ? "geoid"
                : label === "Artemis II OEM"
                  ? "orion"
                  : label.startsWith("proj")
                    ? "proj"
                    : "frames",
            ).state === "error"
              ? "not loaded: the fetch failed"
              : "not loaded",
        }),
      };
    };
    const framesReady = loading.get("frames").state === "ready";
    return {
      startedAt: lastRun?.startedAt ?? new Date(0).toISOString(),
      durationMs: lastRun?.summary.ms ?? 0,
      packageVersion: "@cesium/next 2.0.0-poc.0",
      userAgent: navigator.userAgent,
      ...(projLoaded && {
        proj: `proj.js ${version ? `v${version}` : ""} (PROJ as WebAssembly, from the frames store)`.replace(
          "  ",
          " ",
        ),
      }),
      files: [
        entry("proj.db", "proj/proj.db", projLoaded),
        entry("proj_capi.wasm", "proj/proj_capi.wasm", projLoaded),
        entry("GEOID18", "proj/us_noaa_g2018u0.tif", geoidLoaded),
        ...(manifest?.files ?? [])
          .filter(
            (f) =>
              f.role === "planets" ||
              f.role === "moon" ||
              f.role === "eop" ||
              f.role === "leapSeconds",
          )
          .map((f) => entry("Frame data", f.file, framesReady)),
        entry(
          "Artemis II OEM",
          "EM2_FODNAVBET_revF_PUBLIC.oem",
          loading.get("orion").state === "ready",
        ),
      ],
      ...(manifest?.span && {
        frameDataSpan: `${manifest.span[0]}–${manifest.span[1]}`,
      }),
      ...(lastRun && { summary: lastRun.summary }),
    };
  }

  const report = () =>
    buildReport([...results, ...userResults], reportEnvironment(), {
      secrets: [token],
    });

  // ------------------------------------------------------------- actions
  const actions: PanelActions = {
    runAll: () => void runCatalog(),
    runGroup: (group) => void runCatalog([group]),
    cancel: () => client.cancel(),
    retryItem: (item) => {
      if (item === "frames") {
        void loadFrames();
      } else {
        void client.load(item).catch(() => {});
      }
    },
    setOverlay,
    setOrionFrame: (f) => {
      orionFrame = f;
      drawOverlay("orion");
    },
    setDistortionCrs: (crs) => {
      distortionCrs = crs;
      drawOverlay("distortion");
      const d = DISTORTION[crs].look;
      globe.flyTo(framingAt(d[0], d[1], d[2], 0, -60 * deg));
    },
    setDistortionHeight: (h) => {
      if (Number.isFinite(h)) {
        distortionHeight = h;
        drawOverlay("distortion");
      }
    },
    setBiasFactor: (k) => {
      biasFactor =
        Math.round(Math.log10(k)) === Math.log10(k)
          ? k
          : 10 ** Math.round(Math.log10(k));
      drawOverlay("bias");
    },
    setTrueScale: (on) => {
      trueScale = on;
      drawOverlay("designGrid");
    },
    setSagTrueScale: (on) => {
      sagTrueScale = on;
      drawOverlay("rigidVsExact");
    },
    jumpToFlyby: () => {
      viewer.clock.time = FLYBY;
    },
    showOnGlobe: (target) => {
      const f =
        "frame" in target
          ? frameFraming(target.frame)
          : resultFraming(target.result).framing;
      if (f) {
        globe.flyTo(f);
      }
    },
    fetchAsset: (id) => void showAsset(id),
    runUserCrs: (wkt2) => void runUser(wkt2),
    copyReport: async () => {
      await navigator.clipboard.writeText(report().markdown);
    },
    saveReport: (format) => {
      const r = report();
      const blob =
        format === "json"
          ? new Blob([JSON.stringify(r.json, null, 2)], {
              type: "application/json",
            })
          : new Blob([r.markdown], { type: "text/markdown" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `frames-explorer-report.${format === "json" ? "json" : "md"}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 0);
    },
    linkTo: (target) =>
      context.link(
        target.kind === "tour"
          ? { tour: target.stop }
          : formatParams({ selection: target, lens: view.get().lens }),
      ),
  };

  // ---------------------------------------------------- try your own (R18)
  let assetTileset: Awaited<ReturnType<typeof viewer.addTileset>> | undefined;
  scope.defer(() => {
    if (assetTileset) {
      viewer.remove(assetTileset);
    }
  });
  async function showAsset(id: string): Promise<void> {
    if (token === undefined || !/^\d{1,12}$/.test(id)) {
      return;
    }
    userCrs = { state: "fetching", id };
    invalidate();
    try {
      if (assetTileset) {
        viewer.remove(assetTileset);
        assetTileset = undefined;
      }
      const tileset = await viewer.addTileset({
        ion: Number(id),
        accessToken: token,
      });
      if (disposed) {
        return;
      }
      assetTileset = tileset;
      viewer.zoomTo(tileset);
      userCrs = {
        state: "noCrs",
        id,
        message: `Asset ${id} is on the globe for context. ion has no CRS for it: its tileset is already placed in Earth-fixed coordinates, and neither ion's metadata nor the tileset names the CRS it came from.`,
      };
    } catch (error) {
      if (disposed) {
        return;
      }
      userCrs = {
        state: "error",
        id,
        message: `Asset ${id} didn't load: ${scrub(messageOf(error))}`,
      };
    }
    invalidate();
  }

  async function runUser(wkt2: string): Promise<void> {
    userCrs = { ...userCrs, state: "running" };
    userResults = [];
    invalidate();
    try {
      const out: StressResult[] = [];
      await client.userCrs(wkt2, "Your CRS", (r) => {
        out.push(r);
      });
      if (disposed) {
        return;
      }
      userResults = out;
      const name = /^\s*\w+\s*\[\s*"([^"]{1,120})"/.exec(wkt2)?.[1];
      userCrs = {
        ...userCrs,
        state: "done",
        ...(name !== undefined && { crsName: name }),
      };
      updateKnown();
    } catch (error) {
      if (isAbort(error) || disposed) {
        return;
      }
      userCrs = {
        ...userCrs,
        state: "error",
        message: `The checks didn't run: ${scrub(messageOf(error))}`,
      };
    }
    invalidate();
  }

  // ------------------------------------------------------------- startup
  async function loadFrames(): Promise<void> {
    loading.apply("frames", { type: "fetching" });
    const start = performance.now();
    const bytes = new Map<
      string,
      { received: number; total: number | undefined }
    >();
    try {
      const manifestResponse = fetch(`${DATA}manifest.json`, { signal })
        .then((r) => (r.ok ? r.json() : undefined))
        .catch(() => undefined);
      const data = await loadFrameData(DATA, (file, received, total) => {
        bytes.set(file, { received, total });
        let sum = 0;
        let size = 0;
        let known = true;
        for (const b of bytes.values()) {
          sum += b.received;
          size += b.total ?? 0;
          known &&= b.total !== undefined;
        }
        loading.apply("frames", {
          type: "progress",
          received: sum,
          ...(known && { total: size }),
        });
      });
      manifest = (await manifestResponse) as typeof manifest;
      if (signal.aborted) {
        return;
      }
      frames = createFrames(data);
      const sum = [...bytes.values()].reduce((a, b) => a + b.received, 0);
      loading.apply("frames", {
        type: "ready",
        bytes: sum,
        ms: performance.now() - start,
      });
    } catch (error) {
      if (signal.aborted) {
        return;
      }
      const message = messageOf(error);
      loading.apply("frames", {
        type: /setup|404|not served|manifest/i.test(message)
          ? "missing"
          : "error",
        detail: message,
      });
      treeNote = `The frame tree can't draw: frame data didn't load (${message}). Everything else that needs no frame data still works.`;
      invalidate();
      return;
    }
    local = [
      eastNorthUpFrame(
        "Sacramento ENU",
        frames.itrf,
        WGS84,
        WGS84.cartographicToCartesian(SACRAMENTO, new Float64Array(3)),
      ),
      eastNorthUpFrame(
        "Lunar south-pole site",
        frames.moonMe,
        MOON.ellipsoid,
        MOON.ellipsoid.cartographicToCartesian(LUNAR_SITE, new Float64Array(3)),
      ),
    ];
    rebuildTree();
    refreshTriads();
    startFrameLoop();
    // A deep link (R15): its selection and tour stop, now that there is
    // data (a result runs its group first, then is selected and flown to).
    lastSelection = { kind: "none" };
    onView();
  }

  /** Every frame: the triads at the clock's instant; now and then, what depends on it. */
  function startFrameLoop(): void {
    let raf = 0;
    let lastTree = viewer.clock.time;
    // Real time too: at the tour's 3,600× the clock passes a minute every
    // frame, and rebuilding the walk's statements each frame cost frames
    // (R13). Once a second at most.
    let lastTreeReal = performance.now();
    let lastBiasReal = performance.now();
    let walkAt = viewer.clock.time;
    let walkReal = performance.now();
    const tick = () => {
      if (disposed) {
        return;
      }
      const instant = instantNow();
      if (frames && instant) {
        globe.update(frames.itrf, instant);
        const now = viewer.clock.time;
        const real = performance.now();
        if (Math.abs(now - lastTree) > 60_000 && real - lastTreeReal > 1000) {
          // The tree's Earth-orientation sigma and the walk's statements (R8).
          lastTree = now;
          lastTreeReal = real;
          rebuildTree();
        }
        // Orion's path moves with its drawing frame every frame; its
        // statement (the tree and the legend) is asked for again after a
        // minute of clock time, at most once a second (R8).
        placeOrion();
        updateMinorGrid();
        if (walk && Math.abs(now - walkAt) > 1000 && real - walkReal > 250) {
          walkAt = now;
          walkReal = real;
          drawWalk();
        }
        if (
          orionInfoAsked !== undefined &&
          Math.abs(now - orionInfoAsked.clock) > 60_000 &&
          real - orionInfoAsked.real > 1000
        ) {
          askOrionInfo();
        }
        if (
          overlays.get("bias")!.on &&
          Math.abs(now - biasAt) > 60_000 &&
          real - lastBiasReal > 250
        ) {
          lastBiasReal = real;
          drawOverlay("bias");
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    scope.defer(() => cancelAnimationFrame(raf));
  }

  // The clock opens at the flyby, paused (DESIGN.md "The opening shot");
  // the panel and the time controls show the same instant (I13).
  viewer.clock.time = FLYBY;
  viewer.clock.mode = "paused";
  scope.defer(viewer.clock.events.on("change", () => invalidate()));
  viewer.controller.maximumHeight = 2e9;
  viewer.view.camera.near = 0.1;
  viewer.controller.focus(
    Float64Array.from(OPENING.center),
    OPENING.heading,
    OPENING.pitch,
    OPENING.range,
  );

  scope.defer(view.subscribe(onView));
  scope.defer(
    context.watchParams((p) => {
      const known: Known = {
        ...(tree && { frames: treeIds() }),
        tours: TOUR.map((s) => s.id),
      };
      view.apply(parseParams(p, known));
    }),
  );
  void loadFrames();

  const initialTab: Tab | undefined =
    params.tab === "verify" ||
    params.tab === "report" ||
    params.tab === "explore"
      ? params.tab
      : initial.selection.kind === "result"
        ? "verify"
        : undefined;

  return {
    dispose: () => {
      disposed = true;
      globe.stopFlight();
      loading.reset();
    },
    panel: createElement(Panel, {
      source,
      view,
      actions,
      hud,
      ...(initialTab && { initialTab }),
    }),
  };
}
