import { describe, expect, it } from "vitest";
import {
  compileStyleExpression,
  cssColor,
  type PropertyReader,
} from "../src/scene/styleExpression.ts";
import { FeatureStyle } from "../src/scene/FeatureStyle.ts";
import { STRING_ID_BASE, stringIds } from "../src/scene/stringIds.ts";

/** Properties as `p.<name>` numbers (vectors where named so). */
const read: PropertyReader = (name) =>
  name === "position"
    ? { wgsl: "p.position", type: "vec3" }
    : { wgsl: `p.${name.replace(/\W/g, "_")}`, type: "number" };
const wgsl = (source: string) => compileStyleExpression(source, read);

describe("style expressions", () => {
  it("follows JavaScript precedence", () => {
    expect(wgsl("1 + 2 * 3 > 6 && !false").wgsl).toBe(
      "(((1.0f + (2.0f * 3.0f)) > 6.0f) && (!false))",
    );
    expect(wgsl("${a} > 1 ? 2 : 3 + 4")).toEqual({
      wgsl: "select((3.0f + 4.0f), 2.0f, (p.a > 1.0f))",
      type: "number",
    });
  });

  it("reads properties in all three forms", () => {
    expect(wgsl("${Height}").wgsl).toBe("p.Height");
    expect(wgsl("${feature.Height}").wgsl).toBe("p.Height");
    expect(wgsl("${feature['building:levels']}").wgsl).toBe(
      "p.building_levels",
    );
  });

  it("makes colors as 1.x does", () => {
    expect(cssColor("red")).toEqual([1, 0, 0, 1]);
    expect(cssColor("#0f0")).toEqual([0, 1, 0, 1]);
    expect(cssColor("#0000ff80")).toEqual([0, 0, 1, 128 / 255]);
    expect(cssColor("nope")).toBeUndefined();
    expect(wgsl("color('red', 0.5)").wgsl).toBe(
      "vec4f(1.0f, 0.0f, 0.0f, 0.5f)",
    );
    // rgb takes bytes, rgba's alpha is 0–1, hsl's hue 0–1.
    expect(wgsl("rgb(255, 0, ${a})").wgsl).toBe(
      "vec4f(255.0f / 255.0, 0.0f / 255.0, p.a / 255.0, 1.0f)",
    );
    expect(wgsl("hsla(0.5, 1, 0.5, 0.25)").wgsl).toBe(
      "styleHsl(0.5f, 1.0f, 0.5f, 0.25f)",
    );
    expect(wgsl("color('blue').b").wgsl).toBe(
      "vec4f(0.0f, 0.0f, 1.0f, 1.0f)[2]",
    );
  });

  it("types vectors and component-wise functions", () => {
    expect(wgsl("vec3(1) * 2.0").type).toBe("vec3");
    expect(wgsl("length(${position})")).toEqual({
      wgsl: "length(p.position)",
      type: "number",
    });
    expect(wgsl("max(${position}, 0)").wgsl).toBe(
      "max(p.position, vec3f(0.0f))",
    );
    expect(wgsl("round(${a})").wgsl).toBe("styleRound(p.a)");
    // Different types are never strictly equal (1.x).
    expect(wgsl("${a} === true").wgsl).toBe("false");
    expect(wgsl("vec2(1, 2) === vec2(1, 2)").wgsl).toBe(
      "all(vec2f(1.0f, 2.0f) == vec2f(1.0f, 2.0f))",
    );
  });

  it("refuses what the GPU can't do, by name", () => {
    expect(() => wgsl("${name} === 'Main St'")).toThrow(/string 'Main St'/);
    expect(() => wgsl("regExp('a').test(${b})")).toThrow();
    expect(() => wgsl("${a} =~ ${b}")).toThrow(/regular expressions/);
    expect(() => wgsl("${a} === undefined")).toThrow(/undefined/);
    expect(() => wgsl("${a} > 1 ? 1 : true")).toThrow(/branches differ/);
    expect(() => wgsl("${a} + true")).toThrow(/needs numbers/);
    expect(() => wgsl("frob(1)")).toThrow(/unknown function frob/);
    expect(() => wgsl("color('chartreusey')")).toThrow(/unknown color/);
  });
});

