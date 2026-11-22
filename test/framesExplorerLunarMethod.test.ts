// "How this is worked out" for the lunar clock (Task 4c item 1): the
// stand-on-moon answer says, in plain words, how the rate is measured, and
// stays faithful to the computation it describes (scenarios/standOnMoon.ts
// `lunarClockGain`, the catalog's stress/groups/lunar-time.ts). The route
// under the tree lights both clocks' paths up to ICRF, where they meet.
import { describe, expect, it } from "vitest";
import { routeSteps } from "../examples/frames-explorer/panel/routeSteps.ts";
import { SCENES } from "../examples/frames-explorer/scenarios/scenes.ts";
import {
  LUNAR_CLOCK_METHOD,
  LUNAR_SAMPLES,
} from "../examples/frames-explorer/scenarios/standOnMoon.ts";
import { EFFECT } from "../examples/frames-explorer/stress/shared.ts";
import type { TreeNode } from "../examples/frames-explorer/tree.ts";

const text = LUNAR_CLOCK_METHOD.map((s) => `${s.title}. ${s.text}`).join("\n");

describe("how the lunar clock's rate is worked out", () => {
  it("is a few short steps, each with a title and its words", () => {
    expect(LUNAR_CLOCK_METHOD.length).toBeGreaterThanOrEqual(5);
    expect(LUNAR_CLOCK_METHOD.length).toBeLessThanOrEqual(7);
    for (const s of LUNAR_CLOCK_METHOD) {
      expect(s.title.length).toBeGreaterThan(0);
      expect(s.text.length).toBeGreaterThan(0);
      expect(s.text.length, s.title).toBeLessThan(320);
    }
  });

  it("names the two clocks: at the lunar site, and at sea level at the California datasheet point", () => {
    expect(text).toMatch(/lunar site/i);
    expect(text).toMatch(/sea level/);
    expect(text).toMatch(/California datasheet point/);
  });

  it("takes each clock through the frame tree into ICRF every hour of a lunar month, its velocity by a central difference", () => {
    expect(text).toContain("MOON_ME → MOON_ICRF → ICRF");
    expect(text).toContain("ITRF → GCRF → ICRF");
    expect(text).toMatch(/every hour/);
    expect(text).toMatch(/lunar month/);
    expect(text).toMatch(/central difference/);
    // The code's own sampling: hourly over a synodic month.
    expect(LUNAR_SAMPLES).toBe(709);
    expect(text).toContain("29.53 days");
  });

  it("names the method, properTimeRate: deeper in gravity (the Sun, the Earth and the Moon as point masses) or faster, a clock runs slower", () => {
    expect(text).toContain("properTimeRate");
    expect(text).toMatch(/deeper in gravity/);
    expect(text).toMatch(/the Sun's, the Earth's and the Moon's/);
    expect(text).toMatch(/point masses/);
    expect(text).toMatch(/faster-moving clock runs slower/);
  });

  it("gives the answer as the difference of the rates averaged over the month, in µs a day", () => {
    expect(text).toMatch(/difference between the two rates/);
    expect(text).toMatch(/averaged over the month/);
    expect(text).toMatch(/µs a day/);
  });

  it("says why the Moon's clock is fast: higher in the Earth's gravity well, outweighing its orbital speed", () => {
    expect(text).toMatch(/higher in the Earth's gravity well/);
    expect(text).toMatch(/outweighs its orbital speed/);
  });

  it("states its tolerance: the point-mass approximation, within 2% of Ashby & Patla's full model", () => {
    expect(text).toContain(`${EFFECT * 100}%`);
    expect(text).toMatch(/point-mass approximation/);
    expect(text).toMatch(/Ashby & Patla's full model/);
  });
});

const edge: TreeNode["edge"] = {
  kind: "constant",
  detail: "east-north-up at 90° S",
  accuracy: { note: "not stated: test" },
};
const node = (id: string, ...children: TreeNode[]): TreeNode => ({
  id,
  label: id,
  edge,
  children,
});
const TREE = node(
  "ICRF",
  node("GCRF", node("ITRF")),
  node("MOON_ICRF", node("MOON_ME", node("Lunar site"))),
);

describe("the route lights both clocks' paths to ICRF (stand-on-moon)", () => {
  it("has two legs, each clock walked up to ICRF where they meet", () => {
    const scene = SCENES["stand-on-moon"]!;
    expect(scene.routeLegs).toBeDefined();
    const steps = routeSteps(
      TREE,
      {
        up: ["Lunar site", "MOON_ME", "MOON_ICRF"],
        ancestor: "ICRF",
        down: ["GCRF", "ITRF"],
      },
      scene.routeEnds!.start,
      scene.routeEnds!.end,
      scene.routeLegs,
    );
    expect(steps.map((s) => [s.leg, s.title])).toEqual([
      ["start", scene.routeEnds!.start.title],
      ["start", "Lunar site to MOON_ME"],
      ["start", "MOON_ME to MOON_ICRF"],
      ["start", "MOON_ICRF to ICRF"],
      ["end", scene.routeEnds!.end.title],
      ["end", "ITRF to GCRF"],
      ["end", "GCRF to ICRF"],
    ]);
    expect(steps.filter((s) => s.kind === "edge").map((s) => s.edge)).toEqual([
      "Lunar site",
      "MOON_ME",
      "MOON_ICRF",
      "ITRF",
      "GCRF",
    ]);
  });

  it("leaves a route without legs as it was: start, up, down, end", () => {
    const steps = routeSteps(
      TREE,
      { up: ["MOON_ME", "MOON_ICRF"], ancestor: "ICRF", down: ["GCRF"] },
      { title: "a", does: "" },
      { title: "b", does: "" },
    );
    expect(steps.map((s) => s.title)).toEqual([
      "a",
      "MOON_ME to MOON_ICRF",
      "MOON_ICRF to ICRF",
      "ICRF to GCRF",
      "b",
    ]);
    expect(steps.every((s) => s.leg === undefined)).toBe(true);
  });
});
