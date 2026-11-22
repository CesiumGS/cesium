import {
  createRootRoute,
  createRoute,
  lazyRouteComponent,
  redirect,
} from "@tanstack/react-router";
import { loadRuns } from "./data.ts";
import { movedTo } from "./rail.ts";
import { searchToParams } from "./views/exampleRun.ts";
import { RunsLayout, Shell, ShellError, ShellPending } from "./shell.tsx";

/**
 * Dyno's routes (hash history: /#/overview?…), following the rail in
 * rail.ts and DESIGN.md. Each view is its own chunk, loaded on first visit; its
 * state is the route's path and search params, validated here so views
 * get typed values and links stay shareable. The views that read the
 * runs sit under a pathless layout route whose loader reads them once;
 * the others (images, examples, Lab) and the shell don't wait for them.
 */

const str = (v: unknown) =>
  typeof v === "string" && v !== ""
    ? v
    : typeof v === "number"
      ? String(v)
      : undefined;
const num = (v: unknown) => {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : undefined;
};
const bool = (v: unknown) => (v === true || v === "true" ? true : undefined);
/** Drops undefined keys, so URLs carry only what is set. */
const clean = <T extends Record<string, unknown>>(o: T) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;

export const rootRoute = createRootRoute({ component: Shell });

/** The parent of the views that read the runs (`useRuns()`). */
export const runsLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "_runs",
  component: RunsLayout,
  loader: loadRuns,
  pendingComponent: ShellPending,
  errorComponent: ShellError,
  // The runs don't change while the page is open (reload for new runs).
  staleTime: Infinity,
});

// ------------------------------------------------------------ needs a look

export interface WorkSearch {
  /** The page's view, by its ID ("move", "roadmap", "proposals", "flow" or a mounted view's; "Your move" by default). */
  view?: string;
  project?: string;
  /** A milestone's constraints as the scope. */
  milestone?: string;
  q?: string;
  /**
   * The list open in the details panel: "owner", "ready", "working", "outside",
   * "done", "projects", "graph", or "stage:<Stage>" (with the scope's
   * project, if any).
   */
  list?: string;
  /** The item open in the details panel. */
  item?: string;
  /** The release chosen: the Plan view lights what sets its finish. */
  release?: string;
  /** The roadmap's view, by its ID: the Release view by default (CS-744), or a mounted view's. */
  roadmap?: string;
  /** The Path view's target: a milestone or item (CS-746). */
  focus?: string;
  /** An old link's view that has gone, "deps": the page says where it went (CS-775). */
  moved?: string;
  /** The roadmap with its proposed milestones too, "show" (committed work only by default). */
  proposed?: string;
  /** The Proposals view narrowed to one stage of the proposal flow (CS-688): "discuss", "shaping", "ready" or "later" (every stage by default). */
  stage?: string;
}
/** The roadmap IDs the retired Dependencies view answered to. */
const OLD_DEPENDENCIES: ReadonlySet<unknown> = new Set([
  "deps",
  "waves",
  "matrix",
]);
/** A view's ID on the Work page: a short lowercase slug (workModel.ts, VIEW_ID). */
const viewIdIn = (v: unknown) =>
  typeof v === "string" && /^[a-z][a-z0-9-]{0,23}$/.test(v) ? v : undefined;
/** The tracker's board (CS-170): it reads the work items on this branch. */
export const workRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/work",
  validateSearch: (s: Record<string, unknown>): WorkSearch =>
    clean({
      // A view's ID: the Work page's shell (CS-744) mounts views by file
      // and shows the first when the ID names none of them.
      view: viewIdIn(s.view),
      project: str(s.project),
      milestone: str(s.milestone),
      q: str(s.q),
      list: str(s.list),
      item: str(s.item),
      release: str(s.release),
      // The Dependencies view (CS-694, with its "waves" and "matrix"
      // links before it) retired into Path (CS-775): old links land on
      // Path, and `moved` makes the page say so.
      roadmap: OLD_DEPENDENCIES.has(s.roadmap) ? "path" : viewIdIn(s.roadmap),
      focus: str(s.focus),
      moved:
        OLD_DEPENDENCIES.has(s.roadmap) || s.moved === "deps"
          ? "deps"
          : undefined,
      proposed: s.proposed === "show" ? "show" : undefined,
      stage:
        s.stage === "discuss" ||
        s.stage === "shaping" ||
        s.stage === "ready" ||
        s.stage === "later"
          ? s.stage
          : undefined,
    }),
  component: lazyRouteComponent(() => import("./views/Work.tsx"), "Work"),
});

