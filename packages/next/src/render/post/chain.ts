// A view's chain of post stages in its graph: their passes, their targets, and
// which of them feeds what in a tick. A disabled stage keeps its pass, which does
// nothing, and acquires no texture: the next stage reads the latest one that ran.
// Changing the list rebuilds the view's graph (`viewFrameFor`), as a resize does.
import type { FrameGraph, TextureHandle } from "../FrameGraph.ts";
import { compileFailure } from "../../shaders/link/index.ts";
import {
  PostStage,
  PostStageError,
  type StageKind,
  type StageSlot,
} from "../../scene/postStage.ts";
import type { ObserverSettings } from "../../scene/observer.ts";

/** A slot's targets are fp16 for light, 8 bits once encoded. */
const SLOT_FORMAT: Readonly<Record<StageSlot, GPUTextureFormat>> = {
  scene: "rgba16float",
  exposed: "rgba16float",
  display: "rgba8unorm",
};

/**
 * What a built-in stage of several passes is given (`GraphStage.register`). Not
 * public until a second user asks for it.
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
}

/** A built-in stage of several passes, registered in the same place. */
export interface GraphStage {
  readonly name: string;
  readonly slot: StageSlot;
  readonly kind: StageKind;
  readonly label: string;
  enabled: boolean;
  register(graph: FrameGraph, io: ChainIo): void;
}

export type ChainEntry = PostStage | GraphStage;

/** The slots' order: stable by list position. */
export function chainOrder<T extends { readonly slot: StageSlot }>(
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
  let gain = 1;
  for (const stage of settings.stages) {
    if (stage.slot === "exposed" && stage.enabled) {
      gain *= stage.shadowGain;
    }
  }
  return gain;
}

/** A stage's pipeline for its slot's format; undefined until the GPU has it. */
interface StagePipeline {
  pipeline?: GPURenderPipeline;
  /** Who to tell if the compiler refuses it, and what it said. */
  readonly stages: Set<PostStage>;
  error?: PostStageError;
  /** Group 0's layout, for its reads; group 1's, for its uniforms. */
  imageLayout: GPUBindGroupLayout;
  uniformLayout: GPUBindGroupLayout | undefined;
}

/** Stage pipelines by what makes them differ, per device. */
const pipelineCaches = new WeakMap<GPUDevice, Map<string, StagePipeline>>();

/**
 * A stage's pipeline, made once per shader, reads and slot: compiled in the
 * background, and `ready` called when it can draw. A shader the compiler refuses
 * leaves `stage.error` set, says so once, and stays undrawn.
 */
function stagePipeline(
  device: GPUDevice,
  stage: PostStage,
  ready: () => void,
): StagePipeline {
  let cache = pipelineCaches.get(device);
  if (!cache) {
    cache = new Map();
    pipelineCaches.set(device, cache);
  }
  const format = SLOT_FORMAT[stage.slot];
  const { module: linked } = stage;
  const hasUniforms = stage.uniformLayout.bytes > 0;
  const key = `${format}|${stage.reads.join()}|${linked.code}`;
  const known = cache.get(key);
  if (known) {
    known.stages.add(stage);
    stage.error ??= known.error;
    return known;
  }
  const FRAGMENT = GPUShaderStage.FRAGMENT;
  const imageLayout = device.createBindGroupLayout({
    label: `${linked.label}.image`,
    entries: [
      { binding: 0, visibility: FRAGMENT, texture: {} },
      { binding: 1, visibility: FRAGMENT, sampler: { type: "filtering" } },
      { binding: 2, visibility: FRAGMENT, buffer: { type: "uniform" } },
      ...(stage.reads.includes("depth")
        ? [
            {
              binding: 3,
              visibility: FRAGMENT,
              texture: { sampleType: "depth", multisampled: true } as const,
            },
          ]
        : []),
      ...(stage.reads.includes("ids")
        ? [
            {
              binding: 4,
              visibility: FRAGMENT,
              texture: { sampleType: "uint", multisampled: true } as const,
            },
          ]
        : []),
    ],
  });
  const uniformLayout = hasUniforms
    ? device.createBindGroupLayout({
        label: `${linked.label}.uniforms`,
        entries: [
          { binding: 0, visibility: FRAGMENT, buffer: { type: "uniform" } },
        ],
      })
    : undefined;
  const entry: StagePipeline = {
    stages: new Set([stage]),
    imageLayout,
    uniformLayout,
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
    entry.stages.clear();
    entry.pipeline = await device.createRenderPipelineAsync({
      label: linked.label,
      layout: device.createPipelineLayout({
        bindGroupLayouts: [
          imageLayout,
          ...(uniformLayout ? [uniformLayout] : []),
        ],
      }),
      vertex: { module, entryPoint: "postStageVertex" },
      fragment: {
        module,
        entryPoint: "postStageFragment",
        targets: [{ format }],
      },
      primitive: { topology: "triangle-list" },
    });
    ready();
  };
  make().catch((reason: unknown) => {
    const error =
      reason instanceof PostStageError
        ? reason
        : new PostStageError(stage.name, "shader", String(reason));
    entry.error = error;
    for (const refused of entry.stages) {
      refused.error = error;
    }
    entry.stages.clear();
    console.error(error.message);
  });
  return entry;
}

