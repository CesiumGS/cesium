/**
 * The Viewer's engines (Dyno, plan §16.9): one engine at a time in a page,
 * loading samples, ion assets and iModels, with view settings, lighting,
 * picking, credits and the inspector. 2.0 does everything the former
 * standalone viewer did; 1.x does what CesiumJS can, and says what it
 * can't. The page switches engines by building another host.
 */
import {
  Ellipsoid,
  IonTmsImagery,
  createBox,
  eastNorthUpToFixedFrame,
  fromDegrees,
  ionDefaults,
  mat4,
  resolveITwinIModel,
  summarizeContent,
  vec3,
  type Clamp,
  type DrawHandle,
  type Engine,
  type Tileset3D,
  type TransformHandle,
  type World,
  type AerosolType,
  type ToneMapping,
} from "../../../src/index.ts";
import ionSource from "../../../../engine/Source/Core/Ion.js?raw";
import {
  engineSnapshot,
  Viewer,
  type CreditSource,
  type Inspectable,
  type ModelLoad,
  type PickInfo,
  type ZoomTarget,
} from "../../../widgets/index.ts";
import { legacyPick, legacySnapshot, type LegacyLoad } from "../suite.ts";

// ---------------------------------------------------------------- sources

/** What the viewer loads. */
export type Source =
  | { kind: "model"; path: string }
  | { kind: "tileset"; path: string }
  | { kind: "ion"; asset: number }
  | { kind: "imodel"; id: string }
  | { kind: "city" };

/** Khronos and Cesium sample models in Specs/Data/Models/glTF-2.0. */
export const MODELS = [
  "CesiumMilkTruck/glTF-Draco/CesiumMilkTruck.gltf",
  "BoomBox/glTF/BoomBox.gltf",
  "Duck/glTF-Draco/Duck.gltf",
  "BuildingsMetadata/glTF/buildings-metadata.gltf",
  "TorusQuantized/glTF/TorusQuantized.gltf",
  "BoxTexturedKtx2Basis/glTF/BoxTexturedKtx2Basis.gltf",
  "MeshoptCubeTest/glTF-Meshopt/MeshoptCubeTest.gltf",
  "BoxVertexColors/glTF/BoxVertexColors.gltf",
  "UnlitTest/glTF/UnlitTest.gltf",
  "TwoSidedPlane/glTF/TwoSidedPlane.gltf",
  "BoxCutout/glTF/BoxCutout.gltf",
  "Box/glTF/Box.gltf",
];

/** Public tilesets in Specs/Data/Cesium3DTiles. */
export const TILESETS = [
  "Batched/BatchedWithBatchTable/tileset.json",
  "Batched/BatchedWithBatchTableBinary/tileset.json",
  "Batched/BatchedWithTransformBox/tileset.json",
  "Batched/BatchedColors/tileset.json",
  "Batched/BatchedTextured/tileset.json",
];

/** Public ion 3D Tiles assets (all from the Sandcastle gallery). */
export const ION_ASSETS = [
  ["2275207", "Google Photorealistic 3D Tiles"],
  ["96188", "Cesium OSM Buildings"],
  ["75343", "New York City buildings"],
  ["40866", "Photogrammetry sample"],
  ["69380", "Photogrammetry (3D Tiles Compare)"],
  ["2464651", "BIM design model"],
  ["2887123", "Architectural design model"],
  ["2887129", "Architectural design site"],
  ["4665927", "Design model with edge visibility"],
  ["1670818", "Proposed building (Clipping Regions)"],
] as const;

/** Public demo iModels (the iModel mesh export Sandcastle). */
export const IMODELS = [
  ["669dde67-eb69-4e0b-bcf2-f722eee94746", "Station (design model)"],
  ["f856f57d-3d28-4265-9c4f-5e60c0662c15", "Station surroundings"],
] as const;

/** A sample's short name: the model's folder, or the tileset's. */
export function sampleLabel(path: string): string {
  return path.split("/")[path.includes("/glTF") ? 0 : 1] ?? path;
}

export function sourceName(source: Source): string {
  switch (source.kind) {
    case "model":
    case "tileset":
      return sampleLabel(source.path);
    case "ion":
      return (
        ION_ASSETS.find(([id]) => id === String(source.asset))?.[1] ??
        `ion asset ${source.asset}`
      );
    case "imodel":
      return (
        IMODELS.find(([id]) => id === source.id)?.[1] ??
        `iModel ${source.id.slice(0, 8)}…`
      );
    case "city":
      return "Synthetic city";
  }
}

