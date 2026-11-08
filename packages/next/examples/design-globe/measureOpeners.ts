// The measurements the design globe opens with (plan 4b Task 19; DESIGN.md
// "The story", owner 2026-11-07):
//   1. the design against itself: a marker at station 170,000's true
//      position (through the design CRS by PROJ), to the drawn station;
//   2. the design against a real survey mark: NGS's HS5109, placed from its
//      published NAD83(2011) position, to the nearest drawn centreline point;
//   3. quieter, two stations 10,000 ft apart: the design distance is the
//      same in both placements, and only reprojected draws it true.
// And `drawnAt`, the morph shader's blend on the CPU, so the figures and the
// labels follow the morph. Pure: test/designGlobeMeasureTool.test.ts.
import type { TilesetPlacement } from "../../src/engineering/placement.ts";
import type { Answers } from "./answers.ts";
import {
  fixed,
  stationText,
  unitSymbol,
  type MeasureView,
} from "./measureModel.ts";
import type { DetailRow } from "./measureView.ts";
import { errorText } from "./page.ts";

// --------------------------------------------------------- the openers

/** An end as both placements draw it (body-fixed metres). */
export interface DrawnEnd {
  readonly rigid: Float64Array;
  readonly reprojected: Float64Array;
}

/** What the openers read of the corridor's two placements. */
export interface OpenerPlacements {
  readonly rigid: Pick<TilesetPlacement, "displayed">;
  readonly reprojected: Pick<TilesetPlacement, "displayed">;
}

export type OpenerId = "marker" | "mark" | "pair";

/** A measurement the page opens with. */
export interface Opener {
  readonly id: OpenerId;
  /** Drawn quieter (the third pair). */
  readonly quiet: boolean;
  /** The ends exactly: the figures are measured between them. */
  readonly a: DrawnEnd;
  readonly b: DrawnEnd;
  /**
   * Where the ends are marked, when that isn't exactly there: a design point
   * on the profile grade line is marked on the visible barrier top above it
   * (as the exact snap's `shownPoint`).
   */
  readonly shown: { readonly a: DrawnEnd; readonly b: DrawnEnd };
}

/**
 * Where a morph draws an end: the shader's blend (placementPair.ts), rigid's
 * error scaled by `exaggeration`, then mixed toward reprojected by `t`.
 */
export function drawnAt(
  end: DrawnEnd,
  t: number,
  exaggeration: number,
): Float64Array {
  const out = new Float64Array(3);
  for (let k = 0; k < 3; k++) {
    const p = end.reprojected[k]!;
    const r = p + (end.rigid[k]! - p) * exaggeration;
    out[k] = r + (p - r) * t;
  }
  return out;
}

export const fixedEnd = (p: ArrayLike<number>): DrawnEnd => ({
  rigid: Float64Array.from(p),
  reprojected: Float64Array.from(p),
});
const designEnd = (
  placements: OpenerPlacements,
  design: ArrayLike<number>,
): DrawnEnd => ({
  rigid: placements.rigid.displayed(design),
  reprojected: placements.reprojected.displayed(design),
});

/**
 * The three openers, from answers.json and the corridor's placements: the
 * station 170,000 marker (at its true position) to the drawn station; NGS's
 * mark (at its published position) to the nearest drawn centreline point;
 * and `pairs[0]`, 10,000 ft on the first tangent.
 */
export function openingMeasurements(
  answers: Answers,
  placements: OpenerPlacements,
  lift: (offset: number) => number = () => 0,
): Opener[] {
  /** A design point at `offset`, and where it is marked (lifted to the visible top). */
  const onDesign = (design: ArrayLike<number>, offset: number) => {
    const up = lift(offset);
    return {
      exact: designEnd(placements, design),
      shown:
        up === 0
          ? designEnd(placements, design)
          : designEnd(placements, [design[0]!, design[1]!, design[2]! + up]),
    };
  };
  const marker = onDesign(answers.marker.design, answers.marker.offset);
  const nearest = onDesign(answers.mark.nearestDesign, 0);
  const out: Opener[] = [
    {
      id: "marker",
      quiet: false,
      a: fixedEnd(answers.marker.bodyFixed),
      b: marker.exact,
      shown: { a: fixedEnd(answers.marker.bodyFixed), b: marker.shown },
    },
    {
      id: "mark",
      quiet: false,
      a: fixedEnd(answers.mark.bodyFixed),
      b: nearest.exact,
      shown: { a: fixedEnd(answers.mark.bodyFixed), b: nearest.shown },
    },
  ];
  const pair = answers.pairs[0];
  if (pair !== undefined) {
    const from = answers.points[pair.from]!;
    const to = answers.points[pair.to]!;
    const a = onDesign(from.design, from.offset);
    const b = onDesign(to.design, to.offset);
    out.push({
      id: "pair",
      quiet: true,
      a: a.exact,
      b: b.exact,
      shown: { a: a.shown, b: b.shown },
    });
  }
  return out;
}

