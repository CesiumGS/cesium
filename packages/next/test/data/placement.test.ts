// TilesetPlacement on the California zone 3 ftUS + NAVD88 frame (plan 4b task
// 10). `npm run test:data` runs it.
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { framesDataDirectory } from "../../scripts/frameData.mjs";
import { EngineeringFrame } from "../../src/engineering/EngineeringFrame.ts";
import {
  placeReprojected,
  placeRigid,
} from "../../src/engineering/placement.ts";
import { loadProj } from "../../src/engineering/proj.ts";
import { EARTH } from "../../src/scene/Body.ts";

const base = `${join(framesDataDirectory(), "proj")}/`;
/** The grids this file's PROJ loads: Node, like the browser, loads none unless named (Task 21). */
const GRIDS = ["us_noaa_g2018u0.tif"];
const US_FOOT = 0.3048006096012192;
const distance = (a: ArrayLike<number>, b: ArrayLike<number>) =>
  Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!, a[2]! - b[2]!);

async function californiaFrame() {
  return EngineeringFrame.create(
    {
      name: "CA3",
      body: EARTH,
      crs: { format: "wkid", authority: "EPSG", wkid: 6420, vcsWkid: 6360 },
      site: {
        origin: [6_000_000, 2_100_000, 0],
        rotation: (12.5 * Math.PI) / 180,
        scale: 1.0000375,
      },
    },
    await loadProj({ base, grids: GRIDS }),
  );
}

// 21 points on a 164,042 ftUS (50 km) line.
const line = (): number[][] =>
  Array.from({ length: 21 }, (_, i) => [
    (i * 164_042) / 20,
    (i * 164_042) / 40,
    25,
  ]);
const worstRoundTrip = (p: {
  displayed: (d: number[]) => Float64Array;
  designOf: (p: Float64Array) => Float64Array;
}) => {
  let worst = 0;
  for (const d of line()) {
    const back = p.designOf(p.displayed(d));
    for (let i = 0; i < 3; i++) {
      worst = Math.max(worst, Math.abs(back[i]! - d[i]!) * US_FOOT);
    }
  }
  return worst;
};

describe("TilesetPlacement: rigid", () => {
  const anchor = [0, 0, 0];

  it("is exact at the anchor and inverts its own forward within 1e-9 m", async () => {
    const frame = await californiaFrame();
    const p = placeRigid(frame, anchor);
    expect(p.mode).toBe("rigid");
    expect(p.rigid).toBeDefined();
    expect(
      distance(p.displayed(anchor), frame.toBodyFixed(anchor)),
    ).toBeLessThan(1e-6);
    expect(worstRoundTrip(p)).toBeLessThan(1e-9);
  });

  it("sags 7.8 m (+-1.5) at 10 km and 31 m (+-3) at 20 km of grid east", async () => {
    const frame = await californiaFrame();
    const p = placeRigid(frame, anchor);
    const at10 = p.displayError([10_000 / US_FOOT, 0, 0]);
    const at20 = p.displayError([20_000 / US_FOOT, 0, 0]);
    expect(Math.abs(at10 - 7.8)).toBeLessThan(1.5);
    expect(Math.abs(at20 - 31)).toBeLessThan(3);
    expect(p.displayError(anchor)).toBeLessThan(1e-6);
  });

  it("writes into out", async () => {
    const frame = await californiaFrame();
    const p = placeRigid(frame, anchor);
    const out = new Float64Array(3);
    expect(p.displayed([100, 200, 5], out)).toBe(out);
    expect(p.designOf(out, new Float64Array(3))[0]).toBeCloseTo(100, 6);
  });
});

describe("TilesetPlacement: reprojected", () => {
  it("is the frame itself: designOf inverts displayed within 1e-4 m, no display error", async () => {
    const frame = await californiaFrame();
    const p = placeReprojected(frame);
    expect(p.mode).toBe("reprojected");
    expect(p.rigid).toBeUndefined();
    expect(worstRoundTrip(p)).toBeLessThan(1e-4);
    for (const d of line()) {
      expect(p.displayError(d)).toBe(0);
      expect(distance(p.displayed(d), frame.toBodyFixed(d))).toBe(0);
    }
  });
});
