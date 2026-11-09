// The public definition of a post stage (CESIUM2_WEBGPU_PLAN.md §13.22): one
// fullscreen function, what it reads, where in the chain it sits, and whether it's
// physics, a model or a look. Plain data with no GPU types: the rasterizer draws it
// (render/post/chain.ts), and it's joined to its glue through the shader linker.
import {
  POST_STAGE_BOUNDARY,
  WgslLinker,
  blankComments,
  linkFailure,
  wgslUnit,
  type LinkedModule,
  type ShaderUnit,
} from "../shaders/link/index.ts";
import postStageWgsl from "../shaders/generated/postStage.wgsl?raw";
import {
  type UniformDeclaration,
  type UniformLayout,
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
    message: string,
  ) {
    super(`Post stage "${stage}": ${field}: ${message}`);
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
   * holding it, from the offline Slang compiler, say. It may use:
   *
   * - `PostInput`: `uv` (0 to 1, from the top left), `pixel` (`vec2<i32>`),
   *   `size` (`vec2<f32>`, pixels), `preExposure`, `pixelAngle` (radians per
   *   pixel at the view's center);
   * - `postColor(uv)`, `postColorAt(pixel)`: the image so far, its slot says in
   *   what terms (`PostStageSlot`);
   * - `postDepthAt(pixel)`: reverse-Z depth, 0 where nothing was drawn, with
   *   `reads: ["depth"]`;
   * - `postIdAt(pixel)`: the feature ID, with `reads: ["ids"]`;
   * - `uniforms.<name>`: its value `uniforms`.
   *
   * A result that isn't finite shows as 0 at that pixel.
   */
  shader: string | ShaderUnit;
  reads?: readonly PostStageRead[];
  /** Values it reads as `uniforms.<name>`, set with `setUniform`. */
  uniforms?: Record<string, UniformDeclaration>;
  /**
   * The largest slope of its curve near black, for an `exposed` stage: how far
   * it can lift what's faint. Default 1.
   */
  shadowGain?: number;
}

/**
 * A step of a view's chain (`ObserverSettings.stages`). Made by
 * `createPostStage`. It may be in several views' lists: each draws it with its
 * own targets.
 */
export class PostStage {
  readonly name: string;
  readonly slot: PostStageSlot;
  readonly kind: PostStageKind;
  readonly label: string;
  /** How far it lifts what's faint (`PostStageOptions.shadowGain`). */
  readonly shadowGain: number;
  readonly reads: readonly PostStageRead[];
  /**
   * Why it isn't drawn, if the GPU's compiler refused its shader: each message
   * at its unit and line.
   */
  error: PostStageError | undefined;
  /** @internal Its shader, linked with its glue and uniforms. */
  readonly module: LinkedModule;
  /** @internal Its value uniforms' layout, its contents, and their changes. */
  readonly uniformLayout: UniformLayout;
  /** @internal */
  readonly uniformData: DataView<ArrayBuffer>;
  /** @internal */
  uniformVersion = 0;
  private enabled_ = true;
  private readonly watchers = new Set<() => void>();

  constructor(options: PostStageOptions) {
    const { name, slot, kind, label, shader, reads = [] } = options;
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
    for (const read of reads) {
      if (!(read in READS)) {
        throw refuse(
          "reads",
          `"${String(read)}" isn't one; use ${list(Object.keys(READS))}.`,
        );
      }
    }
    if (!(shadowGain > 0) || !Number.isFinite(shadowGain)) {
      throw refuse(
        "shadowGain",
        `${shadowGain} isn't a positive, finite number.`,
      );
    }
    for (const [key, declaration] of Object.entries(uniforms)) {
      if (declaration.type === "texture2d") {
        throw refuse(`uniforms.${key}`, "a stage takes only value uniforms.");
      }
    }
    this.name = name;
    this.slot = slot;
    this.kind = kind;
    this.label = label;
    this.shadowGain = shadowGain;
    this.reads = [...reads];

    const unit =
      typeof shader === "string" ? wgslUnit(`${name} shader`, shader) : shader;
    const code = blankComments(unit.code);
    for (const [read, used] of Object.entries(READS)) {
      if (
        new RegExp(`\\b${used}\\b`).test(code) &&
        !reads.includes(read as PostStageRead)
      ) {
        throw refuse(
          "reads",
          `its shader calls \`${used}\`, so it must declare "${read}".`,
        );
      }
    }
    this.uniformLayout = uniformLayout(uniforms);
    this.uniformData = new DataView(new ArrayBuffer(this.uniformLayout.bytes));
    for (const field of this.uniformLayout.fields) {
      const { value } = uniforms[field.name] as {
        value?: number | ArrayLike<number>;
      };
      writeUniform(this.uniformData, field, value, false);
    }
    const fields = this.uniformLayout.fields;
    this.module = new WgslLinker().link({
      label: `post stage "${name}"`,
      units: [
        wgslUnit("postStage.slang", postStageWgsl),
        ...(fields.length > 0
          ? [
              wgslUnit(
                `${name} uniforms`,
                `struct Uniforms { ${fields.map((f) => `${f.name}: ${f.type}`).join(", ")} };\n@group(1) @binding(0) var<uniform> uniforms: Uniforms;`,
              ),
            ]
          : []),
        unit,
      ],
      boundaries: [POST_STAGE_BOUNDARY],
    });
    const failure = linkFailure(this.module);
    if (failure !== undefined) {
      throw refuse("shader", failure);
    }
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
    const field = this.uniformLayout.fields.find((f) => f.name === name);
    if (!field) {
      throw new PostStageError(
        this.name,
        `uniforms.${name}`,
        "it declares no such uniform.",
      );
    }
    writeUniform(this.uniformData, field, value, false);
    this.uniformVersion++;
    this.notify();
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