/**
 * CesiumJS's public evaluation token, read from the 1.x source (kept current
 * by the repo's token workflow) rather than copied here.
 */
export const DEFAULT_ION_TOKEN = /defaultAccessToken =\s*"([^"]+)"/.exec(
  ionSource,
)?.[1];

// ---------------------------------------------------------------- settings

export interface ViewSettings {
  policy: "budgeted" | "stepwise";
  /** Maximum screen-space error, px. */
  sse: number;
  /** Cesium World Terrain with Bing imagery (else the ellipsoid). */
  terrain: boolean;
  /** Draw the globe (the ellipsoid, or terrain when chosen). */
  globe: boolean;
  unlit: boolean;
  /** Render every frame (else only when something changes). */
  continuous: boolean;
  /** A second, independent camera on the right half. */
  split: boolean;
  /** A linked overview inset. */
  overview: boolean;
}

export interface Lighting {
  /** 2.0: the sun from the viewer's clock (the time controls). */
  sunFromTime: boolean;
  /** Sun azimuth and elevation, degrees, at the content (otherwise). */
  azimuth: number;
  elevation: number;
  /** 1.x: the sun's intensity, unitless (1.x's default 2). */
  intensity: number;
  /** 1.x: image-based lighting factors (2.0 lights physically: 1). */
  diffuseIbl: number;
  specularIbl: number;
  /** 1.x: the exposure multiplier, unitless. */
  exposure: number;
  /** 2.0: the sun's light through the atmosphere (per pixel). */
  sunFromAtmosphere: boolean;
  /** 2.0: the air between the camera and the scene (haze with distance). */
  aerialPerspective: boolean;
  /** 2.0: the sun's shadows. */
  shadows: boolean;
  /** 2.0: ambient occlusion. */
  ambientOcclusion: boolean;
  /** 2.0: the Earth's lights at night (NASA's Black Marble). */
  cityLights: boolean;
  /** 2.0: how far one can see through the air, km (its haze). */
  visibility: number;
  /** 2.0: what the haze is made of. */
  aerosol: AerosolType;
  /** 2.0: otherwise, a white sun of this illuminance, lux. */
  sunIlluminance: number;
  /**
   * 2.0: as a person there would see it ("eye": adapting, night vision,
   * the stars) or as a camera records it ("camera": the exposure below).
   */
  rendering: "eye" | "camera";
  /** 2.0, eye: brighter (stops) than the eye's own adaptation. */
  compensation: number;
  /** 2.0, eye: how many times faster than a real eye it adapts (1: real). */
  adaptationSpeed: number;
  /** 2.0, camera: its exposure value at ISO 100, when not automatic. */
  ev100: number;
  /** 2.0, camera: exposure metered from the image. */
  autoExposure: boolean;
  encoding: "srgb" | "gamma2.2";
  /** How exposed light becomes display color (1.x: no AgX, PBR Neutral). */
  toneMapping: ToneMapping;
}

/** The settings an engine supports; the page explains the others. */
export type Capability = keyof ViewSettings | keyof Lighting | "city";

export interface LoadResult {
  /** Non-fatal problems while loading. */
  warnings: string[];
}

export interface ViewerHost {
  /** Settings this engine can't do, with why (for the page to say). */
  readonly unsupported: Partial<Record<Capability, string>>;
  load(source: Source, settings: ViewSettings): Promise<LoadResult>;
  /** Frames the content (or the `at` location: lon, lat, range). */
  frame(at?: readonly number[]): void;
  setView(settings: ViewSettings): void;
  setLighting(lighting: Lighting): void;
  inspectable(name: string, color?: string): Inspectable;
  /** Credits for the page to show; undefined: the engine draws its own. */
  credits(): CreditSource | undefined;
  /** The feature under a point, CSS pixels from the element's top-left. */
  pick(x: number, y: number): Promise<PickInfo | undefined>;
  destroy(): void;
}

const ellipsoid = Ellipsoid.WGS84;
const deg = Math.PI / 180;
/** Where models and the synthetic city stand (Philadelphia). */
const SITE_DEGREES = [-75.1652, 39.9526] as const;
const SITE = fromDegrees(SITE_DEGREES[0], SITE_DEGREES[1], 0);

