// The overlays' fixed parts (DESIGN.md "Overlays"): their names, what each
// waits for, the California grid and site, the distortion views, and the
// line each shows before it draws. Plain data and text, unit-tested
// (test/framesExplorerOverlayConfig.test.ts); overlayControl.ts draws them.
import type { CrsRef } from "../../src/engineering/crs.ts";
import type { SiteTransform } from "../../src/engineering/EngineeringFrame.ts";
import type { Extent } from "./overlays.ts";
import { sig } from "./panel/format.ts";
import type {
  DistortionCrs,
  OverlayId,
  OverlayPart,
  OverlayView,
} from "./panel/model.ts";
import type { DataItem } from "./protocol.ts";

const deg = Math.PI / 180;

/** US survey feet per metre: EPSG:6420 is in ftUS. */
export const FT = 3937 / 1200;
export const CALIFORNIA: CrsRef = {
  format: "wkid",
  authority: "EPSG",
  wkid: 6420,
};
/** The design grid: ±90 km about the central meridian (120.5°W), 37.0° to 38.7°N, 10 km lines. */
export const GRID_EXTENT: Extent = {
  min: [1_910_000 * FT, 560_000 * FT],
  max: [2_090_000 * FT, 740_000 * FT],
};
export const GRID_STEP = 10_000 * FT;
/** The catalog's California site (stress/shared.ts SITE_ORIGIN), θ = 12.5°, s = 1.0000375. */
export const SITE: SiteTransform = {
  origin: [6_000_000, 2_100_000, 0],
  rotation: 12.5 * deg,
  scale: 1.0000375,
};
/** F32: the true-north lines' convergence, drawn this many times while not at true scale. */
export const CONVERGENCE_FACTOR = 20;

/**
 * Stop 4's camera: centred this share of the way along the line and this
 * many degrees south of it, at this range (m) and pitch (degrees).
 */
export const RIGID_FRAMING = {
  along: 0.53,
  south: 0,
  range: 400_000,
  pitch: -5,
};

export const OVERLAY_LABEL: Record<OverlayId, [label: string, short: string]> =
  {
    triads: ["Triads", "Triads"],
    designGrid: ["California design grid, with true north", "Design grid"],
    siteGrid: ["Site grid (θ = 12.5°, s = 1.0000375)", "Site grid"],
    rigidVsExact: ["Rigid and exact 400 km line", "Rigid vs exact"],
    roundTrip: ["Round-trip markers from the last run", "Round trips"],
    orion: ["Orion's path", "Orion"],
    distortion: ["Distortion", "Distortion"],
    bias: ["Frame bias exaggeration", "Frame bias"],
  };
export const OVERLAYS = Object.keys(OVERLAY_LABEL) as OverlayId[];

/** The data an overlay waits for (R9). */
export const OVERLAY_NEEDS: Partial<Record<OverlayId, DataItem>> = {
  designGrid: "proj",
  siteGrid: "proj",
  rigidVsExact: "proj",
  distortion: "proj",
  orion: "orion",
};

export const DISTORTION: Record<
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

/** One overlay's state on the page. */
export interface OverlayState {
  on: boolean;
  state: OverlayView["state"];
  problem?: string;
  accuracy?: string;
  /** What the figure means (S-I7); the default detail otherwise. */
  detail?: string;
  caution?: boolean;
  unbounded?: boolean;
  /** Lines keyed apart in the legend (the rigid and the exact line). */
  parts?: readonly OverlayPart[];
  /** Bumped per request, so a late answer for an old one is dropped. */
  token: number;
}

/** An overlay's one line before it draws (S-I7: the figure it will carry, briefly). */
export function defaultAccuracy(id: OverlayId, biasFactor: number): string {
  switch (id) {
    case "designGrid":
    case "siteGrid":
      return "the recorded PROJ operation's accuracy, once PROJ loads";
    case "rigidVsExact":
      return "how far the two lines part at 20 km and 400 km, once PROJ loads";
    case "roundTrip":
      return "run the tests to place the markers";
    case "orion":
      return "Orion's 1σ at the clock's instant, once its OEM loads";
    case "distortion":
      return "the recorded PROJ operation's accuracy and PROJ's scale factors, once PROJ loads";
    case "bias":
      return `exact by definition; drawn ×${sig(biasFactor, 1)}`;
    default:
      return "";
  }
}

/** What an overlay's figure means, behind "About this figure" (S-I7). */
export function defaultDetail(
  id: OverlayId,
  trueScale: boolean,
): string | undefined {
  switch (id) {
    case "designGrid":
      return `The 10 km grid lines placed through the recorded PROJ operation to WGS 84; true north ${trueScale ? "at true scale" : `with its convergence angle drawn ${CONVERGENCE_FACTOR} times larger`}. The 2 km lines appear below 60 km.`;
    case "siteGrid":
      return "The site grid through the same operation; the site formula (rotation and scale) is exact to 1 nm.";
    case "rigidVsExact":
      return "A 400 km design line placed rigidly at its start (dashed: straight, on the tangent plane there) and exactly (solid: on the ellipsoid), drawn at true scale. They part as distance squared; an inset shows the gap at 20 km.";
    case "distortion":
      return "Tissot ellipses in true-north axes (convergence not applied); combined-factor contours from PROJ's factors, in ppm.";
    case "bias":
      return "The frame bias, 23 mas between EME2000 and GCRF: exact by definition (IAU 2006 adopted constants), drawn exaggerated so it shows.";
    default:
      return undefined;
  }
}
