import { TerrainSource, type TerrainLoader } from "../globe/TerrainSource.ts";
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
  UNDERLAY_DEPTH,
  VIEW_BIT_WORD,
  VIEW_SIZE,
  VIEW_STRIDE,
  writeViewBlock,
  type ViewBlock,
} from "../render/layout.ts";
import * as m4 from "../math/mat4.ts";
import * as v3 from "../math/vec3.ts";
import { Ellipsoid, type Cartographic } from "../math/ellipsoid.ts";
import type { EnvironmentProbe } from "../gpu/Environment.ts";
import { eastNorthUpToFixedFrame } from "../math/transforms.ts";
import type { Vec3 } from "../math/vec3.ts";
import {
  createRenderContext,
  SCENE_TARGETS,
  type RenderContext,
  type ShaderOverrides,
} from "./RenderContext.ts";
import { createBox } from "./meshes.ts";
import {
  CanvasTarget,
  OffscreenTarget,
  View,
  ev100ToScale,
  type HdrImage,
  type PixelRect,
  type RenderTarget,
  type ViewOptions,
} from "./View.ts";
import { ViewLink, type ViewLinkOptions } from "./ViewLink.ts";
import { RealtimeAtmosphere } from "../atmosphere/RealtimeAtmosphere.ts";
import { Sky, type SkyView } from "../atmosphere/Sky.ts";
import { EARTH } from "./Body.ts";
import { Camera } from "./Camera.ts";
import { World, type WorldOptions } from "./World.ts";
import { HeightClamping } from "./HeightClamping.ts";
import { WorkerPool } from "../io/WorkerPool.ts";
import {
  GlobeImagery,
  type GlobeImageryOptions,
} from "../globe/GlobeImagery.ts";
import type { ImageryProvider } from "../globe/ImageryProvider.ts";
import { Tileset3D, type TilesetOptions } from "../streaming/Tileset3D.ts";
import type { SelectionView } from "../streaming/Stepwise.ts";
import type { GltfAsset } from "../io/gltfTypes.ts";
import {
  addGltf,
  removeGltf,
  setModelInstance,
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
  /** Environments rebuilt from an atmosphere since start (`ViewLighting`). */
  environmentBuilds: number;
}

/**
 * Owns the GPU device and everything shared between views: pipelines,
 * transient-texture pool and worlds. One `renderFrame` renders every enabled
 * view into one command encoder:
 *
 *   for each view:
 *     copy view block → current-view buffer   (ordered within the encoder)
 *     cull kernels: camera-relative transforms, culling, indirect args
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
const VIEW_KEY_LENGTH = 27;

/**
 * Prefetching looks this far ahead: content the camera would reveal in
 * this time at its current velocity loads before it comes into view (about
 * a load's latency).
 */
const PREFETCH_AHEAD_SECONDS = 1;
/** The prefetch frustum's margin (tangent scale) around that view. */
const PREFETCH_MARGIN = 1.1;

/** A view's camera at its last selection, and its velocity per second. */
interface ViewMotion {
  at: number;
  position: Vec3;
  direction: Vec3;
  up: Vec3;
  velocity: { position: Vec3; direction: Vec3; up: Vec3 };
  /** Speeds of the last estimate (position m/s, direction 1/s). */
  speeds: [number, number];
  /**
   * The velocity continues the previous one: motion, not a jump. A camera
   * set somewhere else in one frame (a teleport, a flight's end) reads as
   * thousands of meters per second for that frame; prefetching a second
   * ahead of it requested content nowhere near the view.
   */
  steady: boolean;
}

/** Options for a globe surface: terrain or the ellipsoid. */
export interface GlobeOptions extends TilesetOptions {
  /**
   * Imagery draped on the surface (one per world for now). A promise lets
   * the surface's tiles load while the imagery's metadata resolves (1.x
   * starts terrain without waiting for imagery); none is shown without it.
   */
  imagery?: ImageryProvider | Promise<ImageryProvider | undefined>;
  imageryOptions?: GlobeImageryOptions;
}

