// The panel's model as a pure function of the page's state (plan 4b Task
// 18): what the panel and the HUD render, from a snapshot main.ts takes.
// No engine in it, so it is tested in Node (test/designGlobePage.test.ts).
import { ANCHOR_STATION } from "./corridor.ts";
import type { SagSample } from "./overlays.ts";
import { fixed, unitSymbol } from "./measureModel.ts";
import {
  EXAGGERATION,
  SITES,
  errorText,
  siteGridText,
  type LoadItem,
  type PageParams,
  type Placement,
  type SiteEntry,
} from "./page.ts";
import type {
  CursorView,
  PanelModel,
  SagView,
  SiteView,
} from "./panel/model.ts";

/** One site as the model reads it. */
export interface SiteSnapshot {
  readonly entry: SiteEntry;
  /** Its two placements' tiles are in, paired (the morph works). */
  readonly paired: boolean;
  /** Its loads are under way or done. */
  readonly started: boolean;
  /** Some of its tiles are drawn (its tilesets are in). */
  readonly drawn: boolean;
  readonly view?: Pick<SiteView, "frame" | "story">;
}

/** The page's state, as the model reads it. */
export interface PageSnapshot {
  readonly params: PageParams;
  readonly loading: readonly LoadItem[];
  readonly t: number;
  readonly morphing: boolean;
  readonly ghost: boolean;
  readonly exaggerate: boolean;
  readonly sites: ReadonlyMap<string, SiteSnapshot>;
  readonly samples?: readonly SagSample[];
  readonly anchorStation?: number;
  /** The alignment's stations, for the sag chart. */
  readonly stations: { readonly start: number; readonly end: number };
  readonly cursor: CursorView;
  /** Each ladder site's extent from the generator's answers, metres. */
  readonly extents?: ReadonlyMap<string, number>;
  /** Each ladder site's rigid error at its edge (answers), metres: its whiskers' range. */
  readonly edgeErrors?: ReadonlyMap<string, number>;
  /** Where "Fly along" starts: the self-check's station (the opening shot's), station. */
  readonly alongFrom?: number;
  /** The camera flies along the corridor now. */
  readonly flyingAlong: boolean;
  /** The whiskers and the ring are drawn. */
  readonly evidence: boolean;
}

/** A site's design unit symbol, from its CRS (US survey feet for California zone 3). */
function unitOf(entry: SiteEntry): string {
  const crs = entry.crs;
  return crs.format === "wkid" && crs.wkid === 6420
    ? unitSymbol("US survey foot")
    : crs.format === "wkid" && crs.wkid === 6405
      ? unitSymbol("foot")
      : "m";
}

/** "EPSG:6420+6360  ·  GEOID18": a site row's second line. */
export function siteSummary(entry: SiteEntry): string {
  return `${entry.codes}  ·  ${entry.models.join(" + ")}`;
}

/** A length in words: "73 m", "3.97 km". */
const lengthText = (m: number): string =>
  m >= 1000 ? `${fixed(m / 1000, m >= 10_000 ? 1 : 2)} km` : `${fixed(m, 0)} m`;

/**
 * A ladder row's second line: "73 m across; rigid 2.6 mm off at its edge"
 * (its story's, else the answers'), or its codes until either is in.
 */
export function siteRow(
  entry: SiteEntry,
  story: SiteView["story"],
  answer: { readonly extent?: number; readonly edgeError?: number },
): string {
  if (story !== undefined) {
    return `${story.extent}; rigid ${story.edgeError} off at its edge`;
  }
  if (answer.extent !== undefined && answer.edgeError !== undefined) {
    return `${lengthText(answer.extent)} across; rigid ${errorText(answer.edgeError)} off at its edge`;
  }
  return siteSummary(entry);
}

/** "station 920+21". */
export const stationShort = (station: number): string =>
  `station ${Math.floor(station / 100)}+${String(Math.round(station % 100)).padStart(2, "0")}`;

