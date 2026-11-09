// The public definition of a post stage (CESIUM2_WEBGPU_PLAN.md §13.22): its passes,
// what each reads and writes, the textures it owns, where in the chain it sits, and
// whether it's physics, a model or a look. Most stages are one fullscreen function.
// Plain data with no GPU types: the rasterizer draws it (render/post/chain.ts), and
// it's joined to its glue through the shader linker.
import {
  POST_COMPUTE_BOUNDARY,
  POST_STAGE_BOUNDARY,
  WgslLinker,
  blankComments,
  linkFailure,
  unguardedLoop,
  wgslUnit,
  type LinkedModule,
  type ShaderUnit,
} from "../shaders/link/index.ts";
import postStageWgsl from "../shaders/generated/postStage.wgsl?raw";
import type { View } from "./View.ts";
import {
  type UniformLayout,
  type ValueUniform,
  uniformLayout,
  writeUniform,
} from "./uniforms.ts";

/**
 * Where a stage sits between the scene's light and the display:
 *
 * - "scene": linear light, pre-exposed, before the response. After the meter,
 *   so it doesn't move the exposure. Unlit, display-referred color isn't in it.
 * - "exposed": after the response (a camera's exposure or the eye's model),
 *   before tone mapping. White is 1.
 * - "display": tone mapped and encoded, unlit color included, 0 to 1.
 */
export type PostStageSlot = "scene" | "exposed" | "display";

/**
 * What a stage claims to be, shown wherever it's shown, so a look can't pass
 * for physics: "physics" follows from the light, "model" from a stated model of
 * the observer, and "look" is taste.
 */
export type PostStageKind = "physics" | "model" | "look";

/**
 * What a stage reads besides the image: "depth" for `postDepthAt`, "ids" for
 * `postIdAt`.
 */
export type PostStageRead = "depth" | "ids";

/** What `PostStageOptions.perView` is told of a view, this tick. */
export interface PostStageViewInfo {
  readonly view: View;
  /** The view's size, pixels. */
  readonly width: number;
  readonly height: number;
  /** The multiplier on the scene's light in the HDR target. */
  readonly preExposure: number;
  /** Radians per pixel at the view's center. */
  readonly pixelAngle: number;
}

/** What `PostStageOptions.perView` can set for a view, this tick. */
export interface PostStageViewValues {
  /** False leaves the stage out of this view; the chain goes around it. */
  enabled: boolean;
  /** As `PostStage.setUniform`, in this view alone. It lasts until it's set again. */
  setUniform(name: string, value: number | readonly number[]): void;
}

/** A format of a texture a stage owns. Both filter, and both take compute's writes. */
export type PostStageFormat = "rgba16float" | "rgba8unorm";

/**
 * A texture a stage's passes write and read, per view, from the view's pool. It
 * lasts the tick, and isn't kept for the next one.
 */
export interface PostStageTarget {
  /** Its size against the view: 0.5 is half. Default 1, the most it can be. */
  scale?: number;
  /** Default: what the slot's images are, fp16 for light, 8 bits once encoded. */
  format?: PostStageFormat;
  /** Mip levels, each written by a pass of its own. Default 1. */
  mips?: number;
}

/** A fixed image a stage reads: a lookup table, say. Uploaded once per view. */
export interface PostStageImage {
  width: number;
  height: number;
  /** Rows from the top, RGBA: 8-bit values, or `rgba16float`'s half-floats. */
  data: Uint8Array | Uint16Array;
  /** Default "rgba8unorm". */
  format?: PostStageFormat;
}

/** One mip level of a texture. */
export interface PostStageLevel {
  texture: string;
  mip: number;
}

