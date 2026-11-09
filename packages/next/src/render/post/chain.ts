// A view's chain of post stages in its graph: their passes, their targets, and
// which of them feeds what in a tick. A disabled stage keeps its pass, which does
// nothing, and acquires no texture: the next stage reads the latest one that ran.
// Changing the list rebuilds the view's graph (`viewFrameFor`), as a resize does.
import type { EngineErrors } from "../../gpu/EngineErrors.ts";
import type { FrameGraph, ResolveView, TextureHandle } from "../FrameGraph.ts";
import { compileFailure } from "../../shaders/link/index.ts";
import {
  PostStage,
  PostStageError,
  SLOT_FORMAT,
  type PostStageBinding,
  type PostStageImage,
  type PostStageKind,
  type PostStageSlot,
  type PostStageTexture,
  type PostStageViewInfo,
  type PostStageViewValues,
  type ResolvedPostPass,
} from "../../scene/postStage.ts";
import { EYE_LIMIT_STAGE } from "../../scene/eyeLimit.ts";
import type { ObserverSettings } from "../../scene/observer.ts";
import type { View } from "../../scene/View.ts";

/**
 * What a built-in stage is given (`GraphStage.register`). For what `PostStagePass`
 * can't declare: an instanced draw, a buffer, a blend. Not public until a second
 * user asks for it.
 */
export interface ChainIo {
  /** The latest image before it this tick: resolve it in a pass body. */
  source(): TextureHandle;
  /** Every image `source` can be: declare these as the pass's reads. */
  readonly sources: readonly TextureHandle[];
  /** Where it leaves its result, the size of the view. */
  readonly output: TextureHandle;
  readonly depth: TextureHandle;
  readonly ids: TextureHandle;
  readonly width: number;
  readonly height: number;
  preExposure(): number;
  pixelAngle(): number;
}

/** A built-in stage, registered in the same place. */
export interface GraphStage {
  readonly name: string;
  readonly slot: PostStageSlot;
  readonly kind: PostStageKind;
  readonly label: string;
  enabled: boolean;
  register(graph: FrameGraph, io: ChainIo): void;
}

export type ChainEntry = PostStage | GraphStage;

/**
 * What a view's chain holds. The engine's own stages join here, before the
 * application's in each slot: a host's `scene` stage sees the veil, and not the
 * reverse. What decides that they're here counts in `View.stagesRevision`.
 */
export function chainEntries(
  observer: ObserverSettings,
  glare: readonly ChainEntry[] = [],
): readonly ChainEntry[] {
  if (glare.length === 0) {
    return observer.stages;
  }
  // The eye's point limit comes first: what it fades can't glare.
  const after = observer.stages.findIndex((s) => s.name === EYE_LIMIT_STAGE);
  return [
    ...observer.stages.slice(0, after + 1),
    ...glare,
    ...observer.stages.slice(after + 1),
  ];
}

/** The slots' order: stable by list position. */
export function chainOrder<T extends { readonly slot: PostStageSlot }>(
  stages: readonly T[],
): { scene: T[]; exposed: T[]; display: T[] } {
  return {
    scene: stages.filter((s) => s.slot === "scene"),
    exposed: stages.filter((s) => s.slot === "exposed"),
    display: stages.filter((s) => s.slot === "display"),
  };
}

/**
 * Which of a slot's stages feeds the one at `index` (the list's length: what
 * follows the slot): the latest enabled before it; -1 is the slot's input.
 */
export function chainSource(
  stages: readonly { readonly enabled: boolean }[],
  index: number,
): number {
  for (let i = Math.min(index, stages.length) - 1; i >= 0; i--) {
    if (stages[i]!.enabled) {
      return i;
    }
  }
  return -1;
}

/**
 * How far the observer's enabled `exposed` stages lift what's faint, together:
 * the product of their `shadowGain`s, 1 with none.
 */
export function observerShadowGain(settings: ObserverSettings): number {
  const { stages } = settings;
  let gain = 1;
  for (let i = 0; i < stages.length; i++) {
    const stage = stages[i]!;
    if (stage.slot === "exposed" && stage.enabled) {
      gain *= stage.shadowGain;
    }
  }
  return gain;
}

