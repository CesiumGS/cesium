/**
 * `Viewer`: 2.0's counterpart to 1.x's `Cesium.Viewer`, outside the engine
 * core (which stays headless, as 1.x's widgets sit outside its engine). One
 * call sets up what an app needs to look at content on the globe: a canvas,
 * the engine, a world and a view, a globe camera controller, the globe (the
 * ellipsoid or Cesium World Terrain, with the ion default imagery) and the
 * credits on screen; the inspector on request. Content added through it
 * can be framed. Credits belong to the content: whatever is drawn in its
 * world (`world.add` too) is credited by its attributions. Everything else is
 * the engine's own API (`viewer.engine`, `viewer.world`, `viewer.view`).
 *
 *   const viewer = await Viewer.create(container);
 *   const tileset = await viewer.addTileset({ ion: 96188 });
 *   viewer.zoomTo({ longitude: -75.16, latitude: 39.95, range: 1500 });
 *
 * The sun follows the viewer's clock (`viewer.clock`), set with the time
 * controls over the view; `setSun` places it by hand instead.
 *
 * The reference frames are the frames module's (`viewer.frames`, a catalog;
 * plan 5a's call 32): the view's rig is on ITRF, the world's frame resolver
 * is over the catalog, and the sky comes from it through `attachSky`. The
 * catalog's precise reference frames load by dynamic `import()` only when
 * asked, so a Viewer without `frameData` downloads and fetches none of them.
 */
import {
  BingImagery,
  CanvasTarget,
  IonTmsImagery,
  eyeObserver,
  DEFAULT_SKY,
  Emitter,
  Engine,
  GlobeController,
  InspectController,
  fromDegrees,
  loadIonMoonMap,
  resolveIonAsset,
  vec3,
  type EngineOptions,
  type ObserverSettings,
  type ImageryProvider,
  type Attribution,
  type ModelPlacement,
  type ModelResource,
  type ModelResourceOptions,
  type PickResult,
  type Rig,
  type Tileset3D,
  type Globe,
  type TilesetOptions,
  type View,
  type ViewLink,
  type World,
} from "@cesium/next";
import type {
  FrameCatalog,
  FrameData,
  FrameDataWarning,
  SkyInputs,
} from "@cesium/next/frames";
import { Clock } from "@cesium/next/time";
import { attachCredits, type CreditsHandle } from "./credits.ts";
import { inspectEngine } from "./engine.ts";
import { orbitState, planOrbit, type OrbitOptions } from "./orbitFocus.ts";
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
import { attachWarnings } from "./warnings.ts";
import {
  ellipsoid,
  fromEarth,
  placeCamera,
  deg,
  zoomTo,
  earthCamera,
} from "./viewerCamera.ts";
import { applySky, applyClockSun, setSun } from "./viewerSky.ts";
import { warn } from "./viewerWarnings.ts";
import {
  tokenOptions,
  buildGlobe,
  setGlobe,
  addTileset,
} from "./viewerGlobe.ts";
import {
  suspendPresentation,
  suspendPresentationUntil,
  resumePresentation,
} from "./viewerPresentation.ts";
import { frameCatalog, useFrames, setFrameData } from "./viewerFrames.ts";
import { ViewerState } from "./viewerState.ts";

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
   * The precise sky: a frames store's URL (the store `npm run setup` fills,
   * served at "/frames-data/") or data already loaded, for the catalog
   * (`viewer.frames`). The sky's reference frames are then asked for at
   * "precise": the stars, the Moon and the sun come from DE440 and the IAU
   * 2006/2000A Earth rotation inside the data's span, and from the analytic
   * models outside it and while a URL's data loads. Data already loaded is
   * in use when `Viewer.create` resolves. Default: none, the analytic sky,
   * and nothing of the precise reference frames is downloaded or fetched
   * (the catalog loads them when a scene asks).
   */
  frameData?: string | FrameData;
  /**
   * Show the warnings (`Viewer.warnings`) in a small notice over the view
   * (default true). Off, they are still listed and emitted: an app that
   * shows them in its own UI turns the notice off and listens to `events`.
   */
  warningNotice?: boolean;
  /**
   * Who is looking (`ObserverSettings`): over `eyeObserver()`, as a person
   * there would see it; `cameraObserver` for what a camera records.
   */
  observer?: Partial<ObserverSettings>;
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

