import { CustomShader, MAX_NAMED, packNamed } from "./CustomShader.ts";
import { CapacityError } from "./CapacityError.ts";
import { stringIds } from "./stringIds.ts";
import {
  STYLE_HELPERS,
  STYLE_LINEAR_HELPER,
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

/**
 * Gives a style's string literals back when its shader is collected: an
 * id can't be reused while a shader that compares with it may draw.
 */
const literalsHeld = new FinalizationRegistry<string[]>((literals) => {
  for (const value of literals) {
    stringIds.unliteral(value);
  }
});

/** Colors in CSS notation are sRGB as written; the material's are linear. */
const SHADING = { linearColors: true } as const;

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
 * A style's colors are sRGB as written (`color('#ff8800')` shows as 1.x
 * shows it); "highlight" converts them (gamma 2.2) to the material's
 * linear values. 1.x's "replace" and "mix" don't convert, and neither do
 * they here: the color is used as linear, so it shows lighter than
 * written, and a white color leaves the material's as it is.
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
 * used as a number reads an id. Only the string columns a style reads are
 * uploaded, so make the style before its content is uploaded: a tile
 * uploaded earlier lacks them, and the engine reports it (`Engine.errors`),
 * as it does for a column left out because it mixes strings with numbers
 * or doesn't fit the mesh's directory (such a property reads 0, which
 * makes `!==` true). A null value and a missing one are both 0, so two
 * properties, one null and one missing, compare equal (1.x: not). Regular expressions, string
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
    const literals: string[] = []; // held until the shader goes (`literalsHeld`)
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
            return compileStyleExpression(define, reader(stage), SHADING);
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
            ? {
                string: (value: string) => {
                  try {
                    const id = stringIds.literal(value);
                    literals.push(value);
                    return id;
                  } catch (error) {
                    throw error instanceof CapacityError
                      ? new Error(
                          `Style: can't compare "${name}" with '${value}': the table of strings, ${stringIds.capacity} at most, is full.`,
                        )
                      : error;
                  }
                },
              }
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
        return check(
          compileStyleExpression(value, reader(stage), SHADING),
          value,
        );
      }
      // Conditions: the first true one's value, else `otherwise`.
      let result = otherwise;
      for (const [condition, expression] of [...value.conditions].reverse()) {
        const cond = compileStyleExpression(condition, reader(stage), SHADING);
        if (cond.type !== "boolean") {
          throw new Error(`Style: condition "${condition}" isn't a boolean.`);
        }
        const then = check(
          compileStyleExpression(expression, reader(stage), SHADING),
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
    // Colors come out of the expression compiler linear (SHADING), so they
    // apply to the material's linear color as they are. "Mix" and "replace"
    // blend in linear light: 1.x's blend of a CSS color is known to be
    // wrong (it uses the color as linear, so it shows lighter than
    // written), and isn't matched.
    const apply =
      mode === "replace"
        ? "c.rgb"
        : mode === "mix"
          ? `mix((*material).baseColor, c.rgb, ${f32(amount)})`
          : "(*material).baseColor * c.rgb";
    this.properties = [...fields.keys()];
    // Tiles upload the string columns a style reads, no others.
    for (const property of this.properties) {
      stringIds.watch(property);
    }
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
        STYLE_LINEAR_HELPER,
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
    literalsHeld.register(this.shader, literals);
  }
}
