import { describe, expect, it } from "vitest";
import {
  compileStyleExpression,
  type PropertyReader,
} from "../src/scene/styleExpression.ts";
import {
  compileVectorStyle,
  type CompiledModelLayer,
  type CompiledShapeLayer,
  type VectorStyleDocument,
} from "../src/vector/VectorStyle.ts";
import type { PointProperty } from "../src/vector/PointSource.ts";

const read: PropertyReader = (name) =>
  name === "kind"
    ? { wgsl: "p.kind", type: "number", enum: ["car", "truck", "bus"] }
    : { wgsl: `p.${name}`, type: "number" };
const wgsl = (source: string) => compileStyleExpression(source, read).wgsl;

/** A source's layout: an enum, a number, and the heading. */
const PROPERTIES: Record<string, PointProperty> = {
  kind: { offset: 0, components: 1, type: { enum: ["car", "truck", "bus"] } },
  speed: { offset: 1, components: 1, type: "f32" },
  heading: { offset: 2, components: 1, type: "f32" },
};
const compile = (style: VectorStyleDocument) =>
  compileVectorStyle(style, PROPERTIES);
const shaderOf = (style: VectorStyleDocument) =>
  (compile(style).layers[0] as CompiledShapeLayer).shader;

describe("the vector language's expressions", () => {
  it("reads lengths and angles with units", () => {
    expect(wgsl("14px")).toBe("14.0f");
    expect(wgsl("2km")).toBe("2000.0f");
    expect(wgsl("${speed} * 1m")).toBe("(p.speed * 1.0f)");
    expect(Number(wgsl("1rad").replace("f", ""))).toBeCloseTo(57.2958, 3);
  });

  it("compares enums with their names", () => {
    expect(wgsl("${kind} === 'truck'")).toBe("(p.kind == 1.0f)");
    expect(wgsl("'bus' !== ${kind}")).toBe("(!(p.kind == 2.0f))");
    expect(wgsl("${kind} === 'plane'")).toBe("false");
    expect(() => wgsl("${speed} === 'fast'")).toThrow(/isn't an enum/);
  });

  it("matches keys to results", () => {
    expect(wgsl("match(${kind}, 'car', 1, 'bus', 3, 0)")).toBe(
      "select(select(0.0f, 3.0f, (p.kind == 2.0f)), 1.0f, (p.kind == 0.0f))",
    );
    expect(() => wgsl("match(${kind}, 'car', 1)")).toThrow(/match/);
  });

  it("takes ?? as its left side where that compiles", () => {
    const strict: PropertyReader = (name) => {
      if (name === "missing") {
        throw new Error("no property missing");
      }
      return { wgsl: `p.${name}`, type: "number" };
    };
    expect(compileStyleExpression("${missing} ?? 2", strict).wgsl).toBe("2.0f");
    expect(compileStyleExpression("${speed} ?? 2", strict).wgsl).toBe(
      "p.speed",
    );
  });
});

describe("vector styles", () => {
  it("compiles a point layer's fields into its stages", () => {
    const shader = shaderOf({
      parameters: { near: { default: 500 } },
      layers: [
        {
          filter: "${view.distance} >= ${param.near}",
          shape: "diamond",
          size: "${speed} * 0.5px",
          fill: { color: "#ff0000" },
        },
      ],
    });
    expect(shader.code).toContain(
      "let show = (length(cesiumAnchor) >= uniforms.param_near);",
    );
    expect(shader.code).toContain(
      "let size = (vsInput.instance.speed * 0.5f);",
    );
    expect(shader.code).toContain("case 0u: { return styleMark(4u, p); }");
    expect(shader.code).toContain("let fill = vec4f(1.0f, 0.0f, 0.0f, 1.0f);");
  });

  it("chooses shapes per point, and draws symbol paths", () => {
    const shader = shaderOf({
      resources: {
        frame: { kind: "symbol", path: "M -1 -0.5 H 1 V 0.5 H -1 Z" },
      },
      layers: [{ shape: "match(${kind}, 'car', 'frame', 'circle')" }],
    });
    expect(shader.code).toContain("case 0u: { return styleMark(0u, p); }");
    expect(shader.code).toContain("case 1u: { return styleSymbol1(p); }");
    expect(shader.code).toContain("fn styleSymbol1(p: vec2f) -> f32");
  });

  it("colors by a categorical scale over an enum", () => {
    const shader = shaderOf({
      scales: {
        fills: {
          type: "categorical",
          range: { car: "#ffffff", bus: "#000000" },
        },
      },
      layers: [{ shape: "circle", fill: { color: "scale('fills', ${kind})" } }],
    });
    expect(shader.code).toContain(
      "select(select(vec4f(1.0f, 1.0f, 1.0f, 1.0f), vec4f(0.0f, 0.0f, 0.0f, 1.0f), (f32(fsInput.instance.kind) == 2.0f)), vec4f(1.0f, 1.0f, 1.0f, 1.0f), (f32(fsInput.instance.kind) == 0.0f))",
    );
  });

  it("inherits a group's filter and lets", () => {
    const shader = shaderOf({
      layers: [
        {
          filter: "${speed} > 1",
          let: { fast: "${speed} > 20" },
          layers: [{ filter: "${fast}", shape: "dot" }],
        },
      ],
    });
    expect(shader.code).toContain(
      "let show = ((vsInput.instance.speed > 1.0f) && (vsInput.instance.speed > 20.0f));",
    );
  });

  it("compiles a point layer for its points' cull and splats", () => {
    const layer = compile({
      parameters: { near: { default: 500 } },
      layers: [
        {
          filter: "${view.distance} >= ${param.near}",
          shape: "diamond",
          size: "${speed} * 0.5px",
          fill: { color: "#ff0000" },
          opacity: 0.5,
        },
      ],
    }).layers[0] as CompiledShapeLayer;
    expect(layer.kernel).toContain(
      "fn styleShow(i: u32, distance: f32) -> bool { return (distance >= uniforms.param_near); }",
    );
    expect(layer.kernel).toContain(
      "fn styleSize(i: u32, distance: f32) -> f32 { return (pointF32(i, 1u) * 0.5f); }",
    );
    expect(layer.kernel).toContain("return vec4f(fill.rgb, fill.a * 0.5f);");
    expect(layer.kernel).toContain("return styleShape(u32(0.0f), p);");
  });

  it("compiles a model layer for its pool's kernel", () => {
    const layer = compile({
      layers: [
        {
          filter: "${view.distance} < 300",
          shape: "model('truck')",
          heading: "${heading}",
          scale: "${kind} === 'bus' ? 2 : 1",
        },
      ],
    }).layers[0] as CompiledModelLayer;
    expect(layer.kind).toBe("model");
    expect(layer.model).toBe("truck");
    expect(layer.code).toContain("return (distance < 300.0f);");
    expect(layer.code).toContain("return pointF32(i, 2u);");
    expect(layer.code).toContain("(f32(pointU32(i, 0u)) == 2.0f)");
  });

  it("refuses what it doesn't support, at its path", () => {
    expect(() =>
      compile({ layers: [{ shape: "circle", text: "${name}" }] }),
    ).toThrow(/layers\[0\]: "text" isn't supported yet/);
    expect(() => compile({ layers: [{ shape: "hexagon" }] })).toThrow(
      /layers\[0\]\.shape: no symbol or well-known mark named hexagon/,
    );
    expect(() =>
      compile({ layers: [{ shape: "circle", size: "${nope}" }] }),
    ).toThrow(/layers\[0\]\.size: no property, let or define named nope/);
    expect(() => compile({ layers: [], show: true } as never)).toThrow(
      /unknown top-level key "show"/,
    );
  });
});
