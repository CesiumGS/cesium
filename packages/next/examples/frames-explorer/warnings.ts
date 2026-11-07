// Which of a statement's warnings bear on the accuracy it states (S-I4):
// measure's notes on the signal, the footprint and a design result say
// nothing of where a point is, so the walk and the attention color leave
// them out. Matched by code (AccuracyStatement.warningCodes), never by text.
import type {
  AccuracyStatement,
  WarningCode,
} from "../../src/measure/accuracy.ts";

const NOT_ABOUT_SEPARATION: ReadonlySet<WarningCode> = new Set([
  "own-instant-no-signal",
  "coincident",
  "no-footprint",
  "alignment-unused",
]);

/**
 * `s` without the warnings that don't concern the separation's accuracy. A
 * statement without codes in step with its warnings is returned as is.
 */
export function aboutSeparation<
  S extends Pick<AccuracyStatement, "warnings" | "warningCodes">,
>(s: S): S {
  const codes = s.warningCodes;
  if (codes === undefined || codes.length !== s.warnings.length) {
    return s;
  }
  const keep = s.warnings
    .map((w, i) => ({ w, code: codes[i]! }))
    .filter((x) => !NOT_ABOUT_SEPARATION.has(x.code));
  return {
    ...s,
    warnings: keep.map((x) => x.w),
    warningCodes: keep.map((x) => x.code),
  };
}

/**
 * A bounded statement shown in the attention color: one that rests on a
 * stated assumption (a trajectory's unstated time scale) or carries a
 * warning about the separation itself (DESIGN.md "Color means something").
 */
export function cautionOf(
  s: Pick<AccuracyStatement, "warnings" | "warningCodes"> & {
    terms: readonly {
      source: string;
      meters: number | undefined;
      note: string;
    }[];
  },
): boolean {
  return (
    s.terms.some((t) => t.source === "coordinateScale") ||
    aboutSeparation(s).warnings.length > 0
  );
}
