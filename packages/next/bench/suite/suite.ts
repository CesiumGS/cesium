import {
  BingImagery,
  Camera,
  CanvasTarget,
  Ellipsoid,
  Engine,
  GlobeController,
  eastNorthUpToFixedFrame,
  fromDegrees,
  resolveIonAsset,
  type Tile,
  type Tileset3D,
  tileHeaderKey,
} from "../../src/index.ts";
import { volumeFromJson } from "../../src/streaming/volumes.ts";
import {
  type CreditSource,
  engineSnapshot,
  type InspectorSnapshot,
  type PickInfo,
} from "../../widgets/index.ts";
import ionSource from "../../../engine/Source/Core/Ion.js?raw";
import publicCatalog from "./catalog/public.json";
import type {
  CameraScript,
  Dataset,
  EffectiveRender,
  EngineConfig,
  FlightView,
  Pose,
  RenderSettings,
  RunMetrics,
  Scenario,
  Scene,
} from "./schema.ts";

// CesiumJS 1.x, loaded from the repo build as a global (see suite.html).
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- untyped global
declare const Cesium: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- untyped 1.x objects
type Json = any;

/**
 * Benchmark suite page (plan §16): runs one scene × scenario × engine
 * configuration and returns its metrics. The CLI (`cli.mjs`) drives it
 * through `runScene`; people pick a scene and engine in the page and press
 * Run. Engine-specific code is the two adapters below; the scenario, the
 * camera poses and the measurements are shared.
 */

const deg = Math.PI / 180;
/** 1.x's public default ion token (Sandcastle's sample assets). */
const DEFAULT_TOKEN = /defaultAccessToken =\s*"([^"]+)"/.exec(ionSource)?.[1];

export interface RunSpec {
  scene: Scene;
  /** The scene's datasets, resolved from the catalog. */
  datasets: Dataset[];
  scenario: Scenario;
  config: EngineConfig;
  /** Set by the CLI when the engine can't draw a dataset. */
  unsupported?: string;
  /** Screenshot the settled views (filmstrips): the CLI's first repetition. */
  capture?: boolean;
  /** Render settings (the catalog's, then the configuration's). */
  render?: RenderSettings;
}

/** The catalog's render settings when a spec has none. */
export const DEFAULT_RENDER: RenderSettings = {
  pixelRatio: 1,
  msaaSamples: 4,
  hdr: true,
  fxaa: false,
  fog: false,
  outlines: false,
  sun: { elevation: 40, azimuth: 150 },
};

/**
 * A spec's render settings: the catalog's, then the scene's, then the
 * configuration's.
 */
export function renderSettings(spec: RunSpec): RenderSettings {
  return {
    ...DEFAULT_RENDER,
    ...spec.render,
    ...spec.scene.render,
    ...spec.config.render,
  };
}

/**
 * Unit vector toward the sun (Earth-fixed) for a scene: the settings'
 * elevation and azimuth over the point below the camera at `pose`.
 */
export function sunDirection(spec: RunSpec, pose: Pose): Float64Array {
  const { elevation, azimuth } = renderSettings(spec).sun;
  const position = Float64Array.from(pose.position);
  const ground = Ellipsoid.WGS84.scaleToGeodeticSurface(
    position,
    new Float64Array(3),
  );
  const enu = eastNorthUpToFixedFrame(
    ground ?? position,
    Ellipsoid.WGS84,
    new Float64Array(16),
  );
  const e = Math.cos(elevation * deg) * Math.sin(azimuth * deg);
  const n = Math.cos(elevation * deg) * Math.cos(azimuth * deg);
  const u = Math.sin(elevation * deg);
  const out = new Float64Array(3);
  for (let i = 0; i < 3; i++) {
    out[i] = enu[i]! * e + enu[4 + i]! * n + enu[8 + i]! * u;
  }
  const length = Math.hypot(out[0]!, out[1]!, out[2]!);
  return out.map((v) => v / length);
}

const ratioOf = (r: RenderSettings) =>
  r.pixelRatio === "device" ? (globalThis.devicePixelRatio ?? 1) : r.pixelRatio;

/**
 * The CLI stops counting requests here (Playwright): what follows (the
 * selection reference) is not part of the run.
 */
async function endMeasurement(): Promise<void> {
  await (
    globalThis as { endMeasurement?: () => Promise<void> }
  ).endMeasurement?.();
}

/**
 * Memory after the run, read by the CLI over CDP while the engine is still
 * up (`heapBytes`, `bufferBytes`, `workers`); nothing without the CLI.
 */
async function measureMemory(): Promise<Partial<RunMetrics>> {
  return (
    (await (
      globalThis as { measureMemory?: () => Promise<Partial<RunMetrics>> }
    ).measureMemory?.()) ?? {}
  );
}

/** Filmstrip hook, exposed by the CLI (Playwright) when it captures. */
async function captureMoment(spec: RunSpec, moment: string): Promise<void> {
  const capture = (
    globalThis as { captureMoment?: (moment: string) => Promise<void> }
  ).captureMoment;
  if (spec.capture && capture) {
    await capture(moment);
  }
}

function tokenFor(dataset: Dataset): string {
  const source = dataset.source;
  const env = import.meta.env.VITE_ION_TOKEN as string | undefined;
  const token =
    source.kind === "ion" && source.token === "env" ? env : DEFAULT_TOKEN;
  if (!token) {
    throw new Error(`${dataset.title}: no ion token`);
  }
  return token;
}

/** A Google dataset's root with the environment's own Map Tiles API key. */
function googleUrl(dataset: Dataset): string | undefined {
  const key = import.meta.env.VITE_GOOGLE_MAPS_KEY as string | undefined;
  return dataset.source.kind === "ion" && dataset.source.google && key
    ? `https://tile.googleapis.com/v1/3dtiles/root.json?key=${key}`
    : undefined;
}

/** A tileset dataset's root URL and request headers. */
async function resolveTileset(dataset: Dataset): Promise<{
  url: string;
  headers?: Record<string, string>;
  attributions?: Array<{ html: string }>;
}> {
  const google = googleUrl(dataset);
  return google
    ? { url: google }
    : resolveIonAsset(ionAsset(dataset), { accessToken: tokenFor(dataset) });
}

function ionAsset(dataset: Dataset): number {
  if (dataset.source.kind !== "ion") {
    throw new Error(`${dataset.title}: not an ion dataset`);
  }
  return dataset.source.asset;
}

// ---------------------------------------------------------------- camera

