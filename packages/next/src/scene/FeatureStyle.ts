import { CustomShader, MAX_NAMED, packNamed } from "./CustomShader.ts";
import { stringIds } from "./stringIds.ts";
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
 * mesh hasn't them.
 *
 * String properties compare with `===`, `!==` and `match()`
 * (`${name} === 'Main St'`): strings aren't on the GPU, so a tile's string
 * columns are uploaded as ids (scene/stringIds.ts), the same for every
 * tile and style, and a literal compiles to its id. A string property
 * must be a string column in the tiles that have it: a numeric column
 * compared with a string never matches (as in 1.x), but a string column
 * used as a number reads an id. Regular expressions, string
 * concatenation, `isDefined()` and `undefined` checks are refused with an
 * error: a missing property reads 0 on the GPU, which can't tell it from
 * a 0 value.
 *
 * The properties `color` reads (and the colors' own alpha, which hides a
 * feature too) travel from the vertex to the fragment stage: at most 16
 * float components in all (a draw passes four vec4f between its stages).
 * Properties only `show` reads cost nothing there. A color's alpha scales
 * the material's; blended translucency comes from the material (not yet
 * from the style).
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
    // Properties the fragment stage reads: the ones its stages share.
    const inFragment = new Set<string>();
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
        if (stage === "fsInput") {
          inFragment.add(name);
        }
        const type = types[name] ?? "f32";
        return {
          wgsl: `${stage}.metadata.${field}`,
          type: STYLE_TYPES[type],
          // A number property may be a string column (its ids).
          ...(type === "f32"
            ? { string: (value: string) => stringIds.literal(value) }
            : {}),
        };
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
    const shared = [...inFragment].map((property) => types[property] ?? "f32");
    if (!packNamed(shared)) {
      const floats = shared.reduce(
        (n, type) =>
          n +
          (type === "f32"
            ? 1
            : type === "vec2f"
              ? 2
              : type === "vec3f"
                ? 3
                : 4),
        0,
      );
      throw new Error(
        `Style: its color reads ${inFragment.size} properties, ${floats} float components, and a draw passes ${MAX_NAMED * 4} between its stages. Properties only show reads cost nothing there.`,
      );
    }
    const metadata = Object.fromEntries(
      [...fields].map(([property, field]) => [
        field,
        {
          property,
          type: types[property] ?? ("f32" as const),
          // Read only by `show` (the vertex stage): no room in the draw's
          // varyings.
          ...(inFragment.has(property) ? {} : { vertexOnly: true }),
        },
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
