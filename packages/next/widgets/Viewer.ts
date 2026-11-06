/**
 * `Viewer`: 2.0's counterpart to 1.x's `Cesium.Viewer`, outside the engine
 * core (which stays headless, as 1.x's widgets sit outside its engine). One
 * call sets up what an app needs to look at content on the globe: a canvas,
 * the engine, a world and a view, a globe camera controller, the globe (the
 * ellipsoid or Cesium World Terrain, with the ion default imagery) and the
 * credits on screen; the inspector on request. Content is added through it
 * so its attributions are credited and it can be framed; everything else is
 * the engine's own API (`viewer.engine`, `viewer.world`, `viewer.view`).
 *
 *   const viewer = await Viewer.create(container);
 *   const tileset = await viewer.addTileset({ ion: 96188 });
 *   viewer.zoomTo({ longitude: -75.16, latitude: 39.95, range: 1500 });
 *
 * The sun follows the viewer's clock (`viewer.clock`), set with the time
 * controls over the view; `setSun` places it by hand instead.
 */
import {
  BingImagery,
  CanvasTarget,
  IonTmsImagery,
  Clock,
  EYE,
  Ellipsoid,
  DEFAULT_SKY,
  Engine,
  GlobeController,
  InspectController,
  eastNorthUpToFixedFrame,
  fromDegrees,
  loadFrameData,
  loadIonMoonMap,
  mat4,
  resolveIonAsset,
  vec3,
  type EngineOptions,
  type FrameData,
  type Exposure,
  type ImageryProvider,
  type IonAttribution,
  ModelPlacement,
  type ModelResource,
  type ModelResourceOptions,
  type PickResult,
  type Tileset3D,
  type TilesetOptions,
  type View,
  type ViewLink,
  type World,
} from "../src/index.ts";
import { FrameSky } from "../src/frames/frameSky.ts";
import { attachCredits, type CreditsHandle } from "./credits.ts";
import { inspectEngine } from "./engine.ts";
import {
  followZoom,
  orbitState,
  planOrbit,
  type OrbitOptions,
} from "./orbitFocus.ts";
import type { Inspectable } from "./inspectable.ts";
import {
  attachInspector,
  type InspectorHandle,
  type InspectorOptions,
} from "./inspector.ts";
import {
  attachTimeControls,
  type TimeControlsHandle,
  type TimeControlsOptions,
} from "./timeControls.ts";

export type GlobeKind = "ellipsoid" | "terrain" | false;

export interface ViewerOptions {
  /**
   * Start with presentation suspended (`suspendPresentation`): nothing is
   * presented until `resumePresentation()`, so an application that loads
   * and frames content first never shows the whole-Earth start. Default
   * false.
   */
  suspendPresentation?: boolean;
  /**
   * The engine: options for one of the viewer's own (destroyed with it),
   * or an engine to share (several viewers on one device, pipelines and
   * workers; destroying the viewer removes only its world and views).
   */
  engine?: EngineOptions | Engine;
  /**
   * The globe: the WGS84 ellipsoid (default), Cesium World Terrain (ion
   * asset 1), or none.
   */
  globe?: GlobeKind;
  /**
   * Imagery on the globe: the ion default, Bing Maps Aerial (true, the
   * default), a provider, or none.
   */
  imagery?: ImageryProvider | boolean;
  /** Tile selection for the globe and added tilesets (default "budgeted"). */
  policy?: "budgeted" | "stepwise";
  /** Render only when something changes (default) or every frame. */
  renderMode?: "onDemand" | "continuous";
  /** Show the credits over the view (default true). */
  credits?: boolean;
  /** Attach the inspector over the view (default false). */
  inspector?: boolean | InspectorOptions;
  /** ion access token for terrain, imagery and ion tilesets. */
  accessToken?: string;
  /**
   * The scene's clock (default: a new one, paused; the first framing sets
   * it to 10:30 local solar time today at what is framed).
   */
  clock?: Clock;
  /** Show the time controls over the view (default true). */
  timeControls?: boolean | Omit<TimeControlsOptions, "place">;
  /**
   * The stars behind the sky (default true: 1.x's Tycho star map, turned
   * by the clock); false: none.
   */
  stars?: boolean;
  /**
   * The Moon in the sky and its light at night (default true: placed and
   * turned by the clock, with Cesium Moon Terrain's map when the ion token
   * reaches it, 1.x's until then or else); false: none.
   */
  moon?: boolean;
  /**
   * DE440 for the sky: a base URL for `loadFrameData` (the store `npm run
   * setup` fills, served at "/frames-data/") or data already loaded. The
   * stars, the Moon and the sun then come from the ephemeris and the IAU
   * 2006/2000A Earth rotation inside the data's span, and from the analytic
   * models outside it. Default: none, the analytic sky (the data is loaded
   * only when a scene needs it).
   */
  frameData?: string | FrameData;
  /**
   * How light becomes an image (`Exposure`): default `EYE`, as a person
   * there would see it; a camera's exposure for what a camera records.
   */
  exposure?: Exposure;
  /**
   * The Earth's lights at night (default true: NASA's Black Marble, ion
   * asset 3812, when the token can reach it), or another night image;
   * false: none. `cityLights` turns them on and off.
   */
  cityLights?: boolean | ImageryProvider | Promise<ImageryProvider | undefined>;
  /** The sun's shadows in the views (default true; `View.shadows`). */
  shadows?: boolean;
  /** Ambient occlusion in the views (default true; `View.ambientOcclusion`). */
  ambientOcclusion?: boolean;
  /**
   * Instance rows the world holds (default 16,384; 64 bytes each of GPU
   * memory from the start): instanced models and track collections take
   * one per instance and part.
   */
  maxInstances?: number;
}

