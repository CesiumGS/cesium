// Each ported scenario on the globe (examples/frames-explorer/scenarios/
// scenes.ts): the tour's stops 2, 5 and 6 as scenarios. Their triads, light,
// exposure and flights carried over from the tour's tests, the backdrop Moon
// said plainly, and the lunar site's triad at the exact south pole (ruling
// S5).
import { describe, expect, it } from "vitest";
import { NARROW_VIEW } from "../examples/frames-explorer/content.ts";
import {
  LUNAR_SITE,
  READY,
  SACRAMENTO,
  SCENES,
  latitudeText,
  lunarSitePosition,
  sceneExposure,
} from "../examples/frames-explorer/scenarios/scenes.ts";
import { SCENARIOS } from "../examples/frames-explorer/scenarios/specs.ts";
import { MOON } from "../src/scene/Body.ts";
import { eastNorthUpToFixedFrame } from "../src/math/transforms.ts";

const scene = (id: keyof typeof SCENES) => SCENES[id]!;

describe("the strip's scenarios", () => {
  it("are the three ported from the tour, the two on the ground (Task 6a), the two looking up (Task 6b) the drone and the ship (Task 7), the robot arm (Task 7b) and the capstone last (Task 8), in the strip's order, opening on one-path", () => {
    expect(READY).toEqual([
      "one-path",
      "earth-turns",
      "moon-from-here",
      "stand-on-moon",
      "dish-tracks",
      "bim-site",
      "corridor",
      "drone",
      "ship",
      "robot-arm",
      "everything",
    ]);
    expect(READY[0]).toBe(SCENARIOS[0]!.id);
    expect(READY.at(-1)).toBe("everything");
  });
});

describe("earth-turns: the tour's stop 2, GCRF against ITRF over a day", () => {
  const s = scene("earth-turns");
  it("draws the geocentric pair and Sacramento's site, riding the turning Earth (owner, fix 1)", () => {
    expect(s.triads({ rate: 3600 })).toEqual([
      "ITRF",
      "GCRF",
      "Sacramento ENU",
    ]);
    expect(s.earthSites!({ rate: 3600 })).toEqual([SACRAMENTO]);
    expect(s.focus).toContain("Sacramento ENU");
  });

  it("dims the imagery by −1.5 at desktop widths and −0.6 on narrow views (F43)", () => {
    expect(sceneExposure(s, 728, NARROW_VIEW)).toBe(-1.5);
    expect(sceneExposure(s, NARROW_VIEW, NARROW_VIEW)).toBe(-1.5);
    expect(sceneExposure(s, NARROW_VIEW - 1, NARROW_VIEW)).toBe(-0.6);
  });

  it("is lit from the camera and names each axis, pinned", () => {
    expect(s.light).toBe("camera");
    expect(s.pinnedAxes).toBe(true);
  });

  it("plays the clock at the rate knob", () => {
    expect(s.clockRate!({ rate: 3600 })).toBe(3600);
    expect(s.clockRate!({ rate: 1 })).toBe(1);
  });
});

describe("one-path: the tour's stop 5", () => {
  const s = scene("one-path");
  it("draws Orion in the knob's frame, and that frame's triad at the Moon", () => {
    expect(s.orion!({ frame: "GCRF" })).toBe("GCRF");
    expect(s.orion!({ frame: "MOON_ME" })).toBe("MOON_ME");
    expect(s.triads({ frame: "MOON_ME" })).toContain("MOON_ME");
    expect(s.triads({ frame: "ITRF" })).not.toContain("MOON_ME");
  });

  it("flies to the orbit plane in 3.0 s and leaves the imagery alone", () => {
    expect(s.flight).toBe(3);
    expect(sceneExposure(s, 1200, NARROW_VIEW)).toBe(0);
  });
});