/** The sun's direction toward it, from azimuth and elevation at `at`. */
function sunToward(
  at: Float64Array,
  azimuthDeg: number,
  elevationDeg: number,
): Float64Array {
  const enu = eastNorthUpToFixedFrame(at, ellipsoid, mat4.mat4());
  const az = azimuthDeg * deg;
  const el = elevationDeg * deg;
  const e = Math.cos(el) * Math.sin(az);
  const n = Math.cos(el) * Math.cos(az);
  const u = Math.sin(el);
  return vec3.normalize(
    vec3.vec3(),
    vec3.vec3(
      enu[0]! * e + enu[4]! * n + enu[8]! * u,
      enu[1]! * e + enu[5]! * n + enu[9]! * u,
      enu[2]! * e + enu[6]! * n + enu[10]! * u,
    ),
  );
}

const message = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

// ---------------------------------------------------------------- 2.0

/** 2.0 in the page, through `Viewer` (widgets/): what the former viewer did. */
export class NextViewerHost implements ViewerHost {
  readonly unsupported = {};
  private constructor(readonly viewer: Viewer) {}
  private settings?: ViewSettings;
  private loadToken = 0;
  /** The content shown (a tileset, model or the city), removed on switch. */
  private content?: { remove(): void; tileset?: Tileset3D };
  private focus?: ZoomTarget;
  private load_?: { startedAt: number; model?: ModelLoad };
  private readonly warnings = new Set<string>();

  static async create(
    element: HTMLElement,
    settings: ViewSettings,
  ): Promise<NextViewerHost> {
    const viewer = await Viewer.create(element, {
      globe: settings.terrain ? "terrain" : "ellipsoid",
      policy: settings.policy,
      renderMode: settings.continuous ? "continuous" : "onDemand",
      // A public asset: with CesiumJS's evaluation token where the
      // account's doesn't reach it, as other public assets load here.
      cityLights: IonTmsImagery.fromIon(3812).catch(() =>
        IonTmsImagery.fromIon(3812, { accessToken: DEFAULT_ION_TOKEN }),
      ),
    });
    const host = new NextViewerHost(viewer);
    host.settings = settings;
    // Content loads next: no frames of the whole Earth (the Viewer's start)
    // before the camera jumps to it; the view shows once it's framed.
    viewer.view.enabled = false;
    viewer.ready.catch((error) =>
      host.warnings.add(`globe: ${message(error)}`),
    );
    return host;
  }

