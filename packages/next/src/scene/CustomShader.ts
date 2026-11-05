import { attributeHash, metadataKey } from "../render/layout.ts";
import {
  SLANG_STUB_ENTRY,
  withoutComments,
  type InstanceType,
  type NamedDeclarations,
  type NamedType,
} from "./slangStages.ts";
import {
  uniformLayout,
  uniformsWgsl,
  writeUniform,
  type TextureUniform,
  type UniformDeclaration,
  type UniformLayout,
} from "./uniforms.ts";

export type { InstanceType, NamedType } from "./slangStages.ts";
export type {
  TextureSource,
  TextureUniform,
  UniformDeclaration,
  UniformType,
  ValueUniform,
} from "./uniforms.ts";

/**
 * A user's shader stages for models and tilesets (plan §3.4, "Custom
 * shading"): WGSL against the engine's contract in opaque.wgsl
 * (`VertexInput`, `VertexOutput`, `FragmentInput`, `MaterialOutput`), named
 * as CesiumJS 1.x `CustomShader`'s:
 *
 *   fn vertexMain(vsInput: VertexInput, vsOutput: ptr<function, VertexOutput>)
 *   fn fragmentMain(fsInput: FragmentInput, material: ptr<function, MaterialOutput>)
 *
 * `vertexMain` moves the vertex in its mesh's own coordinates;
 * `fragmentMain` changes the glTF material's values (already sampled)
 * before lighting. Both run in every pass that draws the content, so
 * displaced geometry casts, occludes and picks where it is drawn. Either may
 * be left out (unchanged). Helpers and constants may sit beside them; names
 * the engine's shaders use are taken.
 *
 * Content using a shader draws with the default material until its
 * pipelines have compiled (in the background, once per distinct source),
 * and stays that way if they fail; the error is logged.
 *
 * Stages may be written in Slang against the `cesium` module
 * (shaders/cesium.slang): compiled at build time (scripts/slangShader.mjs,
 * the output passed as `wgsl`) or at runtime (`CustomShader.fromSlang`).
 */
export interface CustomShaderOptions {
  /** WGSL defining `vertexMain`. */
  vertex?: string;
  /** WGSL defining `fragmentMain`. */
  fragment?: string;
  /**
   * WGSL defining either stage or both, with their helpers, in place of
   * `vertex` and `fragment` (what the Slang paths produce).
   */
  wgsl?: string;
  /**
   * Vertex attributes the stages read, by the name they use
   * (`vsInput.attributes.temperature`, `fsInput.attributes.temperature`):
   * the glTF semantic they come from (`_TEMPERATURE`, `TEXCOORD_1`) and
   * their type. Interpolated for the fragment stage; zero where a mesh
   * hasn't the attribute. Together with `metadata`, at most 4.
   */
  attributes?: Record<string, { semantic: string; type: NamedType }>;
  /**
   * `EXT_structural_metadata` properties the stages read
   * (`vsInput.metadata.temperatures`, `fsInput.metadata.temperatures`), by
   * property ID, with their type: property attributes, offset and scale
   * applied. Zero where a mesh hasn't the property.
   */
  metadata?: Record<string, NamedType | { property: string; type: NamedType }>;
  /**
   * Per-instance values the stages read (`vsInput.instance.heading`,
   * `fsInput.instance.symbol`), by name: the instanced draw's stream fields
   * (`InstanceOptions.streams.layout`) with their types; exact in both
   * stages (integers too), zero where a draw hasn't them.
   */
  instance?: Record<string, InstanceType>;
  /**
   * Typed values and textures the stages read, by name: a value as
   * `uniforms.<name>`, a texture as `<name>` with its sampler
   * `<name>Sampler` (`textureSample(palette, paletteSampler, uv)`; in the
   * vertex stage `textureSampleLevel`). `setUniform` changes them. At most
   * 4 textures.
   */
  uniforms?: Record<string, UniformDeclaration>;
  /**
   * The farthest `vertexMain` moves a vertex, in model units: it pads the
   * draws' culling bounds. Default 0.
   */
  displacement?: number;
  /** For error messages and GPU labels. */
  label?: string;
}

