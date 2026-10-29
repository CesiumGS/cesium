import { GpuDevice, type GpuDeviceOptions } from "../gpu/GpuDevice.ts";
import { GpuTimer } from "../gpu/GpuTimer.ts";
import {
  FrameGraph,
  TexturePool,
  type TextureHandle,
} from "../render/FrameGraph.ts";
import {
  VIEW_SIZE,
  VIEW_STRIDE,
  writeViewBlock,
  type ViewBlock,
} from "../render/layout.ts";
import * as m4 from "../math/mat4.ts";
import * as v3 from "../math/vec3.ts";
import { Ellipsoid } from "../math/ellipsoid.ts";
import { eastNorthUpToFixedFrame } from "../math/transforms.ts";
import type { Vec3 } from "../math/vec3.ts";
import {
  createRenderContext,
  type RenderContext,
  type ShaderOverrides,
} from "./RenderContext.ts";
import { createBox } from "./meshes.ts";
import {
  OffscreenTarget,
  View,
  type PickResult,
  type PixelRect,
  type RenderTarget,
  type ViewOptions,
} from "./View.ts";
import { ViewLink, type ViewLinkOptions } from "./ViewLink.ts";
import { World, type WorldOptions } from "./World.ts";
import { WorkerPool } from "../io/WorkerPool.ts";
import type { GltfAsset } from "../io/gltfTypes.ts";
import { addGltf, type ModelInstance, type ModelOptions } from "./gltfModel.ts";

export interface EngineOptions extends GpuDeviceOptions {
  maxViews?: number;
  /** Replace built-in shaders with complete WGSL modules (e.g. from Slang). */
  shaders?: ShaderOverrides;
}

export interface FrameStats {
  /** Smoothed main-thread time spent in `renderFrame`, ms. */
  cpuMs: number;
  /** Smoothed GPU time inside our passes, ms (NaN without `timestamp-query`). */
  gpuMs: number;
  /** Smoothed GPU span from first pass start to last pass end, ms. */
  gpuSpanMs: number;
  views: number;
  draws: number;
  /** Indirect draw calls per view (one per batch). */
  batches: number;
}

/**
 * Owns the GPU device and everything shared between views: pipelines,
 * transient-texture pool and worlds. One `renderFrame` renders every enabled
 * view into one command encoder:
 *
 *   for each view:
 *     copy view block → current-view buffer   (ordered within the encoder)
 *     prep kernel: camera-relative transforms, culling, indirect args
 *     opaque pass: replay the world's render bundle
 *     [pick]: read the feature ID under requested pixels
 *     present: tonemap into the view's rectangle of its target, overlays
 *
 * Each view's frame graph, pass descriptors and bind groups are built once
 * and rebuilt only when the view's size changes, so a steady-state frame
 * allocates only the WebGPU objects the API itself returns (encoder, passes,
 * command buffer, canvas texture view).
 */
export class Engine {
  readonly gpu: GpuDevice;
  readonly worlds: World[] = [];
  readonly views: View[] = [];
  readonly links: ViewLink[] = [];
  readonly stats: FrameStats = {
    cpuMs: 0,
    gpuMs: Number.NaN,
    gpuSpanMs: Number.NaN,
    views: 0,
    draws: 0,
    batches: 0,
  };
  /** Unit vector toward the sun in Earth-fixed axes. Placeholder until the 1.x sun model lands. */
  readonly sunDirection: Vec3 = v3.vec3(1, 0, 0);

  private readonly ctx: RenderContext;
  private readonly workers = new WorkerPool();
  private readonly pool: TexturePool;
  private readonly timer: GpuTimer;
  private readonly viewStaging: GPUBuffer;
  private readonly viewData: Float32Array;
  private readonly maxViews: number;
  private readonly viewFrames = new Map<View, ViewFrame>();
  private readonly targetFrames = new WeakMap<RenderTarget, TargetFrame>();
  private readonly worldFrames = new WeakMap<World, WorldFrame>();
  private readonly overlayResources = new Map<View, OverlayResources>();
  private readonly pickReadback: GPUBuffer[] = [];
  private readonly pickParams: GPUBuffer;
  private readonly pickResult: GPUBuffer;
  private readonly pickParamsData = new Uint32Array(4);
  private readonly picks: PendingPick[] = [];
  private readonly presentData = new DataView(new ArrayBuffer(16));
  private readonly overlayColor = new Float32Array(4);
  private readonly viewBlock: ViewBlock;
  private readonly commandBuffers: GPUCommandBuffer[] = [];
  private frameNumber = 0;
  private frameHandle = 0;

