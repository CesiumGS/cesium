// The eye's point limit: its numbers, and when a view has it (plan's Task 11).
import { describe, expect, it } from "vitest";
import { MAGNITUDE_ZERO_ILLUMINANCE } from "../src/atmosphere/stars.ts";
import { eyeLimitStage } from "../src/scene/eyeLimit.ts";
import { SCOTOPIC_WHITE, eyePointLimit } from "../src/scene/eye.ts";
import { cameraObserver, eyeObserver } from "../src/scene/observer.ts";
import type { PostStageViewInfo } from "../src/scene/postStage.ts";
import type { View } from "../src/scene/View.ts";

const magnitude = (photopic: number) =>
  -2.5 *
  Math.log10(
    eyePointLimit(photopic * SCOTOPIC_WHITE) / MAGNITUDE_ZERO_ILLUMINANCE,
  );

describe("eyePointLimit", () => {
  it("is magnitude 6 dark-adapted", () => {
    expect(Math.abs(magnitude(1e-4) - 6)).toBeLessThan(0.05);
    expect(magnitude(1e-6)).toBe(magnitude(1e-4) + 0);
  });

  it("brightens with the rods' threshold, as computed for the plan", () => {
    for (const [adaptation, wanted] of [
      [1e-3, 5.4],
      [0.03, 2.7],
      [1, -1.2],
      [30, -4.8],
    ] as const) {
      expect(Math.abs(magnitude(adaptation) - wanted)).toBeLessThan(0.1);
    }
  });
});

/** What the stage's perView leaves, for a view of these. */
function run(
  exposure: object,
  {
    cones = 1e-4,
    metered = true,
    background = "atmosphere",
    airless = false,
  } = {},
) {
  const stage = eyeLimitStage();
  const set = new Map<string, unknown>();
  const values = {
    enabled: true,
    setUniform(name: string, value: number | readonly number[]) {
      set.set(name, value);
    },
  };
  const view = {
    observer: { exposure, stages: [stage] },
    background,
    body: { atmosphere: airless ? undefined : {} },
    autoExposure: {
      metered,
      cones: Math.log10(cones),
      rods: Math.log10(cones * SCOTOPIC_WHITE),
    },
  } as unknown as View;
  stage.perView!({ view } as PostStageViewInfo, values);
  return { enabled: values.enabled, set };
}

describe("eyeLimitStage", () => {
  const source = () => {
    const pass = eyeLimitStage().passes[0]!;
    return pass.module.code;
  };

  it("is a model in the scene slot, and reads depth", () => {
    const stage = eyeLimitStage();
    expect(stage.kind).toBe("model");
    expect(stage.slot).toBe("scene");
    expect(stage.reads).toEqual(["depth"]);
    expect(stage.label).toBe("The eye's point limit (a model)");
  });

  it("passes through where something was drawn", () => {
    expect(source()).toMatch(
      /if \(postDepthAt\(input\.pixel\) != 0\.0\) \{\s*return c;/,
    );
  });

  it("has a ring of 8 taps, unrolled", () => {
    expect(source().match(/around = eyeLimitBrighter\(/g)?.length).toBe(8);
    expect(source()).not.toMatch(/\bfor\s*\(/);
  });

  it("is on with the eye at night", () => {
    const { enabled, set } = run({ eye: true });
    expect(enabled).toBe(true);
    expect(set.get("limit")).toBeCloseTo(eyePointLimit(1e-4 * SCOTOPIC_WHITE));
    expect(set.get("peak")).toBeCloseTo(0.197, 2);
  });

  it("is off with a camera, in bright adaptation, or with no sky", () => {
    expect(run({ ev100: -3 }).enabled).toBe(false);
    expect(run({ eye: true }, { cones: 4000 }).enabled).toBe(false);
    expect(run({ eye: true }, { cones: 31 }).enabled).toBe(false);
    expect(run({ eye: true }, { cones: 29 }).enabled).toBe(true);
    expect(run({ eye: true }, { background: "color" }).enabled).toBe(false);
    expect(run({ eye: true }, { airless: true }).enabled).toBe(false);
    expect(run({ eye: true }, { metered: false }).enabled).toBe(false);
  });

  it("two views' sides differ, each by its own adaptation", () => {
    const stage = eyeLimitStage();
    const seen: unknown[] = [];
    for (const cones of [1e-4, 1]) {
      const view = {
        observer: { exposure: { eye: true }, stages: [stage] },
        background: "atmosphere",
        body: { atmosphere: {} },
        autoExposure: {
          metered: true,
          cones: Math.log10(cones),
          rods: Math.log10(cones * SCOTOPIC_WHITE),
        },
      } as unknown as View;
      stage.perView!({ view } as PostStageViewInfo, {
        enabled: true,
        setUniform(name, value) {
          if (name === "limit") {
            seen.push(value);
          }
        },
      });
    }
    expect(seen[1]).toBeGreaterThan(seen[0] as number);
  });
});

describe("eyeObserver", () => {
  it("has the limit by default, and not if it's turned off", () => {
    expect(eyeObserver().stages.map((s) => s.name)).toEqual([
      "eye-point-limit",
    ]);
    expect(eyeObserver({ pointLimit: false }).stages).toEqual([]);
    expect(eyeObserver({ compensation: 1 }).exposure).toEqual({
      eye: true,
      compensation: 1,
    });
    expect(cameraObserver({ ev100: 15 }).stages).toEqual([]);
  });

  it("doesn't share a stage between observers", () => {
    expect(eyeObserver().stages[0]).not.toBe(eyeObserver().stages[0]);
  });
});
