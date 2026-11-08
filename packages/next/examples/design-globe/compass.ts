// The convergence compass at the cursor (plan 4b Task 20; DESIGN.md
// "Visuals in the viewer"): grid north against true north where the cursor
// is, from the frame's grid factors (PROJ's meridian convergence). The
// needles are the two directions as the view projects them; the angle
// between them on screen is foreshortened, so the words carry the value.
import { dms } from "./measureModel.ts";

/** Screen angles of the needles, degrees clockwise from straight up. */
export interface CompassNeedles {
  readonly trueNorth: number;
  readonly gridNorth: number;
}

/** Shorter than this on screen, a direction is end-on to the view: no needle. */
const MIN_PX = 2;

/**
 * The needles from the point's pixel and the pixels of a point a little way
 * along true north and along grid north (CSS pixels, y down), or undefined
 * when either direction is nearly end-on to the view.
 */
export function compassNeedles(
  at: ArrayLike<number>,
  trueTip: ArrayLike<number>,
  gridTip: ArrayLike<number>,
): CompassNeedles | undefined {
  const angle = (tip: ArrayLike<number>) => {
    const dx = tip[0]! - at[0]!;
    const dy = tip[1]! - at[1]!;
    return Math.hypot(dx, dy) < MIN_PX
      ? undefined
      : (Math.atan2(dx, -dy) * 180) / Math.PI;
  };
  const t = angle(trueTip);
  const g = angle(gridTip);
  return t === undefined || g === undefined
    ? undefined
    : { trueNorth: t, gridNorth: g };
}

/**
 * "Grid north is 0.878° west of true north (convergence −0°52′39.1″)": PROJ's
 * meridian convergence, radians from true north to grid north, positive east.
 */
export function convergenceText(convergence: number): string {
  const degrees = (Math.abs(convergence) * 180) / Math.PI;
  const side = convergence < 0 ? "west" : "east";
  return `Grid north is ${degrees.toFixed(3)}° ${side} of true north (convergence ${dms(convergence)})`;
}

/** The compass's own label: "Grid north 0.848° W". */
export function convergenceShort(convergence: number): string {
  const degrees = (Math.abs(convergence) * 180) / Math.PI;
  return `Grid north ${degrees.toFixed(3)}° ${convergence < 0 ? "W" : "E"}`;
}