export interface SlangShaderOptions extends Omit<
  CustomShaderOptions,
  "vertex" | "fragment" | "wgsl"
> {
  /**
   * The Slang WebAssembly build's script (`slang-wasm.js`, about 8 MB
   * compressed with its wasm), loaded once, in a worker, on first use.
   * Default "/slang-wasm/slang-wasm.js".
   */
  slangUrl?: string;
}

export const DEFAULT_VERTEX_MAIN =
  "fn vertexMain(vsInput: VertexInput, vsOutput: ptr<function, VertexOutput>) {}";
export const DEFAULT_FRAGMENT_MAIN =
  "fn fragmentMain(fsInput: FragmentInput, material: ptr<function, MaterialOutput>) {}";

/** WGSL types of named attributes and metadata (float components). */
const READ: Record<
  NamedType,
  { varying: string; read: string; unpack: string }
> = {
  f32: { varying: "f32", read: ".x", unpack: "#" },
  vec2f: { varying: "vec2f", read: ".xy", unpack: "#" },
  vec3f: { varying: "vec3f", read: ".xyz", unpack: "#" },
  vec4f: { varying: "vec4f", read: "", unpack: "#" },
  // Columns from the stream's (c0r0, c0r1, c1r0, c1r1), as glTF's MAT2.
  mat2x2f: { varying: "vec4f", read: "", unpack: "mat2x2f(#.xy, #.zw)" },
};

/** A varying as a vec4f (`readFragmentProperty`'s fallback). */
const PAD: Record<string, string> = {
  f32: "vec4f(#, 0.0, 0.0, 0.0)",
  vec2f: "vec4f(#, 0.0, 0.0)",
  vec3f: "vec4f(#, 0.0)",
  vec4f: "#",
};

/** Where `VsOut` takes the named values' varyings (opaque.wgsl). */
export const NAMED_VARYINGS = "// @named";
/** The first location of the named values' varyings. */
const FIRST_NAMED_LOCATION = 10;
/** Locations left after VsOut's and the fragment stage's front_facing. */
export const MAX_NAMED = 4;

/**
 * WGSL for a shader's named attributes and metadata: their structs
 * (`Attributes`, `Metadata`), read per vertex from the mesh's directory
 * (opaque.wgsl `readNamed`), passed as varyings and read back per
 * fragment; and the varyings for `VsOut`.
 */
