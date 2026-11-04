import { describe, expect, it } from "vitest";
import {
  compileStyleExpression,
  cssColor,
  type PropertyReader,
} from "../src/scene/styleExpression.ts";
import { FeatureStyle } from "../src/scene/FeatureStyle.ts";

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