  private constructor(gpu: GpuDevice, ctx: RenderContext, maxViews: number) {
    this.gpu = gpu;
    this.ctx = ctx;
    this.maxViews = maxViews;
    const device = ctx.device;
    this.pool = new TexturePool(device);
    this.timer = new GpuTimer(device);
    this.viewData = new Float32Array((maxViews * VIEW_STRIDE) / 4);
    this.viewStaging = device.createBuffer({
      label: "viewStaging",
      size: maxViews * VIEW_STRIDE,
      usage: GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
    });
    this.viewBlock = {
      viewProj: scratchViewProj,
      viewRotation: scratchView,
      cameraPosition: this.sunDirection,
      near: 0,
      aspect: 1,
      planes: scratchPlanes,
      sunDirection: this.sunDirection,
      width: 1,
      height: 1,
      iblFrame: scratchFrame,
      lighting: { sunIntensity: 0, diffuseIbl: 0, specularIbl: 0 },
      specularMaxLod: 0,
    };
    this.pickParams = device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.pickResult = device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });
  }

  static async create(options: EngineOptions = {}): Promise<Engine> {
    const gpu = await GpuDevice.create(options);
    const ctx = await createRenderContext(
      gpu.device,
      gpu.caps,
      gpu.preferredCanvasFormat,
      options.shaders,
    );
    // M0: device-loss recovery stops at the device. Rebuilding worlds from
    // their CPU-side sources arrives with the streaming cache (M2).
    const engine = new Engine(gpu, ctx, options.maxViews ?? 16);
    engine.warmUp();
    return engine;
  }

  /**
   * Renders one 1×1 frame with a single draw. Dawn builds some internals
   * lazily (e.g. its indirect-draw validation pipeline), which otherwise cost
   * the first real frame ~70 ms; submitted here, that work overlaps the
   * app's own loading. Not awaited.
   */
  private warmUp(): void {
    const world = this.createWorld({
      maxDraws: 1,
      maxMaterials: 1,
      vertexBytes: 4096,
      indexBytes: 4096,
    });
    world.addDraw({
      mesh: world.addMesh(createBox()),
      origin: v3.vec3(),
      model: m4.mat4(),
    });
    const target = new OffscreenTarget(1, 1);
    const view = this.addView({ target, world });
    this.renderFrame();
    this.removeView(view);
    this.worlds.splice(this.worlds.indexOf(world), 1);
    world.destroy();
    target.destroy();
    this.stats.cpuMs = 0;
  }

  /** Image-based lighting environment shared by all worlds and views. */
  get environment() {
    return this.ctx.environment;
  }

  get capabilities() {
    return this.gpu.caps;
  }

  /** Fetches and decodes a glTF/GLB in a worker. Upload it with `addModel`. */
  loadGltf(url: string | URL): Promise<GltfAsset> {
    return this.workers.request<GltfAsset>("gltf", {
      url: new URL(url, globalThis.location?.href).href,
      // KTX2/Basis textures are transcoded to a block format this device supports.
      textureSupport: this.gpu.caps.textureCompression,
    });
  }

  /** Places a parsed glTF asset in a world. */
  addModel(
    world: World,
    asset: GltfAsset,
    options: ModelOptions,
  ): ModelInstance {
    return addGltf(this.ctx, world, asset, options);
  }

  createWorld(options?: WorldOptions): World {
    const world = new World(this.ctx, options);
    this.worlds.push(world);
    return world;
  }

  addView(options: ViewOptions): View {
    if (this.views.length >= this.maxViews) {
      throw new Error(`At most ${this.maxViews} views are supported.`);
    }
    const view = new View(options);
    this.views.push(view);
    return view;
  }

  removeView(view: View): void {
    const index = this.views.indexOf(view);
    if (index >= 0) {
      this.views.splice(index, 1);
    }
    for (const link of this.links.filter(
      (l) => l.source === view || l.target === view,
    )) {
      this.unlink(link);
    }
    this.viewFrames.get(view)?.presentParams.destroy();
    this.viewFrames.delete(view);
    this.overlayResources.get(view)?.buffer.destroy();
    this.overlayResources.get(view)?.params.destroy();
    this.overlayResources.delete(view);
  }

  link(source: View, target: View, options: ViewLinkOptions): ViewLink {
    const link = new ViewLink(source, target, options);
    this.links.push(link);
    return link;
  }

  unlink(link: ViewLink): void {
    const index = this.links.indexOf(link);
    if (index >= 0) {
      this.links.splice(index, 1);
      link.dispose();
    }
  }

  /** Renders continuously with requestAnimationFrame until `stop()`. */
  start(): void {
    const tick = () => {
      this.renderFrame();
      this.frameHandle = requestAnimationFrame(tick);
    };
    this.frameHandle = requestAnimationFrame(tick);
  }

  stop(): void {
    cancelAnimationFrame(this.frameHandle);
  }

  renderFrame(): void {
    const start = performance.now();
    const device = this.ctx.device;
    const stamp = ++this.frameNumber;

    const links = this.links;
    for (let i = 0; i < links.length; i++) {
      links[i]!.evaluate();
    }

    // Assign each enabled view a slot, acquire each target once (the first
    // view drawn into a target clears it) and prepare each world once.
    const views = this.views;
    let slots = 0;
    for (let i = 0; i < views.length; i++) {
      const view = views[i]!;
      if (!view.enabled) {
        continue;
      }
      const rect = view.pixelRect();
      const frame = this.viewFrame(view, rect);
      frame.slot = slots;
      this.writeView(view, slots, rect);
      slots++;

      const target = this.targetFrame(view.target);
      frame.clearTarget = target.stamp !== stamp;
      if (frame.clearTarget) {
        target.stamp = stamp;
        target.view = view.target.acquire(device, this.ctx.outputFormat);
      }
      frame.graph.setImported(frame.output, target.view!);

      const world = this.worldFrame(view.world);
      if (world.stamp !== stamp) {
        world.stamp = stamp;
        world.bundle = view.world.prepareFrame();
      }
      frame.bundle = world.bundle;
    }
    device.queue.writeBuffer(
      this.viewStaging,
      0,
      this.viewData,
      0,
      (slots * VIEW_STRIDE) / 4,
    );

    const encoder = device.createCommandEncoder(FRAME_ENCODER);
    this.timer.beginFrame();
    for (let i = 0; i < views.length; i++) {
      const view = views[i]!;
      if (view.enabled) {
        const frame = this.viewFrames.get(view)!;
        // One pick per frame keeps the shared params/result buffers simple.
        frame.pick =
          this.picks.length === 0 ? view.pendingPicks.shift() : undefined;
        frame.graph.execute(encoder);
      }
    }
    this.timer.endFrame(encoder);
    this.commandBuffers[0] = encoder.finish();
    device.queue.submit(this.commandBuffers);
    this.timer.afterSubmit();
    this.pool.endFrame();
    if (this.picks.length > 0) {
      this.resolvePicks(this.picks);
      this.picks.length = 0;
    }

    const elapsed = performance.now() - start;
    this.stats.cpuMs =
      this.stats.cpuMs === 0 ? elapsed : this.stats.cpuMs * 0.9 + elapsed * 0.1;
    this.stats.gpuMs = this.timer.milliseconds;
    this.stats.gpuSpanMs = this.timer.spanMilliseconds;
    this.stats.views = slots;
    let draws = 0;
    let batches = 0;
    for (let i = 0; i < this.worlds.length; i++) {
      draws += this.worlds[i]!.recordCount;
      batches += this.worlds[i]!.batchCount;
    }
    this.stats.draws = draws;
    this.stats.batches = batches;
  }

  private writeView(
    view: View,
    index: number,
    rect: Readonly<PixelRect>,
  ): void {
    const aspect = rect.width / rect.height;
    const camera = view.camera;
    camera.viewRotation(scratchView);
    camera.projection(scratchProj, aspect);
    m4.multiply(scratchViewProj, scratchProj, scratchView);
    camera.frustumPlanes(scratchPlanes, aspect);
    const block = this.viewBlock;
    block.cameraPosition = camera.position;
    block.near = camera.near;
    block.aspect = aspect;
    block.width = rect.width;
    block.height = rect.height;
    block.iblFrame = environmentFrame(camera.position);
    block.lighting = view.lighting;
    block.specularMaxLod = this.ctx.environment.maxLod;
    writeViewBlock(this.viewData, (index * VIEW_STRIDE) / 4, block);
  }

  private targetFrame(target: RenderTarget): TargetFrame {
    let frame = this.targetFrames.get(target);
    if (!frame) {
      frame = { stamp: 0, view: undefined };
      this.targetFrames.set(target, frame);
    }
    return frame;
  }

  private worldFrame(world: World): WorldFrame {
    let frame = this.worldFrames.get(world);
    if (!frame) {
      frame = { stamp: 0, bundle: undefined };
      this.worldFrames.set(world, frame);
    }
    return frame;
  }

  /** The view's frame graph for its current size, built on first use and on resize. */
  private viewFrame(view: View, rect: Readonly<PixelRect>): ViewFrame {
    let frame = this.viewFrames.get(view);
    if (
      !frame ||
      frame.width !== rect.width ||
      frame.height !== rect.height ||
      frame.x !== rect.x ||
      frame.y !== rect.y
    ) {
      frame?.presentParams.destroy();
      frame = this.buildViewFrame(view, rect);
      this.viewFrames.set(view, frame);
    }
    return frame;
  }

  private buildViewFrame(view: View, rect: Readonly<PixelRect>): ViewFrame {
    const { device, pipelines, targets } = this.ctx;
    const { x, y, width, height } = rect;
    const graph = new FrameGraph(this.pool);
    const attachment = GPUTextureUsage.RENDER_ATTACHMENT;
    const color = graph.createTexture("color.msaa", {
      width,
      height,
      format: "rgba16float",
      sampleCount: targets.sampleCount,
      usage: attachment,
    });
    const resolved = graph.createTexture("color", {
      width,
      height,
      format: "rgba16float",
      usage: attachment | GPUTextureUsage.TEXTURE_BINDING,
    });
    const ids = graph.createTexture("featureId.msaa", {
      width,
      height,
      format: "rg16uint",
      sampleCount: targets.sampleCount,
      usage: attachment | GPUTextureUsage.TEXTURE_BINDING,
    });
    const depth = graph.createTexture("depth.msaa", {
      width,
      height,
      format: targets.depthFormat,
      sampleCount: targets.sampleCount,
      usage: attachment,
    });
    // Rebound to this frame's target texture before every execute.
    const output = graph.importTexture("output", {} as GPUTextureView);

    const clearColor: GPUColorDict = { r: 0, g: 0, b: 0, a: 1 };
    const opaqueColor: GPURenderPassColorAttachment = {
      view: undefined as never,
      resolveTarget: undefined,
      clearValue: clearColor,
      loadOp: "clear",
      storeOp: "discard",
    };
    const opaqueIds: GPURenderPassColorAttachment = {
      view: undefined as never,
      clearValue: { r: 0, g: 0, b: 0, a: 0 },
      loadOp: "clear",
      storeOp: "store",
    };
    const opaqueDepth: GPURenderPassDepthStencilAttachment = {
      view: undefined as never,
      depthClearValue: 0, // reverse-Z: far is 0
      depthLoadOp: "clear",
      depthStoreOp: "discard",
    };
    const opaquePass: GPURenderPassDescriptor = {
      label: "opaque",
      colorAttachments: [opaqueColor, opaqueIds],
      depthStencilAttachment: opaqueDepth,
    };
    const presentColor: GPURenderPassColorAttachment = {
      view: undefined as never,
      clearValue: { r: 0, g: 0, b: 0, a: 1 },
      loadOp: "clear",
      storeOp: "store",
    };
    const presentPass: GPURenderPassDescriptor = {
      label: "present",
      colorAttachments: [presentColor],
    };

    const frame: ViewFrame = {
      x,
      y,
      width,
      height,
      graph,
      output,
      slot: 0,
      clearTarget: true,
      bundle: undefined,
      bundles: [],
      pick: undefined,
      presentParams: device.createBuffer({
        label: "presentParams",
        size: 16,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      }),
      presentGroup: undefined,
      presentSource: undefined,
    };

    graph.addPass("select-view", { sideEffect: true }, (enc) => {
      enc.copyBufferToBuffer(
        this.viewStaging,
        frame.slot * VIEW_STRIDE,
        this.ctx.currentViewBuffer,
        0,
        VIEW_SIZE,
      );
    });

    graph.addPass("prep", { sideEffect: true }, (enc) => {
      view.world.encodePrep(enc, this.timer.passWrites());
    });

    graph.addPass(
      "opaque",
      { writes: [color, resolved, ids, depth] },
      (enc, get) => {
        clearColor.r = view.clearColor[0];
        clearColor.g = view.clearColor[1];
        clearColor.b = view.clearColor[2];
        opaqueColor.view = get(color);
        opaqueColor.resolveTarget = get(resolved);
        opaqueIds.view = get(ids);
        opaqueDepth.view = get(depth);
        opaquePass.timestampWrites = this.timer.passWrites();
        const pass = enc.beginRenderPass(opaquePass);
        frame.bundles[0] = frame.bundle!;
        pass.executeBundles(frame.bundles);
        pass.end();
      },
    );

    graph.addPass("pick", { reads: [ids], sideEffect: true }, (enc, get) => {
      const request = frame.pick;
      if (!request) {
        return;
      }
      frame.pick = undefined;
      this.pickParamsData[0] = Math.min(
        Math.max(Math.floor(request.x), 0),
        width - 1,
      );
      this.pickParamsData[1] = Math.min(
        Math.max(Math.floor(request.y), 0),
        height - 1,
      );
      device.queue.writeBuffer(this.pickParams, 0, this.pickParamsData);
      const group = device.createBindGroup({
        layout: pipelines.pick.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: get(ids) },
          { binding: 1, resource: { buffer: this.pickParams } },
          { binding: 2, resource: { buffer: this.pickResult } },
        ],
      });
      const pass = enc.beginComputePass(PICK_PASS);
      pass.setPipeline(pipelines.pick);
      pass.setBindGroup(0, group);
      pass.dispatchWorkgroups(1);
      pass.end();
      const readback =
        this.pickReadback.pop() ??
        device.createBuffer({
          size: 16,
          usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
        });
      enc.copyBufferToBuffer(this.pickResult, 0, readback, 0, 16);
      this.picks.push({ view, readback, resolve: request.resolve });
    });

    graph.addPass(
      "present",
      { reads: [resolved], writes: [output] },
      (enc, get) => {
        const params = this.presentData;
        params.setFloat32(0, x, true);
        params.setFloat32(4, y, true);
        params.setFloat32(8, view.exposure, true);
        const encoding = this.ctx.outputFormat.endsWith("-srgb")
          ? 0
          : view.outputEncoding === "gamma2.2"
            ? 2
            : 1;
        params.setUint32(12, encoding, true);
        device.queue.writeBuffer(frame.presentParams, 0, params.buffer);
        // Pooled textures are stable from frame to frame, so the bind group
        // is rebuilt only when the pool hands this view a different one.
        const source = get(resolved);
        if (frame.presentSource !== source) {
          frame.presentSource = source;
          frame.presentGroup = device.createBindGroup({
            layout: pipelines.present.getBindGroupLayout(0),
            entries: [
              { binding: 0, resource: source },
              { binding: 1, resource: { buffer: frame.presentParams } },
            ],
          });
        }
        presentColor.view = get(output);
        presentColor.loadOp = frame.clearTarget ? "clear" : "load";
        const pass = enc.beginRenderPass(presentPass);
        pass.setViewport(x, y, width, height, 0, 1);
        pass.setScissorRect(x, y, width, height);
        pass.setPipeline(pipelines.present);
        pass.setBindGroup(0, frame.presentGroup!);
        pass.draw(3);
        this.drawOverlays(pass, view);
        pass.end();
      },
    );

    return frame;
  }

  private drawOverlays(pass: GPURenderPassEncoder, view: View): void {
    const overlays = view.overlays;
    let vertices = 0;
    for (let i = 0; i < overlays.length; i++) {
      vertices += overlays[i]!.count;
    }
    if (vertices === 0) {
      return;
    }
    const device = this.ctx.device;
    let resources = this.overlayResources.get(view);
    if (!resources || resources.capacity < vertices) {
      resources?.buffer.destroy();
      const capacity = Math.max(vertices, 256);
      const buffer = device.createBuffer({
        size: capacity * 12,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      });
      const params =
        resources?.params ??
        device.createBuffer({
          size: 16,
          usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
      const group =
        resources?.group ??
        device.createBindGroup({
          layout: this.ctx.pipelines.overlayLayout,
          entries: [{ binding: 0, resource: { buffer: params } }],
        });
      resources = {
        buffer,
        capacity,
        params,
        group,
        staging: new Float32Array(capacity * 3),
      };
      this.overlayResources.set(view, resources);
    }
    // Camera-relative in float64, then float32: overlays share the
    // precision scheme of the draw records.
    const data = resources.staging;
    const eye = view.camera.position;
    const ex = eye[0]!,
      ey = eye[1]!,
      ez = eye[2]!;
    let k = 0;
    for (let i = 0; i < overlays.length; i++) {
      const { positions, count } = overlays[i]!;
      for (let j = 0; j < count * 3; j += 3) {
        data[k++] = positions[j]! - ex;
        data[k++] = positions[j + 1]! - ey;
        data[k++] = positions[j + 2]! - ez;
      }
    }
    device.queue.writeBuffer(resources.buffer, 0, data, 0, vertices * 3);
    this.overlayColor.set(overlays[0]!.color);
    device.queue.writeBuffer(resources.params, 0, this.overlayColor);
    pass.setPipeline(this.ctx.pipelines.overlay);
    pass.setBindGroup(0, this.ctx.currentViewBindGroup);
    pass.setBindGroup(1, resources.group);
    pass.setVertexBuffer(0, resources.buffer);
    pass.draw(vertices);
  }

  private resolvePicks(picks: PendingPick[]): void {
    for (const { view, readback, resolve } of picks) {
      void readback.mapAsync(GPUMapMode.READ).then(() => {
        const featureId = new Uint32Array(readback.getMappedRange())[0]!;
        readback.unmap();
        this.pickReadback.push(readback);
        resolve(
          featureId === 0
            ? undefined
            : { featureId, name: view.world.nameForFeature(featureId) },
        );
      });
    }
  }

  destroy(): void {
    this.stop();
    for (const world of this.worlds) {
      world.destroy();
    }
    this.pool.destroy();
    this.timer.destroy();
    this.workers.destroy();
    this.gpu.destroy();
  }
}

interface PendingPick {
  view: View;
  readback: GPUBuffer;
  resolve: (result: PickResult | undefined) => void;
}

/** Per-view frame state: the frame graph plus inputs its passes read each frame. */
interface ViewFrame {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly graph: FrameGraph;
  readonly output: TextureHandle;
  /** Index of this view's block in the view staging buffer this frame. */
  slot: number;
  /** First view drawn into its target this frame. */
  clearTarget: boolean;
  bundle: GPURenderBundle | undefined;
  /** One-element list handed to executeBundles. */
  readonly bundles: GPURenderBundle[];
  pick: View["pendingPicks"][number] | undefined;
  readonly presentParams: GPUBuffer;
  presentGroup: GPUBindGroup | undefined;
  presentSource: GPUTextureView | undefined;
}

interface TargetFrame {
  stamp: number;
  view: GPUTextureView | undefined;
}

interface WorldFrame {
  stamp: number;
  bundle: GPURenderBundle | undefined;
}

interface OverlayResources {
  buffer: GPUBuffer;
  capacity: number;
  params: GPUBuffer;
  group: GPUBindGroup;
  /** Camera-relative float32 positions, `capacity` × 3. */
  staging: Float32Array;
}

const FRAME_ENCODER: GPUCommandEncoderDescriptor = { label: "frame" };
const PICK_PASS: GPUComputePassDescriptor = { label: "pick" };

const scratchEnu = m4.mat4();
const scratchEast = v3.vec3();
const scratchUp = v3.vec3();
const scratchSouth = v3.vec3();
const scratchFrame: [Vec3, Vec3, Vec3] = [scratchEast, scratchUp, scratchSouth];

/**
 * Environment-map frame at `position`: x = east, y = up, z = −north, the y-up
 * convention CesiumJS 1.x also uses for image-based lighting.
 */
function environmentFrame(position: Vec3): [Vec3, Vec3, Vec3] {
  const enu = eastNorthUpToFixedFrame(position, Ellipsoid.WGS84, scratchEnu);
  v3.set(scratchEast, enu[0]!, enu[1]!, enu[2]!);
  v3.set(scratchUp, enu[8]!, enu[9]!, enu[10]!);
  v3.set(scratchSouth, -enu[4]!, -enu[5]!, -enu[6]!);
  return scratchFrame;
}

const scratchView = m4.mat4();
const scratchProj = m4.mat4();
const scratchViewProj = m4.mat4();
const scratchPlanes = new Float32Array(20);