export function namedCode(named: NamedDeclarations): {
  code: string;
  varyings: string;
} {
  const fields = [
    ...Object.entries(named.attributes).map(([name, type]) => ({
      struct: "Attributes",
      name,
      type,
      key: named.semantics[name]!,
    })),
    ...Object.entries(named.metadata).map(([name, type]) => ({
      struct: "Metadata",
      name,
      type,
      key: metadataKey(named.properties[name] ?? name),
    })),
  ];
  const lines: string[] = [];
  const varyings: string[] = [];
  for (const struct of ["Attributes", "Metadata"] as const) {
    const own = fields.filter((f) => f.struct === struct);
    const reader =
      struct === "Attributes" ? "vertexAttributes" : "vertexMetadata";
    const back =
      struct === "Attributes" ? "fragmentAttributes" : "fragmentMetadata";
    if (own.length === 0) {
      // WGSL has no empty structs.
      lines.push(
        `struct ${struct} { none: u32 };`,
        `fn ${reader}(directory: u32, vertexIndex: u32, feature: u32) -> ${struct} { return ${struct}(0u); }`,
        `fn ${back}(in: VsOut) -> ${struct} { return ${struct}(0u); }`,
      );
      continue;
    }
    lines.push(
      `struct ${struct} { ${own.map((f) => `${f.name}: ${f.type}`).join(", ")} };`,
      `fn ${reader}(directory: u32, vertexIndex: u32, feature: u32) -> ${struct} {`,
      `  return ${struct}(${own
        .map((f) => {
          const value = `readNamed(directory, ${attributeHash(f.key)}u, vertexIndex, feature)${READ[f.type].read}`;
          return READ[f.type].unpack.replaceAll("#", `(${value})`);
        })
        .join(", ")});`,
      "}",
      `fn ${back}(in: VsOut) -> ${struct} {`,
      ...(struct === "Metadata"
        ? [
            // A property in a property texture is read here, per fragment;
            // else the interpolated attribute's (opaque.wgsl).
            "  let r = records[in.draw];",
            "  let directory = r.attributes;",
            // The fragment's feature, local to the draw (feature tables).
            "  let feature = select(in.feature - r.featureId, 0xffffffffu, in.feature == 0u);",
            `  return ${struct}(${own
              .map((f) => {
                const varying = `in.named${fields.indexOf(f)}`;
                const padded = PAD[READ[f.type].varying]!.replace("#", varying);
                const value = `readFragmentProperty(directory, ${attributeHash(f.key)}u, in.uv, feature, ${padded})${READ[f.type].read}`;
                return READ[f.type].unpack.replaceAll("#", `(${value})`);
              })
              .join(", ")});`,
          ]
        : [
            `  return ${struct}(${own
              .map((f) =>
                READ[f.type].unpack.replaceAll(
                  "#",
                  `in.named${fields.indexOf(f)}`,
                ),
              )
              .join(", ")});`,
          ]),
      "}",
    );
  }
  // Varyings: each value as itself, matrices as their columns.
  const pass = fields.map((f, i) => {
    const value = `${f.struct === "Attributes" ? "attributes" : "metadata"}.${f.name}`;
    varyings.push(
      `@location(${FIRST_NAMED_LOCATION + i}) named${i}: ${READ[f.type].varying},`,
    );
    return f.type === "mat2x2f"
      ? `  (*out).named${i} = vec4f(${value}[0], ${value}[1]);`
      : `  (*out).named${i} = ${value};`;
  });
  lines.push(
    "fn passNamed(attributes: Attributes, metadata: Metadata, out: ptr<function, VsOut>) {",
    ...pass,
    "}",
  );
  lines.push(instanceCode(named.instance));
  return { code: `${lines.join("\n")}\n`, varyings: varyings.join("\n  ") };
}

/** `VsOut` (in opaque.wgsl's source) with a shader's named varyings. */
export function withNamedVaryings(opaque: string, varyings: string): string {
  if (!opaque.includes(NAMED_VARYINGS)) {
    throw new Error("opaque.wgsl has no named varyings marker.");
  }
  return opaque.replace(NAMED_VARYINGS, varyings || NAMED_VARYINGS);
}

/** The engine's own: no named values. */
export const DEFAULT_NAMED = namedCode({
  attributes: {},
  metadata: {},
  semantics: {},
  properties: {},
  instance: {},
});

/** WGSL types of per-instance values, from `readInstance`'s raw bits. */
const INSTANCE: Record<InstanceType, string> = {
  f32: "bitcast<f32>(#.x)",
  vec2f: "bitcast<vec2f>(#.xy)",
  vec3f: "bitcast<vec3f>(#.xyz)",
  vec4f: "bitcast<vec4f>(#)",
  mat2x2f: "mat2x2f(bitcast<vec2f>(#.xy), bitcast<vec2f>(#.zw))",
  u32: "#.x",
  i32: "bitcast<i32>(#.x)",
};

/**
 * WGSL for a shader's per-instance values: `struct InstanceValues` and
 * `instanceValues(draw, instance)`, read from the draw's instance streams
 * (opaque.wgsl `readInstance`) in either stage, exactly.
 */
function instanceCode(instance: Record<string, InstanceType>): string {
  const fields = Object.entries(instance);
  if (fields.length === 0) {
    return [
      "struct InstanceValues { none: u32 };",
      "fn instanceValues(draw: u32, instance: u32) -> InstanceValues { return InstanceValues(0u); }",
    ].join("\n");
  }
  return [
    `struct InstanceValues { ${fields.map(([name, type]) => `${name}: ${type}`).join(", ")} };`,
    "fn instanceValues(draw: u32, instance: u32) -> InstanceValues {",
    `  return InstanceValues(${fields
      .map(([name, type]) =>
        INSTANCE[type].replaceAll(
          "#",
          `readInstance(draw, instance, ${attributeHash(name)}u)`,
        ),
      )
      .join(", ")});`,
    "}",
  ].join("\n");
}

