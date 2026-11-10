import {
  CanvasTarget,
  CustomShader,
  EARTH,
  Ellipsoid,
  Engine,
  EYE,
  GlobeController,
  eastNorthUpToFixedFrame,
  mat4,
  PointSource,
  VectorLayer,
  fromDegrees,
  vec3,
  type ImageryProvider,
  type ModelPlacement,
  type ModelResource,
  type SceneItem,
  type Tileset3D,
  type VectorStyleDocument,
  type View,
} from "../../src/index.ts";
import {
  EarthOrientationParameters,
  Ephemeris,
  attachSky,
  createFrameCatalog,
  type FrameData,
} from "../../src/frames/index.ts";
import { Clock, LeapSeconds } from "../../src/time/index.ts";
import px from "../../../engine/Source/Assets/Textures/SkyBox/tycho2t3_80_px.jpg?inline";
import mx from "../../../engine/Source/Assets/Textures/SkyBox/tycho2t3_80_mx.jpg?inline";
import py from "../../../engine/Source/Assets/Textures/SkyBox/tycho2t3_80_py.jpg?inline";
import my from "../../../engine/Source/Assets/Textures/SkyBox/tycho2t3_80_my.jpg?inline";
import pz from "../../../engine/Source/Assets/Textures/SkyBox/tycho2t3_80_pz.jpg?inline";
import mz from "../../../engine/Source/Assets/Textures/SkyBox/tycho2t3_80_mz.jpg?inline";
import presets from "../reel/shaders/presets.json";
import { openData, type ReelData } from "./data.ts";
import { feedSource } from "./feed.ts";
import { demHeight, type Dem } from "./terrain.ts";
import { setGround } from "./workerPool.ts";

const deg = Math.PI / 180;
const ellipsoid = Ellipsoid.WGS84;
/** The vehicles' area, around the middle of the corridor. */
const SITE = { longitude: -122.02, latitude: 37.76 };
/** Vehicle counts it steps through, never skipping one going up. */
const VEHICLE_STEPS = [
  1_000, 2_500, 5_000, 10_000, 25_000, 50_000, 100_000, 250_000, 500_000,
  1_000_000, 2_000_000, 5_000_000, 10_000_000,
];
/**
 * How long each step holds before the next. No frame-time cap: the climb goes
 * on however slow the ticks get, and backs off only when the GPU fails.
 */
const SETTLE_MS = 1000;

const SHADERS = Object.keys(presets);
/** The toy car's scale: its nodes make it centimeters long. */
const CAR_SCALE = 250;
/** Meters above the ground the camera looks at, about the car's middle. */
const CAR_LIFT = 4;

export interface ReelState {
  chapter: number;
  /** Seconds into it, and how long it runs. */
  t: number;
  duration: number;
  playing: boolean;
  /** The reader has the camera. */
  free: boolean;
  caption: string;
  poses: readonly string[];
  frameMs: number;
  cpuMs: number;
  /** NaN where the device offers no timer. */
  gpuMs: number;
  views: number;
  draws: number;
  /** Vehicles drawn now, and the steps they move through. */
  count: number;
  steps: readonly number[];
  target: number;
  /** The reader set the count: the slider shows what was asked for. */
  countManual: boolean;
  /** The most that have held up here, and why it stopped there. */
  ceiling: number | undefined;
  ceilingWhy: string | undefined;
  hours: number;
  morph: number;
  ground: number;
  shader: string;
  shaders: readonly string[];
  tileBytes: number;
}

export interface Reel {
  state(): ReelState;
  chapter(index: number): void;
  play(on: boolean): void;
  /** The tour takes the camera back. */
  resume(): void;
  pose(index: number): void;
  setHours(hours: number): void;
  setCount(count: number): void;
  setMorph(t: number): void;
  setGround(opacity: number): void;
  setShader(name: string): void;
  /** Stops drawing while out of view, and starts again. */
  setActive(active: boolean): void;
  dispose(): void;
}

interface Pose {
  name: string;
  target: Float64Array;
  heading: number;
  pitch: number;
  range: number;
}