/** One view's values of a stage: its own uniforms, and whether it's left out. */
class StageViewValues implements PostStageViewValues {
  enabled = true;
  private readonly data: DataView<ArrayBuffer>;
  private readonly bytes: Uint8Array<ArrayBuffer>;
  /** What the buffer holds. */
  private readonly sent: Uint8Array<ArrayBuffer>;
  private version = -1;

  constructor(private readonly stage: PostStage) {
    const size = stage.uniformLayout.bytes;
    this.data = new DataView(new ArrayBuffer(size));
    this.bytes = new Uint8Array(this.data.buffer);
    this.sent = new Uint8Array(size);
  }

  setUniform(name: string, value: number | readonly number[]): void {
    this.follow();
    this.stage.writeUniform(this.data, name, value);
  }

  /** Takes up the stage's own values, when they've changed. */
  private follow(): void {
    if (this.version !== this.stage.uniformVersion) {
      this.version = this.stage.uniformVersion;
      this.bytes.set(new Uint8Array(this.stage.uniformData.buffer));
    }
  }

  /** Writes what moved to the view's buffer. */
  upload(device: GPUDevice, buffer: GPUBuffer): void {
    this.follow();
    const { bytes, sent } = this;
    for (let i = 0; i < bytes.length; i++) {
      if (bytes[i] !== sent[i]) {
        sent.set(bytes);
        device.queue.writeBuffer(buffer, 0, this.data.buffer);
        return;
      }
    }
  }
}

/** A pass's pipeline; neither until the GPU has it. */
interface StagePipeline {
  render?: GPURenderPipeline;
  compute?: GPUComputePipeline;
  /** Who to tell if the compiler refuses it, and what it said. */
  readonly stages: Set<PostStage>;
  error?: PostStageError;
  /** Group 0's layout, for its reads; group 1's, for what's the stage's own. */
  imageLayout: GPUBindGroupLayout;
  stageLayout: GPUBindGroupLayout | undefined;
}

/** Stage pipelines by what makes them differ, per device. */
const pipelineCaches = new WeakMap<GPUDevice, Map<string, StagePipeline>>();

const isReady = (made: StagePipeline) => !!(made.render ?? made.compute);

/**
 * A pass's pipeline, made once per shader, reads and target: compiled in the
 * background, and `ready` called when it can draw. A shader the compiler refuses,
 * or a pipeline the GPU does, leaves `stage.error` set, reports it in the engine's
 * errors, and stays undrawn.
 */
