// Tour stop 4 and the "Rigid and exact" overlay (owner's rework,
// 2026-11-06): one long design line, placed rigidly at its start (straight
// in 3D, on the tangent plane there) and exactly (on the ellipsoid), both at
// true scale, and the words for it. Plain data and functions, imported by the
// main thread; the geometry is `rigidVsExact` (overlays.ts) in the worker.
import { FTUS_PER_M } from "./units.ts";
import { length } from "./panel/format.ts";
import type { OverlayPart } from "./panel/model.ts";
import type { FrameParams } from "./protocol.ts";

/**
 * The design frame the line is drawn in: California zone 3 (EPSG:6420,
 * NAD83(2011), US survey feet), placed on WGS 84 by PROJ's recorded
 * operation, which the worker resolves from these parameters.
 */
export const RIGID_FRAME: FrameParams = {
  name: "California zone 3",
  body: "earth",
  crs: { format: "wkid", authority: "EPSG", wkid: 6420 },
};

/** US survey feet per metre: EPSG:6420 is in ftUS. */
const FT = FTUS_PER_M;
/** The catalog's California site origin (stress/shared.ts SITE_ORIGIN), ftUS. */
const FROM = [6_000_000, 2_100_000] as const;
/**
 * 400 km: the sag is 12.5 km there (d²/2R), about 13 px from the stop's
 * camera, so the exact line's curve reads against the straight one. The far
 * end is at 117.90° W, inside EPSG:6420's area of use (to 117.83° W); 500 km
 * would end in Nevada, outside it.
 */
const LENGTH = 400_000;

export const RIGID_LINE = {
  from: FROM,
  /** East along grid east, ftUS. */
  to: [FROM[0] + LENGTH * FT, FROM[1]] as const,
  /** Meters. */
  lengthM: LENGTH,
  /** The exact line's segments: one a kilometre, each chord within 2 cm of the ellipsoid. */
  samples: 400,
  /**
   * The rigid line's dash pieces: about 8 km each, about 10 px from the
   * stop's camera; an odd count, so a dash ends at each end, and the 20 km
   * mark in the third (16.3 to 24.5 km), which is drawn.
   */
  dashes: 49,
  /** A gap tick every 50 km. */
  ticks: 8,
  /** The inset's mark: 20 km along, in design units (ftUS). */
  markDesign: 20_000 * FT,
  /** The inset's mark, meters. */
  markM: 20_000,
} as const;

/**
 * The figures the worker computes, meters: the gap at the far end and at
 * the mark, and the mark's gap split as the inset sees it (`gapParts`): the
 * drop along the vertical and the part along the line (negative: the rigid
 * point falls short of the exact one).
 */
export interface RigidFigures {
  sagEnd: number;
  gapAtMark: number;
  markDrop?: number;
  markAlong?: number;
}

const km = (meters: number) => `${Math.round(meters / 1000)} km`;

/** Everything the page says about the two lines, from their true figures, and where the line runs. */
export function rigidCopy(
  f: RigidFigures,
  where: { origin: string; direction: string } = {
    origin: "the California site origin",
    direction: "east along grid east",
  },
) {
  const end = length(f.sagEnd, 3);
  const mark = length(f.gapAtMark, 3);
  // The parts to the centimetre, a digit finer than the whole: they combine
  // at right angles (in quadrature), and so shown they give the whole as
  // shown (31.32 and 1.48 make 31.36, shown 31.4; to the decimetre, 31.3
  // and 1.5 would make 31.34, shown 31.3).
  const cm = (meters: number) =>
    length(
      Math.abs(meters),
      Math.max(1, Math.floor(Math.log10(Math.abs(meters))) + 3),
    );
  const drop = f.markDrop !== undefined ? `${cm(f.markDrop)} down` : undefined;
  const along =
    f.markAlong !== undefined ? `${cm(f.markAlong)} along` : undefined;
  const L = km(RIGID_LINE.lengthM);
  const M = km(RIGID_LINE.markM);
  const parts: OverlayPart[] = [
    {
      key: "rigid",
      label: "Rigid: straight, tangent at the start",
      short: "Rigid",
      accuracy: `straight; ${end} above the exact at ${L}`,
      line: "dashed",
      tone: "white",
    },
    {
      key: "exact",
      label: "Exact: follows the ellipsoid",
      short: "Exact",
      accuracy: `follows the Earth; ${mark} below the rigid at ${M}`,
      line: "solid",
      tone: "family",
    },
  ];
  return {
    /** The overlay row's line (S-I7). */
    accuracy: `${mark} apart at ${M}, ${end} at ${L} (true scale)`,
    /** Behind "About this figure". */
    detail: `A ${L} design line from ${where.origin}, ${where.direction}. Placed rigidly at its start (dashed), it is straight, on the tangent plane there; placed exactly (solid), it follows the ellipsoid. They part by the drop, d²/2R, the ground curving away under the plane, and by a part along the line, where the grid's scale and the site's differ (rigid placement ignores both): ${mark} at ${M} (the inset) and ${end} at ${L}, by geometry, exact. Drawn at true scale; the ticks every 50 km run from the exact line up to the rigid one.`,
    parts,
    /** On the globe. */
    labels: {
      rigid: parts[0]!.label,
      exact: parts[1]!.label,
      end: `${end} apart at ${L}`,
    },
    /** The picture-in-picture view of the gap. */
    inset: {
      caption: `At ${M}: ${mark} apart (true scale)`,
      leader: mark,
      /** The gap's two parts: by the leader, and at its top. */
      ...(drop && along && { parts: { drop, along: `${along} (grid scale)` } }),
      /** The inset's accessible description. */
      description:
        drop && along
          ? `${mark} apart: ${drop} and ${along} the line, at right angles (grid scale)`
          : `${mark} apart`,
    },
  };
}
