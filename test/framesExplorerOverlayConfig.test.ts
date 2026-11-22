// The overlays' fixed text (examples/frames-explorer/overlayConfig.ts):
// the line each shows before it draws and what its figure means (S-I7).
import { describe, expect, it } from "vitest";
import {
  CONVERGENCE_FACTOR,
  OVERLAYS,
  OVERLAY_LABEL,
  OVERLAY_NEEDS,
  defaultAccuracy,
  defaultDetail,
} from "../examples/frames-explorer/overlayConfig.ts";

describe("the overlays' fixed parts", () => {
  it("lists every overlay once, triads first", () => {
    expect(OVERLAYS[0]).toBe("triads");
    expect(new Set(OVERLAYS).size).toBe(OVERLAYS.length);
    expect(OVERLAYS).toEqual(Object.keys(OVERLAY_LABEL));
  });

  it("waits for PROJ or Orion's OEM where drawing needs them (R9)", () => {
    expect(OVERLAY_NEEDS.designGrid).toBe("proj");
    expect(OVERLAY_NEEDS.orion).toBe("orion");
    expect(OVERLAY_NEEDS.triads).toBeUndefined();
  });

  it("states the bias overlay's exaggeration", () => {
    expect(defaultAccuracy("bias", 1e6)).toBe(
      "exact by definition; drawn ×1 × 10⁶",
    );
    expect(defaultAccuracy("triads", 1e6)).toBe("");
  });

  it("says whether true north is at true scale", () => {
    expect(defaultDetail("designGrid", true)).toContain("at true scale");
    expect(defaultDetail("designGrid", false)).toContain(
      `drawn ${CONVERGENCE_FACTOR} times larger`,
    );
    expect(defaultDetail("orion", false)).toBeUndefined();
  });
});
