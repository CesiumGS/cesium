import { TerrainSource } from "../globe/TerrainSource.ts";
import type { TerrainTileInfo } from "../globe/quantizedMesh.ts";
import { RequestScheduler } from "../streaming/RequestScheduler.ts";
import { GpuDevice, type GpuDeviceOptions } from "../gpu/GpuDevice.ts";
import { GpuTimer } from "../gpu/GpuTimer.ts";
import {
  FrameGraph,
  TexturePool,
  type TextureHandle,
} from "../render/FrameGraph.ts";
import {
  VIEW_BIT_WORD,
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
  CanvasTarget,
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
import {
  GlobeImagery,
  type GlobeImageryOptions,
} from "../globe/GlobeImagery.ts";
import type { ImageryProvider } from "../globe/ImageryProvider.ts";
import { Tileset3D, type TilesetOptions } from "../streaming/Tileset3D.ts";
import type { SelectionView } from "../streaming/Legacy1x.ts";
import type { GltfAsset } from "../io/gltfTypes.ts";
import {
  addGltf,
  removeGltf,
  type ModelInstance,
  type ModelOptions,
} from "./gltfModel.ts";

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
  /** Frames rendered since start (on demand: only frames something changed). */
  framesRendered: number;
  /** The last tick rendered nothing (on demand, nothing changed). */
  idle: boolean;
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
/** A view's last presented image, when it shares its canvas (on demand). */
interface PersistentImage {
  texture: GPUTexture;
  view: GPUTextureView;
  /** Its size, at the origin: the view renders into it as a whole target. */
  rect: PixelRect;
  /** Holds the view's current image (false until first rendered). */
  valid: boolean;
}

/** Values in one view's on-demand fingerprint (see `viewChanged`). */
const VIEW_KEY_LENGTH = 26;

export class Engine {
  readonly gpu: GpuDevice;
  readonly worlds: World[] = [];
  readonly views: View[] = [];
  readonly links: ViewLink[] = [];
  /** Streamed 3D Tiles tilesets, updated before each frame. */
  readonly tilesets: Tileset3D[] = [];
  readonly stats: FrameStats = {
    cpuMs: 0,
    gpuMs: Number.NaN,
    gpuSpanMs: Number.NaN,
    views: 0,
    draws: 0,
    batches: 0,
    framesRendered: 0,
    idle: false,
  };
  /**
   * "onDemand" (default): `start()` renders a frame only when something
   * visible changed (a camera, view, world, the sun, streamed content) or
   * `requestRender()` was called; "continuous": every animation frame.
   * `renderFrame()` always renders.
   */
  renderMode: "onDemand" | "continuous" = "onDemand";
  /** Unit vector toward the sun in Earth-fixed axes. Placeholder until the 1.x sun model lands. */
  readonly sunDirection: Vec3 = v3.vec3(1, 0, 0);

  private readonly ctx: RenderContext;
  private readonly workers = new WorkerPool();
  /** Content request windows per origin, shared by all tilesets. */
  readonly requests = new RequestScheduler();
  private readonly pool: TexturePool;
  private readonly timer: GpuTimer;
  private readonly viewStaging: GPUBuffer;
  private readonly viewData: Float32Array;
  private readonly viewDataU32: Uint32Array;
  /** Stable per-view bit index (0–31) for record view masks. */
  private readonly viewIds = new Map<View, number>();
  private readonly freeViewIds: number[] = [];
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
  private renderRequested = true;
  /** Fingerprints of the last rendered frame (see viewChanged). */
  private readonly viewKeys = new Map<View, Float64Array>();
  private readonly globalKey = new Float64Array(5).fill(Number.NaN);
  private readonly scratchKey = new Float64Array(VIEW_KEY_LENGTH);
  private readonly dirtyTargets = new Set<RenderTarget>();
  private readonly dirtyViews = new Set<View>();
  /**
   * Views sharing a canvas, on demand: each one's last presented image, so
   * a clean view is copied instead of re-rendered.
   */
  private readonly persistent = new Map<View, PersistentImage>();
  private readonly viewsPerTarget = new Map<RenderTarget, number>();
  private readonly sharedTargets = new Set<RenderTarget>();
  private readonly drawnViews = new Set<View>();
  private readonly compositeClear: GPURenderPassColorAttachment = {
    view: undefined as never,
    clearValue: { r: 0, g: 0, b: 0, a: 1 },
    loadOp: "clear",
    storeOp: "store",
  };
  private readonly compositePass: GPURenderPassDescriptor = {
    label: "composite.clear",
    colorAttachments: [this.compositeClear],
  };
  private readonly copySource: GPUTexelCopyTextureInfo = {
    texture: undefined as never,
  };
  private readonly copyDestination: GPUTexelCopyTextureInfo = {
    texture: undefined as never,
    origin: { x: 0, y: 0 },
  };

  private constructor(gpu: GpuDevice, ctx: RenderContext, maxViews: number) {
    this.gpu = gpu;
    this.ctx = ctx;
    this.maxViews = maxViews;
    const device = ctx.device;
    this.pool = new TexturePool(device);
    this.timer = new GpuTimer(device);
    this.viewData = new Float32Array((maxViews * VIEW_STRIDE) / 4);
    this.viewDataU32 = new Uint32Array(this.viewData.buffer);
    for (let id = Math.min(maxViews, 32) - 1; id >= 0; id--) {
      this.freeViewIds.push(id);
    }
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

  /**
   * Fetches and decodes a glTF, GLB or b3dm in a worker. Upload it with
   * `addModel`. `headers` go with every request (e.g. ion authorization).
   */
  loadGltf(
    url: string | URL,
    options: { headers?: Record<string, string>; signal?: AbortSignal } = {},
  ): Promise<GltfAsset> {
    return this.workers.request<GltfAsset>(
      "gltf",
      {
        url: new URL(url, globalThis.location?.href).href,
        headers: options.headers,
        // KTX2/Basis textures are transcoded to a block format this device supports.
        textureSupport: this.gpu.caps.textureCompression,
      },
      options.signal,
    );
  }

  /** Places a parsed glTF asset in a world. */
  addModel(
    world: World,
    asset: GltfAsset,
    options: ModelOptions,
  ): ModelInstance {
    return addGltf(this.ctx, world, asset, options);
  }

  /**
   * Streams a 3D Tiles tileset into `world`: selection runs per view each
   * frame, and content is drawn only in the views that selected it.
   */
  async addTileset(
    world: World,
    url: string | URL,
    options?: TilesetOptions,
  ): Promise<Tileset3D> {
    const tileset = await Tileset3D.load(
      this,
      world,
      new URL(url, globalThis.location?.href).href,
      options,
    );
    this.tilesets.push(tileset);
    return tileset;
  }

  /**
   * Streams quantized-mesh terrain (`url`: a `layer.json` or its directory,
   * e.g. Cesium World Terrain's ion endpoint) into `world`, through the same
   * selection, requests, cache and rendering as 3D Tiles. Selection defaults
   * to 1.x's globe threshold, SSE 2.
   */
  async addTerrain(
    world: World,
    url: string | URL,
    options: TilesetOptions & {
      /** Imagery draped on the terrain (one per world for now). */
      imagery?: ImageryProvider;
      imageryOptions?: GlobeImageryOptions;
    } = {},
  ): Promise<Tileset3D> {
    const base = new URL(url, globalThis.location?.href);
    const layer = base.pathname.endsWith(".json")
      ? base
      : new URL("layer.json", base.href.endsWith("/") ? base : `${base.href}/`);
    const headers = options.headers;
    const source = await TerrainSource.create(
      layer.href,
      headers,
      (request, signal) =>
        this.workers.request<{ asset: GltfAsset; info: TerrainTileInfo }>(
          "terrain",
          request,
          signal,
        ),
      { warnings: new Set() },
    );
    const tileset = Tileset3D.fromSource(this, world, source, {
      maximumScreenSpaceError: 2,
      ...options,
    });
    if (options.imagery) {
      tileset.imagery = new GlobeImagery(
        this.ctx,
        world,
        options.imagery,
        this.requests,
        this.workers,
        options.imageryOptions,
      );
    }
    this.tilesets.push(tileset);
    return tileset;
  }

  removeTileset(tileset: Tileset3D): void {
    const index = this.tilesets.indexOf(tileset);
    if (index >= 0) {
      this.tilesets.splice(index, 1);
    }
    tileset.destroy();
  }

  /** Render-target pool usage (transient textures shared by all views). */
  get renderTargetMemory() {
    return this.pool.stats;
  }

  /** Builds the selection inputs for every enabled view of `world`. */
  private selectionViews(world: World): SelectionView[] {
    const out: SelectionView[] = [];
    for (const view of this.views) {
      if (!view.enabled || view.world !== world) {
        continue;
      }
      const rect = view.pixelRect();
      const aspect = rect.width / rect.height;
      const camera = view.camera;
      const p = camera.position;
      // World-space planes in float64: camera-relative planes shifted by the
      // camera position, plus 1.x's far plane (5e8 m). The prefetch band
      // widens the half-angle tangents by 1.25 (about 6° per side at 60°).
      const d = camera.direction;
      const worldPlanes = (widen: number) => {
        const planes = new Float64Array(24);
        camera.frustumPlanes(planes, aspect, widen);
        for (let k = 0; k < 5; k++) {
          planes[k * 4 + 3] =
            planes[k * 4 + 3]! -
            (planes[k * 4]! * p[0]! +
              planes[k * 4 + 1]! * p[1]! +
              planes[k * 4 + 2]! * p[2]!);
        }
        planes[20] = -d[0]!;
        planes[21] = -d[1]!;
        planes[22] = -d[2]!;
        planes[23] = d[0]! * p[0]! + d[1]! * p[1]! + d[2]! * p[2]! + 5e8;
        return planes;
      };
      const planes = worldPlanes(1);
      const pixelRatio =
        view.target instanceof CanvasTarget
          ? (globalThis.devicePixelRatio ?? 1)
          : 1;
      out.push({
        id: this.viewIds.get(view)!,
        position: p,
        direction: d,
        cartographic: Ellipsoid.WGS84.cartesianToCartographic(p, {
          longitude: 0,
          latitude: 0,
          height: 0,
        }) ?? { longitude: 0, latitude: 0, height: 0 },
        planes,
        prefetchPlanes: worldPlanes(1.25),
        sseDenominator: 2 * Math.tan(camera.fovy(aspect) / 2),
        height: rect.height / pixelRatio,
        pixelRatio,
      });
    }
    return out;
  }

  /** Removes a placed glTF and frees its geometry, materials and textures. */
  removeModel(world: World, instance: ModelInstance): void {
    removeGltf(world, instance);
  }

  createWorld(options?: WorldOptions): World {
    const world = new World(this.ctx, options);
    this.worlds.push(world);
    return world;
  }

  /** Removes a world from the engine and frees its GPU resources. */
  removeWorld(world: World): void {
    const index = this.worlds.indexOf(world);
    if (index >= 0) {
      this.worlds.splice(index, 1);
    }
    world.destroy();
  }

  addView(options: ViewOptions): View {
    if (this.views.length >= this.maxViews) {
      throw new Error(`At most ${this.maxViews} views are supported.`);
    }
    const id = this.freeViewIds.pop();
    if (id === undefined) {
      throw new Error("At most 32 views can have view masks.");
    }
    const view = new View(options);
    this.views.push(view);
    this.viewIds.set(view, id);
    return view;
  }

  /**
   * The view's bit in draw-record view masks (`World.setViewMask`), stable
   * for the view's lifetime.
   */
  viewBit(view: View): number {
    return (1 << this.viewIds.get(view)!) >>> 0;
  }

  removeView(view: View): void {
    this.dropPersistent(view);
    const index = this.views.indexOf(view);
    if (index >= 0) {
      this.views.splice(index, 1);
    }
    for (const link of this.links.filter(
      (l) => l.source === view || l.target === view,
    )) {
      this.unlink(link);
    }
    const id = this.viewIds.get(view);
    if (id !== undefined) {
      this.viewIds.delete(view);
      this.freeViewIds.push(id);
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

  /**
   * Asks for a frame in on-demand mode, for changes the engine can't see
   * (state an application keeps outside the engine).
   */
  requestRender(): void {
    this.renderRequested = true;
  }

  /** Runs the frame loop with requestAnimationFrame until `stop()`. */
  start(): void {
    const tick = () => {
      this.tick();
      this.frameHandle = requestAnimationFrame(tick);
    };
    this.frameHandle = requestAnimationFrame(tick);
  }

  private tick(): void {
    if (this.renderMode === "continuous") {
      this.renderFrame();
      return;
    }
    const links = this.links;
    for (let i = 0; i < links.length; i++) {
      links[i]!.evaluate();
    }
    // Which targets need a frame. A canvas gets a fresh texture each frame,
    // so a target redraws all its views when any of them changed; targets
    // with none changed are skipped and keep their last image.
    const all = this.globalChanged() || this.renderRequested;
    const dirty = this.dirtyTargets;
    const dirtyViews = this.dirtyViews;
    dirty.clear();
    dirtyViews.clear();
    let moved = false;
    const views = this.views;
    for (let i = 0; i < views.length; i++) {
      const view = views[i]!;
      if (!view.enabled) {
        continue;
      }
      const changed = this.viewChanged(view);
      moved ||= changed;
      // A pick is served during a frame (one per frame).
      if (all || changed || view.pendingPicks.length > 0) {
        dirty.add(view.target);
        dirtyViews.add(view);
      }
    }
    // Selection runs when a camera moved or content streams; a frame then
    // renders only for the views that can see what changed.
    for (let i = 0; i < this.tilesets.length; i++) {
      const tileset = this.tilesets[i]!;
      if (all || moved || tileset.active) {
        tileset.update(this.selectionViews(tileset.world));
      }
    }
    for (let i = 0; i < views.length; i++) {
      const view = views[i]!;
      if (
        view.enabled &&
        (view.world.changedViews & this.viewBit(view)) !== 0
      ) {
        dirty.add(view.target);
        dirtyViews.add(view);
      }
    }
    if (dirty.size === 0) {
      for (let i = 0; i < this.worlds.length; i++) {
        this.worlds[i]!.changedViews = 0; // seen by no view
      }
      this.stats.idle = true;
      return;
    }
    this.render(true, dirty, dirtyViews);
  }

  /** The sun and the set of enabled views changed (affects every view). */
  private globalChanged(): boolean {
    const k = this.globalKey;
    let enabled = 0;
    for (let i = 0; i < this.views.length; i++) {
      enabled += this.views[i]!.enabled ? 1 << (i % 30) : 0;
    }
    const sun = this.sunDirection;
    const changed =
      k[0] !== sun[0] ||
      k[1] !== sun[1] ||
      k[2] !== sun[2] ||
      k[3] !== this.views.length ||
      k[4] !== enabled;
    k[0] = sun[0]!;
    k[1] = sun[1]!;
    k[2] = sun[2]!;
    k[3] = this.views.length;
    k[4] = enabled;
    return changed;
  }

  /**
   * Fingerprints what one view's image depends on outside its world: target
   * size, viewport, camera, exposure, clear color, encoding, lighting and
   * world. Compares with its last rendered frame and keeps the new one.
   * Allocation-free after a view's first frame.
   */
  private viewChanged(view: View): boolean {
    let key = this.viewKeys.get(view);
    if (!key) {
      key = new Float64Array(VIEW_KEY_LENGTH).fill(Number.NaN);
      this.viewKeys.set(view, key);
    }
    const s = this.scratchKey;
    let n = 0;
    const target = view.target;
    if (target instanceof CanvasTarget && "clientWidth" in target.canvas) {
      const dpr = globalThis.devicePixelRatio ?? 1;
      s[n++] = target.canvas.clientWidth * dpr;
      s[n++] = target.canvas.clientHeight * dpr;
    } else {
      s[n++] = target.width;
      s[n++] = target.height;
    }
    const vp = view.viewport;
    s[n++] = vp.x;
    s[n++] = vp.y;
    s[n++] = vp.width;
    s[n++] = vp.height;
    const c = view.camera;
    for (let k = 0; k < 3; k++) {
      s[n++] = c.position[k]!;
      s[n++] = c.direction[k]!;
      s[n++] = c.up[k]!;
    }
    s[n++] = c.fov;
    s[n++] = c.near;
    s[n++] = view.exposure;
    s[n++] = view.clearColor[0];
    s[n++] = view.clearColor[1];
    s[n++] = view.clearColor[2];
    s[n++] = view.outputEncoding === "srgb" ? 0 : 1;
    s[n++] = view.lighting.sunIntensity;
    s[n++] = view.lighting.diffuseIbl;
    s[n++] = view.lighting.specularIbl;
    s[n++] = view.world.id;
    let changed = false;
    for (let i = 0; i < n; i++) {
      if (s[i] !== key[i]) {
        changed = true;
        key[i] = s[i]!;
      }
    }
    return changed;
  }

  stop(): void {
    cancelAnimationFrame(this.frameHandle);
  }

  /** Renders every enabled view now, whatever the render mode. */
  renderFrame(): void {
    this.render(false);
  }

  /**
   * `tilesetsUpdated`: the tick already ran selection this frame.
   * `targets`: render only the views on these targets (on demand), and on a
   * target shared by several views only `dirtyViews` (the others are copied
   * from their last image).
   */
  private render(
    tilesetsUpdated: boolean,
    targets?: ReadonlySet<RenderTarget>,
    dirtyViews?: ReadonlySet<View>,
  ): void {
    const start = performance.now();
    this.renderRequested = false;
    this.stats.idle = false;
    this.stats.framesRendered++;
    const device = this.ctx.device;
    const stamp = ++this.frameNumber;

    // Acquire each target first: acquiring a canvas resizes it to its CSS
    // size, and every view rectangle below (selection, frame graphs,
    // viewport/scissor) must use this frame's size, not last frame's.
    const views = this.views;
    for (let i = 0; i < views.length; i++) {
      const view = views[i]!;
      if (!view.enabled || (targets && !targets.has(view.target))) {
        continue;
      }
      const target = this.targetFrame(view.target);
      if (target.stamp !== stamp) {
        target.stamp = stamp;
        target.view = view.target.acquire(device, this.ctx.outputFormat);
        target.clearedBy = undefined;
      }
    }

    const links = this.links;
    for (let i = 0; i < links.length; i++) {
      links[i]!.evaluate();
    }
    if (!tilesetsUpdated) {
      for (let i = 0; i < this.tilesets.length; i++) {
        const tileset = this.tilesets[i]!;
        tileset.update(this.selectionViews(tileset.world));
      }
    }

    // Which views draw. On demand, a target shared by several views is
    // composited: each view presents into its own persistent image, only
    // dirty views (or ones without a current image) re-render, and every
    // view's image is copied into the target in view order. Otherwise views
    // draw straight into their target.
    const shared = this.sharedTargets;
    const drawn = this.drawnViews;
    shared.clear();
    drawn.clear();
    if (targets && dirtyViews) {
      const counts = this.viewsPerTarget;
      counts.clear();
      for (let i = 0; i < views.length; i++) {
        const view = views[i]!;
        if (view.enabled) {
          counts.set(view.target, (counts.get(view.target) ?? 0) + 1);
        }
      }
      for (const [target, n] of counts) {
        if (n > 1 && targets.has(target) && target.texture) {
          shared.add(target);
        }
      }
    }
    for (let i = 0; i < views.length; i++) {
      const view = views[i]!;
      if (!view.enabled || (targets && !targets.has(view.target))) {
        continue;
      }
      if (shared.has(view.target)) {
        const rect = view.pixelRect();
        const image = this.persistentImage(view, rect.width, rect.height);
        if (!image.valid || dirtyViews!.has(view)) {
          drawn.add(view);
        }
      } else {
        drawn.add(view);
        this.dropPersistent(view);
      }
    }

    // Assign each drawn view a slot (the first view drawn into a target
    // clears it) and prepare each world once.
    let slots = 0;
    for (let i = 0; i < views.length; i++) {
      const view = views[i]!;
      if (!drawn.has(view)) {
        continue;
      }
      const image = shared.has(view.target)
        ? this.persistent.get(view)
        : undefined;
      const rect = image ? image.rect : view.pixelRect();
      const frame = this.viewFrame(view, rect);
      frame.slot = slots;
      this.writeView(view, slots, rect);
      slots++;

      if (image) {
        frame.clearTarget = true;
        frame.graph.setImported(frame.output, image.view);
        image.valid = true;
      } else {
        const target = this.targetFrame(view.target);
        frame.clearTarget = target.clearedBy === undefined;
        if (frame.clearTarget) {
          target.clearedBy = view;
        }
        frame.graph.setImported(frame.output, target.view!);
      }

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
      if (drawn.has(view)) {
        const frame = this.viewFrames.get(view)!;
        // One pick per frame keeps the shared params/result buffers simple.
        frame.pick =
          this.picks.length === 0 ? view.pendingPicks.shift() : undefined;
        frame.graph.execute(encoder);
      }
    }
    // Composite shared targets: clear, then each view's image in view order
    // (an inset lands over the view it overlaps).
    for (const target of shared) {
      this.compositeClear.view = this.targetFrame(target).view!;
      encoder.beginRenderPass(this.compositePass).end();
      this.copyDestination.texture = target.texture!;
      const origin = this.copyDestination.origin as GPUOrigin3DDict;
      for (let i = 0; i < views.length; i++) {
        const view = views[i]!;
        const image =
          view.enabled && view.target === target
            ? this.persistent.get(view)
            : undefined;
        if (!image) {
          continue;
        }
        const rect = view.pixelRect();
        this.copySource.texture = image.texture;
        origin.x = rect.x;
        origin.y = rect.y;
        encoder.copyTextureToTexture(this.copySource, this.copyDestination, [
          image.rect.width,
          image.rect.height,
        ]);
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
    for (let i = 0; i < this.worlds.length; i++) {
      this.worlds[i]!.changedViews = 0;
    }
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
    this.viewDataU32[(index * VIEW_STRIDE) / 4 + VIEW_BIT_WORD] =
      this.viewBit(view);
  }

  /** A view's persistent image at its current size (recreated on resize). */
  private persistentImage(
    view: View,
    width: number,
    height: number,
  ): PersistentImage {
    let image = this.persistent.get(view);
    if (!image || image.rect.width !== width || image.rect.height !== height) {
      image?.texture.destroy();
      const texture = this.ctx.device.createTexture({
        label: "view.image",
        size: [width, height],
        format: this.ctx.outputFormat,
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
      });
      image = {
        texture,
        view: texture.createView(),
        rect: { x: 0, y: 0, width, height },
        valid: false,
      };
      this.persistent.set(view, image);
    }
    return image;
  }

  private dropPersistent(view: View): void {
    const image = this.persistent.get(view);
    if (image) {
      image.texture.destroy();
      this.persistent.delete(view);
    }
  }

  private targetFrame(target: RenderTarget): TargetFrame {
    let frame = this.targetFrames.get(target);
    if (!frame) {
      frame = { stamp: 0, view: undefined, clearedBy: undefined };
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
      if (frame) {
        frame.presentParams.destroy();
        this.releaseTargets(view, frame);
      }
      frame = this.buildViewFrame(view, rect);
      this.viewFrames.set(view, frame);
    }
    return frame;
  }

  /**
   * Frees a view's render targets at its old size when it resizes, unless
   * another view still renders at that size. Without this, a window resize
   * leaves every intermediate size resident until the pool's idle timeout.
   */
  private releaseTargets(view: View, old: ViewFrame): void {
    for (const [other, frame] of this.viewFrames) {
      if (
        other !== view &&
        frame.width === old.width &&
        frame.height === old.height
      ) {
        return;
      }
    }
    for (const desc of old.graph.transientDescs()) {
      this.pool.purge(desc);
    }
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
        const feature = view.world.feature(featureId);
        resolve(
          feature
            ? {
                featureId,
                name: feature.name,
                ...(feature.properties
                  ? { properties: feature.properties }
                  : {}),
              }
            : undefined,
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
  /** The view that clears the target this frame (the first drawn into it). */
  clearedBy: View | undefined;
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