/** A pass of a stage of several (`PostStageOptions.passes`). */
export interface PostStagePass {
  /** Unique within the stage. */
  name: string;
  /**
   * WGSL, as `PostStageOptions.shader` says. For a compute pass it defines
   * `fn postCompute(input: PostInput)` instead, run once per pixel of the first
   * thing it writes, which it stores with `textureStore(<name>, input.pixel, c)`.
   * `postFinite(c)` is what a fragment's result goes through: a compute pass that
   * skips it can leave a NaN for the next stage to spread.
   */
  shader: string | ShaderUnit;
  /**
   * What it reads besides the image before the stage: "depth", "ids", a name in
   * `textures` (all its levels), or one level of it. What it reads, an earlier
   * pass must have written, unless it's a fixed image.
   */
  reads?: readonly (PostStageRead | string | PostStageLevel)[];
  /**
   * What it writes: "output", the stage's result, or a name in `textures`, level 0
   * unless it says. A fragment pass writes one thing; default "output".
   */
  writes?: readonly (string | PostStageLevel)[];
  /** Makes it a compute pass. Its workgroup's size is `[8, 8]` by default. */
  compute?: { workgroupSize?: readonly [number, number] };
}

/** What a slot's images are. */
export const SLOT_FORMAT: Readonly<Record<PostStageSlot, PostStageFormat>> = {
  scene: "rgba16float",
  exposed: "rgba16float",
  display: "rgba8unorm",
};

const SLOTS: readonly PostStageSlot[] = ["scene", "exposed", "display"];
const KINDS: readonly PostStageKind[] = ["physics", "model", "look"];
const READS: Readonly<Record<PostStageRead, string>> = {
  depth: "postDepthAt",
  ids: "postIdAt",
};

/** A stage that can't be made or used, naming the stage and the field. */
export class PostStageError extends Error {
  override readonly name = "PostStageError";
  constructor(
    /** The stage's name ("" if that's what's wrong). */
    readonly stage: string,
    /** The option at fault: "slot", "shader", `uniforms.strength`. */
    readonly field: string,
    /** What's wrong with it. */
    readonly detail: string,
  ) {
    super(`Post stage "${stage}": ${field}: ${detail}`);
  }
}

export interface PostStageOptions {
  /** Unique within a view's list. */
  name: string;
  slot: PostStageSlot;
  kind: PostStageKind;
  /** What to call it in a readout: "Astrophoto curve (a look)". */
  label: string;
  /**
   * WGSL defining `fn postStage(input: PostInput) -> vec4<f32>`, or a unit
   * holding it, from the offline Slang compiler, say. Or give `passes`. It may
   * use:
   *
   * - `PostInput`: of what the pass writes, `uv` (0 to 1, from the top left),
   *   `pixel` (`vec2<i32>`), `size` (`vec2<f32>`, pixels), and `pixelAngle`
   *   (radians per pixel at the view's center); and `preExposure`;
   * - `postColor(uv)`, `postColorAt(pixel)`: the image before the stage, its
   *   slot says in what terms (`PostStageSlot`), in the view's pixels;
   * - `postDepthAt(pixel)`: reverse-Z depth, 0 where nothing was drawn, with
   *   `reads: ["depth"]`, in the view's pixels;
   * - `postIdAt(pixel)`: the feature ID, with `reads: ["ids"]`, likewise;
   * - `uniforms.<name>`: its value `uniforms`;
   * - `<name>`: a `texture_2d<f32>` it reads, with `postSampler`, linear and
   *   clamped, for `textureSampleLevel`; or the storage texture a compute
   *   pass writes.
   *
   * A result that isn't finite shows as 0 at that pixel.
   *
   * It runs on the GPU, per pixel, at full size. WebGPU can't stop a shader
   * that doesn't end, and a hang can lose the GPU device for every
   * application on the machine. So it's refused if it holds a `loop`, a
   * `while`, or a `for` whose count can't be read from its header, or that
   * runs over 256 times per pixel (`allowUnboundedLoops`). Its bindings and
   * entry points are the engine's: a `@group`, a `@binding` or an entry point
   * of its own is refused too.
   */
  shader?: string | ShaderUnit;
  /**
   * Passes in order, in place of `shader`, for a stage that needs intermediate
   * images or compute. One of them must write "output".
   */
  passes?: readonly PostStagePass[];
  /** What it owns (`PostStageTarget`), or a fixed image it reads, by name. */
  textures?: Record<string, PostStageTarget | PostStageImage>;
  /**
   * Let the shader's loops past the check above. A hang is then on the
   * application: the engine reports a device loss (`Engine.errors`), naming the
   * stages that were on, and turns them off.
   */
  allowUnboundedLoops?: boolean;
  /** With `shader`: as `PostStagePass.reads`. */
  reads?: readonly (PostStageRead | string | PostStageLevel)[];
  /** Values it reads as `uniforms.<name>`, set with `setUniform`. */
  uniforms?: Record<string, ValueUniform>;
  /**
   * What differs from view to view. A stage may be in several views' lists, and
   * `enabled` and `setUniform` apply to them all. This runs once per tick for
   * each view that draws it while it's enabled, after the meter and the eye's
   * adaptation and before the view's first stage: from a view's adaptation
   * (`view.readout()`), say. Keep it cheap, and don't allocate. It runs only in
   * a tick that's happening anyway, and doesn't ask for one.
   */
  perView?: (info: PostStageViewInfo, values: PostStageViewValues) => void;
  /**
   * The largest slope of its curve near black, for an `exposed` stage: how far
   * it can lift what's faint. Default 1.
   */
  shadowGain?: number;
}