// ------------------------------------------------------------ results

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: () => {
    throw redirect({ to: "/overview" });
  },
});

export const overviewRoute = createRoute({
  getParentRoute: () => runsLayoutRoute,
  path: "/overview",
  component: lazyRouteComponent(
    () => import("./views/Overview.tsx"),
    "Overview",
  ),
});

export interface TrendsSearch {
  /** Scene key, or "*" for all scenes (geometric mean). */
  scene?: string;
  split?: boolean;
  base?: string;
  cand?: string;
  /** Run name pinned as the reference. */
  pin?: string;
}
export const trendsRoute = createRoute({
  getParentRoute: () => runsLayoutRoute,
  path: "/trends",
  validateSearch: (s: Record<string, unknown>): TrendsSearch =>
    clean({
      scene: str(s.scene),
      split: bool(s.split),
      base: str(s.base),
      cand: str(s.cand),
      pin: str(s.pin),
    }),
  component: lazyRouteComponent(() => import("./views/Trends.tsx"), "Trends"),
});

export interface RunsSearch {
  q?: string;
}
export const runsRoute = createRoute({
  getParentRoute: () => runsLayoutRoute,
  path: "/runs",
  validateSearch: (s: Record<string, unknown>): RunsSearch =>
    clean({ q: str(s.q) }),
  component: lazyRouteComponent(() => import("./views/Runs.tsx"), "Runs"),
});

/** One run's report; `$run` is the results file's name. */
export const runRoute = createRoute({
  getParentRoute: () => runsLayoutRoute,
  path: "/runs/$run",
  component: lazyRouteComponent(() => import("./views/Report.tsx"), "Report"),
});

export interface CompareSearch {
  a?: string;
  b?: string;
  config?: string;
}
export const compareRoute = createRoute({
  getParentRoute: () => runsLayoutRoute,
  path: "/compare",
  validateSearch: (s: Record<string, unknown>): CompareSearch =>
    clean({ a: str(s.a), b: str(s.b), config: str(s.config) }),
  component: lazyRouteComponent(() => import("./views/Compare.tsx"), "Compare"),
});

export interface AlertsSearch {
  kind?: "regression" | "improvement" | "all";
}
export const alertsRoute = createRoute({
  getParentRoute: () => runsLayoutRoute,
  path: "/alerts",
  validateSearch: (s: Record<string, unknown>): AlertsSearch =>
    clean({
      kind:
        s.kind === "improvement" || s.kind === "all"
          ? (s.kind as AlertsSearch["kind"])
          : undefined,
    }),
  component: lazyRouteComponent(() => import("./views/Alerts.tsx"), "Alerts"),
});

// ------------------------------------------------------------ scenes

export const scenesRoute = createRoute({
  getParentRoute: () => runsLayoutRoute,
  path: "/scenes",
  component: lazyRouteComponent(() => import("./views/Scenes.tsx"), "Scenes"),
});

export interface SceneLiveSearch {
  left?: string;
  /** Empty: one engine only. */
  right?: string;
  /** Place on the camera path, 0 to 1. */
  t?: number;
  /** The 1.x build this page loaded ("repo" or a version). */
  cesium?: string;
}
const liveSearch = (s: Record<string, unknown>): SceneLiveSearch =>
  clean({
    left: str(s.left),
    right: s.right === "" ? "" : str(s.right),
    t: num(s.t),
    cesium: str(s.cesium),
  });

/**
 * A scene's page; `$scene` is its key (scene id, or id|scenario). Its
 * search is the live view's (engines, place on the path, 1.x build).
 */
export const sceneRoute = createRoute({
  getParentRoute: () => runsLayoutRoute,
  path: "/scenes/$scene",
  validateSearch: liveSearch,
  component: lazyRouteComponent(
    () => import("./views/Scenes.tsx"),
    "ScenePage",
  ),
});

