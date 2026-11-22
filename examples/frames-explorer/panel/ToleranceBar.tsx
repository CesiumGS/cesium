// A measured value against its tolerance (R8), on a log scale: the bar's
// length is |value|, the tick is the tolerance, six decades below it to one
// above. The numbers are always beside it; the bar never stands alone.
import type { StressResult } from "../tests.ts";
import { quantity } from "./format.ts";
import { valueNote } from "./runText.ts";

/** Decades shown below the tolerance, and above it. */
const BELOW = 6;
const ABOVE = 1;
/** Where the tolerance's tick sits, 0 to 1. */
export const TICK = BELOW / (BELOW + ABOVE);

/** |value| / tolerance on the bar, 0 to 1. */
export function barPosition(value: number, tolerance: number): number {
  if (value === 0) {
    return 0;
  }
  const decades = Math.log10(Math.abs(value) / tolerance);
  return Math.min(1, Math.max(0, (decades + BELOW) / (BELOW + ABOVE)));
}

/** "0.0034% of the tolerance", "2.4× the tolerance". */
export function ofTolerance(value: number, tolerance: number): string {
  const q = Math.abs(value) / tolerance;
  if (value === 0) {
    return "exactly 0";
  }
  if (q >= 1) {
    return `${q.toPrecision(2)}× the tolerance`;
  }
  const p = 100 * q;
  return p < 1e-4
    ? "under 10⁻⁴ % of the tolerance"
    : `${p.toPrecision(2)}% of the tolerance`;
}

export function ToleranceBar({
  result,
  large = false,
}: {
  result: StressResult;
  large?: boolean;
}) {
  const { value, tolerance, unit } = result;
  if (value === undefined || tolerance === undefined) {
    return <span className="fx-muted fx-nobar">{valueNote(result)}</span>;
  }
  const at = barPosition(value, tolerance);
  const over = Math.abs(value) > tolerance;
  const text = `${quantity(value, unit)} against ${quantity(tolerance, unit)}`;
  return (
    <span className={`fx-tol${large ? " fx-tol-large" : ""}`}>
      <span
        className={`fx-tol-bar${over ? " fx-over" : ""}`}
        role="img"
        aria-label={`${text}: ${ofTolerance(value, tolerance)}`}
      >
        <span className="fx-tol-fill" style={{ inlineSize: `${100 * at}%` }} />
        <span
          className="fx-tol-tick"
          style={{ insetInlineStart: `${100 * TICK}%` }}
        />
      </span>
      {large && (
        <span className="fx-tol-scale" aria-hidden>
          {/* Decade ticks on the log scale (M2): 10⁻⁶ … 1 … 10 × tolerance. */}
          {Array.from({ length: BELOW + ABOVE + 1 }, (_, i) => (
            <span
              key={i}
              className={`fx-tol-decade${i === BELOW ? " fx-tol-decade-tol" : ""}`}
              style={{ insetInlineStart: `${(100 * i) / (BELOW + ABOVE)}%` }}
            >
              {i === 0
                ? "10⁻⁶ × tolerance"
                : i === BELOW
                  ? "tolerance"
                  : i === BELOW + ABOVE
                    ? "10×"
                    : ""}
            </span>
          ))}
        </span>
      )}
      <span className="fx-tol-text fx-num" aria-hidden>
        {quantity(value, unit)}
        <span className="fx-muted"> / {quantity(tolerance, unit)}</span>
      </span>
    </span>
  );
}