describe("string properties", () => {
  /** Properties that may hold strings: their ids against a literal's. */
  const strings: PropertyReader = (name) => ({
    wgsl: `p.${name}`,
    type: "number",
    string: (value) => stringIds.literal(value),
  });
  const id = (value: string) => `${stringIds.literal(value)}.0f`;

  it("compares a string property with a literal's id", () => {
    const main = id("Main St");
    expect(Number.parseFloat(main)).toBeGreaterThanOrEqual(STRING_ID_BASE);
    const text = (source: string) =>
      compileStyleExpression(source, strings).wgsl;
    expect(text("${name} === 'Main St'")).toBe(`(p.name == ${main})`);
    expect(text("'Main St' === ${name}")).toBe(`(p.name == ${main})`);
    expect(text("${name} !== 'Main St'")).toBe(`(!(p.name == ${main}))`);
    expect(text("${name} == 'Main St'")).toBe(`(p.name == ${main})`);
    // Each literal has its own id; two properties compare as their ids.
    expect(text("${a} === ${b}")).toBe("(p.a == p.b)");
    expect(text("match(${kind}, 'park', 1, 'road', 2, 0)")).toBe(
      `select(select(0.0f, 2.0f, (p.kind == ${id("road")})), 1.0f, (p.kind == ${id("park")}))`,
    );
  });

  it("still refuses a string where nothing could be one", () => {
    expect(() => compileStyleExpression("${a} + 'x' > 1", strings)).toThrow(
      /outside color/,
    );
    // A vector isn't a string property.
    expect(() =>
      compileStyleExpression("${v} === 'x'", (name) => ({
        wgsl: `p.${name}`,
        type: "vec3",
      })),
    ).toThrow(/isn't an enum or a string property/);
  });

  it("is refused for regular expressions and undefined checks, with the reason", () => {
    expect(() => wgsl("regExp('a').test(${b})")).toThrow(/methods/);
    expect(() => wgsl("${a} =~ regExp('b')")).toThrow(/regExp\(\) isn't/);
    expect(() => wgsl("isDefined(${a})")).toThrow(/missing property reads 0/);
  });
});

describe("the properties a style reads", () => {
  const many = (n: number) =>
    Array.from({ length: n }, (_, i) => `\${p${i}}`).join(" + ");

  it("passes 16 float components from the vertex to the fragment stage", () => {
    expect(
      () => new FeatureStyle({ color: `vec4(${many(16)})` }),
    ).not.toThrow();
    expect(() => new FeatureStyle({ color: `vec4(${many(17)})` })).toThrow(
      /color reads 17 properties, 17 float components, and a draw passes 16/,
    );
    // Vectors take their components: five vec3 don't fit.
    expect(
      () =>
        new FeatureStyle({
          color:
            "vec4(length(${a}) + length(${b}) + length(${c}) + length(${d}) + length(${e}))",
          types: {
            a: "vec3f",
            b: "vec3f",
            c: "vec3f",
            d: "vec3f",
            e: "vec3f",
          },
        }),
    ).toThrow(/15 float|5 properties, 15/);
  });

  it("lets show read as many as it likes: they take no varying", () => {
    const style = new FeatureStyle({
      show: `${many(40)} > 1`,
      color: "vec4(${tint})",
    });
    expect(style.properties).toHaveLength(41);
    const code = style.shader.code;
    // Only tint is passed on; the rest read 0 in the fragment stage.
    expect(code).toContain("(*out).named0 = vec4f(metadata.tint");
    expect(code).not.toContain("metadata.p0, ");
    expect(code).toContain(
      "fn fragmentMetadata(f: CesiumFragment) -> Metadata {\n  return Metadata(f32(), f32(), f32(),",
    );
    expect(style.shader.named.vertexOnly).toHaveLength(40);
    expect(style.shader.named.vertexOnly).not.toContain("tint");
  });

  it("takes a property read by color as shared even if show reads it too", () => {
    const style = new FeatureStyle({
      show: "${h} > 3",
      color: "vec4(${h})",
    });
    expect(style.shader.named.vertexOnly).toEqual([]);
  });
});

describe("FeatureStyle", () => {
  it("compiles show, conditions and defines into one shader", () => {
    const style = new FeatureStyle({
      defines: { tall: "${Height} > 60" },
      show: "${feature['building:levels']} >= 2",
      color: {
        conditions: [
          ["${tall}", "color('red')"],
          ["true", "color('white', 0.5)"],
        ],
      },
    });
    expect(style.properties).toEqual(["building:levels", "Height"]);
    const code = style.shader.code;
    // Hidden by show, or by a color's alpha 0, in the vertex stage.
    expect(code).toContain(
      "if (!((vsInput.metadata.p0 >= 2.0f)) || (select(select(vec4f(1.0), vec4f(1.0f, 1.0f, 1.0f, 0.5f), true), vec4f(1.0f, 0.0f, 0.0f, 1.0f), (vsInput.metadata.Height > 60.0f))).a == 0.0)",
    );
    expect(code).toContain(
      "let c = select(select(vec4f(1.0), vec4f(1.0f, 1.0f, 1.0f, 0.5f), true), vec4f(1.0f, 0.0f, 0.0f, 1.0f), (fsInput.metadata.Height > 60.0f));",
    );
    expect(style.shader.named.metadata).toEqual({ p0: "f32", Height: "f32" });
    expect(style.shader.named.properties).toEqual({
      p0: "building:levels",
      Height: "Height",
    });
  });

  it("refuses a color that isn't one, and self-referring defines", () => {
    expect(() => new FeatureStyle({ color: "${Height} > 3" })).toThrow(
      /boolean, not a vec4/,
    );
    expect(
      () =>
        new FeatureStyle({ defines: { a: "${a} + 1" }, color: "vec4(${a})" }),
    ).toThrow(/refers to itself/);
  });
});