function stagePipeline(
  { device, errors }: ChainEngine["ctx"],
  stage: PostStage,
  pass: ResolvedPostPass,
  ready: () => void,
): StagePipeline {
  let cache = pipelineCaches.get(device);
  if (!cache) {
    cache = new Map();
    pipelineCaches.set(device, cache);
  }
  const { module: linked, compute, reads, bindings, writes, storage } = pass;
  const format = writes[0]!.texture.format;
  const hasUniforms = stage.uniformLayout.bytes > 0;
  const key = `${compute ? "compute" : format}|${reads.join()}|${hasUniforms}|${linked.code}`;
  const known = cache.get(key);
  if (known) {
    if (known.error) {
      const { field, detail } = known.error;
      stage.fail(new PostStageError(stage.name, field, detail));
    } else if (!isReady(known)) {
      known.stages.add(stage);
    }
    return known;
  }
  const visibility = compute ? GPUShaderStage.COMPUTE : GPUShaderStage.FRAGMENT;
  const imageLayout = device.createBindGroupLayout({
    label: `${linked.label}.image`,
    entries: [
      { binding: 0, visibility, texture: {} },
      { binding: 1, visibility, sampler: { type: "filtering" } },
      { binding: 2, visibility, buffer: { type: "uniform" } },
      ...(reads.includes("depth")
        ? [
            {
              binding: 3,
              visibility,
              texture: { sampleType: "depth", multisampled: true } as const,
            },
          ]
        : []),
      ...(reads.includes("ids")
        ? [
            {
              binding: 4,
              visibility,
              texture: { sampleType: "uint", multisampled: true } as const,
            },
          ]
        : []),
    ],
  });
  const reading = bindings.some((b) => !b.write);
  const stageLayout =
    hasUniforms || bindings.length > 0 || storage.length > 0
      ? device.createBindGroupLayout({
          label: `${linked.label}.stage`,
          entries: [
            ...(hasUniforms
              ? [
                  {
                    binding: 0,
                    visibility,
                    buffer: { type: "uniform" },
                  } as const,
                ]
              : []),
            ...(reading
              ? [
                  {
                    binding: 1,
                    visibility,
                    sampler: { type: "filtering" },
                  } as const,
                ]
              : []),
            ...bindings.map((b) =>
              b.write
                ? {
                    binding: b.binding,
                    visibility,
                    storageTexture: {
                      access: "write-only",
                      format: b.texture.format,
                    } as const,
                  }
                : { binding: b.binding, visibility, texture: {} },
            ),
            ...storage.map(
              (b) =>
                ({
                  binding: b.binding,
                  visibility,
                  buffer: { type: "read-only-storage" },
                }) as const,
            ),
          ],
        })
      : undefined;
  const entry: StagePipeline = {
    stages: new Set([stage]),
    imageLayout,
    stageLayout,
  };
  cache.set(key, entry);
  const make = async () => {
    // Its errors are reported below, once, not as an uncaptured error too.
    device.pushErrorScope("validation");
    const module = device.createShaderModule({
      label: linked.label,
      code: linked.code,
    });
    void device.popErrorScope();
    const info = await module.getCompilationInfo();
    const failure = compileFailure(linked, info.messages);
    if (failure !== undefined) {
      throw new PostStageError(stage.name, "shader", failure);
    }
    const layout = device.createPipelineLayout({
      bindGroupLayouts: [imageLayout, ...(stageLayout ? [stageLayout] : [])],
    });
    if (compute) {
      entry.compute = await device.createComputePipelineAsync({
        label: linked.label,
        layout,
        compute: { module, entryPoint: "postComputeEntry" },
      });
    } else {
      entry.render = await device.createRenderPipelineAsync({
        label: linked.label,
        layout,
        vertex: { module, entryPoint: "postStageVertex" },
        fragment: {
          module,
          entryPoint: "postStageFragment",
          targets: [{ format }],
        },
        primitive: { topology: "triangle-list" },
      });
    }
    entry.stages.clear();
    ready();
  };
  make().catch((reason: unknown) => {
    const compiled = reason instanceof PostStageError;
    const error = compiled
      ? reason
      : new PostStageError(stage.name, "shader", String(reason));
    entry.error = error;
    for (const refused of entry.stages) {
      refused.fail(new PostStageError(refused.name, error.field, error.detail));
    }
    entry.stages.clear();
    errors.report(compiled ? "shader" : "pipeline", error.message);
  });
  return entry;
}

/** What a stage's or a chain's pass needs of the engine. */
export interface ChainEngine {
  readonly raster?: {
    readonly timer: {
      passWrites(label: string): GPUComputePassTimestampWrites | undefined;
    };
  };
  readonly ctx: {
    readonly device: GPUDevice;
    readonly errors: Pick<EngineErrors, "report">;
    readonly pipelines: {
      chain(): Promise<ChainPipelines>;
    };
  };
  requestRender(): void;
}

/** What a chain adds to the present pass (RenderContext `chain`). */
export interface ChainPipelines {
  /** Scene light to exposed light (present.slang `fsResponse`). */
  response: GPURenderPipeline;
  /** Exposed light to the target (`fsTone`), or to the 8-bit image. */
  tone: GPURenderPipeline;
  toneLdr: GPURenderPipeline;
  /** The 8-bit image to the target (fxaa.slang `fsCopy`). */
  copy: GPURenderPipeline;
}

/** One entry of a slot, as a view draws it. */
interface ChainNode {
  /** It runs this tick: enabled, and its pipeline ready. */
  readonly enabled: boolean;
  readonly output: TextureHandle;
}

/** A slot of a view's chain: its passes' targets, and what feeds what. */
export class ChainSlot {
  readonly nodes: ChainNode[] = [];
  constructor(
    /** What the slot starts from. */
    readonly input: TextureHandle,
  ) {}

