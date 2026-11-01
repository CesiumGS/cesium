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
  type ImageryProvider,
  type Tileset3D,
} from "../../src/index.ts";
import { volumeFromJson } from "../../src/streaming/volumes.ts";
import ionSource from "../../../engine/Source/Core/Ion.js?raw";
import publicCatalog from "./catalog/public.json";
import type {
  Dataset,
  EffectiveRender,
  EngineConfig,
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
  const resolved = await resolveIonAsset(ionAsset(dataset), {
    accessToken: tokenFor(dataset),
  });
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
export async function cameraScript(
  spec: RunSpec,
): Promise<(progress: number) => Pose> {
  const camera = spec.scene.camera;
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
  /** The render settings in effect (read after frames were drawn). */
  effectiveRender(): EffectiveRender;
  /** Lights the scene from this direction (unit vector toward the sun). */
  setSun(direction: Float64Array): void;
  destroy(): void;
}

export class NextAdapter implements Adapter {
  private engine!: Engine;
  private view!: ReturnType<Engine["addView"]>;
  private readonly tilesets: Tileset3D[] = [];
  private models = 0;
  private canvas!: HTMLCanvasElement;
  private controller: GlobeController | undefined;

  async setup(container: HTMLElement, spec: RunSpec): Promise<void> {
    const { scene, config } = spec;
    const canvas = document.createElement("canvas");
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    container.append(canvas);
    this.canvas = canvas;
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
    const byId = new Map(spec.datasets.map((d) => [d.id, d]));
    let imagery: ImageryProvider | undefined;
    if (scene.imagery) {
      const d = byId.get(scene.imagery)!;
      imagery = await BingImagery.fromIon(ionAsset(d), {
        accessToken: tokenFor(d),
      });
    }
    const common = {
      ...(config.policy ? { policy: config.policy } : {}),
      ...(config.maximumScreenSpaceError !== undefined
        ? { maximumScreenSpaceError: config.maximumScreenSpaceError }
        : {}),
    };
    if (typeof scene.globe === "object") {
      const d = byId.get(scene.globe.terrain)!;
      const resolved = await resolveIonAsset(ionAsset(d), {
        accessToken: tokenFor(d),
      });
      this.tilesets.push(
        await engine.addTerrain(world, resolved.url, {
          ...(resolved.headers ? { headers: resolved.headers } : {}),
          ...(config.policy ? { policy: config.policy } : {}),
          ...(imagery ? { imagery } : {}),
        }),
      );
    } else if (scene.globe === "ellipsoid") {
      this.tilesets.push(
        engine.addEllipsoid(world, imagery ? { imagery } : {}),
      );
    }
    for (const layer of scene.layers) {
      const d = byId.get(layer.dataset)!;
      if (d.source.kind === "generator") {
        await this.generate(world, d, layer.at ?? [0, 0, 0]);
        continue;
      }
      const resolved = await resolveIonAsset(ionAsset(d), {
        accessToken: tokenFor(d),
      });
      this.tilesets.push(
        await engine.addTileset(world, resolved.url, {
          ...(resolved.headers ? { headers: resolved.headers } : {}),
          ...common,
          enableCollision: layer.collision ?? false,
        }),
      );
    }
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

  setStreamingPaused(on: boolean): void {
    for (const tileset of this.tilesets) {
      tileset.freezeSelection = on;
    }
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

export class LegacyAdapter implements Adapter {
  private viewer: Json;
  private readonly tilesets: Json[] = [];

  async setup(container: HTMLElement, spec: RunSpec): Promise<void> {
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
      creditContainer: document.querySelector("#credits"),
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
    if (viewer.scene.globe) {
      viewer.scene.globe.showGroundAtmosphere = false;
      if (typeof scene.globe === "object") {
        viewer.scene.globe.terrainProvider =
          await Cesium.CesiumTerrainProvider.fromUrl(
            await ion(byId.get(scene.globe.terrain)!),
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
    for (const layer of scene.layers) {
      const d = byId.get(layer.dataset)!;
      const tileset = await Cesium.Cesium3DTileset.fromUrl(await ion(d), {
        ...(config.maximumScreenSpaceError !== undefined
          ? { maximumScreenSpaceError: config.maximumScreenSpaceError }
          : {}),
        enableCollision: layer.collision ?? false,
        showOutline: render.outlines,
      });
      viewer.scene.primitives.add(tileset);
      this.tilesets.push(tileset);
    }
  }

  frame(): number {
    const t = performance.now();
    this.viewer.render();
    return performance.now() - t;
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
    const intervals: number[] = [];
    const cpu: number[] = [];
    const gpu: number[] = [];
    const motion: Array<[number, number, number, number | null]> = [];
    const duration = spec.scenario.motionSeconds * 1000;
    const motionStart = performance.now();
    let last = await animationFrame();
    for (;;) {
      const now = await animationFrame();
      const progress = (performance.now() - motionStart) / duration;
      if (progress >= 1) {
        break;
      }
      intervals.push(now - last);
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

    adapter.setCamera(pose(1));
    const resettleStart = performance.now();
    const resettle = await settle(adapter, resettleStart, timeout);
    metrics.resettleMs = resettle;
    if (resettle !== undefined) {
      await captureMoment(spec, "end");
    }
    metrics.longFrames = longFrames.length;
    metrics.worstBlockingMs = longFrames.length
      ? Math.max(...longFrames.map((f) => f.blockingDuration))
      : 0;
    (globalThis as { gc?: () => void }).gc?.();
    const memory = (performance as { memory?: { usedJSHeapSize: number } })
      .memory;
    metrics.heapBytes = memory?.usedJSHeapSize;
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
    cesium1xVersion: Cesium.VERSION,
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

Object.assign(globalThis, { runScene, describeBrowser });
// The suite page's own controls (the explorer imports this module too).
if (
  document.querySelector("#run") &&
  !new URLSearchParams(location.search).has("bench")
) {
  setupUi();
}
