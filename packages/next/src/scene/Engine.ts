import type { EngineError, EngineErrorKind } from "../gpu/EngineErrors.ts";
import { RequestScheduler } from "../streaming/RequestScheduler.ts";
import { GpuDevice, type GpuDeviceOptions } from "../gpu/GpuDevice.ts";
import { GpuTimer } from "../gpu/GpuTimer.ts";
import { TexturePool } from "../render/FrameGraph.ts";
import { VIEW_STRIDE } from "../render/layout.ts";
import * as m4 from "../math/mat4.ts";
import * as v3 from "../math/vec3.ts";
import type { Vec3 } from "../math/vec3.ts";
import {
  createRenderContext,
  SCENE_TARGETS,
  type RenderContext,
  type ShaderOverrides,
} from "./RenderContext.ts";
import { createBox } from "./meshes.ts";
import { View, type ViewOptions } from "./View.ts";
import {
  CanvasTarget,
  OffscreenTarget,
  type RenderTarget,
} from "./renderTarget.ts";
import { ViewLink, type ViewLinkOptions } from "./ViewLink.ts";
import { RealtimeAtmosphere } from "../atmosphere/RealtimeAtmosphere.ts";
import { Sky } from "../atmosphere/Sky.ts";
import type { AerosolType } from "../atmosphere/model.ts";
import { EARTH } from "./Body.ts";
import type { StarField } from "../atmosphere/stars.ts";
import { Camera } from "./Camera.ts";
import { SHADOW_CASCADES, SHADOWS_STRIDE } from "./shadows.ts";
import { LIGHTS_SIZE } from "./lights.ts";
import { World } from "./World.ts";
import { type AnchorHandle, type WorldOptions } from "./world/types.ts";
import { CameraLayer } from "../camera/CameraLayer.ts";
import { ANCHOR_EYE_REACH } from "./anchorEyes.ts";
import { HeightClamping } from "./HeightClamping.ts";
import type { GlobeImageryOptions } from "../globe/GlobeImagery.ts";
import type { ImageryProvider } from "../globe/ImageryProvider.ts";
import type { Tileset3D } from "../streaming/Tileset3D.ts";
import type { TilesetOptions } from "../streaming/tilesetTypes.ts";
import type { Globe } from "../globe/Globe.ts";
import type { GltfAsset } from "../io/gltfTypes.ts";
import type { ModelResource, ModelResourceOptions } from "./gltfModel.ts";
import type { CustomShader } from "./CustomShader.ts";
import {
  createSpatialQueries,
  type RayQuery,
  type SpatialQueries,
} from "../query/queries.ts";
import { globeTarget, terrainBackend } from "../query/terrainBackend.ts";
import { drawBackend } from "../query/drawBackend.ts";
import {
  destroyViewFrame,
  TONE_MAPPINGS,
} from "../render/view/viewFrameData.ts";
import { serveIdlePick } from "../render/view/picks.ts";
import { updateExposure } from "../render/view/exposure.ts";
import { scratchFrame } from "../render/view/environment.ts";
import { updateTilesets } from "./tileSelection.ts";
import {
  scratchViewProj,
  scratchView,
  scratchPlanes,
} from "../render/view/viewBlocks.ts";
import { dropPersistent, render } from "../render/view/renderTick.ts";
import {
  loadGltfFile,
  compileShader,
  loadModel,
  uploadModelTo,
  loadTileset,
  adoptTileset,
  addTileset,
  addTerrain,
  addEllipsoid,
  removeTileset,
} from "./engineContent.ts";
import {
  type HeightCapture,
  sampleHeightMostDetailed,
  addHeightCapture,
  removeHeightCapture,
} from "./heightCaptures.ts";
import { EngineScene } from "./engineScene.ts";
import { EngineRaster } from "../render/view/engineRaster.ts";

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
  /** @internal Rasterizer data: staging buffers, view targets, picks, pass descriptors. */
  readonly raster: EngineRaster = new EngineRaster();
  /** @internal Scene data: view ids and motion, tick timing, selection scratch. */
  readonly scene: EngineScene = new EngineScene();

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
    return this.raster.timer.passes;
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
  /** Content request windows per origin, shared by all tilesets. */
  readonly requests = new RequestScheduler();
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
  /** Per view, the anchors its eye was last too far from (reported once). */
  private readonly farAnchors = new WeakMap<View, Set<AnchorHandle>>();
  private readonly freeViewIds: number[] = [];
  private readonly maxViews: number;
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
  /** Fingerprints of the last rendered frame (see viewChanged). */
  private readonly viewKeys = new Map<View, Float64Array>();
  private readonly globalKey = new Float64Array(5).fill(Number.NaN);
  private readonly scratchKey = new Float64Array(VIEW_KEY_LENGTH);
  private readonly dirtyTargets = new Set<RenderTarget>();
  private readonly dirtyViews = new Set<View>();

  private constructor(
    gpu: GpuDevice,
    ctx: RenderContext,
    sky: Sky,
    maxViews: number,
  ) {
    this.gpu = gpu;
    this.ctx = ctx;
    this.raster.sky = sky;
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
    this.raster.pool = new TexturePool(device);
    this.raster.timer = new GpuTimer(device);
    this.raster.viewData = new Float32Array((maxViews * VIEW_STRIDE) / 4);
    this.raster.viewDataU32 = new Uint32Array(this.raster.viewData.buffer);
    for (let id = Math.min(maxViews, 32) - 1; id >= 0; id--) {
      this.freeViewIds.push(id);
    }
    this.raster.viewStaging = device.createBuffer({
      label: "viewStaging",
      size: maxViews * VIEW_STRIDE,
      usage: GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
    });
    this.raster.cascadeData = new Float32Array(
      (maxViews * SHADOW_CASCADES * VIEW_STRIDE) / 4,
    );
    this.raster.cascadeDataU32 = new Uint32Array(
      this.raster.cascadeData.buffer,
    );
    this.raster.cascadeStaging = device.createBuffer({
      label: "cascadeStaging",
      size: maxViews * SHADOW_CASCADES * VIEW_STRIDE,
      usage: GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
    });
    this.raster.shadowData = new Float32Array((maxViews * SHADOWS_STRIDE) / 4);
    this.raster.shadowStaging = device.createBuffer({
      label: "shadowStaging",
      size: maxViews * SHADOWS_STRIDE,
      usage: GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
    });
    this.raster.lightStaging = device.createBuffer({
      label: "lightStaging",
      size: maxViews * LIGHTS_SIZE,
      usage: GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
    });
    this.raster.viewBlock = {
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
    this.raster.pickParams = device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.raster.pickResult = device.createBuffer({
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
    this.scene.workers.warm();
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
      this.raster.sky.setStarField(null);
      this.requestRender();
      return;
    }
    const urls = faces.map((url) => new URL(url, location.href).href);
    void this.scene.workers.request<StarField>("stars", { urls }).then(
      (field) => {
        if (token === this.starToken) {
          this.raster.sky.setStarField(field);
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
    this.raster.sky.setMoonMap(image, mean);
    this.requestRender();
  }

  /**
   * How far one can see through the Earth's air, km: the haze of its
   * aerosols (the sky, aerial perspective and the sun's light all follow).
   * Default 60 km, a fair, clear day; Bruneton's reference atmosphere (no
   * value) is about 220 km, very clean air.
   */
  get visibility(): number | undefined {
    return this.raster.sky.atmosphere.visibility;
  }

  set visibility(kilometers: number | undefined) {
    this.setHaze(kilometers, this.aerosol);
  }

  /**
   * What the Earth air's haze is made of (`AEROSOLS`): fine continental
   * particles by default (a bluish haze), urban, maritime or desert dust.
   */
  get aerosol(): AerosolType | undefined {
    return this.raster.sky.atmosphere.aerosol;
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
    this.raster.sky.setHaze(kilometers, aerosol);
    // Every view's environment from the new air.
    for (const entry of this.raster.probes.values()) {
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
    return loadGltfFile(this, url, options);
  }

  /**
   * Compiles a custom shader's pipelines ahead of use (content using it
   * otherwise draws with the default until they are ready). Rejects with
   * the compiler's messages.
   */
  async compileShader(shader: CustomShader): Promise<void> {
    return compileShader(this, shader);
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
    return loadModel(this, world, url, options);
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
    return uploadModelTo(this, world, asset, options);
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
    return loadTileset(this, url, options);
  }

  /** @internal A tileset loaded alone was added to its world. */
  adoptTileset(tileset: Tileset3D): void {
    adoptTileset(this, tileset);
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
    return addTileset(this, world, url, options);
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
    return addTerrain(this, world, url, options);
  }

  /**
   * The ellipsoid as a globe without terrain data (1.x's default
   * `EllipsoidTerrainProvider`): flat tiles built in workers, selected,
   * culled and draped with imagery like terrain. Under the Earth's anchor
   * unless `options.anchor` names another.
   */
  addEllipsoid(world: World, options: GlobeOptions = {}): Globe {
    return addEllipsoid(this, world, options);
  }

  removeTileset(tileset: Tileset3D): void {
    removeTileset(this, tileset);
  }

  /** Render-target pool usage (transient textures shared by all views). */
  get renderTargetMemory() {
    return this.raster.pool.stats;
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
      entry.tick !== this.scene.cameraTick ||
      entry.version !== version ||
      entry.revision !== revision ||
      entry.anchor !== anchor
    ) {
      view.anchorCamera(anchor, entry.camera);
      entry.version = version;
      entry.revision = revision;
      entry.anchor = anchor;
      entry.tick = this.scene.cameraTick;
    }
    return entry.camera;
  }

  /**
   * @internal Reports, once each time it happens, an anchor whose draws a view hides
   * because its eye is beyond `ANCHOR_EYE_REACH` of it.
   */
  reportFarAnchors(view: View): void {
    const eyes = this.scene.anchorEyes;
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
            `The eye of view ${this.scene.viewIds.get(view) ?? "?"} is more than ${ANCHOR_EYE_REACH.toLocaleString("en-US")} m (2^31 m) from the anchor ${anchor.name}: its draws are hidden in that view.`,
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
    return sampleHeightMostDetailed(this, world, positions, options);
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
    if (atmosphere && atmosphere !== this.raster.sky.atmosphere.parameters) {
      // Per-body atmospheres follow with per-body frames (plan §13.14).
      throw new Error(
        `Only the Earth's atmosphere is built so far (view body ${view.body.name}).`,
      );
    }
    this.views.push(view);
    this.scene.viewIds.set(view, id);
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
    return (1 << this.scene.viewIds.get(view)!) >>> 0;
  }

  removeView(view: View): void {
    this.viewWatches.get(view)?.();
    this.viewWatches.delete(view);
    view.wake = undefined;
    view.renderRoot = undefined;
    dropPersistent(this, view);
    const probe = this.raster.probes.get(view);
    if (probe) {
      this.ctx.environment.destroyProbe(probe.probe);
      this.raster.probes.delete(view);
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
    const id = this.scene.viewIds.get(view);
    if (id !== undefined) {
      this.scene.viewIds.delete(view);
      this.scene.viewMotion.delete(view);
      this.freeViewIds.push(id);
    }
    const frame = this.raster.viewFrames.get(view);
    if (frame) {
      destroyViewFrame(frame);
    }
    this.raster.viewFrames.delete(view);
    this.raster.overlayResources.get(view)?.buffer.destroy();
    this.raster.overlayResources.get(view)?.params.destroy();
    this.raster.overlayResources.delete(view);
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
  /** Main-thread time per frame for building tile trees, all tilesets. */
  treeBuildMsPerFrame = 4;

  /**
   * Asks for a frame in on-demand mode, for changes the engine can't see:
   * state an application keeps outside the engine, and state changed in
   * place that it doesn't watch (`renderMode`).
   */
  requestRender(): void {
    this.scene.renderRequested = true;
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
    return addHeightCapture(this, world, options);
  }

  removeHeightCapture(capture: HeightCapture): void {
    removeHeightCapture(this, capture);
  }

  /** Seconds since the engine started: `View.time`'s clock. */
  get time(): number {
    return (performance.now() - this.scene.startTime) / 1000;
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
      this.scene.cameraTick++;
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
        (this.scene.renderRequested || view.pendingPicks.length > 0)
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
    const all = this.globalChanged() || this.scene.renderRequested || uniforms;
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
        (view.pendingPicks.length > 0 &&
          !this.raster.viewFrames.get(view)?.rendered)
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
    render(this, true, dirty, dirtyViews);
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
    render(this, false);
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
    this.raster.pool.destroy();
    this.raster.lists?.destroy();
    this.raster.timer.destroy();
    this.raster.sky.atmosphere.destroy();
    this.raster.sky.destroy();
    this.scene.workers.destroy();
    this.gpu.destroy();
  }
}