  /** Every image the slot may read or leave: for a pass's declared reads. */
  get handles(): TextureHandle[] {
    return [this.input, ...this.nodes.map((n) => n.output)];
  }

  /** A stage runs in this slot this tick. */
  get active(): boolean {
    return chainSource(this.nodes, this.nodes.length) >= 0;
  }

  /** The image that feeds the stage at `index`. */
  source(index: number): TextureHandle {
    const i = chainSource(this.nodes, index);
    return i < 0 ? this.input : this.nodes[i]!.output;
  }

  /** The image the slot leaves. */
  latest(): TextureHandle {
    return this.source(this.nodes.length);
  }
}

/**
 * Per view: its slots, and the buffer its stages share. Empty, it costs nothing:
 * no buffer, no target.
 */
export class ViewChain {
  readonly slots: Readonly<Record<PostStageSlot, ChainSlot | undefined>>;
  /** Filled by `registerStage`, freed with the view's graph. */
  private readonly buffers: GPUBuffer[] = [];
  private readonly images: GPUTexture[] = [];
  private readonly sharedBuffers = new Map<string, GPUBuffer>();
  /** What runs a stage's `perView`, in the list's order. */
  private readonly perView: Array<(info: PostStageViewInfo) => void> = [];
  private readonly info: {
    -readonly [K in keyof PostStageViewInfo]: PostStageViewInfo[K];
  } = {
    view: undefined as never,
    width: 0,
    height: 0,
    preExposure: 1,
    pixelAngle: 0,
  };
  /** `PostInput`'s values as last written, per size that passes write. */
  private readonly params = new Map<
    number,
    { readonly buffer: GPUBuffer; readonly values: Float32Array<ArrayBuffer> }
  >();
  /** The split pipelines, once asked for and ready. */
  pipelines: ChainPipelines | undefined;
  /** The group `fsResponse` reads, with what it was made for. */
  responseGroup: GPUBindGroup | undefined;
  responseInputs: readonly GPUTextureView[] = [];

  constructor(slots: Partial<Record<PostStageSlot, ChainSlot>> = {}) {
    this.slots = {
      scene: slots.scene,
      exposed: slots.exposed,
      display: slots.display,
    };
  }

  /** An `exposed` stage runs this tick, and the split entries can draw it. */
  get splits(): boolean {
    return (this.slots.exposed?.active ?? false) && !!this.pipelines;
  }

  /** A `display` stage runs this tick, and the copy can follow it. */
  get displays(): boolean {
    return (this.slots.display?.active ?? false) && !!this.pipelines;
  }

  /** The buffer of `PostInput`'s values at a size, shared by what writes that size. */
  private paramsAt(device: GPUDevice, width: number, height: number) {
    const key = width * 65536 + height;
    let params = this.params.get(key);
    if (!params) {
      params = {
        buffer: this.buffer(device, "postParams", 16),
        values: new Float32Array(4).fill(Number.NaN),
      };
      this.params.set(key, params);
    }
    return params;
  }

  paramBuffer(device: GPUDevice, width: number, height: number): GPUBuffer {
    return this.paramsAt(device, width, height).buffer;
  }

  /** Writes `PostInput`'s values, for what a pass writes, if they moved. */
  writeParams(
    device: GPUDevice,
    width: number,
    height: number,
    preExposure: number,
    pixelAngle: number,
  ): void {
    const { buffer, values: p } = this.paramsAt(device, width, height);
    if (
      p[0] !== width ||
      p[1] !== height ||
      p[2] !== Math.fround(preExposure) ||
      p[3] !== Math.fround(pixelAngle)
    ) {
      p[0] = width;
      p[1] = height;
      p[2] = preExposure;
      p[3] = pixelAngle;
      device.queue.writeBuffer(buffer, 0, p);
    }
  }

  /** Holds a buffer the view's stages read by name (`PostStagePass.storage`). */
  share(name: string, buffer: GPUBuffer): void {
    this.sharedBuffers.set(name, buffer);
  }

