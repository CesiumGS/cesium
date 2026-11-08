// What the measure section shows, for the checks (plan 4b Task 19; checks.ts
// `checkRows`, Task 20's panel). Pure: test/designGlobeMeasureTool.test.ts.
import type { Measurement } from "../../src/measure/measure.ts";
import type { Answers } from "./answers.ts";
import type { CheckBasis, ShownValues } from "./checks.ts";
import type { MeasureEnd } from "./measureState.ts";

// ------------------------------------------------------ what is shown

/** A measurement's numbers as the page shows them (for `shownValues`). */
export interface ShownMeasurement {
  /** Design units. */
  readonly designDistance: number;
  readonly horizontalDistance: number;
  /** Metres, between where the design points truly are. */
  readonly trueDistance: number;
  /** Each end's station and offset, when on the alignment. */
  readonly a?: { readonly station: number; readonly offset: number };
  readonly b?: { readonly station: number; readonly offset: number };
}

/** An end's check basis and stated tolerance (metres) from how it was obtained. */
function basisOf(end: MeasureEnd): {
  basis: CheckBasis;
  tolerance?: number;
} {
  switch (end.how) {
    case "exact":
    case "link":
      return { basis: "exact" };
    case "geometry":
      return end.kind === "point"
        ? { basis: "vertex" }
        : { basis: "pick", tolerance: end.tolerance };
    case "pick":
      return { basis: "pick", tolerance: end.tolerance };
  }
}

const RANK: Record<CheckBasis, number> = { exact: 0, vertex: 1, pick: 2 };

/**
 * What the measure section shows, for the checks (checks.ts `checkRows`,
 * Task 20's panel): the 10,000 ft pair's distances and ends (exact: they
 * are the answers' own design points); station 170,000's marker, its
 * separation as drawn when settled at true scale; PROJ's zone 3 for NGS's
 * mark; and the user's ends and distances where they are answers' points
 * and pairs (within 1e-6 design units), with the basis their snap gives.
 */
export function shownValues(
  answers: Answers,
  shown: {
    readonly pair?: ShownMeasurement;
    /** The marker's drawn separation (metres), settled at true scale. */
    readonly marker?: {
      readonly separation: number;
      readonly mode: "rigid" | "reprojected";
    };
    /** PROJ's zone 3 E and N for the mark, design units. */
    readonly mark?: ArrayLike<number>;
    /** The page's measured horizontal distance from the mark to the centreline, design units. */
    readonly markOffset?: number;
    readonly user?: {
      readonly a: MeasureEnd;
      readonly b: MeasureEnd;
      readonly measurement?: ShownMeasurement;
    };
  },
): ShownValues {
  const points: ShownValues["points"] = new Map();
  const pairs: ShownValues["pairs"] = new Map();
  const first = answers.pairs[0];
  if (first !== undefined && shown.pair !== undefined) {
    for (const [index, at] of [
      [first.from, shown.pair.a],
      [first.to, shown.pair.b],
    ] as const) {
      points.set(index, {
        design: Float64Array.from(answers.points[index]!.design),
        ...(at !== undefined && { station: at.station, offset: at.offset }),
        basis: "exact",
      });
    }
    pairs.set(first.id, {
      designDistance: shown.pair.designDistance,
      horizontalDistance: shown.pair.horizontalDistance,
      trueDistance: shown.pair.trueDistance,
      basis: "exact",
    });
  }
  points.set(answers.marker.point, {
    design: Float64Array.from(answers.marker.design),
    basis: "exact",
  });
  const user = shown.user;
  if (user !== undefined && user.a.site === "corridor") {
    const indexOf = (end: MeasureEnd) =>
      answers.points.findIndex((p) =>
        p.design.every((x, k) => Math.abs(x - end.design[k]!) <= 1e-6),
      );
    const ends = [
      [user.a, user.measurement?.a],
      [user.b, user.measurement?.b],
    ] as const;
    const found = ends.map(([end]) => indexOf(end));
    ends.forEach(([end, at], i) => {
      const index = found[i]!;
      if (index >= 0 && !points.has(index)) {
        points.set(index, {
          design: Float64Array.from(end.design),
          ...(at !== undefined && { station: at.station, offset: at.offset }),
          ...basisOf(end),
        });
      }
    });
    const pair = answers.pairs.find(
      (p) =>
        (p.from === found[0] && p.to === found[1]) ||
        (p.from === found[1] && p.to === found[0]),
    );
    if (
      pair !== undefined &&
      user.measurement !== undefined &&
      !pairs.has(pair.id)
    ) {
      const [ba, bb] = [basisOf(user.a), basisOf(user.b)];
      const worst = RANK[ba.basis] >= RANK[bb.basis] ? ba : bb;
      const tolerance =
        worst.basis === "pick"
          ? (ba.tolerance ?? 0) + (bb.tolerance ?? 0)
          : undefined;
      pairs.set(pair.id, {
        designDistance: user.measurement.designDistance,
        horizontalDistance: user.measurement.horizontalDistance,
        trueDistance: user.measurement.trueDistance,
        basis: worst.basis,
        ...(tolerance !== undefined && { tolerance }),
      });
    }
  }
  return {
    points,
    pairs,
    ...(shown.marker !== undefined && {
      marker: {
        separation: shown.marker.separation,
        mode: shown.marker.mode,
        basis: "exact",
      },
    }),
    ...((shown.mark !== undefined || shown.markOffset !== undefined) && {
      mark: {
        ...(shown.mark !== undefined && {
          easting: shown.mark[0]!,
          northing: shown.mark[1]!,
        }),
        ...(shown.markOffset !== undefined && { offset: shown.markOffset }),
      },
    }),
  };
}

export const shownOf = (m: Measurement): ShownMeasurement | undefined =>
  m.design === undefined
    ? undefined
    : {
        designDistance: m.design.distance,
        horizontalDistance: m.design.horizontalDistance,
        trueDistance: m.distance,
        ...(m.alignment !== undefined && {
          a: { station: m.alignment.a.station, offset: m.alignment.a.offset },
          b: { station: m.alignment.b.station, offset: m.alignment.b.offset },
        }),
      };