/** @internal A texture of a stage's, "output" among them. */
export interface PostStageTexture {
  readonly name: string;
  readonly format: PostStageFormat;
  /** Against the view; 0 for a fixed image. */
  readonly scale: number;
  readonly mips: number;
  readonly image?: PostStageImage;
  /** A compute pass writes it. */
  storage: boolean;
}

/** @internal A texture a pass binds, in group 1. */
export interface PostStageBinding {
  readonly binding: number;
  readonly texture: PostStageTexture;
  /** One level; all of them if it's undefined, which only a read can be. */
  readonly mip: number | undefined;
  readonly write: boolean;
}

/** @internal A pass as declared, checked and linked. */
export interface ResolvedPostPass {
  /** Its pass in the graph. */
  readonly label: string;
  readonly module: LinkedModule;
  /** A compute pass's workgroup size. */
  readonly compute: readonly [number, number] | undefined;
  readonly reads: readonly PostStageRead[];
  readonly bindings: readonly PostStageBinding[];
  /** What it writes; a fragment pass's first is its target. */
  readonly writes: readonly PostStageBinding[];
}

/** A compute pass's entry point, around the stage's `postCompute`. */
const computeEntry = ([x, y]: readonly [number, number]) =>
  `// A fragment entry point stays in the glue, which needs a stage to call.
fn postStage(input: PostInput) -> vec4<f32> { return vec4<f32>(0.0); }
@compute @workgroup_size(${x}, ${y})
fn postComputeEntry(@builtin(global_invocation_id) id: vec3<u32>) {
  let input = postInputAt(vec2<i32>(id.xy));
  if (f32(id.x) < input.size.x && f32(id.y) < input.size.y) {
    postCompute(input);
  }
}`;

const TEXTURE_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;
const NOT_TEXTURES = new Set(["depth", "ids"]);
const BYTES_PER_TEXEL: Readonly<Record<PostStageFormat, number>> = {
  rgba16float: 8,
  rgba8unorm: 4,
};

/**
 * A step of a view's chain (`ObserverSettings.stages`). Made by
 * `createPostStage`. It may be in several views' lists: each draws it with its
 * own targets and uniform buffer. `enabled` and `setUniform` here apply to all
 * of them; `PostStageOptions.perView` is how they differ.
 */
export class PostStage {
  readonly name: string;
  readonly slot: PostStageSlot;
  readonly kind: PostStageKind;
  readonly label: string;
  /** How far it lifts what's faint (`PostStageOptions.shadowGain`). */
  readonly shadowGain: number;
  /** What any of its passes reads of the view: "depth", "ids". */
  readonly reads: readonly PostStageRead[];
  /**
   * Why it isn't drawn: what the GPU's compiler said, each message at its unit
   * and line; why it refused the pipeline; or that the device was lost with it
   * on. `Engine.errors` and `Engine.onError` have it too.
   */
  get error(): PostStageError | undefined {
    return this.error_;
  }
  /** @internal `PostStageOptions.perView`. */
  readonly perView: PostStageOptions["perView"];
  /** @internal Its passes: one, for a stage of one function. */
  readonly passes: readonly ResolvedPostPass[];
  /** @internal What it owns, and "output". */
  readonly textures: readonly PostStageTexture[];
  /** @internal Its value uniforms' layout, its contents, and their changes. */
  readonly uniformLayout: UniformLayout;
  /** @internal */
  readonly uniformData: DataView<ArrayBuffer>;
  /** @internal */
  uniformVersion = 0;
  private error_: PostStageError | undefined;
  private enabled_ = true;
  private readonly watchers = new Set<() => void>();

