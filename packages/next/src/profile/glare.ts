// Glare's tier by device and view size, as the engine chooses it today. The
// glare rules in rules.ts describe the same choice (test/profile.test.ts
// checks they agree on every persona and size); until views resolve their
// look, render code asks here, so it never reads the adapter itself
// (test/deviceFactsSeam.test.ts).
import type { GlareTier } from "../scene/observer.ts";

/** The facts glare's tier goes by. */
export interface GlareFacts {
  readonly adapter: {
    readonly vendor: string;
    readonly isFallbackAdapter: boolean;
  };
}

const isIntel = (facts: GlareFacts) =>
  facts.adapter.vendor.toLowerCase().includes("intel");

/**
 * The tier for a device at `pixels` of view: a fallback adapter has none; Intel starts
 * reduced, and only sources above 3.7 million pixels; anything else is full, and reduced
 * above 8.3 million. Starting values: nothing but an M2 has been measured.
 */
export function glareTier(facts: GlareFacts, pixels: number): GlareTier {
  if (facts.adapter.isFallbackAdapter) {
    return "off";
  }
  if (isIntel(facts)) {
    return pixels > 3_700_000 ? "sources" : "reduced";
  }
  return pixels > 8_300_000 ? "reduced" : "full";
}

/** Why `glareTier` chose, in a sentence, for a readout. */
export function glareTierReason(facts: GlareFacts, pixels: number): string {
  if (facts.adapter.isFallbackAdapter) {
    return "this GPU is a software fallback";
  }
  const megapixels = (pixels / 1e6).toFixed(1);
  if (isIntel(facts)) {
    return pixels > 3_700_000
      ? `an Intel GPU at ${megapixels} million pixels`
      : "an Intel GPU, which starts reduced until it is measured";
  }
  return pixels > 8_300_000
    ? `${megapixels} million pixels is a lot for one view`
    : "this GPU has room for all of it";
}
