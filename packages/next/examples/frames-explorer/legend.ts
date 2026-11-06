// Overlay accuracy lines (R8): the legend's and the overlay row's one line,
// from the recorded operation of the CRS an overlay was drawn in. Plain
// functions, imported by the main thread.
import type { OverlayGeometry } from "./protocol.ts";
import { length } from "./panel/format.ts";

const meters = (x: number): string => length(x, 3);

/** A recorded operation's accuracy, as a line, a sentence and its kind. */
export interface OperationText {
  /** bounded: a figure; exact: a conversion; unbounded: PROJ states none; none: no operation. */
  readonly kind: "bounded" | "exact" | "unbounded" | "none";
  /** One line: "±2.00 m (1σ), the recorded operation". */
  readonly text: string;
  /** For the detail: what the figure is, and the grids it reads. */
  readonly sentence: string;
  /** Shown in the attention color (a stated assumption, not a bound). */
  readonly caution: boolean;
}

/** The recorded operation's accuracy (R8): PROJ's stated figure, or why there's none. */
export function operationText(
  op: OverlayGeometry["operation"] | undefined,
): OperationText {
  if (!op) {
    return { kind: "none", text: "", sentence: "", caution: false };
  }
  const grids = op.grids.length > 0 ? ` (grids: ${op.grids.join(", ")})` : "";
  if (op.ballpark || op.accuracy === undefined) {
    return {
      kind: "unbounded",
      text: "not bounded: PROJ states no accuracy",
      sentence: `PROJ states no accuracy for the recorded operation${op.ballpark ? ", a ballpark operation" : ""}${grids}.`,
      caution: true,
    };
  }
  if (op.accuracy === 0) {
    return {
      kind: "exact",
      text: "exact, a conversion",
      sentence: "The operation is a conversion, with no datum change.",
      caution: false,
    };
  }
  return {
    kind: "bounded",
    text: `±${meters(op.accuracy)} (1σ), the recorded operation`,
    sentence: `±${meters(op.accuracy)} (1σ): PROJ's stated accuracy for the recorded operation to WGS 84${grids}.`,
    caution: false,
  };
}

/**
 * The distortion overlay's line: its placement on the globe (the recorded
 * operation of the CRS it was drawn in), then what the contours come from.
 * The placement leads, so the compact legend shows the figure (S-I7).
 */
export function distortionAccuracy(placement: OperationText): string {
  const where =
    placement.kind === "none"
      ? "placement not stated"
      : placement.kind === "unbounded"
        ? `placement ${placement.text}`
        : `placed ${placement.text}`;
  return `${where}; contours from PROJ's scale factors`;
}
