// The paths (src/profile/paths.ts, CS-22): one function chooses them from the
// device's facts, every choice is taken on some persona, and the engine builds
// with what it chose.
import { describe, expect, it } from "vitest";
import {
  PATHS,
  describePaths,
  deviceChoices,
  momentsStep,
  paths,
} from "../src/profile/paths.ts";
import { personas, type PersonaName } from "../src/profile/personas.ts";
import { installPersona } from "./fakeGpu.ts";

const NAMES = Object.keys(personas) as PersonaName[];

describe("paths(facts)", () => {
  it("chooses each path as the engine did from its capabilities", () => {
    for (const name of NAMES) {
      const facts = personas[name];
      const has = (f: string) => facts.features.includes(f as GPUFeatureName);
      const chosen = paths(facts);
      expect(chosen.starSubmission, name).toBe(
        has("indirect-first-instance") ? "indirect" : "direct",
      );
      expect(chosen.textureTranscode, name).toBe(
        has("texture-compression-bc")
          ? "bc7"
          : has("texture-compression-astc")
            ? "astc-4x4"
            : has("texture-compression-etc2")
              ? "etc2-rgba8"
              : "rgba8",
      );
      // An errored or unrun probe is per sample: right either way, only slower.
      expect(chosen.translucencyLists, name).toBe(
        facts.probes.storageWritesRunPerSample === false
          ? "per-pixel"
          : "per-sample",
      );
      expect(chosen.gpuTiming, name).toBe(
        has("timestamp-query") ? "timestamps" : "unavailable",
      );
      expect(momentsStep(facts), name).toBe(
        has("float32-blendable") ? "moments32" : "moments16",
      );
    }
  });

  it("ends every path with a choice that needs nothing", () => {
    for (const choices of Object.values(PATHS)) {
      expect(choices.at(-1)).not.toHaveProperty("needs");
    }
  });

  it("takes every choice on some persona, so none is dead", () => {
    const taken = new Set(
      NAMES.flatMap((name) =>
        Object.entries(paths(personas[name])).map(([p, c]) => `${p}:${c}`),
      ),
    );
    // ETC2 is never best on a persona: every one with it has BC7 or ASTC.
    const unreachable = new Set(["textureTranscode:etc2-rgba8"]);
    for (const [path, choices] of Object.entries(PATHS)) {
      for (const { choice } of choices) {
        const key = `${path}:${choice}`;
        expect(taken.has(key) || unreachable.has(key), key).toBe(true);
      }
    }
    const etc2Only = {
      ...personas["no-optional-features"],
      features: ["texture-compression-etc2"] as GPUFeatureName[],
    };
    expect(paths(etc2Only).textureTranscode).toBe("etc2-rgba8");
  });

  it("names each path and why, and survives structuredClone", () => {
    const facts = personas["no-optional-features"];
    const described = describePaths(facts);
    expect(described).toHaveLength(Object.keys(PATHS).length);
    expect(described[0]).toMatch(/^starSubmission: direct \(.+\)$/);
    expect(structuredClone(deviceChoices(facts))).toEqual(deviceChoices(facts));
  });
});

describe("the engine builds with its paths", () => {
  for (const name of ["m2-chrome", "no-optional-features"] as const) {
    it(`on ${name}`, async () => {
      installPersona(name);
      const { Engine } = await import("../src/scene/Engine.ts");
      const engine = await Engine.create();
      const chosen = deviceChoices(engine.gpu.facts);
      expect(engine.ctx.paths).toEqual(chosen.paths);
      const { pipelines } = engine.ctx;
      expect(pipelines.momentFormats).toEqual(
        chosen.moments === "moments32"
          ? ["r32float", "rgba32float"]
          : ["rgba16float", "rgba16float"],
      );
      expect(pipelines.listsPerSample).toBe(
        chosen.paths.translucencyLists === "per-sample",
      );
      engine.destroy();
    });
  }
});