export class Engine {
  readonly gpu: GpuDevice;
  readonly worlds: World[] = [];
  readonly views: View[] = [];
  readonly links: ViewLink[] = [];
  /** Streamed 3D Tiles tilesets, updated before each frame. */
  readonly tilesets: Tileset3D[] = [];
  /**
   * Keeps content with a `heightReference` on terrain and collision
   * tilesets as they load (`addModel`).
   */
  readonly clamping = new HeightClamping(
    () => this.tilesets,
    (world) => {
      let mask = 0;
      for (const view of this.views) {
        if (view.enabled && view.world === world) {
          mask |= this.viewBit(view);
        }
      }
      return mask >>> 0;
    },
    (world, positions, tilesets) =>
      this.sampleHeightMostDetailed(world, positions, { tilesets }),
  );
  readonly stats: FrameStats = {
    cpuMs: 0,
    gpuMs: Number.NaN,
    gpuSpanMs: Number.NaN,
    views: 0,
    draws: 0,
    batches: 0,
    framesRendered: 0,
    idle: false,
    environmentBuilds: 0,
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
  /** @internal The real-time atmosphere and the sky drawn from it. */
  readonly sky: Sky;
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
  private readonly viewMotion = new Map<View, ViewMotion>();
  private readonly aheadCamera = new Camera();
  private readonly freeViewIds: number[] = [];
  private readonly maxViews: number;
  private readonly viewFrames = new Map<View, ViewFrame>();
  private readonly targetFrames = new WeakMap<RenderTarget, TargetFrame>();
  private readonly worldFrames = new WeakMap<World, WorldFrame>();
  private readonly overlayResources = new Map<View, OverlayResources>();
  /**
   * Views lit by their atmosphere's environment: its probe, and the local
   * sun direction and altitude it was built for.
   */
  private readonly probes = new Map<
    View,
    { probe: EnvironmentProbe; key: Float64Array; pending: boolean }
  >();
  /** The environment of a body without an atmosphere: black. */
  private darkProbe: EnvironmentProbe | undefined;
  private readonly pickReadback: GPUBuffer[] = [];
  private readonly pickParams: GPUBuffer;
  private readonly pickResult: GPUBuffer;
  private readonly pickParamsData = new Uint32Array(4);
  private readonly picks: PendingPick[] = [];
  /** Exposure meter readings this frame, mapped after submit. */
  private readonly meters: Array<{
    view: View;
    readback: GPUBuffer;
    scratch: GPUBuffer[];
  }> = [];
  /** HDR images copied this frame (`View.readHdr`), mapped after submit. */
  private readonly hdrReads: Array<{
    buffer: GPUBuffer;
    bytesPerRow: number;
    width: number;
    height: number;
    /** The pre-exposure of the frame read: divided out. */
    exposure: number;
    resolvers: Array<(image: HdrImage) => void>;
  }> = [];
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

  private constructor(
    gpu: GpuDevice,
    ctx: RenderContext,
    sky: Sky,
    maxViews: number,
  ) {
    this.gpu = gpu;
    this.ctx = ctx;
    this.sky = sky;
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
      lighting: {
        sunIlluminance: 0,
        environment: "procedural",
        diffuseIbl: 0,
        specularIbl: 0,
      },
      specularMaxLod: 0,
      exposure: 1,
      body: EARTH,
      aerial: undefined,
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
    const atmosphere = await RealtimeAtmosphere.create(gpu.device);
    const sky = await Sky.create(gpu.device, atmosphere, SCENE_TARGETS);
    const ctx = await createRenderContext(
      gpu.device,
      gpu.caps,
      gpu.preferredCanvasFormat,
      {
        sunLight: sky.sunLight.createView(),
        aerialInscatter: sky.aerialInscatter.createView({ dimension: "3d" }),
        aerialTransmittance: sky.aerialTransmittance.createView({
          dimension: "3d",
        }),
      },
      options.shaders,
    );
    // M0: device-loss recovery stops at the device. Rebuilding worlds from
    // their CPU-side sources arrives with the streaming cache (M2).
    const engine = new Engine(gpu, ctx, sky, options.maxViews ?? 16);
    engine.warmUp();
    return engine;
  }

  /**
   * Starts the content workers, and renders one 1×1 frame with a single
   * draw. Dawn builds some internals lazily (e.g. its indirect-draw
   * validation pipeline), which otherwise cost the first real frame ~70 ms;
   * submitted here, that work overlaps the app's own loading. Not awaited.
   */
  private warmUp(): void {
    this.workers.warm();
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

  /**
   * The environment a view's lighting reads: its atmosphere's (rebuilt by
   * `updateEnvironment`), black without one, or the procedural sky.
   */
  private probeOf(view: View): EnvironmentProbe {
    const environment = this.ctx.environment;
    if (view.lighting.environment !== "atmosphere") {
      return environment.procedural;
    }
    if (!view.body.atmosphere) {
      // Never built: textures and buffers start as zeros.
      return (this.darkProbe ??= environment.createProbe("env.dark"));
    }
    return this.probes.get(view)!.probe;
  }

  /**
   * Marks a view's environment for rebuilding from its atmosphere (this
   * frame, `encodeEnvironment`) when the sun has
   * moved by about 0.1° in its local frame (or the camera about 13 km
   * along the ground), or its altitude by 10% (500 m and below count as
   * 500 m: below the 8 km scale height the sky changes slowly with
   * altitude). About 10 ms of GPU work each time (plan §4.2: to cut).
   */
  private updateEnvironment(view: View): void {
    if (view.lighting.environment !== "atmosphere" || !view.body.atmosphere) {
      return;
    }
    let entry = this.probes.get(view);
    if (!entry) {
      entry = {
        probe: this.ctx.environment.createProbe("env.view"),
        key: new Float64Array(4).fill(Number.NaN),
        pending: false,
      };
      this.probes.set(view, entry);
    }
    const ellipsoid = view.body.ellipsoid;
    const position = view.camera.position;
    const frame = environmentFrame(position, ellipsoid);
    const sun = this.sunDirection;
    const east = v3.dot(frame[0], sun);
    const up = v3.dot(frame[1], sun);
    const south = v3.dot(frame[2], sun);
    const height =
      ellipsoid.cartesianToCartographic(position, scratchCartographic)
        ?.height ?? 0;
    const altitude = Math.max(height, 500);
    const k = entry.key;
    const turned = Math.hypot(east - k[0]!, up - k[1]!, south - k[2]!);
    const climbed = Math.abs(Math.log(altitude / k[3]!));
    // NaN (never built) compares false: rebuild.
    if (turned <= 0.002 && climbed <= 0.1) {
      return;
    }
    k[0] = east;
    k[1] = up;
    k[2] = south;
    k[3] = altitude;
    entry.pending = true;
  }

  /**
   * Encodes a pending rebuild of a view's environment (after its sky-view
   * table, which it reads when the view has one), then selects the view's
   * environment for its draws.
   */
  private encodeEnvironment(
    encoder: GPUCommandEncoder,
    view: View,
    frame: ViewFrame,
  ): void {
    const entry = this.probes.get(view);
    if (entry?.pending) {
      entry.pending = false;
      const position = view.camera.position;
      const ellipsoid = view.body.ellipsoid;
      this.sky.encodeEnvironment(
        encoder,
        frame.sky,
        entry.probe.skyCube,
        ellipsoid,
        position,
        environmentFrame(position, ellipsoid),
        this.sunDirection,
        drawsSky(view) && frame.sky.inside
          ? { exposure: view.exposureScale }
          : undefined,
      );
      this.ctx.environment.build(entry.probe, encoder);
      this.stats.environmentBuilds++;
    }
    this.ctx.environment.select(encoder, this.probeOf(view));
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

  /**
   * Places a parsed glTF asset in a world. With a `heightReference` the
   * model is anchored at its `modelMatrix` translation and kept on the
   * ground (`clamping`).
   */
  addModel(
    world: World,
    asset: GltfAsset,
    options: ModelOptions,
  ): ModelInstance {
    const reference = options.heightReference ?? "none";
    if (reference !== "none" && options.parent) {
      throw new Error("addModel: heightReference needs a model without parent");
    }
    const instance = addGltf(this.ctx, world, asset, options);
    if (reference !== "none") {
      const m = options.modelMatrix;
      const anchor = Ellipsoid.WGS84.cartesianToCartographic(
        v3.vec3(m[12]!, m[13]!, m[14]!),
        { longitude: 0, latitude: 0, height: 0 },
      );
      if (anchor) {
        instance.clamp = this.clamping.add(world, instance.transform, {
          heightReference: reference,
          ...anchor,
          ...(options.heightOffset !== undefined
            ? { offset: options.heightOffset }
            : {}),
        });
      }
    }
    return instance;
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
    options: GlobeOptions = {},
  ): Promise<Tileset3D> {
    const base = new URL(url, globalThis.location?.href);
    const layer = base.pathname.endsWith(".json")
      ? base
      : new URL("layer.json", base.href.endsWith("/") ? base : `${base.href}/`);
    const headers = options.headers;
    const source = await TerrainSource.create(
      layer.href,
      headers,
      this.terrainLoader,
      { warnings: new Set() },
    );
    return this.addGlobeSource(world, source, options);
  }

  /**
   * The ellipsoid as a globe without terrain data (1.x's default
   * `EllipsoidTerrainProvider`): flat tiles built in workers, selected,
   * culled and draped with imagery like terrain.
   */
  addEllipsoid(world: World, options: GlobeOptions = {}): Tileset3D {
    const source = TerrainSource.ellipsoid(this.terrainLoader, {
      warnings: new Set(),
    });
    return this.addGlobeSource(world, source, options);
  }

  private readonly terrainLoader = (
    request: Parameters<TerrainLoader>[0],
    signal: AbortSignal,
  ) =>
    this.workers.request<{ asset: GltfAsset; info: TerrainTileInfo }>(
      "terrain",
      request,
      signal,
    );

  private addGlobeSource(
    world: World,
    source: TerrainSource,
    options: GlobeOptions,
  ): Tileset3D {
    const tileset = Tileset3D.fromSource(this, world, source, {
      maximumScreenSpaceError: 2,
      ...options,
    });
    const drape = (provider: ImageryProvider) =>
      new GlobeImagery(
        this.ctx,
        world,
        provider,
        this.requests,
        this.workers,
        options.imageryOptions,
      );
    if (options.imagery instanceof Promise) {
      tileset.imageryPending = true;
      void options.imagery.then(
        (provider) => {
          if (this.tilesets.includes(tileset)) {
            tileset.imagery = provider ? drape(provider) : undefined;
          }
          tileset.imageryPending = false;
          this.requestRender();
        },
        () => {
          tileset.imageryPending = false;
          this.requestRender();
        },
      );
    } else if (options.imagery) {
      tileset.imagery = drape(options.imagery);
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
      const d = camera.direction;
      // World-space planes in float64: camera-relative planes shifted by the
      // camera position, plus 1.x's far plane (5e8 m).
      const worldPlanes = (c: Camera, widen: number) => {
        const planes = new Float64Array(24);
        const cp = c.position;
        const cd = c.direction;
        c.frustumPlanes(planes, aspect, widen);
        for (let k = 0; k < 5; k++) {
          planes[k * 4 + 3] =
            planes[k * 4 + 3]! -
            (planes[k * 4]! * cp[0]! +
              planes[k * 4 + 1]! * cp[1]! +
              planes[k * 4 + 2]! * cp[2]!);
        }
        planes[20] = -cd[0]!;
        planes[21] = -cd[1]!;
        planes[22] = -cd[2]!;
        planes[23] = cd[0]! * cp[0]! + cd[1]! * cp[1]! + cd[2]! * cp[2]! + 5e8;
        return planes;
      };
      const planes = worldPlanes(camera, 1);
      // Prefetch: the view the camera will have shortly at its current
      // velocity, so only content it is about to reveal loads ahead. None
      // while it is still: a margin around a still view (r37) was half the
      // bytes of a jump into OSM Philadelphia, rarely drawn (L1′).
      const ahead = this.cameraAhead(view, PREFETCH_AHEAD_SECONDS);
      const pixelRatio =
        view.target instanceof CanvasTarget ? view.target.pixelRatio : 1;
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
        ...(ahead
          ? {
              prefetchPlanes: worldPlanes(ahead, PREFETCH_MARGIN),
              motion: this.motionOf(view)!,
            }
          : {}),
        sseDenominator: 2 * Math.tan(camera.fovy(aspect) / 2),
        height: rect.height / pixelRatio,
        pixelRatio,
      });
    }
    return out;
  }

  /**
   * `view`'s camera extrapolated `seconds` ahead at its velocity (measured
   * between selections at least 4 ms apart; still after a pause of over
   * 250 ms, as on-demand rendering idles).
   */
  /** The view's steady motion (`cameraAhead` measured it this selection). */
  private motionOf(view: View): { velocity: Vec3; angular: Vec3 } | undefined {
    const motion = this.viewMotion.get(view);
    return motion
      ? {
          velocity: motion.velocity.position,
          angular: v3.cross(
            v3.vec3(),
            view.camera.direction,
            motion.velocity.direction,
          ),
        }
      : undefined;
  }

  private cameraAhead(view: View, seconds: number): Camera | undefined {
    const camera = view.camera;
    const now = performance.now();
    let motion = this.viewMotion.get(view);
    if (!motion) {
      motion = {
        at: now,
        position: v3.copy(v3.vec3(), camera.position),
        direction: v3.copy(v3.vec3(), camera.direction),
        up: v3.copy(v3.vec3(), camera.up),
        velocity: { position: v3.vec3(), direction: v3.vec3(), up: v3.vec3() },
        speeds: [0, 0],
        steady: false,
      };
      this.viewMotion.set(view, motion);
    }
    const dt = (now - motion.at) / 1000;
    if (dt >= 0.004) {
      const v = motion.velocity;
      const still = dt > 0.25;
      for (const key of ["position", "direction", "up"] as const) {
        const current = camera[key];
        for (let i = 0; i < 3; i++) {
          v[key][i] = still ? 0 : (current[i]! - motion[key][i]!) / dt;
        }
        v3.copy(motion[key], current);
      }
      motion.at = now;
      // Steady: each speed zero, or within 4x of the previous estimate's.
      const speeds = [v3.length(v.position), v3.length(v.direction)];
      motion.steady = speeds.every(
        (s, i) =>
          s === 0 ||
          (motion!.speeds[i]! > 0 &&
            s <= 4 * motion!.speeds[i]! &&
            s >= motion!.speeds[i]! / 4),
      );
      motion.speeds = speeds as [number, number];
    }
    if (!motion.steady || motion.speeds.every((s) => s === 0)) {
      return undefined;
    }
    const ahead = this.aheadCamera.copyFrom(camera);
    const v = motion.velocity;
    for (let i = 0; i < 3; i++) {
      ahead.position[i] = camera.position[i]! + v.position[i]! * seconds;
      ahead.direction[i] = camera.direction[i]! + v.direction[i]! * seconds;
      ahead.up[i] = camera.up[i]! + v.up[i]! * seconds;
    }
    v3.normalize(ahead.direction, ahead.direction);
    return ahead.orient(v3.normalize(ahead.up, ahead.up));
  }

  /** Removes a placed glTF and frees its geometry, materials and textures. */
  /**
   * Heights (meters above the ellipsoid) of the most detailed 3D Tiles
   * content at each longitude and latitude (radians), as 1.x
   * `Scene.sampleHeightMostDetailed`: the tiles under each point are loaded
   * down to the leaves whatever the views show, then ray cast on the GPU
   * down the geodetic normal from 10 km (nearest hit). Tilesets: those
   * given, else the shown collision tilesets of the world. Undefined where
   * nothing is hit. Needs the frame loop running (`start`).
   */
  async sampleHeightMostDetailed(
    world: World,
    positions: ReadonlyArray<{ longitude: number; latitude: number }>,
    options: { tilesets?: readonly Tileset3D[] } = {},
  ): Promise<Array<number | undefined>> {
    const START = 10000;
    const tilesets =
      options.tilesets ??
      this.tilesets.filter(
        (t) => t.world === world && t.show && t.enableCollision && !t.terrain,
      );
    const rays = positions.map(({ longitude, latitude }) => {
      const up = Ellipsoid.WGS84.geodeticSurfaceNormalCartographic(
        { longitude, latitude, height: 0 },
        v3.vec3(),
      );
      return {
        origin: Ellipsoid.WGS84.cartographicToCartesian(
          { longitude, latitude, height: START },
          v3.vec3(),
        ),
        direction: v3.negate(v3.vec3(), up),
        maxDistance: START + 12000,
      };
    });
    const heights: Array<number | undefined> = positions.map(() => undefined);
    await Promise.all(
      tilesets.map(async (tileset) => {
        const query = await tileset.queryRays(rays);
        try {
          const hits = await world.castRays(rays, { draws: query.draws });
          hits.forEach((d, i) => {
            if (d !== undefined) {
              heights[i] = Math.max(heights[i] ?? -Infinity, START - d);
            }
          });
        } finally {
          query.release();
        }
      }),
    );
    return heights;
  }

  /**
   * Moves, hides or tints one instance of a model placed with
   * `ModelOptions.instances` (matrix in the model's frame).
   */
  setModelInstance(
    world: World,
    model: ModelInstance,
    index: number,
    change: {
      matrix?: ArrayLike<number>;
      visible?: boolean;
      tint?: ArrayLike<number>;
    },
  ): void {
    setModelInstance(world, model, index, change);
  }

  removeModel(world: World, instance: ModelInstance): void {
    instance.clamp?.remove();
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
    const atmosphere = view.body.atmosphere;
    if (atmosphere && atmosphere !== this.sky.atmosphere.parameters) {
      // Per-body atmospheres follow with per-body frames (plan §13.14).
      throw new Error(
        `Only the Earth's atmosphere is built so far (view body ${view.body.name}).`,
      );
    }
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
    const probe = this.probes.get(view);
    if (probe) {
      this.ctx.environment.destroyProbe(probe.probe);
      this.probes.delete(view);
    }
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
      this.viewMotion.delete(view);
      this.freeViewIds.push(id);
    }
    const frame = this.viewFrames.get(view);
    if (frame) {
      destroyViewFrame(frame);
    }
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
  /**
   * GPU bytes of content (geometry and textures) all tilesets may upload
   * per frame together. Uploads share the queue with rendering: a fixed
   * count per tileset let several streaming tilesets stall frames, and a
   * fixed small budget slowed a single big one (Google 3D Tiles settled
   * 2.2× later at 2 MiB). So the budget adapts, as request windows do: it
   * grows while frames arrive on time and the budget was used up, and
   * halves when a frame arrives late. At least one upload happens per
   * frame, so loading never stops. The budget is per 60 Hz frame: a faster
   * loop gets its share by time (vsync off at 500+ frames a second tried
   * gigabytes a second, and the GPU's backlog blocked the main thread for
   * 100 to 300 ms in getCurrentTexture and writeBuffer, r38).
   */
  uploadBytesPerFrame = 2 * 1024 * 1024;
  /** Bounds of the adaptive upload budget, bytes per frame. */
  minimumUploadBytesPerFrame = 512 * 1024;
  maximumUploadBytesPerFrame = 32 * 1024 * 1024;
  private lastUpdateAt = 0;
  /** Time since the previous update, ms (60 Hz until measured). */
  private lastUpdateInterval = 1000 / 60;
  private budgetFilled = false;
  private readonly frameIntervals = new Float64Array(31);
  private frameIntervalCount = 0;
  /**
   * @internal What is left of this frame's budget: upload bytes, and main-
   * thread time for building external tilesets' tile trees (at least one
   * of each happens per frame).
   */
  readonly uploadBudget = { bytes: 0, uploads: 0, ms: 0, trees: 0 };
  /** Main-thread time per frame for building tile trees, all tilesets. */
  treeBuildMsPerFrame = 4;
  private tilesetRotation = 0;

  /**
   * Runs selection, requests and uploads for the tilesets `due` picks,
   * starting with a different one each frame so none starves the others
   * of the shared upload budget.
   */
  private updateTilesets(due: (tileset: Tileset3D) => boolean): void {
    this.adaptUploadBudget(performance.now());
    // Budgets are per 60 Hz frame; a faster loop gets its share by time.
    const share = Math.min(1, this.lastUpdateInterval / (1000 / 60));
    this.uploadBudget.bytes = this.uploadBytesPerFrame * share;
    this.uploadBudget.uploads = 0;
    this.uploadBudget.ms = this.treeBuildMsPerFrame * share;
    this.uploadBudget.trees = 0;
    const n = this.tilesets.length;
    const start = n > 0 ? this.tilesetRotation++ % n : 0;
    for (let k = 0; k < n; k++) {
      const tileset = this.tilesets[(start + k) % n]!;
      if (due(tileset)) {
        tileset.update(this.selectionViews(tileset.world));
      }
    }
    this.budgetFilled = this.uploadBudget.bytes <= 0;
    // After the tilesets: their loads and unloads announce height changes.
    this.clamping.update();
  }

  /**
   * The upload budget from the time between updates: late (over 1.5× the
   * recent median and 8 ms more) halves it; on time with the budget used
   * up grows it by a quarter. Gaps over a second (hidden
   * tab, paused loop) are ignored.
   */
  private adaptUploadBudget(now: number): void {
    const interval = now - this.lastUpdateAt;
    this.lastUpdateAt = now;
    if (interval <= 0 || interval > 1000) {
      return;
    }
    this.lastUpdateInterval = interval;
    const intervals = this.frameIntervals;
    intervals[this.frameIntervalCount++ % intervals.length] = interval;
    const count = Math.min(this.frameIntervalCount, intervals.length);
    if (count < 8) {
      return;
    }
    const median = Float64Array.from(intervals.subarray(0, count)).sort()[
      count >> 1
    ]!;
    if (interval > Math.max(1.5 * median, median + 8)) {
      this.uploadBytesPerFrame = Math.max(
        this.minimumUploadBytesPerFrame,
        this.uploadBytesPerFrame / 2,
      );
    } else if (this.budgetFilled) {
      // Proportional growth reaches what a big tileset needs within a few
      // frames (a quarter MiB per frame left Google 1.1 s slower).
      this.uploadBytesPerFrame = Math.min(
        this.maximumUploadBytesPerFrame,
        this.uploadBytesPerFrame * 1.25,
      );
    }
  }

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
      // A pick renders a frame only when the view has no last frame to
      // read it from (see `serveIdlePick`).
      if (
        all ||
        changed ||
        (view.pendingPicks.length > 0 && !this.viewFrames.get(view)?.rendered)
      ) {
        dirty.add(view.target);
        dirtyViews.add(view);
      }
    }
    // Selection runs when a camera moved or content streams; a frame then
    // renders only for the views that can see what changed.
    this.updateTilesets((tileset) => all || moved || tileset.active);
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
    this.serveIdlePick(dirtyViews);
    if (dirty.size === 0) {
      for (let i = 0; i < this.worlds.length; i++) {
        this.worlds[i]!.changedViews = 0; // seen by no view
      }
      this.stats.idle = true;
      return;
    }
    this.render(true, dirty, dirtyViews);
  }

  /**
   * Serves one pick of a view that doesn't render this tick from its last
   * frame's feature IDs and depth, which still show what is on screen: just
   * the pick pass, no render (hovering picks on every pointer move).
   */
  private serveIdlePick(rendering: Set<View>): void {
    const views = this.views;
    for (let i = 0; i < views.length; i++) {
      const view = views[i]!;
      const frame = this.viewFrames.get(view);
      if (
        !view.enabled ||
        rendering.has(view) ||
        view.pendingPicks.length === 0 ||
        !frame?.rendered
      ) {
        continue;
      }
      const encoder = this.ctx.device.createCommandEncoder(PICK_ENCODER);
      this.encodePick(encoder, view, frame, view.pendingPicks.shift()!);
      this.commandBuffers[0] = encoder.finish();
      this.ctx.device.queue.submit(this.commandBuffers);
      this.resolvePicks(this.picks);
      this.picks.length = 0;
      return; // one per tick: the params and result buffers are shared
    }
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
      const dpr = target.pixelRatio;
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
    s[n++] = this.updateExposure(view);
    s[n++] = view.clearColor[0];
    s[n++] = view.clearColor[1];
    s[n++] = view.clearColor[2];
    s[n++] =
      view.background === "atmosphere"
        ? (view.sunDisk ? 2 : 1) + (view.aerialPerspective ? 4 : 0)
        : 0;
    s[n++] = view.outputEncoding === "srgb" ? 0 : 1;
    const sun = view.lighting.sunIlluminance;
    s[n++] = sun === "atmosphere" ? -1 : sun;
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
      this.updateTilesets(() => true);
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
      this.updateEnvironment(view);
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
        frame.rendered = true;
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
    for (const meter of this.meters.splice(0)) {
      void meter.readback.mapAsync(GPUMapMode.READ).then(() => {
        const [sum, count] = new Float32Array(meter.readback.getMappedRange());
        meter.readback.destroy();
        meter.scratch.forEach((b) => b.destroy());
        this.adaptExposure(
          meter.view,
          count! > 0 ? 2 ** (sum! / count!) : undefined,
        );
      });
    }
    for (const read of this.hdrReads.splice(0)) {
      void read.buffer.mapAsync(GPUMapMode.READ).then(() => {
        const halves = new Uint16Array(read.buffer.getMappedRange());
        const data = new Float32Array(read.width * read.height * 4);
        const rowHalves = read.bytesPerRow / 2;
        const unexpose = 1 / read.exposure;
        for (let y = 0; y < read.height; y++) {
          for (let i = 0; i < read.width * 4; i++) {
            const value = halfToFloat(halves[y * rowHalves + i]!);
            data[y * read.width * 4 + i] =
              i % 4 === 3 ? value : value * unexpose;
          }
        }
        read.buffer.unmap();
        read.buffer.destroy();
        const image = { width: read.width, height: read.height, data };
        for (const resolve of read.resolvers) {
          resolve(image);
        }
      });
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
    block.iblFrame = environmentFrame(camera.position, view.body.ellipsoid);
    block.lighting = view.lighting;
    block.specularMaxLod = this.ctx.environment.maxLod;
    block.exposure = view.exposureScale;
    block.body = view.body;
    block.aerial = undefined;
    if (drawsSky(view)) {
      const sky = this.viewFrames.get(view)!.sky;
      this.sky.write(
        sky,
        view.body.ellipsoid,
        camera,
        aspect,
        rect.width,
        rect.height,
        this.sunDirection,
        view.exposureScale,
        view.sunDisk,
      );
      if (drawsAerialPerspective(view)) {
        block.aerial = { origin: sky.origin };
      }
    }
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

  /** Reads a pick's feature ID and depth from the view's frame textures. */
  /**
   * The view's exposure scale this frame: fixed for an EV100 or a scale;
   * automatic exposure moves toward its meter reading (`meterExposure`).
   */
  private updateExposure(view: View): number {
    const e = view.exposure;
    if ("scale" in e) {
      view.exposureScale = e.scale;
    } else if ("ev100" in e) {
      view.exposureScale = ev100ToScale(e.ev100);
    } else {
      view.autoExposure ??= {
        ev100: Math.min(Math.max(15, e.min ?? -6), e.max ?? 18),
        time: performance.now(),
        pending: false,
        metered: false,
      };
      view.exposureScale = ev100ToScale(view.autoExposure.ev100);
    }
    return view.exposureScale;
  }

  /**
   * Automatic exposure, from a meter reading (average luminance, the
   * scene's units): the EV100 a reflected-light meter gives (K = 12.5,
   * ISO 100) minus the compensation, within [min, max], approached
   * exponentially at `speed` per second; the first reading is taken as is.
   * Renders again until it settles.
   */
  private adaptExposure(view: View, average: number | undefined): void {
    const e = view.exposure;
    const state = view.autoExposure;
    if (!("auto" in e) || !state) {
      return;
    }
    state.pending = false;
    if (average === undefined) {
      return;
    }
    const target = Math.min(
      Math.max(
        Math.log2((average * 100) / 12.5) - (e.compensation ?? 0),
        e.min ?? -6,
      ),
      e.max ?? 18,
    );
    const now = performance.now();
    if (!state.metered) {
      state.ev100 = target;
      state.metered = true;
    } else {
      const dt = Math.min((now - state.time) / 1000, 1);
      state.ev100 +=
        (target - state.ev100) * (1 - Math.exp(-dt * (e.speed ?? 2)));
    }
    state.time = now;
    if (Math.abs(target - state.ev100) > 0.02) {
      this.requestRender();
    }
  }

  private encodePick(
    enc: GPUCommandEncoder,
    view: View,
    frame: ViewFrame,
    request: View["pendingPicks"][number],
  ): void {
    const { device, pipelines } = this.ctx;
    const { width, height } = frame;
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
        { binding: 0, resource: frame.idsView },
        { binding: 1, resource: { buffer: this.pickParams } },
        { binding: 2, resource: { buffer: this.pickResult } },
        { binding: 3, resource: frame.depthView },
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
    // The camera of this frame, to turn the depth into a position.
    const camera = view.camera;
    this.picks.push({
      view,
      readback,
      request,
      camera: {
        position: Float64Array.from(camera.position),
        direction: Float64Array.from(camera.direction),
        up: Float64Array.from(camera.up),
        right: Float64Array.from(camera.right),
        near: camera.near,
        tanY: Math.tan(camera.fovy(width / height) / 2),
        tanX: Math.tan(camera.fovy(width / height) / 2) * (width / height),
        ndcX: ((this.pickParamsData[0]! + 0.5) / width) * 2 - 1,
        ndcY: 1 - ((this.pickParamsData[1]! + 0.5) / height) * 2,
      },
    });
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
        destroyViewFrame(frame);
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
      // COPY_SRC: `View.readHdr`.
      usage:
        attachment | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC,
    });
    // Display-referred (unlit) color, resolved for the present pass.
    const display = graph.createTexture("display.msaa", {
      width,
      height,
      format: "rgba8unorm-srgb",
      sampleCount: targets.sampleCount,
      usage: attachment,
    });
    const displayResolved = graph.createTexture("display", {
      width,
      height,
      format: "rgba8unorm-srgb",
      usage: attachment | GPUTextureUsage.TEXTURE_BINDING,
    });
    // Feature IDs and depth are the view's own, not pooled: what the last
    // frame left in them serves picks while the view is idle, without a
    // render. Read by the pick pass (features, positions).
    const idsTexture = device.createTexture({
      label: "featureId.msaa",
      size: [width, height],
      format: "rg16uint",
      sampleCount: targets.sampleCount,
      usage: attachment | GPUTextureUsage.TEXTURE_BINDING,
    });
    const depthTexture = device.createTexture({
      label: "depth.msaa",
      size: [width, height],
      format: targets.depthFormat,
      sampleCount: targets.sampleCount,
      usage: attachment | GPUTextureUsage.TEXTURE_BINDING,
    });
    const idsView = idsTexture.createView();
    const depthView = depthTexture.createView();
    const ids = graph.importTexture("featureId.msaa", idsView);
    const depth = graph.importTexture("depth.msaa", depthView);
    // Rebound to this frame's target texture before every execute.
    const output = graph.importTexture("output", {} as GPUTextureView);

    // Alpha 0 where nothing is drawn: the exposure meter leaves it out.
    const clearColor: GPUColorDict = { r: 0, g: 0, b: 0, a: 0 };
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
    const opaqueDisplay: GPURenderPassColorAttachment = {
      view: undefined as never,
      resolveTarget: undefined,
      clearValue: { r: 0, g: 0, b: 0, a: 0 },
      loadOp: "clear",
      storeOp: "discard",
    };
    const opaqueDepth: GPURenderPassDepthStencilAttachment = {
      view: undefined as never,
      depthClearValue: 0, // reverse-Z: far is 0
      depthLoadOp: "clear",
      depthStoreOp: "store", // picks read it, also while the view is idle
    };
    const opaquePass: GPURenderPassDescriptor = {
      label: "opaque",
      colorAttachments: [opaqueColor, opaqueIds, opaqueDisplay],
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
      ids: idsTexture,
      depth: depthTexture,
      idsView,
      depthView,
      rendered: false,
      presentParams: device.createBuffer({
        label: "presentParams",
        size: 16,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      }),
      presentGroup: undefined,
      presentSource: undefined,
      presentDisplay: undefined,
      sky: this.sky.createView(),
    };
    this.sky.writeWeights(frame.sky);

    graph.addPass("select-view", { sideEffect: true }, (enc) => {
      enc.copyBufferToBuffer(
        this.viewStaging,
        frame.slot * VIEW_STRIDE,
        this.ctx.currentViewBuffer,
        0,
        VIEW_SIZE,
      );
    });

    graph.addPass("cull", { sideEffect: true }, (enc) => {
      view.world.encodeCull(enc, this.timer.passWrites());
    });

    // The sky around the camera, before the opaque pass draws from it.
    graph.addPass("sky-view", { sideEffect: true }, (enc) => {
      if (drawsSky(view) && frame.sky.inside) {
        this.sky.encodeTable(enc, frame.sky, this.timer.passWrites());
      }
    });

    // The view's environment lighting, rebuilt from its sky if due.
    graph.addPass("environment", { sideEffect: true }, (enc) => {
      this.encodeEnvironment(enc, view, frame);
    });

    // The air between the camera and the scene, for the opaque pass.
    graph.addPass("aerial-perspective", { sideEffect: true }, (enc) => {
      if (drawsAerialPerspective(view)) {
        this.sky.encodeAerial(enc, frame.sky);
      }
    });

    graph.addPass(
      "opaque",
      { writes: [color, resolved, ids, display, displayResolved, depth] },
      (enc, get) => {
        const atmosphere = drawsSky(view);
        clearColor.r = atmosphere ? 0 : view.clearColor[0];
        clearColor.g = atmosphere ? 0 : view.clearColor[1];
        clearColor.b = atmosphere ? 0 : view.clearColor[2];
        opaqueColor.view = get(color);
        opaqueColor.resolveTarget = get(resolved);
        opaqueIds.view = get(ids);
        opaqueDisplay.view = get(display);
        opaqueDisplay.resolveTarget = get(displayResolved);
        opaqueDepth.view = get(depth);
        opaquePass.timestampWrites = this.timer.passWrites();
        const pass = enc.beginRenderPass(opaquePass);
        frame.bundles[0] = frame.bundle!;
        pass.executeBundles(frame.bundles);
        if (atmosphere) {
          this.sky.draw(pass, frame.sky);
        }
        pass.end();
      },
    );

    graph.addPass(
      "hdr-readback",
      { reads: [resolved], sideEffect: true },
      (enc, get) => {
        if (view.pendingHdrReads.length === 0) {
          return;
        }
        get(resolved);
        const bytesPerRow = Math.ceil((width * 8) / 256) * 256;
        const buffer = device.createBuffer({
          label: "view.hdr.readback",
          size: bytesPerRow * height,
          usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
        });
        enc.copyTextureToBuffer(
          { texture: graph.texture(resolved)! },
          { buffer, bytesPerRow },
          [width, height],
        );
        this.hdrReads.push({
          buffer,
          bytesPerRow,
          width,
          height,
          exposure: view.exposureScale,
          resolvers: view.pendingHdrReads.splice(0),
        });
      },
    );

    graph.addPass(
      "meter",
      { reads: [resolved], sideEffect: true },
      (enc, get) => {
        const auto = view.autoExposure;
        if (!("auto" in view.exposure) || !auto || auto.pending) {
          return;
        }
        auto.pending = true;
        const params = device.createBuffer({
          size: 16,
          usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
        const data = new ArrayBuffer(16);
        new Float32Array(data, 0, 1)[0] = view.exposureScale;
        new Uint32Array(data, 4, 2).set([width, height]);
        device.queue.writeBuffer(params, 0, data);
        const result = device.createBuffer({
          size: 8,
          usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
        });
        const readback = device.createBuffer({
          size: 8,
          usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
        });
        const pass = enc.beginComputePass({ label: "meter" });
        pass.setPipeline(pipelines.meter);
        pass.setBindGroup(
          0,
          device.createBindGroup({
            layout: pipelines.meter.getBindGroupLayout(0),
            entries: [
              { binding: 0, resource: get(resolved) },
              { binding: 1, resource: { buffer: params } },
              { binding: 2, resource: { buffer: result } },
            ],
          }),
        );
        pass.dispatchWorkgroups(1);
        pass.end();
        enc.copyBufferToBuffer(result, 0, readback, 0, 8);
        this.meters.push({ view, readback, scratch: [params, result] });
      },
    );

    graph.addPass("pick", { reads: [ids, depth], sideEffect: true }, (enc) => {
      const request = frame.pick;
      if (request) {
        frame.pick = undefined;
        this.encodePick(enc, view, frame, request);
      }
    });

    graph.addPass(
      "present",
      { reads: [resolved, displayResolved], writes: [output] },
      (enc, get) => {
        const params = this.presentData;
        params.setFloat32(0, x, true);
        params.setFloat32(4, y, true);
        params.setFloat32(8, 1, true);
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
        const shown = get(displayResolved);
        if (frame.presentSource !== source || frame.presentDisplay !== shown) {
          frame.presentSource = source;
          frame.presentDisplay = shown;
          frame.presentGroup = device.createBindGroup({
            layout: pipelines.present.getBindGroupLayout(0),
            entries: [
              { binding: 0, resource: source },
              { binding: 1, resource: { buffer: frame.presentParams } },
              { binding: 2, resource: shown },
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
    for (const { view, readback, request, camera: c } of picks) {
      void readback.mapAsync(GPUMapMode.READ).then(() => {
        const words = new Uint32Array(readback.getMappedRange());
        const featureId = words[0]!;
        const depth = new Float32Array(words.buffer, 4, 1)[0]!;
        readback.unmap();
        this.pickReadback.push(readback);
        if (request.resolvePosition) {
          // Reverse-Z, infinite far: distance along the view axis is
          // near / depth.
          if (!(depth > 0)) {
            request.resolvePosition(undefined);
            return;
          }
          // Underlay draws (the bare ellipsoid) scale their depth down.
          const z =
            c.near / (depth <= UNDERLAY_DEPTH ? depth / UNDERLAY_DEPTH : depth);
          const p = new Float64Array(3);
          for (let i = 0; i < 3; i++) {
            p[i] =
              c.position[i]! +
              z *
                (c.direction[i]! +
                  c.ndcX * c.tanX * c.right[i]! +
                  c.ndcY * c.tanY * c.up[i]!);
          }
          request.resolvePosition(p);
          return;
        }
        const resolve = request.resolve!;
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
    this.sky.atmosphere.destroy();
    this.sky.sunLight.destroy();
    this.sky.aerialInscatter.destroy();
    this.sky.aerialTransmittance.destroy();
    this.workers.destroy();
    this.gpu.destroy();
  }
}

interface PendingPick {
  view: View;
  readback: GPUBuffer;
  request: View["pendingPicks"][number];
  camera: {
    position: Float64Array;
    direction: Float64Array;
    up: Float64Array;
    right: Float64Array;
    near: number;
    tanX: number;
    tanY: number;
    ndcX: number;
    ndcY: number;
  };
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
  /** The view's own feature IDs and depth (picks read the last frame's). */
  readonly ids: GPUTexture;
  readonly depth: GPUTexture;
  readonly idsView: GPUTextureView;
  readonly depthView: GPUTextureView;
  /** Rendered since built: `ids` and `depth` show what is on screen. */
  rendered: boolean;
  readonly presentParams: GPUBuffer;
  presentGroup: GPUBindGroup | undefined;
  presentSource: GPUTextureView | undefined;
  presentDisplay: GPUTextureView | undefined;
  /** The sky's uniform for this view (`View.background` "atmosphere"). */
  readonly sky: SkyView;
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
const PICK_ENCODER: GPUCommandEncoderDescriptor = { label: "pick" };

/**
 * The view shows its body's sky. Without an atmosphere the sky is black
 * (the stars and the sun's disk there come with the night sky).
 */
function drawsSky(view: View): boolean {
  return view.background === "atmosphere" && view.body.atmosphere !== undefined;
}

/** The view shows its atmosphere's air between the camera and the scene. */
function drawsAerialPerspective(view: View): boolean {
  return drawsSky(view) && view.aerialPerspective;
}

function destroyViewFrame(frame: ViewFrame): void {
  frame.presentParams.destroy();
  frame.sky.buffer.destroy();
  frame.sky.table.destroy();
  frame.sky.faceUniforms.destroy();
  frame.ids.destroy();
  frame.depth.destroy();
}

const scratchEnu = m4.mat4();
const scratchEast = v3.vec3();
const scratchUp = v3.vec3();
const scratchSouth = v3.vec3();
const scratchFrame: [Vec3, Vec3, Vec3] = [scratchEast, scratchUp, scratchSouth];

/**
 * Environment-map frame at `position`: x = east, y = up, z = −north, the y-up
 * convention CesiumJS 1.x also uses for image-based lighting.
 */
/** An IEEE half-precision float's value. */
function halfToFloat(h: number): number {
  const sign = h & 0x8000 ? -1 : 1;
  const exponent = (h >> 10) & 0x1f;
  const fraction = h & 0x3ff;
  if (exponent === 0) {
    return sign * 2 ** -14 * (fraction / 1024);
  }
  if (exponent === 31) {
    return fraction ? Number.NaN : sign * Number.POSITIVE_INFINITY;
  }
  return sign * 2 ** (exponent - 15) * (1 + fraction / 1024);
}

export function environmentFrame(
  position: Vec3,
  ellipsoid: Ellipsoid = Ellipsoid.WGS84,
): [Vec3, Vec3, Vec3] {
  const enu = eastNorthUpToFixedFrame(position, ellipsoid, scratchEnu);
  v3.set(scratchEast, enu[0]!, enu[1]!, enu[2]!);
  v3.set(scratchUp, enu[8]!, enu[9]!, enu[10]!);
  v3.set(scratchSouth, -enu[4]!, -enu[5]!, -enu[6]!);
  return scratchFrame;
}

const scratchView = m4.mat4();
const scratchCartographic: Cartographic = {
  longitude: 0,
  latitude: 0,
  height: 0,
};
const scratchProj = m4.mat4();
const scratchViewProj = m4.mat4();
const scratchPlanes = new Float32Array(20);