  constructor(options: PostStageOptions) {
    const { name, slot, kind, label, shader, passes } = options;
    const uniforms = options.uniforms ?? {};
    const shadowGain = options.shadowGain ?? 1;
    const refuse = (field: string, message: string) =>
      new PostStageError(typeof name === "string" ? name : "", field, message);
    if (typeof name !== "string" || name === "") {
      throw refuse("name", "must be a name that isn't empty.");
    }
    if (!SLOTS.includes(slot)) {
      throw refuse("slot", `"${String(slot)}" isn't one; use ${list(SLOTS)}.`);
    }
    if (!KINDS.includes(kind)) {
      throw refuse(
        "kind",
        `${kind === undefined ? "it's required" : `"${String(kind)}" isn't one`}; use ${list(KINDS)}.`,
      );
    }
    if (typeof label !== "string" || label === "") {
      throw refuse("label", "must say what to call it in a readout.");
    }
    if (!(shadowGain > 0) || !Number.isFinite(shadowGain)) {
      throw refuse(
        "shadowGain",
        `${shadowGain} isn't a positive, finite number.`,
      );
    }
    for (const [key, declaration] of Object.entries(uniforms)) {
      if ((declaration.type as string) === "texture2d") {
        throw refuse(
          `uniforms.${key}`,
          "a stage takes only value uniforms; a texture goes in `textures`.",
        );
      }
    }
    if ((shader === undefined) === (passes === undefined)) {
      throw refuse("shader", "give it `shader` or `passes`, and not both.");
    }
    if (passes && options.reads) {
      throw refuse("reads", "with `passes`, each pass says what it reads.");
    }
    if (passes?.length === 0) {
      throw refuse("passes", "it needs at least one.");
    }
    this.name = name;
    this.slot = slot;
    this.kind = kind;
    this.label = label;
    this.shadowGain = shadowGain;
    this.perView = options.perView;

    this.uniformLayout = uniformLayout(uniforms);
    this.uniformData = new DataView(new ArrayBuffer(this.uniformLayout.bytes));
    for (const field of this.uniformLayout.fields) {
      writeUniform(this.uniformData, field, uniforms[field.name]!.value, false);
    }

    const textures = new Map<string, PostStageTexture>([
      [
        "output",
        {
          name: "output",
          format: SLOT_FORMAT[slot],
          scale: 1,
          mips: 1,
          storage: false,
        },
      ],
    ]);
    for (const [key, texture] of Object.entries(options.textures ?? {})) {
      textures.set(key, resolveTexture(key, texture, slot, refuse));
    }
    this.textures = [...textures.values()];
    const written = new Map<PostStageTexture, Set<number>>();
    const seen = new Set<string>();
    this.passes = (
      passes ?? [
        {
          name,
          shader: shader!,
          reads: options.reads ?? [],
          writes: ["output"],
        },
      ]
    ).map((pass) => {
      const field = passes ? `passes.${pass.name}.` : "";
      if (passes && (typeof pass.name !== "string" || pass.name === "")) {
        throw refuse("passes", "each needs a name that isn't empty.");
      }
      if (seen.has(pass.name)) {
        throw refuse("passes", `two have the name "${pass.name}".`);
      }
      seen.add(pass.name);
      return resolvePass(pass, {
        stage: name,
        unitName: passes ? `${name}.${pass.name}` : name,
        label: passes ? `post.${name}.${pass.name}` : `post.${name}`,
        field,
        textures,
        written,
        uniforms: this.uniformLayout,
        unguarded: options.allowUnboundedLoops ?? false,
        refuse,
      });
    });
    if (!written.has(textures.get("output")!)) {
      throw refuse("passes", 'none of them writes "output".');
    }
    this.reads = [...new Set(this.passes.flatMap((pass) => pass.reads))];
  }