/** The first layer's root bounding sphere, from its tileset JSON. */
async function frameSphere(
  dataset: Dataset,
): Promise<{ center: Float64Array; radius: number }> {
  const resolved = await resolveTileset(dataset);
  const json = await (
    await fetch(resolved.url, { headers: resolved.headers ?? {} })
  ).json();
  const transform = Float64Array.from(
    json.root.transform ?? [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
  );
  const volume = volumeFromJson(json.root.boundingVolume, transform);
  if (!volume) {
    throw new Error(`${dataset.title}: root has no bounding volume`);
  }
  return {
    center: Float64Array.from(volume.sphere.center),
    radius: volume.sphere.radius,
  };
}

/**
 * The scene's camera as a function of motion progress (0..1), the same
 * poses for every engine: float64 position, direction and up from 1.x's
 * heading-pitch-range convention.
 */
/** A camera script's pose at each point of the motion (0..1). */
export type CameraPath = ((progress: number) => Pose) & {
  /** The motion's length when the script sets it (flights), s. */
  seconds?: number;
};

export async function cameraScript(spec: RunSpec): Promise<CameraPath> {
  const camera = spec.scene.camera;
  if (camera.kind === "flight") {
    return flightPath(
      camera,
      (spec.scene.width ?? 1280) / (spec.scene.height ?? 720),
    );
  }
  if (camera.kind === "path") {
    const poses = camera.poses;
    return (progress) =>
      poses[Math.min(poses.length - 1, Math.floor(progress * poses.length))]!;
  }
  let target: Float64Array;
  let range = camera.range;
  if (camera.target === "frame") {
    const layer = spec.datasets.find(
      (d) => d.id === spec.scene.layers[0]?.dataset,
    )!;
    const sphere = await frameSphere(layer);
    target = sphere.center;
    range = camera.range * sphere.radius;
  } else {
    const [lon, lat, h] = camera.target;
    target = Ellipsoid.WGS84.cartographicToCartesian(
      fromDegrees(lon, lat, h),
      new Float64Array(3),
    );
  }
  const scratch = new Camera();
  return (progress) => {
    const heading =
      ((camera.heading ?? 0) + (camera.sweep ?? 0) * progress) * deg;
    scratch.lookAt(target, heading, camera.pitch * deg, range);
    return {
      position: [...scratch.position] as Pose["position"],
      direction: [...scratch.direction] as Pose["direction"],
      up: [...scratch.up] as Pose["up"],
    };
  };
}

/**
 * 1.x `camera.flyTo` in 3D (CameraFlightPath, its defaults): longitude and
 * latitude interpolated the short way round; height on 1.x's flat-topped
 * curve up to a fifth of the altitude that would frame the distance from
 * the start view; heading and pitch interpolated; eased quintic in and out
 * (cubic out when descending from above 11.5 km); 1.x's default length,
 * at most 3 s, unless `seconds`.
 */
function flightPath(
  flight: Extract<CameraScript, { kind: "flight" }>,
  aspect: number,
): CameraPath {
  const wgs84 = Ellipsoid.WGS84;
  const enuOf = (position: ArrayLike<number>) =>
    eastNorthUpToFixedFrame(
      Float64Array.from(position),
      wgs84,
      new Float64Array(16),
    );
  const end = (v: FlightView) => {
    const [lon, lat, h] = v.target;
    const target = wgs84.cartographicToCartesian(
      fromDegrees(lon, lat, h),
      new Float64Array(3),
    );
    const camera = new Camera().lookAt(
      target,
      (v.heading ?? 0) * deg,
      v.pitch * deg,
      v.range,
    );
    // Heading and pitch in the camera's own east-north-up frame.
    const enu = enuOf(camera.position);
    const d = camera.direction;
    const along = (k: number) =>
      d[0]! * enu[k]! + d[1]! * enu[k + 1]! + d[2]! * enu[k + 2]!;
    const carto = wgs84.cartesianToCartographic(camera.position, {
      longitude: 0,
      latitude: 0,
      height: 0,
    })!;
    return {
      camera,
      longitude: carto.longitude,
      latitude: carto.latitude,
      height: carto.height,
      heading: Math.atan2(along(0), along(4)),
      pitch: Math.asin(Math.max(-1, Math.min(1, along(8)))),
    };
  };
  const a = end(flight.from);
  const b = end(flight.to);
  const twoPi = 2 * Math.PI;
  // Longitudes in 0..2π, then the short way round (1.x useShortestFlight).
  let lon0 = ((a.longitude % twoPi) + twoPi) % twoPi;
  let lon1 = ((b.longitude % twoPi) + twoPi) % twoPi;
  if (lon0 - lon1 < -Math.PI) {
    lon0 += twoPi;
  } else if (lon0 - lon1 > Math.PI) {
    lon1 += twoPi;
  }
  // Headings the short way round (1.x adjustAngleForLERP).
  let heading0 = a.heading;
  if (Math.abs(b.heading - heading0) > Math.PI) {
    heading0 += b.heading > heading0 ? twoPi : -twoPi;
  }
  // The altitude that frames the distance from the start view (1.x
  // getAltitude, its argument order included), a fifth of it.
  const diff = [0, 1, 2].map(
    (i) => a.camera.position[i]! - b.camera.position[i]!,
  );
  const dot = (v: ArrayLike<number>) =>
    diff[0]! * v[0]! + diff[1]! * v[1]! + diff[2]! * v[2]!;
  const top = Math.tan(a.camera.fovy(aspect) / 2);
  const altitude = Math.min(
    Math.max(
      Math.abs(dot(a.camera.up)) / (aspect * top),
      Math.abs(dot(a.camera.right)) / top,
    ) * 0.2,
    1e9,
  );
  let height = (t: number) => a.height + (b.height - a.height) * t;
  if (Math.max(a.height, b.height) < altitude) {
    const power = 8;
    const factor = 1e6;
    const s = -Math.pow((altitude - a.height) * factor, 1 / power);
    const e = Math.pow((altitude - b.height) * factor, 1 / power);
    height = (t) => -Math.pow(t * (e - s) + s, power) / factor + altitude;
  }
  const ease =
    a.height > b.height && a.height > 11500
      ? (k: number) => (k - 1) ** 3 + 1
      : (k: number) => (k < 0.5 ? 16 * k ** 5 : 0.5 * ((2 * k - 2) ** 5 + 2));
  const distance = Math.hypot(diff[0]!, diff[1]!, diff[2]!);
  const path: CameraPath = (progress) => {
    const t = ease(Math.min(1, Math.max(0, progress)));
    const position = wgs84.cartographicToCartesian(
      {
        longitude: lon0 + (lon1 - lon0) * t,
        latitude: a.latitude + (b.latitude - a.latitude) * t,
        height: height(t),
      },
      new Float64Array(3),
    );
    const heading = heading0 + (b.heading - heading0) * t;
    const pitch = a.pitch + (b.pitch - a.pitch) * t;
    const enu = enuOf(position);
    const e = Math.cos(pitch) * Math.sin(heading);
    const n = Math.cos(pitch) * Math.cos(heading);
    const u = Math.sin(pitch);
    const direction = [0, 1, 2].map(
      (i) => enu[i]! * e + enu[4 + i]! * n + enu[8 + i]! * u,
    );
    // No roll: up in the vertical plane through the direction.
    const camera = new Camera();
    camera.direction.set(direction);
    camera.orient(Float64Array.of(enu[8]!, enu[9]!, enu[10]!));
    return {
      position: [...position] as Pose["position"],
      direction: [...camera.direction] as Pose["direction"],
      up: [...camera.up] as Pose["up"],
    };
  };
  path.seconds = flight.seconds ?? Math.min(Math.ceil(distance / 1e6) + 2, 3);
  return path;
}

// ---------------------------------------------------------------- adapters

export interface Adapter {
  setup(container: HTMLElement, spec: RunSpec): Promise<void>;
  /** Renders one frame; returns main-thread ms inside the engine. */
  frame(): number;
  gpuMs(): number | undefined;
  /** Nothing loading for the current view. */
  settled(): boolean;
  /** Some content (tiles or models) is drawn. */
  contentDrawn(): boolean;
  setCamera(pose: Pose): void;
  /** The camera now (the explorer links engines' cameras). */
  getCamera(): Pose;
  /** Mouse and keyboard camera control (the explorer's free flight). */
  setInteractive(on: boolean): void;
  /** Keep what is selected and loaded now, for inspecting it from elsewhere. */
  setStreamingPaused(on: boolean): void;
  /**
   * Switches tile selection in place (2.0 only): content, cache and camera
   * stay. The selection reference captures with "stepwise".
   */
  setPolicy?(policy: "budgeted" | "stepwise"): void;
  /** The tiles drawn now, keyed so two engines' selections compare. */
  drawnTiles(): DrawnTile[];
  /**
   * Tints each drawn tile with the color this returns (linear RGB; none
   * leaves it untinted), checked every frame; undefined clears tints.
   */
  setTileTint(tint: TileTint | undefined): void;
  /**
   * Wireframes of the drawn tiles' bounding volumes (1.x
   * `debugShowBoundingVolume`: white at final resolution, yellow while
   * refining, gray without content) and content volumes (blue).
   */
  setVolumes(bounding: boolean, content: boolean): void;
  /**
   * What the inspector shows (the explorer measures frame timing itself,
   * the same way for both engines).
   */
  inspect(): InspectorSnapshot;
  /** The feature under a point, in CSS pixels from the canvas's top-left. */
  pick(x: number, y: number): Promise<PickInfo | undefined>;
  /**
   * What the view must credit, for hosts that show credits themselves (2.0;
   * 1.x draws its own credit bar).
   */
  credits?(): CreditSource;
  /** The render settings in effect (read after frames were drawn). */
  effectiveRender(): EffectiveRender;
  /** Each content request so far: its URL and what it was for (2.0). */
  requestPurposes?(): Array<[string, string]>;
  /** Lights the scene from this direction (unit vector toward the sun). */
  setSun(direction: Float64Array): void;
  destroy(): void;
}

/** A drawn tile, comparable across engines (plan §16.9, Explorer). */
export interface DrawnTile {
  /**
   * 3D Tiles: the tile's header (bounding volume and geometric error as
   * written, 2.0 `Tile.headerKey`); terrain: "level/x/y" with TMS rows.
   */
  key: string;
  kind: "tiles" | "terrain";
  /** Tree depth (terrain: quadtree level). */
  depth: number;
}
export type TileTint = (
  tile: DrawnTile,
) => readonly [number, number, number] | undefined;

/** Tile tints by tree depth, as 2.0's `debugColorizeTiles` (linear RGB). */
export const DEPTH_COLORS = [
  [0.9, 0.2, 0.2],
  [0.95, 0.55, 0.1],
  [0.95, 0.85, 0.1],
  [0.3, 0.8, 0.25],
  [0.1, 0.7, 0.8],
  [0.2, 0.35, 0.95],
  [0.6, 0.3, 0.9],
  [0.9, 0.35, 0.75],
] as const;

function describeTile(tile: Tile): DrawnTile {
  const g = tile.globe;
  return g
    ? { key: `${g.level}/${g.x}/${g.y}`, kind: "terrain", depth: g.level }
    : { key: tile.headerKey, kind: "tiles", depth: tile.depth };
}

/** Budgeted's numeric options an engine variant may set (`EngineConfig`). */
const BUDGETED_OPTIONS = [
  "motionBenefit",
  "prefetchErrorScale",
  "opportunisticRatio",
  "skipLevels",
] as const;

export class NextAdapter implements Adapter {
  private engine!: Engine;
  private view!: ReturnType<Engine["addView"]>;
  private readonly tilesets: Tileset3D[] = [];
  private models = 0;
  private canvas!: HTMLCanvasElement;
  private controller: GlobeController | undefined;
  private loadStartedAt = 0;
  private readonly purposes: Array<[string, string]> = [];
  /** Attributions the scene's providers require (ion's HTML). */
  private readonly attributions: Array<{ html: string }> = [];

  async setup(container: HTMLElement, spec: RunSpec): Promise<void> {
    this.loadStartedAt = performance.now();
    const { scene, config } = spec;
    const canvas = document.createElement("canvas");
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    container.append(canvas);
    this.canvas = canvas;
    const byId = new Map(spec.datasets.map((d) => [d.id, d]));
    // Everything independent starts at once (an app would do the same):
    // imagery, the terrain endpoint and every tileset's endpoint, while the
    // device is created, then the terrain and tilesets themselves. Waiting
    // on each in turn cost about a second before the first content request.
    // Each starts as soon as its own endpoint has resolved: terrain waited
    // on all of them (Bing's metadata included), so its layer.json went out
    // 0.4 s after 1.x's (r38); its tiles load while imagery resolves.
    const imageryDataset = scene.imagery ? byId.get(scene.imagery)! : undefined;
    const terrainDataset =
      typeof scene.globe === "object"
        ? byId.get(scene.globe.terrain)!
        : undefined;
    const layers = scene.layers.map((layer) => ({
      layer,
      dataset: byId.get(layer.dataset)!,
    }));
    const imageryResolving = imageryDataset
      ? BingImagery.fromIon(ionAsset(imageryDataset), {
          accessToken: tokenFor(imageryDataset),
        })
      : undefined;
    const terrainResolving = terrainDataset
      ? resolveIonAsset(ionAsset(terrainDataset), {
          accessToken: tokenFor(terrainDataset),
        })
      : undefined;
    const endpointsResolving = layers.map(({ dataset }) =>
      dataset.source.kind === "generator" ? undefined : resolveTileset(dataset),
    );
    // Failures surface where each is awaited below.
    for (const p of [
      imageryResolving,
      terrainResolving,
      ...endpointsResolving,
    ]) {
      p?.catch(() => {});
    }
    const engine = (this.engine = await Engine.create());
    const limit = engine.gpu.device.limits.maxStorageBufferBindingSize;
    const world = engine.createWorld({
      maxDraws: 1 << 16,
      maxMaterials: 1 << 13,
      // Instance tables only as large as the scene's generators need.
      maxInstances: spec.scene.layers.some(
        (l) =>
          spec.datasets.find((d) => d.id === l.dataset)?.source.kind ===
          "generator",
      )
        ? 1 << 20
        : 1 << 14,
      vertexBytes: Math.min(768 << 20, Math.floor(limit / 4) * 4),
      indexBytes: Math.min(384 << 20, Math.floor(limit / 4) * 4),
    });
    // 2.0 renders with 4× MSAA and HDR always, and has no fog or FXAA:
    // effectiveRender() reports it, and the report flags differences.
    this.view = engine.addView({
      target: new CanvasTarget(canvas, {
        pixelRatio: ratioOf(renderSettings(spec)),
      }),
      world,
    });
    this.view.camera.near = 1;
    // Budgeted's numeric options, from engine variants (2.0+motionBenefit=0).
    const tuning = Object.fromEntries(
      BUDGETED_OPTIONS.filter((k) => config[k] !== undefined).map((k) => [
        k,
        Number(config[k]),
      ]),
    );
    const common = {
      ...(config.policy ? { policy: config.policy } : {}),
      ...(config.maximumScreenSpaceError !== undefined
        ? { maximumScreenSpaceError: config.maximumScreenSpaceError }
        : {}),
      ...tuning,
    };
    const drape = imageryResolving ? { imagery: imageryResolving } : {};
    const [globe, ...tilesets] = await Promise.all([
      terrainResolving
        ? terrainResolving.then((terrain) =>
            engine.addTerrain(world, terrain.url, {
              ...(terrain.headers ? { headers: terrain.headers } : {}),
              ...(config.policy ? { policy: config.policy } : {}),
              ...drape,
            }),
          )
        : scene.globe === "ellipsoid"
          ? engine.addEllipsoid(world, drape)
          : undefined,
      ...layers.map(({ layer, dataset }, i) => {
        const resolving = endpointsResolving[i];
        return resolving
          ? resolving.then((endpoint) =>
              engine.addTileset(world, endpoint.url, {
                ...(endpoint.headers ? { headers: endpoint.headers } : {}),
                ...common,
                enableCollision: layer.collision ?? false,
              }),
            )
          : this.generate(world, dataset, layer.at ?? [0, 0, 0]);
      }),
    ]);
    const [terrain, ...endpoints] = await Promise.all([
      terrainResolving,
      ...endpointsResolving,
    ]);
    // Terrain first, then the tilesets in catalog order; credits as 1.x
    // gives them (terrain's, imagery's, then content's). Imagery's join
    // when it resolves: as 1.x's adapter, setup doesn't wait for it (the
    // globe shows no tile without it).
    if (globe) {
      this.tilesets.push(globe);
    }
    this.attributions.push(...(terrain?.attributions ?? []));
    const imageryAt = this.attributions.length;
    void imageryResolving?.then((imagery) =>
      this.attributions.splice(imageryAt, 0, ...imagery.attributions),
    );
    tilesets.forEach((tileset, i) => {
      if (tileset) {
        this.tilesets.push(tileset);
        this.attributions.push(...(endpoints[i]?.attributions ?? []));
      }
    });
    for (const tileset of this.tilesets) {
      tileset.events.on("request", ({ url, purpose }) =>
        this.purposes.push([url, purpose]),
      );
    }
  }

  requestPurposes(): Array<[string, string]> {
    return this.purposes;
  }

  /** `instanced-grid`: the milk truck on a grid, one draw per primitive. */
  private async generate(
    world: ReturnType<Engine["createWorld"]>,
    dataset: Dataset,
    at: [number, number, number],
  ): Promise<void> {
    if (
      dataset.source.kind !== "generator" ||
      dataset.source.generator !== "instanced-grid"
    ) {
      throw new Error(`${dataset.title}: unknown generator`);
    }
    const { count = 1000, spacing = 8 } = dataset.source.params;
    const asset = await this.engine.loadGltf(
      "/specs-data/Models/glTF-2.0/CesiumMilkTruck/glTF-Draco/CesiumMilkTruck.gltf",
    );
    const side = Math.ceil(Math.sqrt(count));
    const matrices = new Float64Array(count * 16);
    let seed = 1;
    const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < count; i++) {
      const h = random() * 2 * Math.PI;
      matrices.set(
        [
          Math.cos(h),
          Math.sin(h),
          0,
          0,
          -Math.sin(h),
          Math.cos(h),
          0,
          0,
          0,
          0,
          1,
          0,
          ((i % side) - side / 2) * spacing,
          (Math.floor(i / side) - side / 2) * spacing,
          0,
          1,
        ],
        i * 16,
      );
    }
    const site = Ellipsoid.WGS84.cartographicToCartesian(
      fromDegrees(...at),
      new Float64Array(3),
    );
    this.engine.addModel(world, asset, {
      modelMatrix: eastNorthUpToFixedFrame(
        site,
        Ellipsoid.WGS84,
        new Float64Array(16),
      ),
      instances: { matrices },
    });
    this.models++;
  }

  frame(): number {
    const t = performance.now();
    this.controller?.update();
    this.engine.renderFrame();
    return performance.now() - t;
  }

  gpuMs(): number | undefined {
    const ms = this.engine.stats.gpuMs;
    return Number.isFinite(ms) ? ms : undefined;
  }

  settled(): boolean {
    return this.tilesets.every(
      (t) =>
        !t.show ||
        (t.idle && t.stats.inFlight === 0 && !(t.imagery?.busy ?? false)),
    );
  }

  contentDrawn(): boolean {
    return (
      this.models > 0 ||
      this.tilesets.some((t) =>
        [...t.stats.selected.values()].some((n) => n > 0),
      )
    );
  }

  setCamera(pose: Pose): void {
    const c = this.view.camera;
    c.position.set(pose.position);
    c.direction.set(pose.direction);
    c.orient(Float64Array.from(pose.up));
  }

  getCamera(): Pose {
    const c = this.view.camera;
    return {
      position: [...c.position] as Pose["position"],
      direction: [...c.direction] as Pose["direction"],
      up: [...c.up] as Pose["up"],
    };
  }

  setInteractive(on: boolean): void {
    if (on && !this.controller) {
      this.controller = new GlobeController(this.view, this.canvas);
    } else if (!on && this.controller) {
      this.controller.dispose();
      this.controller = undefined;
    }
  }

  setPolicy(policy: "budgeted" | "stepwise"): void {
    for (const tileset of this.tilesets) {
      tileset.setPolicy(policy);
    }
  }

  setStreamingPaused(on: boolean): void {
    for (const tileset of this.tilesets) {
      tileset.freezeSelection = on;
    }
  }

  drawnTiles(): DrawnTile[] {
    const out: DrawnTile[] = [];
    for (const tileset of this.tilesets) {
      const seen = new Set<Tile>();
      for (const list of tileset.lastSelected.values()) {
        for (const tile of list) {
          if (!seen.has(tile)) {
            seen.add(tile);
            out.push(describeTile(tile));
          }
        }
      }
    }
    return out;
  }

  setTileTint(tint: TileTint | undefined): void {
    for (const tileset of this.tilesets) {
      tileset.debugTileColor = tint
        ? (tile) => {
            const c = tint(describeTile(tile));
            return c ? [c[0], c[1], c[2], 1] : undefined;
          }
        : undefined;
    }
  }

  setVolumes(bounding: boolean, content: boolean): void {
    for (const tileset of this.tilesets) {
      tileset.debugShowBoundingVolume = bounding;
      tileset.debugShowContentBoundingVolume = content;
    }
  }

  inspect(): InspectorSnapshot {
    return engineSnapshot(this.engine, {
      tilesets: () => this.tilesets,
      canvas: this.canvas,
      loadStartedAt: this.loadStartedAt,
    });
  }

  credits(): CreditSource {
    return {
      attributions: this.attributions,
      credits: [...new Set(this.tilesets.flatMap((t) => t.credits()))],
    };
  }

  async pick(x: number, y: number): Promise<PickInfo | undefined> {
    // The view picks in its target's pixels.
    const scale = this.canvas.width / Math.max(1, this.canvas.clientWidth);
    const r = await this.view.pick(x * scale, y * scale);
    return r
      ? {
          ...(r.name !== undefined ? { name: r.name } : {}),
          featureId: r.featureId,
          ...(r.properties ? { properties: r.properties } : {}),
        }
      : undefined;
  }

  setSun(direction: Float64Array): void {
    this.engine.sunDirection.set(direction);
  }

  effectiveRender(): EffectiveRender {
    const target = this.view.target as CanvasTarget;
    return {
      width: target.width,
      height: target.height,
      pixelRatio: target.pixelRatio,
      msaaSamples: 4,
      hdr: true,
      fxaa: false,
      fog: false,
      outlines: false,
    };
  }

  destroy(): void {
    this.controller?.dispose();
    this.engine.destroy();
  }
}

