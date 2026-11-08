// The design globe page's state model (plan 4b Task 18): what main.ts keeps
// and the panel reads, as plain functions with no engine in them, so the
// tests run it in Node (test/designGlobePage.test.ts):
//  - the deep link's parameters (`mode`, `site`, `snap`), each falling back
//    to its default on its own;
//  - the loading states (PROJ, the grid catalog, each grid with its bytes,
//    each site's tiles), in the order their first event came;
//  - the placement morph's timing (`retargetMorph`, `morphValue`): a small
//    wall-clock tween that plan 5's animation core can replace;
//  - the portfolio, smallest first (the scale ladder), and the words the
//    panel and the HUD use for an error, a verdict and the cursor.
import { CORRIDOR_ALIGNMENT, CORRIDOR_CRS, corridorFrame } from "./corridor.ts";
import { fixed, stationText } from "./measureModel.ts";
import {
  LADDER,
  SITE_BUILDING,
  modelAnchor,
  modelFootprint,
  modelOnGround,
  modelRoute,
  type PortfolioSite,
} from "./sites.ts";
import type { CrsRef } from "../../src/engineering/crs.ts";
import type { EngineeringFrameDefinition } from "../../src/engineering/EngineeringFrame.ts";

// ------------------------------------------------------------------ params

export type Placement = "rigid" | "reprojected";
export type SnapMode = "exact" | "geometry" | "none";

/** What the page's link carries. */
export interface PageParams {
  /** The placement drawn solid; the other is the ghost. */
  readonly mode: Placement;
  /** The selected site (`SITES`). */
  readonly site: string;
  /** How the measure tool snaps (Task 19). */
  readonly snap: SnapMode;
}

export const DEFAULT_PARAMS: PageParams = {
  mode: "rigid",
  site: "corridor",
  snap: "exact",
};

const MODES: readonly Placement[] = ["rigid", "reprojected"];
const SNAPS: readonly SnapMode[] = ["exact", "geometry", "none"];

