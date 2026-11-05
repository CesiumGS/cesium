import { describe, expect, it } from "vitest";
import {
  bindDeclaredUniforms,
  declaredUniforms,
} from "../src/scene/slangControls.ts";

/** Reflection's parameters, as Slang's `toJsonObject` gives them. */
const scalar = (scalarType: string) => ({ kind: "scalar", scalarType });
const params = [
  {
    name: "glow",
    binding: { kind: "uniform" },
    userAttribs: [
      { name: "Slider", arguments: [0.5, 0, 2] },
      { name: "Label", arguments: ["Glow amount"] },
    ],
    type: scalar("float32"),
  },
  {
    name: "tint",
    binding: { kind: "uniform" },
    userAttribs: [{ name: "Color", arguments: [1, 0.5, 0.25] }],
    type: {
      kind: "vector",
      elementCount: 3,
      elementType: scalar("float32"),
    },
  },
  {
    name: "outlines",
    binding: { kind: "uniform" },
    userAttribs: [{ name: "Toggle", arguments: [1] }],
    type: scalar("bool"),
  },
  {
    name: "steps",
    binding: { kind: "uniform" },
    userAttribs: [{ name: "Slider", arguments: [4, 1, 8] }],
    type: scalar("int32"),
  },
  { name: "plain", binding: { kind: "uniform" }, type: scalar("float32") },
  // The contract's own buffer: not a declared uniform.
  {
    name: "uniforms",
    binding: { kind: "descriptorTableSlot" },
    type: { kind: "constantBuffer" },
  },
];

describe("declaredUniforms", () => {
  const declared = declaredUniforms(params, new Set(["uniforms"]));

  it("makes a control per declared uniform, from its type and attributes", () => {
    expect(declared.controls.map((c) => [c.name, c.kind, c.type])).toEqual([
      ["glow", "slider", "f32"],
      ["tint", "color", "vec3f"],
      ["outlines", "toggle", "u32"],
      ["steps", "slider", "i32"],
      ["plain", "number", "f32"],
    ]);
    const glow = declared.controls[0]!;
    expect(glow).toMatchObject({
      label: "Glow amount",
      value: 0.5,
      min: 0,
      max: 2,
    });
    expect(declared.controls[3]!.step).toBe(1);
    expect(declared.uniforms.tint).toEqual({
      type: "vec3f",
      value: [1, 0.5, 0.25],
    });
    expect([...declared.bools]).toEqual(["outlines"]);
  });

  it("refuses a type a uniform buffer field can't be", () => {
    expect(() =>
      declaredUniforms(
        [
          {
            name: "m",
            binding: { kind: "uniform" },
            type: { kind: "matrix" },
          },
        ],
        new Set(),
      ),
    ).toThrow(/uniform m/);
  });
});

describe("bindDeclaredUniforms", () => {
  const declared = declaredUniforms(params.slice(0, 4), new Set());

  it("replaces declarations in place, keeping every line's number", () => {
    const source = `import cesium;
// uniform float glow; (a comment, left alone)
[Slider(0.5, 0, 2)] [Label("Glow amount")]
uniform float glow;
[Color(1, 0.5, 0.25)] uniform float3 tint;
  [Toggle(true)] uniform bool outlines;
[Slider(4, 1, 8)] uniform int steps;
public void fragmentMain() { float x = glow; }`;
    const bound = bindDeclaredUniforms(source, declared);
    expect(bound.split("\n").length).toBe(source.split("\n").length);
    expect(bound).toContain("// uniform float glow; (a comment, left alone)");
    expect(bound).toContain("#define glow (uniforms.glow)\n");
    expect(bound).toContain("#define tint (uniforms.tint)");
    expect(bound).toContain("  #define outlines (uniforms.outlines != 0u)");
    expect(bound.split("\n")[7]).toBe(
      "public void fragmentMain() { float x = glow; }",
    );
  });

  it("asks for a line of its own when code comes before a declaration", () => {
    const one = declaredUniforms(params.slice(0, 1), new Set());
    expect(() =>
      bindDeclaredUniforms("float a = 1; uniform float glow;", one),
    ).toThrow(/line of its own/);
  });
});