/**
 * A 1.x load's milestones (performance.now()), as 2.0's tilesets record
 * them: setup began, the root tileset and terrain were ready, content was
 * first drawn, everything settled.
 */
export interface LegacyLoad {
  startedAt: number;
  rootAt?: number;
  firstContentAt?: number;
  settledAt?: number;
}

/**
 * What the inspector shows for a 1.x viewer and its tilesets (the explorer's
 * adapter and the viewer page): drawn and pending tiles, memory by kind with
 * the globe's terrain meshes, thresholds and the load timeline.
 */
export function legacySnapshot(
  viewer: Json,
  tilesets: readonly Json[],
  load: LegacyLoad,
  settled: boolean,
): InspectorSnapshot {
  const sum = (f: (t: Json) => number) =>
    tilesets.reduce((n: number, t: Json) => n + f(t), 0);
  const statistic = (key: string) => sum((t) => t.statistics[key]);
  const geometry = statistic("geometryByteLength");
  const textures = statistic("texturesByteLength");
  const batchTables = statistic("batchTableByteLength");
  // 1.x counts globe tiles, not their bytes: terrain meshes in its tile
  // cache, as 2.0 counts them (imagery excluded in both).
  let terrain = 0;
  let drawn = statistic("selected");
  const globe = viewer.scene.globe;
  if (globe) {
    drawn += globe._surface._tilesToRender.length;
    for (
      let tile = globe._surface._tileReplacementQueue.head;
      tile;
      tile = tile.replacementNext
    ) {
      const mesh = tile.data?.mesh;
      if (tile.data?.vertexArray && mesh) {
        terrain += mesh.vertices.byteLength + mesh.indices.byteLength;
      }
    }
  }
  const first = tilesets[0];
  const canvas = viewer.canvas as HTMLCanvasElement;
  const memory: NonNullable<InspectorSnapshot["memory"]> = [];
  if (first) {
    memory.push(
      { label: "Tile geometry", unit: "bytes", used: geometry },
      { label: "Tile textures", unit: "bytes", used: textures },
      { label: "Batch tables", unit: "bytes", used: batchTables },
    );
  }
  if (globe) {
    memory.push({ label: "Terrain meshes", unit: "bytes", used: terrain });
  }
  return {
    state: settled ? "settled" : "loading",
    tiles: {
      drawn,
      ...(first ? { known: statistic("numberOfTilesTotal") } : {}),
      loading: statistic("numberOfPendingRequests"),
      cache: {
        bytes: geometry + textures + batchTables + terrain,
        ...(first
          ? {
              budget: sum((t) => t.cacheBytes),
              overflow: sum((t) => t.maximumCacheOverflowBytes),
            }
          : {}),
      },
      sse: first
        ? {
            maximum: first.maximumScreenSpaceError,
            adjusted: first.memoryAdjustedScreenSpaceError,
          }
        : { maximum: globe?.maximumScreenSpaceError ?? 2 },
      ...(load.rootAt !== undefined
        ? { load: legacyLoadPhases(load, load.rootAt) }
        : {}),
    },
    memory,
    gpu: {
      adapter: viewer.scene.context.webgl2 ? "WebGL 2" : "WebGL 1",
      canvas: [canvas.width, canvas.height],
    },
  };
}