/** The Moon map's attributions' owner (`addAttributions`). */
const MOON_CREDIT = {};

/** 1.x's moon map (equirectangular, the near side in the middle). */
const MOON_MAP = new URL(
  "../../engine/Source/Assets/Textures/moonSmall.jpg",
  import.meta.url,
);

/** 1.x's star map (Tycho), +x, −x, +y, −y, +z, −z in the celestial frame. */
const STAR_MAP = [
  new URL(
    "../../engine/Source/Assets/Textures/SkyBox/tycho2t3_80_px.jpg",
    import.meta.url,
  ),
  new URL(
    "../../engine/Source/Assets/Textures/SkyBox/tycho2t3_80_mx.jpg",
    import.meta.url,
  ),
  new URL(
    "../../engine/Source/Assets/Textures/SkyBox/tycho2t3_80_py.jpg",
    import.meta.url,
  ),
  new URL(
    "../../engine/Source/Assets/Textures/SkyBox/tycho2t3_80_my.jpg",
    import.meta.url,
  ),
  new URL(
    "../../engine/Source/Assets/Textures/SkyBox/tycho2t3_80_pz.jpg",
    import.meta.url,
  ),
  new URL(
    "../../engine/Source/Assets/Textures/SkyBox/tycho2t3_80_mz.jpg",
    import.meta.url,
  ),
];

/** A tileset by URL, or an ion asset. */
export type TilesetSource =
  string | URL | { ion: number; accessToken?: string };

/** What `zoomTo` frames. */
export type ZoomTarget =
  | Tileset3D
  | ModelPlacement
  | { center: ArrayLike<number>; radius: number }
  | { longitude: number; latitude: number; range?: number };

const ellipsoid = Ellipsoid.WGS84;
const deg = Math.PI / 180;

/** Endpoints `Viewer.create` starts resolving before the engine exists. */
interface EarlyEndpoints {
  imagery?: Promise<BingImagery>;
  terrain?: ReturnType<typeof resolveIonAsset>;
}

export class Viewer {
  readonly engine: Engine;
  readonly canvas: HTMLCanvasElement;
  readonly target: CanvasTarget;
  readonly world: World;
  /** The main view (the left half in split view). */
  readonly view: View;
  readonly controller: GlobeController;
  /** Orbit controls around the focus, when on (`setControls("orbit")`). */
  private orbit_?: InspectController;
  /** Policy for the globe and tilesets added later. */
  policy: "budgeted" | "stepwise";
  /** Builds the globe; content added before it is ready still loads. */
  readonly ready: Promise<void>;

  private globe_?: Tileset3D;
  private globeKind: GlobeKind;
  private globeShown = true;
  private globeToken = 0;
  private imagery?: ImageryProvider;
  /** The default imagery while its metadata resolves. */
  private imageryLoading?: Promise<ImageryProvider>;
  private terrainAttributions: IonAttribution[] = [];
  private readonly attributions = new Map<object, IonAttribution[]>();
  private readonly tilesets = new Set<Tileset3D>();
  private second?: View;
  private secondController?: GlobeController;
  private overview_?: View;
  private overviewLink?: ViewLink;
  private readonly focusCenter = vec3.vec3();
  private sun?: { azimuth: number; elevation: number };
  /** The scene's time: the sun follows it unless placed by `setSun`. */
  readonly clock: Clock;
  private sunFromClock_ = true;
  /**
   * The sky from the loaded frames data (`ViewerOptions.frameData`, once it
   * arrives, or `setFrameData`).
   */
  private readonly frameSky = new FrameSky();
  /** Counts `setFrameData` calls, so a load still in flight does not undo one. */
  private frameDataSets = 0;
  /**
   * Always a promise: it resolves to the data, or to `undefined`, silently
   * when no `ViewerOptions.frameData` was given and after one `console.warn`
   * when loading failed. In both cases the sky stays analytic.
   */
  readonly frameData: Promise<FrameData | undefined>;
  /** The Moon is drawn (`ViewerOptions.moon`). */
  private readonly moon: boolean;
  /** Cesium Moon Terrain's map arrived (1.x's no longer wanted). */
  private moonMapSharp = false;
  /** The clock was given or has been set to the first framing's morning. */
  private clockPlaced: boolean;
  private time_?: TimeControlsHandle;
  /** Each `zoomTo`, so a late correction knows whether it still applies. */
  private zoomToken = 0;
  private credits_?: CreditsHandle;
  private inspector?: InspectorHandle;
  private frameRequest = 0;
  /** New views (a split's second) get the main view's shadows and AO. */
  private readonly shadows: boolean;
  private readonly ambientOcclusion: boolean;
  private destroyed = false;
  private readonly accessToken: string | undefined;

  /** Default globe endpoints, resolved while the device was created. */
  private early: EarlyEndpoints;

