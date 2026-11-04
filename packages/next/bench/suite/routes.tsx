import {
  createRootRoute,
  createRoute,
  lazyRouteComponent,
  redirect,
} from "@tanstack/react-router";
import { loadRuns } from "./data.ts";
import { Shell, ShellError, ShellPending } from "./shell.tsx";

/**
 * Dyno's routes (hash history: /#/overview?…), following the navigation
 * in DESIGN.md. Each view is its own chunk, loaded on first visit; its
 * state is the route's path and search params, validated here so views
 * get typed values and links stay shareable. The root loader reads the
 * runs once for every view.
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

export const rootRoute = createRootRoute({
  component: Shell,
  loader: loadRuns,
  pendingComponent: ShellPending,
  errorComponent: ShellError,
  // The runs don't change while the page is open (reload for new runs).
  staleTime: Infinity,
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
  getParentRoute: () => rootRoute,
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
  getParentRoute: () => rootRoute,
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
  getParentRoute: () => rootRoute,
  path: "/runs",
  validateSearch: (s: Record<string, unknown>): RunsSearch =>
    clean({ q: str(s.q) }),
  component: lazyRouteComponent(() => import("./views/Runs.tsx"), "Runs"),
});

/** One run's report; `$run` is the results file's name. */
export const runRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/runs/$run",
  component: lazyRouteComponent(() => import("./views/Report.tsx"), "Report"),
});

export interface CompareSearch {
  a?: string;
  b?: string;
  config?: string;
}
export const compareRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/compare",
  validateSearch: (s: Record<string, unknown>): CompareSearch =>
    clean({ a: str(s.a), b: str(s.b), config: str(s.config) }),
  component: lazyRouteComponent(() => import("./views/Compare.tsx"), "Compare"),
});

export interface AlertsSearch {
  kind?: "regression" | "improvement" | "all";
}
export const alertsRoute = createRoute({
  getParentRoute: () => rootRoute,
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
  getParentRoute: () => rootRoute,
  path: "/scenes",
  component: lazyRouteComponent(() => import("./views/Scenes.tsx"), "Scenes"),
});

/** A scene's page; `$scene` is its key (scene id, or id|scenario). */
export const sceneRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/scenes/$scene",
  component: lazyRouteComponent(
    () => import("./views/Scenes.tsx"),
    "ScenePage",
  ),
});

export interface ExplorerSearch {
  scene?: string;
  left?: string;
  /** Empty: one engine only. */
  right?: string;
  /** Place on the camera path, 0 to 1. */
  t?: number;
  /** The 1.x build this page loaded ("repo" or a version). */
  cesium?: string;
}
export const explorerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/explorer",
  validateSearch: (s: Record<string, unknown>): ExplorerSearch =>
    clean({
      scene: str(s.scene),
      left: str(s.left),
      right: s.right === "" ? "" : str(s.right),
      t: num(s.t),
      cesium: str(s.cesium),
    }),
  component: lazyRouteComponent(
    () => import("./views/Explorer.tsx"),
    "Explorer",
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
  getParentRoute: () => rootRoute,
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

/** The gallery (plan §13.12): examples in one viewer, with their source. */
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
  component: lazyRouteComponent(
    () => import("./views/Examples.tsx"),
    "ExamplePage",
  ),
});

// ------------------------------------------------------------ workbench

export interface AnalysisSearch {
  /** Sweeps (the default) or machines. */
  tab?: "machines";
  sweep?: string;
  scene?: string;
}
export const analysisRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/analysis",
  validateSearch: (s: Record<string, unknown>): AnalysisSearch =>
    clean({
      tab: s.tab === "machines" ? ("machines" as const) : undefined,
      sweep: str(s.sweep),
      scene: str(s.scene),
    }),
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
  getParentRoute: () => rootRoute,
  path: "/start",
  component: lazyRouteComponent(
    () => import("./views/FirstRun.tsx"),
    "FirstRun",
  ),
});

export const routeTree = rootRoute.addChildren([
  indexRoute,
  overviewRoute,
  trendsRoute,
  runsRoute,
  runRoute,
  compareRoute,
  alertsRoute,
  scenesRoute,
  sceneRoute,
  explorerRoute,
  viewerRoute,
  imagesRoute,
  examplesRoute,
  exampleRoute,
  analysisRoute,
  labRoute,
  labPageRoute,
  startRoute,
]);