/** Root, to first content, to settled (or still streaming), as 2.0's. */
function legacyLoadPhases(load: LegacyLoad, rootAt: number) {
  const { startedAt, firstContentAt, settledAt } = load;
  const end = settledAt ?? performance.now();
  return {
    phases: [
      { label: "Root tileset", ms: rootAt - startedAt },
      { label: "To first content", ms: (firstContentAt ?? end) - rootAt },
      {
        label: settledAt !== undefined ? "To settled" : "Streaming",
        ms: firstContentAt !== undefined ? end - firstContentAt : 0,
      },
    ],
    settled: settledAt !== undefined,
  };
}

/** The feature under a point of a 1.x viewer (CSS pixels). */
export function legacyPick(
  viewer: Json,
  x: number,
  y: number,
): PickInfo | undefined {
  const picked = viewer.scene.pick(new Cesium.Cartesian2(x, y));
  if (!picked) {
    return undefined;
  }
  // A 3D Tiles feature: its properties, named as 1.x's picking example does.
  if (typeof picked.getPropertyIds === "function") {
    const properties: Record<string, unknown> = {};
    // The schema's properties this feature has a value for.
    for (const id of picked.getPropertyIds() as string[]) {
      const value = picked.getProperty(id);
      if (value !== undefined) {
        properties[id] = value;
      }
    }
    const name = properties.name ?? properties.Name;
    return {
      ...(name !== undefined ? { name: String(name) } : {}),
      featureId: picked.featureId,
      properties,
    };
  }
  return { name: picked.primitive?.constructor?.name ?? "primitive" };
}