  private constructor(
    readonly container: HTMLElement,
    engine: Engine,
    options: ViewerOptions,
    early: EarlyEndpoints = {},
    private readonly ownsEngine = true,
  ) {
    this.early = early;
    this.engine = engine;
    if (!ownsEngine) {
      // A shared engine's own settings as a new viewer expects them, not
      // as the last viewer left them (the sun and render mode follow).
      engine.environment.setSky(DEFAULT_SKY);
    }
    this.policy = options.policy ?? "budgeted";
    this.globeKind = options.globe ?? "ellipsoid";
    this.accessToken = options.accessToken;
    if (getComputedStyle(container).position === "static") {
      container.style.position = "relative";
    }
    const canvas = (this.canvas = document.createElement("canvas"));
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";
    container.append(canvas);
    this.target = new CanvasTarget(canvas);
    // One world: content and the globe come and go in it. Its geometry
    // grows in slabs of one storage binding each, up to the budgets below.
    this.world = engine.createWorld({
      maxDraws: 1 << 16,
      maxMaterials: 1 << 13,
      ...(options.maxInstances !== undefined
        ? { maxInstances: options.maxInstances }
        : {}),
      // Budgets across slabs, each slab within one storage binding
      // (scene/Slabs.ts): no longer capped by the binding itself.
      vertexBytes: 768 << 20,
      indexBytes: 384 << 20,
    });
    this.shadows = options.shadows ?? true;
    this.ambientOcclusion = options.ambientOcclusion ?? true;
    this.view = engine.addView({
      target: this.target,
      world: this.world,
      shadows: this.shadows,
      ambientOcclusion: this.ambientOcclusion,
      // As the eye sees the scene: adapting to it, night vision, the stars.
      exposure: options.exposure ?? EYE,
    });
    this.controller = new GlobeController(this.view, canvas);
    // The whole Earth until the app frames something, as 1.x starts: the
    // camera at the Earth's center drew its first frames from inside it.
    this.view.camera.lookAt(
      ellipsoid.cartographicToCartesian(fromDegrees(-82.5, 35, 0), vec3.vec3()),
      0,
      -Math.PI / 2,
      2e7,
    );
    // The camera stays above the globe's drawn surface.
    this.controller.surfaceHeight = (longitude, latitude) =>
      this.globe_?.show
        ? this.globe_.surfaceHeight(longitude, latitude)
        : undefined;
    this.controller.ignore = (x, y) => this.overview_?.contains(x, y) ?? false;
    engine.renderMode = options.renderMode ?? "onDemand";
    if (options.credits !== false) {
      this.credits_ = attachCredits(container, () => this.credits());
    }
    this.clockPlaced = options.clock !== undefined;
    this.clock = options.clock ?? new Clock({ mode: "paused" });
    this.moon = options.moon !== false;
    const lights = options.cityLights ?? true;
    if (lights !== false) {
      // A public asset: without it in the token's account, no lights.
      this.lightsProvider = (
        lights === true
          ? IonTmsImagery.fromIon(3812, this.tokenOptions())
          : Promise.resolve(lights)
      ).catch(() => undefined);
    }
    this.clock.events.on("change", () => {
      this.applyClockSky();
      this.engine.requestRender();
    });
    const frameData = options.frameData;
    if (frameData === undefined) {
      this.frameData = Promise.resolve(undefined);
    } else if (typeof frameData !== "string") {
      // Already loaded: apply it now, so the first frame draws the real sky.
      this.frameSky.setData(frameData);
      this.frameData = Promise.resolve(frameData);
    } else {
      const sets = this.frameDataSets;
      this.frameData = loadFrameData(frameData).then(
        (data) => {
          if (!this.destroyed && sets === this.frameDataSets) {
            this.frameSky.setData(data);
            this.applyClockSky();
            this.engine.requestRender();
          }
          return data;
        },
        (error: unknown) => {
          console.warn(
            `Viewer: frames data did not load, the sky stays analytic (${error instanceof Error ? error.message : String(error)})`,
          );
          return undefined;
        },
      );
    }
    this.applyClockSky();
    if (this.moon) {
      void fetch(MOON_MAP)
        .then(async (response) =>
          createImageBitmap(await response.blob(), {
            colorSpaceConversion: "none",
          }),
        )
        .then((image) => {
          if (!this.destroyed && !this.moonMapSharp) {
            this.engine.setMoonMap(image);
          }
        })
        .catch(() => {});
      void loadIonMoonMap(this.tokenOptions())
        .then(({ image, attributions }) => {
          if (this.destroyed) {
            image.close();
            return;
          }
          this.moonMapSharp = true;
          this.engine.setMoonMap(image);
          this.addAttributions(MOON_CREDIT, attributions);
        })
        // Without the asset (not in the token's account): 1.x's map.
        .catch(() => {});
    }
    if (options.stars !== false) {
      this.engine.setStarMap(STAR_MAP);
    }
    if (options.timeControls !== false) {
      this.time_ = attachTimeControls(container, this.clock, {
        ...(options.timeControls === true || !options.timeControls
          ? {}
          : options.timeControls),
        place: () => this.place(),
      });
    }
    this.applyClockSun();
    if (options.inspector) {
      this.inspector = attachInspector(
        container,
        this.inspectable("2.0"),
        options.inspector === true ? {} : options.inspector,
      );
    }
    this.ready = this.buildGlobe(options.imagery ?? true);
    if (options.suspendPresentation) {
      // Nothing to keep before the first frame: hidden, so the container's
      // background (or a loading screen) shows.
      this.resumeStart = this.suspendPresentation({ hide: true });
    }
    engine.start();
    const tick = () => {
      if (this.destroyed) {
        return;
      }
      this.controller.update();
      this.secondController?.update();
      this.clock.tick(performance.now());
      if (
        this.unhideAfter !== undefined &&
        (this.hidingSuspensions > 0 ||
          this.engine.stats.framesRendered > this.unhideAfter)
      ) {
        if (this.hidingSuspensions === 0) {
          this.canvas.style.visibility = "";
        }
        this.unhideAfter = undefined;
      }
      this.frameRequest = requestAnimationFrame(tick);
    };
    this.frameRequest = requestAnimationFrame(tick);
  }

