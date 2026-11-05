import type { UniformType, ValueUniform } from "./uniforms.ts";

/**
 * Uniforms a Slang shader declares itself, with controls (`cesium.slang`'s
 * `Slider`, `Color`, `Toggle`, `Label` attributes):
 *
 *   [Slider(0.5, 0.0, 1.0)] [Label("Glow")] uniform float glow;
 *
 * Slang's reflection reads them (each parameter's type and its user
 * attributes with their arguments, `toJsonObject`), so the declarations
 * are checked by the compiler, not parsed from comments. Each becomes a
 * field of the shader's uniform buffer (`uniforms.glow`), its declaration
 * replaced in place by `#define glow (uniforms.glow)` so the shader uses it
 * by name and its lines keep their numbers in errors.
 */
export interface ShaderControl {
  /** The uniform's name in the shader. */
  name: string;
  /** What to show (`Label`, else the name). */
  label: string;
  kind: "slider" | "color" | "toggle" | "number";
  type: UniformType;
  /** The default: a number, or components. */
  value: number | number[];
  min?: number;
  max?: number;
  step?: number;
}

/** A parameter of Slang's reflection JSON (the parts read here). */
interface ReflectedParameter {
  name: string;
  userAttribs?: Array<{ name: string; arguments: Array<number | string> }>;
  binding?: { kind: string };
  type: {
    kind: string;
    scalarType?: string;
    elementCount?: number;
    elementType?: { kind: string; scalarType?: string };
  };
}

const SCALARS: Record<string, UniformType> = {
  float32: "f32",
  int32: "i32",
  uint32: "u32",
  // No bool in uniform buffers: a u32 read as `!= 0`.
  bool: "u32",
};
const VECTORS: Record<number, UniformType> = {
  2: "vec2f",
  3: "vec3f",
  4: "vec4f",
};

export interface DeclaredUniforms {
  controls: ShaderControl[];
  /** The uniforms to add to the shader's buffer, with their defaults. */
  uniforms: Record<string, ValueUniform>;
  /** Declared `bool`: read as `!= 0`. */
  bools: Set<string>;
}

/**
 * The uniforms a shader declares (reflection's `parameters`), skipping
 * what the contract itself declares (`uniforms`, textures).
 */
export function declaredUniforms(
  parameters: ReflectedParameter[],
  contract: ReadonlySet<string>,
): DeclaredUniforms {
  const out: DeclaredUniforms = {
    controls: [],
    uniforms: {},
    bools: new Set(),
  };
  for (const p of parameters) {
    if (contract.has(p.name) || p.binding?.kind !== "uniform") {
      continue;
    }
    const t = p.type;
    const type =
      t.kind === "scalar"
        ? SCALARS[t.scalarType ?? ""]
        : t.kind === "vector" && t.elementType?.scalarType === "float32"
          ? VECTORS[t.elementCount ?? 0]
          : undefined;
    if (!type) {
      throw new Error(
        `uniform ${p.name}: its type isn't supported for a declared uniform (float, int, uint, bool, float2-4).`,
      );
    }
    const attribute = (name: string) =>
      p.userAttribs?.find((a) => a.name === name)?.arguments;
    const numbers = (args: Array<number | string> | undefined) =>
      (args ?? []).map(Number);
    const components = type.startsWith("vec") ? Number(type[3]) : 1;
    const label = String(attribute("Label")?.[0] ?? p.name);
    let control: ShaderControl;
    const color = attribute("Color");
    const slider = attribute("Slider");
    const toggle = attribute("Toggle");
    if (color && components >= 3) {
      const [r = 1, g = 1, b = 1] = numbers(color);
      control = {
        name: p.name,
        label,
        kind: "color",
        type,
        value: components === 4 ? [r, g, b, 1] : [r, g, b],
      };
    } else if (toggle && components === 1) {
      control = {
        name: p.name,
        label,
        kind: "toggle",
        type,
        value: numbers(toggle)[0] ? 1 : 0,
      };
    } else if (slider && components === 1) {
      const [value = 0, min = 0, max = 1] = numbers(slider);
      const integer = type !== "f32";
      control = {
        name: p.name,
        label,
        kind: "slider",
        type,
        value,
        min,
        max,
        step: integer ? 1 : (max - min) / 200,
      };
    } else {
      control = {
        name: p.name,
        label,
        kind: "number",
        type,
        value: components === 1 ? 0 : new Array<number>(components).fill(0),
      };
    }
    out.controls.push(control);
    out.uniforms[p.name] = { type, value: control.value };
    if (t.scalarType === "bool") {
      out.bools.add(p.name);
    }
  }
  return out;
}

/**
 * The source with each declared uniform's declaration (and its
 * attributes) replaced in place by a `#define` reading the buffer, the
 * same number of lines, so errors keep their line numbers.
 */
export function bindDeclaredUniforms(
  source: string,
  declared: DeclaredUniforms,
): string {
  const blank = blankComments(source);
  let out = source;
  // From the end, so earlier indices stay valid.
  const edits: Array<{ start: number; end: number; text: string }> = [];
  for (const { name } of declared.controls) {
    const pattern = new RegExp(
      `(?:\\[[^\\]\\n]*\\]\\s*)*\\buniform\\s+\\w+\\s+${name}\\s*;`,
      "g",
    );
    const match = pattern.exec(blank);
    if (!match) {
      throw new Error(
        `uniform ${name}: put its declaration on a line of its own (\`[Slider(…)] uniform float ${name};\`).`,
      );
    }
    const start = match.index;
    const lineStart = blank.lastIndexOf("\n", start - 1) + 1;
    if (blank.slice(lineStart, start).trim() !== "") {
      throw new Error(
        `uniform ${name}: put its declaration on a line of its own.`,
      );
    }
    const lines = match[0].split("\n").length - 1;
    const read = declared.bools.has(name)
      ? `(uniforms.${name} != 0u)`
      : `(uniforms.${name})`;
    edits.push({
      start,
      end: start + match[0].length,
      text: `#define ${name} ${read}${"\n".repeat(lines)}`,
    });
  }
  edits.sort((a, b) => b.start - a.start);
  for (const e of edits) {
    out = out.slice(0, e.start) + e.text + out.slice(e.end);
  }
  return out;
}

/** The source with its comments blanked, positions and lines unchanged. */
function blankComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, (c) =>
    c.replace(/[^\n]/g, " "),
  );
}