export class LegacyAdapter implements Adapter {
  private viewer: Json;
  private readonly tilesets: Json[] = [];
  /** The load's milestones. */
  private readonly load: LegacyLoad = { startedAt: 0 };

  async setup(container: HTMLElement, spec: RunSpec): Promise<void> {
    this.load.startedAt = performance.now();
    const { scene, config } = spec;
    const render = renderSettings(spec);
    const byId = new Map(spec.datasets.map((d) => [d.id, d]));
    const viewer = (this.viewer = new Cesium.Viewer(container, {
      globe: scene.globe === "none" ? false : undefined,
      baseLayer: false,
      skyBox: false,
      skyAtmosphere: false,
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
      msaaSamples: render.msaaSamples,
      // Pixel ratio set explicitly below (resolutionScale).
      useBrowserRecommendedResolution: false,
      useDefaultRenderLoop: false,
      // The runner hides credits (#credits) so images show content only;
      // elsewhere 1.x draws its own credit bar inside its view.
      creditContainer: document.querySelector("#credits") ?? undefined,
    }));
    viewer.resolutionScale =
      ratioOf(render) / (globalThis.devicePixelRatio ?? 1);
    viewer.scene.highDynamicRange = render.hdr;
    viewer.scene.postProcessStages.fxaa.enabled = render.fxaa;
    viewer.scene.fog.enabled = render.fog;
    viewer.scene.sun = undefined;
    viewer.scene.moon = undefined;
    viewer.camera.frustum.near = 1.0;
    // Input off unless the explorer turns it on (runs are scripted).
    viewer.scene.screenSpaceCameraController.enableInputs = false;
    const ion = (d: Dataset) =>
      Cesium.IonResource.fromAssetId(ionAsset(d), {
        accessToken: tokenFor(d),
      });
    let terrain: Promise<Json> | undefined;
    if (viewer.scene.globe) {
      viewer.scene.globe.showGroundAtmosphere = false;
      // Without imagery, 2.0 draws the globe gray (0.62, 0.62, 0.6); 1.x's
      // default base color is blue. Match, so images compare the content.
      if (!scene.imagery) {
        viewer.scene.globe.baseColor = new Cesium.Color(0.62, 0.62, 0.6, 1);
      }
      // Terrain and tilesets load together (imagery never waits): the
      // same as the 2.0 adapter, so neither engine waits on the other's
      // setup order.
      if (typeof scene.globe === "object") {
        terrain = Cesium.CesiumTerrainProvider.fromUrl(
          ion(byId.get(scene.globe.terrain)!),
        );
      }
      if (scene.imagery) {
        const d = byId.get(scene.imagery)!;
        viewer.imageryLayers.add(
          Cesium.ImageryLayer.fromProviderAsync(
            Cesium.IonImageryProvider.fromAssetId(ionAsset(d), {
              accessToken: tokenFor(d),
            }),
          ),
        );
      }
    }
    const tilesets = await Promise.all(
      scene.layers.map(async (layer) => {
        const d = byId.get(layer.dataset)!;
        return Cesium.Cesium3DTileset.fromUrl(googleUrl(d) ?? (await ion(d)), {
          ...(config.maximumScreenSpaceError !== undefined
            ? { maximumScreenSpaceError: config.maximumScreenSpaceError }
            : {}),
          enableCollision: layer.collision ?? false,
          showOutline: render.outlines,
        });
      }),
    );
    if (terrain) {
      viewer.scene.globe.terrainProvider = await terrain;
    }
    for (const tileset of tilesets) {
      viewer.scene.primitives.add(tileset);
      this.tilesets.push(tileset);
    }
    this.load.rootAt = performance.now();
  }

  frame(): number {
    const t = performance.now();
    if (this.globeVolumes) {
      this.updateGlobeVolumes(this.globeVolumes);
    }
    this.viewer.render();
    const end = performance.now();
    const load = this.load;
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
    return end - t;
  }

  gpuMs(): number | undefined {
    return undefined; // WebGL timer queries are off in Chromium by default
  }

  settled(): boolean {
    const globe = this.viewer.scene.globe;
    return (
      (!globe || globe.tilesLoaded) && this.tilesets.every((t) => t.tilesLoaded)
    );
  }

  contentDrawn(): boolean {
    const globe = this.viewer.scene.globe;
    return (
      this.tilesets.some((t) => t.statistics.selected > 0) ||
      (globe ? globe._surface._tilesToRender.length > 0 : false)
    );
  }

  setCamera(pose: Pose): void {
    this.viewer.camera.setView({
      destination: new Cesium.Cartesian3(...pose.position),
      orientation: {
        direction: new Cesium.Cartesian3(...pose.direction),
        up: new Cesium.Cartesian3(...pose.up),
      },
    });
  }

  getCamera(): Pose {
    const c = this.viewer.camera;
    const xyz = (v: Json) => [v.x, v.y, v.z] as [number, number, number];
    return {
      position: xyz(c.positionWC),
      direction: xyz(c.directionWC),
      up: xyz(c.upWC),
    };
  }

  setInteractive(on: boolean): void {
    this.viewer.scene.screenSpaceCameraController.enableInputs = on;
  }

  setSun(direction: Float64Array): void {
    // As the parity harness: a directional light of 2.0's intensity.
    this.viewer.scene.light = new Cesium.DirectionalLight({
      direction: new Cesium.Cartesian3(
        -direction[0]!,
        -direction[1]!,
        -direction[2]!,
      ),
      intensity: 2.0,
    });
  }

  effectiveRender(): EffectiveRender {
    const scene = this.viewer.scene;
    return {
      width: scene.drawingBufferWidth,
      height: scene.drawingBufferHeight,
      pixelRatio: scene.pixelRatio,
      msaaSamples: scene.msaaSamples,
      hdr: scene.highDynamicRange,
      fxaa: scene.postProcessStages.fxaa.enabled,
      fog: scene.fog.enabled,
      outlines: this.tilesets.some((t) => t.showOutline),
    };
  }