  async load(source: Source, settings: ViewSettings): Promise<LoadResult> {
    const token = ++this.loadToken;
    this.settings = settings;
    const { viewer } = this;
    const { engine, world } = viewer;
    const warnings = this.warnings;
    warnings.clear();
    const info: NonNullable<NextViewerHost["load_"]> = {
      startedAt: performance.now(),
    };
    // The new content loads hidden beside the old, which stays until the
    // new one replaces it.
    let next: { remove(): void; tileset?: Tileset3D } | undefined;
    let focus: ZoomTarget;
    let photorealistic = false;
    const superseded = () => token !== this.loadToken;
    try {
      if (source.kind === "city") {
        const city = addCity(engine, world);
        next = city;
        focus = city;
      } else if (source.kind === "model") {
        const asset = await engine.loadGltf(
          `/specs-data/Models/glTF-2.0/${source.path}`,
        );
        if (superseded()) {
          throw new Error("superseded");
        }
        asset.warnings.forEach((w) => warnings.add(w));
        // Before the upload, which consumes the images.
        const summary = summarizeContent(asset);
        const uploadStart = performance.now();
        // A model whose nodes already sit at Earth-fixed coordinates
        // (translations of thousands of km, like tile content) is placed
        // as-is; anything else stands at SITE on the ground.
        const georeferenced = asset.draws.some(
          (d) => Math.hypot(d.matrix[12]!, d.matrix[13]!, d.matrix[14]!) > 1e6,
        );
        if (georeferenced) {
          warnings.add(
            "georeferenced model: placed at its own Earth-fixed position",
          );
        }
        const model = await viewer.addModel(asset, {
          unlit: settings.unlit,
          ...(georeferenced
            ? { modelMatrix: mat4.mat4(), axes: "3d-tiles" as const }
            : {
                at: { longitude: SITE_DEGREES[0], latitude: SITE_DEGREES[1] },
              }),
        });
        next = { remove: () => viewer.remove(model) };
        focus = model;
        info.model = {
          summary,
          networkMs: asset.timing?.networkMs ?? 0,
          decodeMs: asset.timing?.decodeMs ?? 0,
          uploadMs: performance.now() - uploadStart,
        };
      } else {
        const options = { maximumScreenSpaceError: settings.sse };
        let tileset: Tileset3D;
        if (source.kind === "ion") {
          tileset = await viewer
            .addTileset({ ion: source.asset }, options)
            .catch((error) => {
              // A public asset that isn't in this account (401/404) loads
              // with CesiumJS's evaluation token, as Sandcastle would.
              if (!deniedRetry(error)) {
                throw error;
              }
              return viewer.addTileset(
                { ion: source.asset, accessToken: DEFAULT_ION_TOKEN! },
                options,
              );
            });
          // Photorealistic tiles from an external provider (Google) are
          // their own terrain: the globe starts hidden, as 1.x apps hide it.
          photorealistic = /tile\.googleapis\.com/.test(tileset.url);
        } else {
          const url =
            source.kind === "imodel"
              ? // iTwin mesh export (signed link, about an hour).
                (
                  await resolveITwinIModel(source.id, {
                    shareKey: import.meta.env.VITE_ITWIN_SHARE_KEY as
                      string | undefined,
                  })
                ).url
              : new URL(
                  `/specs-data/Cesium3DTiles/${source.path}`,
                  location.href,
                ).href;
          tileset = await viewer.addTileset(url, options);
        }
        tileset.show = false;
        next = { tileset, remove: () => viewer.remove(tileset) };
        focus = tileset;
      }
      if (superseded()) {
        throw new Error("superseded");
      }
      // Swap: the old content leaves as the new one shows, in one frame.
      this.content?.remove();
      this.content = next;
      next = undefined;
      if (this.content.tileset) {
        this.content.tileset.show = true;
      }
      viewer.showGlobe = settings.globe && !photorealistic;
      this.focus = focus;
      this.load_ = info;
      this.frame();
      this.show();
      return { warnings: [...warnings] };
    } catch (error) {
      this.show();
      next?.remove();
      throw error;
    }
  }

  /** Shows the view (held from the start until content is framed). */
  private show(): void {
    if (!this.viewer.view.enabled) {
      this.viewer.view.enabled = true;
      this.viewer.engine.requestRender();
    }
  }

  frame(at?: readonly number[]): void {
    if (at && at.length >= 2) {
      // A place instead (planet-scale tilesets such as OSM Buildings).
      this.viewer.zoomTo({
        longitude: at[0]!,
        latitude: at[1]!,
        ...(at[2] !== undefined ? { range: at[2] } : {}),
      });
    } else if (this.focus) {
      this.viewer.zoomTo(this.focus);
    }
  }

  setView(settings: ViewSettings): void {
    const before = this.settings;
    this.settings = settings;
    const { viewer } = this;
    const tileset = this.content?.tileset;
    if (before?.policy !== settings.policy) {
      // In place: content, cache and camera stay.
      viewer.policy = settings.policy;
      tileset?.setPolicy(settings.policy);
      viewer.globe?.setPolicy(settings.policy);
    }
    if (tileset) {
      tileset.selection.maximumScreenSpaceError = settings.sse;
      tileset.selection.memoryAdjustedScreenSpaceError = settings.sse;
    }
    viewer.engine.renderMode = settings.continuous ? "continuous" : "onDemand";
    viewer.showGlobe = settings.globe;
    if (before && before.terrain !== settings.terrain) {
      void viewer
        .setGlobe(settings.terrain ? "terrain" : "ellipsoid")
        .catch((error) => this.warnings.add(`terrain: ${message(error)}`));
    }
    viewer.split = settings.split;
    viewer.overview = settings.overview;
    // Selection settings live outside what the engine fingerprints.
    viewer.engine.requestRender();
  }