  /** A viewer filling `container` (made positioned if it isn't). */
  static async create(
    container: HTMLElement,
    options: ViewerOptions = {},
  ): Promise<Viewer> {
    // The default globe's endpoints resolve while the device is created
    // (2.0's first request came 150 to 550 ms after 1.x's, r37).
    const token = options.accessToken
      ? { accessToken: options.accessToken }
      : {};
    const early: EarlyEndpoints = {
      ...((options.imagery ?? true) === true
        ? { imagery: BingImagery.fromIon(2, token) }
        : {}),
      ...((options.globe ?? "ellipsoid") === "terrain"
        ? { terrain: resolveIonAsset(1, token) }
        : {}),
    };
    // Settled here so a failure surfaces where it is used, not unhandled.
    early.imagery?.catch(() => {});
    early.terrain?.catch(() => {});
    const shared =
      options.engine instanceof Engine ? options.engine : undefined;
    return new Viewer(
      container,
      shared ?? (await Engine.create(options.engine as EngineOptions)),
      options,
      early,
      !shared,
    );
  }

  // ------------------------------------------------------------- globe

  /** The globe's tileset (terrain or the ellipsoid), once built. */
  get globe(): Tileset3D | undefined {
    return this.globe_;
  }

  /** Whether the globe draws (it stays loaded while hidden). */
  get showGlobe(): boolean {
    return this.globeShown;
  }
  set showGlobe(on: boolean) {
    this.globeShown = on;
    if (this.globe_) {
      this.globe_.show = on;
    }
  }

  /** The night lights' image, resolving (undefined: none). */
  private lightsProvider?: Promise<ImageryProvider | undefined>;

  /** Whether the globe's night lights show (`ViewerOptions.cityLights`). */
  get cityLights(): boolean {
    return this.view.cityLights;
  }
  set cityLights(on: boolean) {
    for (const view of this.views) {
      view.cityLights = on;
    }
    this.engine.requestRender();
  }

  private async buildGlobe(imagery: ImageryProvider | boolean): Promise<void> {
    if (imagery === true) {
      // Imagery and the terrain endpoint at once, not one after the other;
      // the globe's tiles load while the imagery resolves (1.x starts
      // terrain without waiting for it).
      if (this.globeKind === "terrain") {
        this.early.terrain ??= resolveIonAsset(1, this.tokenOptions());
      }
      this.imageryLoading = (
        this.early.imagery ?? BingImagery.fromIon(2, this.tokenOptions())
      ).then((provider) => (this.imagery = provider));
      this.imageryLoading.catch(() => {}); // surfaces through `ready`
    } else if (imagery) {
      this.imagery = imagery;
    }
    await this.setGlobe(this.globeKind);
    await this.imageryLoading;
  }

  /** Switches the globe in place: content and camera stay. */
  async setGlobe(kind: GlobeKind): Promise<void> {
    const token = ++this.globeToken;
    this.globeKind = kind;
    let next: Tileset3D | undefined;
    let attributions: IonAttribution[] = [];
    const imagery = this.imagery ?? this.imageryLoading;
    const options = {
      policy: this.policy,
      ...(imagery ? { imagery } : {}),
      ...(this.lightsProvider ? { lights: this.lightsProvider } : {}),
    };
    if (kind === "terrain") {
      const ion = await (this.early.terrain ??
        resolveIonAsset(1, this.tokenOptions()));
      this.early.terrain = undefined; // used once: later switches resolve anew
      next = await this.engine.addTerrain(this.world, ion.url, {
        headers: ion.headers,
        ...options,
      });
      attributions = ion.attributions;
    } else if (kind === "ellipsoid") {
      next = this.engine.addEllipsoid(this.world, options);
    }
    if (token !== this.globeToken || this.destroyed) {
      if (next) {
        this.engine.removeTileset(next);
      }
      return;
    }
    if (next) {
      next.show = this.globeShown;
    }
    if (this.globe_) {
      this.engine.removeTileset(this.globe_);
    }
    this.globe_ = next;
    this.terrainAttributions = attributions;
  }

  // ------------------------------------------------------------- content

