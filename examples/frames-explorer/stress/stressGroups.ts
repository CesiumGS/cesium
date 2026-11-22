// The question cards (R14): every group, its lenses and its headline.
import { GROUP_INFO } from "./groupInfo.ts";
import {
  type StressGroup,
  type StressResult,
  fmt,
  formatEffect,
} from "./runner.ts";

/** "n of m pass", then the first effect, else the worst value against its tolerance. */
function standardHeadline(results: readonly StressResult[]) {
  if (results.length === 0) {
    return undefined;
  }
  // Display-only results (effects with no verdict) and the user's own
  // input (R18) are not counted.
  const judged = results.filter(
    (r) => r.displayOnly !== true && r.userInput !== true,
  );
  const passed = judged.filter((r) => r.pass).length;
  const count = `${passed} of ${judged.length} pass`;
  const effect = results.find((r) => r.effect !== undefined)?.effect;
  if (effect !== undefined) {
    return `${count}; ${formatEffect(effect)}`;
  }
  let worst: StressResult | undefined;
  let ratio = -1;
  for (const r of results) {
    if (r.value !== undefined && r.tolerance !== undefined && r.tolerance > 0) {
      const q = Math.abs(r.value) / r.tolerance;
      if (q > ratio) {
        ratio = q;
        worst = r;
      }
    }
  }
  return worst === undefined
    ? count
    : `${count}; worst ${fmt(worst.value!)} ${worst.unit ?? ""} against ${fmt(worst.tolerance!)}`.trimEnd();
}

function reproducibilityHeadline(results: readonly StressResult[]) {
  if (results.length === 0) {
    return undefined;
  }
  const compared = results.filter((r) => r.fingerprintCheck !== undefined);
  if (compared.length === 0) {
    return `${results.length} fingerprinted results, not compared`;
  }
  const matched = compared.filter((r) => r.fingerprintCheck!.match).length;
  return `${matched} of ${compared.length} fingerprints match Node's`;
}

/**
 * Every question card, in the order the Verify tab lists them: the plain data
 * of `GROUP_INFO` (importable on the main thread, ruling F28) with its
 * headline and, for the virtual Reproducibility, its membership.
 */
export const STRESS_GROUPS: readonly StressGroup[] = GROUP_INFO.map((info) =>
  info.virtual === true
    ? {
        ...info,
        collects: (r: StressResult) => r.fingerprint !== undefined,
        headline: reproducibilityHeadline,
      }
    : { ...info, headline: standardHeadline },
);

/** The results a group's card shows. */
export function groupResults(
  g: StressGroup,
  results: readonly StressResult[],
): StressResult[] {
  return results.filter(g.collects ?? ((r) => r.group === g.id));
}