/** A shader's declarations as the generators take them. */
function declarations(options: CustomShaderOptions): NamedDeclarations {
  const identifier = /^[A-Za-z_][A-Za-z0-9_]*$/;
  const attributes: Record<string, NamedType> = {};
  const semantics: Record<string, string> = {};
  for (const [name, { semantic, type }] of Object.entries(
    options.attributes ?? {},
  )) {
    attributes[name] = type;
    semantics[name] = semantic;
  }
  // Metadata by field name: a property ID that isn't an identifier
  // (`building:material`) is read under another name.
  const metadata: Record<string, NamedType> = {};
  const properties: Record<string, string> = {};
  for (const [name, declared] of Object.entries(options.metadata ?? {})) {
    if (typeof declared === "string") {
      metadata[name] = declared;
    } else {
      metadata[name] = declared.type;
      properties[name] = declared.property;
    }
  }
  const names = [...Object.keys(attributes), ...Object.keys(metadata)];
  for (const name of names) {
    if (!identifier.test(name) || name.startsWith("__")) {
      throw new Error(`Custom shader: "${name}" isn't a valid field name.`);
    }
  }
  for (const type of [
    ...Object.values(attributes),
    ...Object.values(metadata),
  ]) {
    if (!(type in READ)) {
      throw new Error(`Custom shader: unknown type "${type}".`);
    }
  }
  if (names.length > MAX_NAMED) {
    throw new Error(
      `Custom shader: ${names.length} attributes and metadata properties; at most ${MAX_NAMED}.`,
    );
  }
  const instance = { ...options.instance };
  for (const [name, type] of Object.entries(instance)) {
    if (!identifier.test(name) || name.startsWith("__")) {
      throw new Error(`Custom shader: "${name}" isn't a valid field name.`);
    }
    if (!(type in INSTANCE)) {
      throw new Error(`Custom shader: unknown instance type "${type}".`);
    }
  }
  return { attributes, metadata, semantics, properties, instance };
}

let nextId = 1;

export class CustomShader {
  /** Unique per shader object; batches key on it (0: the default). */
  readonly id = nextId++;
  /** Both stages' WGSL, defaults filled in: what pipelines are cached by. */
  readonly code: string;
  /**
   * Lines of `code` that are the vertex stage's, for error messages;
   * undefined for `wgsl` (lines count from its start).
   */
  readonly vertexLines: number | undefined;
  /** Its attributes and metadata (`CustomShaderOptions`). */
  readonly named: NamedDeclarations;
  /** `VsOut`'s varyings for them (`withNamedVaryings`). */
  readonly varyings: string;
  /** Its uniforms' buffer layout and textures (`uniforms`). */
  readonly uniformLayout: UniformLayout;
  /**
   * Reads metadata per fragment (`readFragmentProperty`), so its pipelines
   * bind the texture set's property textures; others don't (§13.15).
   */
  get readsPropertyTextures(): boolean {
    return this.code.includes("readFragmentProperty(");
  }
  /** The uniform buffer's contents (`uniformLayout.bytes`). */
  readonly uniformData: DataView;
  /** Each texture uniform's current declaration, by name. */
  readonly textures = new Map<string, TextureUniform>();
  /** Bumped when a value uniform changes (the buffer is written again). */
  uniformVersion = 0;
  /** Bumped when a texture uniform changes (its bindings are made again). */
  textureVersion = 0;
  readonly displacement: number;
  readonly label: string;
  /** Slang's output: its matrices are written transposed (`writeUniform`). */
  private readonly slang: boolean;
  private readonly listeners = new Set<() => void>();

