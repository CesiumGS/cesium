import type { EngineError, EngineErrorKind } from "../gpu/EngineErrors.ts";
import { TerrainSource, type TerrainLoader } from "../globe/TerrainSource.ts";
import type { TerrainTileInfo } from "../globe/quantizedMesh.ts";
import { RequestScheduler } from "../streaming/RequestScheduler.ts";
import { GpuDevice, type GpuDeviceOptions } from "../gpu/GpuDevice.ts";
import { GpuTimer } from "../gpu/GpuTimer.ts";
import { TexturePool } from "../render/FrameGraph.ts";
import {
  VIEW_BIT_WORD,
  VIEW_SIZE,
  VIEW_STRIDE,
  VIEW_TIME_WORD,
  viewBlockBytes,
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
import { View, ev100ToScale, type HdrImage, type ViewOptions } from "./View.ts";
import {
  CanvasTarget,
  OffscreenTarget,
  type PixelRect,
  type RenderTarget,
} from "./renderTarget.ts";
import { ViewLink, type ViewLinkOptions } from "./ViewLink.ts";
import { RealtimeAtmosphere } from "../atmosphere/RealtimeAtmosphere.ts";
import { Sky } from "../atmosphere/Sky.ts";
import { MOON_ALBEDO, moonPhaseBrightness } from "../atmosphere/moonLight.ts";
import type { AerosolType } from "../atmosphere/model.ts";
import { EARTH } from "./Body.ts";
import type { StarField } from "../atmosphere/stars.ts";
import { Camera } from "./Camera.ts";
import {
  SHADOW_CASCADES,
  SHADOWS_STRIDE,
  createShadowCascades,
  fitShadowCascades,
  shadowRange,
  writeShadows,
} from "./shadows.ts";
import { CityLight } from "../globe/cityLight.ts";
import {
  LIGHTS_SIZE,
  LIGHT_FLOATS,
  LIGHT_HEADER_FLOATS,
  packViewLights,
} from "./lights.ts";
import { World, type AnchorHandle, type WorldOptions } from "./World.ts";
import { CameraLayer } from "../camera/CameraLayer.ts";
import {
  ANCHOR_EYE_REACH,
  computeAnchorEyes,
  createAnchorEyes,
  writeAnchorEyes,
} from "./anchorEyes.ts";
import { HeightClamping } from "./HeightClamping.ts";
import { contentAnchor, earthAnchor } from "./earthAnchor.ts";
import { WorkerPool } from "../io/WorkerPool.ts";
import {
  GlobeImagery,
  type GlobeImageryOptions,
} from "../globe/GlobeImagery.ts";
import type { ImageryProvider } from "../globe/ImageryProvider.ts";
import { Tileset3D } from "../streaming/Tileset3D.ts";
import type { TilesetOptions } from "../streaming/tilesetTypes.ts";
import { Globe } from "../globe/Globe.ts";
import type { SelectionView } from "../streaming/Stepwise.ts";
import type { GltfAsset } from "../io/gltfTypes.ts";
import {
  uploadModel,
  type ModelResource,
  type ModelResourceOptions,
} from "./gltfModel.ts";
import type { CustomShader } from "./CustomShader.ts";
import {
  createSpatialQueries,
  type RayQuery,
  type SpatialQueries,
} from "../query/queries.ts";
import { globeTarget, terrainBackend } from "../query/terrainBackend.ts";
import { drawBackend } from "../query/drawBackend.ts";
import {
  type ViewFrame,
  type TargetFrame,
  type WorldFrame,
  type OverlayResources,
  type PersistentImage,
  drawsSky,
  destroyViewFrame,
  TONE_MAPPINGS,
  drawsAerialPerspective,
  LIST_HEADER,
} from "../render/view/viewFrameData.ts";
import { viewFrameFor } from "../render/view/viewFrame.ts";
import {
  type PendingPick,
  serveIdlePick,
  resolvePicks,
  whenMapped,
  halfToFloat,
} from "../render/view/picks.ts";
import { updateExposure, adaptExposure } from "../render/view/exposure.ts";
import {
  scratchFrame,
  updateEnvironment,
  environmentFrame,
} from "../render/view/environment.ts";
import { shadowLight, moonFrom } from "./lightSources.ts";
import {
  type ViewMotion,
  updateTilesets,
  rotateVector,
} from "./tileSelection.ts";

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
  /**
   * Smoothed GPU time inside our passes, ms (NaN without `timestamp-query`):
   * the time any of them ran, overlapping passes counted once.
   */
  gpuMs: number;
  /** Smoothed GPU span from first pass start to last pass end, ms. */
  gpuSpanMs: number;
  views: number;
  draws: number;
  /** Indirect draw calls per view (one per batch). */
  batches: number;
  /** Frames rendered since start (on demand: only frames something changed). */
  framesRendered: number;
  /** Frames the GPU rejected (validation): each drew nothing. */
  rejectedFrames: number;
  /**
   * The last tick rendered nothing (on demand, nothing changed), or the
   * loop sleeps (`Engine.wake`).
   */
  idle: boolean;
  /** Environments rebuilt from an atmosphere since start (`ViewLighting`). */
  environmentBuilds: number;
}

