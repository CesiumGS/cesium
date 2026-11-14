/**
 * Dyno's navigation rail as data (DESIGN.md, "Information architecture"):
 * the groups by what people come to do, each destination's route and
 * shortcut, which rail item a page highlights, and where old links land.
 * The shell (shell.tsx) draws it; tests read it without a browser.
 */

/** The jobs people come to Dyno for, in rail order (DESIGN.md's names). */
export type RailGroup = "Needs a look" | "Results" | "Look" | "Experiment";

export interface Destination {
  to: string;
  label: string;
  group: RailGroup;
  /** g then this letter. */
  key: string;
  /** What the page is for, in the palette and the shortcuts list. */
  hint: string;
}

/**
 * The rail, top to bottom. The groups show as dividers; their names live
 * in DESIGN.md (StrataKit's rail has no section headings yet).
 */
export const DESTINATIONS: readonly Destination[] = [
  {
    to: "/work",
    label: "Work",
    group: "Needs a look",
    key: "w",
    hint: "The tracker's items on this branch: ready, blocked, decisions waiting on the owner",
  },
  {
    to: "/overview",
    label: "Overview",
    group: "Needs a look",
    key: "o",
    hint: "Where 2.0 stands against 1.x, and on each machine",
  },
  {
    to: "/alerts",
    label: "Alerts",
    group: "Needs a look",
    key: "a",
    hint: "Metrics that changed and stayed changed, to triage",
  },
  {
    to: "/images",
    label: "Images",
    group: "Needs a look",
    key: "i",
    hint: "Image checks that changed or are new, to approve or reject",
  },
  {
    to: "/trends",
    label: "Trends",
    group: "Results",
    key: "t",
    hint: "Metrics run to run",
  },
  {
    to: "/runs",
    label: "Runs",
    group: "Results",
    key: "r",
    hint: "Every run: a run's report, or two compared",
  },
  {
    to: "/scenes",
    label: "Scenes",
    group: "Results",
    key: "s",
    hint: "The catalog, and each scene's history",
  },
  {
    to: "/viewer",
    label: "Viewer",
    group: "Look",
    key: "v",
    hint: "Any content in one engine, to debug",
  },
  {
    to: "/explorer",
    label: "Explorer",
    group: "Look",
    key: "e",
    hint: "A scene live in one or two engines",
  },
  {
    to: "/examples",
    label: "Examples",
    group: "Look",
    key: "x",
    hint: "What 2.0 is for, one feature or use case each",
  },
  {
    to: "/analysis",
    label: "Analysis",
    group: "Experiment",
    key: "n",
    hint: "Sweeps: one setting varied, or a release range",
  },
  {
    to: "/lab",
    label: "Lab",
    group: "Experiment",
    key: "l",
    hint: "Focused checks and measurements, one engine behavior each",
  },
];

/** The rail's groups in order, each with its destinations. */
export const GROUPS: readonly (readonly Destination[])[] = (() => {
  const groups = new Map<RailGroup, Destination[]>();
  for (const d of DESTINATIONS) {
    groups.set(d.group, [...(groups.get(d.group) ?? []), d]);
  }
  return [...groups.values()];
})();

/** Pages off the rail, and the rail item each one highlights. */
const PARENTS: Record<string, string> = {
  "/compare": "/runs",
};

/**
 * The rail item a path belongs to: itself, its parent page (a run's
 * report highlights Runs), or nothing (Getting started is in the footer).
 */
export function destinationOf(path: string): Destination | undefined {
  const own = (p: string) =>
    DESTINATIONS.find((d) => p === d.to || p.startsWith(`${d.to}/`));
  const parent = PARENTS[path];
  return own(path) ?? (parent ? own(parent) : undefined);
}

/** The destination a `g` shortcut opens. */
export const destinationForKey = (key: string): Destination | undefined =>
  DESTINATIONS.find((d) => d.key === key);

/**
 * Where an old link lands now: `/analysis?tab=machines` (Machines moved
 * into the Overview) goes to the Overview's machines section. Anything
 * else stays put (undefined).
 */
export function movedTo(
  path: string,
  search: Readonly<Record<string, unknown>>,
): { to: string; hash?: string } | undefined {
  if (path === "/analysis" && search.tab === "machines") {
    return { to: "/overview", hash: "machines" };
  }
  return undefined;
}
