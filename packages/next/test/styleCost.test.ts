// What a style change costs the device: its shader compiles once, as one
// module, and the pipelines the content needs are made from it; a style
// with the same code (a style used before, rebuilt from the same options)
// costs nothing. Counted on the fake GPU, so these are numbers of
// compiles, not times.
import { beforeAll, describe, expect, it } from "vitest";
import { CustomShader } from "../src/scene/CustomShader.ts";
import { FeatureStyle } from "../src/scene/FeatureStyle.ts";
import { styleScene, type StyleScene } from "./styleScene.ts";

describe("what a style change costs", () => {
  let scene: StyleScene;

  beforeAll(async () => {
    scene = await styleScene({ count: 1, columns: { Height: [10] } });
    await scene.settle();
  });

  /** Runs `change` and settles: what it made. */
  const cost = async (change: () => void) => {
    const before = {
      modules: scene.created.modules,
      pipelines: scene.created.pipelines.length,
    };
    change();
    await scene.settle();
    return {
      modules: scene.created.modules - before.modules,
      pipelines: scene.created.pipelines.slice(before.pipelines),
    };
  };

  it("compiles one module and four pipelines for a style, none for one it has", async () => {
    const first = await cost(() =>
      scene.setShader(new FeatureStyle({ show: "${Height} > 5" }).shader),
    );
    // Opaque, its shadow, the depth prepass and the depth pass.
    expect(first).toEqual({
      modules: 1,
      pipelines: [
        "feature style opaque",
        "feature style shadow",
        "feature style prepass",
        "feature style depth",
      ],
    });
    // Only a constant differs, and it is part of the code: all again.
    const constant = await cost(() =>
      scene.setShader(new FeatureStyle({ show: "${Height} > 50" }).shader),
    );
    expect(constant.modules).toBe(1);
    expect(constant.pipelines).toHaveLength(4);
    // Back to the first, rebuilt: the same code, so the same pipelines.
    const again = await cost(() =>
      scene.setShader(new FeatureStyle({ show: "${Height} > 5" }).shader),
    );
    expect(again).toEqual({ modules: 0, pipelines: [] });
  });

  it("compiles nothing when a constant is a uniform that changes", async () => {
    // What a style with its constants as uniforms would cost to change
    // (not built: FeatureStyle writes them into the code).
    const limit = (value: number) =>
      new CustomShader({
        label: "limit",
        metadata: { Height: "f32" },
        uniforms: { limit: { type: "f32", value } },
        vertex: `fn vertexMain(vsInput: VertexInput, vsOutput: ptr<function, VertexOutput>) {
  if (vsInput.metadata.Height > uniforms.limit) {
    (*vsOutput).positionMC = vec3f(0.0);
  }
}`,
      });
    const shader = limit(5);
    const first = await cost(() => scene.setShader(shader));
    expect(first.modules).toBe(1);
    const changed = await cost(() => shader.setUniform("limit", 50));
    expect(changed).toEqual({ modules: 0, pipelines: [] });
    // Another shader object with another value has the same code, so it
    // shares the pipelines (that its draws bind its own uniforms isn't
    // checked here: nothing is drawn).
    const other = await cost(() => scene.setShader(limit(80)));
    expect(other).toEqual({ modules: 0, pipelines: [] });
  });
});
