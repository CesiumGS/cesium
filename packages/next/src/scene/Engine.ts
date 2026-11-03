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
  AO_MAX_PIXELS,
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
  type ToneMapping,
  type ViewOptions,
} from "./View.ts";
import { ViewLink, type ViewLinkOptions } from "./ViewLink.ts";
import { RealtimeAtmosphere } from "../atmosphere/RealtimeAtmosphere.ts";
import { Sky, type SkyView } from "../atmosphere/Sky.ts";
import { MOON_ALBEDO, MOON_RADIUS, moonPhaseBrightness } from "../time/moon.ts";
import type { AerosolType } from "../atmosphere/model.ts";
import { EARTH } from "./Body.ts";
import {
  EYE_ADAPTATION_SPEED,
  SCOTOPIC_WHITE,
  adapt,
  eyeResponse,
} from "./eye.ts";
import type { StarField } from "../atmosphere/stars.ts";
import { Camera } from "./Camera.ts";
import {
  SHADOW_CASCADES,
  SHADOWS_SIZE,
  SHADOWS_STRIDE,
  createShadowCascades,
  fitShadowCascades,
  shadowRange,
  writeShadows,
} from "./shadows.ts";
import { CityLight } from "../globe/cityLight.ts";
import {
  CLUSTERS,
  LIGHTS_SIZE,
  LIGHT_FLOATS,
  LIGHT_HEADER_FLOATS,
  packViewLights,
} from "./lights.ts";
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

/** Tone mappings by their index in present.wgsl's `PresentParams`. */
const TONE_MAPPINGS: readonly ToneMapping[] = ["pbrNeutral", "agx", "aces"];

