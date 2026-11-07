// The globe's sky ray (skyRay.ts, Task 9 C2): a ray to the Moon ends on the
// Moon, which never blocks itself, so moon-from-here's line is never "lost
// behind the Moon"; Orion's line still is when the Moon is in the way.
import { describe, expect, it } from "vitest";
import { MOON_RADIUS } from "../examples/frames-explorer/scenarios/occultation.ts";
import { SCENES } from "../examples/frames-explorer/scenarios/scenes.ts";
import { moonBlocks, moonCut } from "../examples/frames-explorer/skyRay.ts";

const origin = [6_378_137, 0, 0];
const moon = [6_378_137 + 384_400_000, 0, 0];
const d = [1, 0, 0];
const range = 384_400_000;

describe("moonBlocks", () => {
  it("never blocks a ray whose target is the Moon itself", () => {
    // The bare cut sees the ray end inside the Moon.
    expect(moonCut(origin, d, range, moon)).toBeCloseTo(range - MOON_RADIUS, 3);
    expect(moonBlocks("moon", origin, d, range, moon)).toBeUndefined();
  });

  it("still blocks Orion's line behind the Moon", () => {
    expect(
      moonBlocks("orion", origin, d, range + 10_000_000, moon),
    ).toBeCloseTo(range - MOON_RADIUS, 3);
    // Off to the side, it doesn't.
    expect(moonBlocks("orion", origin, [0, 1, 0], range, moon)).toBeUndefined();
  });

  it("moon-from-here's sky ray targets the Moon, so it is never blocked by it", () => {
    expect(SCENES["moon-from-here"]?.skyRay?.target).toBe("moon");
  });
});