  /** @internal Says why it isn't drawn; a device loss turns it off too. */
  fail(error: PostStageError): void {
    this.error_ = error;
  }

  /** Whether it's drawn. A disabled stage's chain costs what it would without it. */
  get enabled(): boolean {
    return this.enabled_;
  }
  set enabled(value: boolean) {
    if (value !== this.enabled_) {
      this.enabled_ = value;
      this.notify();
    }
  }

  /** Sets a value uniform: a number, or the components (matrices column-major). */
  setUniform(name: string, value: number | readonly number[]): void {
    this.writeUniform(this.uniformData, name, value);
    this.uniformVersion++;
    this.notify();
  }

  /** @internal Writes a uniform into a copy of its values: one view's, say. */
  writeUniform(
    data: DataView<ArrayBuffer>,
    name: string,
    value: number | readonly number[],
  ): void {
    const field = this.uniformLayout.fields.find((f) => f.name === name);
    if (!field) {
      throw new PostStageError(
        this.name,
        `uniforms.${name}`,
        "it declares no such uniform.",
      );
    }
    writeUniform(data, field, value, false);
  }

  /** @internal Calls `listener` when it changes; a view wakes its loop. */
  watch(listener: () => void): void {
    this.watchers.add(listener);
  }

  /** @internal */
  unwatch(listener: () => void): void {
    this.watchers.delete(listener);
  }

  private notify(): void {
    for (const watcher of this.watchers) {
      watcher();
    }
  }
}

function list(values: readonly string[]): string {
  return values.map((v) => `"${v}"`).join(", ");
}

type Refuse = (field: string, message: string) => PostStageError;

function resolveTexture(
  name: string,
  texture: PostStageTarget | PostStageImage,
  slot: PostStageSlot,
  refuse: Refuse,
): PostStageTexture {
  const field = `textures.${name}`;
  if (!TEXTURE_NAME.test(name) || name === "output" || NOT_TEXTURES.has(name)) {
    throw refuse(field, "that name can't be a texture's in WGSL here.");
  }
  if ("data" in texture) {
    const { width, height, data, format = "rgba8unorm" } = texture;
    if (!(format in BYTES_PER_TEXEL)) {
      throw refuse(field, `"${String(format)}" isn't a format it can have.`);
    }
    const bytes = width * height * BYTES_PER_TEXEL[format];
    if (!(width >= 1 && height >= 1) || data?.byteLength !== bytes) {
      throw refuse(
        field,
        `${width} by ${height} of ${format} is ${bytes} bytes, and its data is ${data?.byteLength}.`,
      );
    }
    return { name, format, scale: 0, mips: 1, image: texture, storage: false };
  }
  const { scale = 1, format = SLOT_FORMAT[slot], mips = 1 } = texture;
  if (!(scale > 0 && scale <= 1)) {
    throw refuse(field, `a scale of ${scale} isn't above 0 and at most 1.`);
  }
  if (!(format in BYTES_PER_TEXEL)) {
    throw refuse(field, `"${String(format)}" isn't a format it can have.`);
  }
  if (!Number.isInteger(mips) || mips < 1 || mips > 16) {
    throw refuse(field, `${mips} mips isn't a whole number from 1 to 16.`);
  }
  return { name, format, scale, mips, storage: false };
}

