import { attributeHash, metadataKey } from "../render/layout.ts";
import type {
  InstanceType,
  NamedDeclarations,
  NamedType,
} from "./slangStages.ts";
import {
  CONTRACT_WGSL,
  SLANG_BRIDGE,
  slangAdapter,
  slangBridgeBoundary,
} from "./contract.ts";
import {
  wgslUnit,
  type Boundary,
  type ShaderUnit,
} from "../shaders/link/index.ts";
import {
  uniformLayout,
  uniformsWgsl,
  writeUniform,
  type TextureUniform,
  type UniformDeclaration,
  type UniformLayout,
} from "./uniforms.ts";

export type { InstanceType, NamedType } from "./slangStages.ts";
export type { ShaderControl } from "./slangControls.ts";
export type { CompiledSlangEntry, SlangCache } from "./slangCache.ts";
import type { SlangCache } from "./slangCache.ts";
import type { ShaderControl } from "./slangControls.ts";
export type {
  TextureSource,
  TextureUniform,
  UniformDeclaration,
  UniformType,
  ValueUniform,
} from "./uniforms.ts";

/**
 * A user's shader stages for models and tilesets (plan §3.4, "Custom
 * shading"): WGSL against the contract (`VertexInput`, `VertexOutput`,
 * `FragmentInput`, generated here with the shader's own types, and the
 * engine's `MaterialOutput`), named as CesiumJS 1.x `CustomShader`'s:
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
 *
 * **Placed items.** A scene item (`World.add`) at a placement other than 0
 * moves each vertex in model space before `vertexMain` runs, by its
 * parameter at that moment (`SceneItem.placement`, any finite number):
 *  - `vsInput.positionMC` is the placed position: the point as the item
 *    draws it, a blend of the design position and the second position, past
 *    either end when the parameter is. At placement 0 it is the mesh's own.
 *  - `vsInput.designPositionMC` is the mesh's own position, whatever the
 *    placement.
 *  - `fsInput.positionMC` is the DESIGN position (the mesh's own, before the
 *    placement and `vertexMain`), whatever the placement: a Pref, as
 *    RenderMan's reference position is. A procedural texture built on it
 *    stays on the surface as the parameter changes, and is the same on
 *    items placed differently. It is what `vsInput.designPositionMC` was at
 *    the vertices, interpolated. (Before, it was the position `vertexMain`
 *    returned; a pattern that wants that carries it in a named attribute.)
 *  - `vsInput.normalMC` is the normal after the placement: the mesh's normal
 *    turned by the placement's Jacobian (its cofactor matrix, normalized), so
 *    it is the normal of the surface as drawn, however steeply the placement
 *    bends it. A placement from a second position (a dual one) has no
 *    derivative in space and leaves the normal as stored. The tangent turns
 *    with the surface, keeping its handedness.
 *  - `positionEC` and `positionWC` are where it is drawn, as always.
 * Named attributes are read as stored. An item's own `shader` replaces the
 * tileset's (`customShader` or `style`) for that item; it doesn't combine
 * with it.
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
   * hasn't the attribute. Together with `metadata` read by the fragment
   * stage, at most 16 float components (a draw passes four vec4f between its
   * stages; a vec3f takes 3, and 16 scalars fit).
   */
  attributes?: Record<string, { semantic: string; type: NamedType }>;
  /**
   * `EXT_structural_metadata` properties the stages read
   * (`vsInput.metadata.temperatures`, `fsInput.metadata.temperatures`), by
   * property ID, with their type: property attributes, offset and scale
   * applied. Zero where a mesh hasn't the property. The fragment stage's
   * count toward the 16 float components `attributes` shares; a property
   * only `vertexMain` reads can be declared `vertexOnly`, which takes no
   * room (`fsInput.metadata.<name>` then reads 0).
   */
  metadata?: Record<
    string,
    NamedType | { property: string; type: NamedType; vertexOnly?: boolean }
  >;
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
   * Controls for the shader's uniforms (a Slang shader's declared ones:
   * `[Slider(…)] uniform float x;`), for a host to show; set with
   * `setUniform`.
   */
  controls?: ShaderControl[];
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
  /**
   * Where compiled shaders are kept: by default IndexedDB (the same
   * shader, declarations and Slang release don't load the compiler
   * again); `false` for none, or any `SlangCache`.
   */
  cache?: SlangCache | false;
}