export interface ViewerSearch {
  /** "2.0" (the working tree) or a 1.x release. */
  engine?: string;
  model?: string;
  tileset?: string;
  /** A Cesium ion asset id. */
  asset?: string;
  imodel?: string;
  scene?: string;
  /** Where to look: longitude,latitude[,range] (degrees, meters). */
  at?: string;
}
export const viewerRoute = createRoute({
  getParentRoute: () => runsLayoutRoute,
  path: "/viewer",
  validateSearch: (s: Record<string, unknown>): ViewerSearch =>
    clean({
      engine: str(s.engine),
      model: str(s.model),
      tileset: str(s.tileset),
      asset: str(s.asset),
      imodel: str(s.imodel),
      scene: str(s.scene),
      at: str(s.at),
    }),
  component: lazyRouteComponent(() => import("./views/Viewer.tsx"), "Viewer"),
});

export interface ImagesSearch {
  run?: string;
  check?: string;
}
export const imagesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/images",
  validateSearch: (s: Record<string, unknown>): ImagesSearch =>
    clean({ run: str(s.run), check: str(s.check) }),
  component: lazyRouteComponent(() => import("./views/Images.tsx"), "Images"),
});

/** The gallery (docs/design/examples-and-the-gallery.md): examples in one viewer, with their source. */
export const examplesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/examples",
  component: lazyRouteComponent(
    () => import("./views/Examples.tsx"),
    "Examples",
  ),
});
export const exampleRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/examples/$id",
  // Free-form text, the example's own (its deep links); `/examples/$id`
  // links carry none, so switching examples clears them.
  validateSearch: (s: Record<string, unknown>) => searchToParams(s),
  component: lazyRouteComponent(
    () => import("./views/Examples.tsx"),
    "ExamplePage",
  ),
});

// ------------------------------------------------------------ experiment

export interface AnalysisSearch {
  sweep?: string;
  scene?: string;
}
export const analysisRoute = createRoute({
  getParentRoute: () => runsLayoutRoute,
  path: "/analysis",
  // Machines moved into the Overview (rail.ts `movedTo`).
  beforeLoad: ({ location }) => {
    const moved = movedTo(
      location.pathname,
      location.search as Record<string, unknown>,
    );
    if (moved) {
      throw redirect({ to: moved.to, hash: moved.hash, replace: true });
    }
  },
  validateSearch: (s: Record<string, unknown>): AnalysisSearch =>
    clean({ sweep: str(s.sweep), scene: str(s.scene) }),
  component: lazyRouteComponent(
    () => import("./views/Analysis.tsx"),
    "Analysis",
  ),
});

/** Parity checks, microbenchmarks and spikes (lab/pages.ts). */
export const labRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/lab",
  component: lazyRouteComponent(() => import("./views/Lab.tsx"), "Lab"),
});
export const labPageRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/lab/$id",
  // A page's own options (?only=, ?asset=, …) pass through as strings.
  validateSearch: (s: Record<string, unknown>): Record<string, string> =>
    Object.fromEntries(
      Object.entries(s).flatMap(([k, v]) =>
        v === undefined ? [] : [[k, String(v)]],
      ),
    ),
  component: lazyRouteComponent(() => import("./views/Lab.tsx"), "LabPage"),
});

/** Getting started: the setup checked and a first run. */
export const startRoute = createRoute({
  getParentRoute: () => runsLayoutRoute,
  path: "/start",
  component: lazyRouteComponent(
    () => import("./views/FirstRun.tsx"),
    "FirstRun",
  ),
});

export const routeTree = rootRoute.addChildren([
  indexRoute,
  runsLayoutRoute.addChildren([
    overviewRoute,
    trendsRoute,
    runsRoute,
    runRoute,
    compareRoute,
    alertsRoute,
    scenesRoute,
    sceneRoute,
    viewerRoute,
    analysisRoute,
    startRoute,
  ]),
  workRoute,
  imagesRoute,
  examplesRoute,
  exampleRoute,
  labRoute,
  labPageRoute,
]);