describe("stand-on-moon: the tour's stop 6", () => {
  const s = scene("stand-on-moon");
  it("says the imagery is a distant backdrop until plan 5 draws the Moon as a tileset", () => {
    expect(s.note).toMatch(/backdrop until plan 5 draws the Moon as a tileset/);
    expect(s.note).toMatch(/only from straight above/);
  });

  it("draws the site's triad, flies in 3.5 s and names where the site is", () => {
    expect(s.triads({ latitude: -90 })).toEqual([LUNAR_SITE]);
    expect(s.flight).toBe(3.5);
    expect(s.lunarSite!({ latitude: -45 })).toBe(-45);
    expect(latitudeText(-90)).toBe("90° S");
    expect(latitudeText(0)).toBe("the equator");
    expect(latitudeText(12.5)).toBe("12.5° N");
  });

  it("S5: east-north-up at the exact south pole is finite, orthonormal and right-handed", () => {
    for (const latitude of [-90, -89.99, 90]) {
      const p = lunarSitePosition(latitude);
      const m = eastNorthUpToFixedFrame(
        p,
        MOON.ellipsoid,
        new Float64Array(16),
      );
      const axis = (k: number) => [m[4 * k]!, m[4 * k + 1]!, m[4 * k + 2]!];
      const [e, n, u] = [axis(0), axis(1), axis(2)];
      expect([...e, ...n, ...u].every(Number.isFinite), String(latitude)).toBe(
        true,
      );
      const dot = (a: number[], b: number[]) =>
        a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]!;
      for (const v of [e, n, u]) {
        expect(Math.abs(dot(v, v) - 1)).toBeLessThan(1e-12);
      }
      expect(Math.abs(dot(e, n))).toBeLessThan(1e-12);
      expect(Math.abs(dot(n, u))).toBeLessThan(1e-12);
      expect(Math.abs(dot(u, e))).toBeLessThan(1e-12);
      // east × north = up
      const c = [
        e[1]! * n[2]! - e[2]! * n[1]!,
        e[2]! * n[0]! - e[0]! * n[2]!,
        e[0]! * n[1]! - e[1]! * n[0]!,
      ];
      for (let i = 0; i < 3; i++) {
        expect(c[i]!).toBeCloseTo(u[i]!, 12);
      }
      // Up is the outward vertical: down the Moon's axis at the south pole.
      expect(Math.sign(u[2]!)).toBe(Math.sign(latitude));
    }
  });
});

describe("everything at once: the capstone (Task 8)", () => {
  const s = scene("everything");
  it("frames the Earth and the Moon when an end is off the Earth, and both Earth ends from above otherwise", () => {
    expect(s.cameraFor!({ from: "ship", to: "lunar-site" })).toBe("earthMoon");
    expect(s.cameraFor!({ from: "orion", to: "dish" })).toBe("earthMoon");
    expect(s.cameraFor!({ from: "dish", to: "tool" })).toBe("site");
    const look = s.look!({ from: "ship", to: "tool" });
    // Between San Francisco and Cape Canaveral, high enough for both.
    expect(look.longitude).toBeGreaterThan(-122);
    expect(look.longitude).toBeLessThan(-81);
    expect(look.range).toBeGreaterThan(4e6);
    expect(look.pitch).toBeLessThan(-89);
  });

  it("draws Orion's path in GCRF only when Orion is an end, and the two ends' own triads", () => {
    expect(s.orion!({ from: "orion", to: "dish" })).toBe("GCRF");
    expect(s.orion!({ from: "ship", to: "lunar-site" })).toBeUndefined();
    expect(s.triads({ from: "ship", to: "lunar-site" })).toEqual([
      "Mast sensor",
      LUNAR_SITE,
    ]);
    expect(s.triads({ from: "orion", to: "tool" })).toEqual(["Tool"]);
  });

  it("drives From and To from the tree, each object a node, and names the route's ends", () => {
    expect(s.treePair).toMatchObject({ from: "from", to: "to" });
    expect(Object.keys(s.treePair!.nodes)).toEqual([
      "dish",
      "ship",
      "orion",
      "lunar-site",
      "tool",
    ]);
    expect(s.focus).toEqual(
      expect.arrayContaining(["ICRF", ...Object.values(s.treePair!.nodes)]),
    );
    const ends = s.routeEndsFor!({ from: "dish", to: "orion" });
    expect(ends.start.title).toBe("From the dish (DSS-43)");
    expect(ends.end.title).toBe("To Orion");
  });
});