/** How the morph draws now. */
export interface DrawState {
  /** 0 rigid, 1 reprojected. */
  readonly t: number;
  readonly exaggeration: number;
  readonly morphing: boolean;
}

/** What tone the "on the globe" line takes. */
export type GlobeTone = "rigid" | "reprojected" | "moving" | "muted";

/** An opener's words now. */
export interface OpenerFigures {
  readonly title: string;
  /** Design distance, design units. */
  readonly design: string;
  /** True distance, metres. */
  readonly trueDistance: string;
  /** The line on the globe now, metres; absent while exaggerated. */
  readonly drawn?: string;
  /** One sentence on the line as drawn. */
  readonly globe: string;
  readonly tone: GlobeTone;
}

export const dist = (p: ArrayLike<number>, q: ArrayLike<number>) =>
  Math.hypot(p[0]! - q[0]!, p[1]! - q[1]!, p[2]! - q[2]!);
export const metres3 = (x: number) => `${fixed(x, 3)} m`;

/** An opener's title, design and true distances, and the line as drawn now. */
export function openerView(
  o: Opener,
  answers: Answers,
  s: DrawState,
): OpenerFigures {
  const symbol = unitSymbol(answers.frame.unitName);
  const designText = (x: number) => `${fixed(x, 3)} ${symbol}`;
  const exaggerated = s.exaggeration !== 1 && s.t < 1;
  const length = dist(
    drawnAt(o.a, s.t, s.exaggeration),
    drawnAt(o.b, s.t, s.exaggeration),
  );
  const drawn = exaggerated ? undefined : metres3(length);
  const tone: GlobeTone = s.morphing
    ? "moving"
    : exaggerated
      ? "muted"
      : s.t >= 0.5
        ? "reprojected"
        : "rigid";
  const rigidDrawn = tone === "rigid";

  let title: string;
  let design: number;
  let trueDistance: number;
  let globe: string;
  switch (o.id) {
    case "marker": {
      const m = answers.marker;
      const at = answers.points[m.point];
      title = `Station ${stationText(m.station)} against its true position`;
      // The marker is the station's own design point, where it truly is.
      const ratio =
        answers.frame.metersPerHeightUnit / answers.frame.metersPerUnit;
      design =
        at === undefined
          ? 0
          : Math.hypot(
              m.design[0] - at.design[0],
              m.design[1] - at.design[1],
              (m.design[2] - at.design[2]) * ratio,
            );
      trueDistance = at === undefined ? 0 : dist(m.bodyFixed, at.bodyFixed);
      globe = rigidDrawn
        ? "Rigid draws the station this far from where it is."
        : "Drawn where it is.";
      break;
    }
    case "mark": {
      const m = answers.mark;
      title = `${m.pid} ${m.name} to the centreline`;
      design = m.designDistance;
      trueDistance = m.trueDistance;
      if (rigidDrawn) {
        const off = length - m.trueDistance;
        globe = `On the globe, rigid's centreline is ${metres3(length)} from the mark, ${metres3(Math.abs(off))} ${off >= 0 ? "too far" : "too near"}: it draws the road here ${errorText(dist(o.b.rigid, o.b.reprojected))} from where it is.`;
      } else {
        globe =
          Math.abs(length - m.trueDistance) < 5e-4
            ? "On the globe it measures the true distance: the drawn road lines up with NGS's mark."
            : `On the globe it measures ${metres3(length)}.`;
      }
      break;
    }
    case "pair": {
      const pair = answers.pairs[0]!;
      title = pair.label;
      design = pair.designDistance;
      trueDistance = pair.trueDistance;
      if (rigidDrawn) {
        const off = length - pair.trueDistance;
        globe = `Rigid draws it ${metres3(length)}, ${metres3(Math.abs(off))} ${off >= 0 ? "long" : "short"}; the design distance is the same in both placements.`;
      } else {
        globe =
          Math.abs(length - pair.trueDistance) < 5e-4
            ? "Drawn at its true length; the design distance is the same in both placements."
            : `Drawn ${metres3(length)} long.`;
      }
      break;
    }
  }
  if (exaggerated) {
    globe = `Errors drawn ×${s.exaggeration}: no measurement on the globe until true scale.`;
  } else if (s.morphing) {
    globe =
      o.id === "marker"
        ? "Moving between placements: the gap follows the geometry."
        : `Moving between placements: drawn ${metres3(length)} now.`;
  }
  return {
    title,
    design: designText(design),
    trueDistance: metres3(trueDistance),
    ...(drawn !== undefined && { drawn }),
    globe,
    tone,
  };
}