/**
 * Something the Viewer gets wrong without saying so otherwise:
 *
 * - `"frameDataFailed"`: `frameData` didn't load, so the sky stays on the
 *   analytic models (one warning, whatever failed);
 * - the frames data's own notices (`FrameDataWarning`): `"eopEnded"`, the
 *   Earth orientation table ends before now; `"leapSecondsExpired"`, the
 *   leap-second table is past its expiry; `"loadFailed"`, a load the
 *   application asked of `viewer.frames` failed.
 */
export interface ViewerWarning {
  readonly kind: FrameDataWarning["kind"] | "frameDataFailed";
  readonly message: string;
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

/** Endpoints `Viewer.create` starts resolving before the engine exists. */
export interface EarlyEndpoints {
  imagery?: Promise<BingImagery>;
  terrain?: ReturnType<typeof resolveIonAsset>;
  /** The catalog over `frameData`, its loads started. */
  frames?: { catalog: FrameCatalog; abort: AbortController };
}

export class Viewer {
  /** @internal What the moved functions share (`viewerCamera.ts` and its neighbours). */
  readonly state: ViewerState = new ViewerState();

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
  private readonly attributions = new Map<object, Attribution[]>();
  private overview_?: View;
  private overviewLink?: ViewLink;
  /** The scene's time: the sun follows it unless placed by `setSun`. */
  readonly clock: Clock;
  /**
   * @internal What `attachSky` writes, copied to the engine as it asks to render: the
   * stars' turn always, the sun while it follows the clock, the Moon when
   * it is drawn (`ViewerOptions.moon`).
   */
  readonly sky: SkyInputs = {
    icrfToFixed: new Float64Array(9),
    sunDirection: new Float64Array(3),
    moonPosition: new Float64Array(3),
    moonAxes: new Float64Array(6),
    requestRender: () => applySky(this),
  };
  /**
   * `warning`: each `ViewerWarning`, as it is added to `warnings`;
   * `warningsCleared`: the list was emptied (`setFrameData`).
   */
  readonly events = new Emitter<{
    warning: ViewerWarning;
    warningsCleared: Viewer;
  }>();
  /**
   * Always a promise: it resolves to the frames data of
   * `ViewerOptions.frameData` once the catalog has it, or to `undefined`,
   * at once when the option was not given and with one `frameDataFailed`
   * warning when loading failed. In both cases the sky stays analytic.
   */
  readonly frameData: Promise<FrameData | undefined>;
  /** Cesium Moon Terrain's map arrived (1.x's no longer wanted). */
  private moonMapSharp = false;
  private credits_?: CreditsHandle;
  private inspector?: InspectorHandle;
  /** Stops the viewer's per-frame work (`Engine.onTick`, `onAfterTick`). */
  private readonly offTick: () => void;
  /** New views (a split's second) get the main view's shadows and AO. */
  private readonly shadows: boolean;
  private readonly ambientOcclusion: boolean;
  /** Aborted on `destroy`: stops the Moon map's loads (and its worker). */
  private readonly moonMapLoad = new AbortController();