  /** Streams a tileset (a URL or an ion asset) into the world. */
  async addTileset(
    source: TilesetSource,
    options: TilesetOptions = {},
  ): Promise<Tileset3D> {
    let url: string | URL;
    let headers: Record<string, string> | undefined;
    let attributions: IonAttribution[] = [];
    if (typeof source === "object" && "ion" in source) {
      const ion = await resolveIonAsset(source.ion, {
        ...this.tokenOptions(),
        ...(source.accessToken ? { accessToken: source.accessToken } : {}),
      });
      if (ion.type !== "3DTILES") {
        throw new Error(
          `ion asset ${source.ion} is ${ion.type.toLowerCase()}, not 3D Tiles`,
        );
      }
      url = ion.url;
      headers = ion.headers;
      attributions = ion.attributions;
    } else {
      url = source;
    }
    const tileset = await this.engine.addTileset(this.world, url, {
      policy: this.policy,
      ...(headers ? { headers } : {}),
      ...options,
    });
    this.tilesets.add(tileset);
    this.attributions.set(tileset, attributions);
    return tileset;
  }

  /**
   * Loads a glTF model into the viewer's world: a `ModelResource` to place
   * and release (`engine.loadModel`). For one placement:
   *
   * ```ts
   * using model = await viewer.loadModel(url);
   * model.place({ at: { longitude, latitude }, heightReference: "clampToGround" });
   * ```
   */
  loadModel(
    url: string | URL,
    options: ModelResourceOptions & { signal?: AbortSignal } = {},
  ): Promise<ModelResource> {
    return this.engine.loadModel(this.world, url, options);
  }

  /** Credits that content added outside the viewer requires. */
  addAttributions(owner: object, attributions: IonAttribution[]): void {
    this.attributions.set(owner, attributions);
  }

  /**
   * Removes a tileset added through the viewer, or attributions' owner's
   * credits. (A model placement removes itself: `placement.remove()`.)
   */
  remove(content: Tileset3D | object): void {
    this.attributions.delete(content);
    if (this.tilesets.delete(content as Tileset3D)) {
      this.engine.removeTileset(content as Tileset3D);
    }
  }

  // ------------------------------------------------------------- camera

  /**
   * Frames content, a bounding sphere or a place (heading 35°, pitch -30°).
   * A model frames where it stands (`bounds`); clamped and still settling
   * on the ground, it frames again once it has (`Clamp.whenSettled`),
   * unless something else was framed or someone moved the camera since.
   * Planet-scale content frames the whole globe, north up, from above the
   * ground under the camera.
   */
  zoomTo(target: ZoomTarget, heading = 35 * deg, pitch = -30 * deg): void {
    const token = ++this.zoomToken;
    if (target instanceof ModelPlacement) {
      const model = target;
      const { center, radius } = model.bounds();
      this.frame(Float64Array.from(center), radius, heading, pitch);
      const inputs = this.controller.inputs;
      if (model.clamp && !model.clamp.settled) {
        void model.clamp.whenSettled().then(() => {
          if (
            token === this.zoomToken &&
            inputs === this.controller.inputs &&
            !this.destroyed
          ) {
            const { center, radius } = model.bounds();
            this.frame(Float64Array.from(center), radius, heading, pitch);
          }
        });
      }
      return;
    }
    if ("longitude" in target) {
      const range = target.range ?? 1500;
      this.frame(
        ellipsoid.cartographicToCartesian(
          fromDegrees(target.longitude, target.latitude, 0),
          vec3.vec3(),
        ),
        range / 2.6,
        heading,
        pitch,
      );
      return;
    }
    let sphere: { center: ArrayLike<number>; radius: number };
    if ("root" in target) {
      // The root's content volume when it has one (publishers often pad
      // the root volume to a power of two).
      const volume = target.root.contentVolume ?? target.root.volume;
      sphere = {
        center:
          volume.kind === "box" ? volume.obb.center : volume.sphere.center,
        radius: volume.sphere.radius,
      };
    } else {
      sphere = target;
    }
    const center = Float64Array.from(sphere.center);
    if (vec3.length(center) < 0.1 * ellipsoid.minimumRadius) {
      // Planet-scale content (OSM Buildings' root is the whole globe) is
      // centered near the Earth's center, where east-north-up is the
      // direction of a small offset: the camera went below a pole, upside
      // down, orbiting a point thousands of kilometers underground. Frame
      // the globe instead from straight above the ground under the camera,
      // north up, orbiting that ground point.
      const ground = ellipsoid.scaleToGeodeticSurface(
        this.view.camera.position,
        vec3.vec3(),
      );
      if (ground) {
        const range = sphere.radius * 2.6 - vec3.length(ground);
        this.frame(ground, Math.max(range, 1) / 2.6, 0, -Math.PI / 2 + 1e-4);
        return;
      }
    }
    this.frame(center, sphere.radius, heading, pitch);
  }