/** Where the tour's camera is, as seconds into the chapter. */
type Key = [seconds: number, pose: number];

interface Chapter {
  duration: number;
  poses: Pose[];
  keys: Key[];
  /** Slow turn about the target, radians a second, while it plays. */
  turn?: number;
  enter(): Promise<void> | void;
  update(t: number, dt: number): void;
  exit(): void;
  caption(t: number): string;
}

interface CorridorPoint {
  /** Station, ftUS. */
  s: number;
  lon: number;
  lat: number;
  /** Reprojected position, Earth-fixed metres. */
  p: [number, number, number];
  /** How far the rigid placement has it from there, m. */
  e: number;
}

const ecef = (lon: number, lat: number, h = 0) =>
  ellipsoid.cartographicToCartesian(fromDegrees(lon, lat, h), vec3.vec3());

const smooth = (x: number) => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
};

/** Between cues in a chapter's time. */
const ramp = (t: number, from: number, to: number) =>
  smooth((t - from) / (to - from));

const VEHICLE_STYLE: VectorStyleDocument = {
  parameters: {
    symbolSize: { label: "Size", default: 6, min: 2, max: 16, step: 1 },
  },
  layers: [
    {
      id: "vehicles",
      shape: "'circle'",
      size: "${param.symbolSize} * 1px",
      fill: { color: "#7fe0ff" },
    },
  ],
};