export interface EngineOptions extends GpuDeviceOptions {
  maxViews?: number;
  /** Replace built-in shaders with complete WGSL modules (e.g. from Slang). */
  shaders?: ShaderOverrides;
  /**
   * The Earth air's visibility, km (default 60, a clear day; null: the
   * reference atmosphere's own, about 220 km).
   */
  visibility?: number | null;
  /** What the haze is made of (default "continental"). */
  aerosol?: AerosolType;
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

/** Words before the translucent lists' heads (translucent.wgsl `LIST_HEADER`). */
const LIST_HEADER = 4;

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
  /**
   * The Earth at night, as light the surface emits (cities, roads, ships):
   * an image of it (e.g. NASA's Black Marble, `IonTmsImagery.fromIon(3812)`),
   * its brightest white `CITY_LIGHTS_LUMINANCE`. Seen at night (by day the
   * sunlit ground is ten thousand times brighter).
   */
  lights?: ImageryProvider | Promise<ImageryProvider | undefined>;
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
  /**
   * The celestial frame's rotation to Earth-fixed axes (row-major 3 × 3,
   * `icrfToFixed(time)`): turns the stars. Identity until set (the Viewer
   * sets it from its clock, with the sun).
   */
  readonly icrfToFixed = new Float64Array([1, 0, 0, 0, 1, 0, 0, 0, 1]);
  /**
   * The Moon's center, meters from the Earth's center in Earth-fixed axes
   * (`moonPosition(time)` turned by `icrfToFixed`): drawn in the sky (its
   * phase from the sun) and lighting the scene at night. Undefined (the
   * default): no Moon; the Viewer sets it from its clock.
   */
  moonPosition: Float64Array | undefined = undefined;
  /**
   * The Moon's axes in Earth-fixed axes (`moonAxes(time)` turned by
   * `icrfToFixed`): `[0..2]` toward its longitude and latitude 0, `[3..5]`
   * its north pole; its face turns with them (libration). Undefined: it
   * faces the Earth's center, north to the ecliptic's pole.
   */
  moonAxes: Float64Array | undefined = undefined;

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
  /**
   * Per view slot: a view block per shadow cascade (the sun's projection
   * and box, for culling and drawing the casters), and the receivers'
   * `Shadows` uniform; staged like the views' blocks.
   */
  private readonly cascadeData: Float32Array;
  private readonly cascadeDataU32: Uint32Array;
  private readonly cascadeStaging: GPUBuffer;
  private readonly shadowData: Float32Array;
  private readonly shadowStaging: GPUBuffer;
  /** The night lights' mean around each view's camera (`cityLightAt`). */
  private readonly cityLights = new WeakMap<ImageryProvider, CityLight>();
  private readonly cityLightPlaces = new WeakMap<
    View,
    { city: CityLight; longitude: number; latitude: number; light: number }
  >();
  /** This frame's view's city light, cd/m² (`cityLightAt`). */
  private viewCityLight = 0;
  /** Each drawn view's lights (lights.ts `packViewLights`), by slot. */
  private readonly lightStaging: GPUBuffer;
  private readonly lightData = new Float32Array(LIGHTS_SIZE / 4);
  private readonly cascades = createShadowCascades();
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
    {
      probe: EnvironmentProbe;
      key: Float64Array;
      /** The exposure it was built at (its sky is pre-exposed). */
      exposure: number;
      pending: boolean;
    }
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
  /** Depth ranges reduced this frame (`depthRange.wgsl`), mapped after submit. */
  private readonly depthRanges: Array<{
    frame: ViewFrame;
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
  /**
   * Translucency's per-pixel lists ("exact", translucent.wgsl), shared by
   * the views (each clears and fills them in turn): the nodes they hold,
   * grown when a frame needed more (its count read back, one at a time).
   */
  private lists?: GPUBuffer;
  private listNodes = 0;
  private listCountPending = false;
  private readonly listCounts: GPUBuffer[] = [];
  /** Bound where a translucent pass doesn't read the lists or moments. */
  private translucentDummies?: {
    buffer: GPUBuffer;
    zero: GPUTextureView;
    higher: GPUTextureView;
  };
  private readonly translucentData = new DataView(new ArrayBuffer(32));
  private readonly presentData = new DataView(new ArrayBuffer(48));
  private readonly adaptData = new Float32Array(4);
  /** The eye's local adaptation grid, sampled trilinearly. */
  private adaptSampler?: GPUSampler;
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
    this.cascadeData = new Float32Array(
      (maxViews * SHADOW_CASCADES * VIEW_STRIDE) / 4,
    );
    this.cascadeDataU32 = new Uint32Array(this.cascadeData.buffer);
    this.cascadeStaging = device.createBuffer({
      label: "cascadeStaging",
      size: maxViews * SHADOW_CASCADES * VIEW_STRIDE,
      usage: GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
    });
    this.shadowData = new Float32Array((maxViews * SHADOWS_STRIDE) / 4);
    this.shadowStaging = device.createBuffer({
      label: "shadowStaging",
      size: maxViews * SHADOWS_STRIDE,
      usage: GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
    });
    this.lightStaging = device.createBuffer({
      label: "lightStaging",
      size: maxViews * LIGHTS_SIZE,
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
      moon: undefined,
      moonAir: 0,
      cityLights: true,
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
        aerialScreenInscatter: sky.aerialScreen[0].createView(),
        aerialScreenTransmittance: sky.aerialScreen[1].createView(),
        air: sky.air,
        airTransmittance: sky.airTransmittance.createView({
          dimension: "2d-array",
        }),
        airScattering: sky.airScattering.createView({
          dimension: "2d-array",
        }),
      },
      options.shaders,
    );
    // M0: device-loss recovery stops at the device. Rebuilding worlds from
    // their CPU-side sources arrives with the streaming cache (M2).
    const engine = new Engine(gpu, ctx, sky, options.maxViews ?? 16);
    engine.setHaze(
      options.visibility === undefined ? 60 : (options.visibility ?? undefined),
      options.aerosol ?? "continental",
    );
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
   * altitude); by night, when the Moon has moved as much or its light by
   * 10%; and when the exposure has moved by a stop (the sky it's built
   * from is pre-exposed: a night sky at a day's exposure is below fp16's
   * smallest values). About 10 ms of GPU work each time (plan §4.2: to
   * cut).
   */
  private updateEnvironment(view: View): void {
    if (view.lighting.environment !== "atmosphere" || !view.body.atmosphere) {
      return;
    }
    let entry = this.probes.get(view);
    if (!entry) {
      entry = {
        probe: this.ctx.environment.createProbe("env.view"),
        key: new Float64Array(9).fill(Number.NaN),
        exposure: Number.NaN,
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
    // The Moon by night (the air's share is 0 by day), and the exposure.
    const moon = this.viewBlock.moonAir > 0 ? this.viewBlock.moon : undefined;
    const moonEast = moon ? v3.dot(frame[0], moon.direction) : 0;
    const moonUp = moon ? v3.dot(frame[1], moon.direction) : 0;
    const moonSouth = moon ? v3.dot(frame[2], moon.direction) : 0;
    const moonLight = this.viewBlock.moonAir;
    const moonTurned = Math.hypot(
      moonEast - k[4]!,
      moonUp - k[5]!,
      moonSouth - k[6]!,
    );
    const moonChanged =
      moonLight === 0
        ? k[7] !== 0
        : !(Math.abs(Math.log(moonLight / k[7]!)) <= 0.1);
    const stops = Math.abs(Math.log2(view.exposureScale / entry.exposure));
    // The city's light (its glow, its ground) by 10%.
    const city = this.viewCityLight;
    const cityChanged =
      city === 0 ? k[8] !== 0 : !(Math.abs(Math.log(city / k[8]!)) <= 0.1);
    // NaN (never built) compares false: rebuild.
    if (
      turned <= 0.002 &&
      climbed <= 0.1 &&
      moonTurned <= 0.002 &&
      !moonChanged &&
      !cityChanged &&
      stops <= 1
    ) {
      return;
    }
    k[0] = east;
    k[1] = up;
    k[2] = south;
    k[3] = altitude;
    k[4] = moonEast;
    k[5] = moonUp;
    k[6] = moonSouth;
    k[7] = moonLight;
    k[8] = city;
    entry.exposure = view.exposureScale;
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

  /**
   * The stars behind the sky (the night sky), from a star map as 1.x's
   * Tycho map is laid out: six square faces of a cube in the celestial
   * frame (ICRF), +x, −x, +y, −y, +z, −z, sRGB, each star a texel or a
   * small disk. Read out in a worker into points with their brightness and
   * a background (atmosphere/stars.ts), drawn as points. They show as the
   * exposure opens at night, dimmed by the air; null: none.
   */
  setStarMap(faces: readonly (string | URL)[] | null): void {
    const token = ++this.starToken;
    if (!faces) {
      this.sky.setStarField(null);
      this.requestRender();
      return;
    }
    const urls = faces.map((url) => new URL(url, location.href).href);
    void this.workers.request<StarField>("stars", { urls }).then(
      (field) => {
        if (token === this.starToken) {
          this.sky.setStarField(field);
          this.requestRender();
        }
      },
      () => {},
    );
  }

  private starToken = 0;

  /**
   * The Moon's albedo map: equirectangular, longitude 0 (the near side's
   * center) in the middle, north up, sRGB (1.x's `moonSmall.jpg`); only
   * its pattern counts (the disk's brightness follows the Moon's albedo and
   * phase). Null: a uniform disk.
   */
  setMoonMap(image: ImageBitmap | null): void {
    this.sky.setMoonMap(image);
    this.requestRender();
  }

  /**
   * The Moon as a camera at `position` (Earth-fixed, m) sees it, for the
   * sky, and its light, for the scene; undefined without `moonPosition`.
   */
  private moonFrom(position: Vec3): typeof scratchMoon | undefined {
    const moon = this.moonPosition;
    if (!moon) {
      return undefined;
    }
    const m = scratchMoon;
    const toward = v3.sub(m.direction, moon, position);
    const distance = v3.length(toward);
    v3.scale(toward, toward, 1 / distance);
    const axes = this.moonAxes;
    const north = m.north;
    if (axes) {
      for (let i = 0; i < 3; i++) {
        m.meridian[i] = axes[i]!;
        north[i] = axes[i + 3]!;
      }
    } else {
      // Its face toward the Earth's center; its pole the ecliptic's (1.5°
      // off), turned to Earth-fixed axes and square to the face's axis.
      v3.normalize(m.meridian, v3.negate(m.meridian, moon));
      const r = this.icrfToFixed;
      const ey = -Math.sin(OBLIQUITY);
      const ez = Math.cos(OBLIQUITY);
      for (let i = 0; i < 3; i++) {
        north[i] = r[i * 3 + 1]! * ey + r[i * 3 + 2]! * ez;
      }
      v3.normalize(
        north,
        v3.sub(
          north,
          north,
          v3.scale(scratchMoonAxis, m.meridian, v3.dot(north, m.meridian)),
        ),
      );
    }
    // Toward the sun from the Moon (the sun's direction is the Earth's).
    const sun = this.sunDirection;
    for (let i = 0; i < 3; i++) {
      m.toSun[i] = sun[i]! * ASTRONOMICAL_UNIT - moon[i]!;
    }
    v3.normalize(m.toSun, m.toSun);
    m.sinRadius = Math.min(MOON_RADIUS / distance, 1);
    m.earthRadius = Math.min(EARTH_RADIUS / v3.length(moon), 1);
    m.phaseAngle = Math.acos(
      Math.min(Math.max(-v3.dot(m.toSun, toward), -1), 1),
    );
    return m;
  }

  /**
   * How far one can see through the Earth's air, km: the haze of its
   * aerosols (the sky, aerial perspective and the sun's light all follow).
   * Default 60 km, a fair, clear day; Bruneton's reference atmosphere (no
   * value) is about 220 km, very clean air.
   */
  get visibility(): number | undefined {
    return this.sky.atmosphere.visibility;
  }

  set visibility(kilometers: number | undefined) {
    this.setHaze(kilometers, this.aerosol);
  }

  /**
   * What the Earth air's haze is made of (`AEROSOLS`): fine continental
   * particles by default (a bluish haze), urban, maritime or desert dust.
   */
  get aerosol(): AerosolType | undefined {
    return this.sky.atmosphere.aerosol;
  }

  set aerosol(aerosol: AerosolType | undefined) {
    this.setHaze(this.visibility, aerosol);
  }

  private setHaze(
    kilometers: number | undefined,
    aerosol: AerosolType | undefined,
  ): void {
    if (kilometers === this.visibility && aerosol === this.aerosol) {
      return;
    }
    this.sky.setHaze(kilometers, aerosol);
    // Every view's environment from the new air.
    for (const entry of this.probes.values()) {
      entry.key.fill(Number.NaN);
    }
    this.requestRender();
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
    if (options.lights) {
      void Promise.resolve(options.lights).then(
        (provider) => {
          if (provider && this.tilesets.includes(tileset)) {
            tileset.lights = new GlobeImagery(
              this.ctx,
              world,
              provider,
              this.requests,
              this.workers,
              { role: "lights" },
            );
            this.requestRender();
          }
        },
        () => undefined,
      );
    }
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
    s[n++] = TONE_MAPPINGS.indexOf(view.toneMapping);
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
      // After the world's transforms are resolved for the frame.
      this.writeTranslucency(view);
    }
    device.queue.writeBuffer(
      this.viewStaging,
      0,
      this.viewData,
      0,
      (slots * VIEW_STRIDE) / 4,
    );
    device.queue.writeBuffer(
      this.cascadeStaging,
      0,
      this.cascadeData,
      0,
      (slots * SHADOW_CASCADES * VIEW_STRIDE) / 4,
    );
    device.queue.writeBuffer(
      this.shadowStaging,
      0,
      this.shadowData,
      0,
      (slots * SHADOWS_STRIDE) / 4,
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
        const [sum, count, rodSum, rodCount] = new Float32Array(
          meter.readback.getMappedRange(),
        );
        meter.readback.destroy();
        meter.scratch.forEach((b) => b.destroy());
        this.adaptExposure(
          meter.view,
          count! > 0 ? 2 ** (sum! / count!) : undefined,
          rodCount! > 0 ? 2 ** (rodSum! / rodCount!) : undefined,
        );
      });
    }
    for (const range of this.depthRanges.splice(0)) {
      void range.readback.mapAsync(GPUMapMode.READ).then(() => {
        const [near, far] = new Float32Array(range.readback.getMappedRange());
        range.readback.destroy();
        range.scratch.forEach((b) => b.destroy());
        range.frame.rangePending = false;
        // Nothing but sky: no range.
        range.frame.depthRange =
          far! > 0 && near! <= far! ? { near: near!, far: far! } : undefined;
      });
    }
    for (const readback of this.listCounts.splice(0)) {
      void readback.mapAsync(GPUMapMode.READ).then(() => {
        const needed = new Uint32Array(readback.getMappedRange())[0]!;
        readback.destroy();
        this.listCountPending = false;
        // Room for a quarter more than the frame needed (`writeTranslucency`).
        if (needed > this.listNodes) {
          this.listNodes = Math.ceil(needed * 1.25);
        }
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

  /**
   * The light the ground around a view's camera emits, cd/m² (its
   * world's globe's night lights, cityLight.ts), for the sky's glow and
   * the environment's ground; 0 without them or `View.cityLights`. Read
   * again as the camera moves half a kilometer, or a tile arrives.
   */
  private cityLightAt(view: View): number {
    if (!view.cityLights) {
      return 0;
    }
    const provider = this.tilesets.find(
      (t) => t.world === view.world && t.lights,
    )?.lights?.provider;
    if (!provider) {
      return 0;
    }
    let city = this.cityLights.get(provider);
    if (!city) {
      city = new CityLight(provider, () => {
        this.cityLightRead++;
        this.requestRender();
      });
      this.cityLights.set(provider, city);
    }
    const c = view.body.ellipsoid.cartesianToCartographic(
      view.camera.position,
      scratchCartographic,
    );
    if (!c) {
      return 0;
    }
    const last = this.cityLightPlaces.get(view);
    const moved = last
      ? Math.hypot(
          (c.longitude - last.longitude) * Math.cos(c.latitude),
          c.latitude - last.latitude,
        ) * 6_371_000
      : Infinity;
    if (
      last?.city === city &&
      moved < 500 &&
      this.cityLightRead === this.cityLightSeen
    ) {
      return last.light;
    }
    this.cityLightSeen = this.cityLightRead;
    const light = city.around(c.longitude, c.latitude);
    if (light === undefined) {
      // Its tiles on their way (they render again as they come).
      return last?.light ?? 0;
    }
    this.cityLightPlaces.set(view, {
      city,
      longitude: c.longitude,
      latitude: c.latitude,
      light,
    });
    return light;
  }
  private cityLightRead = 0;
  private cityLightSeen = 0;

  /**
   * A view's point and spot lights, culled to it, camera-relative, into
   * its slot of the staging buffer (copied in before its opaque pass).
   */
  private writeLights(view: View, index: number, aspect: number): void {
    const frame = this.viewFrames.get(view)!;
    const camera = view.camera;
    const tanY = Math.tan(camera.fovy(aspect) / 2);
    const count = packViewLights(
      this.lightData,
      0,
      (visit) => view.world.forEachLight(visit),
      {
        position: camera.position,
        direction: camera.direction,
        up: camera.up,
        right: camera.right,
        near: camera.near,
        tanX: tanY * aspect,
        tanY,
      },
      view.exposureScale,
    );
    frame.lightCount = count;
    this.ctx.device.queue.writeBuffer(
      this.lightStaging,
      index * LIGHTS_SIZE,
      this.lightData,
      0,
      LIGHT_HEADER_FLOATS + count * LIGHT_FLOATS,
    );
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
    block.cityLights = view.cityLights;
    this.viewCityLight = this.cityLightAt(view);
    block.aerial = undefined;
    // The Moon's light: its full disk gives the albedo's share of the sun's
    // light times its solid angle over π, then less by phase (Allen).
    const moon = this.moonFrom(camera.position);
    const moonShare = moon
      ? MOON_ALBEDO *
        moon.sinRadius *
        moon.sinRadius *
        moonPhaseBrightness(moon.phaseAngle)
      : 0;
    block.moon = moon && { direction: moon.direction, share: moonShare };
    // The air's light by the Moon: only by night (by day the sun's is a
    // million times more).
    if (moon) {
      const up = v3.normalize(scratchMoonAxis, camera.position);
      moon.airShare = v3.dot(up, this.sunDirection) < 0 ? moonShare : 0;
    }
    block.moonAir = moon?.airShare ?? 0;
    if (drawsSky(view)) {
      const sky = this.viewFrames.get(view)!.sky;
      this.sky.writeStars(this.icrfToFixed);
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
        "eye" in view.exposure ? ev100ToScale(EYE_STARS_EV100) : 0,
        moon,
        this.viewCityLight,
      );
      if (drawsAerialPerspective(view)) {
        block.aerial = {
          start: sky.aerialStart,
          end: sky.aerialEnd,
          march: sky.march,
          screen: sky.screenHaze,
        };
      }
    }
    writeViewBlock(this.viewData, (index * VIEW_STRIDE) / 4, block);
    this.viewDataU32[(index * VIEW_STRIDE) / 4 + VIEW_BIT_WORD] =
      this.viewBit(view);
    this.writeShadows(view, index, aspect);
    this.writeLights(view, index, aspect);
  }

  /**
   * Whether a view draws blended surfaces this frame, and its translucent
   * passes' parameters: the lists' layout ("exact", grown to what the last
   * reading needed) or the moments' depth range.
   */
  private writeTranslucency(view: View): void {
    const frame = this.viewFrames.get(view)!;
    const range = view.world.translucentRange(view.camera.position);
    frame.translucent = range !== undefined;
    if (!range) {
      return;
    }
    const pixels = frame.width * frame.height;
    let capacity = 0;
    if (view.translucency === "exact") {
      const { limits } = this.ctx.device;
      const heads = (LIST_HEADER + pixels) * 4;
      const most = Math.floor(
        (Math.min(limits.maxStorageBufferBindingSize, limits.maxBufferSize) -
          heads) /
          16,
      );
      // Half a layer a pixel to start; more once a frame needs it.
      this.listNodes = Math.max(this.listNodes, Math.ceil(pixels / 2));
      capacity = Math.max(Math.min(this.listNodes, most), 0);
      const size = heads + capacity * 16;
      if (!this.lists || this.lists.size < size) {
        this.lists?.destroy();
        this.lists = this.ctx.device.createBuffer({
          label: "translucent.lists",
          size,
          usage:
            GPUBufferUsage.STORAGE |
            GPUBufferUsage.COPY_SRC |
            GPUBufferUsage.COPY_DST,
        });
      }
      capacity = Math.floor((this.lists.size - heads) / 16);
    }
    // The moments' depths: the blended surfaces' own range (the moments
    // can't tell apart layers whose warped depths nearly agree: a range
    // reaching kilometers past a model's centimeters speckled it).
    const near = Math.max(range.near, view.camera.near, 1e-3);
    const far = Math.max(range.far, near * 1.01);
    const d = this.translucentData;
    d.setUint32(0, frame.width, true);
    d.setUint32(4, frame.height, true);
    d.setUint32(8, LIST_HEADER + pixels, true);
    d.setUint32(12, capacity, true);
    d.setFloat32(16, Math.log(near), true);
    d.setFloat32(20, 1 / Math.log(far / near), true);
    d.setFloat32(24, this.ctx.pipelines.momentBias, true);
    this.ctx.device.queue.writeBuffer(frame.translucentParams, 0, d.buffer);
  }

  /** What a translucent pass binds where it reads no lists or moments. */
  private translucentInputs(): NonNullable<Engine["translucentDummies"]> {
    if (!this.translucentDummies) {
      const { device, pipelines } = this.ctx;
      const texture = (format: GPUTextureFormat) =>
        device
          .createTexture({
            label: "translucent.placeholder",
            size: [1, 1],
            format,
            usage: GPUTextureUsage.TEXTURE_BINDING,
          })
          .createView();
      this.translucentDummies = {
        buffer: device.createBuffer({
          label: "translucent.placeholder",
          size: 16,
          usage: GPUBufferUsage.STORAGE,
        }),
        zero: texture(pipelines.momentFormats[0]),
        higher: texture(pipelines.momentFormats[1]),
      };
    }
    return this.translucentDummies;
  }

  /**
   * A view's translucent pass's group 3 (translucent.wgsl): its parameters
   * and depth, with the lists and the moments given; kept by role while
   * they stay the same.
   */
  private translucentGroup(
    frame: ViewFrame,
    role: number,
    [lists, zero, higher]: [GPUBuffer, GPUTextureView, GPUTextureView],
  ): GPUBindGroup {
    return this.keptGroup(frame, role, [lists, zero, higher], () =>
      this.ctx.device.createBindGroup({
        label: "translucent",
        layout: this.ctx.pipelines.translucentLayout,
        entries: [
          { binding: 0, resource: { buffer: frame.translucentParams } },
          { binding: 1, resource: { buffer: lists } },
          { binding: 2, resource: frame.depthView },
          { binding: 3, resource: zero },
          { binding: 4, resource: higher },
        ],
      }),
    );
  }

  /** A view's composite's group (composite.wgsl): the lists, or the moments' sums. */
  private compositeGroup(
    frame: ViewFrame,
    role: number,
    pipeline: GPURenderPipeline,
    inputs: [GPUBuffer] | [GPUTextureView, GPUTextureView, GPUTextureView],
  ): GPUBindGroup {
    return this.keptGroup(frame, role, inputs, () =>
      this.ctx.device.createBindGroup({
        label: "composite",
        layout: pipeline.getBindGroupLayout(0),
        entries:
          inputs.length === 1
            ? [
                { binding: 0, resource: { buffer: frame.translucentParams } },
                { binding: 1, resource: { buffer: inputs[0] } },
              ]
            : inputs.map((resource, i) => ({
                binding: 2 + i,
                resource: resource as GPUTextureView,
              })),
      }),
    );
  }

  private keptGroup(
    frame: ViewFrame,
    role: number,
    inputs: readonly (GPUBuffer | GPUTextureView)[],
    create: () => GPUBindGroup,
  ): GPUBindGroup {
    const kept = frame.translucentGroups[role];
    if (kept && kept.inputs.every((input, i) => input === inputs[i])) {
      return kept.group;
    }
    const group = create();
    frame.translucentGroups[role] = { group, inputs };
    return group;
  }

  /**
   * A view's shadow cascades (when it has shadows and the sun is up where
   * the camera is): their view blocks, copies of the view's with the sun's
   * projection and box, and the receivers' uniform.
   */
  private writeShadows(view: View, index: number, aspect: number): void {
    const frame = this.viewFrames.get(view)!;
    const camera = view.camera;
    const up = v3.normalize(scratchShadowUp, camera.position);
    // The sun's, or at night the Moon's when it's up.
    const sunUp = v3.dot(up, this.sunDirection) > -0.05;
    const moon = this.viewBlock.moon;
    const moonUp =
      !sunUp && moon !== undefined && v3.dot(up, moon.direction) > 0;
    const sun = moonUp ? moon.direction : this.sunDirection;
    frame.shadowed =
      view.shadows && view.lighting.sunIlluminance !== 0 && (sunUp || moonUp);
    const cascades = this.cascades;
    if (frame.shadowed) {
      const c = view.body.ellipsoid.cartesianToCartographic(
        camera.position,
        scratchCartographic,
      );
      fitShadowCascades(
        cascades,
        camera,
        aspect,
        sun,
        Math.max(c?.height ?? 0, 2),
        (frame.cascadeRange = shadowRange(
          frame.cascadeRange,
          frame.depthRange,
        )),
      );
      const block = this.viewBlock;
      const viewProj = block.viewProj;
      const planes = block.planes;
      const aerial = block.aerial;
      block.aerial = undefined;
      for (let k = 0; k < SHADOW_CASCADES; k++) {
        const o = ((index * SHADOW_CASCADES + k) * VIEW_STRIDE) / 4;
        block.viewProj = cascades.matrices.subarray(k * 16, k * 16 + 16);
        block.planes = cascades.planes[k]!;
        writeViewBlock(this.cascadeData, o, block);
        this.cascadeDataU32[o + VIEW_BIT_WORD] = this.viewBit(view);
      }
      block.viewProj = viewProj;
      block.planes = planes;
      block.aerial = aerial;
    }
    // Ambient occlusion: its prepass and kernels' parameters.
    frame.ambient =
      view.ambientOcclusion && frame.width * frame.height <= AO_MAX_PIXELS;
    if (frame.ambient) {
      const tanY = Math.tan(camera.fovy(aspect) / 2);
      const a = scratchAo;
      a.set(camera.right, 0);
      a[3] = tanY * aspect;
      a.set(camera.up, 4);
      a[7] = tanY;
      a.set(camera.direction, 8);
      a[11] = camera.near;
      a[12] = frame.width;
      a[13] = frame.height;
      a[14] = view.ambientOcclusionRadius;
      a[15] = Math.max(32, 0.15 * frame.height);
      this.ctx.device.queue.writeBuffer(frame.aoParams, 0, a);
    }
    writeShadows(
      this.shadowData,
      (index * SHADOWS_STRIDE) / 4,
      cascades,
      camera.direction,
      frame.shadowed,
      frame.ambient,
      frame.shadowed && moonUp,
    );
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
   * automatic exposure and the eye move toward their meter reading
   * (`adaptExposure`).
   */
  private updateExposure(view: View): number {
    const e = view.exposure;
    if ("scale" in e) {
      view.exposureScale = e.scale;
    } else if ("ev100" in e) {
      view.exposureScale = ev100ToScale(e.ev100);
    } else {
      const state = (view.autoExposure ??= {
        ev100:
          "eye" in e ? 15 : Math.min(Math.max(15, e.min ?? -6), e.max ?? 18),
        // Daylight until the first reading.
        cones: Math.log10(4000),
        rods: Math.log10(4000 * SCOTOPIC_WHITE),
        time: performance.now(),
        pending: false,
        metered: false,
      });
      if ("eye" in e) {
        // Pre-exposed for the stronger of the two (fp16's range); the
        // present pass sees the light per pixel (present.wgsl `eyeSees`).
        const r = eyeResponse(
          10 ** state.cones,
          10 ** state.rods,
          e.compensation ?? 0,
        );
        const scale = Math.max(r.cones, r.rods * SCOTOPIC_WHITE);
        view.exposureScale = scale;
        return scale;
      }
      view.exposureScale = ev100ToScale(state.ev100);
    }
    return view.exposureScale;
  }

  /**
   * Automatic exposure, from a meter reading (average luminance, the
   * scene's units): the EV100 a reflected-light meter gives (K = 12.5,
   * ISO 100) minus the compensation, within [min, max], approached
   * exponentially at `speed` per second; the first reading is taken as is.
   * The eye's cones adapt to the photopic reading, its rods to the
   * scotopic one (scene/eye.ts `adapt`). Renders again until it settles.
   */
  private adaptExposure(
    view: View,
    average: number | undefined,
    scotopic: number | undefined,
  ): void {
    const e = view.exposure;
    const state = view.autoExposure;
    if (!state) {
      return;
    }
    // Before the mode's check: a reading in flight as the exposure turned
    // fixed left it pending, and it never metered again on turning back.
    state.pending = false;
    if (!("auto" in e || "eye" in e)) {
      return;
    }
    // A reading that isn't a number (infinities in the image) says
    // nothing; a state that isn't one starts over from the next reading.
    if (average === undefined || !Number.isFinite(average)) {
      return;
    }
    const now = performance.now();
    if ("eye" in e) {
      if (scotopic === undefined || !Number.isFinite(scotopic)) {
        return;
      }
      const cones = Math.log10(Math.max(average, 1e-7));
      const rods = Math.log10(Math.max(scotopic, 1e-7));
      if (!state.metered || !Number.isFinite(state.cones + state.rods)) {
        state.cones = cones;
        state.rods = rods;
        state.metered = true;
      } else {
        const dt = Math.min((now - state.time) / 1000, 1);
        const speed = e.speed ?? EYE_ADAPTATION_SPEED;
        state.cones = adapt(state.cones, cones, dt, "cones", speed);
        state.rods = adapt(state.rods, rods, dt, "rods", speed);
      }
      state.time = now;
      if (
        Math.abs(cones - state.cones) > 0.005 ||
        Math.abs(rods - state.rods) > 0.005
      ) {
        this.requestRender();
      }
      return;
    }
    if (!Number.isFinite(state.ev100)) {
      state.metered = false;
    }
    const target = Math.min(
      Math.max(
        Math.log2((average * 100) / 12.5) - (e.compensation ?? 0),
        e.min ?? -6,
      ),
      e.max ?? 18,
    );
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
        size: 48,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      }),
      presentGroup: undefined,
      presentSource: undefined,
      presentDisplay: undefined,
      presentAdaptation: undefined,
      adaptParams: device.createBuffer({
        label: "adaptParams",
        size: 16,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      }),
      sky: this.sky.createView(),
      shadowed: false,
      ambient: false,
      lightCount: 0,
      depthRange: undefined,
      rangePending: false,
      cascadeRange: undefined,
      aoParams: device.createBuffer({
        label: "aoParams",
        size: 64,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      }),
      translucent: false,
      translucentParams: device.createBuffer({
        label: "translucentParams",
        size: 32,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      }),
      translucentGroups: [],
    };
    this.sky.writeWeights(frame.sky);

    // The sun's shadow maps: per cascade, its block in place of the view's,
    // the world culled to the sun's box and its casters drawn.
    const shadowDepth: GPURenderPassDepthStencilAttachment = {
      view: undefined as never,
      depthClearValue: 0, // reverse-Z: farthest from the sun is 0
      depthLoadOp: "clear",
      depthStoreOp: "store",
    };
    const shadowPass: GPURenderPassDescriptor = {
      label: "shadow",
      colorAttachments: [],
      depthStencilAttachment: shadowDepth,
    };
    graph.addPass("shadows", { sideEffect: true }, (enc) => {
      if (!frame.shadowed) {
        return;
      }
      const casters = view.world.shadowBundle();
      for (let k = 0; k < SHADOW_CASCADES; k++) {
        enc.copyBufferToBuffer(
          this.cascadeStaging,
          (frame.slot * SHADOW_CASCADES + k) * VIEW_STRIDE,
          this.ctx.currentViewBuffer,
          0,
          VIEW_SIZE,
        );
        view.world.encodeCull(enc);
        shadowDepth.view = this.ctx.shadowLayers[k]!;
        shadowPass.timestampWrites = this.timer.passWrites();
        const pass = enc.beginRenderPass(shadowPass);
        pass.executeBundles([casters]);
        pass.end();
      }
    });

    graph.addPass("select-view", { sideEffect: true }, (enc) => {
      enc.copyBufferToBuffer(
        this.viewStaging,
        frame.slot * VIEW_STRIDE,
        this.ctx.currentViewBuffer,
        0,
        VIEW_SIZE,
      );
      enc.copyBufferToBuffer(
        this.shadowStaging,
        frame.slot * SHADOWS_STRIDE,
        this.ctx.currentShadowsBuffer,
        0,
        SHADOWS_SIZE,
      );
      enc.copyBufferToBuffer(
        this.lightStaging,
        frame.slot * LIGHTS_SIZE,
        this.ctx.lightBuffer,
        0,
        (LIGHT_HEADER_FLOATS + frame.lightCount * LIGHT_FLOATS) * 4,
      );
    });

    // Its point and spot lights into its froxels (lights.wgsl).
    graph.addPass("lights", { sideEffect: true }, (enc) => {
      if (frame.lightCount === 0) {
        return;
      }
      const pass = enc.beginComputePass({
        label: "lights",
        timestampWrites: this.timer.passWrites(),
      });
      pass.setPipeline(this.ctx.pipelines.lightsAssign);
      pass.setBindGroup(0, this.ctx.lightAssignGroup);
      // A workgroup per tile, a thread per slice (lights.wgsl).
      pass.dispatchWorkgroups(CLUSTERS[0], CLUSTERS[1]);
      pass.end();
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
      // Marched per vertex instead from high up: no volume.
      if (drawsAerialPerspective(view) && frame.sky.march < 1) {
        this.sky.encodeAerial(enc, frame.sky, this.timer.passWrites());
      }
      if (drawsAerialPerspective(view) && frame.sky.screenHaze > 0) {
        this.sky.encodeAerialScreen(enc, frame.sky);
      }
    });

    // Ambient occlusion: a single-sampled depth and normal prepass of what
    // the view culled, the horizon search, then the blur into the buffer
    // the opaque pass reads.
    const prepassNormal = graph.createTexture("prepass.normal", {
      width,
      height,
      format: "rgba16float",
      usage: attachment | GPUTextureUsage.TEXTURE_BINDING,
    });
    const prepassDepth = graph.createTexture("prepass.depth", {
      width,
      height,
      format: "depth32float",
      usage: attachment | GPUTextureUsage.TEXTURE_BINDING,
    });
    const rawAo = graph.createTexture("ao.raw", {
      width: Math.ceil(width / 2),
      height: Math.ceil(height / 2),
      format: "r32float",
      usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING,
    });
    const prepassColor: GPURenderPassColorAttachment = {
      view: undefined as never,
      clearValue: { r: 0, g: 0, b: 1, a: 0 },
      loadOp: "clear",
      storeOp: "store",
    };
    const prepassDepthAttachment: GPURenderPassDepthStencilAttachment = {
      view: undefined as never,
      depthClearValue: 0,
      depthLoadOp: "clear",
      depthStoreOp: "store",
    };
    const prepassPass: GPURenderPassDescriptor = {
      label: "prepass",
      colorAttachments: [prepassColor],
      depthStencilAttachment: prepassDepthAttachment,
    };
    graph.addPass(
      "prepass",
      { writes: [prepassNormal, prepassDepth], sideEffect: true },
      (enc, get) => {
        if (!frame.ambient) {
          return;
        }
        prepassColor.view = get(prepassNormal);
        prepassDepthAttachment.view = get(prepassDepth);
        prepassPass.timestampWrites = this.timer.passWrites();
        const pass = enc.beginRenderPass(prepassPass);
        pass.executeBundles([view.world.prepassBundle()]);
        pass.end();
      },
    );
    graph.addPass(
      "ambient-occlusion",
      {
        reads: [prepassNormal, prepassDepth],
        writes: [rawAo],
        sideEffect: true,
      },
      (enc, get) => {
        if (!frame.ambient) {
          return;
        }
        const trace = device.createBindGroup({
          layout: pipelines.aoTrace.getBindGroupLayout(0),
          entries: [
            { binding: 0, resource: { buffer: frame.aoParams } },
            { binding: 1, resource: get(prepassDepth) },
            { binding: 2, resource: get(prepassNormal) },
            { binding: 3, resource: get(rawAo) },
          ],
        });
        const blur = device.createBindGroup({
          layout: pipelines.aoDenoise.getBindGroupLayout(0),
          entries: [
            { binding: 0, resource: { buffer: frame.aoParams } },
            { binding: 1, resource: get(prepassDepth) },
            { binding: 4, resource: get(rawAo) },
            { binding: 5, resource: { buffer: this.ctx.aoBuffer } },
          ],
        });
        const timestampWrites = this.timer.passWrites();
        const pass = enc.beginComputePass({
          label: "ambient-occlusion",
          ...(timestampWrites ? { timestampWrites } : {}),
        });
        pass.setPipeline(pipelines.aoTrace);
        pass.setBindGroup(0, trace);
        pass.dispatchWorkgroups(Math.ceil(width / 16), Math.ceil(height / 16));
        pass.end();
        const blurWrites = this.timer.passWrites();
        const second = enc.beginComputePass({
          label: "ambient-occlusion.blur",
          ...(blurWrites ? { timestampWrites: blurWrites } : {}),
        });
        second.setPipeline(pipelines.aoDenoise);
        second.setBindGroup(0, blur);
        second.dispatchWorkgroups(
          Math.ceil(Math.ceil(width / 4) / 8),
          Math.ceil(height / 8),
        );
        second.end();
      },
    );

    // The stars, splatted as points into a layer the sky reads.
    const starLayer = graph.createTexture("stars", {
      width,
      height,
      format: "rgba16float",
      usage: attachment | GPUTextureUsage.TEXTURE_BINDING,
    });
    graph.addPass("stars", { writes: [starLayer] }, (enc, get) => {
      if (drawsSky(view)) {
        this.sky.encodeStars(enc, frame.sky, get(starLayer));
      }
    });

    graph.addPass(
      "opaque",
      {
        reads: [starLayer],
        writes: [color, resolved, ids, display, displayResolved, depth],
      },
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
        // Its depth first, then its shading where that depth is (each
        // sample shaded once, not every fragment drawn over it).
        if (this.ctx.pipelines.depthPrepass) {
          frame.bundles[0] = view.world.depthBundle();
          frame.bundles[1] = frame.bundle!;
        } else {
          frame.bundles[0] = frame.bundle!;
        }
        pass.executeBundles(frame.bundles);
        if (atmosphere) {
          this.sky.draw(pass, frame.sky, get(starLayer));
        }
        pass.end();
      },
    );

    // Translucency (translucent.wgsl): blended surfaces into per-pixel
    // lists ("exact"), or their moments and then their weighted light
    // ("moments"); then composited over the opaque pass's resolved targets
    // (composite.wgsl), before anything reads them.
    const momentsZero = graph.createTexture("moments.zero", {
      width,
      height,
      format: pipelines.momentFormats[0],
      usage: attachment | GPUTextureUsage.TEXTURE_BINDING,
    });
    const momentsHigher = graph.createTexture("moments.higher", {
      width,
      height,
      format: pipelines.momentFormats[1],
      usage: attachment | GPUTextureUsage.TEXTURE_BINDING,
    });
    const accumulatedLit = graph.createTexture("translucent.lit", {
      width,
      height,
      format: "rgba16float",
      usage: attachment | GPUTextureUsage.TEXTURE_BINDING,
    });
    const accumulatedUnlit = graph.createTexture("translucent.unlit", {
      width,
      height,
      format: "rgba16float",
      usage: attachment | GPUTextureUsage.TEXTURE_BINDING,
    });
    const cleared = (): GPURenderPassColorAttachment => ({
      view: undefined as never,
      clearValue: { r: 0, g: 0, b: 0, a: 0 },
      loadOp: "clear",
      storeOp: "store",
    });
    const listTarget: GPURenderPassColorAttachment = {
      view: undefined as never,
      clearValue: { r: 0, g: 0, b: 0, a: 0 },
      loadOp: "clear",
      storeOp: "discard",
    };
    const listPass: GPURenderPassDescriptor = {
      label: "translucent.lists",
      colorAttachments: [listTarget],
    };
    const momentTargets = [cleared(), cleared()];
    const momentPass: GPURenderPassDescriptor = {
      label: "translucent.moments",
      colorAttachments: momentTargets,
    };
    const colorTargets = [cleared(), cleared()];
    const colorPass: GPURenderPassDescriptor = {
      label: "translucent.color",
      colorAttachments: colorTargets,
    };
    graph.addPass(
      "translucent",
      {
        reads: [depth],
        writes: [
          momentsZero,
          momentsHigher,
          accumulatedLit,
          accumulatedUnlit,
          color,
        ],
        sideEffect: true,
      },
      (enc, get) => {
        if (!frame.translucent) {
          return;
        }
        const world = view.world;
        const dummies = this.translucentInputs();
        if (view.translucency === "exact") {
          const lists = this.lists!;
          enc.clearBuffer(lists, 0, (LIST_HEADER + width * height) * 4);
          listTarget.view = get(color);
          listPass.timestampWrites = this.timer.passWrites();
          const pass = enc.beginRenderPass(listPass);
          world.encodeTranslucent(
            pass,
            pipelines.translucentList,
            pipelines.translucentListDoubleSided,
            this.translucentGroup(frame, 0, [
              lists,
              dummies.zero,
              dummies.higher,
            ]),
          );
          pass.end();
          if (!this.listCountPending) {
            this.listCountPending = true;
            const readback = device.createBuffer({
              label: "translucent.count",
              size: 4,
              usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
            });
            enc.copyBufferToBuffer(lists, 0, readback, 0, 4);
            this.listCounts.push(readback);
          }
          return;
        }
        const zero = get(momentsZero);
        const higher = get(momentsHigher);
        momentTargets[0]!.view = zero;
        momentTargets[1]!.view = higher;
        momentPass.timestampWrites = this.timer.passWrites();
        const first = enc.beginRenderPass(momentPass);
        world.encodeTranslucent(
          first,
          pipelines.translucentMoments,
          pipelines.translucentMomentsDoubleSided,
          this.translucentGroup(frame, 1, [
            dummies.buffer,
            dummies.zero,
            dummies.higher,
          ]),
        );
        first.end();
        colorTargets[0]!.view = get(accumulatedLit);
        colorTargets[1]!.view = get(accumulatedUnlit);
        colorPass.timestampWrites = this.timer.passWrites();
        const second = enc.beginRenderPass(colorPass);
        world.encodeTranslucent(
          second,
          pipelines.translucentColor,
          pipelines.translucentColorDoubleSided,
          this.translucentGroup(frame, 2, [dummies.buffer, zero, higher]),
        );
        second.end();
      },
    );
    const compositeScene: GPURenderPassColorAttachment = {
      view: undefined as never,
      loadOp: "load",
      storeOp: "store",
    };
    const compositeDisplay: GPURenderPassColorAttachment = {
      view: undefined as never,
      loadOp: "load",
      storeOp: "store",
    };
    const compositePass: GPURenderPassDescriptor = {
      label: "composite",
      colorAttachments: [compositeScene, compositeDisplay],
    };
    graph.addPass(
      "composite",
      {
        reads: [momentsZero, momentsHigher, accumulatedLit, accumulatedUnlit],
        writes: [resolved, displayResolved],
      },
      (enc, get) => {
        if (!frame.translucent) {
          return;
        }
        compositeScene.view = get(resolved);
        compositeDisplay.view = get(displayResolved);
        compositePass.timestampWrites = this.timer.passWrites();
        const pass = enc.beginRenderPass(compositePass);
        if (view.translucency === "exact") {
          pass.setPipeline(pipelines.compositeExact);
          pass.setBindGroup(
            0,
            this.compositeGroup(frame, 3, pipelines.compositeExact, [
              this.lists!,
            ]),
          );
        } else {
          pass.setPipeline(pipelines.compositeMoments);
          pass.setBindGroup(
            0,
            this.compositeGroup(frame, 4, pipelines.compositeMoments, [
              get(momentsZero),
              get(accumulatedLit),
              get(accumulatedUnlit),
            ]),
          );
        }
        pass.draw(3);
        pass.end();
      },
    );

    // The nearest and farthest surface shown, for the next frame's shadow
    // cascades (`writeShadows`): read back a frame or so late.
    graph.addPass(
      "depth-range",
      { reads: [depth], sideEffect: true },
      (enc, get) => {
        if (!frame.shadowed || frame.rangePending) {
          return;
        }
        frame.rangePending = true;
        const params = device.createBuffer({
          size: 16,
          usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
        const data = new ArrayBuffer(16);
        new Float32Array(data, 0, 1)[0] = view.camera.near;
        new Uint32Array(data, 4, 2).set([width, height]);
        device.queue.writeBuffer(params, 0, data);
        const result = device.createBuffer({
          size: 8,
          usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
          mappedAtCreation: true,
        });
        new Uint32Array(result.getMappedRange()).set([0x7f7fffff, 0]);
        result.unmap();
        const readback = device.createBuffer({
          size: 8,
          usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
        });
        const pass = enc.beginComputePass({ label: "depth-range" });
        pass.setPipeline(pipelines.depthRange);
        pass.setBindGroup(
          0,
          device.createBindGroup({
            layout: pipelines.depthRange.getBindGroupLayout(0),
            entries: [
              { binding: 0, resource: get(depth) },
              { binding: 1, resource: { buffer: params } },
              { binding: 2, resource: { buffer: result } },
            ],
          }),
        );
        pass.dispatchWorkgroups(8, 8);
        pass.end();
        enc.copyBufferToBuffer(result, 0, readback, 0, 8);
        this.depthRanges.push({ frame, readback, scratch: [params, result] });
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
        const adapts = "auto" in view.exposure || "eye" in view.exposure;
        if (!adapts || !auto || auto.pending) {
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
          size: 16,
          usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
        });
        const readback = device.createBuffer({
          size: 16,
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
        enc.copyBufferToBuffer(result, 0, readback, 0, 16);
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

    // The eye's local adaptation: a bilateral grid of the image's log
    // luminance, a sixteenth of its size by 16 levels, blurred (adapt.wgsl).
    const adaptSize = {
      width: Math.ceil(width / 16),
      height: Math.ceil(height / 16),
      depth: 16,
      format: "rgba16float" as const,
      usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING,
    };
    const adaptReduced = graph.createTexture("adapt.reduced", adaptSize);
    const adaptation = graph.createTexture("adapt.map", adaptSize);
    graph.addPass(
      "adaptation",
      { reads: [resolved], writes: [adaptReduced, adaptation] },
      (enc, get) => {
        if (!("eye" in view.exposure)) {
          return;
        }
        this.adaptData[0] = view.exposureScale;
        this.adaptData[1] = view.autoExposure?.cones ?? 0;
        device.queue.writeBuffer(frame.adaptParams, 0, this.adaptData);
        const reduce = device.createBindGroup({
          layout: pipelines.adaptReduce.getBindGroupLayout(0),
          entries: [
            { binding: 0, resource: get(resolved) },
            { binding: 1, resource: { buffer: frame.adaptParams } },
            { binding: 2, resource: get(adaptReduced) },
          ],
        });
        const blur = device.createBindGroup({
          layout: pipelines.adaptBlur.getBindGroupLayout(0),
          entries: [
            { binding: 3, resource: get(adaptReduced) },
            { binding: 4, resource: get(adaptation) },
          ],
        });
        const pass = enc.beginComputePass({ label: "adaptation" });
        const groups = [
          Math.ceil(adaptSize.width / 8),
          Math.ceil(adaptSize.height / 8),
        ] as const;
        pass.setPipeline(pipelines.adaptReduce);
        pass.setBindGroup(0, reduce);
        pass.dispatchWorkgroups(...groups);
        pass.setPipeline(pipelines.adaptBlur);
        pass.setBindGroup(0, blur);
        pass.dispatchWorkgroups(...groups, adaptSize.depth);
        pass.end();
      },
    );

    graph.addPass(
      "present",
      { reads: [resolved, displayResolved, adaptation], writes: [output] },
      (enc, get) => {
        const params = this.presentData;
        params.setFloat32(0, x, true);
        params.setFloat32(4, y, true);
        params.setUint32(8, TONE_MAPPINGS.indexOf(view.toneMapping), true);
        const encoding = this.ctx.outputFormat.endsWith("-srgb")
          ? 0
          : view.outputEncoding === "gamma2.2"
            ? 2
            : 1;
        params.setUint32(12, encoding, true);
        // The eye: its adaptation over the view (log10 cd/m²) and its
        // brightening; per pixel it adapts partly to its region too.
        const e = view.exposure;
        const state = view.autoExposure;
        const eye = "eye" in e && state !== undefined;
        params.setFloat32(16, view.exposureScale, true);
        params.setUint32(20, eye ? 1 : 0, true);
        params.setFloat32(24, eye ? state.cones : 0, true);
        params.setFloat32(28, eye ? state.rods : 0, true);
        params.setFloat32(32, "eye" in e ? (e.compensation ?? 0) : 0, true);
        device.queue.writeBuffer(frame.presentParams, 0, params.buffer);
        // Pooled textures are stable from frame to frame, so the bind group
        // is rebuilt only when the pool hands this view a different one.
        const source = get(resolved);
        const shown = get(displayResolved);
        const adapted = get(adaptation);
        if (
          frame.presentSource !== source ||
          frame.presentDisplay !== shown ||
          frame.presentAdaptation !== adapted
        ) {
          frame.presentSource = source;
          frame.presentDisplay = shown;
          frame.presentAdaptation = adapted;
          this.adaptSampler ??= device.createSampler({
            label: "adaptation",
            magFilter: "linear",
            minFilter: "linear",
          });
          frame.presentGroup = device.createBindGroup({
            layout: pipelines.present.getBindGroupLayout(0),
            entries: [
              { binding: 0, resource: source },
              { binding: 1, resource: { buffer: frame.presentParams } },
              { binding: 2, resource: shown },
              { binding: 3, resource: adapted },
              { binding: 4, resource: this.adaptSampler },
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
    this.lists?.destroy();
    this.timer.destroy();
    this.sky.atmosphere.destroy();
    this.sky.destroy();
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
  /**
   * The nearest and farthest surface it showed along its axis, m (the
   * depth range read back, `depth-range`), and whether a reading is in
   * flight; the range its shadow cascades cover, kept steady
   * (`shadowRange`).
   */
  depthRange: { near: number; far: number } | undefined;
  rangePending: boolean;
  cascadeRange: { near: number; far: number } | undefined;
  /** The point and spot lights it shades this frame (`writeLights`). */
  lightCount: number;
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
  presentAdaptation: GPUTextureView | undefined;
  /** The eye's adaptation map's parameters (its pre-exposure). */
  adaptParams: GPUBuffer;
  presentDisplay: GPUTextureView | undefined;
  /** The sky's uniform for this view (`View.background` "atmosphere"). */
  readonly sky: SkyView;
  /** The sun's shadow maps were fitted for this view this frame. */
  shadowed: boolean;
  /** Ambient occlusion is computed for this view this frame. */
  ambient: boolean;
  /** Its kernels' parameters (ao.wgsl `AoParams`). */
  readonly aoParams: GPUBuffer;
  /** It draws blended surfaces this frame (`writeTranslucency`). */
  translucent: boolean;
  /** Their passes' parameters (translucent.wgsl `TranslucentParams`). */
  readonly translucentParams: GPUBuffer;
  /**
   * Bind groups of its translucent passes and composites, by role, with
   * what they were made for.
   */
  readonly translucentGroups: Array<
    | { group: GPUBindGroup; inputs: readonly (GPUBuffer | GPUTextureView)[] }
    | undefined
  >;
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
  frame.adaptParams.destroy();
  frame.aoParams.destroy();
  frame.translucentParams.destroy();
  frame.sky.buffer.destroy();
  frame.sky.table.destroy();
  frame.sky.faceUniforms.destroy();
  frame.ids.destroy();
  frame.depth.destroy();
}

/** The Moon as a view sees it (`moonFrom`). */
const scratchMoon = {
  direction: v3.vec3(),
  sinRadius: 0,
  meridian: v3.vec3(),
  north: v3.vec3(),
  toSun: v3.vec3(),
  phaseAngle: 0,
  earthRadius: 0,
  airShare: 0,
};
const scratchMoonAxis = v3.vec3();
/**
 * The stars as the eye sees them against a dark sky, EV100 (sky.wgsl
 * `starExposure`): shown where the view's own adaptation is less open
 * (from orbit by day); about as bright as 1.x draws its star map.
 */
const EYE_STARS_EV100 = -3;

/** The Earth's mean radius, m (its size from the Moon: earthshine). */
const EARTH_RADIUS = 6_371_009;
/** The mean distance to the sun, m (IAU 2012). */
const ASTRONOMICAL_UNIT = 1.495978707e11;
/** The ecliptic's tilt to the equator (J2000), radians. */
const OBLIQUITY = (23.4392911 * Math.PI) / 180;
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
const scratchShadowUp = v3.vec3();
const scratchAo = new Float32Array(16);
const scratchViewProj = m4.mat4();
const scratchPlanes = new Float32Array(20);
