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
  Engine,
  GlobeController,
  eastNorthUpToFixedFrame,
  fromDegrees,
  icrfToFixed,
  loadIonMoonMap,
  mat4,
  moonAxes,
  moonPosition,
  resolveIonAsset,
  sunDirection,
  vec3,
  type Exposure,
  type GltfAsset,
  type ImageryProvider,
  type IonAttribution,
  type ModelInstance,
  type ModelOptions,
  type PickResult,
  type Tileset3D,
  type TilesetOptions,
  type View,
  type ViewLink,
  type World,
} from "../src/index.ts";
import { attachCredits, type CreditsHandle } from "./credits.ts";
import { inspectEngine } from "./engine.ts";
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

/** 1.x's moon map (equirectangular, the near side in the middle). */
const scratchMoon = new Float64Array(3);
const scratchMoonAxes = new Float64Array(6);
/** The Moon map's attributions' owner (`addAttributions`). */
const MOON_CREDIT = {};

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
  | ModelInstance
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
  ) {
    this.early = early;
    this.engine = engine;
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
    // One world: content and the globe come and go in it. Arenas sized
    // once, within the device's storage-binding limit.
    const limit = engine.gpu.device.limits.maxStorageBufferBindingSize;
    this.world = engine.createWorld({
      maxDraws: 1 << 16,
      maxMaterials: 1 << 13,
      ...(options.maxInstances !== undefined
        ? { maxInstances: options.maxInstances }
        : {}),
      vertexBytes: Math.min(768 << 20, Math.floor(limit / 4) * 4),
      indexBytes: Math.min(384 << 20, Math.floor(limit / 4) * 4),
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
      if (this.sunFromClock_) {
        this.applyClockSun();
      } else {
        this.engine.requestRender();
      }
    });
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
    engine.start();
    const tick = () => {
      if (this.destroyed) {
        return;
      }
      this.controller.update();
      this.secondController?.update();
      this.clock.tick(performance.now());
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
    return new Viewer(container, await Engine.create(), options, early);
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
   * Adds a glTF model (a URL or a loaded asset). Without a `modelMatrix`,
   * it stands at `at` (longitude and latitude, degrees) on the ground.
   */
  async addModel(
    source: string | URL | GltfAsset,
    options: Partial<ModelOptions> & {
      at?: { longitude: number; latitude: number };
    } = {},
  ): Promise<ModelInstance> {
    const asset =
      typeof source === "string" || source instanceof URL
        ? await this.engine.loadGltf(source)
        : source;
    const { at, ...rest } = options;
    const place = at ?? { longitude: 0, latitude: 0 };
    return this.engine.addModel(this.world, asset, {
      ...(rest.modelMatrix
        ? {}
        : {
            modelMatrix: eastNorthUpToFixedFrame(
              ellipsoid.cartographicToCartesian(
                fromDegrees(place.longitude, place.latitude, 0),
                vec3.vec3(),
              ),
              ellipsoid,
              mat4.mat4(),
            ),
            heightReference: "clampToGround" as const,
          }),
      ...rest,
    } as ModelOptions);
  }

  /** Credits that content added outside the viewer requires. */
  addAttributions(owner: object, attributions: IonAttribution[]): void {
    this.attributions.set(owner, attributions);
  }

  /** Removes content added through the viewer (or attributions' owner). */
  remove(content: Tileset3D | ModelInstance | object): void {
    this.attributions.delete(content);
    if (this.tilesets.delete(content as Tileset3D)) {
      this.engine.removeTileset(content as Tileset3D);
    } else if ("draws" in content && "transform" in content) {
      this.engine.removeModel(this.world, content as ModelInstance);
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
    if ("draws" in target) {
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

  /** The stars' turn and the Moon's place at the clock's time. */
  private applyClockSky(): void {
    const m = icrfToFixed(this.clock.time, this.engine.icrfToFixed);
    if (!this.moon) {
      return;
    }
    const p = moonPosition(this.clock.time, scratchMoon);
    const fixed = (this.engine.moonPosition ??= new Float64Array(3));
    for (let i = 0; i < 3; i++) {
      fixed[i] =
        m[i * 3]! * p[0]! + m[i * 3 + 1]! * p[1]! + m[i * 3 + 2]! * p[2]!;
    }
    const a = moonAxes(this.clock.time, scratchMoonAxes);
    const axes = (this.engine.moonAxes ??= new Float64Array(6));
    for (let k = 0; k < 6; k += 3) {
      for (let i = 0; i < 3; i++) {
        axes[k + i] =
          m[i * 3]! * a[k]! +
          m[i * 3 + 1]! * a[k + 1]! +
          m[i * 3 + 2]! * a[k + 2]!;
      }
    }
  }

  /** The sun's direction at the clock's time. */
  private applyClockSun(): void {
    sunDirection(this.clock.time, this.engine.sunDirection);
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

  destroy(): void {
    this.destroyed = true;
    cancelAnimationFrame(this.frameRequest);
    this.credits_?.dispose();
    this.inspector?.dispose();
    this.time_?.dispose();
    this.secondController?.dispose();
    this.controller.dispose();
    this.engine.destroy();
    this.canvas.remove();
  }

  private tokenOptions(): { accessToken?: string } {
    return this.accessToken ? { accessToken: this.accessToken } : {};
  }
}