  setLighting(lighting: Lighting): void {
    const { viewer } = this;
    viewer.engine.visibility = lighting.visibility;
    viewer.cityLights = lighting.cityLights;
    viewer.engine.aerosol = lighting.aerosol;
    if (lighting.sunFromTime) {
      viewer.sunFromClock = true;
    } else {
      viewer.setSun(lighting.azimuth, lighting.elevation);
    }
    for (const view of viewer.views) {
      // 2.0 lights in physical units (lux, EV100).
      view.lighting.sunIlluminance = lighting.sunFromAtmosphere
        ? "atmosphere"
        : lighting.sunIlluminance;
      view.aerialPerspective = lighting.aerialPerspective;
      view.shadows = lighting.shadows;
      view.ambientOcclusion = lighting.ambientOcclusion;
      // Physically based: image-based lighting at its own strength.
      view.lighting.diffuseIbl = 1;
      view.lighting.specularIbl = 1;
      view.exposure =
        lighting.rendering === "eye"
          ? {
              eye: true,
              compensation: lighting.compensation,
              speed: lighting.adaptationSpeed,
            }
          : lighting.autoExposure
            ? { auto: true }
            : { ev100: lighting.ev100 };
      view.outputEncoding = lighting.encoding;
      view.toneMapping = lighting.toneMapping;
    }
    viewer.engine.requestRender();
  }

  inspectable(name: string, color?: string): Inspectable {
    return {
      name,
      ...(color ? { color } : {}),
      snapshot: () => {
        const s = engineSnapshot(this.viewer.engine, {
          tilesets: () =>
            [this.content?.tileset, this.viewer.globe].filter((t) => !!t),
          views: () =>
            this.viewer.views.map(
              (v, i) => [["main", "right", "inset"][i]!, v] as const,
            ),
          world: this.viewer.world,
          canvas: this.viewer.canvas,
          ...(this.load_ ? { loadStartedAt: this.load_.startedAt } : {}),
          model: () => this.load_?.model,
        });
        const warnings = [...this.warnings];
        return warnings.length > 0
          ? {
              ...s,
              problems: {
                errors: s.problems?.errors ?? [],
                warnings: [...(s.problems?.warnings ?? []), ...warnings],
              },
            }
          : s;
      },
    };
  }

  /** The viewer draws its own credits. */
  credits(): undefined {
    return undefined;
  }

  async pick(x: number, y: number): Promise<PickInfo | undefined> {
    const r = await this.viewer.pick(x, y);
    return r
      ? {
          ...(r.name !== undefined ? { name: r.name } : {}),
          featureId: r.featureId,
          ...(r.properties ? { properties: r.properties } : {}),
        }
      : undefined;
  }

  destroy(): void {
    this.viewer.destroy();
  }
}

function deniedRetry(error: unknown): boolean {
  return (
    error instanceof Error &&
    /\((401|404)\)/.test(error.message) &&
    !!DEFAULT_ION_TOKEN &&
    ionDefaults.accessToken !== DEFAULT_ION_TOKEN
  );
}

/** 144 boxes standing on the ground, clamped as terrain loads. */
function addCity(
  engine: Engine,
  world: World,
): { center: Float64Array; radius: number; remove(): void } {
  const box = world.addMesh(createBox());
  const draws: DrawHandle[] = [];
  // Each building stands on the ground: an anchor transform at its foot,
  // clamped as terrain loads, with the box as a child.
  const anchors: TransformHandle[] = [];
  const clamps: Clamp[] = [];
  let seed = 7;
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const enu = mat4.mat4();
  const local = mat4.mat4();
  for (let j = 0; j < 12; j++) {
    for (let i = 0; i < 12; i++) {
      const foot = {
        longitude: SITE.longitude + (i - 5.5) * 0.0011 * deg,
        latitude: SITE.latitude + (j - 5.5) * 0.00085 * deg,
        height: 0,
      };
      const position = ellipsoid.cartographicToCartesian(foot, vec3.vec3());
      const width = 25 + random() * 30;
      const depth = 25 + random() * 30;
      const height = 15 + random() ** 3 * 220;
      eastNorthUpToFixedFrame(position, ellipsoid, enu);
      mat4.fromScale(local, width, depth, height);
      local[14] = height / 2;
      const tint = 0.35 + random() * 0.45;
      const anchor = world.addTransform(enu);
      anchors.push(anchor);
      clamps.push(
        engine.clamping.add(world, anchor, {
          heightReference: "clampToGround",
          ...foot,
        }),
      );
      draws.push(
        world.addDraw({
          mesh: box,
          transform: world.addTransform(local, anchor),
          radius: Math.hypot(width / 2, depth / 2, height / 2),
          color: [tint, tint * 0.92, tint * 0.85, 1],
          name: `building ${j * 12 + i + 1}`,
        }),
      );
    }
  }
  return {
    center: ellipsoid.cartographicToCartesian(SITE, vec3.vec3()),
    radius: 700,
    remove: () => {
      for (const clamp of clamps) {
        clamp.remove();
      }
      for (const draw of draws) {
        world.removeDraw(draw);
      }
      for (const anchor of anchors) {
        world.removeTransform(anchor);
      }
      world.removeMesh(box);
    },
  };
}

