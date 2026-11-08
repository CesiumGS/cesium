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
import type { Measurement } from "../../src/measure/measure.ts";
import {
  accuracyRows,
  fixed,
  stationText,
  unitSymbol,
  type MeasureView,
} from "./measureModel.ts";
import type { DetailRow } from "./measureView.ts";

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
      // Marked where the station is marked in the true placement: on the
      // visible top, so the line closes to nothing once reprojected.
      shown: {
        a: fixedEnd(marker.shown.reprojected),
        b: marker.shown,
      },
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
  /** Design distance, design units, from the page's `measure`; "…" until it has run. */
  readonly design: string;
  /** What `design` is, when not the 3D design distance ("Design distance, horizontal"). */
  readonly designLabel?: string;
  /** The slope (3D) design distance, beside a horizontal headline. */
  readonly slope?: string;
  /** True distance, metres, from the page's `measure`; "…" until it has run. */
  readonly trueDistance: string;
  /**
   * The card's headline, metres, absent while exaggerated: the self-check's
   * drawn gap, the mark's rigid offset of the drawn centreline from where
   * it is. Both shrink to 0.000 m through the morph.
   */
  readonly hero?: string;
  /** What the headline is, beside it (the mark's); none for the self-check, whose sentence says. */
  readonly heroCaption?: string;
  /** The line on the globe now, metres; absent while exaggerated. */
  readonly drawn?: string;
  /** One sentence on the line as drawn. */
  readonly globe: string;
  readonly tone: GlobeTone;
}

/** What the page's `measure` gave between an opener's two design points. */
export interface OpenerMeasured {
  /** Design units: the 3D (slope) design distance. */
  readonly design: number;
  /** Design units: the horizontal design distance (what CAD reports). */
  readonly horizontal: number;
  /** Metres. */
  readonly trueDistance: number;
}

export const dist = (p: ArrayLike<number>, q: ArrayLike<number>) =>
  Math.hypot(p[0]! - q[0]!, p[1]! - q[1]!, p[2]! - q[2]!);
export const metres3 = (x: number) => `${fixed(x, 3)} m`;

/** Shown in place of a figure the page's `measure` hasn't given yet. */
export const PENDING = "…";

/**
 * An opener's title, its design and true distances (from the page's
 * `measure`, `measured`; answers.json is only what the checks compare them
 * with), its headline and the line as drawn now.
 */
export function openerView(
  o: Opener,
  answers: Answers,
  s: DrawState,
  measured?: OpenerMeasured,
): OpenerFigures {
  const symbol = unitSymbol(answers.frame.unitName);
  const design =
    measured === undefined ? PENDING : `${fixed(measured.design, 3)} ${symbol}`;
  const trueDistance =
    measured === undefined ? PENDING : metres3(measured.trueDistance);
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
  const notToScale = `Errors drawn ×${s.exaggeration}: no measurement on the globe until true scale.`;
  /** How far the true distance is from the line as drawn, in words. */
  const against = (near: string, far: string) => {
    if (measured === undefined) {
      return "";
    }
    const off = length - measured.trueDistance;
    return `, ${metres3(Math.abs(off))} ${off >= 0 ? far : near}`;
  };
  const isTrue =
    measured !== undefined && Math.abs(length - measured.trueDistance) < 5e-4;

  switch (o.id) {
    case "marker": {
      const station = stationText(answers.marker.station);
      const same =
        measured === undefined
          ? `Both ends are station ${station}'s own design point; measuring…`
          : `Both ends are station ${station}'s own design point: ${design} apart in the design, ${trueDistance} apart where it truly is`;
      const rest = exaggerated
        ? `. ${notToScale}`
        : s.morphing
          ? `. The ${drawn} between them now is the drawing, moving.`
          : tone === "rigid"
            ? `. All ${drawn} is rigid's drawing.`
            : ", and reprojected draws it there.";
      return {
        title: `Station ${station} against its true position`,
        design,
        trueDistance,
        ...(drawn !== undefined && { hero: drawn, drawn }),
        globe: measured === undefined && !exaggerated ? same : `${same}${rest}`,
        tone,
      };
    }
    case "mark": {
      const m = answers.mark;
      // Where the centreline is drawn against where it is: rigid's offset,
      // to the millimetre, 0.000 m once reprojected.
      const offset = metres3(
        dist(drawnAt(o.b, s.t, s.exaggeration), o.b.reprojected),
      );
      const globe = exaggerated
        ? notToScale
        : s.morphing
          ? `Moving between placements: on the globe the mark measures ${drawn} now.`
          : tone === "rigid"
            ? `On the globe the mark measures ${drawn}${against("too near", "too far")}.`
            : isTrue
              ? `On the globe the mark measures ${drawn}, its true distance.`
              : `On the globe the mark measures ${drawn}.`;
      const heroCaption = s.morphing
        ? "The road drawn from where it is, moving."
        : tone === "rigid"
          ? "Rigid draws the road this far from where it truly is, at the mark."
          : "0.000 m by construction: the page draws the road and the mark through PROJ alike. The independent test is NGS's own zone 3 against the design, in Checks.";
      return {
        title: `${m.pid} ${m.name} to the centreline`,
        design,
        trueDistance,
        ...(!exaggerated && { hero: offset, heroCaption }),
        ...(drawn !== undefined && { drawn }),
        globe,
        tone,
      };
    }
    case "pair": {
      const globe = exaggerated
        ? notToScale
        : s.morphing
          ? `Moving between placements: drawn ${drawn} now.`
          : tone === "rigid"
            ? `Rigid draws it ${drawn}${against("short", "long")}; the design distance is the same in both placements.`
            : isTrue
              ? "Drawn at its true length; the design distance is the same in both placements."
              : `Drawn ${drawn} long.`;
      return {
        title: answers.pairs[0]!.label,
        // The horizontal design distance leads, as CAD reports it; the
        // slope distance beside it.
        design:
          measured === undefined
            ? PENDING
            : `${fixed(measured.horizontal, 3)} ${symbol}`,
        designLabel: "Design distance, horizontal",
        slope: design,
        trueDistance,
        ...(drawn !== undefined && { drawn }),
        globe,
        tone,
      };
    }
  }
}

