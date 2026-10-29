import { GpuDevice, type GpuDeviceOptions } from "../gpu/GpuDevice.ts";
import { GpuTimer } from "../gpu/GpuTimer.ts";
import { FrameGraph, TexturePool } from "../render/FrameGraph.ts";
import { VIEW_SIZE, VIEW_STRIDE, writeViewBlock } from "../render/layout.ts";
import * as m4 from "../math/mat4.ts";
import * as v3 from "../math/vec3.ts";
import type { Vec3 } from "../math/vec3.ts";
import {
  createRenderContext,
  type RenderContext,
  type ShaderOverrides,
} from "./RenderContext.ts";
import { View, type PickResult, type ViewOptions } from "./View.ts";
import { ViewLink, type ViewLinkOptions } from "./ViewLink.ts";
import { World, type WorldOptions } from "./World.ts";

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
  };
  /** Unit vector toward the sun in Earth-fixed axes. Placeholder until the 1.x sun model lands. */
  readonly sunDirection: Vec3 = v3.vec3(1, 0, 0);

  private readonly ctx: RenderContext;
  private readonly pool: TexturePool;
  private readonly timer: GpuTimer;
  private readonly viewStaging: GPUBuffer;
  private readonly viewData: Float32Array;
  private readonly maxViews: number;
  private readonly presentParams: GPUBuffer[] = [];
  private readonly overlayResources = new Map<
    View,
    {
      buffer: GPUBuffer;
      capacity: number;
      params: GPUBuffer;
      group: GPUBindGroup;
    }
  >();
  private readonly pickReadback: GPUBuffer[] = [];
  private readonly pickParams: GPUBuffer;
  private readonly pickResult: GPUBuffer;
  private readonly pickParamsData = new Uint32Array(4);
  private readonly presentData = new ArrayBuffer(16);
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
    for (let i = 0; i < maxViews; i++) {
      this.presentParams.push(
        device.createBuffer({
          size: 16,
          usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        }),
      );
    }
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
    return new Engine(gpu, ctx, options.maxViews ?? 16);
  }

  get capabilities() {
    return this.gpu.caps;
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
    const views = this.views.filter((v) => v.enabled);

    for (const link of this.links) {
      link.evaluate();
    }

    // Acquire each target once; the first view drawn into a target clears it.
    const targetViews = new Map<View["target"], GPUTextureView>();
    for (const view of views) {
      if (!targetViews.has(view.target)) {
        targetViews.set(
          view.target,
          view.target.acquire(device, this.ctx.outputFormat),
        );
      }
    }

    views.forEach((view, i) => this.writeView(view, i));
    device.queue.writeBuffer(
      this.viewStaging,
      0,
      this.viewData,
      0,
      (views.length * VIEW_STRIDE) / 4,
    );

    const bundles = new Map<View["world"], GPURenderBundle>();
    for (const view of views) {
      if (!bundles.has(view.world)) {
        bundles.set(view.world, view.world.prepareFrame());
      }
    }

    const encoder = device.createCommandEncoder({ label: "frame" });
    this.timer.beginFrame();
    const cleared = new Set<View["target"]>();
    const picks: PendingPick[] = [];
    views.forEach((view, i) => {
      const clear = !cleared.has(view.target);
      cleared.add(view.target);
      this.encodeView(
        encoder,
        view,
        i,
        targetViews.get(view.target)!,
        bundles.get(view.world)!,
        clear,
        picks,
      );
    });
    this.timer.endFrame(encoder);
    device.queue.submit([encoder.finish()]);
    this.timer.afterSubmit();
    this.pool.endFrame();
    this.resolvePicks(picks);

    const elapsed = performance.now() - start;
    this.stats.cpuMs =
      this.stats.cpuMs === 0 ? elapsed : this.stats.cpuMs * 0.9 + elapsed * 0.1;
    this.stats.gpuMs = this.timer.milliseconds;
    this.stats.gpuSpanMs = this.timer.spanMilliseconds;
    this.stats.views = views.length;
    this.stats.draws = this.worlds.reduce((n, w) => n + w.recordCount, 0);
  }

  private writeView(view: View, index: number): void {
    const rect = view.pixelRect();
    const aspect = rect.width / rect.height;
    const camera = view.camera;
    camera.viewRotation(scratchView);
    camera.projection(scratchProj, aspect);
    m4.multiply(scratchViewProj, scratchProj, scratchView);
    camera.frustumPlanes(scratchPlanes, aspect);
    writeViewBlock(this.viewData, (index * VIEW_STRIDE) / 4, {
      viewProj: scratchViewProj,
      viewRotation: scratchView,
      cameraPosition: camera.position,
      near: camera.near,
      aspect,
      planes: scratchPlanes,
      sunDirection: this.sunDirection,
      width: rect.width,
      height: rect.height,
    });
  }

  private encodeView(
    encoder: GPUCommandEncoder,
    view: View,
    index: number,
    targetView: GPUTextureView,
    bundle: GPURenderBundle,
    clearTarget: boolean,
    picks: PendingPick[],
  ): void {
    const { device, pipelines, targets } = this.ctx;
    const rect = view.pixelRect();
    const world = view.world;
    const graph = new FrameGraph(this.pool);
    const sized = { width: rect.width, height: rect.height };
    const attachment = GPUTextureUsage.RENDER_ATTACHMENT;
    const color = graph.createTexture("color.msaa", {
      ...sized,
      format: "rgba16float",
      sampleCount: targets.sampleCount,
      usage: attachment,
    });
    const resolved = graph.createTexture("color", {
      ...sized,
      format: "rgba16float",
      usage: attachment | GPUTextureUsage.TEXTURE_BINDING,
    });
    const ids = graph.createTexture("featureId.msaa", {
      ...sized,
      format: "rg16uint",
      sampleCount: targets.sampleCount,
      usage: attachment | GPUTextureUsage.TEXTURE_BINDING,
    });
    const depth = graph.createTexture("depth.msaa", {
      ...sized,
      format: targets.depthFormat,
      sampleCount: targets.sampleCount,
      usage: attachment,
    });
    const output = graph.importTexture("output", targetView);

    graph.addPass("select-view", { sideEffect: true }, (enc) => {
      enc.copyBufferToBuffer(
        this.viewStaging,
        index * VIEW_STRIDE,
        this.ctx.currentViewBuffer,
        0,
        VIEW_SIZE,
      );
    });

    graph.addPass("prep", { sideEffect: true }, (enc) => {
      const pass = enc.beginComputePass({
        label: "prep",
        timestampWrites: this.timer.passWrites(),
      });
      pass.setPipeline(pipelines.prep);
      pass.setBindGroup(0, this.ctx.currentViewBindGroup);
      pass.setBindGroup(1, world.prepBindGroup);
      pass.dispatchWorkgroups(Math.ceil(Math.max(world.recordCount, 1) / 64));
      pass.end();
    });

    graph.addPass(
      "opaque",
      { writes: [color, resolved, ids, depth] },
      (enc, get) => {
        const pass = enc.beginRenderPass({
          label: "opaque",
          colorAttachments: [
            {
              view: get(color),
              resolveTarget: get(resolved),
              clearValue: {
                r: view.clearColor[0],
                g: view.clearColor[1],
                b: view.clearColor[2],
                a: 1,
              },
              loadOp: "clear",
              storeOp: "discard",
            },
            {
              view: get(ids),
              clearValue: { r: 0, g: 0, b: 0, a: 0 },
              loadOp: "clear",
              storeOp: "store",
            },
          ],
          depthStencilAttachment: {
            view: get(depth),
            depthClearValue: 0, // reverse-Z: far is 0
            depthLoadOp: "clear",
            depthStoreOp: "discard",
          },
          timestampWrites: this.timer.passWrites(),
        });
        pass.executeBundles([bundle]);
        pass.end();
      },
    );

    // One pick per frame keeps the shared params/result buffers simple.
    const request = picks.length === 0 ? view.pendingPicks.shift() : undefined;
    if (request) {
      graph.addPass("pick", { reads: [ids], sideEffect: true }, (enc, get) => {
        const px = Math.min(Math.max(Math.floor(request.x), 0), rect.width - 1);
        const py = Math.min(
          Math.max(Math.floor(request.y), 0),
          rect.height - 1,
        );
        this.pickParamsData[0] = px;
        this.pickParamsData[1] = py;
        device.queue.writeBuffer(this.pickParams, 0, this.pickParamsData);
        const group = device.createBindGroup({
          layout: pipelines.pick.getBindGroupLayout(0),
          entries: [
            { binding: 0, resource: get(ids) },
            { binding: 1, resource: { buffer: this.pickParams } },
            { binding: 2, resource: { buffer: this.pickResult } },
          ],
        });
        const pass = enc.beginComputePass({ label: "pick" });
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
        picks.push({ view, readback, resolve: request.resolve });
      });
    }

    graph.addPass(
      "present",
      { reads: [resolved], writes: [output] },
      (enc, get) => {
        const params = new DataView(this.presentData);
        params.setFloat32(0, rect.x, true);
        params.setFloat32(4, rect.y, true);
        params.setFloat32(8, view.exposure, true);
        const encoding = this.ctx.outputFormat.endsWith("-srgb")
          ? 0
          : view.outputEncoding === "gamma2.2"
            ? 2
            : 1;
        params.setUint32(12, encoding, true);
        device.queue.writeBuffer(
          this.presentParams[index]!,
          0,
          this.presentData,
        );
        const group = device.createBindGroup({
          layout: pipelines.present.getBindGroupLayout(0),
          entries: [
            { binding: 0, resource: get(resolved) },
            { binding: 1, resource: { buffer: this.presentParams[index]! } },
          ],
        });
        const pass = enc.beginRenderPass({
          label: "present",
          colorAttachments: [
            {
              view: get(output),
              clearValue: { r: 0, g: 0, b: 0, a: 1 },
              loadOp: clearTarget ? "clear" : "load",
              storeOp: "store",
            },
          ],
        });
        pass.setViewport(rect.x, rect.y, rect.width, rect.height, 0, 1);
        pass.setScissorRect(rect.x, rect.y, rect.width, rect.height);
        pass.setPipeline(pipelines.present);
        pass.setBindGroup(0, group);
        pass.draw(3);
        this.drawOverlays(pass, view);
        pass.end();
      },
    );

    graph.execute(encoder);
  }

  private drawOverlays(pass: GPURenderPassEncoder, view: View): void {
    const segments = view.overlays.reduce((n, o) => n + o.segments.length, 0);
    if (segments === 0) {
      return;
    }
    const device = this.ctx.device;
    let resources = this.overlayResources.get(view);
    if (!resources || resources.capacity < segments) {
      resources?.buffer.destroy();
      const capacity = Math.max(segments, 256);
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
      resources = { buffer, capacity, params, group };
      this.overlayResources.set(view, resources);
    }
    // Camera-relative in float64, then float32: overlays share the
    // precision scheme of the draw records.
    const data = new Float32Array(segments * 3);
    let k = 0;
    const eye = view.camera.position;
    for (const overlay of view.overlays) {
      for (const p of overlay.segments) {
        data[k++] = p[0]! - eye[0]!;
        data[k++] = p[1]! - eye[1]!;
        data[k++] = p[2]! - eye[2]!;
      }
    }
    device.queue.writeBuffer(resources.buffer, 0, data);
    const color = view.overlays[0]!.color;
    device.queue.writeBuffer(resources.params, 0, new Float32Array(color));
    pass.setPipeline(this.ctx.pipelines.overlay);
    pass.setBindGroup(0, this.ctx.currentViewBindGroup);
    pass.setBindGroup(1, resources.group);
    pass.setVertexBuffer(0, resources.buffer);
    pass.draw(segments);
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
    this.gpu.destroy();
  }
}

interface PendingPick {
  view: View;
  readback: GPUBuffer;
  resolve: (result: PickResult | undefined) => void;
}

const scratchView = m4.mat4();
const scratchProj = m4.mat4();
const scratchViewProj = m4.mat4();
const scratchPlanes = new Float32Array(20);
