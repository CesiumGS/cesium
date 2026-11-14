// A post stage written in Slang (shaders/postApi.slang, compiled by `npm run shaders`):
// what the engine checks of the unit's group 1 against the stage that takes it. The
// fake GPU runs no shaders; spikes/observer.ts (groups `curve`, `veil`) checks the pixels.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  PostStageError,
  createPostStage,
  slangPostShader,
  type SlangPostLayout,
} from "../src/scene/postStage.ts";

const CODE = `@group(1) @binding(0) var<uniform> uniforms_0 : array<vec4<f32>, 1>;
fn postStageBridge(uv: vec2<f32>, pixel: vec2<i32>, size: vec2<f32>, preExposure: f32, pixelAngle: f32, mip: u32) -> vec4<f32> { return vec4<f32>(0.0); }
fn postStage(input: PostInput) -> vec4<f32> {
  return postStageBridge(input.uv, input.pixel, input.size, input.preExposure, input.pixelAngle, input.mip);
}`;

const LAYOUT: SlangPostLayout = {
  uniforms: [
    { name: "gain", offset: 0 },
    { name: "tint", offset: 16 },
  ],
  bindings: [
    { name: "uniforms", binding: 0, kind: "uniform" },
    { name: "stageSampler", binding: 1, kind: "sampler" },
    { name: "half", binding: 2, kind: "texture" },
  ],
};

/** A stage taking the unit; `more` changes what it declares, and `layout` the unit's. */
function make(
  layout: SlangPostLayout = LAYOUT,
  more: Record<string, unknown> = {},
) {
  return createPostStage({
    name: "s",
    slot: "scene",
    kind: "look",
    label: "S (a look)",
    uniforms: {
      gain: { type: "f32", value: 1 },
      tint: { type: "vec4f" },
    },
    textures: { half: { scale: 0.5 } },
    passes: [
      {
        name: "down",
        writes: ["half"],
        shader:
          "fn postStage(input: PostInput) -> vec4<f32> { return postColor(input.uv); }",
      },
      {
        name: "up",
        reads: ["half"],
        shader: slangPostShader("s.slang", CODE, layout),
      },
    ],
    ...more,
  });
}

const refusal = (make_: () => unknown): PostStageError => {
  try {
    make_();
  } catch (error) {
    expect(error).toBeInstanceOf(PostStageError);
    return error as PostStageError;
  }
  throw new Error("expected a PostStageError");
};

describe("a stage's Slang shader", () => {
  it("is taken when its group 1 is what the pass has", () => {
    const stage = make();
    expect(stage.passes[1]!.module.code).toContain("fn postStageBridge(");
    // Its own group 1: the engine adds none.
    expect(stage.passes[1]!.module.code.match(/@group\(1\)/g)).toHaveLength(1);
  });

  it("refuses a texture the pass doesn't read, naming it", () => {
    const wrong: SlangPostLayout = {
      ...LAYOUT,
      bindings: [
        ...LAYOUT.bindings.slice(0, 2),
        { name: "half", binding: 3, kind: "texture" },
      ],
    };
    const error = refusal(() => make(wrong));
    expect(error.field).toBe("passes.up.shader");
    expect(error.detail).toContain("`half`");
    expect(error.detail).toContain("binding 3");
  });

  it("refuses a name that isn't the texture's", () => {
    const wrong: SlangPostLayout = {
      ...LAYOUT,
      bindings: [
        ...LAYOUT.bindings.slice(0, 2),
        { name: "other", binding: 2, kind: "texture" },
      ],
    };
    expect(refusal(() => make(wrong)).detail).toContain(
      "binding 2 is `half` in this pass",
    );
  });

  it("refuses a uniform at another offset, or one the stage doesn't have", () => {
    const moved: SlangPostLayout = {
      ...LAYOUT,
      uniforms: [{ name: "gain", offset: 4 }],
    };
    expect(refusal(() => make(moved)).detail).toContain(
      "`uniforms.gain` is at byte 4 in the shader and 0 in the stage",
    );
    const extra: SlangPostLayout = {
      ...LAYOUT,
      uniforms: [{ name: "more", offset: 0 }],
    };
    expect(refusal(() => make(extra)).detail).toContain("`more`");
  });

  it("is a fragment pass: a compute pass is WGSL", () => {
    const error = refusal(() =>
      createPostStage({
        name: "c",
        slot: "scene",
        kind: "look",
        label: "C (a look)",
        passes: [
          {
            name: "c",
            compute: {},
            shader: slangPostShader("c.slang", CODE, {
              uniforms: [],
              bindings: [],
            }),
          },
        ],
      }),
    );
    expect(error.field).toBe("passes.c.compute");
  });

  it("still refuses an entry point of its own", () => {
    const error = refusal(() =>
      createPostStage({
        name: "e",
        slot: "scene",
        kind: "look",
        label: "E (a look)",
        shader: slangPostShader(
          "e.slang",
          `@fragment fn extra() {}\n${CODE.replace("@group(1) @binding(0) var<uniform> uniforms_0 : array<vec4<f32>, 1>;", "")}`,
          { uniforms: [], bindings: [] },
        ),
      }),
    );
    expect(error.detail).toContain("@fragment");
  });
});

describe("the stages the engine builds in Slang", () => {
  const dir = new URL("../src/shaders/generated/", import.meta.url);
  const stages = [
    "astroCurve",
    "glareInput",
    "glareDown",
    "glareUpTop",
    "glareUp",
    "glareVeil",
    "glareComposite",
    "glareClosed",
  ];

  it.each(stages)(
    "%s: no entry point, no loop, and the glue's postStage",
    (name) => {
      const code = readFileSync(new URL(`${name}.wgsl`, dir), "utf8");
      expect(code).not.toMatch(/@(vertex|fragment|compute)\b/);
      // A loop is the guard's to refuse, and Tint's to pay for.
      expect(code).not.toMatch(/\bloop\s*\{|\bfor\s*\(|\bwhile\s*\(/);
      expect(code).toContain("fn postStage(input: PostInput) -> vec4<f32>");
      expect(code).not.toContain("&(uniforms");
    },
  );
});