export const DEFAULT_VERTEX_MAIN =
  "fn vertexMain(vsInput: VertexInput, vsOutput: ptr<function, VertexOutput>) {}";
export const DEFAULT_FRAGMENT_MAIN =
  "fn fragmentMain(fsInput: FragmentInput, material: ptr<function, MaterialOutput>) {}";

/** WGSL types of named attributes and metadata (float components). */
const READ: Record<
  NamedType,
  { components: number; read: string; unpack: string }
> = {
  f32: { components: 1, read: ".x", unpack: "#" },
  vec2f: { components: 2, read: ".xy", unpack: "#" },
  vec3f: { components: 3, read: ".xyz", unpack: "#" },
  vec4f: { components: 4, read: "", unpack: "#" },
  // Columns from the stream's (c0r0, c0r1, c1r0, c1r1), as glTF's MAT2.
  mat2x2f: { components: 4, read: "", unpack: "mat2x2f(#.xy, #.zw)" },
};

/**
 * The slots `VsOut` passes named values in (surfaceVertex.wgsl `named0`…),
 * each a vec4f. The slots are the last of a fragment stage's 16 inputs
 * (the engine's other varyings fill 13 locations, and `front_facing`,
 * `sample_mask` and `sample_index` count too), so there is no room for
 * more: a draw passes `MAX_NAMED * 4` float components between its stages.
 */
export const MAX_NAMED = 4;

/**
 * The engine's own stages, for content without a custom shader: the
 * vertex unchanged, no named values, the material as it is.
 */
export const DEFAULT_STAGES = `fn cesiumVertexStage(v: CesiumVertex) -> CesiumVertexResult {
  return CesiumVertexResult(v.positionMC, v.normalMC,
    vec4f(0.0), vec4f(0.0), vec4f(0.0), vec4f(0.0));
}
fn cesiumFragmentStage(f: CesiumFragment, material: ptr<function, MaterialOutput>) {}
`;

/** A named value's place in the slots: which, and its first component. */
interface Place {
  slot: number;
  offset: number;
}

/**
 * Where each named value goes in `VsOut`'s four slots: the largest first,
 * each into the first slot with room (two floats and a vec2f share one).
 * Undefined if they don't fit.
 */
export function packNamed(types: readonly NamedType[]): Place[] | undefined {
  const used = new Array<number>(MAX_NAMED).fill(0);
  const places = new Array<Place>(types.length);
  const order = types
    .map((type, i) => ({ i, n: READ[type].components }))
    .sort((a, b) => b.n - a.n || a.i - b.i);
  for (const { i, n } of order) {
    const slot = used.findIndex((u) => u + n <= 4);
    if (slot < 0) {
      return undefined;
    }
    places[i] = { slot, offset: used[slot]! };
    used[slot]! += n;
  }
  return places;
}

const SWIZZLE = "xyzw";

/**
 * WGSL for a shader's named attributes and metadata: their structs
 * (`Attributes`, `Metadata`), read per vertex from the mesh's directory
 * (opaque.wgsl `readNamed`), packed into the slots (`packNamed`) and read
 * back per fragment; with the contract and its stage functions.
 */
