import { describe, expect, it } from "vitest";
import { tdbMinusTt } from "../src/time/erfa/dtdb.ts";
import dtdbFixtures from "./fixtures/frames/dtdb.json";

describe("erfa", () => {
  it("tdbMinusTt matches pyerfa", () => {
    let amplitude = 0;
    for (const { jd1, jd2, dtdb } of dtdbFixtures) {
      expect(Math.abs(tdbMinusTt(jd1, jd2) - dtdb)).toBeLessThan(1e-9);
      amplitude = Math.max(amplitude, Math.abs(dtdb));
    }
    expect(amplitude).toBeGreaterThan(1.6e-3);
    expect(amplitude).toBeLessThan(1.7e-3);
  });
});