  shared(name: string): GPUBuffer {
    const buffer = this.sharedBuffers.get(name);
    if (!buffer) {
      throw new Error(`A view's chain holds no buffer "${name}".`);
    }
    return buffer;
  }

  /** Follows `stage`'s `perView` in this view. Before any stage's pass, each tick. */
  addPerView(run: (info: PostStageViewInfo) => void): void {
    this.perView.push(run);
  }

  /** Each stage's `perView`, for this tick. */
  runPerView(view: ChainView): void {
    const { info } = this;
    info.view = view.view;
    info.width = view.width;
    info.height = view.height;
    info.preExposure = view.preExposure();
    info.pixelAngle = view.pixelAngle();
    for (let i = 0; i < this.perView.length; i++) {
      this.perView[i]!(info);
    }
  }

  /** A stage's fixed image, uploaded for this view's graph. */
  image(
    device: GPUDevice,
    label: string,
    { width, height, data, format = "rgba8unorm" }: PostStageImage,
  ): GPUTextureView {
    const texture = device.createTexture({
      label,
      size: [width, height],
      format,
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
    });
    device.queue.writeTexture(
      { texture },
      data as Uint8Array<ArrayBuffer>,
      { bytesPerRow: (data.byteLength / height) | 0 },
      [width, height],
    );
    this.images.push(texture);
    return texture.createView();
  }