/** The value if it is one of `allowed`, else `fallback`. */
function oneOf<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
  fallback: T,
): T {
  return value !== undefined && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

/** The link's parameters; an unknown value is its default, alone. */
export function parseParams(
  params: Readonly<Record<string, string | undefined>>,
): PageParams {
  const get = (key: string) =>
    Object.hasOwn(params, key) ? params[key] : undefined;
  return {
    mode: oneOf(get("mode"), MODES, DEFAULT_PARAMS.mode),
    site: oneOf(
      get("site"),
      SITES.map((s) => s.id),
      DEFAULT_PARAMS.site,
    ),
    snap: oneOf(get("snap"), SNAPS, DEFAULT_PARAMS.snap),
  };
}

/** The link's parameters for `p`, its defaults left out (`undefined`). */
export function formatParams(
  p: PageParams,
): Record<keyof PageParams, string | undefined> {
  const keep = <K extends keyof PageParams>(key: K) =>
    p[key] === DEFAULT_PARAMS[key] ? undefined : p[key];
  return { mode: keep("mode"), site: keep("site"), snap: keep("snap") };
}

// ----------------------------------------------------------------- loading

/**
 * One thing the page waits for. `waiting`: asked for, no bytes yet;
 * `fetching`: bytes arriving; then `ready`, `missing` (not in the store: the
 * one command to run) or `error` (what failed, with Retry).
 */
export type ItemState = "waiting" | "fetching" | "ready" | "missing" | "error";

export interface LoadItem {
  /** `proj`, `catalog`, `grid:<name>`, `tiles:<site>`. */
  readonly id: string;
  readonly label: string;
  readonly state: ItemState;
  /** While fetching: bytes so far, and the total once every file stated one. */
  readonly received?: number;
  readonly total?: number;
  /** When ready: the bytes fetched, if any were counted. */
  readonly bytes?: number;
  /** What failed, what is missing, or a ready item's one-line note. */
  readonly detail?: string;
  /** The one command that fixes it, shown as code. */
  readonly command?: string;
  /** The site it belongs to, when it is one site's own (shown only on that site). */
  readonly site?: string;
  /** The engine's own words for a failure, behind a disclosure. */
  readonly technical?: string;
  /** Bytes per file, for an item fetched as several (PROJ: glue, wasm, db). */
  readonly files?: Readonly<
    Record<string, { received: number; total?: number }>
  >;
}

export type LoadEvent =
  | {
      readonly type: "start";
      readonly id: string;
      readonly label: string;
      /** One site's own item (its tiles, its placements). */
      readonly site?: string;
    }
  /** The item is gone (its site was reloaded): it leaves the list. */
  | { readonly type: "clear"; readonly id: string }
  | {
      readonly type: "progress";
      readonly id: string;
      readonly label?: string;
      readonly file: string;
      readonly received: number;
      readonly total?: number;
    }
  | { readonly type: "ready"; readonly id: string; readonly detail?: string }
  | {
      readonly type: "missing" | "error";
      readonly id: string;
      readonly detail: string;
      /** The one command that fixes it (missing data: setup). */
      readonly command?: string;
      /** The engine's own message, shown behind a disclosure. */
      readonly technical?: string;
      /** One site's own item, when no start named it. */
      readonly site?: string;
    };

const FINAL: ReadonlySet<ItemState> = new Set(["ready", "missing", "error"]);

/** The bytes of an item's files: their sum, and a total once each has one. */
function sumFiles(files: NonNullable<LoadItem["files"]>): {
  received: number;
  total?: number;
} {
  const all = Object.values(files);
  const received = all.reduce((n, f) => n + f.received, 0);
  return all.every((f) => f.total !== undefined)
    ? { received, total: all.reduce((n, f) => n + f.total!, 0) }
    : { received };
}

/**
 * The items after `event`, in the order their first event came; the same
 * array when nothing changed. Progress starts an item it hasn't seen (a
 * grid announces itself by its bytes); `ready` sticks against late
 * progress or a late error; `missing` and `error` start again on `start`
 * (Retry).
 */
export function nextLoading(
  items: readonly LoadItem[],
  event: LoadEvent,
): readonly LoadItem[] {
  const at = items.findIndex((i) => i.id === event.id);
  const item = at >= 0 ? items[at] : undefined;
  const put = (next: LoadItem): readonly LoadItem[] =>
    at >= 0 ? items.with(at, next) : [...items, next];
  switch (event.type) {
    case "clear":
      return at >= 0 ? items.filter((_, i) => i !== at) : items;
    case "start":
      if (
        item !== undefined &&
        !(item.state === "missing" || item.state === "error")
      ) {
        return items;
      }
      return put({
        id: event.id,
        label: event.label,
        state: "waiting",
        ...(event.site !== undefined && { site: event.site }),
      });
    case "progress": {
      if (item !== undefined && FINAL.has(item.state)) {
        return items;
      }
      const files = {
        ...item?.files,
        [event.file]: {
          received: Math.max(
            event.received,
            item?.files?.[event.file]?.received ?? 0,
          ),
          ...(event.total !== undefined && { total: event.total }),
        },
      };
      const sum = sumFiles(files);
      return put({
        id: event.id,
        label: item?.label ?? event.label ?? event.id,
        state: "fetching",
        received: sum.received,
        ...(sum.total !== undefined && { total: sum.total }),
        files,
      });
    }
    case "ready": {
      if (item?.state === "ready") {
        return items;
      }
      // The whole body arrived: its stated total, else what was counted.
      const sum = item?.files ? sumFiles(item.files) : undefined;
      const bytes = sum && (sum.total ?? sum.received);
      return put({
        id: event.id,
        label: item?.label ?? event.id,
        state: "ready",
        ...(bytes !== undefined && bytes > 0 && { bytes }),
        ...(event.detail !== undefined && { detail: event.detail }),
      });
    }
    case "missing":
    case "error":
      if (item?.state === "ready") {
        return items;
      }
      return put({
        id: event.id,
        label: item?.label ?? event.id,
        state: event.type,
        detail: event.detail,
        ...(event.command !== undefined && { command: event.command }),
        ...(event.technical !== undefined && { technical: event.technical }),
        ...((event.site ?? item?.site) !== undefined && {
          site: (event.site ?? item?.site)!,
        }),
      });
  }
}

/** The items the selected site shows: everyone's, and its own (another site's stay on it). */
export function loadingFor(
  items: readonly LoadItem[],
  site: string,
): readonly LoadItem[] {
  return items.filter((i) => i.site === undefined || i.site === site);
}

/** The loading as one line: an error first, then missing data, then loading. */
export function loadingSummary(items: readonly LoadItem[]): {
  readonly state: "loading" | "ready" | "missing" | "error";
  /** The items that make it so. */
  readonly items: readonly LoadItem[];
} {
  for (const state of ["error", "missing"] as const) {
    const hit = items.filter((i) => i.state === state);
    if (hit.length > 0) {
      return { state, items: hit };
    }
  }
  const open = items.filter((i) => !FINAL.has(i.state));
  return open.length > 0
    ? { state: "loading", items: open }
    : { state: "ready", items };
}

/** "6.8 of 16.7 MB", "331 KB": bytes as the status rows say them. */
export function bytesText(received: number, total?: number): string {
  const unit = (total ?? received) >= 1e6 ? 1e6 : 1e3;
  const name = unit === 1e6 ? "MB" : "KB";
  const digits = unit === 1e6 ? 1 : 0;
  const r = fixed(received / unit, digits);
  return total === undefined
    ? `${r} ${name}`
    : `${r} of ${fixed(total / unit, digits)} ${name}`;
}

// ------------------------------------------------------------------ morph

/** The placement morph's length on the wall clock (owner: about 2 s). */
export const MORPH_MS = 2000;

/** Cubic ease in and out: 0 at 0, 1 at 1, ½ at ½. */
export function morphEase(u: number): number {
  const x = Math.min(1, Math.max(0, u));
  return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
}

/**
 * A morph between placements: `t` from `from` to `to` (0 rigid, 1
 * reprojected), eased, from `start` (ms, `performance.now()`) for
 * `duration` ms. Plan 5's animation core replaces this and `morphValue`.
 */
export interface MorphTween {
  readonly from: number;
  readonly to: number;
  readonly start: number;
  readonly duration: number;
}

/** The morph's `t` at `now`. */
export function morphValue(m: MorphTween, now: number): number {
  if (m.duration <= 0 || now >= m.start + m.duration) {
    return m.to;
  }
  const u = Math.max(0, (now - m.start) / m.duration);
  return m.from + (m.to - m.from) * morphEase(u);
}

/**
 * A morph toward `to` from wherever `current` is at `now` (rigid, 0, with
 * none), taking the share of `fullDuration` the distance left is: turned
 * back half-way, it takes half the time. `fullDuration` 0 (reduced motion)
 * switches at once.
 */
export function retargetMorph(
  current: MorphTween | undefined,
  to: number,
  now: number,
  fullDuration: number,
): MorphTween {
  const from = current === undefined ? 0 : morphValue(current, now);
  return {
    from,
    to,
    start: now,
    duration: fullDuration * Math.abs(to - from),
  };
}

/** The factor "Exaggerate the error" scales each rigid error by. */
export const EXAGGERATION = 10;

// ------------------------------------------------------------------ sites

/** A site on the portfolio list: the corridor, the site-grid building and the seven buildings. */
export interface SiteEntry {
  readonly id: string;
  readonly name: string;
  readonly place: string;
  /** Its civil time zone, by IANA name (the time controls show its clock). */
  readonly timeZone: string;
  readonly crs: CrsRef;
  /** "EPSG:6420+6360". */
  readonly codes: string;
  /** The grids its frame's operation reads (PROJ-data catalog names). */
  readonly grids: readonly string[];
  /** What the grids are, by the models' own names ("GEOID18"). */
  readonly models: readonly string[];
  /** About how far across it is, metres, for the order (the shown extent comes from PROJ). */
  readonly extent: number;
  /** Its tilesets in the store, under `/frames-data/design-globe/`. */
  readonly tilesets: {
    readonly rigid: string;
    /** Absent: one tileset only (a rigid one), until the scale ladder (Task 17b). */
    readonly reprojected?: string;
    /** Tried first, and the pair used when present (Task 17b's names). */
    readonly pair?: { readonly rigid: string; readonly reprojected: string };
  };
  /** The model's footprint corners at its ground, design units. */
  readonly corners?: readonly (readonly [number, number, number])[];
  /**
   * A model along a line (sites.ts `modelRoute`): its route at its ground
   * and its foundations' reach either side, design units. Its terrain is
   * clipped around the route, not over the footprint.
   */
  readonly route?: {
    readonly points: readonly (readonly [number, number, number])[];
    readonly halfWidth: number;
  };
  /** The model stands on the real ground: its terrain isn't clipped. */
  readonly onGround?: boolean;
  /** Where rigid is exact: the model's middle, design units. */
  readonly anchor?: readonly [number, number, number];
  readonly frame: EngineeringFrameDefinition;
  /** A fallback that applies (Jakarta's EGM96). */
  readonly fallback?: string;
}

/**
 * The grids' models as their publishers name them, for the site rows
 * (PROJ-data's catalog describes them only by the CRSs they connect).
 */
export const GRID_MODELS: Readonly<Record<string, string>> = {
  "us_noaa_g2018u0.tif": "GEOID18",
  "uk_os_OSGM15_GB.tif": "OSGM15",
  "uk_os_OSTN15_NTv2_OSGBtoETRS.tif": "OSTN15",
  "au_ga_AUSGeoid2020_20180201.tif": "AUSGeoid2020",
  "jp_gsi_jpgeo2024.tif": "JPGEO2024",
  "nl_nsgi_nlgeo2018.tif": "NLGEO2018",
  "nl_nsgi_rdtrans2018.tif": "RDNAPTRANS2018",
  "us_nga_egm96_15.tif": "EGM96",
};

/**
 * Metres per design unit for the order alone, by horizontal EPSG code:
 * California zone 3 in US survey feet, Arizona Central in international
 * feet, metres otherwise. What the page shows comes from PROJ.
 */
const ORDER_UNITS: Readonly<Record<number, number>> = {
  6420: 1200 / 3937,
  6405: 0.3048,
};

const codesOf = (crs: CrsRef): string =>
  crs.format === "wkid"
    ? `${crs.authority}:${crs.wkid}${crs.vcsWkid !== undefined ? `+${crs.vcsWkid}` : ""}`
    : crs.format.toUpperCase();

/**
 * A model's footprint corners at its ground (sites.ts `modelFootprint`),
 * design units, and the anchor rigid is exact at (`modelAnchor`).
 */
function siteEntry(site: PortfolioSite, store: string): SiteEntry {
  const corners = modelFootprint(site);
  const route = modelRoute(site);
  /** Across the footprint, design units: its diagonal. */
  const across = Math.hypot(
    corners[2]![0] - corners[0]![0],
    corners[2]![1] - corners[0]![1],
  );
  const unit =
    site.frame.crs.format === "wkid"
      ? (ORDER_UNITS[site.frame.crs.wkid] ?? 1)
      : 1;
  return {
    id: site.id,
    name: site.name,
    place: site.place,
    timeZone: site.timeZone,
    crs: site.frame.crs,
    codes: codesOf(site.frame.crs),
    grids: site.grids,
    models: site.grids.map((g) => GRID_MODELS[g] ?? g),
    extent: across * unit,
    tilesets: {
      rigid: `${store}/`,
      ...(store.startsWith("portfolio-") && {
        pair: {
          rigid: `${store}-rigid/`,
          reprojected: `${store}-reprojected/`,
        },
      }),
    },
    corners,
    ...(route !== undefined && { route }),
    ...(modelOnGround(site) && { onGround: true }),
    anchor: modelAnchor(site),
    frame: site.frame,
    ...(site.frame.geoidFallback !== undefined && {
      fallback: site.frame.geoidFallback,
    }),
  };
}

const CORRIDOR_LENGTH = CORRIDOR_ALIGNMENT.horizontal.reduce(
  (n, e) => n + e.length,
  0,
);

/** The highway corridor: both placements, always. */
export const CORRIDOR_SITE: SiteEntry = {
  id: "corridor",
  name: "Highway corridor",
  place: "Oakland hills toward the Livermore valley, California",
  timeZone: "America/Los_Angeles",
  crs: CORRIDOR_CRS,
  codes: codesOf(CORRIDOR_CRS),
  grids: ["us_noaa_g2018u0.tif"],
  models: ["GEOID18"],
  extent: CORRIDOR_LENGTH * (1200 / 3937),
  tilesets: {
    rigid: "corridor-rigid/",
    reprojected: "corridor-reprojected/",
  },
  frame: corridorFrame(),
};

/**
 * The portfolio, smallest first (owner, 2026-11-07: a scale ladder), the
 * corridor last. Task 17b replaces the buildings' models with the ladder's
 * and gives each site both placements.
 */
export const SITES: readonly SiteEntry[] = [
  siteEntry(SITE_BUILDING, "site-building"),
  ...LADDER.map((s) => siteEntry(s, `portfolio-${s.id}`)),
]
  .sort((a, b) => a.extent - b.extent)
  .concat([CORRIDOR_SITE]);

export const siteById = (id: string): SiteEntry =>
  SITES.find((s) => s.id === id) ?? CORRIDOR_SITE;

// ------------------------------------------------------------------ words

/**
 * A site grid in words: "origin E 6,050,000.000, N 2,100,000.000 ftUS;
 * rotated 12.5° from grid east; scale 1.0000375".
 */
export function siteGridText(
  site: {
    readonly origin: readonly [number, number, number];
    readonly rotation: number;
    readonly scale: number;
  },
  symbol: string,
): string {
  const degrees = (site.rotation * 180) / Math.PI;
  return `origin E ${fixed(site.origin[0], 3)}, N ${fixed(site.origin[1], 3)} ${symbol}; rotated ${fixed(degrees, 1)}° from grid east; scale ${site.scale}`;
}

/** A rigid error as the panel and HUD say it: "31.6 m", "84 mm", "0.3 mm". */
export function errorText(meters: number): string {
  const a = Math.abs(meters);
  if (a === 0) {
    return "0 mm";
  }
  if (a >= 0.9995) {
    return `${fixed(a, 1)} m`;
  }
  if (a >= 0.00995) {
    return `${fixed(a * 1000, 0)} mm`;
  }
  if (a >= 0.00005) {
    return `${fixed(a * 1000, 1)} mm`;
  }
  return "under 0.1 mm";
}

/**
 * Below this, rigid is a fine approximation: a centimetre, about the
 * placement accuracy of a good survey and finer than any national geoid's.
 */
export const RIGID_ACCEPTABLE_M = 0.01;

/** Whether rigid will do for a model with this error at its edge, in one line. */
export function rigidVerdict(edgeError: number): {
  readonly acceptable: boolean;
  readonly text: string;
} {
  if (edgeError < RIGID_ACCEPTABLE_M) {
    return {
      acceptable: true,
      text: "Rigid is a fine approximation here: under a centimetre.",
    };
  }
  if (edgeError < 1) {
    return {
      acceptable: false,
      text: "More than a centimetre: rigid misplaces the edge; reproject it.",
    };
  }
  return {
    acceptable: false,
    text: "Rigid can't place it: reproject it.",
  };
}

/** What the HUD's cursor line says, and whether a pick there gives design coordinates. */
export function cursorReadout(state: {
  readonly mode: Placement;
  readonly morphing: boolean;
  readonly exaggeration: number;
  /** The design point under the cursor, when a pick found one. */
  readonly hit?: {
    readonly error: number;
    readonly station?: number;
    readonly offset?: number;
  };
}): { readonly design: boolean; readonly text: string } {
  if (state.morphing) {
    return {
      design: false,
      text: "Moving between placements: no design coordinates until it settles.",
    };
  }
  if (state.exaggeration !== 1 && state.mode === "rigid") {
    return {
      design: false,
      text: `Errors drawn ×${state.exaggeration}: no design coordinates while exaggerated.`,
    };
  }
  const hit = state.hit;
  if (hit === undefined) {
    return {
      design: true,
      text:
        state.mode === "rigid"
          ? "Point at the model to read the rigid error there."
          : "Point at the model to read its design coordinates.",
    };
  }
  const where =
    hit.station !== undefined ? ` at station ${stationText(hit.station)}` : "";
  return {
    design: true,
    text:
      state.mode === "rigid"
        ? `Rigid draws this ${errorText(hit.error)} from where it is${where}.`
        : `Drawn where it is${where}; rigid would be ${errorText(hit.error)} off.`,
  };
}

/**
 * Why a pick on the drawn geometry gives no design coordinates, or
 * undefined when it does: the geometry is between placements (a morph), the
 * rigid placement is drawn exaggerated, or the hit isn't on the tileset
 * whose placement is drawn (a tile drawn at the other end of a morph).
 * The measure tool's seam (cursor.ts `pickAt`) applies it to every pick.
 */
export function designRefusal(state: {
  readonly mode: Placement;
  readonly morphing: boolean;
  readonly exaggeration: number;
  /** The hit tileset's placement is the one drawn there now. */
  readonly hitIsDrawn: boolean;
}): string | undefined {
  if (state.morphing) {
    return "Moving between placements: no design coordinates until it settles.";
  }
  if (state.mode === "rigid" && state.exaggeration !== 1) {
    return `Errors drawn ×${state.exaggeration}: no design coordinates while exaggerated.`;
  }
  if (!state.hitIsDrawn) {
    return "That placement is not drawn here now: no design coordinates.";
  }
  return undefined;
}

/**
 * What a probe of a store file says: `ok` (JSON), `missing` (404, or a dev
 * server's page for a file it hasn't: run setup) or `error` (the server
 * failed, or there was no answer: Retry).
 */
export function probeVerdict(
  status: number | undefined,
  contentType: string | undefined,
): "ok" | "missing" | "error" {
  if (
    status === undefined ||
    status >= 500 ||
    (status >= 400 && status !== 404)
  ) {
    return "error";
  }
  if (status === 404) {
    return "missing";
  }
  return /json/.test(contentType ?? "") ? "ok" : "missing";
}