  drawnTiles(): DrawnTile[] {
    const out: DrawnTile[] = [];
    for (const tileset of this.tilesets) {
      for (const tile of tileset._selectedTiles ?? []) {
        out.push({
          key: tileHeaderKey(tile._header),
          kind: "tiles",
          depth: tile._depth,
        });
      }
    }
    // Globe tiles: 1.x counts rows from the north, 2.0 (TMS) from the
    // south; the geographic scheme has 2^level rows.
    for (const tile of this.viewer.scene.globe?._surface._tilesToRender ?? []) {
      const rows = 1 << tile.level;
      out.push({
        key: `${tile.level}/${tile.x}/${rows - 1 - tile.y}`,
        kind: "terrain",
        depth: tile.level,
      });
    }
    return out;
  }

  /**
   * Tints through `tileVisible`, every frame (1.x's own
   * debugColorizeTiles picks random colors, which can't be compared
   * across engines). 1.x's globe tiles take no tint.
   */
  setTileTint(tint: TileTint | undefined): void {
    this.tintOff?.();
    const white = Cesium.Color.WHITE;
    const remove = this.tilesets.map((tileset) =>
      tileset.tileVisible.addEventListener((tile: Json) => {
        const c = tint?.({
          key: tileHeaderKey(tile._header),
          kind: "tiles",
          depth: tile._depth,
        });
        // 2.0 tints in linear color; 1.x's tile color is sRGB.
        tile.color = c
          ? new Cesium.Color(
              c[0] ** (1 / 2.2),
              c[1] ** (1 / 2.2),
              c[2] ** (1 / 2.2),
              1,
            )
          : white;
      }),
    );
    this.tintOff = () => {
      for (const r of remove) {
        r();
      }
    };
    if (!tint) {
      // One more frame paints them white, then the listeners go.
      requestAnimationFrame(() =>
        requestAnimationFrame(() => this.tintOff?.()),
      );
    }
  }
  private tintOff?: () => void;

  setVolumes(bounding: boolean, content: boolean): void {
    for (const tileset of this.tilesets) {
      tileset.debugShowBoundingVolume = bounding;
      tileset.debugShowContentBoundingVolume = content;
    }
    // 1.x has no switch for its globe's tiles: draw their bounding regions
    // here, as debugShowBoundingVolume draws a tileset's.
    if (bounding && !this.globeVolumes && this.viewer.scene.globe) {
      this.globeVolumes = new Map();
    } else if (!bounding && this.globeVolumes) {
      this.updateGlobeVolumes(this.globeVolumes, true);
      this.globeVolumes = undefined;
    }
  }
  /** Outlines of the globe tiles rendered last frame, by tile. */
  private globeVolumes?: Map<Json, { primitive: Json; key: string }>;
  private updateGlobeVolumes(
    shown: Map<Json, { primitive: Json; key: string }>,
    clear = false,
  ): void {
    const primitives = this.viewer.scene.primitives;
    const tiles: Json[] = clear
      ? []
      : (this.viewer.scene.globe?._surface._tilesToRender ?? []);
    const wanted = new Set(tiles);
    for (const [tile, entry] of shown) {
      if (!wanted.has(tile)) {
        primitives.remove(entry.primitive);
        shown.delete(tile);
      }
    }
    for (const tile of tiles) {
      const region = tile.data?.tileBoundingRegion;
      if (!region) {
        continue;
      }
      // Heights tighten as tiles load: redraw when they change.
      const key = `${region.minimumHeight}|${region.maximumHeight}`;
      const entry = shown.get(tile);
      if (entry?.key === key) {
        continue;
      }
      if (entry) {
        primitives.remove(entry.primitive);
      }
      shown.set(tile, {
        primitive: primitives.add(region.createDebugVolume(Cesium.Color.WHITE)),
        key,
      });
    }
  }

  inspect(): InspectorSnapshot {
    return legacySnapshot(
      this.viewer,
      this.tilesets,
      this.load,
      this.settled(),
    );
  }

  async pick(x: number, y: number): Promise<PickInfo | undefined> {
    return legacyPick(this.viewer, x, y);
  }

  setStreamingPaused(on: boolean): void {
    for (const tileset of this.tilesets) {
      tileset.debugFreezeFrame = on;
    }
    // The globe's own switch (CesiumInspector's "Suspend LOD update").
    const surface = this.viewer.scene.globe?._surface;
    if (surface) {
      surface._debug.suspendLodUpdate = on;
    }
  }

  destroy(): void {
    this.viewer.destroy();
  }
}

// ---------------------------------------------------------------- scenario

/** Long animation frames (Chrome) since the observer started. */
interface LongFrame {
  duration: number;
  blockingDuration: number;
}
const longFrames: LongFrame[] = [];
try {
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      longFrames.push(entry as unknown as LongFrame);
    }
  }).observe({ type: "long-animation-frame", buffered: false });
} catch {
  // Not supported: long-frame metrics stay empty.
}

const animationFrame = () =>
  new Promise<number>((resolve) => requestAnimationFrame(resolve));

const quantile = (values: number[], q: number) => {
  if (values.length === 0) {
    return undefined;
  }
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))];
};

/**
 * At most `max` points, keeping each bucket's worst frame (largest
 * interval), so hitches survive downsampling.
 */
function downsample<T extends ReadonlyArray<number | null>>(
  points: T[],
  max = 1000,
): T[] {
  if (points.length <= max) {
    return points;
  }
  const out: T[] = [];
  const size = points.length / max;
  for (let b = 0; b < max; b++) {
    let worst: T | undefined;
    for (let i = Math.floor(b * size); i < Math.floor((b + 1) * size); i++) {
      if (!worst || (points[i]![1] ?? 0) > (worst[1] ?? 0)) {
        worst = points[i];
      }
    }
    if (worst) {
      out.push(worst);
    }
  }
  return out;
}

const round = (v: number) => Math.round(v * 100) / 100;

/** Renders until settled for 10 frames in a row; ms, or undefined on timeout. */
async function settle(
  adapter: Adapter,
  start: number,
  timeoutMs: number,
  onFrame?: (timestamp: number, cpuMs: number) => void,
): Promise<number | undefined> {
  let stable = 0;
  while (performance.now() - start < timeoutMs) {
    const timestamp = await animationFrame();
    const cpuMs = adapter.frame();
    onFrame?.(timestamp, cpuMs);
    stable = adapter.settled() ? stable + 1 : 0;
    if (stable >= 10) {
      return performance.now() - start;
    }
  }
  return undefined;
}

/** Flights cross the globe: the sun stays over the camera (orbits keep the start's). */
const followsSun = (spec: RunSpec) => spec.scene.camera.kind === "flight";

/** The canvas as drawn this frame (call right after `frame()`), as a PNG. */
async function canvasPng(container: HTMLElement): Promise<string> {
  const canvas = container.querySelector("canvas")!;
  const bitmap = await createImageBitmap(canvas);
  const copy = new OffscreenCanvas(bitmap.width, bitmap.height);
  copy.getContext("2d")!.drawImage(bitmap, 0, 0);
  bitmap.close();
  const bytes = new Uint8Array(
    await (await copy.convertToBlob({ type: "image/png" })).arrayBuffer(),
  );
  let text = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    text += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(text);
}

/** A frame drawn in motion and the same pose fully loaded (PNG, base64). */
export interface MotionFrame {
  progress: number;
  moving: string;
  settled: string;
}

/**
 * Quality in motion (plan §6): the scenario's motion again in a fresh page
 * after the measured runs (nothing here is timed), the canvas copied as
 * drawn at evenly spaced points of the motion; then each of those poses
 * fully loaded. The CLI compares the two (FLIP): what motion cost the
 * image, 0 when the engine drew in motion what it draws settled.
 * Copying the canvas doesn't wait (the copy is taken in the frame's task),
 * so loading in motion runs at the measured runs' pace.
 */