/** Values in one view's on-demand fingerprint (see `viewChanged`). */
const VIEW_KEY_LENGTH = 30;
/** Radians a degree (`Tileset3D.terrainClipped` takes degrees). */
const DEGREES = Math.PI / 180;
/** Nodes a list's `next` word can address (28 bits, the node plus one). */
const LIST_NODES_MAX = (1 << 28) - 2;

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
  /**
   * Each view's rig and render root, and each world's frame resolver and
   * scene clock (plan 5a's call 23). A view starts on the default rig,
   * which costs nothing per tick; a rig set with `cameras.setRig` places
   * the view's anchors each tick.
   */
  readonly cameras: CameraLayer;
  /** Streamed 3D Tiles tilesets, updated before each frame. */
  readonly tilesets: Tileset3D[] = [];
  /**
   * The query interface for rays (spec section 7.10, `query/queries.ts`):
   * asynchronous, batched, standing queries, three-way answers that
   * improve. The rays are in the coordinates of the query's anchor (the
   * Earth's: Earth-fixed), in the world of its view, else of its anchor,
   * else the engine's only world. The terrain target is the globe under
   * that anchor (a ray under an anchor with none answers "unknown",
   * `"unsupported"`), traced exactly on the CPU; the draws target is
   * `World.castRays` on the GPU, unknown over streamed tiles not drawn.
   * Hidden tilesets (`show: false`) are not part of what rays meet: their
   * draws aren't cast against, nor their tiles counted unknown. Standing
   * queries look again after each tick (`onAfterTick`).
   */
  readonly queries: SpatialQueries = createSpatialQueries(
    {
      terrain: terrainBackend((query) => {
        const route = this.queryRoute(query);
        return globeTarget(
          this.tilesets,
          route.world,
          query.anchor,
          route.viewMask ?? 0xffffffff,
        );
      }),
      draws: drawBackend((query) => {
        const route = this.queryRoute(query);
        return {
          world: route.world,
          options: {
            ...(query.anchor && { anchor: query.anchor }),
            ...(route.viewMask !== undefined && { viewMask: route.viewMask }),
          },
          key: `${route.world.id}/${query.anchor?.slot ?? 0}/${route.viewMask ?? "all"}`,
          // Where these aren't drawn the cast tests nothing: unknown there.
          tilesets: this.tilesets
            .filter(
              (t) =>
                t.world === route.world &&
                !t.isGlobe &&
                t.show &&
                t.anchor === query.anchor,
            )
            .map((t) => t.root),
        };
      }),
    },
    {
      revision: (query) => {
        const { world } = this.queryRoute(query);
        // Draws come, go and change views as tiles load and selections
        // move (terrain's too), and terrain clips change; draws under an
        // anchor also move with its nodes.
        return (
          world.contentRevision +
          (query.targets.includes("draws") ? world.transformRevision : 0)
        );
      },
      loading: (query) => {
        const { world } = this.queryRoute(query);
        return this.tilesets.some(
          (t) =>
            t.world === world &&
            t.anchor === query.anchor &&
            query.targets.includes(t.isGlobe ? "terrain" : "draws") &&
            !t.idle,
        );
      },
      onTick: (listener) => this.onAfterTick(() => listener()),
      check: (query) => void this.queryRoute(query),
      report: (error) => this.reportLoopError("a standing query", error),
    },
  );
  /**
   * Keeps content with a `heightReference` on terrain and collision
   * tilesets as they load (`heightReference` placements).
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
    () => this.wake(),
  );
  readonly stats: FrameStats = {
    cpuMs: 0,
    gpuMs: Number.NaN,
    gpuSpanMs: Number.NaN,
    views: 0,
    draws: 0,
    batches: 0,
    framesRendered: 0,
    rejectedFrames: 0,
    idle: false,
    environmentBuilds: 0,
  };
  /**
   * Smoothed GPU time per pass, ms, by pass name (shadow cascades added
   * up): where `stats.gpuMs` goes. Empty without `timestamp-query`.
   */
  get gpuPasses(): Record<string, number> {
    return this.timer.passes;
  }
  /**
   * "onDemand" (default): `start()` renders a frame only when something
   * visible changed (a camera, view, world, the sun, streamed content) or
   * `requestRender()` was called; "continuous": every animation frame.
   * `renderFrame()` always renders.
   *
   * On demand, the loop also stops asking for animation frames once
   * nothing is changing, and wakes (`wake`) for what changes:
   * - a camera (`Camera.version`, which `fov`, `near` and every method
   *   bump);
   * - a view's fingerprinted state (its world, viewport, exposure,
   *   lighting, background, sun disk, aerial perspective, clear color,
   *   output encoding, tone mapping, enabled; viewport, exposure and
   *   lighting also written in place) or a pick;
   * - a world's draws, a custom shader's uniforms or textures;
   * - a tileset's content, settings or selection knobs
   *   (`tileset.selection.maximumScreenSpaceError`);
   * - a canvas resized (its CSS box; `CanvasTarget.fixedPixelRatio`; an
   *   `OffscreenCanvas`'s width or height);
   * - height clamping and captures, `requestRender`, and tick listeners
   *   still busy (`onTick`).
   *
   * What the engine can't watch needs `requestRender()`, as anything
   * outside the fingerprint always did: `sunDirection` set in place, a
   * camera's `position`, `direction` or `up` written without
   * `version++`, and state outside the fingerprint (`View.shadows`,
   * `fxaa`, `overlays`, `icrfToFixed`, the sky).
   *
   * An application's per-frame work belongs in the engine's frames, not a
   * `requestAnimationFrame` loop of its own: what moves the scene (an
   * animation, a flight) in `onTick`, returning true while it runs; DOM
   * placed against the canvas in `onAfterTick`. A tick listener that always
   * returns true keeps the loop awake for ever.
   */
  get renderMode(): "onDemand" | "continuous" {
    return this.renderMode_;
  }
  set renderMode(mode: "onDemand" | "continuous") {
    this.renderMode_ = mode;
    this.wake();
  }
  private renderMode_: "onDemand" | "continuous" = "onDemand";
  /**
   * Unit vector toward the sun in Earth-fixed axes. Placeholder until the
   * 1.x sun model lands. Set in place, it needs `requestRender()` (the
   * loop sleeps on demand and can't see it).
   */
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

  /** @internal */
  readonly ctx: RenderContext;
  /** @internal The real-time atmosphere and the sky drawn from it. */
  readonly sky: Sky;
  private readonly workers = new WorkerPool();
  /** Content request windows per origin, shared by all tilesets. */
  readonly requests = new RequestScheduler();
  /** @internal */
  readonly pool: TexturePool;
  /** @internal */
  readonly timer: GpuTimer;
  /** @internal */
  readonly viewStaging: GPUBuffer;
  private readonly viewData: Float32Array;
  /**
   * Per view slot: a view block per shadow cascade (the sun's projection
   * and box, for culling and drawing the casters), and the receivers'
   * `Shadows` uniform; staged like the views' blocks.
   */
  private readonly cascadeData: Float32Array;
  private readonly cascadeDataU32: Uint32Array;
  /** @internal */
  readonly cascadeStaging: GPUBuffer;
  private readonly shadowData: Float32Array;
  /** @internal */
  readonly shadowStaging: GPUBuffer;
  /** The night lights' mean around each view's camera (`cityLightAt`). */
  private readonly cityLights = new WeakMap<ImageryProvider, CityLight>();
  private readonly cityLightPlaces = new WeakMap<
    View,
    { city: CityLight; longitude: number; latitude: number; light: number }
  >();
  /** @internal This frame's view's city light, cd/m² (`cityLightAt`). */
  viewCityLight = 0;
  /** @internal Each drawn view's lights (lights.ts `packViewLights`), by slot. */
  readonly lightStaging: GPUBuffer;
  private readonly lightData = new Float32Array(LIGHTS_SIZE / 4);
  private readonly cascades = createShadowCascades();
  private readonly viewDataU32: Uint32Array;
  /** @internal Stable per-view bit index (0–31) for record view masks. */
  readonly viewIds = new Map<View, number>();
  /** @internal */
  readonly viewMotion = new Map<View, ViewMotion>();
  /** @internal */
  readonly aheadCamera = new Camera();
  /**
   * Each view's camera in its body anchor (`bodyCamera`), and what it was
   * computed from.
   */
  private readonly bodyCameras = new WeakMap<
    View,
    {
      camera: Camera;
      version: number;
      revision: number;
      anchor: AnchorHandle | undefined;
      tick: number;
    }
  >();
  /**
   * Counts the loop's ticks (after their listeners) and renders: a body
   * camera computed in an earlier one is computed again, so a camera
   * written in place without `version++` is never drawn stale.
   */
  private cameraTick = 0;
  /** The view being written's anchor table, float64 (`writeView`). */
  private readonly anchorEyes = createAnchorEyes();
  /** Per view, the anchors its eye was last too far from (reported once). */
  private readonly farAnchors = new WeakMap<View, Set<AnchorHandle>>();
  private readonly freeViewIds: number[] = [];
  private readonly maxViews: number;
  /** @internal */
  readonly viewFrames = new Map<View, ViewFrame>();
  private readonly targetFrames = new WeakMap<RenderTarget, TargetFrame>();
  private readonly worldFrames = new WeakMap<World, WorldFrame>();
  private readonly overlayResources = new Map<View, OverlayResources>();
  /**
   * @internal Views lit by their atmosphere's environment: its probe, and the local
   * sun direction and altitude it was built for.
   */
  readonly probes = new Map<
    View,
    {
      probe: EnvironmentProbe;
      key: Float64Array;
      /** The exposure it was built at (its sky is pre-exposed). */
      exposure: number;
      pending: boolean;
    }
  >();
  /** @internal The environment of a body without an atmosphere: black. */
  darkProbe: EnvironmentProbe | undefined;
  /** @internal */
  readonly pickReadback: GPUBuffer[] = [];
  /** @internal */
  readonly pickParams: GPUBuffer;
  /** @internal */
  readonly pickResult: GPUBuffer;
  /** @internal */
  readonly pickParamsData = new Uint32Array(4);
  /** @internal */
  readonly picks: PendingPick[] = [];
  /** @internal Exposure meter readings this frame, mapped after submit. */
  readonly meters: Array<{
    view: View;
    readback: GPUBuffer;
    scratch: GPUBuffer[];
  }> = [];
  /** @internal Depth ranges reduced this frame (`depthRange.slang`), mapped after submit. */
  readonly depthRanges: Array<{
    frame: ViewFrame;
    readback: GPUBuffer;
    scratch: GPUBuffer[];
  }> = [];
  /** @internal HDR images copied this frame (`View.readHdr`), mapped after submit. */
  readonly hdrReads: Array<{
    buffer: GPUBuffer;
    bytesPerRow: number;
    width: number;
    height: number;
    /** The pre-exposure of the frame read: divided out. */
    exposure: number;
    resolvers: Array<(image: HdrImage) => void>;
  }> = [];
  /**
   * @internal Translucency's per-pixel lists ("exact", translucent.wgsl), shared by
   * the views (each clears and fills them in turn): the nodes they hold,
   * grown when a frame needed more (its count read back, one at a time).
   */
  lists?: GPUBuffer;
  private listNodes = 0;
  /** @internal */
  listCountPending = false;
  /** @internal */
  readonly listCounts: GPUBuffer[] = [];
  /** Bound where a translucent pass doesn't read the lists or moments. */
  private translucentDummies?: {
    buffer: GPUBuffer;
    zero: GPUTextureView;
    higher: GPUTextureView;
    /** For the meter, where the view draws no layers. */
    color: GPUTextureView;
  };
  private readonly translucentData = new DataView(new ArrayBuffer(32));
  /** @internal */
  readonly presentData = new DataView(new ArrayBuffer(48));
  /** @internal */
  readonly adaptData = new Float32Array(4);
  /** @internal The eye's local adaptation grid, sampled trilinearly. */
  adaptSampler?: GPUSampler;
  /** @internal FXAA's image, sampled bilinearly. */
  fxaaSampler?: GPUSampler;
  /** @internal */
  readonly fxaaData = new DataView(new ArrayBuffer(32));
  private readonly overlayColor = new Float32Array(4);
  /** @internal */
  readonly viewBlock: ViewBlock;
  /** When the engine was created (`performance.now()`): views' `time`. */
  private readonly startTime = performance.now();
  /** @internal Height captures (`addHeightCapture`). */
  readonly captures: HeightCapture[] = [];
  /** @internal */
  readonly commandBuffers: GPUCommandBuffer[] = [];
  /** @internal */
  frameNumber = 0;
  private frameHandle = 0;
  /** An animation frame is requested for the loop (`start`). */
  private scheduled = false;
  /** Inside the loop's frame (its tick listeners and tick): wakes then are held for its end. */
  private ticking = false;
  /**
   * A wake during the tick, after the tick listeners (a tileset's `request`
   * listener moving a camera, say): the tick may have read the state
   * before the change, so the next frame runs (`needsTicks`).
   */
  private wokenInTick = false;
  /** A listener added inside the frame: the next frame runs it. */
  private listenerAdded = false;
  private readonly tickListeners: Array<(now: number) => boolean> = [];
  private readonly afterTickListeners: Array<(now: number) => void> = [];
  /** Per view: what stops watching its camera and canvas (`addView`). */
  private readonly viewWatches = new Map<View, () => void>();
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
    ctx.wake = () => this.wake();
    ctx.shaderBindings.wake = ctx.wake;
    this.cameras = new CameraLayer({
      views: this.views,
      wake: () => this.wake(),
      errors: ctx.errors,
    });
    // Uncaptured device errors join the engine's (logged once each there).
    gpu.events.on("error", (error) =>
      ctx.errors.report("device", error.message),
    );
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
      time: 0,
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
        aerialVolume: sky.aerialVolume.createView({ dimension: "3d" }),
        aerialScreen: sky.aerialScreen.createView({ dimension: "2d-array" }),
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
   * phase). Null: a uniform disk. `mean`, its mean albedo if known
   * (`MoonMap.mean`), spares reading it back on the page. The image can be
   * closed once this returns.
   */
  setMoonMap(image: ImageBitmap | null, mean?: number): void {
    this.sky.setMoonMap(image, mean);
    this.requestRender();
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
   * What went wrong, each distinct error once with a count: shaders and
   * pipelines that failed (their draws use the engine's), textures
   * destroyed while bound (their draws skipped), frames the GPU rejected
   * (the worlds bound again), uncaptured device errors.
   */
  get errors(): readonly EngineError[] {
    return this.ctx.errors.all;
  }

  /**
   * Adds an error to `errors` (once with a count, as the engine's own
   * are), for what an application caught, a point set that didn't fit, say.
   */
  reportError(kind: EngineErrorKind, message: string): void {
    this.ctx.errors.report(kind, message);
  }

  /** Hears every error the engine reports; returns the unsubscribe. */
  onError(listener: (error: EngineError) => void): () => void {
    return this.ctx.errors.on(listener);
  }

  /**
   * Fetches and decodes a glTF, GLB or b3dm in a worker. Upload it with
   * `uploadModel`. `headers` go with every request (e.g. ion authorization).
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
   * Compiles a custom shader's pipelines ahead of use (content using it
   * otherwise draws with the default until they are ready). Rejects with
   * the compiler's messages.
   */
  async compileShader(shader: CustomShader): Promise<void> {
    await this.ctx.shaders.compile(shader);
  }

  /**
   * Fetches, decodes and uploads a glTF, GLB or b3dm into `world`: a
   * `ModelResource` to place (`model.place`) and release when done. Its
   * source data is released once uploaded unless `releaseSourceData` is
   * false. Placements hang under the Earth's anchor unless they name
   * another (`PlacementOptions.anchor`) or a parent.
   */
  async loadModel(
    world: World,
    url: string | URL,
    options: ModelResourceOptions & {
      headers?: Record<string, string>;
      signal?: AbortSignal;
    } = {},
  ): Promise<ModelResource> {
    const { headers, signal, ...upload } = options;
    const asset = await this.loadGltf(url, {
      ...(headers ? { headers } : {}),
      ...(signal ? { signal } : {}),
    });
    signal?.throwIfAborted();
    return this.uploadModel(world, asset, {
      name: String(url).split("/").pop(),
      ...upload,
    });
  }

  /**
   * Uploads a parsed glTF asset into `world` (meshes, materials, textures):
   * a `ModelResource` the caller owns, placed with `model.place` and freed
   * once released with no placements left. By default the asset's decoded
   * images are closed once uploaded (`releaseSourceData`). Placements hang
   * under the Earth's anchor unless they name another
   * (`PlacementOptions.anchor`) or a parent.
   */
  uploadModel(
    world: World,
    asset: GltfAsset,
    options: ModelResourceOptions = {},
  ): ModelResource {
    return uploadModel(
      { ctx: this.ctx, clamping: this.clamping },
      world,
      asset,
      options,
    );
  }

  /**
   * Loads a 3D Tiles tileset's tree, drawing nothing yet: `World.add` draws
   * it, as often as asked, and streams its tiles. It belongs to the first
   * world it is added to, and until then does no work.
   */
  async loadTileset(
    url: string | URL,
    options?: TilesetOptions,
  ): Promise<Tileset3D> {
    return Tileset3D.load(
      this,
      undefined,
      new URL(url, globalThis.location?.href).href,
      options,
    );
  }

  /** @internal A tileset loaded alone was added to its world. */
  adoptTileset(tileset: Tileset3D): void {
    this.tilesets.push(tileset);
    this.wake();
  }

  /**
   * Streams a 3D Tiles tileset into `world`, as `loadTileset` then `World.add`
   * with the default item, which is `tileset.items[0]`: selection runs per
   * view each tick, and content is drawn only in the views that selected it.
   * Its content hangs under the Earth's anchor (`TilesetOptions.anchor` names
   * another), and selection reads each view's camera there.
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
    this.wake();
    return tileset;
  }

  /**
   * Streams quantized-mesh terrain (`url`: a `layer.json` or its directory,
   * e.g. Cesium World Terrain's ion endpoint) into `world`, through the same
   * selection, requests, cache and rendering as 3D Tiles. Selection defaults
   * to 1.x's globe threshold, SSE 2. Under the Earth's anchor unless
   * `options.anchor` names another.
   */
  async addTerrain(
    world: World,
    url: string | URL,
    options: GlobeOptions = {},
  ): Promise<Globe> {
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
   * culled and draped with imagery like terrain. Under the Earth's anchor
   * unless `options.anchor` names another.
   */
  addEllipsoid(world: World, options: GlobeOptions = {}): Globe {
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
  ): Globe {
    const tileset = Globe.create(this, world, source, {
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
    this.wake();
    return tileset;
  }

  removeTileset(tileset: Tileset3D): void {
    const index = this.tilesets.indexOf(tileset);
    if (index >= 0) {
      this.tilesets.splice(index, 1);
    }
    tileset.destroy();
    this.wake();
  }

  /** Render-target pool usage (transient textures shared by all views). */
  get renderTargetMemory() {
    return this.pool.stats;
  }

  /**
   * @internal The view's camera in its body anchor (`View.anchorCamera(view.
   * bodyAnchor)`; the table's root while the world has none): what the
   * engine shades, culls, clamps and clips the body with, since the
   * shading axes are the body anchor's (plan 5a's call 18). Recomputed
   * each tick and render, and when the camera (`Camera.version`), the
   * placements (`View.anchorRevision`) or the body anchor change. With the body
   * anchor at the identity it equals `view.camera`, bit for bit.
   */
  bodyCamera(view: View): Camera {
    const anchor = view.bodyAnchor;
    const version = view.camera.version;
    const revision = view.anchorRevision;
    let entry = this.bodyCameras.get(view);
    if (!entry) {
      entry = {
        camera: new Camera(),
        version: Number.NaN,
        revision: Number.NaN,
        anchor: undefined,
        tick: Number.NaN,
      };
      this.bodyCameras.set(view, entry);
    }
    if (
      entry.tick !== this.cameraTick ||
      entry.version !== version ||
      entry.revision !== revision ||
      entry.anchor !== anchor
    ) {
      view.anchorCamera(anchor, entry.camera);
      entry.version = version;
      entry.revision = revision;
      entry.anchor = anchor;
      entry.tick = this.cameraTick;
    }
    return entry.camera;
  }

  /**
   * Reports, once each time it happens, an anchor whose draws a view hides
   * because its eye is beyond `ANCHOR_EYE_REACH` of it.
   */
  private reportFarAnchors(view: View): void {
    const eyes = this.anchorEyes;
    let far = this.farAnchors.get(view);
    for (let slot = 1; slot < eyes.hidden.length; slot++) {
      const anchor = eyes.anchors[slot];
      if (!anchor) {
        continue;
      }
      if (eyes.hidden[slot] === 1) {
        if (!far?.has(anchor)) {
          if (!far) {
            far = new Set();
            this.farAnchors.set(view, far);
          }
          far.add(anchor);
          this.ctx.errors.report(
            "frame",
            `The eye of view ${this.viewIds.get(view) ?? "?"} is more than ${ANCHOR_EYE_REACH.toLocaleString("en-US")} m (2^31 m) from the anchor ${anchor.name}: its draws are hidden in that view.`,
          );
        }
      } else {
        far?.delete(anchor);
      }
    }
    if (far) {
      for (const anchor of far) {
        if (eyes.anchors[anchor.slot] !== anchor) {
          far.delete(anchor);
        }
      }
    }
  }
  /** @internal `selectionFor`'s inputs of the current update, by world and anchor. */
  readonly selections = new Map<World, Map<AnchorHandle, SelectionView[]>>();
  /** @internal The prefetch camera re-expressed in such an anchor. */
  readonly selectionAhead = new Camera();
  /** @internal `selectionCasters`' fit (the frame's own is `cascades`). */
  readonly selectionCascades = createShadowCascades();

  /** Removes a placed glTF and frees its geometry, materials and textures. */
  /**
   * Heights (meters above the ellipsoid) of the most detailed 3D Tiles
   * content at each longitude and latitude (radians), as 1.x
   * `Scene.sampleHeightMostDetailed`: the tiles under each point are loaded
   * down to the leaves whatever the views show, then ray cast on the GPU
   * down the geodetic normal from 10 km (nearest hit), in the Earth's
   * anchor. Tilesets: those given, else the shown collision tilesets of
   * the world under the Earth's anchor (`Tileset3D.anchor`); a tileset
   * given under another anchor throws, naming it. Undefined where nothing
   * is hit (a globe given here has none inside its terrain regions
   * that aren't ground, `Globe.terrain.addRegion`). Needs the frame loop running (`start`).
   */
  async sampleHeightMostDetailed(
    world: World,
    positions: ReadonlyArray<{ longitude: number; latitude: number }>,
    options: { tilesets?: readonly Tileset3D[] } = {},
  ): Promise<Array<number | undefined>> {
    const START = 10000;
    // The rays are Earth-fixed: they meet the content under the Earth's
    // anchor (`World.castRays` tests only the cast's anchor).
    const earth = earthAnchor(world);
    for (const t of options.tilesets ?? []) {
      if (t.anchor !== earth) {
        throw new Error(
          `sampleHeightMostDetailed: the tileset ${t.url} is under ${t.anchor.name}, not the Earth's anchor; heights are the Earth's.`,
        );
      }
    }
    const tilesets =
      options.tilesets ??
      this.tilesets.filter(
        (t) =>
          t.world === world &&
          t.show &&
          t.enableCollision &&
          !t.isGlobe &&
          t.anchor === earth,
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
          const hits = await world.castRays(rays, {
            draws: query.draws,
            anchor: earth,
          });
          hits.forEach((d, i) => {
            // Terrain that isn't ground there is a hole (`TerrainRegion.ground`): the ray
            // runs down the normal, so the hit is at the point's own
            // longitude and latitude.
            if (
              d !== undefined &&
              !tileset.terrainClipped(
                positions[i]!.longitude / DEGREES,
                positions[i]!.latitude / DEGREES,
                START - d,
              )
            ) {
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

  createWorld(options?: WorldOptions): World {
    const world = new World(this.ctx, options);
    this.worlds.push(world);
    this.wake();
    return world;
  }

  /**
   * Removes a world with everything in it: its tilesets and the views
   * that draw it go too, then its GPU resources.
   */
  removeWorld(world: World): void {
    for (const tileset of this.tilesets.filter((t) => t.world === world)) {
      this.removeTileset(tileset);
    }
    for (const view of this.views.filter((v) => v.world === world)) {
      this.removeView(view);
    }
    const index = this.worlds.indexOf(world);
    if (index >= 0) {
      this.worlds.splice(index, 1);
    }
    this.cameras.forget(world);
    world.destroy();
    this.wake();
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
    view.renderRoot = () => this.cameras.root(view);
    this.watchView(view);
    this.wake();
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
    this.viewWatches.get(view)?.();
    this.viewWatches.delete(view);
    view.wake = undefined;
    view.renderRoot = undefined;
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
    this.wake();
  }

  /**
   * Wakes the loop for the view's changes: its camera (`Camera.version`),
   * its fingerprinted state and picks (`View.wake`), and its canvas
   * resizing (its CSS size or the device pixel ratio).
   */
  private watchView(view: View): void {
    const wake = () => this.wake();
    view.wake = wake;
    const unwatch = view.camera.watch(wake);
    const canvas = view.target instanceof CanvasTarget && view.target.canvas;
    let resize: ResizeObserver | undefined;
    if (
      canvas &&
      "clientWidth" in canvas &&
      typeof ResizeObserver !== "undefined"
    ) {
      resize = new ResizeObserver(wake);
      try {
        // Also a moved window's new pixel ratio (not in Safari).
        resize.observe(canvas, { box: "device-pixel-content-box" });
      } catch {
        resize.observe(canvas);
      }
    }
    const unwatchTarget =
      view.target instanceof CanvasTarget ? view.target.watch(wake) : undefined;
    this.viewWatches.set(view, () => {
      unwatch();
      unwatchTarget?.();
      resize?.disconnect();
    });
  }

  link(source: View, target: View, options: ViewLinkOptions): ViewLink {
    const link = new ViewLink(source, target, options);
    this.links.push(link);
    this.wake();
    return link;
  }

  unlink(link: ViewLink): void {
    const index = this.links.indexOf(link);
    if (index >= 0) {
      this.links.splice(index, 1);
      link.dispose();
      this.wake();
    }
  }

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
  /** @internal */
  lastUpdateAt = 0;
  /** @internal Time since the previous update, ms (60 Hz until measured). */
  lastUpdateInterval = 1000 / 60;
  /** @internal */
  budgetFilled = false;
  /** @internal */
  readonly frameIntervals = new Float64Array(31);
  /** @internal */
  frameIntervalCount = 0;
  /**
   * @internal What is left of this frame's budget: upload bytes, and main-
   * thread time for building external tilesets' tile trees (at least one
   * of each happens per frame).
   */
  readonly uploadBudget = { bytes: 0, uploads: 0, ms: 0, trees: 0 };
  /** Main-thread time per frame for building tile trees, all tilesets. */
  treeBuildMsPerFrame = 4;
  /** @internal */
  tilesetRotation = 0;

  /**
   * Asks for a frame in on-demand mode, for changes the engine can't see:
   * state an application keeps outside the engine, and state changed in
   * place that it doesn't watch (`renderMode`).
   */
  requestRender(): void {
    this.renderRequested = true;
    this.wake();
  }

  /**
   * Asks the loop (`start`) for a tick: on demand it sleeps once nothing
   * changes, requesting no animation frames, until something wakes it.
   * The tick renders only if something visible changed; `requestRender`
   * renders regardless. Engine-side changes wake it themselves (see
   * `renderMode`); call this for state changed in place that the engine
   * fingerprints (a camera's vectors written without `version++`).
   */
  wake(): void {
    if (!this.running) {
      return;
    }
    if (this.ticking) {
      // Inside the frame: its end decides (`needsTicks`).
      this.wokenInTick = true;
      return;
    }
    this.schedule();
  }

  /**
   * Calls `listener` at the start of each frame of the loop (`start`) with
   * the frame's timestamp, before the engine looks for changes: what it
   * moves renders in the same frame (wakes from it are not needed, and are
   * ignored; a wake raised later in the tick runs the next frame). While a
   * listener returns true (it is still changing
   * something: a clock playing, an animation), the loop keeps going;
   * returning false lets it sleep until a wake. Returns the remover.
   *
   * The engine's frame has no fixed place among an application's own
   * `requestAnimationFrame` callbacks (it asks for a frame when woken): work
   * that must come before or after the engine renders belongs here or in
   * `onAfterTick`.
   */
  onTick(listener: (now: number) => boolean): () => void {
    this.tickListeners.push(listener);
    this.listenerAdded ||= this.ticking;
    this.wake();
    return () => {
      const i = this.tickListeners.indexOf(listener);
      if (i >= 0) {
        this.tickListeners.splice(i, 1);
      }
    };
  }

  /**
   * Calls `listener` at the end of each frame of the loop, after the engine
   * rendered what changed: for what is placed against what the canvas now
   * shows (DOM labels over the scene). A change it makes to the scene
   * wakes the loop for the next frame. It doesn't keep the loop going by
   * itself; it runs whenever the loop does. Returns the remover.
   */
  onAfterTick(listener: (now: number) => void): () => void {
    this.afterTickListeners.push(listener);
    this.listenerAdded ||= this.ticking;
    this.wake();
    return () => {
      const i = this.afterTickListeners.indexOf(listener);
      if (i >= 0) {
        this.afterTickListeners.splice(i, 1);
      }
    };
  }

  /**
   * A height capture: `world`'s ground (draws not marked `ground: false`)
   * seen straight down over a square around `origin` (`halfExtent` meters
   * each way in its east-north-up frame), its depth from `top` down to
   * `bottom` (meters along up) in a `size`² depth texture, drawn each frame
   * by the first view of the world (with what it selected). Height at a
   * texel: bottom + depth × (top − bottom); depth 0: no ground. For
   * clamping many things on the GPU (tracks). `origin` is in `anchor`'s
   * coordinates (default the Earth's: Earth-fixed), and its east, north
   * and up are the WGS84 ellipsoid's there.
   */
  addHeightCapture(
    world: World,
    options: {
      origin: Vec3;
      halfExtent: number;
      top?: number;
      bottom?: number;
      size?: number;
      anchor?: AnchorHandle;
    },
  ): HeightCapture {
    const anchor = contentAnchor(world, options.anchor, "addHeightCapture");
    const device = this.ctx.device;
    const size = options.size ?? 2048;
    const texture = device.createTexture({
      label: "heightCapture",
      size: [size, size],
      format: "depth32float",
      usage:
        GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
    });
    const frame = eastNorthUpToFixedFrame(
      options.origin,
      Ellipsoid.WGS84,
      m4.mat4(),
    );
    const capture: HeightCapture = {
      world,
      anchor,
      origin: v3.vec3(
        options.origin[0]!,
        options.origin[1]!,
        options.origin[2]!,
      ),
      axes: [
        v3.vec3(frame[0]!, frame[1]!, frame[2]!),
        v3.vec3(frame[4]!, frame[5]!, frame[6]!),
        v3.vec3(frame[8]!, frame[9]!, frame[10]!),
      ],
      halfExtent: options.halfExtent,
      top: options.top ?? 9000,
      bottom: options.bottom ?? -1000,
      size,
      texture,
      view: texture.createView(),
      captured: 0,
      stamp: -1,
      by: undefined,
      data: new Float32Array(VIEW_SIZE / 4),
      viewBytes: VIEW_SIZE,
      block: device.createBuffer({
        label: "heightCapture.view",
        size: VIEW_SIZE,
        usage: GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
      }),
    };
    this.captures.push(capture);
    this.requestRender();
    return capture;
  }

  removeHeightCapture(capture: HeightCapture): void {
    const i = this.captures.indexOf(capture);
    if (i >= 0) {
      this.captures.splice(i, 1);
      capture.texture.destroy();
      capture.block.destroy();
    }
  }

  /** Seconds since the engine started: `View.time`'s clock. */
  get time(): number {
    return (performance.now() - this.startTime) / 1000;
  }

  /**
   * Runs the frame loop with requestAnimationFrame until `stop()`. On
   * demand it requests frames only while something changes (`wake`).
   */
  start(): void {
    // Once: several viewers may share the engine, each starting it.
    if (this.running) {
      return;
    }
    this.running = true;
    this.schedule();
  }

  private schedule(): void {
    if (this.running && !this.scheduled) {
      this.scheduled = true;
      this.frameHandle = requestAnimationFrame(this.loop);
    }
  }

  /**
   * One frame of the loop, in a fixed order whatever woke it: the tick
   * listeners (`onTick`), the engine's tick (it renders what changed), the
   * after-tick listeners (`onAfterTick`), then whether to ask for the next
   * frame. A listener's or the tick's error is reported (`errors`) and the
   * frame goes on; after a failed tick the loop waits for the next wake
   * rather than failing every frame.
   */
  private readonly loop = (now: number): void => {
    this.scheduled = false;
    if (!this.running) {
      return;
    }
    let busy = false;
    let failed = false;
    this.ticking = true;
    this.listenerAdded = false;
    try {
      // Copies: a listener may remove itself.
      for (const listener of this.tickListeners.slice()) {
        try {
          busy = listener(now) || busy;
        } catch (error) {
          this.reportLoopError("a tick listener", error);
        }
      }
      // The camera layer after the listeners (they may move the clock or a
      // rig's node), before change detection: its placements render in
      // this tick, and it keeps the loop awake while they move.
      try {
        busy = this.cameras.update() || busy;
      } catch (error) {
        this.reportLoopError("the camera layer", error);
      }
      // Each view's placements, checked against its world (a removed
      // anchor, another world: `View.anchorRevision`), so the wake that
      // finding raises is this tick's own, like the listeners'.
      for (const view of this.views) {
        void view.anchorRevision;
      }
      // Body cameras are computed afresh from here (`bodyCamera`).
      this.cameraTick++;
      // What the listeners changed renders in this tick: their wakes are
      // not needed. A listener they added runs from the next frame.
      this.wokenInTick = this.listenerAdded;
      if (!this.running) {
        return; // stopped (or destroyed) by a listener
      }
      try {
        this.tick();
      } catch (error) {
        failed = true;
        this.reportLoopError("the tick", error);
      }
    } finally {
      this.ticking = false;
    }
    // Wakes from here on ask for the next frame.
    for (const listener of this.afterTickListeners.slice()) {
      try {
        listener(now);
      } catch (error) {
        this.reportLoopError("an after-tick listener", error);
      }
    }
    if (!this.running || failed) {
      return;
    }
    if (busy || this.renderMode_ === "continuous" || this.needsTicks()) {
      this.schedule();
    } else {
      this.stats.idle = true; // asleep: nothing more to render
    }
  };

  /**
   * The world a query's rays are in, and the views whose drawn content
   * they meet (undefined: any view). Throws for an anchor of another world
   * or one removed, or for no view nor anchor among several worlds.
   */
  private queryRoute(query: RayQuery): {
    world: World;
    viewMask: number | undefined;
  } {
    const { view, anchor } = query;
    let world: World | undefined;
    if (view) {
      world = view.world;
    } else if (anchor) {
      world = this.worlds.find((w) => w.anchorOf(anchor) === anchor);
    } else if (this.worlds.length === 1) {
      world = this.worlds[0];
    }
    if (!world) {
      throw new Error(
        anchor
          ? `queries: ${anchor.name} is not an anchor of any world of this engine.`
          : `queries: name a view or an anchor: the engine has ${this.worlds.length} worlds.`,
      );
    }
    if (anchor && world.anchorOf(anchor) !== anchor) {
      throw new Error(
        `queries: ${anchor.name} is not an anchor of the view's world.`,
      );
    }
    return { world, viewMask: view ? this.viewBit(view) : undefined };
  }

  private reportLoopError(where: string, error: unknown): void {
    this.ctx.errors.report(
      "frame",
      `${where} threw: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  /**
   * On demand, what still needs the next tick after this one: a render
   * asked for since (with a view to draw it), content loading or settling
   * (`Tileset3D.needsFrames`; loads in flight wake the loop as they end),
   * clamping, picks waiting to be served, or a wake raised during the
   * tick. Anything else changes by a wake.
   */
  private needsTicks(): boolean {
    if (this.wokenInTick) {
      return true; // woken during the tick, perhaps after it read the change
    }
    const views = this.views;
    for (let i = 0; i < views.length; i++) {
      const view = views[i]!;
      if (
        view.enabled &&
        (this.renderRequested || view.pendingPicks.length > 0)
      ) {
        return true;
      }
    }
    const tilesets = this.tilesets;
    for (let i = 0; i < tilesets.length; i++) {
      if (tilesets[i]!.needsFrames) {
        return true;
      }
    }
    return this.clamping.busy;
  }

  private frameRejected(error: GPUError): void {
    this.stats.rejectedFrames++;
    this.ctx.errors.report(
      "frame",
      `the GPU rejected a frame, which drew nothing: ${error.message}`,
    );
    for (const world of this.worlds) {
      world.rebind();
    }
  }

  private tick(): void {
    if (this.renderMode === "continuous") {
      this.renderFrame();
      return;
    }
    const links = this.links;
    // A link's camera write is this tick's own (seen below), not a change
    // to come: it doesn't run the next frame.
    const woken = this.wokenInTick;
    for (let i = 0; i < links.length; i++) {
      links[i]!.evaluate();
    }
    this.wokenInTick = woken;
    // Which targets need a frame. A canvas gets a fresh texture each frame,
    // so a target redraws all its views when any of them changed; targets
    // with none changed are skipped and keep their last image.
    // A custom shader's uniform or texture changed: everything may show it.
    const uniforms = this.ctx.shaderBindings.flush();
    const all = this.globalChanged() || this.renderRequested || uniforms;
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
    updateTilesets(this, (tileset) => all || moved || tileset.active);
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
    serveIdlePick(this, dirtyViews);
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
    const n = this.viewKey(view);
    let changed = false;
    for (let i = 0; i < n; i++) {
      if (s[i] !== key[i]) {
        changed = true;
        key[i] = s[i]!;
      }
    }
    return changed;
  }

  /**
   * Writes a view's fingerprint into `scratchKey` (`viewChanged`) and
   * returns how many values it wrote: `VIEW_KEY_LENGTH`, which a test
   * holds it to (a value past the end is silently dropped).
   */
  private viewKey(view: View): number {
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
    s[n++] = updateExposure(this, view);
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
    // The placements, and the body anchor (the body camera's).
    s[n++] = view.anchorRevision;
    s[n++] = view.bodyAnchor?.slot ?? -1;
    return n;
  }

  stop(): void {
    this.running = false;
    if (this.scheduled) {
      this.scheduled = false;
      cancelAnimationFrame(this.frameHandle);
    }
  }
  private running = false;

  /**
   * Renders every enabled view now, whatever the render mode. Outside the
   * loop, the camera layer places each view's anchors first.
   */
  renderFrame(): void {
    if (!this.ticking) {
      this.cameras.update();
    }
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
    this.cameraTick++;
    this.stats.idle = false;
    // Custom shaders' uniforms changed since the tick (or no tick ran);
    // the tick still sees what changed for its views.
    this.ctx.shaderBindings.flush(false);
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
      updateTilesets(this, () => true);
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
      const frame = viewFrameFor(this, view, rect);
      frame.slot = slots;
      // Every frame takes the view's exposure as it is now: only the
      // on-demand check computed it, so `renderFrame()` and the continuous
      // loop drew with a stale scale (a fixed exposure set later never
      // applied; automatic exposure never moved).
      updateExposure(this, view);
      this.writeView(view, slots, rect);
      updateEnvironment(this, view);
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
    // The views' and cascades' blocks went up as they were written
    // (`writeView`, `writeShadows`: each to its anchor table's used slots).
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
        // The scene time of this image, for its picks (also idle ones).
        frame.seconds = this.cameras.clock(view.world)?.seconds ?? 0;
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
    // A rejected submit draws nothing: report it and bind the worlds again
    // from their state, rather than repeat a black frame unexplained.
    device.pushErrorScope("validation");
    device.queue.submit(this.commandBuffers);
    void device.popErrorScope().then((error) => {
      if (error) {
        this.frameRejected(error);
      }
    });
    this.timer.afterSubmit();
    this.pool.endFrame();
    if (this.picks.length > 0) {
      resolvePicks(this, this.picks);
      this.picks.length = 0;
    }
    for (const meter of this.meters.splice(0)) {
      whenMapped(meter.readback, () => {
        const [sum, count, rodSum, rodCount] = new Float32Array(
          meter.readback.getMappedRange(),
        );
        meter.readback.destroy();
        meter.scratch.forEach((b) => b.destroy());
        adaptExposure(
          this,
          meter.view,
          count! > 0 ? 2 ** (sum! / count!) : undefined,
          rodCount! > 0 ? 2 ** (rodSum! / rodCount!) : undefined,
        );
      });
    }
    for (const range of this.depthRanges.splice(0)) {
      whenMapped(range.readback, () => {
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
      whenMapped(readback, () => {
        const needed = new Uint32Array(readback.getMappedRange())[0]!;
        readback.destroy();
        this.listCountPending = false;
        // Room for a quarter more than the frame needed (`writeTranslucency`),
        // and a frame drawn with it: that one dropped what didn't fit, and
        // drawing on demand, nothing else might come (glass missing until
        // the camera moved).
        if (needed > this.listNodes) {
          this.listNodes = Math.ceil(needed * 1.25);
          this.requestRender();
        }
      });
    }
    for (const read of this.hdrReads.splice(0)) {
      whenMapped(read.buffer, () => {
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
      this.bodyCamera(view).position,
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
    const camera = this.bodyCamera(view);
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
      this.anchorEyes,
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
    const camera = this.bodyCamera(view);
    computeAnchorEyes(camera, view, this.anchorEyes);
    this.reportFarAnchors(view);
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
    block.time = (performance.now() - this.startTime) / 1000;
    this.viewCityLight = this.cityLightAt(view);
    block.aerial = undefined;
    // The Moon's light: its full disk gives the albedo's share of the sun's
    // light times its solid angle over π, then less by phase (Allen).
    const moon = moonFrom(this, camera.position);
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
    writeAnchorEyes(
      this.viewData,
      (index * VIEW_STRIDE) / 4,
      camera,
      view,
      this.anchorEyes,
    );
    this.viewDataU32[(index * VIEW_STRIDE) / 4 + VIEW_BIT_WORD] =
      this.viewBit(view);
    const bytes = viewBlockBytes(this.anchorEyes.count);
    this.viewFrames.get(view)!.viewBytes = bytes;
    this.ctx.device.queue.writeBuffer(
      this.viewStaging,
      index * VIEW_STRIDE,
      this.viewData,
      (index * VIEW_STRIDE) / 4,
      bytes / 4,
    );
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
    // Only what this view draws: a blended draw in no view (viewMask) or
    // hidden switches none of the passes on.
    const range = view.world.translucentRange(
      this.bodyCamera(view).position,
      this.viewBit(view),
    );
    frame.translucent = range !== undefined;
    if (!range) {
      return;
    }
    const pixels = frame.width * frame.height;
    let capacity = 0;
    if (view.translucencyMethod === "exact") {
      const { limits } = this.ctx.device;
      const heads = (LIST_HEADER + pixels) * 4;
      // At most what a node's `next` can address (translucent.wgsl
      // LIST_SAMPLE_SHIFT: 28 bits, the node plus one).
      const most = Math.min(
        Math.floor(
          (Math.min(limits.maxStorageBufferBindingSize, limits.maxBufferSize) -
            heads) /
            16,
        ),
        LIST_NODES_MAX,
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
      capacity = Math.min(
        Math.floor((this.lists.size - heads) / 16),
        LIST_NODES_MAX,
      );
    }
    // The moments' depths: the blended surfaces' own range (the moments
    // can't tell apart layers whose warped depths nearly agree: a range
    // reaching kilometers past a model's centimeters speckled it).
    const near = Math.max(range.near, this.bodyCamera(view).near, 1e-3);
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

  /** @internal What a translucent pass binds where it reads no lists or moments. */
  translucentInputs(): NonNullable<Engine["translucentDummies"]> {
    if (!this.translucentDummies) {
      const { device, pipelines } = this.ctx;
      const texture = (format: GPUTextureFormat) =>
        device
          .createTexture({
            label: "translucent.placeholder",
            size: [1, 1],
            format,
            usage:
              GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING,
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
        color: texture("rgba16float"),
      };
    }
    return this.translucentDummies;
  }

  /**
   * @internal A view's translucent pass's group 3 (translucent.wgsl): its parameters
   * and depth, with the lists and the moments given; kept by role while
   * they stay the same.
   */
  translucentGroup(
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

  /**
   * @internal A view's composite's group (composite.slang): what "exact" blended
   * (lit, unlit: bindings 3, 4), or the moments' zeroth and sums (2–4).
   */
  compositeGroup(
    frame: ViewFrame,
    role: number,
    pipeline: GPURenderPipeline,
    inputs: GPUTextureView[],
  ): GPUBindGroup {
    const first = 5 - inputs.length;
    return this.keptGroup(frame, role, inputs, () =>
      this.ctx.device.createBindGroup({
        label: "composite",
        layout: pipeline.getBindGroupLayout(0),
        entries: inputs.map((resource, i) => ({
          binding: first + i,
          resource,
        })),
      }),
    );
  }

  /** @internal */
  keptGroup(
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
  /**
   * The height captures of `view`'s world not yet drawn this frame: their
   * block (the view's, with a straight-down orthographic projection over
   * the capture's square, its culling box, and View.time.y 1: ground
   * only), drawn by `view` (the `height-captures` pass).
   */
  private writeCaptures(view: View): void {
    const block = this.viewBlock;
    const bodyCamera = this.bodyCamera(view);
    const camera = bodyCamera.position;
    for (const c of this.captures) {
      if (c.world !== view.world || c.stamp === this.frameNumber) {
        continue;
      }
      c.stamp = this.frameNumber;
      c.by = view;
      let [e, n, u] = c.axes;
      let origin = c.origin;
      const body = view.bodyAnchor;
      if (c.anchor !== body) {
        // The block is in the body anchor's axes (the shading axes): the
        // capture's square re-expressed there, in float64.
        const m = m4.multiply(
          scratchSelection,
          m4.invertAffine(
            scratchSelectionInverse,
            view.anchorPlacement(body, scratchSelectionBody),
          ),
          view.anchorPlacement(c.anchor, scratchCaptureAnchor),
        );
        origin = m4.transformPoint(scratchCaptureOrigin, m, c.origin);
        e = rotateVector(m, e, scratchCaptureAxes[0]);
        n = rotateVector(m, n, scratchCaptureAxes[1]);
        u = rotateVector(m, u, scratchCaptureAxes[2]);
      }
      const rel = v3.sub(v3.vec3(), origin, camera);
      const h = c.halfExtent;
      const depth = c.top - c.bottom;
      const ce = v3.dot(e, rel);
      const cn = v3.dot(n, rel);
      const cu = v3.dot(u, rel);
      // Column-major: clip = M · (camera-relative p, 1), reverse-Z (top 1).
      const m = scratchCapture;
      m.fill(0);
      for (let k = 0; k < 3; k++) {
        m[k * 4] = e[k]! / h;
        m[k * 4 + 1] = n[k]! / h;
        m[k * 4 + 2] = u[k]! / depth;
      }
      m[12] = -ce / h;
      m[13] = -cn / h;
      m[14] = (-cu - c.bottom) / depth;
      m[15] = 1;
      // Culling: the square's four sides and its bottom.
      const p = scratchCapturePlanes;
      const plane = (i: number, a: Vec3, sign: number, w: number) => {
        p[i * 4] = a[0]! * sign;
        p[i * 4 + 1] = a[1]! * sign;
        p[i * 4 + 2] = a[2]! * sign;
        p[i * 4 + 3] = w;
      };
      plane(0, e, 1, -(ce - h));
      plane(1, e, -1, ce + h);
      plane(2, n, 1, -(cn - h));
      plane(3, n, -1, cn + h);
      plane(4, u, 1, -(cu + c.bottom));
      const viewProj = block.viewProj;
      const planes = block.planes;
      const aerial = block.aerial;
      block.viewProj = m;
      block.planes = p;
      block.aerial = undefined;
      writeViewBlock(c.data, 0, block);
      writeAnchorEyes(c.data, 0, bodyCamera, view, this.anchorEyes);
      block.viewProj = viewProj;
      block.planes = planes;
      block.aerial = aerial;
      new Uint32Array(c.data.buffer)[VIEW_BIT_WORD] = this.viewBit(view);
      c.data[VIEW_TIME_WORD + 1] = 1; // View.time.y: ground only
      c.viewBytes = viewBlockBytes(this.anchorEyes.count);
      this.ctx.device.queue.writeBuffer(c.block, 0, c.data, 0, c.viewBytes / 4);
    }
  }

  private writeShadows(view: View, index: number, aspect: number): void {
    const frame = this.viewFrames.get(view)!;
    const camera = this.bodyCamera(view);
    const light = shadowLight(this, view, camera.position, this.viewBlock.moon);
    frame.shadowed = light !== undefined;
    const moonUp = light?.moon === true;
    const cascades = this.cascades;
    if (light) {
      const sun = light.direction;
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
        writeAnchorEyes(this.cascadeData, o, camera, view, this.anchorEyes);
        this.cascadeDataU32[o + VIEW_BIT_WORD] = this.viewBit(view);
        this.cascadeData[o + VIEW_TIME_WORD + 2] = 1; // View.time.z: casters too
        this.ctx.device.queue.writeBuffer(
          this.cascadeStaging,
          o * 4,
          this.cascadeData,
          o,
          frame.viewBytes / 4,
        );
      }
      block.viewProj = viewProj;
      block.planes = planes;
      block.aerial = aerial;
    }
    this.writeCaptures(view);
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

  /** @internal */
  drawOverlays(pass: GPURenderPassEncoder, view: View): void {
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
    const eye = this.bodyCamera(view).position;
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

  destroy(): void {
    this.stop();
    for (const unwatch of this.viewWatches.values()) {
      unwatch();
    }
    this.viewWatches.clear();
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

const FRAME_ENCODER: GPUCommandEncoderDescriptor = { label: "frame" };
const scratchMoonAxis = v3.vec3();
/**
 * The stars as the eye sees them against a dark sky, EV100 (sky.slang
 * `starExposure`): shown where the view's own adaptation is less open
 * (from orbit by day); about as bright as 1.x draws its star map.
 */
const EYE_STARS_EV100 = -3;

const scratchView = m4.mat4();
const scratchCartographic: Cartographic = {
  longitude: 0,
  latitude: 0,
  height: 0,
};
const scratchProj = m4.mat4();
const scratchSelection = m4.mat4();
const scratchSelectionInverse = m4.mat4();
const scratchSelectionBody = new Float64Array(16);
const scratchCaptureAnchor = new Float64Array(16);
const scratchCaptureOrigin = v3.vec3();
const scratchCaptureAxes = [v3.vec3(), v3.vec3(), v3.vec3()] as const;
const scratchAo = new Float32Array(16);
const scratchViewProj = m4.mat4();
const scratchPlanes = new Float32Array(20);

/** A height capture (`Engine.addHeightCapture`). */
export interface HeightCapture {
  readonly world: World;
  /** The anchor its square is placed in (default the Earth's). */
  readonly anchor: AnchorHandle;
  /** Its middle, in `anchor`'s coordinates. */
  readonly origin: Vec3;
  /** East, north and up at `origin`. */
  readonly axes: readonly [Vec3, Vec3, Vec3];
  readonly halfExtent: number;
  readonly top: number;
  readonly bottom: number;
  readonly size: number;
  readonly texture: GPUTexture;
  readonly view: GPUTextureView;
  /** Frames it has been drawn. */
  captured: number;
  /** The frame its block was written for, and the view drawing it. */
  stamp: number;
  by: View | undefined;
  readonly data: Float32Array;
  readonly block: GPUBuffer;
  /** @internal Bytes of `data` written for its last draw (`viewBlockBytes`). */
  viewBytes: number;
}

const scratchCapture = m4.mat4();
const scratchCapturePlanes = new Float32Array(20);