/** The ruler's far end: where ground's last whole 1,000 ft falls against design's. */
export interface RulerEnd {
  /** The last whole 1,000 ft both scales reach, design and ground feet. */
  readonly feet: number;
  /** The ruler's ticks there, as fractions of the line: design's, ground's. */
  readonly design: number;
  readonly ground: number;
  /** How far apart they are, design units. */
  readonly gap: number;
  /** "Ground's 10,000 ft ends 0.764 ftUS before design's". */
  readonly text: string;
}

/**
 * The ruler's far end from a measurement of its line (`measured`, from the
 * page's `measure`): a design foot is the design unit, a ground foot the
 * same length on the ground (metres per unit), and the two scales part by
 * the combined scale factor.
 */
export function rulerEnd(
  measured: OpenerMeasured,
  metersPerUnit: number,
  symbol: string,
): RulerEnd {
  const designFeet = measured.design;
  const groundFeet = measured.trueDistance / metersPerUnit;
  const feet = Math.floor(Math.min(designFeet, groundFeet) / 1000) * 1000;
  const design = feet / designFeet;
  const ground = feet / groundFeet;
  const gap = Math.abs(design - ground) * designFeet;
  return {
    feet,
    design,
    ground,
    gap,
    text: `Ground's ${fixed(feet, 0)} ft ends ${fixed(gap, 3)} ${symbol} ${ground <= design ? "before" : "after"} design's`,
  };
}

/** An opener's measurement by the page's `measure`, and its strings. */
export interface OpenerMeasure {
  readonly m: Measurement;
  readonly view: MeasureView;
}

/** The figures the headline shows, from an opener's measurement. */
export function measuredOf(
  measure: OpenerMeasure | undefined,
): OpenerMeasured | undefined {
  const d = measure?.m.design;
  return measure === undefined || d === undefined
    ? undefined
    : {
        design: d.distance,
        horizontal: d.horizontalDistance,
        trueDistance: measure.m.distance,
      };
}

/**
 * An opener's rows behind "Details": `measures`, the openers' measurements
 * by the page's `measure`; `markDesign`, PROJ's zone 3 for the mark; and
 * `datum`, the heights' datum ("NAVD88 height via GEOID18").
 */
export function openerDetails(
  id: OpenerId,
  a: Answers,
  measures: ReadonlyMap<OpenerId, OpenerMeasure>,
  markDesign: ArrayLike<number> | undefined,
  datum: string | undefined,
): DetailRow[] {
  const symbol = unitSymbol(a.frame.unitName);
  const coords = (d: ArrayLike<number>) =>
    `${fixed(d[0]!, 3)}, ${fixed(d[1]!, 3)} ${symbol}; ${fixed(d[2]!, 3)} ${symbol}${datum !== undefined ? `, ${datum}` : ""}`;
  const measure = measures.get(id);
  const v = measure?.view;
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
      rows.push({
        label: "Horizontal design distance",
        value: `${v?.horizontalDistance ?? PENDING}; from NGS's own zone 3, ${fixed(published, 3)} ${symbol}`,
      });
      rows.push({
        label: "Nearest centreline",
        value: `Sta. ${stationText(m.nearest.station)}, at ${coords(m.nearestDesign)}`,
      });
      if (measure !== undefined && v !== undefined) {
        rows.push(
          { label: "Combined scale factor", value: v.combinedFactorPpm },
          ...accuracyRows(measure.m.accuracy),
        );
      }
      return rows;
    }
    case "pair": {
      const pair = a.pairs[0]!;
      const rows: DetailRow[] = [
        {
          label: "Horizontal design distance",
          value: v?.horizontalDistance ?? PENDING,
        },
        {
          label: "Ends",
          value: `Sta. ${stationText(pair.ends.a.station)} to ${stationText(pair.ends.b.station)}, on the centreline`,
        },
      ];
      const measured = measuredOf(measure);
      if (measured !== undefined) {
        const end = rulerEnd(measured, a.frame.metersPerUnit, symbol);
        rows.push({
          label: "The ruler",
          value: `Design feet (yellow ticks) against ground feet (white): ${end.text.charAt(0).toLowerCase()}${end.text.slice(1)}.`,
        });
      }
      if (measure !== undefined && v !== undefined) {
        rows.push(
          { label: "Combined scale factor", value: v.combinedFactorPpm },
          { label: "Grid convergence", value: v.convergence },
          ...accuracyRows(measure.m.accuracy),
        );
      }
      return rows;
    }
  }
}