  private constructor(
    readonly container: HTMLElement,
    engine: Engine,
    options: ViewerOptions,
    early: EarlyEndpoints = {},
    private readonly ownsEngine = true,
  ) {
    this.state.early = early;
    this.engine = engine;
    if (!ownsEngine) {
      // A shared engine's own settings as a new viewer expects them, not
      // as the last viewer left them (the sun and render mode follow).
      engine.environment.setSky(DEFAULT_SKY);
    }
    this.policy = options.policy ?? "budgeted";
    this.state.globeKind = options.globe ?? "ellipsoid";
    this.state.accessToken = options.accessToken;
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
      observer: { ...eyeObserver(), ...options.observer },
    });
    this.controller = new GlobeController(this.view, canvas, engine);
    // The whole Earth until the app frames something, as 1.x starts: the
    // camera at the Earth's center drew its first frames from inside it.
    this.view.camera.lookAt(
      ellipsoid.cartographicToCartesian(fromDegrees(-82.5, 35, 0), vec3.vec3()),
      0,
      -Math.PI / 2,
      2e7,
    );
    fromEarth(this, this.view);
    // The camera stays above the globe's drawn surface.
    this.controller.surfaceHeight = (longitude, latitude) =>
      this.state.globe_?.show
        ? this.state.globe_.surfaceHeight(longitude, latitude)
        : undefined;
    this.controller.ignore = (x, y) => this.overview_?.contains(x, y) ?? false;
    engine.renderMode = options.renderMode ?? "onDemand";
    if (options.credits !== false) {
      this.credits_ = attachCredits(container, () => this.credits());
    }
    this.state.clockPlaced = options.clock !== undefined;
    this.clock = options.clock ?? new Clock({ mode: "paused" });
    this.state.moon = options.moon !== false;
    const lights = options.cityLights ?? true;
    if (lights !== false) {
      // A public asset: without it in the token's account, no lights.
      this.state.lightsProvider = (
        lights === true
          ? IonTmsImagery.fromIon(3812, tokenOptions(this))
          : Promise.resolve(lights)
      ).catch(() => undefined);
    }
    this.clock.events.on("change", () => this.engine.requestRender());
    if (options.warningNotice !== false) {
      this.state.warnings_ = attachWarnings(container);
    }
    // The frames module: the catalog, the world's resolver over it and the
    // clock its rigs read, each view's rig on ITRF, and the sky.
    engine.cameras.setClock(this.world, this.clock);
    const frames = early.frames ?? frameCatalog(options.frameData);
    this.state.framesAbort = frames.abort;
    useFrames(this, frames.catalog, options.frameData !== undefined);
    const catalog = frames.catalog;
    this.frameData =
      options.frameData === undefined
        ? Promise.resolve(undefined)
        : catalog.tree().then(
            (tree) => tree.data,
            (error: unknown) => {
              if (!this.state.destroyed && catalog === this.state.frames_) {
                warn(
                  this,
                  {
                    kind: "frameDataFailed",
                    message: `Viewer: the frames data did not load, so the sky stays on the analytic models (${error instanceof Error ? error.message : String(error)})`,
                  },
                  true,
                );
              }
              return undefined;
            },
          );
    if (this.state.moon) {
      const signal = this.moonMapLoad.signal;
      void fetch(MOON_MAP, { signal })
        .then(async (response) =>
          createImageBitmap(await response.blob(), {
            colorSpaceConversion: "none",
          }),
        )
        .then((image) => {
          if (!this.state.destroyed && !this.moonMapSharp) {
            this.engine.setMoonMap(image);
          }
          // Uploaded, or not wanted (destroyed, or the sharp map won).
          image.close();
        })
        .catch(() => {});
      void loadIonMoonMap({ ...tokenOptions(this), signal })
        .then(({ image, attributions, warnings, mean }) => {
          if (this.state.destroyed) {
            image.close();
            return;
          }
          // A polar cap that did not load (its rows stretched instead).
          for (const warning of warnings) {
            console.warn(`Viewer: ${warning}`);
          }
          this.moonMapSharp = true;
          this.engine.setMoonMap(image, mean);
          image.close();
          this.addAttributions(MOON_CREDIT, attributions);
        })
        .catch((error: unknown) => {
          const message =
            error instanceof Error ? error.message : String(error);
          // Destroyed, or no token (expected): 1.x's map, quietly.
          if (
            this.state.destroyed ||
            (error instanceof DOMException && error.name === "AbortError") ||
            /no access token/.test(message)
          ) {
            return;
          }
          console.warn(
            `Viewer: the Moon map did not load, 1.x's map stays (${message})`,
          );
        });
    }
    if (options.stars !== false) {
      this.engine.setStarMap(STAR_MAP);
    }
    if (options.timeControls !== false) {
      this.state.time_ = attachTimeControls(container, this.clock, {
        ...(options.timeControls === true || !options.timeControls
          ? {}
          : options.timeControls),
        place: () => placeCamera(this),
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
    this.ready = buildGlobe(this, options.imagery ?? true);
    if (options.suspendPresentation) {
      // Nothing to keep before the first frame: hidden, so the container's
      // background (or a loading screen) shows.
      this.state.resumeStart = this.suspendPresentation({ hide: true });
    }
    // The viewer's per-frame work runs in the engine's frames (one
    // animation frame loop, which sleeps on demand once nothing changes):
    // the controllers and the clock before the engine renders, busy while
    // the clock runs; the canvas shown after, once a frame is drawn.
    const offTick = engine.onTick((now) => {
      if (this.state.destroyed) {
        return false;
      }
      this.controller.update();
      this.state.secondController?.update();
      this.clock.tick(now);
      return this.clock.mode !== "paused";
    });
    const offAfter = engine.onAfterTick(() => {
      if (
        this.state.unhideAfter !== undefined &&
        (this.state.hidingSuspensions > 0 ||
          this.engine.stats.framesRendered > this.state.unhideAfter)
      ) {
        if (this.state.hidingSuspensions === 0) {
          this.canvas.style.visibility = "";
        }
        this.state.unhideAfter = undefined;
      }
    });
    this.offTick = () => {
      offTick();
      offAfter();
    };
    engine.start();
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
    // The precise sky's data starts loading while the device is created;
    // data already in hand is in use by the time the viewer is returned.
    if (options.frameData !== undefined) {
      early.frames = frameCatalog(options.frameData);
    }
    const given =
      typeof options.frameData === "object"
        ? early.frames!.catalog.tree().catch(() => {})
        : undefined;
    const shared =
      options.engine instanceof Engine ? options.engine : undefined;
    try {
      const engine =
        shared ?? (await Engine.create(options.engine as EngineOptions));
      await given;
      return new Viewer(container, engine, options, early, !shared);
    } catch (error) {
      // No viewer: the frames data it started loading isn't wanted.
      early.frames?.abort.abort();
      throw error;
    }
  }

  // ------------------------------------------------------------- globe

  /**
   * The time controls, when the viewer has them: spans an app marks on the
   * day strip, the zone they show and their accessible name.
   */
  get timeControls():
    | Pick<
        TimeControlsHandle,
        "setMarks" | "setZone" | "zone" | "setLabel" | "label"
      >
    | undefined {
    const t = this.state.time_;
    return (
      t && {
        setMarks: (marks) => t.setMarks(marks),
        setZone: (zone) => t.setZone(zone),
        zone: () => t.zone(),
        setLabel: (label) => t.setLabel(label),
        label: () => t.label(),
      }
    );
  }

  /**
   * The globe's tileset (terrain or the ellipsoid), once built: its
   * `terrain` holds the regions that cut or fade the terrain.
   */
  get globe(): Globe | undefined {
    return this.state.globe_;
  }

  /** Whether the globe draws (it stays loaded while hidden). */
  get showGlobe(): boolean {
    return this.state.globeShown;
  }
  set showGlobe(on: boolean) {
    this.state.globeShown = on;
    if (this.state.globe_) {
      this.state.globe_.show = on;
    }
  }

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

  /** Switches the globe in place: content and camera stay. */
  async setGlobe(kind: GlobeKind): Promise<void> {
    return setGlobe(this, kind);
  }

  // ------------------------------------------------------------- content

  /** Streams a tileset (a URL or an ion asset) into the world. */
  async addTileset(
    source: TilesetSource,
    options: TilesetOptions = {},
  ): Promise<Tileset3D> {
    return addTileset(this, source, options);
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

  /**
   * Credits for something that isn't a tileset or a provider the viewer
   * knows (a tileset carries its own: `Tileset3D.attributions`).
   */
  addAttributions(owner: object, attributions: Attribution[]): void {
    this.attributions.set(owner, attributions);
  }

  /**
   * Removes a tileset added through the viewer, or an attributions' owner's
   * credits. (A model placement removes itself: `placement.remove()`.)
   */
  remove(content: Tileset3D | object): void {
    this.attributions.delete(content);
    if (this.state.tilesets.delete(content as Tileset3D)) {
      this.engine.removeTileset(content as Tileset3D);
    }
  }

  /**
   * Frames content, a bounding sphere or a place (heading 35°, pitch -30°).
   * A model frames where it stands (`bounds`); clamped and still settling
   * on the ground, it frames again once it has (`Clamp.whenSettled`),
   * unless something else was framed or someone moved the camera since.
   * Planet-scale content frames the whole globe, north up, from above the
   * ground under the camera.
   */
  zoomTo(target: ZoomTarget, heading = 35 * deg, pitch = -30 * deg): void {
    zoomTo(this, target, heading, pitch);
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
    return this.state.sunFromClock_;
  }

  set sunFromClock(on: boolean) {
    this.state.sunFromClock_ = on;
    this.state.time_?.show(on);
    if (on) {
      this.applyClockSun();
    }
  }

  /**
   * The reference frames' catalog (spec section 7.7): the sky's, the view's
   * rig's and the world's frame resolver's. Asking it for a reference frame
   * at "precise" loads that frame's data (from `ViewerOptions.frameData`, or
   * "/frames-data/" without it); `tree()` gives the whole tree at
   * "precise". `setFrameData` replaces it: reference frames added to it
   * (`add`) don't carry over to the new one.
   */
  get frames(): FrameCatalog {
    return this.state.frames_;
  }

  /**
   * The warnings so far, oldest first: frames data that didn't load or is
   * out of date (`ViewerWarning`). `events` emits `warning` for each; the
   * notice over the view lists them (`ViewerOptions.warningNotice`).
   */
  get warnings(): readonly ViewerWarning[] {
    return this.state.warningList;
  }

  /**
   * Give the sky frames data after creation, as `ViewerOptions.frameData`
   * does at creation: a new catalog over `data` (`frames`) for the sky, the
   * view's rig and the world's resolver, so the Moon and the Sun are placed
   * with DE440 once its providers' modules are in (from the next frame when
   * they were loaded before). `undefined` returns to the analytic models.
   *
   * What the application set carries over: a view whose rig the
   * application set keeps it (only the viewer's own ITRF rig moves to the
   * new ITRF), and each anchor's binding to a built-in reference frame
   * moves to the new catalog's frame of that name. A frame resolver the
   * application set stays. Reference frames added to the old catalog
   * (`frames.add`) don't carry over: with an anchor bound to one, this
   * throws, naming them, and changes nothing.
   *
   * The warnings start again from the new data's (`events` emits
   * `warningsCleared`). A load started by a `ViewerOptions.frameData` URL
   * that has not finished no longer drives the sky; `frameData` (the
   * promise) still reports the creation option.
   */
  setFrameData(data: FrameData | undefined): void {
    setFrameData(this, data);
  }

  /** The rig of the viewer's views (spec section 7.2's default): on ITRF, free. */
  private rig(): Rig {
    return this.state.ownRig!;
  }

  /** @internal The sun's direction at the clock's time. */
  applyClockSun(): void {
    applyClockSun(this);
  }

  /**
   * The sun by azimuth and elevation (degrees) at what is framed, instead
   * of from the clock (`sunFromClock` turns the clock back on).
   */
  setSun(azimuth: number, elevation: number): void {
    setSun(this, azimuth, elevation);
  }

  /** The views drawn: main, the split view's right half, the inset. */
  get views(): View[] {
    return [this.view, this.state.second, this.overview_].filter((v) => !!v);
  }

  // ------------------------------------------------------------- layout

  /**
   * Split view: a second, independent camera on the right half. Tiles are
   * selected per view from one shared cache and draw table.
   */
  get split(): boolean {
    return !!this.state.second;
  }
  set split(on: boolean) {
    if (on === this.split) {
      return;
    }
    if (on) {
      this.view.viewport = { x: 0, y: 0, width: 0.5, height: 1 };
      const second = (this.state.second = this.engine.addView({
        target: this.target,
        world: this.world,
        shadows: this.shadows,
        ambientOcclusion: this.ambientOcclusion,
        viewport: { x: 0.5, y: 0, width: 0.5, height: 1 },
      }));
      Object.assign(second.lighting, this.view.lighting);
      second.observer = this.view.observer;
      second.cityLights = this.view.cityLights;
      second.outputEncoding = this.view.outputEncoding;
      const controller = (this.state.secondController = new GlobeController(
        second,
        this.canvas,
        this.engine,
      ));
      this.engine.cameras.setRig(second, this.rig());
      second.camera.near = this.view.camera.near;
      controller.focus(
        this.controller.target,
        this.controller.heading + (150 * Math.PI) / 180,
        -0.25,
        this.controller.range * 0.4,
      );
      fromEarth(this, second);
    } else {
      this.state.secondController!.dispose();
      this.engine.removeView(this.state.second!);
      this.state.second = this.state.secondController = undefined;
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
      this.engine.cameras.setRig(this.overview_, this.rig());
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
    return this.state.second
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
    const view = this.state.second?.contains(px, py)
      ? this.state.second
      : this.view;
    const area = view.pixelRect();
    return view.pick(px - area.x, py - area.y);
  }

  /**
   * The tilesets with an item in the viewer's world that one of its views
   * shows, whoever added them (`viewer.addTileset` or `world.add`): what their
   * content requires is credited while they are. Not an item hidden, fully
   * transparent, or masked to no view of the viewer's.
   */
  private shownTilesets(): Tileset3D[] {
    let viewerViews = 0;
    for (const view of this.views) {
      viewerViews |= this.engine.viewBit(view);
    }
    const tilesets = new Set<Tileset3D>();
    for (const item of this.world.items) {
      if (
        item.tileset.show &&
        item.show &&
        item.opacity > 0 &&
        (item.viewMask & viewerViews) !== 0
      ) {
        tilesets.add(item.tileset);
      }
    }
    return [...tilesets];
  }

  /** What the view must credit: providers' attributions and data credits. */
  credits(): { attributions: Attribution[]; credits: string[] } {
    return {
      attributions: [
        ...this.state.terrainAttributions,
        ...(this.state.imagery?.attributions ?? []),
        ...[...this.attributions.values()].flat(),
        ...this.shownTilesets().flatMap((t) => t.attributions),
      ],
      credits: [
        ...new Set(
          [this.state.globe_, ...this.shownTilesets()]
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
      // Whoever added them (`viewer.addTileset` or `world.add`).
      tilesets: () =>
        [
          ...new Set([
            ...this.state.tilesets,
            ...this.world.items.map((item) => item.tileset),
            this.state.globe_,
          ]),
        ].filter((t) => !!t),
      views: () => {
        const views: Array<[string, View]> = [["main", this.view]];
        if (this.state.second) {
          views.push(["right", this.state.second]);
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
      let orbit = this.state.orbit_;
      if (orbit && !options) {
        return;
      }
      const plan = planOrbit(orbit && orbitState(orbit), options ?? {}, {
        focusCenter: this.state.focusCenter,
        cameraPosition: earthCamera(this).position,
        globeHeading: this.controller.heading,
      });
      if (!orbit) {
        orbit = new InspectController(this.view, this.canvas, plan);
        orbit.ignore = this.controller.ignore;
        orbit.onChange = () => this.onOrbitChange?.();
        this.state.orbit_ = orbit;
        this.controller.enabled = false;
      } else {
        orbit.frame = plan.frame;
        orbit.minRange = plan.minRange;
        orbit.maxRange = plan.maxRange;
      }
      orbit.focus(plan.target, plan.heading, plan.pitch, plan.range);
      fromEarth(this, this.view);
    } else if (mode === "globe" && this.state.orbit_) {
      this.state.orbit_.dispose();
      this.state.orbit_ = undefined;
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
    return (
      this.state.orbit_ && vec3.copy(vec3.vec3(), this.state.orbit_.target)
    );
  }

  /** Whether the orbit controls are being dragged (rotating or panning). */
  get orbitDragging(): boolean {
    return this.state.orbit_?.dragging ?? false;
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
    return suspendPresentation(this, options);
  }

  /**
   * Suspends presentation until `work` settles (resolved or rejected) and
   * returns it: `await viewer.suspendPresentationUntil(loadScene())`.
   */
  async suspendPresentationUntil<T>(work: Promise<T>): Promise<T> {
    return suspendPresentationUntil(this, work);
  }

  /** Whether presentation is suspended (`suspendPresentation`). */
  get presentationSuspended(): boolean {
    return this.state.suspensions > 0;
  }

  /**
   * Ends the suspension `suspendPresentation: true` started with (once;
   * other suspensions still hold presentation back).
   */
  resumePresentation(): void {
    resumePresentation(this);
  }

  /** Called when presentation is suspended (true) or resumes (false). */
  onPresentationChange?: (suspended: boolean) => void;

  /** The current controls (`setControls`). */
  get controls(): "globe" | "orbit" {
    return this.state.orbit_ ? "orbit" : "globe";
  }

  destroy(): void {
    this.state.destroyed = true;
    this.moonMapLoad.abort();
    this.state.offFrames?.();
    this.state.framesAbort.abort();
    this.state.warnings_?.dispose();
    this.state.orbit_?.dispose();
    this.offTick();
    this.credits_?.dispose();
    this.inspector?.dispose();
    this.state.time_?.dispose();
    this.state.secondController?.dispose();
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
}