// ---------------------------------------------------------------- 1.x

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;
declare const Cesium: Json;

/** CesiumJS 1.x in the page: what it can do of the viewer's settings. */
export class LegacyViewerHost implements ViewerHost {
  readonly unsupported: Partial<Record<Capability, string>> = {
    policy: "1.x has its own tile selection only",
    split: "1.x draws one view per canvas",
    overview: "1.x draws one view per canvas",
    encoding: "1.x encodes output with gamma 2.2 only",
    city: "the synthetic city is built with 2.0's API",
  };
  private viewer: Json;
  private content?: Json;
  private readonly tilesets: Json[] = [];
  private load_: LegacyLoad = { startedAt: 0 };
  private focus?: Json;
  /** A clamped model's sphere where it stands (its own is provisional). */
  private placed?: Json;
  private lighting?: Lighting;
  private settings?: ViewSettings;
  private loadToken = 0;
  private cpuMs = 0;
  private frames = 0;
  private frameStart = 0;
  private readonly removeListeners: Array<() => void> = [];

  static async create(element: HTMLElement): Promise<LegacyViewerHost> {
    const host = new LegacyViewerHost();
    host.mount(element);
    return host;
  }

  private mount(element: HTMLElement): void {
    const viewer = (this.viewer = new Cesium.Viewer(element, {
      animation: false,
      timeline: false,
      baseLayerPicker: false,
      geocoder: false,
      homeButton: false,
      sceneModePicker: false,
      navigationHelpButton: false,
      fullscreenButton: false,
      infoBox: false,
      selectionIndicator: false,
      requestRenderMode: true,
      maximumRenderTimeChange: Infinity,
    }));
    viewer.scene.globe.depthTestAgainstTerrain = false;
    // Frame timing and the load's milestones, from the scene's own events.
    const scene = viewer.scene;
    this.removeListeners.push(
      scene.preRender.addEventListener(() => {
        this.frameStart = performance.now();
      }),
      scene.postRender.addEventListener(() => {
        const end = performance.now();
        const cpu = end - this.frameStart;
        this.cpuMs = this.cpuMs === 0 ? cpu : this.cpuMs * 0.9 + cpu * 0.1;
        this.frames++;
        const load = this.load_;
        if (load.rootAt !== undefined) {
          if (load.firstContentAt === undefined && this.contentDrawn()) {
            load.firstContentAt = end;
          }
          if (
            load.firstContentAt !== undefined &&
            load.settledAt === undefined &&
            this.settled()
          ) {
            load.settledAt = end;
          }
        }
      }),
    );
  }

  /** False once destroyed (a late call, e.g. after a hot reload, is a no-op). */
  private get live(): boolean {
    return !!this.viewer && !this.viewer.isDestroyed();
  }

  private settled(): boolean {
    const globe = this.viewer.scene.globe;
    return (
      (!globe?.show || globe.tilesLoaded) &&
      this.tilesets.every((t) => t.tilesLoaded)
    );
  }

  private contentDrawn(): boolean {
    return (
      this.tilesets.some((t) => t.statistics.selected > 0) ||
      (this.content !== undefined && this.tilesets.length === 0)
    );
  }