  /** Points both cameras at a sphere (the split view's from the other side). */
  private frame(
    center: Float64Array,
    radius: number,
    heading: number,
    pitch: number,
  ): void {
    if (![...center, radius, heading, pitch].every(Number.isFinite)) {
      // A NaN camera hung the page (a NaN range from a bad URL).
      throw new RangeError("zoomTo: the target is not a finite place");
    }
    const range = radius * 2.6;
    // 1.x's near plane (0.1 m), closer for small models. Fixed, not scaled
    // to what is framed: zooming in from a globe-sized root kept a near
    // plane kilometers out, cutting (and culling) the ground. Reverse-Z
    // float depth is as precise whatever the near plane, so 1.x's per-frame
    // near from drawn volumes isn't needed.
    this.view.camera.near = Math.min(0.1, Math.max(0.001, radius * 0.002));
    vec3.copy(this.focusCenter, center);
    this.controller.focus(center, heading, pitch, range);
    if (this.orbit_) {
      followZoom(this.orbit_, center, heading, pitch, range);
    }
    if (this.second && this.secondController) {
      this.second.camera.near = this.view.camera.near;
      this.secondController.focus(
        center,
        heading + (150 * Math.PI) / 180,
        -0.25,
        range * 0.4,
      );
    }
    if (this.sunFromClock_) {
      if (!this.clockPlaced) {
        // A first look in daylight: 10:30 local solar time today there.
        this.clockPlaced = true;
        const place = this.place();
        const offset = place ? (place.longitude / Math.PI) * 12 * 3_600_000 : 0;
        const day = 86_400_000;
        const start = Math.floor((Date.now() + offset) / day) * day - offset;
        this.clock.time = start + 10.5 * 3_600_000;
      }
      this.applyClockSun();
      this.time_?.update();
    } else if (this.sun) {
      this.setSun(this.sun.azimuth, this.sun.elevation);
    }
  }

  /**
   * Whether the credits show over the view (with `credits`, the default).
   * An application whose view shows no attributed data (a model on a
   * stage, the globe off) may hide them; one that shows such data must
   * credit it, here or elsewhere on the page.
   */
  get creditsShown(): boolean {
    return this.credits_?.shown ?? false;
  }

  set creditsShown(on: boolean) {
    this.credits_?.show(on);
  }

  /**
   * The sun follows the clock (default), or stays where `setSun` put it.
   * The time controls show while it follows the clock.
   */
  get sunFromClock(): boolean {
    return this.sunFromClock_;
  }

  set sunFromClock(on: boolean) {
    this.sunFromClock_ = on;
    this.time_?.show(on);
    if (on) {
      this.applyClockSun();
    }
  }

  /**
   * The sky at the clock's time: one `skyState` (DE440 inside the loaded
   * frames data's span, else the analytic models) serves the stars' turn, the
   * Moon's place and, while the sun follows the clock, the sun.
   */
  private applyClockSky(): void {
    const sky = this.frameSky.at(this.clock.time);
    this.engine.icrfToFixed.set(sky.icrfToFixed);
    if (this.sunFromClock_) {
      this.engine.sunDirection.set(sky.sunDirection);
    }
    if (this.moon) {
      (this.engine.moonPosition ??= new Float64Array(3)).set(sky.moonPosition);
      (this.engine.moonAxes ??= new Float64Array(6)).set(sky.moonAxes);
    }
  }

  /**
   * Give the sky frames data after creation, as `ViewerOptions.frameData`
   * does at creation: the Moon and the Sun are placed with DE440 from the
   * next frame. `undefined` returns to the analytic models. A load started by
   * a `ViewerOptions.frameData` URL that has not finished is dropped in favor
   * of this call; `frameData` (the promise) still reports the creation option.
   */
  setFrameData(data: FrameData | undefined): void {
    this.frameDataSets++;
    this.frameSky.setData(data);
    if (!this.destroyed) {
      this.applyClockSky();
      this.engine.requestRender();
    }
  }

  /** The sun's direction at the clock's time. */
  private applyClockSun(): void {
    this.applyClockSky();
    this.engine.requestRender();
  }

  /** What the time is about: what is framed, else below the camera. */
  private place(): { longitude: number; latitude: number } | undefined {
    const at =
      vec3.length(this.focusCenter) > 0
        ? this.focusCenter
        : this.view.camera.position;
    const c = ellipsoid.cartesianToCartographic(at, {
      longitude: 0,
      latitude: 0,
      height: 0,
    });
    return c ? { longitude: c.longitude, latitude: c.latitude } : undefined;
  }

  /**
   * The sun by azimuth and elevation (degrees) at what is framed, instead
   * of from the clock (`sunFromClock` turns the clock back on).
   */
  setSun(azimuth: number, elevation: number): void {
    this.sunFromClock_ = false;
    this.time_?.show(false);
    this.sun = { azimuth, elevation };
    const enu = eastNorthUpToFixedFrame(
      this.focusCenter,
      ellipsoid,
      mat4.mat4(),
    );
    const az = azimuth * deg;
    const el = elevation * deg;
    const e = Math.cos(el) * Math.sin(az);
    const n = Math.cos(el) * Math.cos(az);
    const u = Math.sin(el);
    vec3.normalize(
      this.engine.sunDirection,
      vec3.vec3(
        enu[0]! * e + enu[4]! * n + enu[8]! * u,
        enu[1]! * e + enu[5]! * n + enu[9]! * u,
        enu[2]! * e + enu[6]! * n + enu[10]! * u,
      ),
    );
    this.engine.requestRender();
  }

  /** The views drawn: main, the split view's right half, the inset. */
  get views(): View[] {
    return [this.view, this.second, this.overview_].filter((v) => !!v);
  }

  // ------------------------------------------------------------- layout

