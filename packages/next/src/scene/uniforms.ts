/**
 * Custom shaders' typed uniforms and textures (plan §3.4 foundation 3):
 * declarations, their uniform buffer's layout, and the WGSL and Slang that
 * declare them. Node-safe (the Slang CLI uses it).
 *
 * They extend bind group 2 (the batch's texture set: bindings 0–9) of the
 * shader's pipelines: the values at binding 10, each texture and its
 * sampler at 11 + 2k and 12 + 2k. All four bind groups are in use, and a
 * batch has one shader, so its texture set is where they fit.
 */

/** Types of value uniforms. */
export type UniformType =
  "f32" | "i32" | "u32" | "vec2f" | "vec3f" | "vec4f" | "mat3x3f" | "mat4x4f";

/** Image data for a texture uniform; a string is a URL to fetch. */
export type TextureSource =
  string | ImageBitmap | ImageData | HTMLCanvasElement | OffscreenCanvas;

export interface ValueUniform {
  type: UniformType;
  /** A number, or the components (matrices column-major). Default zeros. */
  value?: number | ArrayLike<number>;
}

export interface TextureUniform {
  type: "texture2d";
  /**
   * Its image, read as stored (rgba8unorm: no sRGB decoding), with
   * mipmaps. Reads white until loaded.
   */
  value: TextureSource;
  /** Clamp to the edge instead of repeating. */
  clamp?: boolean;
  /** Nearest instead of linear filtering. */
  nearest?: boolean;
}

export type UniformDeclaration = ValueUniform | TextureUniform;

/** The values' binding in group 2; textures follow it. */
export const UNIFORM_BINDING = 10;
/** Textures a shader may declare (samplers: 8 of 16 are in use). */
export const MAX_TEXTURES = 4;

export function textureBinding(k: number): number {
  return UNIFORM_BINDING + 1 + k * 2;
}

/** WGSL uniform layout: alignment and size in bytes, columns of matrices. */
const LAYOUT: Record<
  UniformType,
  { align: number; size: number; components: number; columns: number }
> = {
  f32: { align: 4, size: 4, components: 1, columns: 1 },
  i32: { align: 4, size: 4, components: 1, columns: 1 },
  u32: { align: 4, size: 4, components: 1, columns: 1 },
  vec2f: { align: 8, size: 8, components: 2, columns: 1 },
  vec3f: { align: 16, size: 12, components: 3, columns: 1 },
  vec4f: { align: 16, size: 16, components: 4, columns: 1 },
  // Columns 16 bytes apart (as std140 too, so Slang's layout matches).
  mat3x3f: { align: 16, size: 48, components: 3, columns: 3 },
  mat4x4f: { align: 16, size: 64, components: 4, columns: 4 },
};

const SLANG: Record<UniformType, string> = {
  f32: "float",
  i32: "int",
  u32: "uint",
  vec2f: "float2",
  vec3f: "float3",
  vec4f: "float4",
  mat3x3f: "float3x3",
  mat4x4f: "float4x4",
};

export interface UniformLayout {
  /** Value uniforms in declaration order, at their byte offsets. */
  fields: Array<{ name: string; type: UniformType; offset: number }>;
  /** The buffer's size (0: no value uniforms). */
  bytes: number;
  /** Texture uniforms in declaration order. */
  textures: string[];
}

export function uniformLayout(
  uniforms: Record<string, UniformDeclaration>,
): UniformLayout {
  const fields: UniformLayout["fields"] = [];
  const textures: string[] = [];
  let cursor = 0;
  for (const [name, declaration] of Object.entries(uniforms)) {
    if (declaration.type === "texture2d") {
      textures.push(name);
      continue;
    }
    const layout = LAYOUT[declaration.type];
    if (!layout) {
      throw new Error(
        `Custom shader: unknown uniform type "${declaration.type}".`,
      );
    }
    const offset = Math.ceil(cursor / layout.align) * layout.align;
    fields.push({ name, type: declaration.type, offset });
    cursor = offset + layout.size;
  }
  if (textures.length > MAX_TEXTURES) {
    throw new Error(
      `Custom shader: ${textures.length} textures; at most ${MAX_TEXTURES}.`,
    );
  }
  return {
    fields,
    bytes: fields.length ? Math.ceil(cursor / 16) * 16 : 0,
    textures,
  };
}