  async load(source: Source, settings: ViewSettings): Promise<LoadResult> {
    const token = ++this.loadToken;
    this.settings = settings;
    const warnings: string[] = [];
    if (source.kind === "city") {
      throw new Error(`1.x can't load this: ${this.unsupported.city}`);
    }
    this.load_ = { startedAt: performance.now() };
    const viewer = this.viewer;
    await this.applyTerrain(settings.terrain);
    let next: Json;
    if (source.kind === "model") {
      next = await Cesium.Model.fromGltfAsync({
        url: `/specs-data/Models/glTF-2.0/${source.path}`,
        modelMatrix: Cesium.Transforms.eastNorthUpToFixedFrame(
          Cesium.Cartesian3.fromRadians(SITE.longitude, SITE.latitude, 0),
        ),
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        scene: viewer.scene,
      });
    } else if (source.kind === "imodel") {
      const key = import.meta.env.VITE_ITWIN_SHARE_KEY as string | undefined;
      if (!key) {
        throw new Error(
          "Set VITE_ITWIN_SHARE_KEY in packages/next/.env.local to load iModels.",
        );
      }
      Cesium.ITwinPlatform.defaultShareKey = key;
      next = await Cesium.ITwinData.createTilesetFromIModelId({
        iModelId: source.id,
      });
    } else {
      const options = { maximumScreenSpaceError: settings.sse };
      next =
        source.kind === "ion"
          ? await Cesium.Cesium3DTileset.fromIonAssetId(source.asset, options)
          : await Cesium.Cesium3DTileset.fromUrl(
              `/specs-data/Cesium3DTiles/${source.path}`,
              options,
            );
    }
    if (token !== this.loadToken || viewer.isDestroyed()) {
      next.destroy?.();
      throw new Error("superseded");
    }
    if (this.content) {
      viewer.scene.primitives.remove(this.content);
    }
    this.tilesets.length = 0;
    this.content = viewer.scene.primitives.add(next);
    if (next instanceof Cesium.Cesium3DTileset) {
      this.tilesets.push(next);
    } else if (!next.ready) {
      // A model has no bounds until it is ready, and on-demand rendering
      // only loads it while frames are drawn. Ready isn't placed: clamped
      // to the ground, 1.x moves it as the ground's heights load, so its
      // bounds are provisional (kilometers underground at first). It is
      // framed where it will stand instead (`placed`).
      await new Promise<void>((resolve, reject) => {
        const done = (error?: Error) => {
          clearInterval(frames);
          offReady();
          offError?.();
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        };
        const frames = setInterval(() => {
          if (viewer.isDestroyed() || token !== this.loadToken) {
            done(new Error("superseded"));
          } else {
            viewer.scene.requestRender();
          }
        }, 100);
        const offReady = next.readyEvent.addEventListener(() => done());
        const offError = next.errorEvent?.addEventListener((e: unknown) =>
          done(e instanceof Error ? e : new Error(String(e))),
        );
      });
    }
    if (!(next instanceof Cesium.Cesium3DTileset)) {
      this.placed = await this.groundSphere(next.boundingSphere.radius);
    } else {
      this.placed = undefined;
    }
    this.load_.rootAt = performance.now();
    // Google's photorealistic tiles are their own terrain: no globe.
    const photorealistic = source.kind === "ion" && source.asset === 2275207;
    viewer.scene.globe.show = settings.globe && !photorealistic;
    this.applyUnlit(settings.unlit);
    this.frame();
    return { warnings };
  }

  /**
   * Where a model clamped at the site stands: on the ground there (the
   * terrain's most detailed height, or the ellipsoid), its radius up.
   */
  private async groundSphere(radius: number): Promise<Json> {
    const provider = this.viewer.scene.globe.terrainProvider;
    let ground = 0;
    if (!(provider instanceof Cesium.EllipsoidTerrainProvider)) {
      const [sample] = await Cesium.sampleTerrainMostDetailed(provider, [
        Cesium.Cartographic.fromRadians(SITE.longitude, SITE.latitude),
      ]);
      ground = sample?.height ?? 0;
    }
    return new Cesium.BoundingSphere(
      Cesium.Cartesian3.fromRadians(
        SITE.longitude,
        SITE.latitude,
        ground + radius / 2,
      ),
      radius,
    );
  }

  /** Cesium World Terrain or the ellipsoid, when it changes. */
  private async applyTerrain(terrain: boolean): Promise<void> {
    const scene = this.viewer.scene;
    const isTerrain = !(
      scene.globe.terrainProvider instanceof Cesium.EllipsoidTerrainProvider
    );
    if (isTerrain === terrain) {
      return;
    }
    scene.globe.terrainProvider = terrain
      ? await Cesium.CesiumTerrainProvider.fromIonAssetId(1)
      : new Cesium.EllipsoidTerrainProvider();
  }

