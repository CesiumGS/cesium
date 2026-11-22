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
 * field of the shader's uniform buffer (`uniforms.glow`): its declaration
 * is blanked and each use of the name rewritten to the field
 * (`bindDeclaredUniforms`), so the shader uses it by name and its lines
 * keep their numbers in errors.
 */
export interface ShaderControl {
  /** The uniform's name in the shader. */
  name: string;
  /** What to show (`Label`, else the name in words: "glowColor", "Glow color"). */
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
    const label = String(attribute("Label")?.[0] ?? words(p.name));
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
        step: integer ? 1 : niceStep(max - min),
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
 * A slider's step for a range: a power of ten, about a hundredth of it, so
 * defaults and bounds written with a few decimals land on a step (a range
 * of 5.5 steps by 0.01, not 0.0275).
 */
function niceStep(range: number): number {
  return range > 0 ? 10 ** Math.floor(Math.log10(range / 100)) : 0.01;
}

/** A name in words: "glowColor" → "Glow color", "colorA" → "Color A". */
export function words(name: string): string {
  const parts = name
    .replace(/_/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => (w.length > 1 && w !== w.toUpperCase() ? w.toLowerCase() : w));
  const text = parts.join(" ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * The source with each declared uniform bound to the shader's buffer: its
 * declaration (and its attributes) blanked, and every use of its name, as
 * an identifier not after `.` (so `material.roughness` stays), rewritten to
 * the field (`uniforms.name`; a `bool` as `(uniforms.name != 0u)`). Lines
 * keep their numbers. A local of the same name, which would shadow it, is
 * an error that says so.
 */
export function bindDeclaredUniforms(
  source: string,
  declared: DeclaredUniforms,
): string {
  const names = new Set(declared.controls.map((c) => c.name));
  if (!names.size) {
    return source;
  }
  // 1. Blank each declaration, newlines kept.
  let text = source;
  const blank = blankComments(source);
  for (const name of names) {
    const pattern = new RegExp(
      `(?:\\[[^\\]\\n]*\\]\\s*)*\\buniform\\s+\\w+\\s+${name}\\s*;`,
    );
    const match = pattern.exec(blank);
    if (!match) {
      throw new Error(
        `uniform ${name}: declare it on its own (\`[Slider(…)] uniform float ${name};\`), not with others in one statement.`,
      );
    }
    const start = match.index;
    const end = start + match[0].length;
    text =
      text.slice(0, start) +
      text.slice(start, end).replace(/[^\n]/g, " ") +
      text.slice(end);
  }
  // 2. Rewrite uses: identifiers outside comments and strings, not after a
  // `.` (a member of the same name), not where a local declares the name.
  const token =
    /\/\/[^\n]*|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\\n])*"|[A-Za-z_]\w*|[\s\S]/g;
  let out = "";
  let previous = "";
  let typeBefore = false;
  for (const m of text.matchAll(token)) {
    const t = m[0];
    if (/^[A-Za-z_]/.test(t) && names.has(t) && previous !== ".") {
      if (typeBefore) {
        throw new Error(
          `uniform ${t}: a local of the same name shadows it; rename one of them.`,
        );
      }
      out += declared.bools.has(t) ? `(uniforms.${t} != 0u)` : `uniforms.${t}`;
    } else {
      out += t;
    }
    if (!/^\s+$/.test(t) && !t.startsWith("//") && !t.startsWith("/*")) {
      typeBefore = TYPE.test(t);
      previous = t;
    }
  }
  return out;
}

/** A type a local could be declared with, before its name. */
const TYPE =
  /^(?:float|int|uint|bool|half|double|float[234](?:x[234])?|int[234]|uint[234]|bool[234]|var|let)$/;

/** The source with its comments blanked, positions and lines unchanged. */
function blankComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, (c) =>
    c.replace(/[^\n]/g, " "),
  );
}