/**
 * Writes a value uniform into the buffer's contents; `transpose` for
 * Slang's matrices (row-major in meaning, so `mul(m, v)` is M v there).
 */
export function writeUniform(
  data: DataView,
  field: UniformLayout["fields"][number],
  value: number | ArrayLike<number> | undefined,
  transpose: boolean,
): void {
  const { components, columns } = LAYOUT[field.type];
  const at = (i: number) =>
    value === undefined
      ? 0
      : typeof value === "number"
        ? i === 0
          ? value
          : 0
        : (value[i] ?? 0);
  for (let c = 0; c < columns; c++) {
    for (let r = 0; r < components; r++) {
      const v = at(transpose ? r * columns + c : c * components + r);
      const offset = field.offset + c * 16 + r * 4;
      if (field.type === "i32") {
        data.setInt32(offset, v, true);
      } else if (field.type === "u32") {
        data.setUint32(offset, v, true);
      } else {
        data.setFloat32(offset, v, true);
      }
    }
  }
}

/**
 * WGSL declaring the uniforms (`uniforms.<name>`) and textures (`<name>`,
 * `<name>Sampler`), less the group-2 bindings `declared` (Slang's
 * output declares its own).
 */
export function uniformsWgsl(
  layout: UniformLayout,
  declared: ReadonlySet<number>,
): string {
  const lines: string[] = [];
  if (layout.bytes > 0 && !declared.has(UNIFORM_BINDING)) {
    lines.push(
      `struct Uniforms { ${layout.fields.map((f) => `${f.name}: ${f.type}`).join(", ")} };`,
      `@group(2) @binding(${UNIFORM_BINDING}) var<uniform> uniforms: Uniforms;`,
    );
  }
  layout.textures.forEach((name, k) => {
    if (!declared.has(textureBinding(k))) {
      lines.push(
        `@group(2) @binding(${textureBinding(k)}) var ${name}: texture_2d<f32>;`,
        `@group(2) @binding(${textureBinding(k) + 1}) var ${name}Sampler: sampler;`,
      );
    }
  });
  return lines.length ? `${lines.join("\n")}\n` : "";
}

/** The same in Slang, for the `cesium` module. */
export function uniformsSlang(
  uniforms: Record<string, { type: UniformDeclaration["type"] }>,
): string {
  const values = Object.entries(uniforms).filter(
    ([, d]) => d.type !== "texture2d",
  ) as Array<[string, { type: UniformType }]>;
  const textures = Object.entries(uniforms)
    .filter(([, d]) => d.type === "texture2d")
    .map(([name]) => name);
  const lines: string[] = [];
  if (values.length) {
    lines.push(
      "public struct Uniforms {",
      // Matrices stored row-major whatever the compiler's default (slangc
      // and slang-wasm differ), as `writeUniform`'s transpose expects.
      ...values.map(
        ([name, d]) =>
          `  public ${d.type.startsWith("mat") ? "row_major " : ""}${SLANG[d.type]} ${name};`,
      ),
      "};",
      `[[vk::binding(${UNIFORM_BINDING}, 2)]] public ConstantBuffer<Uniforms> uniforms;`,
    );
  }
  textures.forEach((name, k) => {
    lines.push(
      `[[vk::binding(${textureBinding(k)}, 2)]] public Texture2D<float4> ${name};`,
      `[[vk::binding(${textureBinding(k) + 1}, 2)]] public SamplerState ${name}Sampler;`,
    );
  });
  return lines.join("\n");
}