  buffer(device: GPUDevice, label: string, size: number): GPUBuffer {
    const buffer = device.createBuffer({
      label,
      size,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.buffers.push(buffer);
    return buffer;
  }

  destroy(): void {
    for (const buffer of this.buffers) {
      buffer.destroy();
    }
    for (const image of this.images) {
      image.destroy();
    }
  }
}

/**
 * What every stage's pass reads of a view: its images, and what it needs for
 * `PostInput` this tick.
 */
export interface ChainView {
  readonly width: number;
  readonly height: number;
  readonly depth: TextureHandle;
  readonly ids: TextureHandle;
  readonly view: View;
  preExposure(): number;
  pixelAngle(): number;
}

const SAMPLERS = new WeakMap<GPUDevice, GPUSampler>();

function linearSampler(device: GPUDevice): GPUSampler {
  let sampler = SAMPLERS.get(device);
  if (!sampler) {
    sampler = device.createSampler({
      label: "post stage",
      magFilter: "linear",
      minFilter: "linear",
      mipmapFilter: "linear",
    });
    SAMPLERS.set(device, sampler);
  }
  return sampler;
}

const targetUsage = (storage: boolean) =>
  GPUTextureUsage.RENDER_ATTACHMENT |
  GPUTextureUsage.TEXTURE_BINDING |
  // `View.readHdr`, after glare.
  GPUTextureUsage.COPY_SRC |
  (storage ? GPUTextureUsage.STORAGE_BINDING : 0);

/** A stage's result in a slot: the view's size. */
function stageTarget(
  graph: FrameGraph,
  name: string,
  slot: PostStageSlot,
  view: ChainView,
  storage: boolean,
): TextureHandle {
  return graph.createTexture(`post.${name}`, {
    label: `post.${name}`,
    width: view.width,
    height: view.height,
    format: SLOT_FORMAT[slot],
    usage: targetUsage(storage),
  });
}

/**
 * The pass that runs stages' `perView`, if any has one: before the first slot, so
 * what it decides holds for all of them this tick. After that nothing's added, so
 * a view with none has the pass list it always had.
 */
export function registerPerView(
  graph: FrameGraph,
  chain: ViewChain,
  entries: readonly ChainEntry[],
  view: ChainView,
): void {
  if (entries.some((e) => e instanceof PostStage && e.perView)) {
    graph.addPass("post.perView", { sideEffect: true }, () =>
      chain.runPerView(view),
    );
  }
}

/** Registers a slot's stages in list order, each after the last. */
export function registerSlot(
  engine: ChainEngine,
  graph: FrameGraph,
  chain: ViewChain,
  slot: ChainSlot,
  entries: readonly ChainEntry[],
  view: ChainView,
): void {
  entries.forEach((entry, index) => {
    const isStage = entry instanceof PostStage;
    const output = stageTarget(
      graph,
      entry.name,
      entry.slot,
      view,
      isStage && entry.textures[0]!.storage,
    );
    if (isStage) {
      registerStage(engine, graph, chain, slot, entry, index, output, view);
    } else {
      const sources = slot.handles;
      slot.nodes.push({
        get enabled() {
          return entry.enabled;
        },
        output,
      });
      entry.register(graph, {
        source: () => slot.source(index),
        sources,
        output,
        depth: view.depth,
        ids: view.ids,
        width: view.width,
        height: view.height,
        preExposure: view.preExposure,
        pixelAngle: view.pixelAngle,
      });
    }
  });
}

/** A stage's texture in a view's graph, or its fixed image. */
interface StageTexture {
  readonly handle?: TextureHandle;
  readonly image?: GPUTextureView;
  readonly width: number;
  readonly height: number;
}

function registerStage(
  engine: ChainEngine,
  graph: FrameGraph,
  chain: ViewChain,
  slot: ChainSlot,
  stage: PostStage,
  index: number,
  output: TextureHandle,
  view: ChainView,
): void {
  const { device } = engine.ctx;
  const sources = slot.handles;
  const made = stage.passes.map((pass) =>
    stagePipeline(engine.ctx, stage, pass, () => engine.requestRender()),
  );
  const values = new StageViewValues(stage);
  const { perView } = stage;
  if (perView) {
    chain.addPerView((info) => {
      values.enabled = true;
      if (!stage.enabled) {
        return;
      }
      try {
        perView(info, values);
      } catch (reason) {
        // Off for every view: it would throw again each tick.
        const error = new PostStageError(stage.name, "perView", String(reason));
        stage.fail(error);
        stage.enabled = false;
        engine.ctx.errors.report("frame", error.message);
      }
    });
  }
  const node: ChainNode = {
    get enabled() {
      return stage.enabled && values.enabled && made.every(isReady);
    },
    output,
  };
  slot.nodes.push(node);
  const textures = new Map<PostStageTexture, StageTexture>();
  for (const texture of stage.textures) {
    textures.set(
      texture,
      stageTexture(device, graph, chain, stage, texture, output, view),
    );
  }
  const uniforms =
    stage.uniformLayout.bytes > 0
      ? chain.buffer(device, `post.${stage.name}`, stage.uniformLayout.bytes)
      : undefined;
  stage.passes.forEach((pass, i) => {
    const { width, height } = levelSize(
      textures.get(pass.writes[0]!.texture)!,
      pass.writes[0]!.mip ?? 0,
    );
    const handles = (bindings: readonly PostStageBinding[]) =>
      bindings.flatMap((b) => textures.get(b.texture)!.handle ?? []);
    const color: GPURenderPassColorAttachment = {
      view: undefined as never,
      clearValue: { r: 0, g: 0, b: 0, a: 1 },
      loadOp: "clear",
      storeOp: "store",
    };
    const descriptor: GPURenderPassDescriptor = {
      label: pass.label,
      colorAttachments: [color],
    };
    const computeDescriptor: GPUComputePassDescriptor = { label: pass.label };
    const pipeline = made[i]!;
    /** The view of a binding, this tick. */
    const viewOf = (b: PostStageBinding, get: ResolveView): GPUTextureView => {
      const texture = textures.get(b.texture)!;
      if (texture.image) {
        return texture.image;
      }
      return b.mip === undefined || b.texture.mips === 1
        ? get(texture.handle!)
        : graph.mipView(texture.handle!, b.mip);
    };
    let group: GPUBindGroup | undefined;
    let groupSource: GPUTextureView | undefined;
    let stageGroup: GPUBindGroup | undefined;
    const stageViews: Array<GPUTextureView | undefined> = pass.bindings.map(
      () => undefined,
    );
    graph.addPass(
      pass.label,
      {
        reads: [
          ...sources,
          ...pass.reads.map((read) =>
            read === "depth" ? view.depth : view.ids,
          ),
          ...handles(pass.bindings.filter((b) => !b.write)),
        ],
        writes: handles(pass.writes),
      },
      (enc, get) => {
        if (!node.enabled) {
          return;
        }
        chain.writeParams(
          device,
          width,
          height,
          view.preExposure(),
          (view.pixelAngle() * view.height) / height,
        );
        if (uniforms) {
          values.upload(device, uniforms);
        }
        const source = get(slot.source(index));
        // Pooled textures are stable from tick to tick, so a group is rebuilt
        // only when the pool hands this view a different one.
        if (groupSource !== source) {
          groupSource = source;
          group = device.createBindGroup({
            label: pass.label,
            layout: pipeline.imageLayout,
            entries: [
              { binding: 0, resource: source },
              { binding: 1, resource: linearSampler(device) },
              {
                binding: 2,
                resource: {
                  buffer: chain.paramBuffer(device, width, height),
                },
              },
              ...pass.reads.map((read) =>
                read === "depth"
                  ? { binding: 3, resource: get(view.depth) }
                  : { binding: 4, resource: get(view.ids) },
              ),
            ],
          });
        }
        let moved = !stageGroup && !!pipeline.stageLayout;
        for (let b = 0; b < stageViews.length; b++) {
          const current = viewOf(pass.bindings[b]!, get);
          if (stageViews[b] !== current) {
            stageViews[b] = current;
            moved = true;
          }
        }
        if (moved) {
          stageGroup = device.createBindGroup({
            label: `${pass.label}.stage`,
            layout: pipeline.stageLayout!,
            entries: [
              ...(uniforms
                ? [{ binding: 0, resource: { buffer: uniforms } }]
                : []),
              ...(pass.bindings.some((b) => !b.write)
                ? [{ binding: 1, resource: linearSampler(device) }]
                : []),
              ...pass.bindings.map((b, k) => ({
                binding: b.binding,
                resource: stageViews[k]!,
              })),
              ...pass.storage.map((b) => ({
                binding: b.binding,
                resource: { buffer: chain.shared(b.name) },
              })),
            ],
          });
        }
        const timed = engine.raster?.timer.passWrites(pass.label);
        if (pipeline.compute) {
          const [x, y] = pass.compute!;
          computeDescriptor.timestampWrites = timed;
          const compute = enc.beginComputePass(computeDescriptor);
          compute.setPipeline(pipeline.compute);
          compute.setBindGroup(0, group!);
          compute.setBindGroup(1, stageGroup!);
          compute.dispatchWorkgroups(
            Math.ceil(width / x),
            Math.ceil(height / y),
          );
          compute.end();
          return;
        }
        color.view = viewOf(pass.writes[0]!, get);
        descriptor.timestampWrites = timed;
        const render = enc.beginRenderPass(descriptor);
        render.setPipeline(pipeline.render!);
        render.setBindGroup(0, group!);
        if (stageGroup) {
          render.setBindGroup(1, stageGroup);
        }
        render.draw(3);
        render.end();
      },
    );
  });
}

/** What a stage's texture is in a view: the view's size times its scale. */
function stageTexture(
  device: GPUDevice,
  graph: FrameGraph,
  chain: ViewChain,
  stage: PostStage,
  texture: PostStageTexture,
  output: TextureHandle,
  view: ChainView,
): StageTexture {
  const label = `post.${stage.name}.${texture.name}`;
  if (texture.image) {
    return {
      image: chain.image(device, label, texture.image),
      width: texture.image.width,
      height: texture.image.height,
    };
  }
  if (texture.name === "output") {
    return { handle: output, width: view.width, height: view.height };
  }
  // Its levels must fit, however small the view is squeezed.
  const least = 1 << (texture.mips - 1);
  const width = Math.max(Math.floor(view.width * texture.scale), least);
  const height = Math.max(Math.floor(view.height * texture.scale), 1);
  return {
    handle: graph.createTexture(label, {
      label,
      width,
      height,
      format: texture.format,
      ...(texture.mips > 1 ? { mipLevelCount: texture.mips } : {}),
      usage: targetUsage(texture.storage),
    }),
    width,
    height,
  };
}

const levelSize = ({ width, height }: StageTexture, mip: number) => ({
  width: Math.max(width >> mip, 1),
  height: Math.max(height >> mip, 1),
});