/** A pass's checks and link, in order: what it reads, an earlier one wrote. */
function resolvePass(
  pass: PostStagePass,
  context: {
    stage: string;
    unitName: string;
    label: string;
    /** What precedes a field's name in a refusal: "passes.down.", or nothing. */
    field: string;
    textures: ReadonlyMap<string, PostStageTexture>;
    written: Map<PostStageTexture, Set<number>>;
    uniforms: UniformLayout;
    unguarded: boolean;
    refuse: Refuse;
  },
): ResolvedPostPass {
  const { field, textures, written, uniforms, refuse } = context;
  const compute = pass.compute
    ? (pass.compute.workgroupSize ?? [8, 8])
    : undefined;
  if (
    compute &&
    !(
      compute.every((n) => Number.isInteger(n) && n >= 1) &&
      compute[0] * compute[1] <= 256
    )
  ) {
    throw refuse(
      `${field}compute`,
      `a workgroup of ${compute.join(" by ")} isn't whole numbers, 256 invocations at most.`,
    );
  }
  const texture = (name: string, kind: string, ref: unknown) => {
    const found = textures.get(name);
    if (!found) {
      throw refuse(
        `${field}${kind}`,
        `"${String(ref)}" isn't one; use ${kind === "reads" ? `${list(Object.keys(READS))} or ` : ""}a name in \`textures\`.`,
      );
    }
    return found;
  };
  const level = (
    found: PostStageTexture,
    mip: number,
    kind: string,
  ): number => {
    if (!Number.isInteger(mip) || mip < 0 || mip >= found.mips) {
      throw refuse(
        `${field}${kind}`,
        `"${found.name}" has no level ${mip}: it has ${found.mips}.`,
      );
    }
    return mip;
  };

  const reads: PostStageRead[] = [];
  const bindings: PostStageBinding[] = [];
  // Group 1: the uniforms, then a sampler if it reads a texture, then those.
  let binding = 2;
  for (const read of pass.reads ?? []) {
    if (typeof read === "string" && read in READS) {
      reads.push(read as PostStageRead);
      continue;
    }
    const name = typeof read === "string" ? read : read?.texture;
    const found = texture(name, "reads", name);
    const mip =
      typeof read === "string" ? undefined : level(found, read.mip, "reads");
    const before = written.get(found);
    if (!found.image && !(mip === undefined ? before : before?.has(mip))) {
      throw refuse(
        `${field}reads`,
        `"${name}"${mip === undefined ? "" : ` level ${mip}`} isn't written by an earlier pass.`,
      );
    }
    bindings.push({ binding: binding++, texture: found, mip, write: false });
  }
  const writes = (pass.writes ?? ["output"]).map((write) => {
    const name = typeof write === "string" ? write : write?.texture;
    const found = texture(name, "writes", name);
    if (found.image) {
      throw refuse(`${field}writes`, `"${name}" is a fixed image.`);
    }
    const mip =
      typeof write === "string" ? 0 : level(found, write.mip, "writes");
    for (const read of bindings) {
      if (read.texture === found && (read.mip ?? mip) === mip) {
        throw refuse(
          `${field}writes`,
          `it reads the level of "${name}" that it writes.`,
        );
      }
    }
    return { binding: 0, texture: found, mip, write: true };
  });
  if (compute ? writes.length === 0 : writes.length !== 1) {
    throw refuse(
      `${field}writes`,
      compute
        ? "a compute pass must write something."
        : `a fragment pass writes one thing, not ${writes.length}.`,
    );
  }
  for (const { texture: found, mip } of writes) {
    let levels = written.get(found);
    if (!levels) {
      written.set(found, (levels = new Set()));
    }
    levels.add(mip);
  }
  const stored = compute
    ? writes.map((write) => {
        write.texture.storage = true;
        return { ...write, binding: binding++ };
      })
    : [];

  const unit =
    typeof pass.shader === "string"
      ? wgslUnit(`${context.unitName} shader`, pass.shader)
      : pass.shader;
  const code = blankComments(unit.code);
  const own = /@\s*(group|binding|vertex|fragment|compute)\b/.exec(code);
  if (own) {
    throw refuse(
      `${field}shader`,
      `it declares its own \`@${own[1]}\`, and the pipeline's layout has no place for it; use \`uniforms\` and \`textures\`.`,
    );
  }
  if (!context.unguarded) {
    const loop = unguardedLoop(unit.code);
    if (loop !== undefined) {
      throw refuse(
        `${field}shader`,
        `${loop}, and a shader that doesn't end can lose the GPU device. Bound it by a constant, or set \`allowUnboundedLoops\`.`,
      );
    }
  }
  for (const [read, used] of Object.entries(READS)) {
    if (
      new RegExp(`\\b${used}\\b`).test(code) &&
      !reads.includes(read as PostStageRead)
    ) {
      throw refuse(
        `${field}reads`,
        `its shader calls \`${used}\`, so it must declare "${read}".`,
      );
    }
  }
  const declared = [
    ...(uniforms.fields.length > 0
      ? [
          `struct Uniforms { ${uniforms.fields.map((f) => `${f.name}: ${f.type}`).join(", ")} };`,
          "@group(1) @binding(0) var<uniform> uniforms: Uniforms;",
        ]
      : []),
    ...(bindings.length > 0
      ? ["@group(1) @binding(1) var postSampler: sampler;"]
      : []),
    ...bindings.map(
      (b) =>
        `@group(1) @binding(${b.binding}) var ${b.texture.name}: texture_2d<f32>;`,
    ),
    ...stored.map(
      (b) =>
        `@group(1) @binding(${b.binding}) var ${b.texture.name}: texture_storage_2d<${b.texture.format}, write>;`,
    ),
  ];
  const module = new WgslLinker().link({
    label: `post stage "${context.unitName}"`,
    units: [
      wgslUnit("postStage.slang", postStageWgsl),
      ...(declared.length > 0
        ? [wgslUnit(`${context.unitName} bindings`, declared.join("\n"))]
        : []),
      unit,
      ...(compute
        ? [wgslUnit(`${context.unitName} entry`, computeEntry(compute))]
        : []),
    ],
    boundaries: [
      POST_STAGE_BOUNDARY,
      ...(compute ? [POST_COMPUTE_BOUNDARY] : []),
    ],
  });
  const failure = linkFailure(module);
  if (failure !== undefined) {
    throw refuse(`${field}shader`, failure);
  }
  return {
    label: context.label,
    module,
    compute,
    reads,
    bindings: [...bindings, ...stored],
    writes,
  };
}

