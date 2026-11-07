// What the design globe's panel and HUD render (plan 4b Task 18), built by
// main.ts from the page's state (page.ts) and the loaded frames; the panel
// only reads it and calls `PanelActions`. Every string here is final copy:
// units and datums named, numbers stated once.
import type { LoadItem, Placement } from "../page.ts";

/** A site's frame as PROJ resolved it: "every country, done right". */
export interface SiteFrameView {
  /** The horizontal CRS's name ("NAD83(2011) / California zone 3 (ftUS)"). */
  readonly horizontal: string;
  /** The height system ("NAVD88 height (ftUS)"), when the CRS has one. */
  readonly vertical?: string;
  /** The design units, as PROJ names them, and their symbol. */
  readonly units: string;
  /** The operation's stated accuracy, or why it states none. */
  readonly accuracy: string;
  /** Grid credits, from the pinned licenses list. */
  readonly credits: readonly string[];
  /** A fallback that applies, and what it costs. */
  readonly fallback?: string;
}

/** One line of the story, from the site's own geometry. */
export interface SiteStory {
  /** "50.0 km long", "73 m across". */
  readonly extent: string;
  /** The rigid error at the model's farthest point from its anchor. */
  readonly edgeError: string;
  readonly acceptable: boolean;
  readonly verdict: string;
}

export interface SiteView {
  readonly id: string;
  readonly name: string;
  readonly place: string;
  /** "EPSG:6420+6360 · NAVD88 via GEOID18": the row's second line. */
  readonly summary: string;
  readonly selected: boolean;
  /** The site's tiles or frame are loading (fly-to waits). */
  readonly busy: boolean;
  /** The placements it has: both, or rigid alone until the ladder. */
  readonly paired: boolean;
  /** A fallback badge ("EGM96 fallback"). */
  readonly fallback?: string;
  /** Once its frame loads. */
  readonly frame?: SiteFrameView;
  readonly story?: SiteStory;
}

/** The rigid error along the corridor, for the sag chart. */
export interface SagView {
  /** Station (design units) and error (metres), every 1,000 ft. */
  readonly points: readonly (readonly [number, number])[];
  readonly anchorStation: number;
  readonly startStation: number;
  readonly endStation: number;
  /** The largest error and where. */
  readonly max: number;
  readonly maxStation: number;
  /** One sentence under the chart. */
  readonly caption: string;
}

/** The cursor's readout in the HUD. */
export interface CursorView {
  /** One sentence: the error here, or why there are no design coordinates. */
  readonly text: string;
  /** Design coordinates at the cursor, in the CRS's own units. */
  readonly coordinates?: string;
  /** The pick's tolerance, "pick ±0.12 m (one pixel)". */
  readonly tolerance?: string;
  /** No design answer here (moving, exaggerated): drawn quieter. */
  readonly muted: boolean;
}

export interface LegendView {
  readonly solid: Placement;
  /** "Reprojected through EPSG:6420+6360" / "Rigid at station 920+21". */
  readonly solidText: string;
  readonly ghostText?: string;
  /** The whiskers' range, when drawn: "0 m" to "31.6 m". */
  readonly whiskers?: { readonly min: string; readonly max: string };
  /** The anchor ring is drawn (the corridor). */
  readonly anchor: boolean;
  readonly exaggeration: number;
}

export interface PanelModel {
  readonly loading: readonly LoadItem[];
  readonly mode: Placement;
  /** Between placements now. */
  readonly morphing: boolean;
  readonly ghost: boolean;
  readonly exaggerate: boolean;
  readonly exaggeration: number;
  /** The selected site has both placements (the switch works). */
  readonly switchable: boolean;
  /** Why the switch is off, when it is. */
  readonly switchNote?: string;
  /** The placement section's sentence. */
  readonly placementText?: string;
  readonly sag?: SagView;
  /** "Fly along" runs (or can run). */
  readonly flyAlong: "running" | "ready" | "unavailable" | "hidden";
  readonly sites: readonly SiteView[];
  readonly cursor: CursorView;
  readonly legend: LegendView;
}

export interface PanelActions {
  setMode(mode: Placement): void;
  setGhost(on: boolean): void;
  setExaggerate(on: boolean): void;
  flyAlong(): void;
  stopFlight(): void;
  selectSite(id: string): void;
  retry(): void;
}

/** What the page changes every frame, kept out of the model. */
export interface LiveValues {
  /** The camera's station while it flies along. */
  readonly station?: number;
  /** The anchor ring's label, in CSS pixels over the view, when on screen. */
  readonly anchor?: { readonly x: number; readonly y: number };
}

export interface LiveSource {
  subscribe(listener: () => void): () => void;
  get(): LiveValues;
}
