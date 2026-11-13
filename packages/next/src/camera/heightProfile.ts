// The lift profile of a vertical exaggeration with a ceiling (`HeightScale`
// with a `profile`), as a function of height alone. A point at height h goes
// to h' = h + (k − 1)·G(h) along the ellipsoid's normal, G the part of the
// height that is lifted: h − base below the blend, constant above the
// ceiling, a quadratic blend over `band` between (so dh'/dh is continuous).
// This is the float64 mirror of shaders/heightProfile.slang
// `exaggerationLift`, and the one place the TypeScript side writes the
// profile: the georeference built-in (`verticalExaggerationEdge`) and the
// engine's exact terrain path both call it. G does not depend on the factor
// k, so the factor stays the weight a slider moves.

/** G(h) and dG/dh for a profile of `base`, `ceiling` and `band` (all metres, heights above the ellipsoid). */
export function liftedPart(
  h: number,
  base: number,
  ceiling: number,
  band: number,
): [number, number] {
  const a = ceiling - band;
  const u = Math.min(Math.max(h - a, 0), band);
  const g = Math.min(h, a) - base + u - (u * u) / (2 * band);
  const dg = h < a ? 1 : h < ceiling ? 1 - (h - a) / band : 0;
  return [g, dg];
}

/** The drawn height of height h at multiplier `factor`: h + (factor − 1)·G(h), and its derivative dh'/dh. */
export function drawnHeight(
  h: number,
  factor: number,
  base: number,
  ceiling: number,
  band: number,
): [number, number] {
  const [g, dg] = liftedPart(h, base, ceiling, band);
  return [h + (factor - 1) * g, 1 + (factor - 1) * dg];
}

/**
 * The drawn heights [lo, hi] of heights in [hMin, hMax] when the multiplier
 * is anywhere in [kLow, kHigh] (a warp's scale bucket), all positive. h' is
 * nondecreasing in h for a positive multiplier and affine in the multiplier,
 * so the extremes are at the ends of both: closed form.
 */
export function drawnHeightRange(
  hMin: number,
  hMax: number,
  kLow: number,
  kHigh: number,
  base: number,
  ceiling: number,
  band: number,
): [number, number] {
  let lo = Infinity;
  let hi = -Infinity;
  for (const k of [kLow, kHigh]) {
    lo = Math.min(lo, drawnHeight(hMin, k, base, ceiling, band)[0]);
    hi = Math.max(hi, drawnHeight(hMax, k, base, ceiling, band)[0]);
  }
  return [lo, hi];
}

/** The most dh'/dh can be for a multiplier in [kLow, kHigh]: dG/dh is in [0, 1], so dh'/dh is between 1 and k. */
export function drawnSlopeBound(kLow: number, kHigh: number): number {
  return Math.max(1, kLow, kHigh);
}