export async function startReel(
  container: HTMLElement,
  options: {
    /** Tour motion: false under reduced motion. */
    motion: boolean;
    onLost(message: string): void;
  },
): Promise<Reel> {
  const data: ReelData = openData();
  const need = (path: string) => {
    const bytes = data.bytes(path);
    if (!bytes) {
      throw new Error(`The page has no ${path} in it.`);
    }
    return bytes;
  };
  const json = <T>(path: string) =>
    JSON.parse(new TextDecoder().decode(need(path))) as T;

  // The ground around the corridor, before the first tile asks.
  const demBytes = need("dem.f32");
  const dem: Dem = {
    ...json<Omit<Dem, "heights">>("dem.json"),
    heights: new Float32Array(
      demBytes.buffer.slice(
        demBytes.byteOffset,
        demBytes.byteOffset + demBytes.byteLength,
      ),
    ),
  };
  setGround(dem);

  const canvas = document.createElement("canvas");
  canvas.style.inlineSize = "100%";
  canvas.style.blockSize = "100%";
  canvas.style.display = "block";
  canvas.tabIndex = 0;
  canvas.setAttribute(
    "aria-label",
    "The live reel. Drag to move the camera. Arrow keys turn it, plus and minus zoom.",
  );
  container.append(canvas);

  // A lost device is reported, not retried.
  const engine = await Engine.create({ recoverFromLoss: false });
  let disposed = false;
  engine.gpu.events.on("lost", (info) => {
    if (!disposed) {
      engine.stop();
      options.onLost(info.message);
    }
  });
  const world = engine.createWorld({
    maxDraws: 1 << 16,
    maxMaterials: 1 << 13,
    vertexBytes: 512 << 20,
    indexBytes: 256 << 20,
  });
  const target = new CanvasTarget(canvas);
  const view = engine.addView({
    target,
    world,
    shadows: true,
    observer: { exposure: EYE },
  });
  const controller = new GlobeController(view, canvas, engine);
  let second: { view: View; controller: GlobeController } | undefined;

  const provider = (
    name: string,
    folder: string,
    type: string,
    maximumLevel: number,
  ): ImageryProvider => ({
    name,
    tilingScheme: "webMercator",
    minimumLevel: 0,
    maximumLevel,
    tileSize: 256,
    attributions: [],
    tileUrl: (x, y, level) =>
      data.url(`${folder}/${level}/${x}/${y}.${type}`) ??
      // Nothing here: the engine draws the nearest level above that has it.
      "data:image/jpeg;base64,",
  });
  const globe = engine.addEllipsoid(world, {
    imagery: provider("Blue Marble and USGS", "day", "jpg", 15),
    lights: provider("Black Marble", "night", "png", 4),
  });

  // The real sky: the embedded DE440 packs and Earth orientation.
  const frameData: FrameData = {
    leapSeconds: LeapSeconds.builtIn(),
    eop: EarthOrientationParameters.fromCelestrakCsv(
      new TextDecoder().decode(need("EOP-All.csv")),
    ),
    ephemeris: Ephemeris.fromPacks(
      need("planets.pack").slice().buffer,
      need("moon.pack").slice().buffer,
    ),
    warnings: [],
  };
  const catalog = createFrameCatalog({ data: frameData });
  const clock = new Clock({ mode: "paused" });
  /** Midnight UTC at the March equinox: the terminator runs pole to pole. */
  const DAY_START = Date.UTC(2026, 2, 20);
  let hours = 12;
  const setClock = (h: number) => {
    hours = h;
    clock.time = DAY_START + h * 3_600_000;
  };
  setClock(12);
  const detachSky = attachSky(engine, { catalog, clock, precision: "precise" });
  engine.setStarMap([px, mx, py, my, pz, mz]);

  // ------------------------------------------------------------ the corridor
  const points = json<CorridorPoint[]>("corridor/points.json");
  const pointAt = (station: number) =>
    points.reduce((a, b) =>
      Math.abs(b.s - station) < Math.abs(a.s - station) ? b : a,
    );
  const farthest = points.reduce((a, b) => (b.e > a.e ? b : a));
  const middle = pointAt((points[0]!.s + points.at(-1)!.s) / 2);
  const TUNNEL = { from: 86_700, to: 92_300 };
  const tunnel = pointAt((TUNNEL.from + TUNNEL.to) / 2);

  let tileset: Tileset3D | undefined;
  let road: SceneItem | undefined;
  let reference: SceneItem | undefined;
  let morph = 0;
  let groundOpacity = 1;
  let corridorLoad: Promise<void> | undefined;
  const loadCorridor = async () => {
    corridorLoad ??= firstLoad();
    await corridorLoad;
    if (road) {
      road.show = true;
    }
  };
  const firstLoad = async () => {
    {
      const description = json<{ root: unknown }>("corridor/tileset.json");
      const swap = (node: {
        content?: { uri: string };
        children?: unknown[];
      }) => {
        if (node.content) {
          node.content.uri = data.url(`corridor/${node.content.uri}`)!;
        }
        for (const child of node.children ?? []) {
          swap(child as typeof node);
        }
      };
      swap(description.root as Parameters<typeof swap>[0]);
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(description)], { type: "application/json" }),
      );
      tileset = await engine.loadTileset(url);
      if (disposed) {
        return;
      }
      road = world.add(tileset, { placement: morph });
      reference = world.add(tileset, {
        placement: 1,
        tint: [1, 0.55, 0.15],
        opacity: 0.45,
        show: false,
      });
    }
  };
  const polygon = () => {
    // The centre line across the tunnel, between the points the data has.
    const line = [...points].sort((x, y) => x.s - y.s);
    const along = Array.from({ length: 13 }, (_, i) => {
      const s = TUNNEL.from + ((TUNNEL.to - TUNNEL.from) * i) / 12;
      const after = line.findIndex((p) => p.s >= s);
      const q = line[Math.max(0, after)]!;
      const r = line[Math.max(0, after - 1)]!;
      const f = q.s === r.s ? 0 : (s - r.s) / (q.s - r.s);
      return {
        lon: r.lon + (q.lon - r.lon) * f,
        lat: r.lat + (q.lat - r.lat) * f,
      };
    });
    const width = 450 / 111_000;
    const side = (sign: number) =>
      along.map((p, i) => {
        const a = along[Math.max(0, i - 1)]!;
        const b = along[Math.min(along.length - 1, i + 1)]!;
        const dx = (b.lon - a.lon) * Math.cos(p.lat * deg);
        const dy = b.lat - a.lat;
        const length = Math.hypot(dx, dy) || 1;
        return {
          longitude:
            p.lon + (sign * width * -dy) / length / Math.cos(p.lat * deg),
          latitude: p.lat + (sign * width * dx) / length,
        };
      });
    return [...side(1), ...side(-1).reverse()];
  };
  let region: ReturnType<typeof globe.terrain.addRegion> | undefined;
  const setRegion = () => {
    if (groundOpacity >= 0.999) {
      region?.remove();
      region = undefined;
    } else if (region) {
      region.opacity = groundOpacity;
    } else {
      region = globe.terrain.addRegion(
        { polygon: polygon() },
        { opacity: groundOpacity, ground: false },
      );
    }
  };

  // ------------------------------------------------------------ the vehicles
  let source: PointSource | undefined;
  let layer: VectorLayer | undefined;
  let feed: Worker | undefined;
  let building = 0;
  let stepIndex = 0;
  let targetStep = 0;
  let ceilingStep: number | undefined;
  let ceilingWhy: string | undefined;
  let settledAt = Infinity;
  let countManual = false;
  const HALF = 18_000;
  const origin = ecef(SITE.longitude, SITE.latitude, 100);

  const stopVehicles = () => {
    building++;
    feed?.terminate();
    feed = undefined;
    layer?.destroy();
    source?.destroy();
    layer = undefined;
    source = undefined;
  };
  const buildVehicles = async (index: number) => {
    stopVehicles();
    const token = building;
    const n = VEHICLE_STEPS[index]!;
    let next: PointSource;
    try {
      next = new PointSource(engine, world, {
        capacity: n,
        origin,
        anchor: world.bodyAnchor(EARTH),
        clamp: {
          halfExtent: HALF * 1.05,
          size: 2048,
          top: 2000,
          bottom: -400,
        },
      });
    } catch (error) {
      if (index > 0) {
        backOff(`${n.toLocaleString()} couldn't be held (${String(error)})`);
      }
      return;
    }
    next.count = n;
    source = next;
    stepIndex = index;
    settledAt = Infinity;
    const created = await VectorLayer.create(engine, world, {
      source: next,
      style: VEHICLE_STYLE,
    });
    if (token !== building || disposed) {
      created.destroy();
      return;
    }
    layer = created;
    layer.setParameter(
      "symbolSize",
      Math.max(2, Math.min(7, Math.round(12.5 - 2 * Math.log10(n)))),
    );
    const worker = new Worker(
      URL.createObjectURL(new Blob([feedSource], { type: "text/javascript" })),
    );
    feed = worker;
    worker.onmessage = (e: MessageEvent) => {
      const m = e.data as {
        first: number;
        data: Float32Array;
        interval: number;
      };
      if (source === next) {
        next.delay = m.interval;
        next.update(m.first, m.data);
      }
    };
    worker.postMessage({ count: n, half: HALF, rate: 10 });
    settledAt = performance.now() + SETTLE_MS;
  };
  const backOff = (why: string) => {
    ceilingStep = Math.max(0, stepIndex - 1);
    ceilingWhy = why;
    targetStep = Math.min(targetStep, ceilingStep);
    void buildVehicles(ceilingStep);
  };
  /** One step at a time toward the target, each held for `SETTLE_MS`. */
  const stepVehicles = (now: number) => {
    if (!source || now < settledAt) {
      return;
    }
    if (
      targetStep > stepIndex &&
      (ceilingStep === undefined || stepIndex < ceilingStep)
    ) {
      void buildVehicles(stepIndex + 1);
    } else if (targetStep < stepIndex) {
      void buildVehicles(targetStep);
    }
  };
  engine.gpu.events.on("error", () => {
    if (source && stepIndex > 0) {
      backOff("a GPU error");
    }
  });

  // ------------------------------------------------------------ the model
  // The highest ground nearby: from there the land falls away behind it.
  let MODEL_SPOT = { longitude: -122.0, latitude: 37.74 };
  let modelGround = -Infinity;
  for (let j = -30; j <= 30; j++) {
    for (let i = -30; i <= 30; i++) {
      const spot = {
        longitude: -122.0 + i * 0.0006,
        latitude: 37.74 + j * 0.0006,
      };
      const h = demHeight(dem, spot.longitude, spot.latitude);
      if (h > modelGround) {
        modelGround = h;
        MODEL_SPOT = spot;
      }
    }
  }
  const modelTarget = ecef(
    MODEL_SPOT.longitude,
    MODEL_SPOT.latitude,
    modelGround + CAR_LIFT,
  );
  /** The toy car, east-north-up on the ground, scaled to the size of a house. */
  const carMatrix = mat4.multiply(
    mat4.mat4(),
    eastNorthUpToFixedFrame(
      ecef(MODEL_SPOT.longitude, MODEL_SPOT.latitude, modelGround),
      ellipsoid,
      mat4.mat4(),
    ),
    mat4.fromScale(mat4.mat4(), CAR_SCALE, CAR_SCALE, CAR_SCALE),
  );
  let model: ModelResource | undefined;
  let placement: ModelPlacement | undefined;
  let shaderName = SHADERS[0]!;
  const shaders = new Map<string, CustomShader>();
  /**
   * Switches once the shader's pipelines are made, so the model keeps the
   * one it had meanwhile (content with an uncompiled shader draws with the
   * default material: `CustomShader`).
   */
  const switchTo = async (name: string) => {
    const shader = shaderFor(name);
    await engine.compileShader(shader);
    if (shaderName === name && !disposed) {
      placement?.setShader(shader);
    }
  };
  /** All of them, one at a time, so the tour's switches are ready in time. */
  const warmShaders = async () => {
    for (const name of SHADERS) {
      await engine.compileShader(shaderFor(name));
    }
  };
  const shaderFor = (name: string) => {
    let shader = shaders.get(name);
    if (!shader) {
      shader = new CustomShader({
        wgsl: (presets as Record<string, string>)[name]!,
        label: name,
      });
      shaders.set(name, shader);
    }
    return shader;
  };

  // ------------------------------------------------------------ the chapters
  let timeManual = false;
  let morphManual = false;
  let groundManual = false;
  let shaderManual = false;
  let poseOverride: number | undefined;
  const resetManual = () => {
    timeManual = morphManual = groundManual = shaderManual = false;
    poseOverride = undefined;
  };

  let compensation = 0;
  const NIGHT_STOPS = 2.2;
  /** The hour (UTC) the first chapter's clock stops at: night over Europe. */
  const NIGHT_HOLD = 23;
  const earthPose = (
    name: string,
    lon: number,
    lat: number,
    range: number,
  ): Pose => ({
    name,
    target: ecef(lon, lat),
    heading: 0,
    pitch: -88 * deg,
    range,
  });

  const CHAPTERS: Chapter[] = [
    {
      duration: 22,
      poses: [
        earthPose("The Atlantic", -30, 15, 2.1e7),
        earthPose("Europe by night", 12, 44, 5.5e6),
        earthPose("The Americas", -85, 20, 1.7e7),
      ],
      keys: [
        [0, 0],
        [14, 1],
        [22, 1],
      ],
      enter() {
        setClock(9);
      },
      update(_t, dt) {
        // The clock stops at night, so the eye has time to adapt to the lights.
        if (options.motion && !timeManual) {
          setClock(Math.min(NIGHT_HOLD, hours + dt));
        }
        // Eyes open as the view goes dark, so the lights show.
        const opening = ramp(hours, 17, 22) * NIGHT_STOPS;
        if (Math.abs(opening - compensation) > 0.02) {
          compensation = opening;
          view.observer.exposure = { eye: true, compensation };
        }
      },
      exit() {
        compensation = 0;
        view.observer.exposure = EYE;
      },
      caption: () =>
        "The Sun comes from a reduced copy of JPL's DE440 embedded in this file, and Earth's rotation from a table. The terminator, the air and the night lights follow from them.",
    },
    {
      duration: 30,
      poses: [
        {
          name: "Over the valley",
          target: ecef(SITE.longitude, SITE.latitude, 100),
          heading: 20 * deg,
          pitch: -50 * deg,
          range: 34_000,
        },
        {
          name: "Among them",
          target: ecef(SITE.longitude, SITE.latitude, 100),
          heading: 70 * deg,
          pitch: -28 * deg,
          range: 7_000,
        },
      ],
      keys: [
        [0, 0],
        [20, 0],
        [28, 1],
      ],
      turn: 0.02,
      async enter() {
        setClock(20);
        ceilingStep = undefined;
        ceilingWhy = undefined;
        targetStep = options.motion ? VEHICLE_STEPS.length - 1 : 2;
        await buildVehicles(0);
      },
      update() {},
      exit() {
        stopVehicles();
        countManual = false;
      },
      caption: () =>
        "A simulated feed sends reports from a worker. On the GPU, vehicles move between reports and clamp to the ground the view draws. The count rises a step at a time while this machine keeps up.",
    },
    {
      duration: 22,
      poses: [
        {
          name: "The whole road",
          target: Float64Array.from(middle.p),
          heading: 10 * deg,
          pitch: -62 * deg,
          range: 36_000,
        },
        {
          name: "Far from the anchor",
          target: Float64Array.from(farthest.p),
          heading: -35 * deg,
          pitch: -42 * deg,
          range: 900,
        },
        {
          name: "Under the hills",
          target: Float64Array.from(tunnel.p),
          heading: 90 * deg,
          pitch: -52 * deg,
          range: 2_400,
        },
      ],
      keys: [
        [0, 0],
        [5, 0],
        [8, 1],
        [14.5, 1],
        [17, 2],
        [22, 2],
      ],
      async enter() {
        setClock(21);
        morph = 0;
        await loadCorridor();
        if (index !== 2) {
          if (index !== 3 && road) {
            road.show = false;
          }
          return;
        }
        if (road) {
          road.placement = morph;
          reference!.show = true;
        }
      },
      update(t) {
        if (!options.motion) {
          return;
        }
        if (!morphManual && road) {
          morph = ramp(t, 9, 14);
          road.placement = morph;
        }
        if (reference) {
          reference.show = t < 15;
        }
        if (!groundManual) {
          groundOpacity = 1 - 0.8 * ramp(t, 17.5, 20);
          setRegion();
        }
      },
      exit() {
        if (road) {
          road.show = false;
          reference!.show = false;
        }
        groundOpacity = 1;
        setRegion();
      },
      caption: (t) =>
        t < 8
          ? "A made-up highway, designed in a state plane coordinate system. Placed rigidly at one anchor, as most viewers place a model, it drifts from where its design says it is."
          : t < 15
            ? `Orange is where it belongs, about ${Math.round(farthest.e)} m away here, at true scale. Each vertex carries both positions, so one scene item goes from rigid to reprojected through one number, with no reload.`
            : "Reprojected, the built road meets the natural ground. Fading the ground over a region shows the tunnel inside the hill.",
    },
    {
      duration: 10,
      poses: [
        {
          name: "Two views",
          target: Float64Array.from(middle.p),
          heading: 10 * deg,
          pitch: -38 * deg,
          range: 5_500,
        },
      ],
      keys: [[0, 0]],
      turn: 0.03,
      async enter() {
        setClock(19);
        morph = 1;
        await loadCorridor();
        if (disposed || index !== 3) {
          if (index !== 2 && road) {
            road.show = false;
          }
          return;
        }
        road!.placement = 1;
        view.viewport = { x: 0, y: 0, width: 0.5, height: 1 };
        const other = engine.addView({
          target,
          world,
          shadows: true,
          observer: { exposure: EYE },
          viewport: { x: 0.5, y: 0, width: 0.5, height: 1 },
        });
        second = {
          view: other,
          controller: new GlobeController(other, canvas, engine),
        };
        second.controller.focus(
          Float64Array.from(tunnel.p),
          140 * deg,
          -30 * deg,
          1_600,
        );
      },
      update(t) {
        if (second && options.motion && !free) {
          second.controller.focus(
            Float64Array.from(tunnel.p),
            (140 + t * 2.4) * deg,
            -30 * deg,
            1_600,
          );
        }
      },
      exit() {
        if (second) {
          second.controller.dispose();
          engine.removeView(second.view);
          second = undefined;
          view.viewport = { x: 0, y: 0, width: 1, height: 1 };
        }
        if (road) {
          road.show = false;
        }
      },
      caption: () =>
        "An orbit and a close-up: two views of one world, on one GPU device and one tile cache. Each selects its own tiles, and a tile both want loads once.",
    },
    {
      duration: 15,
      poses: [
        {
          name: "The toy car",
          target: modelTarget,
          heading: 200 * deg,
          pitch: -12 * deg,
          range: 48,
        },
      ],
      keys: [[0, 0]],
      turn: 0.1,
      async enter() {
        setClock(23);
        void warmShaders();
        model ??= await engine.loadModel(world, data.url("ToyCar.glb")!);
        if (disposed || index !== 4) {
          return;
        }
        placement = model.place({ modelMatrix: carMatrix });
        void switchTo(shaderName);
      },
      update(t) {
        if (!shaderManual && options.motion) {
          const name = SHADERS[Math.floor(t / 2.4) % SHADERS.length]!;
          if (name !== shaderName) {
            shaderName = name;
            void switchTo(name);
          }
        }
      },
      exit() {
        placement?.remove();
        placement = undefined;
      },
      caption: () =>
        "Custom shaders written in Slang, compiled to WGSL when this page was built, so nothing downloads a compiler. One moves the vertices; the others change the surface. Each compiles before it's switched to, and switching changes nothing else about the model.",
    },
    // Room here for a Moon chapter, once plan 5c lands.
  ];

  // ------------------------------------------------------------ the tour
  let index = 0;
  let t = 0;
  let playing = options.motion;
  let free = false;
  let turnAngle = 0;
  let frameMs = 16;
  let lastTick = performance.now();
  let active = true;

  const applyCamera = () => {
    const chapter = CHAPTERS[index]!;
    let pose: Omit<Pose, "name">;
    if (poseOverride !== undefined) {
      pose = chapter.poses[poseOverride]!;
    } else {
      const keys = chapter.keys;
      let k = 0;
      while (k + 1 < keys.length && keys[k + 1]![0] <= t) {
        k++;
      }
      const a = chapter.poses[keys[k]![1]]!;
      const after = keys[k + 1];
      const b = after ? chapter.poses[after[1]]! : a;
      const f =
        after && options.motion
          ? smooth((t - keys[k]![0]) / (after[0] - keys[k]![0]))
          : 0;
      pose = {
        target: Float64Array.from(
          [0, 1, 2],
          (i) => a.target[i]! + (b.target[i]! - a.target[i]!) * f,
        ),
        heading: a.heading + (b.heading - a.heading) * f,
        pitch: a.pitch + (b.pitch - a.pitch) * f,
        range: Math.exp(
          Math.log(a.range) + (Math.log(b.range) - Math.log(a.range)) * f,
        ),
      };
    }
    controller.focus(
      pose.target,
      pose.heading + turnAngle,
      pose.pitch,
      pose.range,
    );
  };

  const enter = () => {
    Promise.resolve(CHAPTERS[index]!.enter()).catch((error: unknown) => {
      console.error("[reel]", error);
    });
  };

  const goTo = (next: number) => {
    CHAPTERS[index]!.exit();
    index = next;
    t = 0;
    turnAngle = 0;
    free = false;
    resetManual();
    enter();
    applyCamera();
    engine.requestRender();
  };

  const offTick = engine.onTick((now) => {
    const tick = now - lastTick;
    lastTick = now;
    if (!active) {
      return false;
    }
    frameMs = frameMs * 0.9 + Math.min(tick, 500) * 0.1;
    controller.update();
    second?.controller.update();
    const chapter = CHAPTERS[index]!;
    const dt = Math.min(tick, 100) / 1000;
    if (playing) {
      t = Math.min(chapter.duration, t + dt);
      chapter.update(t, dt);
      if (!free) {
        turnAngle += (chapter.turn ?? 0) * dt;
        applyCamera();
        if (t >= chapter.duration) {
          if (index + 1 < CHAPTERS.length) {
            goTo(index + 1);
          } else {
            playing = false;
          }
        }
      }
    }
    if (index === 1) {
      stepVehicles(now);
    }
    return true;
  });

  // The reader takes the camera.
  const grab = () => {
    free = true;
    poseOverride = undefined;
  };
  canvas.addEventListener("pointerdown", grab);
  canvas.addEventListener("wheel", grab, { passive: true });
  canvas.addEventListener("keydown", (e) => {
    const step = 4 * deg;
    let heading = controller.heading;
    let pitch = controller.pitch;
    let range = controller.range;
    if (e.key === "ArrowLeft") {
      heading -= step;
    } else if (e.key === "ArrowRight") {
      heading += step;
    } else if (e.key === "ArrowUp") {
      pitch = Math.min(-2 * deg, pitch + step);
    } else if (e.key === "ArrowDown") {
      pitch = Math.max(-89 * deg, pitch - step);
    } else if (e.key === "+" || e.key === "=") {
      range *= 0.9;
    } else if (e.key === "-" || e.key === "_") {
      range *= 1.1;
    } else {
      return;
    }
    e.preventDefault();
    grab();
    controller.focus(controller.target, heading, pitch, range);
    engine.requestRender();
  });

  engine.renderMode = "continuous";
  enter();
  applyCamera();
  engine.start();

  return {
    state() {
      const chapter = CHAPTERS[index]!;
      return {
        chapter: index,
        t,
        duration: chapter.duration,
        playing,
        free,
        caption: chapter.caption(t),
        poses: chapter.poses.map((p) => p.name),
        frameMs,
        cpuMs: engine.stats.cpuMs,
        gpuMs: engine.stats.gpuMs,
        views: engine.views.length,
        draws: engine.stats.draws,
        count: source ? VEHICLE_STEPS[stepIndex]! : 0,
        steps: VEHICLE_STEPS,
        target: VEHICLE_STEPS[targetStep]!,
        countManual,
        ceiling:
          ceilingStep === undefined ? undefined : VEHICLE_STEPS[ceilingStep],
        ceilingWhy,
        hours,
        morph,
        ground: groundOpacity,
        shader: shaderName,
        shaders: SHADERS,
        tileBytes: tileset?.stats.bytes ?? 0,
      };
    },
    chapter: goTo,
    play(on) {
      playing = on;
      lastTick = performance.now();
    },
    resume() {
      free = false;
      poseOverride = undefined;
      playing = true;
    },
    pose(i) {
      poseOverride = i;
      free = false;
      turnAngle = 0;
      applyCamera();
      engine.requestRender();
    },
    setHours(h) {
      timeManual = true;
      setClock(h);
    },
    setCount(count) {
      countManual = true;
      const wanted = VEHICLE_STEPS.findIndex((n) => n >= count);
      targetStep = wanted < 0 ? VEHICLE_STEPS.length - 1 : wanted;
      if (ceilingStep !== undefined) {
        targetStep = Math.min(targetStep, ceilingStep);
      }
    },
    setMorph(value) {
      morphManual = true;
      morph = value;
      if (road) {
        road.placement = value;
      }
    },
    setGround(opacity) {
      groundManual = true;
      groundOpacity = opacity;
      setRegion();
    },
    setShader(name) {
      shaderManual = true;
      shaderName = name;
      void switchTo(name);
    },
    setActive(on) {
      if (disposed || on === active) {
        return;
      }
      active = on;
      feed?.postMessage({ paused: !on });
      if (on) {
        lastTick = performance.now();
        engine.start();
      } else {
        engine.stop();
      }
    },
    dispose() {
      if (disposed) {
        return;
      }
      disposed = true;
      offTick();
      stopVehicles();
      detachSky();
      second?.controller.dispose();
      controller.dispose();
      engine.stop();
      engine.destroy();
      setGround(undefined);
      data.dispose();
      canvas.remove();
    },
  };
}
