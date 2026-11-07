// The panel's model as a pure function of the page's state (plan 4b Task
// 18): what the panel and the HUD render, from a snapshot main.ts takes.
// No engine in it, so it is tested in Node (test/designGlobePage.test.ts).
import { ANCHOR_STATION } from "./corridor.ts";
import type { SagSample } from "./overlays.ts";
import {
  EXAGGERATION,
  SITES,
  errorText,
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
  /** The camera flies along the corridor now. */
  readonly flyingAlong: boolean;
  /** The whiskers and the ring are drawn. */
  readonly evidence: boolean;
}

/** "EPSG:6420+6360  ·  GEOID18": a site row's second line. */
export function siteSummary(entry: SiteEntry): string {
  return `${entry.codes}  ·  ${entry.models.join(" + ")}`;
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
  const solid: Placement = s.t >= 0.5 ? "reprojected" : "rigid";
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
            caption: `Rigid is exact at the anchor and ${errorText(max.error)} off at the far end; reprojected draws every vertex through ${corridor.entry.codes}, to its PROJ round trip.`,
          };
        })()
      : undefined;
  const sites: SiteView[] = SITES.map((entry) => {
    const site = s.sites.get(entry.id)!;
    return {
      id: entry.id,
      name: entry.name,
      place: entry.place,
      summary: siteSummary(entry),
      selected: entry.id === s.params.site,
      busy: site.started && site.view === undefined,
      paired: entry.tilesets.reprojected !== undefined || site.paired,
      ...(entry.fallback && { fallback: `${entry.fallback} fallback` }),
      ...(site.view?.frame && { frame: site.view.frame }),
      ...(site.view?.story && { story: site.view.story }),
    };
  });
  const anchor = stationShort(s.anchorStation ?? ANCHOR_STATION);
  const solidText = !twoTilesets
    ? "Rigid: this site's one tileset"
    : solid === "rigid"
      ? `Rigid, anchored at ${isCorridor ? anchor : "its middle"}`
      : `Reprojected through ${selected.entry.codes}`;
  return {
    loading: s.loading,
    mode: s.params.mode,
    morphing: s.morphing,
    ghost: s.ghost,
    exaggerate: s.exaggerate,
    exaggeration: EXAGGERATION,
    switchable: paired,
    ...(!paired && {
      switchNote: twoTilesets
        ? "The switch works once both placements' tiles are in."
        : "This site has one tileset, rigid, until its reprojected twin is generated (the scale ladder). Its rigid error is in its story below.",
    }),
    ...(sag && { sag }),
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
      ...(isCorridor &&
        s.evidence &&
        worst !== undefined &&
        s.t < 1 && { whiskers: { min: "0 m", max: errorText(worst) } }),
      anchor: isCorridor && s.evidence,
      exaggeration: paired ? (s.exaggerate ? EXAGGERATION : 1) : 1,
    },
  };
}