  /**
   * Split view: a second, independent camera on the right half. Tiles are
   * selected per view from one shared cache and draw table.
   */
  get split(): boolean {
    return !!this.second;
  }
  set split(on: boolean) {
    if (on === this.split) {
      return;
    }
    if (on) {
      this.view.viewport = { x: 0, y: 0, width: 0.5, height: 1 };
      const second = (this.second = this.engine.addView({
        target: this.target,
        world: this.world,
        shadows: this.shadows,
        ambientOcclusion: this.ambientOcclusion,
        viewport: { x: 0.5, y: 0, width: 0.5, height: 1 },
      }));
      Object.assign(second.lighting, this.view.lighting);
      second.exposure = this.view.exposure;
      second.cityLights = this.view.cityLights;
      second.outputEncoding = this.view.outputEncoding;
      const controller = (this.secondController = new GlobeController(
        second,
        this.canvas,
      ));
      second.camera.near = this.view.camera.near;
      controller.focus(
        this.controller.target,
        this.controller.heading + (150 * Math.PI) / 180,
        -0.25,
        this.controller.range * 0.4,
      );
    } else {
      this.secondController!.dispose();
      this.engine.removeView(this.second!);
      this.second = this.secondController = undefined;
      this.view.viewport = { x: 0, y: 0, width: 1, height: 1 };
    }
    if (this.overview_) {
      this.overview_.viewport = this.overviewViewport();
    }
  }

  /** A linked overview inset following the main view. */
  get overview(): boolean {
    return !!this.overview_;
  }
  set overview(on: boolean) {
    if (on === this.overview) {
      return;
    }
    if (on) {
      this.overview_ = this.engine.addView({
        target: this.target,
        world: this.world,
        viewport: this.overviewViewport(),
      });
      this.overviewLink = this.engine.link(this.view, this.overview_, {
        modes: ["follow", "footprint"],
        followScale: 4,
      });
    } else {
      this.engine.unlink(this.overviewLink!);
      this.engine.removeView(this.overview_!);
      this.overview_ = this.overviewLink = undefined;
    }
  }

  private overviewViewport() {
    return this.second
      ? { x: 0.27, y: 0.02, width: 0.21, height: 0.3 }
      : { x: 0.7, y: 0.02, width: 0.28, height: 0.3 };
  }

  // ------------------------------------------------------------- inspection

  /** The feature under a point, CSS pixels from the canvas's top-left. */
  async pick(x: number, y: number): Promise<PickResult | undefined> {
    const scale = this.canvas.width / Math.max(1, this.canvas.clientWidth);
    const px = x * scale;
    const py = y * scale;
    if (this.overview_?.contains(px, py)) {
      return undefined;
    }
    const view = this.second?.contains(px, py) ? this.second : this.view;
    const area = view.pixelRect();
    return view.pick(px - area.x, py - area.y);
  }

  /** What the view must credit: providers' attributions and data credits. */
  credits(): { attributions: IonAttribution[]; credits: string[] } {
    return {
      attributions: [
        ...this.terrainAttributions,
        ...(this.imagery?.attributions ?? []),
        ...[...this.attributions.values()].flat(),
      ],
      credits: [
        ...new Set(
          [this.globe_, ...this.tilesets]
            .filter((t) => !!t)
            .flatMap((t) => t.credits()),
        ),
      ],
    };
  }

  /** The viewer for the inspector (`widgets/inspector.ts`). */
  inspectable(
    name: string,
    options: { color?: string; loadStartedAt?: number } = {},
  ): Inspectable {
    return inspectEngine(this.engine, {
      name,
      ...(options.color ? { color: options.color } : {}),
      ...(options.loadStartedAt !== undefined
        ? { loadStartedAt: options.loadStartedAt }
        : {}),
      tilesets: () => [...this.tilesets, this.globe_].filter((t) => !!t),
      views: () => {
        const views: Array<[string, View]> = [["main", this.view]];
        if (this.second) {
          views.push(["right", this.second]);
        }
        if (this.overview_) {
          views.push(["inset", this.overview_]);
        }
        return views;
      },
      world: this.world,
      canvas: this.canvas,
    });
  }

  /**
   * The camera's controls: "globe" (the default: spin the Earth, zoom to
   * the surface, kept above the ground) or "orbit" around the focus, for
   * looking at a model (drag orbits, right- or shift-drag pans, wheel
   * zooms; `InspectController`), the globe controls paused meanwhile.
   * `zoomTo` frames in either.
   *
   * `options` (`OrbitOptions`) say where to orbit: around a point in
   * space in a frame of its own, for one. Called again while orbiting, with
   * options, it re-focuses the same controller, fields left out keeping
   * their current values; without options it leaves the orbit as it is.
   * Throws a RangeError, changing nothing, on a degenerate frame or a
   * non-finite target, heading, pitch or range (`planOrbit`). `zoomTo` while
   * orbiting re-focuses the orbit on what it frames, keeping the frame
   * (`followZoom`); in a frame, a camera moved by other code is re-read at
   * the next drag or wheel instead of snapped back.
   */
  setControls(mode: "globe" | "orbit", options?: OrbitOptions): void {
    if (mode === "orbit") {
      let orbit = this.orbit_;
      if (orbit && !options) {
        return;
      }
      const plan = planOrbit(orbit && orbitState(orbit), options ?? {}, {
        focusCenter: this.focusCenter,
        cameraPosition: this.view.camera.position,
        globeHeading: this.controller.heading,
      });
      if (!orbit) {
        orbit = new InspectController(this.view, this.canvas, plan);
        orbit.ignore = this.controller.ignore;
        orbit.onChange = () => this.onOrbitChange?.();
        this.orbit_ = orbit;
        this.controller.enabled = false;
      } else {
        orbit.frame = plan.frame;
        orbit.minRange = plan.minRange;
        orbit.maxRange = plan.maxRange;
      }
      orbit.focus(plan.target, plan.heading, plan.pitch, plan.range);
    } else if (mode === "globe" && this.orbit_) {
      this.orbit_.dispose();
      this.orbit_ = undefined;
      this.controller.enabled = true;
      this.onOrbitChange?.();
    }
  }

