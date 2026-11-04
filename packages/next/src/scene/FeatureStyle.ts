import { CustomShader } from "./CustomShader.ts";
import {
  STYLE_HELPERS,
  compileStyleExpression,
  f32,
  type StyleType,
  type StyleValue,
} from "./styleExpression.ts";
import type { NamedType } from "./slangStages.ts";

/** A style value: an expression, or 1.x's `conditions` (first true wins). */
export type StyleExpression =
  string | boolean | { conditions: Array<[string, string]> };

export interface FeatureStyleOptions {
  /** Whether a feature draws (default true). Hidden in every pass. */
  show?: StyleExpression;
  /** A feature's color (default white), applied by `colorBlendMode`. */
  color?: StyleExpression;
  /** Named expressions, used as `${name}` in the others (1.x `defines`). */
  defines?: Record<string, string>;
  /**
   * How the color applies to the material's: "highlight" multiplies
   * (default), "replace" replaces, "mix" blends by `colorBlendAmount`
   * (1.x's `Cesium3DTileColorBlendMode`).
   */
  colorBlendMode?: "highlight" | "replace" | "mix";
  /** For "mix": 0 the material's color, 1 the style's. Default 0.5. */
  colorBlendAmount?: number;
  /**
   * Types of properties that aren't numbers (e.g. `{ position: "vec3f" }`);
   * the others read as f32.
   */
  types?: Record<string, NamedType>;
  label?: string;
}

const STYLE_TYPES: Record<NamedType, StyleType> = {
  f32: "number",
  vec2f: "vec2",
  vec3f: "vec3",
  vec4f: "vec4",
  mat2x2f: "vec4",
};

/**
 * Feature styling (plan §3.4): 1.x's 3D Tiles style (`show`, `color`,
 * `defines`, `conditions`) compiled to a custom shader over the features'
 * metadata: feature table columns, property attributes or property
 * textures, whichever a mesh has. `show` false, or a color with alpha 0,
 * hides a feature by collapsing its triangles in the vertex stage, so it
 * is gone from every pass (depth, shadows, picking); `color` applies in
 * the fragment stage. (Hiding reads properties per vertex: those in
 * property textures read 0 there.)
 *
 * Use `shader` as a model's `shader` or a tileset's `customShader`, or
 * pass the style as `Tileset3DOptions.style`. Properties read 0 where a
 * mesh hasn't them; strings aren't on the GPU, so expressions comparing
 * them are refused. A shader reads at most 4 properties. A color's alpha
 * scales the material's; blended translucency comes from the material
 * (not yet from the style).
 */
export class FeatureStyle {
  readonly shader: CustomShader;
  /** Properties the expressions read, by property ID. */
  readonly properties: string[];

  constructor(options: FeatureStyleOptions) {
    const fields = new Map<string, string>(); // property ID -> field name
    const types = options.types ?? {};
    const defines = options.defines ?? {};
    const reading = new Set<string>();
    // `${name}` in a stage: a define's expression, else the property.
    const reader =
      (stage: "vsInput" | "fsInput") =>
      (name: string): StyleValue => {
        const define = defines[name];
        if (define !== undefined) {
          if (reading.has(name)) {
            throw new Error(`Style: define ${name} refers to itself.`);
          }
          reading.add(name);
          try {
            return compileStyleExpression(define, reader(stage));
          } finally {
            reading.delete(name);
          }
        }
        let field = fields.get(name);
        if (field === undefined) {
          field = /^[A-Za-z][A-Za-z0-9_]*$/.test(name)
            ? name
            : `p${fields.size}`;
          fields.set(name, field);
        }
        const type = types[name] ?? "f32";
        return { wgsl: `${stage}.metadata.${field}`, type: STYLE_TYPES[type] };
      };
    const compile = (
      value: StyleExpression | undefined,
      stage: "vsInput" | "fsInput",
      type: StyleType,
      otherwise: string,
    ): string | undefined => {
      if (value === undefined) {
        return undefined;
      }
      if (typeof value === "boolean") {
        if (type !== "boolean") {
          throw new Error("Style: a color can't be a boolean.");
        }
        return String(value);
      }
      const check = (v: StyleValue, source: string) => {
        if (v.type !== type) {
          throw new Error(`Style: "${source}" is a ${v.type}, not a ${type}.`);
        }
        return v.wgsl;
      };
      if (typeof value === "string") {
        return check(compileStyleExpression(value, reader(stage)), value);
      }
      // Conditions: the first true one's value, else `otherwise`.
      let result = otherwise;
      for (const [condition, expression] of [...value.conditions].reverse()) {
        const cond = compileStyleExpression(condition, reader(stage));
        if (cond.type !== "boolean") {
          throw new Error(`Style: condition "${condition}" isn't a boolean.`);
        }
        const then = check(
          compileStyleExpression(expression, reader(stage)),
          expression,
        );
        result = `select(${result}, ${then}, ${cond.wgsl})`;
      }
      return result;
    };

    const show = compile(options.show, "vsInput", "boolean", "true");
    const color = compile(options.color, "fsInput", "vec4", "vec4f(1.0)");
    // A color with alpha 0 hides the feature as `show` does (a fragment
    // discard would leave its depth in the prepass: a hole).
    const colorInVertex = compile(
      options.color,
      "vsInput",
      "vec4",
      "vec4f(1.0)",
    );
    const hidden = [
      show !== undefined ? `!(${show})` : undefined,
      colorInVertex !== undefined ? `(${colorInVertex}).a == 0.0` : undefined,
    ].filter((h) => h !== undefined);
    const mode = options.colorBlendMode ?? "highlight";
    const amount = options.colorBlendAmount ?? 0.5;
    const apply =
      mode === "replace"
        ? "c.rgb"
        : mode === "mix"
          ? `mix((*material).baseColor, c.rgb, ${f32(amount)})`
          : "(*material).baseColor * c.rgb";
    this.properties = [...fields.keys()];
    const metadata = Object.fromEntries(
      [...fields].map(([property, field]) => [
        field,
        { property, type: types[property] ?? ("f32" as const) },
      ]),
    );
    this.shader = new CustomShader({
      label: options.label ?? "feature style",
      metadata,
      wgsl: [
        STYLE_HELPERS,
        hidden.length > 0
          ? `fn vertexMain(vsInput: VertexInput, vsOutput: ptr<function, VertexOutput>) {
  // Hidden: every vertex of the feature at one point, so its triangles
  // have no area in any pass.
  if (${hidden.join(" || ")}) {
    (*vsOutput).positionMC = vec3f(0.0);
  }
}`
          : "",
        color !== undefined
          ? `fn fragmentMain(fsInput: FragmentInput, material: ptr<function, MaterialOutput>) {
  let c = ${color};
  (*material).baseColor = ${apply};
  (*material).alpha *= c.a;
}`
          : "",
      ].join("\n"),
    });
  }
}