  constructor(options: CustomShaderOptions) {
    if (options.wgsl !== undefined) {
      const wgsl = options.wgsl;
      // Outside comments: a comment naming a stage defines nothing.
      const code = withoutComments(wgsl);
      const defines = (stage: string) =>
        new RegExp(`\\bfn\\s+${stage}\\s*\\(`).test(code);
      this.code = [
        wgsl,
        defines("vertexMain") ? "" : DEFAULT_VERTEX_MAIN,
        defines("fragmentMain") ? "" : DEFAULT_FRAGMENT_MAIN,
        "",
      ].join("\n");
      this.vertexLines = undefined;
    } else {
      const vertex = options.vertex ?? DEFAULT_VERTEX_MAIN;
      this.code = `${vertex}\n${options.fragment ?? DEFAULT_FRAGMENT_MAIN}\n`;
      this.vertexLines = vertex.split("\n").length;
    }
    // The named values' code after the stages, so stage lines keep their
    // numbers in errors.
    this.named = declarations(options);
    const named = namedCode(this.named);
    this.code += named.code;
    this.varyings = named.varyings;
    const uniforms = options.uniforms ?? {};
    this.uniformLayout = uniformLayout(uniforms);
    this.slang = this.code.includes(`fn ${SLANG_STUB_ENTRY}(`);
    this.code += uniformsWgsl(this.uniformLayout, this.code);
    this.uniformData = new DataView(new ArrayBuffer(this.uniformLayout.bytes));
    for (const field of this.uniformLayout.fields) {
      const declaration = uniforms[field.name] as {
        value?: number | ArrayLike<number>;
      };
      writeUniform(this.uniformData, field, declaration.value, this.slang);
    }
    for (const name of this.uniformLayout.textures) {
      this.textures.set(name, uniforms[name] as TextureUniform);
    }
    this.displacement = Math.max(0, options.displacement ?? 0);
    this.label = options.label ?? `custom shader ${this.id}`;
  }

  /**
   * Changes a uniform: a value (number or components, matrices
   * column-major) or a texture's image. Content drawing with the shader
   * redraws.
   */
  setUniform(
    name: string,
    value: number | ArrayLike<number> | TextureUniform["value"],
  ): void {
    const texture = this.textures.get(name);
    if (texture) {
      if (typeof value === "number" || isArrayLike(value)) {
        throw new Error(`setUniform: ${name} is a texture.`);
      }
      this.textures.set(name, { ...texture, value });
      this.textureVersion++;
    } else {
      const field = this.uniformLayout.fields.find((f) => f.name === name);
      if (!field) {
        throw new Error(`setUniform: ${this.label} has no uniform ${name}.`);
      }
      if (typeof value !== "number" && !isArrayLike(value)) {
        throw new Error(`setUniform: ${name} is a value, not a texture.`);
      }
      writeUniform(this.uniformData, field, value, this.slang);
      this.uniformVersion++;
    }
    for (const listener of this.listeners) {
      listener();
    }
  }

  /** Calls `listener` on every `setUniform`; returns the unsubscribe. */
  onChange(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * A shader from Slang stages (`import cesium;`), compiled at runtime by
   * the Slang WebAssembly build in a worker. Rejects with Slang's
   * messages (lines in `source`).
   */
  static async fromSlang(
    source: string,
    options: SlangShaderOptions = {},
  ): Promise<CustomShader> {
    const { compileSlang } = await import("./slang.ts");
    const wgsl = await compileSlang(source, options.slangUrl, options);
    return new CustomShader({
      wgsl,
      ...(options.uniforms ? { uniforms: options.uniforms } : {}),
      ...(options.instance ? { instance: options.instance } : {}),
      ...(options.attributes ? { attributes: options.attributes } : {}),
      ...(options.metadata ? { metadata: options.metadata } : {}),
      ...(options.displacement !== undefined
        ? { displacement: options.displacement }
        : {}),
      ...(options.label !== undefined ? { label: options.label } : {}),
    });
  }
}

function isArrayLike(value: unknown): value is ArrayLike<number> {
  return (
    Array.isArray(value) ||
    ArrayBuffer.isView(value) ||
    (typeof value === "object" &&
      value !== null &&
      typeof (value as { length?: unknown }).length === "number" &&
      !("width" in value))
  );
}