export function buildPanelModel(s: PageSnapshot): PanelModel {
  const corridor = s.sites.get("corridor")!;
  const selected = s.sites.get(s.params.site) ?? corridor;
  const paired = selected.paired;
  const twoTilesets =
    paired || selected.entry.tilesets.reprojected !== undefined;
  // A site with one tileset is drawn rigid, whatever the page's mode.
  const solid: Placement = !twoTilesets
    ? "rigid"
    : s.t >= 0.5
      ? "reprojected"
      : "rigid";
  const samples = s.samples;
  const worst =
    samples !== undefined
      ? Math.max(...samples.map((x) => x.error))
      : undefined;
  const isCorridor = selected === corridor;
  const sag: SagView | undefined =
    isCorridor &&
    samples !== undefined &&
    s.anchorStation !== undefined &&
    worst !== undefined
      ? (() => {
          const max = samples.reduce((a, b) => (b.error > a.error ? b : a));
          return {
            points: samples.map((x) => [x.station, x.error] as const),
            anchorStation: s.anchorStation,
            startStation: s.stations.start,
            endStation: s.stations.end,
            max: max.error,
            maxStation: max.station,
            caption: `Rigid is exact at the anchor and ${errorText(max.error)} off at the far end; reprojected draws every vertex through ${corridor.entry.codes}, by PROJ.`,
          };
        })()
      : undefined;
  // Smallest first by the generator's exact extents once they're in (the
  // ladder), by the footprints' before; the corridor last.
  const size = (e: SiteEntry) => s.extents?.get(e.id) ?? e.extent;
  const ordered = [
    ...SITES.filter((e) => e.id !== "corridor").sort(
      (a, b) => size(a) - size(b),
    ),
    corridor.entry,
  ];
  const sites: SiteView[] = ordered.map((entry) => {
    const site = s.sites.get(entry.id)!;
    return {
      id: entry.id,
      name: entry.name,
      place: entry.place,
      summary: siteSummary(entry),
      row: siteRow(entry, site.view?.story, {
        extent: s.extents?.get(entry.id),
        edgeError: s.edgeErrors?.get(entry.id),
      }),
      selected: entry.id === s.params.site,
      busy: site.started && site.view === undefined,
      // "Rigid only" once its tiles say so: a ladder site's pair is probed
      // when it loads.
      paired:
        site.paired ||
        (!site.drawn &&
          (entry.tilesets.reprojected !== undefined ||
            entry.tilesets.pair !== undefined)),
      ...(entry.fallback && { fallback: `${entry.fallback} fallback` }),
      ...(site.view?.frame && { frame: site.view.frame }),
      ...(site.view?.story && { story: site.view.story }),
    };
  });
  const anchor = stationShort(s.anchorStation ?? ANCHOR_STATION);
  const solidText = !twoTilesets
    ? "Rigid: this site's one tileset"
    : solid === "rigid"
      ? isCorridor
        ? `Rigid, anchored at ${anchor} (${fixed(s.anchorStation ?? ANCHOR_STATION, 0)} ftUS along the road)`
        : "Rigid, anchored at its middle"
      : `Reprojected through ${selected.entry.codes}`;
  return {
    loading: s.loading,
    mode: twoTilesets ? s.params.mode : "rigid",
    morphing: s.morphing,
    // Off while there is no other placement to show or exaggerate.
    ghost: paired && s.ghost,
    exaggerate: paired && s.exaggerate,
    exaggeration: EXAGGERATION,
    switchable: paired,
    ...(!paired && {
      switchNote: twoTilesets
        ? "The switch works once both placements' tiles are in."
        : selected.entry.frame.site !== undefined
          ? `Drawn rigid: one tileset, on a site grid (${siteGridText(selected.entry.frame.site, unitOf(selected.entry))}). Rigid by design: its rigid error is in its story below.`
          : "Drawn rigid: one tileset. Its rigid error is in its story below.",
    }),
    ...(sag && { sag }),
    ...(samples !== undefined &&
      s.alongFrom !== undefined && {
        alongNote: (() => {
          const at = samples.reduce((a, b) =>
            Math.abs(b.station - s.alongFrom!) <
            Math.abs(a.station - s.alongFrom!)
              ? b
              : a,
          );
          return `From ${stationShort(s.alongFrom!)}, where rigid is ${errorText(at.error)} off, down the corridor to the anchor.`;
        })(),
      }),
    drawn: selected.drawn,
    flyAlong: !isCorridor
      ? "hidden"
      : s.flyingAlong
        ? "running"
        : samples
          ? "ready"
          : "unavailable",
    sites,
    cursor: s.cursor,
    legend: {
      solid,
      solidText,
      ...(s.ghost &&
        paired && {
          ghostText:
            solid === "rigid"
              ? "Reprojected, where it truly is (ghost)"
              : "Rigid, where one transform puts it (ghost)",
        }),
      ...(s.t < 1 &&
        (isCorridor
          ? s.evidence &&
            worst !== undefined && {
              whiskers: { min: "0 m", max: errorText(worst) },
            }
          : paired &&
            s.edgeErrors?.get(selected.entry.id) !== undefined && {
              whiskers: {
                min: "0 m",
                max: errorText(s.edgeErrors.get(selected.entry.id)!),
              },
            })),
      anchor: isCorridor && s.evidence,
      exaggeration: paired ? (s.exaggerate ? EXAGGERATION : 1) : 1,
    },
  };
}