export async function runMotionQuality(
  spec: RunSpec,
  samples = 8,
): Promise<{ status: string; message?: string; frames: MotionFrame[] }> {
  if (spec.unsupported) {
    return { status: "unsupported", message: spec.unsupported, frames: [] };
  }
  const container = document.querySelector<HTMLElement>("#view")!;
  container.replaceChildren();
  container.style.width = `${spec.scene.width ?? 1280}px`;
  container.style.height = `${spec.scene.height ?? 720}px`;
  const adapter: Adapter =
    spec.config.engine === "1.x" ? new LegacyAdapter() : new NextAdapter();
  const timeout = spec.scenario.settleTimeoutSeconds * 1000;
  try {
    const pose = await cameraScript(spec);
    const sun = followsSun(spec);
    await adapter.setup(container, spec);
    adapter.setSun(sunDirection(spec, pose(0)));
    adapter.setCamera(pose(0));
    if ((await settle(adapter, performance.now(), timeout)) === undefined) {
      return { status: "timeout", message: "did not settle", frames: [] };
    }
    const moving: Array<{ progress: number; png: Promise<string> }> = [];
    const duration = (pose.seconds ?? spec.scenario.motionSeconds) * 1000;
    const motionStart = performance.now();
    await animationFrame();
    for (;;) {
      await animationFrame();
      const progress = (performance.now() - motionStart) / duration;
      if (progress >= 1) {
        break;
      }
      if (sun) {
        adapter.setSun(sunDirection(spec, pose(progress)));
      }
      adapter.setCamera(pose(progress));
      adapter.frame();
      if (progress >= (moving.length + 0.5) / samples) {
        moving.push({ progress, png: canvasPng(container) });
      }
    }
    const frames: MotionFrame[] = [];
    for (const m of moving) {
      if (sun) {
        adapter.setSun(sunDirection(spec, pose(m.progress)));
      }
      adapter.setCamera(pose(m.progress));
      if ((await settle(adapter, performance.now(), timeout)) === undefined) {
        continue;
      }
      for (let i = 0; i < 5; i++) {
        await animationFrame();
        adapter.frame();
      }
      adapter.frame();
      frames.push({
        progress: round(m.progress),
        moving: await m.png,
        settled: await canvasPng(container),
      });
    }
    return { status: "ok", frames };
  } catch (e) {
    return { status: "error", message: String(e), frames: [] };
  } finally {
    adapter.destroy();
  }
}

/**
 * An image check (plan §16.10): the scene at one point of its camera path,
 * settled, then a few more frames so nothing is mid-transition, captured
 * through the CLI's `captureMoment`. Deterministic by construction: fixed
 * size, render settings and sun, no timing in the image.
 */
export async function runCheck(
  spec: RunSpec,
  progress: number,
): Promise<{ status: string; message?: string; settleMs?: number }> {
  if (spec.unsupported) {
    return { status: "unsupported", message: spec.unsupported };
  }
  const container = document.querySelector<HTMLElement>("#view")!;
  container.replaceChildren();
  container.style.width = `${spec.scene.width ?? 1280}px`;
  container.style.height = `${spec.scene.height ?? 720}px`;
  const adapter: Adapter =
    spec.config.engine === "1.x" ? new LegacyAdapter() : new NextAdapter();
  try {
    const pose = await cameraScript(spec);
    const start = performance.now();
    await adapter.setup(container, spec);
    adapter.setSun(sunDirection(spec, pose(followsSun(spec) ? progress : 0)));
    adapter.setCamera(pose(progress));
    const settleMs = await settle(
      adapter,
      start,
      spec.scenario.settleTimeoutSeconds * 1000,
    );
    for (let i = 0; i < 5; i++) {
      await animationFrame();
      adapter.frame();
    }
    await captureMoment({ ...spec, capture: true }, "check");
    return settleMs === undefined
      ? { status: "timeout", message: "did not settle" }
      : { status: "ok", settleMs };
  } catch (e) {
    return { status: "error", message: String(e) };
  } finally {
    adapter.destroy();
  }
}

/** Runs one scene × scenario × configuration and measures it. */
export async function runScene(spec: RunSpec): Promise<RunMetrics> {
  if (spec.unsupported) {
    return { status: "unsupported", message: spec.unsupported };
  }
  const container = document.querySelector<HTMLElement>("#view")!;
  container.replaceChildren();
  const width = spec.scene.width ?? 1280;
  const height = spec.scene.height ?? 720;
  container.style.width = `${width}px`;
  container.style.height = `${height}px`;
  const adapter: Adapter =
    spec.config.engine === "1.x" ? new LegacyAdapter() : new NextAdapter();
  const metrics: RunMetrics = {
    status: "ok",
    ...(spec.config.engine === "1.x" ? { engineVersion: Cesium.VERSION } : {}),
  };
  longFrames.length = 0;
  try {
    const pose = await cameraScript(spec);
    const start = performance.now();
    await adapter.setup(container, spec);
    adapter.setSun(sunDirection(spec, pose(0)));
    adapter.setCamera(pose(0));
    const timeout = spec.scenario.settleTimeoutSeconds * 1000;
    const load: Array<[number, number, number]> = [];
    let lastLoad: number | undefined;
    metrics.settleMs = await settle(
      adapter,
      start,
      timeout,
      (timestamp, cpuMs) => {
        if (lastLoad !== undefined) {
          load.push([
            round((timestamp - start) / 1000),
            round(timestamp - lastLoad),
            round(cpuMs),
          ]);
        }
        lastLoad = timestamp;
        if (metrics.firstContentMs === undefined && adapter.contentDrawn()) {
          metrics.firstContentMs = performance.now() - start;
        }
      },
    );
    metrics.render = adapter.effectiveRender();
    // Settled: the start view, for the filmstrip (outside any timing).
    if (metrics.settleMs !== undefined) {
      await captureMoment(spec, "start");
    }
    if (metrics.settleMs === undefined) {
      metrics.status = "timeout";
      metrics.message = "initial view did not settle";
    }

    // Motion: the camera script, one pose per frame, timed by progress.
    // None in a startup scenario (motionSeconds 0): load, settle, memory.
    const duration = (pose.seconds ?? spec.scenario.motionSeconds) * 1000;
    // Whether the view at the end (after the motion, or the start view)
    // settled: the image checks compare it.
    let settledEnd = metrics.settleMs !== undefined;
    if (duration > 0) {
      const intervals: number[] = [];
      const cpu: number[] = [];
      const gpu: number[] = [];
      const motion: Array<[number, number, number, number | null]> = [];
      if (pose.seconds !== undefined) {
        metrics.motionSeconds = pose.seconds;
      }
      const sun = followsSun(spec);
      const motionStart = performance.now();
      let last = await animationFrame();
      for (;;) {
        const now = await animationFrame();
        const progress = (performance.now() - motionStart) / duration;
        if (progress >= 1) {
          break;
        }
        intervals.push(now - last);
        if (sun) {
          adapter.setSun(sunDirection(spec, pose(progress)));
        }
        adapter.setCamera(pose(progress));
        const cpuMs = adapter.frame();
        cpu.push(cpuMs);
        const g = adapter.gpuMs();
        if (g !== undefined) {
          gpu.push(g);
        }
        motion.push([
          round((now - motionStart) / 1000),
          round(now - last),
          round(cpuMs),
          g === undefined ? null : round(g),
        ]);
        last = now;
      }
      metrics.motionMs = [
        Math.round(motionStart - start),
        Math.round(performance.now() - start),
      ];
      metrics.frames = intervals.length;
      metrics.frameP50 = quantile(intervals, 0.5);
      metrics.frameP95 = quantile(intervals, 0.95);
      metrics.frameP99 = quantile(intervals, 0.99);
      metrics.over33 = intervals.filter((i) => i > 34).length;
      metrics.over50 = intervals.filter((i) => i > 50).length;
      metrics.over100 = intervals.filter((i) => i > 100).length;
      metrics.frameP999 = quantile(intervals, 0.999);
      const meanInterval =
        intervals.reduce((a, b) => a + b, 0) / Math.max(1, intervals.length);
      metrics.frameStdDev = Math.sqrt(
        intervals.reduce((a, b) => a + (b - meanInterval) ** 2, 0) /
          Math.max(1, intervals.length),
      );
      metrics.intervals = intervals.map(round);
      // The camera path, for track maps (the same for every engine).
      metrics.path = [];
      for (let k = 0; k <= 49; k++) {
        const progress = k / 49;
        const carto = Ellipsoid.WGS84.cartesianToCartographic(
          Float64Array.from(pose(progress).position),
          { longitude: 0, latitude: 0, height: 0 },
        );
        if (carto) {
          metrics.path.push([
            round(progress),
            carto.longitude / deg,
            carto.latitude / deg,
            Math.round(carto.height),
          ]);
        }
      }
      metrics.series = {
        load: downsample(load),
        motion: downsample(motion),
      };
      metrics.cpuP50 = quantile(cpu, 0.5);
      metrics.cpuP95 = quantile(cpu, 0.95);
      metrics.gpuP50 = quantile(gpu, 0.5);

      if (sun) {
        adapter.setSun(sunDirection(spec, pose(1)));
      }
      adapter.setCamera(pose(1));
      const resettleStart = performance.now();
      const resettle = await settle(adapter, resettleStart, timeout);
      metrics.resettleMs = resettle;
      settledEnd = resettle !== undefined;
    }
    if (settledEnd) {
      await captureMoment(spec, "end");
    }
    metrics.longFrames = longFrames.length;
    metrics.worstBlockingMs = longFrames.length
      ? Math.max(...longFrames.map((f) => f.blockingDuration))
      : 0;
    Object.assign(metrics, await measureMemory());
    const purposeStats = adapter.requestPurposes
      ? adapter.inspect().tiles?.purposes
      : undefined;
    if (purposeStats) {
      metrics.purposeStats = purposeStats;
    }
    const purposes = adapter.requestPurposes?.();
    if (spec.capture && purposes?.length) {
      metrics.purposes = [...purposes];
    }
    await endMeasurement();

    // The selection reference (2.0): the end view again under Stepwise
    // selection, same renderer, after every measurement. The filmstrip
    // compares the two (selection parity, the scorecard's image
    // guardrail): a policy that draws less than 1.x's selection shows
    // there, apart from renderer differences.
    if (
      spec.capture &&
      settledEnd &&
      adapter.setPolicy &&
      spec.config.policy !== "stepwise"
    ) {
      adapter.setPolicy("stepwise");
      if ((await settle(adapter, performance.now(), timeout)) !== undefined) {
        await captureMoment(spec, "end-stepwise");
      }
    }
  } catch (error) {
    metrics.status = "error";
    metrics.message = error instanceof Error ? error.message : String(error);
  } finally {
    try {
      adapter.destroy();
    } catch {
      // Partially set up: nothing more to free.
    }
  }
  return metrics;
}

