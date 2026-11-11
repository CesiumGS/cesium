// Loops for kernel converters (overall plan §13.33): edge uses with their
// pcurves as NURBS, turned to the render form's winding before they go to
// `BrepBuilder`. Shared by the SMLib and Open CASCADE readers.
import type { BrepUse } from "./build.ts";
import {
  evaluateNurbsCurve,
  reverseNurbsCurve,
  type NurbsCurve,
} from "./nurbs.ts";

/** Samples per use for a loop's signed area in (u, v). */
const AREA_SAMPLES = 16;

/** A use with its pcurve as a curve, already in the use's direction. */
export interface CurveUse {
  readonly edge: number;
  readonly reversed: boolean;
  readonly pcurve: NurbsCurve;
}

/** Twice the signed area a loop encloses in (u, v): positive counter-clockwise. */
export function loopArea(uses: readonly CurveUse[]): number {
  let area = 0;
  let previous: Float64Array | undefined;
  let first: Float64Array | undefined;
  for (const use of uses) {
    const { knots, degree, count } = use.pcurve;
    const t0 = knots[degree]!;
    const t1 = knots[count]!;
    for (let i = 0; i < AREA_SAMPLES; i++) {
      const p = evaluateNurbsCurve(
        use.pcurve,
        t0 + ((t1 - t0) * i) / AREA_SAMPLES,
      );
      if (previous) {
        area += previous[0]! * p[1]! - p[0]! * previous[1]!;
      } else {
        first = p;
      }
      previous = p;
    }
  }
  if (previous && first) {
    area += previous[0]! * first[1]! - first[0]! * previous[1]!;
  }
  return area;
}

/** The loop run the other way: uses in reverse order, each reversed. */
export function reverseLoop(uses: readonly CurveUse[]): CurveUse[] {
  return uses
    .map((use) => ({
      edge: use.edge,
      reversed: !use.reversed,
      pcurve: reverseNurbsCurve(use.pcurve),
    }))
    .reverse();
}

/**
 * The loop in the form's winding: counter-clockwise in (u, v) when it's a
 * face's outer loop, clockwise otherwise, as the builder takes it.
 */
export function windLoop(uses: readonly CurveUse[], outer: boolean): BrepUse[] {
  const area = loopArea(uses);
  const wound = (outer ? area < 0 : area > 0) ? reverseLoop(uses) : uses;
  return wound.map((use) => ({
    edge: use.edge,
    reversed: use.reversed,
    pcurve: use.pcurve,
  }));
}
