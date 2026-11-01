import {
  createRootRoute,
  createRoute,
  lazyRouteComponent,
  redirect,
} from "@tanstack/react-router";
import { loadRuns } from "./data.ts";
import { Shell, ShellError, ShellPending } from "./shell.tsx";

/**
 * Dyno's routes (hash history: /#/workspace?…). Each view is
 * its own chunk, loaded on first visit; its state is the route's search
 * params, validated here so views get typed values and links stay
 * shareable. The root loader reads the runs once for every view.
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

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: () => {
    throw redirect({ to: "/workspace" });
  },
});

export interface WorkspaceSearch {
  /** Scene key, or "*" for all scenes (geometric mean). */
  scene?: string;
  split?: boolean;
  base?: string;
  cand?: string;
  /** Run name pinned as the reference. */
  pin?: string;
}
export const workspaceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/workspace",
  validateSearch: (s: Record<string, unknown>): WorkspaceSearch =>
    clean({
      scene: str(s.scene),
      split: bool(s.split),
      base: str(s.base),
      cand: str(s.cand),
      pin: str(s.pin),
    }),
  component: lazyRouteComponent(
    () => import("./views/Workspace.tsx"),
    "Workspace",
  ),
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

export interface ReportSearch {
  run?: string;
}
export const reportRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/report",
  validateSearch: (s: Record<string, unknown>): ReportSearch =>
    clean({ run: str(s.run) }),
  component: lazyRouteComponent(() => import("./views/Report.tsx"), "Report"),
});

export interface ScenesSearch {
  /** A scene key: its page; none lists the scenes. */
  scene?: string;
}
export const scenesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/scenes",
  validateSearch: (s: Record<string, unknown>): ScenesSearch =>
    clean({ scene: str(s.scene) }),
  component: lazyRouteComponent(() => import("./views/Scenes.tsx"), "Scenes"),
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

export interface SweepsSearch {
  sweep?: string;
  scene?: string;
}
export const sweepsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/sweeps",
  validateSearch: (s: Record<string, unknown>): SweepsSearch =>
    clean({ sweep: str(s.sweep), scene: str(s.scene) }),
  component: lazyRouteComponent(() => import("./views/Sweeps.tsx"), "Sweeps"),
});

export const hardwareRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/hardware",
  component: lazyRouteComponent(
    () => import("./views/Hardware.tsx"),
    "Hardware",
  ),
});

/** The guided first run, also reachable once runs exist. */
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
  startRoute,
  workspaceRoute,
  alertsRoute,
  runsRoute,
  compareRoute,
  reportRoute,
  scenesRoute,
  explorerRoute,
  imagesRoute,
  sweepsRoute,
  hardwareRoute,
]);