/** What a stage's or a chain's pass needs of the engine. */
export interface ChainEngine {
  readonly ctx: {
    readonly device: GPUDevice;
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
  readonly slots: Readonly<Record<StageSlot, ChainSlot | undefined>>;
  /** Filled by `registerStage`, freed with the view's graph. */
  private readonly buffers: GPUBuffer[] = [];
  /** `PostInput`'s values as last written. */
  private readonly params = new Float32Array(4).fill(Number.NaN);
  private paramsBuffer: GPUBuffer | undefined;
  /** The split pipelines, once asked for and ready. */
  pipelines: ChainPipelines | undefined;
  /** The group `fsResponse` reads, with what it was made for. */
  responseGroup: GPUBindGroup | undefined;
  responseInputs: readonly GPUTextureView[] = [];

  constructor(slots: Partial<Record<StageSlot, ChainSlot>> = {}) {
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

  /** The buffer of `PostInput`'s values, shared by the view's stages. */
  paramBuffer(device: GPUDevice): GPUBuffer {
    return (this.paramsBuffer ??= this.buffer(device, "postParams", 16));
  }

  /** Writes `PostInput`'s values if they moved. */
  writeParams(
    device: GPUDevice,
    width: number,
    height: number,
    preExposure: number,
    pixelAngle: number,
  ): void {
    const p = this.params;
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
      device.queue.writeBuffer(this.paramBuffer(device), 0, p);
    }
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
    });
    SAMPLERS.set(device, sampler);
  }
  return sampler;
}

/** A slot's targets are the view's size. */
function stageTarget(
  graph: FrameGraph,
  name: string,
  slot: StageSlot,
  view: ChainView,
): TextureHandle {
  return graph.createTexture(`post.${name}`, {
    label: `post.${name}`,
    width: view.width,
    height: view.height,
    format: SLOT_FORMAT[slot],
    usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
  });
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
    const output = stageTarget(graph, entry.name, entry.slot, view);
    if (entry instanceof PostStage) {
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
      });
    }
  });
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
  const made = stagePipeline(device, stage, () => engine.requestRender());
  const sources = slot.handles;
  slot.nodes.push({
    get enabled() {
      return stage.enabled && !!made.pipeline;
    },
    output,
  });
  const reads = stage.reads.map((read) =>
    read === "depth" ? view.depth : view.ids,
  );
  const color: GPURenderPassColorAttachment = {
    view: undefined as never,
    clearValue: { r: 0, g: 0, b: 0, a: 1 },
    loadOp: "clear",
    storeOp: "store",
  };
  const descriptor: GPURenderPassDescriptor = {
    label: `post.${stage.name}`,
    colorAttachments: [color],
  };
  let group: GPUBindGroup | undefined;
  let groupSource: GPUTextureView | undefined;
  const uniformBuffer =
    stage.uniformLayout.bytes > 0
      ? chain.buffer(device, `post.${stage.name}`, stage.uniformLayout.bytes)
      : undefined;
  const uniformGroup =
    uniformBuffer &&
    device.createBindGroup({
      label: `post.${stage.name}.uniforms`,
      layout: made.uniformLayout!,
      entries: [{ binding: 0, resource: { buffer: uniformBuffer } }],
    });
  let uniformVersion = -1;
  graph.addPass(
    `post.${stage.name}`,
    { reads: [...sources, ...reads], writes: [output] },
    (enc, get) => {
      if (!stage.enabled || !made.pipeline) {
        return;
      }
      chain.writeParams(
        device,
        view.width,
        view.height,
        view.preExposure(),
        view.pixelAngle(),
      );
      if (uniformBuffer && uniformVersion !== stage.uniformVersion) {
        uniformVersion = stage.uniformVersion;
        device.queue.writeBuffer(uniformBuffer, 0, stage.uniformData.buffer);
      }
      const source = get(slot.source(index));
      // Pooled textures are stable from tick to tick, so the group is rebuilt
      // only when the pool hands this view a different one.
      if (groupSource !== source) {
        groupSource = source;
        group = device.createBindGroup({
          label: `post.${stage.name}`,
          layout: made.imageLayout,
          entries: [
            { binding: 0, resource: source },
            { binding: 1, resource: linearSampler(device) },
            { binding: 2, resource: { buffer: chain.paramBuffer(device) } },
            ...stage.reads.map((read) =>
              read === "depth"
                ? { binding: 3, resource: get(view.depth) }
                : { binding: 4, resource: get(view.ids) },
            ),
          ],
        });
      }
      color.view = get(output);
      const pass = enc.beginRenderPass(descriptor);
      pass.setPipeline(made.pipeline);
      pass.setBindGroup(0, group!);
      if (uniformGroup) {
        pass.setBindGroup(1, uniformGroup);
      }
      pass.draw(3);
      pass.end();
    },
  );
}