  private applyUnlit(unlit: boolean): void {
    const shader = unlit
      ? new Cesium.CustomShader({
          lightingModel: Cesium.LightingModel.UNLIT,
        })
      : undefined;
    if (this.content && "customShader" in this.content) {
      this.content.customShader = shader;
    }
  }

  frame(at?: readonly number[]): void {
    if (!this.live) {
      return;
    }
    const viewer = this.viewer;
    const offset = (range: number) =>
      new Cesium.HeadingPitchRange(35 * deg, -30 * deg, range);
    if (at && at.length >= 2) {
      const center = Cesium.Cartesian3.fromDegrees(at[0], at[1], 0);
      viewer.camera.lookAt(center, offset(at[2] ?? 1500));
    } else if (this.content) {
      const sphere = this.placed ?? this.content.boundingSphere;
      if (sphere) {
        viewer.camera.viewBoundingSphere(sphere, offset(sphere.radius * 2.6));
        this.focus = sphere.center;
      }
    }
    viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
    if (this.lighting) {
      this.setLighting(this.lighting);
    }
    viewer.scene.requestRender();
  }

  setView(settings: ViewSettings): void {
    const before = this.settings;
    this.settings = settings;
    if (!this.live) {
      return;
    }
    const viewer = this.viewer;
    for (const t of this.tilesets) {
      t.maximumScreenSpaceError = settings.sse;
    }
    viewer.scene.requestRenderMode = !settings.continuous;
    viewer.scene.globe.show = settings.globe;
    if (before && before.terrain !== settings.terrain) {
      void this.applyTerrain(settings.terrain);
    }
    if (before && before.unlit !== settings.unlit) {
      this.applyUnlit(settings.unlit);
    }
    viewer.scene.requestRender();
  }

  setLighting(lighting: Lighting): void {
    this.lighting = lighting;
    if (!this.live) {
      return;
    }
    const scene = this.viewer.scene;
    const at = this.focus
      ? Float64Array.from([this.focus.x, this.focus.y, this.focus.z])
      : ellipsoid.cartographicToCartesian(SITE, vec3.vec3());
    const toward = sunToward(at, lighting.azimuth, lighting.elevation);
    // 1.x's light direction points from the sun, 2.0's toward it.
    scene.light = new Cesium.DirectionalLight({
      direction: new Cesium.Cartesian3(-toward[0]!, -toward[1]!, -toward[2]!),
      intensity: lighting.intensity,
    });
    const ibl = new Cesium.Cartesian2(
      lighting.diffuseIbl,
      lighting.specularIbl,
    );
    if (this.content?.imageBasedLighting) {
      this.content.imageBasedLighting.imageBasedLightingFactor = ibl;
    }
    scene.highDynamicRange = true;
    scene.postProcessStages.tonemapper =
      lighting.toneMapping === "aces"
        ? Cesium.Tonemapper.ACES
        : Cesium.Tonemapper.PBR_NEUTRAL;
    scene.postProcessStages.exposure = lighting.exposure;
    scene.requestRender();
  }

  inspectable(name: string, color?: string): Inspectable {
    return {
      name,
      ...(color ? { color } : {}),
      snapshot: () =>
        !this.live
          ? { state: "loading" as const }
          : {
              ...legacySnapshot(
                this.viewer,
                this.tilesets,
                this.load_,
                this.settled(),
              ),
              frame: {
                cpuMs: this.cpuMs,
                rendering: this.viewer.scene.requestRenderMode
                  ? "on demand"
                  : "continuous",
                framesRendered: this.frames,
              },
              camera: [
                ...Cesium.Cartesian3.pack(this.viewer.camera.positionWC, []),
                ...Cesium.Cartesian3.pack(this.viewer.camera.directionWC, []),
              ],
            },
    };
  }

  credits(): undefined {
    return undefined;
  }

  async pick(x: number, y: number): Promise<PickInfo | undefined> {
    return this.live ? legacyPick(this.viewer, x, y) : undefined;
  }

  destroy(): void {
    for (const remove of this.removeListeners) {
      remove();
    }
    if (this.viewer && !this.viewer.isDestroyed()) {
      this.viewer.destroy();
    }
  }
}