/**
 * A step between the scene's light and a pixel, for `view.observer.stages`:
 *
 * ```ts
 * view.observer.stages = [
 *   createPostStage({
 *     name: "warm",
 *     slot: "exposed",
 *     kind: "look",
 *     label: "Warm (a look)",
 *     uniforms: { amount: { type: "f32", value: 0.1 } },
 *     shader: `fn postStage(input: PostInput) -> vec4<f32> {
 *       let c = postColorAt(input.pixel);
 *       return vec4<f32>(c.rgb * vec3<f32>(1.0 + uniforms.amount, 1.0, 1.0 - uniforms.amount), c.a);
 *     }`,
 *   }),
 * ];
 * ```
 *
 * A stage of several passes owns what lies between them, and says what each reads
 * and writes, so the graph can order them and share their memory:
 *
 * ```ts
 * createPostStage({
 *   name: "soften",
 *   slot: "scene",
 *   kind: "look",
 *   label: "Soften (a look)",
 *   textures: { half: { scale: 0.5 } },
 *   passes: [
 *     {
 *       name: "down",
 *       writes: ["half"],
 *       shader: `fn postStage(input: PostInput) -> vec4<f32> {
 *         return postColor(input.uv);
 *       }`,
 *     },
 *     {
 *       name: "blend",
 *       reads: ["half"],
 *       shader: `fn postStage(input: PostInput) -> vec4<f32> {
 *         let soft = textureSampleLevel(half, postSampler, input.uv, 0.0);
 *         return mix(postColor(input.uv), soft, 0.5);
 *       }`,
 *     },
 *   ],
 * });
 * ```
 *
 * Refuses what's wrong with a `PostStageError` naming the field.
 */
export function createPostStage(options: PostStageOptions): PostStage {
  return new PostStage(options);
}

/** Refuses a list that names a stage twice: their passes would share a name. */
export function checkStageList(stages: readonly PostStage[]): void {
  const names = new Set<string>();
  for (const stage of stages) {
    if (names.has(stage.name)) {
      throw new PostStageError(
        stage.name,
        "name",
        "two stages of a view's list have this name.",
      );
    }
    names.add(stage.name);
  }
}