export function namedCode(named: NamedDeclarations): string {
  const vertexOnly = new Set(named.vertexOnly ?? []);
  const fields = [
    ...Object.entries(named.attributes).map(([name, type]) => ({
      struct: "Attributes",
      name,
      type,
      key: named.semantics[name]!,
      passed: true,
    })),
    ...Object.entries(named.metadata).map(([name, type]) => ({
      struct: "Metadata",
      name,
      type,
      key: metadataKey(named.properties[name] ?? name),
      passed: !vertexOnly.has(name),
    })),
  ];
  // Only the fields the fragment stage may read are passed to it.
  const passed = fields.filter((f) => f.passed);
  const passedPlaces = packNamed(passed.map((f) => f.type));
  if (!passedPlaces) {
    const floats = passed.reduce((n, f) => n + READ[f.type].components, 0);
    throw new Error(
      `Custom shader: its attributes and metadata properties need ${floats} float components between the vertex and fragment stages, and a draw passes ${MAX_NAMED * 4} (${MAX_NAMED} vec4f; a vec3f takes 3, a mat2x2f 4). Properties only vertexMain reads can be declared vertexOnly.`,
    );
  }
  const places = fields.map((f) => passedPlaces[passed.indexOf(f)]);
  // A value's slot read back, as its type's components.
  const slotRead = (i: number) => {
    const f = fields[i]!;
    const { slot, offset } = places[i]!;
    const n = READ[f.type].components;
    return `f.named${slot}.${SWIZZLE.slice(offset, offset + n)}`;
  };
  const lines: string[] = [CONTRACT_WGSL];
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
        `fn ${back}(f: CesiumFragment) -> ${struct} { return ${struct}(0u); }`,
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
      `fn ${back}(f: CesiumFragment) -> ${struct} {`,
      `  return ${struct}(${own
        .map((f) => {
          if (!f.passed) {
            // Read only by the vertex stage: zero here (WGSL's zero value).
            return `${f.type}()`;
          }
          const varying = slotRead(fields.indexOf(f));
          if (struct === "Attributes") {
            return READ[f.type].unpack.replaceAll("#", varying);
          }
          // A property in a property texture is read here, per fragment;
          // else the interpolated attribute's (opaque.wgsl).
          const n = READ[f.type].components;
          const padded =
            n === 4 ? varying : `vec4f(${varying}${", 0.0".repeat(4 - n)})`;
          const value = `readFragmentProperty(f.directory, ${attributeHash(f.key)}u, f.texCoord0, f.localFeature, ${padded})${READ[f.type].read}`;
          return READ[f.type].unpack.replaceAll("#", `(${value})`);
        })
        .join(", ")});`,
      "}",
    );
  }
  // Each slot's components, from the values placed in it.
  const pack: string[] = [];
  for (let slot = 0; slot < MAX_NAMED; slot++) {
    const components = ["0.0", "0.0", "0.0", "0.0"];
    let any = false;
    fields.forEach((f, i) => {
      if (places[i]?.slot !== slot) {
        return;
      }
      any = true;
      const value = `${f.struct === "Attributes" ? "attributes" : "metadata"}.${f.name}`;
      const n = READ[f.type].components;
      const parts =
        f.type === "mat2x2f"
          ? [`${value}[0].x`, `${value}[0].y`, `${value}[1].x`, `${value}[1].y`]
          : n === 1
            ? [value]
            : Array.from({ length: n }, (_, c) => `${value}.${SWIZZLE[c]}`);
      parts.forEach((part, c) => {
        components[places[i]!.offset + c] = part;
      });
    });
    if (any) {
      pack.push(`  (*out).named${slot} = vec4f(${components.join(", ")});`);
    }
  }
  lines.push(
    "fn packNamed(attributes: Attributes, metadata: Metadata, out: ptr<function, CesiumVertexResult>) {",
    ...pack,
    "}",
  );
  lines.push(instanceCode(named.instance));
  return `${lines.join("\n")}\n`;
}

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
  const vertexOnly: string[] = [];
  for (const [name, declared] of Object.entries(options.metadata ?? {})) {
    if (typeof declared === "string") {
      metadata[name] = declared;
    } else {
      metadata[name] = declared.type;
      properties[name] = declared.property;
      if (declared.vertexOnly) {
        vertexOnly.push(name);
      }
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
  const instance = { ...options.instance };
  for (const [name, type] of Object.entries(instance)) {
    if (!identifier.test(name) || name.startsWith("__")) {
      throw new Error(`Custom shader: "${name}" isn't a valid field name.`);
    }
    if (!(type in INSTANCE)) {
      throw new Error(`Custom shader: unknown instance type "${type}".`);
    }
  }
  return { attributes, metadata, semantics, properties, vertexOnly, instance };
}

let nextId = 1;

export class CustomShader {
  /** Unique per shader object; batches key on it (0: the default). */
  readonly id = nextId++;
  /**
   * Its compilation units (plan §3.4, step 5), linked after the engine's
   * surface units: its stages (defaults filled in), the contract and its
   * named values' code, its uniforms' bindings.
   */
  readonly units: readonly ShaderUnit[];
  /** The units' WGSL joined: what pipelines are cached by. */
  readonly code: string;
  /** Its attributes and metadata (`CustomShaderOptions`). */
  readonly named: NamedDeclarations;
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
  /** Controls for its uniforms (`CustomShaderOptions.controls`). */
  readonly controls: readonly ShaderControl[];
  /**
   * Boundaries its units must meet besides the surface's: a Slang
   * shader's bridge (contract.ts `slangBridgeBoundary`).
   */
  readonly boundaries: readonly Boundary[];
  /** Slang's output: its matrices are written transposed (`writeUniform`). */
  private readonly slang: boolean;
  private readonly listeners = new Set<() => void>();

  constructor(options: CustomShaderOptions) {
    const units: ShaderUnit[] = [];
    this.named = declarations(options);
    let slang = false;
    let boundaries: Boundary[] = [];
    if (options.wgsl !== undefined) {
      const stages = wgslUnit("stages", options.wgsl);
      const defines = (name: string) =>
        stages.declarations.some((d) => d.kind === "fn" && d.name === name);
      units.push(stages);
      // Slang's output (scripts/slangShader.mjs, `fromSlang`) defines the
      // bridge (contract.ts): the contract's stages call it.
      const bridged = {
        vertex: defines(SLANG_BRIDGE.vertex),
        fragment: defines(SLANG_BRIDGE.fragment),
      };
      if (bridged.vertex || bridged.fragment) {
        slang = true;
        units.push(
          wgslUnit("Slang adapter", slangAdapter(bridged, this.named)),
        );
        boundaries = [slangBridgeBoundary(bridged, this.named)];
      }
      if (!defines("vertexMain") && !bridged.vertex) {
        units.push(wgslUnit("default vertex stage", DEFAULT_VERTEX_MAIN));
      }
      if (!defines("fragmentMain") && !bridged.fragment) {
        units.push(wgslUnit("default fragment stage", DEFAULT_FRAGMENT_MAIN));
      }
    } else {
      units.push(
        wgslUnit("vertex stage", options.vertex ?? DEFAULT_VERTEX_MAIN),
        wgslUnit("fragment stage", options.fragment ?? DEFAULT_FRAGMENT_MAIN),
      );
    }
    units.push(wgslUnit("contract", namedCode(this.named)));
    const uniforms = options.uniforms ?? {};
    this.uniformLayout = uniformLayout(uniforms);
    this.slang = slang;
    this.boundaries = boundaries;
    // Group 2's bindings the stages declare themselves (Slang's output
    // does): the uniforms' are declared only where they don't.
    const declared = new Set(
      units.flatMap((u) =>
        u.declarations
          .filter((d) => d.kind === "var" && d.attributes?.group === "2")
          .map((d) => Number(d.attributes!.binding)),
      ),
    );
    const bindings = uniformsWgsl(this.uniformLayout, declared);
    if (bindings !== "") {
      units.push(wgslUnit("uniforms", bindings));
    }
    this.units = units;
    this.code = units.map((u) => u.code).join("\n");
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
    this.controls = options.controls ?? [];
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
    const { wgsl, controls, uniforms } = await compileSlang(
      source,
      options.slangUrl,
      options,
      ...(options.cache !== undefined ? [options.cache] : []),
    );
    return new CustomShader({
      wgsl,
      // The options' uniforms and those the shader declared (`controls`),
      // in the order the compiled buffer has them.
      uniforms,
      controls,
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