/** The ruler's gap at the end of its 10,000 ft, in design units. */
export function rulerGap(a: Answers): string | undefined {
  const pair = a.pairs[0];
  if (pair === undefined) {
    return undefined;
  }
  const symbol = unitSymbol(a.frame.unitName);
  const groundFeet = pair.trueDistance / a.frame.metersPerUnit;
  const gap = groundFeet - pair.designDistance;
  return `Ground runs ${fixed(Math.abs(gap), 3)} ${symbol} ${gap >= 0 ? "longer" : "shorter"} than design`;
}

/**
 * An opener's rows behind "Details": `views`, the openers' measurements'
 * strings (`measurementModel`), and `markDesign`, PROJ's zone 3 for the mark.
 */
export function openerDetails(
  id: OpenerId,
  a: Answers,
  views: ReadonlyMap<OpenerId, MeasureView>,
  markDesign: ArrayLike<number> | undefined,
): DetailRow[] {
  const symbol = unitSymbol(a.frame.unitName);
  const coords = (d: ArrayLike<number>) =>
    `${fixed(d[0]!, 3)}, ${fixed(d[1]!, 3)} ${symbol}; ${fixed(d[2]!, 3)} ${symbol} NAVD88`;
  const v = views.get(id);
  switch (id) {
    case "marker":
      return [
        {
          label: "Design point",
          value: `Sta. ${stationText(a.marker.station)} on the centreline: ${coords(a.marker.design)}`,
        },
        {
          label: "The marker",
          value:
            "The design's own point where it truly is, through the design CRS by PROJ: not a survey.",
        },
      ];
    case "mark": {
      const m = a.mark;
      const rows: DetailRow[] = [
        {
          label: "NGS publishes",
          value: `E ${fixed(m.publishedSpc.easting, 2)}, N ${fixed(m.publishedSpc.northing, 2)} ${symbol} (zone 3)`,
        },
      ];
      if (markDesign !== undefined) {
        rows.push({
          label: "PROJ gives",
          value: `E ${fixed(markDesign[0]!, 3)}, N ${fixed(markDesign[1]!, 3)} ${symbol}, from NGS's NAD83(2011) position`,
        });
      }
      const published = Math.hypot(
        m.publishedSpc.easting - m.nearestDesign[0],
        m.publishedSpc.northing - m.nearestDesign[1],
      );
      rows.push(
        {
          label: "Horizontal design distance",
          value: `${fixed(m.horizontalDistance, 3)} ${symbol}; from NGS's own zone 3, ${fixed(published, 3)} ${symbol}`,
        },
        {
          label: "Nearest centreline",
          value: `Sta. ${stationText(m.nearest.station)}, at ${coords(m.nearestDesign)}`,
        },
      );
      if (v !== undefined) {
        rows.push(
          { label: "Combined scale factor", value: v.combinedFactorPpm },
          { label: "Accuracy", value: v.accuracy },
        );
      }
      return rows;
    }
    case "pair": {
      const pair = a.pairs[0]!;
      const rows: DetailRow[] = [
        {
          label: "Horizontal design distance",
          value: `${fixed(pair.horizontalDistance, 3)} ${symbol}`,
        },
        {
          label: "Ends",
          value: `Sta. ${stationText(pair.ends.a.station)} to ${stationText(pair.ends.b.station)}, on the centreline`,
        },
      ];
      const gap = rulerGap(a);
      if (gap !== undefined) {
        rows.push({
          label: "The ruler",
          value: `Design feet (yellow ticks) against ground feet (white): ${gap.charAt(0).toLowerCase()}${gap.slice(1)} over the line.`,
        });
      }
      if (v !== undefined) {
        rows.push(
          { label: "Combined scale factor", value: v.combinedFactorPpm },
          { label: "Grid convergence", value: v.convergence },
          { label: "Accuracy", value: v.accuracy },
        );
      }
      return rows;
    }
  }
}