// ---------------------------------------------------------------- page UI

/** People run one public scene at a time; the CLI runs everything. */
function setupUi(): void {
  const catalog = publicCatalog as unknown as {
    datasets: Dataset[];
    scenes: Scene[];
    scenarios: Scenario[];
    configs: EngineConfig[];
  };
  const sceneSelect = document.querySelector<HTMLSelectElement>("#scene")!;
  const configSelect = document.querySelector<HTMLSelectElement>("#config")!;
  for (const scene of catalog.scenes) {
    sceneSelect.add(new Option(`${scene.group} · ${scene.title}`, scene.id));
  }
  for (const config of catalog.configs) {
    configSelect.add(new Option(config.id, config.id));
  }
  const output = document.querySelector("#output")!;
  document.querySelector("#run")!.addEventListener("click", async () => {
    const scene = catalog.scenes.find((s) => s.id === sceneSelect.value)!;
    const config = catalog.configs.find((c) => c.id === configSelect.value)!;
    const ids = new Set([
      ...(typeof scene.globe === "object" ? [scene.globe.terrain] : []),
      ...(scene.imagery ? [scene.imagery] : []),
      ...scene.layers.map((l) => l.dataset),
    ]);
    output.textContent = "running…";
    const metrics = await runScene({
      scene,
      datasets: catalog.datasets.filter((d) => ids.has(d.id)),
      scenario: catalog.scenarios[0]!,
      config,
    });
    output.textContent = JSON.stringify(metrics, null, 2);
  });
}

/**
 * What the browser offers both engines: user agent (and its high-entropy
 * details), display, WebGPU adapter (info, features, limits, WGSL
 * features) for 2.0, WebGL 2 (renderer, extensions, timer queries) for
 * 1.x, the 1.x build's version, and the measured display refresh.
 */
export async function describeBrowser(): Promise<Record<string, unknown>> {
  const out: Record<string, unknown> = {
    userAgent: navigator.userAgent,
    hardwareConcurrency: navigator.hardwareConcurrency,
    deviceMemoryGiB: (navigator as { deviceMemory?: number }).deviceMemory,
    devicePixelRatio,
    screen: `${screen.width}×${screen.height}`,
    // Absent when the first page is 2.0 only (no 1.x script).
    cesium1xVersion: typeof Cesium === "undefined" ? undefined : Cesium.VERSION,
  };
  const uaData = (
    navigator as {
      userAgentData?: {
        getHighEntropyValues(keys: string[]): Promise<Record<string, unknown>>;
      };
    }
  ).userAgentData;
  if (uaData) {
    out.userAgentData = await uaData.getHighEntropyValues([
      "platform",
      "platformVersion",
      "architecture",
      "bitness",
      "fullVersionList",
    ]);
  }
  // Display refresh: the median requestAnimationFrame interval at idle.
  const stamps: number[] = [];
  for (let i = 0; i < 61; i++) {
    stamps.push(await animationFrame());
  }
  const intervals = stamps.slice(1).map((t, i) => t - stamps[i]!);
  const interval = quantile(intervals, 0.5)!;
  out.refreshHz = Math.round(1000 / interval);

  const adapter = await navigator.gpu?.requestAdapter({
    powerPreference: "high-performance",
  });
  if (adapter) {
    const info = adapter.info as unknown as Record<string, unknown>;
    const limits: Record<string, number> = {};
    // WebIDL attributes: enumerable getters on the prototype.
    for (const key of Object.keys(Object.getPrototypeOf(adapter.limits))) {
      limits[key] = (adapter.limits as unknown as Record<string, number>)[key]!;
    }
    out.webgpu = {
      info: Object.fromEntries(
        [
          "vendor",
          "architecture",
          "device",
          "description",
          "subgroupMinSize",
          "subgroupMaxSize",
          "isFallbackAdapter",
        ]
          .filter((k) => info[k] !== undefined && info[k] !== "")
          .map((k) => [k, info[k]]),
      ),
      features: [...adapter.features].sort(),
      limits,
      wgslLanguageFeatures: [
        ...(navigator.gpu.wgslLanguageFeatures ?? []),
      ].sort(),
      preferredCanvasFormat: navigator.gpu.getPreferredCanvasFormat(),
    };
  }
  const gl = document.createElement("canvas").getContext("webgl2");
  if (gl) {
    const debug = gl.getExtension("WEBGL_debug_renderer_info");
    out.webgl2 = {
      version: gl.getParameter(gl.VERSION),
      shadingLanguage: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
      vendor: debug
        ? gl.getParameter(debug.UNMASKED_VENDOR_WEBGL)
        : gl.getParameter(gl.VENDOR),
      renderer: debug
        ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)
        : gl.getParameter(gl.RENDERER),
      maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
      maxSamples: gl.getParameter(gl.MAX_SAMPLES),
      timerQuery: !!gl.getExtension("EXT_disjoint_timer_query_webgl2"),
      extensions: (gl.getSupportedExtensions() ?? []).sort(),
    };
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  }
  return out;
}

Object.assign(globalThis, {
  runScene,
  runCheck,
  runMotionQuality,
  describeBrowser,
});
// The suite page's own controls (the explorer imports this module too).
if (
  document.querySelector("#run") &&
  !new URLSearchParams(location.search).has("bench")
) {
  setupUi();
}