  /**
   * The point the orbit controls turn about (a copy), or undefined with the
   * globe controls: for drawing a pivot marker. `onOrbitChange` says when
   * it, or `orbitDragging`, may have changed.
   */
  get orbitPivot(): Float64Array | undefined {
    return this.orbit_ && vec3.copy(vec3.vec3(), this.orbit_.target);
  }

  /** Whether the orbit controls are being dragged (rotating or panning). */
  get orbitDragging(): boolean {
    return this.orbit_?.dragging ?? false;
  }

  /**
   * Called when the orbit controls move the camera, start or end a drag,
   * or are turned off.
   */
  onOrbitChange?: () => void;

  /**
   * Suspends presentation while a scene is set up in steps (load, place,
   * frame) that shouldn't be seen: the view isn't drawn, so the canvas
   * keeps its last frame (or shows the container's background before the
   * first), until every suspension is resumed. With `hide`, the canvas is
   * hidden meanwhile instead: for new content, where the last frame is of
   * what is going away (switching scenes or examples); without it, for an
   * edit of the scene in view, where the last frame is the right thing to
   * keep showing. While suspended the
   * container has `data-cesium-presentation-suspended`, for a loading
   * screen in CSS, and `onPresentationChange` is called. The pattern of
   * Android's `postponeEnterTransition` and Unity's
   * `allowSceneActivation`: the application decides when its scene is
   * ready to be seen.
   *
   * Returns `resume` (calling it twice does nothing), which is also
   * disposable, so `using _ = viewer.suspendPresentation();` resumes when
   * the block ends, setup errors included.
   */
  suspendPresentation(
    options: { hide?: boolean } = {},
  ): (() => void) & Disposable {
    let resumed = false;
    if (this.suspensions++ === 0) {
      this.view.enabled = false;
      this.container.dataset.cesiumPresentationSuspended = "";
      this.onPresentationChange?.(true);
    }
    const hide = options.hide === true;
    if (hide && this.hidingSuspensions++ === 0) {
      this.canvas.style.visibility = "hidden";
    }
    const resume = () => {
      if (resumed) {
        return;
      }
      resumed = true;
      if (hide && --this.hidingSuspensions === 0) {
        // Shown once a new frame is drawn (`tick`): shown now, the canvas
        // would present its last frame, of what went away, for a frame.
        this.unhideAfter = this.engine.stats.framesRendered;
      }
      if (--this.suspensions === 0) {
        this.view.enabled = true;
        delete this.container.dataset.cesiumPresentationSuspended;
        this.engine.requestRender();
        this.onPresentationChange?.(false);
      }
    };
    return Object.assign(resume, { [Symbol.dispose]: resume });
  }

  /**
   * Suspends presentation until `work` settles (resolved or rejected) and
   * returns it: `await viewer.suspendPresentationUntil(loadScene())`.
   */
  async suspendPresentationUntil<T>(work: Promise<T>): Promise<T> {
    const resume = this.suspendPresentation();
    try {
      return await work;
    } finally {
      resume();
    }
  }

  /** Whether presentation is suspended (`suspendPresentation`). */
  get presentationSuspended(): boolean {
    return this.suspensions > 0;
  }

  /**
   * Ends the suspension `suspendPresentation: true` started with (once;
   * other suspensions still hold presentation back).
   */
  resumePresentation(): void {
    this.resumeStart?.();
    this.resumeStart = undefined;
  }

  /** Called when presentation is suspended (true) or resumes (false). */
  onPresentationChange?: (suspended: boolean) => void;
  private suspensions = 0;
  private hidingSuspensions = 0;
  /** Frames rendered when the last hiding suspension ended, until shown. */
  private unhideAfter?: number;
  private resumeStart?: () => void;

  /** The current controls (`setControls`). */
  get controls(): "globe" | "orbit" {
    return this.orbit_ ? "orbit" : "globe";
  }

  destroy(): void {
    this.destroyed = true;
    this.orbit_?.dispose();
    cancelAnimationFrame(this.frameRequest);
    this.credits_?.dispose();
    this.inspector?.dispose();
    this.time_?.dispose();
    this.secondController?.dispose();
    this.controller.dispose();
    if (this.ownsEngine) {
      this.engine.destroy();
    } else {
      // Its world with everything in it (tilesets, the views drawing it).
      this.engine.removeWorld(this.world);
      this.target.destroy();
    }
    this.canvas.remove();
  }

  private tokenOptions(): { accessToken?: string } {
    return this.accessToken ? { accessToken: this.accessToken } : {};
  }
}
