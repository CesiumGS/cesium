// The frames explorer's overlay accuracy lines (examples/frames-explorer/legend.ts,
// R8): every drawn overlay states how well it's placed.
import { describe, expect, it } from "vitest";
import { distortionAccuracy } from "../examples/frames-explorer/legend.ts";

describe("the distortion overlay's accuracy line (R8)", () => {
  it("leads with the placement's figure", () => {
    expect(distortionAccuracy("±2.00 m (1σ), the recorded operation")).toBe(
      "placed ±2.00 m (1σ), the recorded operation; contours from PROJ's scale factors",
    );
  });

  it("says a conversion is exact", () => {
    expect(distortionAccuracy("exact, a conversion")).toBe(
      "placed exact, a conversion; contours from PROJ's scale factors",
    );
  });

  it("keeps a not-bounded placement in view", () => {
    expect(distortionAccuracy("not bounded: PROJ states no accuracy")).toBe(
      "placement not bounded: PROJ states no accuracy; contours from PROJ's scale factors",
    );
  });

  it("never states the contours alone when a placement is known", () => {
    expect(distortionAccuracy("")).toBe(
      "placement not stated; contours from PROJ's scale factors",
    );
  });
});
