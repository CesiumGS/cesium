// A rig on GCRF, and re-rooting without a pixel's change (plan 5a, Task 14;
// the plan's call 34; the Node test is test/rerooting.test.ts). A globe-only
// scene rendered to offscreen targets and compared with the gate's FLIP
// (parity/flip.ts, its tolerances bench/suite/images.mjs REGRESSION):
//
// 1. a rig on ITRF and one on GCRF at the same instants draw the same image;
// 2. on GCRF with the clock playing at 3,600×, the sky alone (the globe
//    hidden) is the same image at two instants (a still star field), and
//    the globe's pixels differ (the Earth turns);
// 3. re-rooting at a paused instant changes no pixel beyond the tolerance;
// 4. a core-only scene follows a box on a node moved each tick with a rig,
//    and the box stays at the view's centre within one pixel.
//
// Check 4 runs first, before the page loads anything of the frames module
// (`@cesium/next/frames`) or the time library: its scene is the core's
// alone, and the page reports how many of their modules had loaded then.
import "../lab/harness.css";
import type { Harness } from "../lab/harness.ts";
import { flip } from "../parity/flip.ts";
import {
  Camera,
  EARTH,
  Engine,
  OffscreenTarget,
  UNITLESS_EXPOSURE,
  createBox,
  type FrameKey,
  type ImageryProvider,
  type Rig,
  type Tileset3D,
  type View,
  type World,
} from "../src/index.ts";

const TEMPLATE = `
<h1>A rig on GCRF, and re-rooting without a pixel's change</h1>
<p>
  A view's rig picks its render root: on ITRF the Earth's anchor sits at the
  identity, on GCRF it turns with the Earth. Either way the Earth's content
  is drawn with the camera in the Earth's anchor, so the image is the same.
  The globe is drawn with a test pattern of 15° cells, coloured by
  longitude, so its turn shows. Images are compared with FLIP, within the
  bench gate's tolerances (mean 0.01, 95th percentile 0.05).
</p>
<div class="status">Run to check on this GPU.</div>
<div data-id="adapter"></div>
<table data-id="results"></table>
<div class="images" data-id="images"></div>`;

/** The bench gate's image tolerances (bench/suite/images.mjs `REGRESSION`). */
const TOLERANCE = { mean: 0.01, p95: 0.05 };

const WIDTH = 256;
const HEIGHT = 256;
const DAY = 86_400_000;
/** A day after a new Moon: the Moon sits near the sun, behind the camera. */
const T0 = Date.UTC(2026, 2, 20, 14, 3, 7, 250);
/** The camera's distance from the Earth's centre, m. */
const DISTANCE = 16_000_000;
/** Scene seconds per real second while the clock plays (check 2). */
const RATE = 3600;
/** Real milliseconds between check 2's two instants (two hours of scene time). */
const PLAYED_MS = 2000;
/**
 * Exposures: daylight for the sunlit globe; for the stars, EV100 −8 (the
 * eye's stars are at −3, too dim to count against a fixed exposure).
 */
const DAYLIGHT = { ev100: 15 };
const NIGHT = { ev100: -8 };

/** 1.x's star map (Tycho), +x, −x, +y, −y, +z, −z in the celestial frame. */
const STAR_MAP = ["px", "mx", "py", "my", "pz", "mz"].map(
  (face) =>
    new URL(
      `../../engine/Source/Assets/Textures/SkyBox/tycho2t3_80_${face}.jpg`,
      import.meta.url,
    ),
);

interface Check {
  id: number;
  name: string;
  /** Each measured value, by what it measures. */
  measured: Record<string, number>;
  /** What passing takes, in words. */
  limit: string;
  pass: boolean;
}

export interface RerootingResult {
  adapter: string;
  checks: Check[];
  pass: boolean;
}

/** Where the page is mounted (harness `mount`). */
let root: HTMLElement;
const $ = <T extends Element = HTMLElement>(id: string) =>
  root.querySelector<T>(`[data-id="${id}"]`)!;

/** The engine of a run in progress, destroyed by `dispose`. */
let active: Engine | undefined;
/** Object URLs of the test pattern's tiles, revoked by `stop`. */
const tileUrls: string[] = [];

function stop(engine: Engine | undefined): void {
  if (engine && active === engine) {
    active = undefined;
    engine.destroy();
  }
  for (const url of tileUrls.splice(0)) {
    URL.revokeObjectURL(url);
  }
}

/**
 * How many modules of the frames module, the time library and the
 * ephemeris have loaded, and whether the count can be trusted. Read from
 * resource timing, so it counts only on the dev server, where each module
 * is its own request (a bundle has none to count). rerooting.html raises
 * the resource timing buffer (250 entries by default; a full buffer drops
 * later entries silently) before any module loads, and records whether it
 * filled (`resourceTimingFull`).
 */
function framesModulesLoaded(): {
  modules: number;
  entries: number;
  full: boolean;
} {
  const entries = performance.getEntriesByType("resource");
  return {
    modules: entries.filter((e) =>
      /\/src\/(frames|time|ephemeris)\//.test(e.name),
    ).length,
    entries: entries.length,
    full: Boolean(
      (globalThis as { resourceTimingFull?: boolean }).resourceTimingFull,
    ),
  };
}

/** Column-major translation by (x, y, z). */
function translation(x: number, y: number, z: number): Float64Array {
  const m = new Float64Array(16);
  m[0] = m[5] = m[10] = m[15] = 1;
  m[12] = x;
  m[13] = y;
  m[14] = z;
  return m;
}

/** The FLIP of two images, and how many pixels differ at all. */
function compare(a: Uint8ClampedArray, b: Uint8ClampedArray) {
  const f = flip(a, b, WIDTH, HEIGHT);
  let differing = 0;
  for (let i = 0; i < a.length; i += 4) {
    if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2]) {
      differing++;
    }
  }
  return { mean: f.mean, p95: f.p95, max: f.max, differing };
}

const within = (c: { mean: number; p95: number }) =>
  c.mean <= TOLERANCE.mean && c.p95 <= TOLERANCE.p95;

/** Check 1's images must show this much globe (about 45% of the image). */
const MIN_GLOBE_PIXELS = 20_000;

/** Pixels brighter than the background (any channel at 16 or more). */
function drawn(pixels: Uint8ClampedArray): number {
  let n = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    if (Math.max(pixels[i]!, pixels[i + 1]!, pixels[i + 2]!) >= 16) {
      n++;
    }
  }
  return n;
}

/** Shows an image under a caption. */
function show(caption: string, pixels: Uint8ClampedArray): void {
  const figure = document.createElement("figure");
  const label = document.createElement("figcaption");
  label.textContent = caption;
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  canvas.style.width = `${WIDTH}px`;
  canvas.style.borderRadius = "4px";
  canvas
    .getContext("2d")!
    .putImageData(new ImageData(new Uint8ClampedArray(pixels), WIDTH), 0, 0);
  figure.append(label, canvas);
  $("images").append(figure);
}

/**
 * A test pattern as Web Mercator imagery, levels 0 to 3: cells of 15° of
 * longitude and latitude, checkered, their hue by longitude, made here
 * (object URLs, nothing fetched from elsewhere).
 */
async function testPattern(): Promise<ImageryProvider> {
  const size = 256;
  const urls = new Map<string, string>();
  const mercatorY = (latitude: number) =>
    (1 - Math.log(Math.tan(Math.PI / 4 + latitude / 2)) / Math.PI) / 2;
  const deg = Math.PI / 180;
  for (let level = 0; level <= 3; level++) {
    const n = 2 ** level;
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const canvas = new OffscreenCanvas(size, size);
        const ctx = canvas.getContext("2d")!;
        for (let i = 0; i < 24; i++) {
          const left = ((i / 24) * n - x) * size;
          const right = (((i + 1) / 24) * n - x) * size;
          if (right < 0 || left > size) {
            continue;
          }
          for (let j = 0; j < 12; j++) {
            const north = Math.min(90 - j * 15, 85.06) * deg;
            const south = Math.max(90 - (j + 1) * 15, -85.06) * deg;
            if (north <= south) {
              continue;
            }
            const top = (mercatorY(north) * n - y) * size;
            const bottom = (mercatorY(south) * n - y) * size;
            ctx.fillStyle = `hsl(${i * 15} 65% ${(i + j) % 2 ? 62 : 30}%)`;
            ctx.fillRect(left, top, right - left, bottom - top);
          }
        }
        const url = URL.createObjectURL(
          await canvas.convertToBlob({ type: "image/png" }),
        );
        tileUrls.push(url);
        urls.set(`${level}/${x}/${y}`, url);
      }
    }
  }
  return {
    name: "test pattern",
    tilingScheme: "webMercator",
    minimumLevel: 0,
    maximumLevel: 3,
    tileSize: size,
    attributions: [],
    tileUrl: (x, y, level) => urls.get(`${level}/${x}/${y}`)!,
  };
}

/** Renders until `ready` holds for 8 renders running, 30 ms apart. */
async function settle(
  engine: Engine,
  ready: () => boolean,
  maxMs = 120_000,
): Promise<void> {
  const deadline = performance.now() + maxMs;
  let stable = 0;
  while (stable < 8) {
    engine.renderFrame();
    stable = ready() ? stable + 1 : 0;
    if (performance.now() > deadline) {
      throw new Error("the globe did not settle");
    }
    await new Promise((resolve) => setTimeout(resolve, 30));
  }
}

/** The angle of the rotation from `a`'s linear part to `b`'s, degrees. */
function turn(a: Float64Array, b: Float64Array): number {
  let trace = 0;
  for (let i = 0; i < 3; i++) {
    for (let k = 0; k < 3; k++) {
      trace += a[i * 4 + k]! * b[i * 4 + k]!;
    }
  }
  return (Math.acos(Math.min(1, (trace - 1) / 2)) * 180) / Math.PI;
}

/**
 * Check 4: a core-only scene. A box on a node of the transform table,
 * moved each tick across 10 km at the Earth's radius from the table's
 * origin; a rig 10 m behind it, aimed at it. Its pixels' centroid against
 * the view's centre.
 */
async function coreOnly(engine: Engine, lost: () => void): Promise<Check> {
  const loaded = framesModulesLoaded();
  const modules = loaded.full ? Infinity : loaded.modules;
  const world = engine.createWorld({
    maxDraws: 4,
    vertexBytes: 1 << 16,
    indexBytes: 1 << 16,
  });
  const target = new OffscreenTarget(WIDTH, HEIGHT);
  const view = engine.addView({
    target,
    world,
    background: "color",
    clearColor: [0, 0, 0],
    observer: { exposure: UNITLESS_EXPOSURE },
  });
  const node = world.addTransform(translation(6_378_137, 0, 0));
  world.addDraw({
    mesh: world.addMesh(createBox()),
    transform: node,
    color: [1, 0.55, 0.15, 1],
    unlit: true,
  });
  const car = world.frameOf(node, "box");
  const rig: Rig = {
    position: { frame: world.root, anchor: car, offset: [0, -10, 0] },
    orientation: {
      kind: "aim",
      target: car,
      upFrame: world.root,
      up: [0, 0, 1],
    },
  };
  engine.cameras.setRig(view, rig);
  let worst = 0;
  let covered = Infinity;
  const ticks = 12;
  let last: Uint8ClampedArray | undefined;
  for (let k = 0; k < ticks; k++) {
    world.setTransform(
      node,
      translation(6_378_137 + 900 * k, 400 * k * Math.sin(k), -300 * k),
    );
    engine.renderFrame();
    lost();
    const pixels = await target.read();
    let n = 0;
    let sx = 0;
    let sy = 0;
    for (let y = 0; y < HEIGHT; y++) {
      for (let x = 0; x < WIDTH; x++) {
        const i = (y * WIDTH + x) * 4;
        if (Math.max(pixels[i]!, pixels[i + 1]!, pixels[i + 2]!) > 32) {
          n++;
          sx += x + 0.5;
          sy += y + 0.5;
        }
      }
    }
    covered = Math.min(covered, n);
    const off = n
      ? Math.hypot(sx / n - WIDTH / 2, sy / n - HEIGHT / 2)
      : Infinity;
    worst = Math.max(worst, off);
    last = pixels;
  }
  show("4 · a box on a moving node, followed", last!);
  engine.removeWorld(world);
  return {
    id: 4,
    name: "core-only: a rig follows a box on a moving node",
    measured: {
      "frames or time modules loaded": modules,
      "resource timing entries": loaded.entries,
      ticks,
      "box pixels (fewest)": covered,
      "centroid off centre (px, worst)": worst,
    },
    limit:
      "within 1 px of the centre each tick; nothing of /frames loaded (dev server, resource timing not full)",
    pass: modules === 0 && covered > 50 && worst <= 1,
  };
}

async function runRerooting(): Promise<RerootingResult> {
  const status = root.querySelector(".status")!;
  $("images").replaceChildren();
  $("results").replaceChildren();
  status.textContent = "checking…";
  const engine = await Engine.create();
  active = engine;
  let lostReason: string | undefined;
  void engine.gpu.device.lost.then((info) => {
    lostReason = info.message || info.reason;
  });
  const lost = () => {
    if (lostReason !== undefined) {
      throw new Error(`the GPU device was lost (${lostReason}); stopped`);
    }
    if (active !== engine) {
      throw new Error("stopped");
    }
  };
  const checks: Check[] = [];
  try {
    // 4 first: nothing of the frames module or the time library loaded yet.
    checks.push(await coreOnly(engine, lost));

    const { attachSky, createFrameCatalog, createFramesResolver } =
      await import("../src/frames/index.ts");
    const { Clock } = await import("../src/time/index.ts");
    const catalog = createFrameCatalog();
    const clock = new Clock({ time: T0 });
    const world: World = engine.createWorld();
    const earth = world.bodyAnchor(EARTH);
    const globe: Tileset3D = engine.addEllipsoid(world, {
      imagery: await testPattern(),
    });
    engine.cameras.setResolver(world, createFramesResolver(catalog));
    engine.cameras.setClock(world, clock);
    const detachSky = attachSky(engine, { catalog, clock });
    engine.setStarMap(STAR_MAP);
    const rigOn = (frame: FrameKey): Rig => ({
      position: { frame },
      orientation: { kind: "free" },
    });
    const gcrf = catalog.get("GCRF");
    const itrf = catalog.get("ITRF");
    const make = (frame: FrameKey, exposure = DAYLIGHT) => {
      const target = new OffscreenTarget(WIDTH, HEIGHT);
      const view = engine.addView({
        target,
        world,
        observer: { exposure },
      });
      engine.cameras.setRig(view, rigOn(frame));
      return { view, target };
    };
    const onGcrf = make(gcrf);
    const onItrf = make(itrf);
    // The sky alone (check 2) at night's exposure, its own view: a fixed
    // exposure is read when a view is made, and again only by the loop's
    // on-demand check, which renderFrame doesn't run.
    const night = make(gcrf, NIGHT);
    night.view.enabled = false;

    // The pose, Earth-fixed: on the sun's side at T0, 20° north of it,
    // looking at the Earth's centre.
    const sun = engine.sunDirection;
    const tilt = Math.tan((20 * Math.PI) / 180);
    const along = [sun[0]!, sun[1]!, sun[2]! + tilt];
    const length = Math.hypot(...along);
    const pose = new Camera();
    pose.position.set(along.map((v) => (v / length) * DISTANCE));
    pose.direction.set(along.map((v) => -v / length));
    pose.orient(Float64Array.of(0, 0, 1));
    const posed = (view: View) => {
      engine.cameras.update();
      view.setCameraFromAnchor(earth, pose);
    };
    /** The Moon's angle from the view's axis, degrees. */
    const moonAngle = (view: View) => {
      const camera = view.anchorCamera(earth);
      const moon = engine.moonPosition;
      if (!moon) {
        return 180;
      }
      const d = [0, 1, 2].map((i) => moon[i]! - camera.position[i]!);
      const cos =
        (d[0]! * camera.direction[0]! +
          d[1]! * camera.direction[1]! +
          d[2]! * camera.direction[2]!) /
        Math.hypot(...d);
      return (Math.acos(cos) * 180) / Math.PI;
    };
    const globeSettled = () =>
      globe.idle && !(globe.imagery?.busy ?? true) && globe.stats.loading === 0;

    // 1. ITRF and GCRF at the same instants.
    status.textContent = "1: ITRF and GCRF at three instants…";
    const one: Record<string, number> = {};
    let onePass = true;
    for (let k = 0; k < 3; k++) {
      clock.time = T0 + k * DAY;
      posed(onGcrf.view);
      posed(onItrf.view);
      await settle(engine, globeSettled);
      engine.renderFrame();
      lost();
      const a = await onItrf.target.read();
      const b = await onGcrf.target.read();
      const c = compare(a, b);
      one[`day ${k}: FLIP mean`] = c.mean;
      one[`day ${k}: FLIP p95`] = c.p95;
      one[`day ${k}: pixels differing`] = c.differing;
      // Not vacuous: the rigs place the Earth apart, and the globe shows.
      const placed = turn(
        onItrf.view.anchorPlacement(earth),
        onGcrf.view.anchorPlacement(earth),
      );
      const shown = drawn(b);
      one[`day ${k}: Moon from the view's axis (°)`] = moonAngle(onGcrf.view);
      one[`day ${k}: the Earth's anchor turned on GCRF (°)`] = placed;
      one[`day ${k}: globe pixels`] = shown;
      onePass &&= within(c) && placed > 1 && shown >= MIN_GLOBE_PIXELS;
      if (k === 0) {
        show("1 · rig on ITRF", a);
        show("1 · rig on GCRF", b);
      }
    }
    checks.push({
      id: 1,
      name: "ITRF and GCRF at the same instants",
      measured: one,
      limit: `FLIP mean ≤ ${TOLERANCE.mean}, p95 ≤ ${TOLERANCE.p95}; the Earth's anchor turned > 1°; ≥ ${MIN_GLOBE_PIXELS.toLocaleString("en-US")} globe pixels`,
      pass: onePass,
    });

    // 2. GCRF with the clock playing at 3,600×: the sky stays, the Earth turns.
    status.textContent = "2: GCRF with the clock playing…";
    onItrf.view.enabled = false;
    // 5i: nothing public says the star map has loaded; Sky's starsOn does.
    const starsOn = () =>
      (engine.raster.sky as unknown as { starsOn: number }).starsOn === 1;
    await settle(engine, starsOn, 30_000);
    clock.time = T0;
    clock.rate = RATE;
    clock.mode = "playing";
    clock.tick(0);
    posed(onGcrf.view);
    posed(night.view);
    const instant = async () => {
      globe.show = true;
      onGcrf.view.enabled = true;
      night.view.enabled = false;
      await settle(engine, globeSettled);
      engine.renderFrame();
      lost();
      const withGlobe = await onGcrf.target.read();
      globe.show = false;
      onGcrf.view.enabled = false;
      night.view.enabled = true;
      engine.renderFrame();
      lost();
      const sky = await night.target.read();
      return {
        withGlobe,
        sky,
        placement: onGcrf.view.anchorPlacement(earth),
        moon: moonAngle(onGcrf.view),
        seconds: clock.seconds,
      };
    };
    const first = await instant();
    clock.tick(PLAYED_MS);
    const second = await instant();
    globe.show = true;
    onGcrf.view.enabled = true;
    night.view.enabled = false;
    clock.mode = "paused";
    const sky = compare(first.sky, second.sky);
    const turning = compare(first.withGlobe, second.withGlobe);
    // The stars: bright pixels outside the Earth and its air.
    const camera = onGcrf.view.anchorCamera(earth);
    const tanHalf = Math.tan(camera.fovy(WIDTH / HEIGHT) / 2);
    const air = Math.asin((6_378_137 + 300_000) / DISTANCE);
    const disc = ((HEIGHT / 2) * Math.tan(air)) / tanHalf;
    let stars = 0;
    for (let y = 0; y < HEIGHT; y++) {
      for (let x = 0; x < WIDTH; x++) {
        const i = (y * WIDTH + x) * 4;
        const outside =
          Math.hypot(x + 0.5 - WIDTH / 2, y + 0.5 - HEIGHT / 2) > disc;
        const p = first.sky;
        if (outside && Math.max(p[i]!, p[i + 1]!, p[i + 2]!) >= 48) {
          stars++;
        }
      }
    }
    show("2 · the sky alone, first", first.sky);
    show("2 · the sky alone, two hours on", second.sky);
    show("2 · the globe, first", first.withGlobe);
    show("2 · the globe, two hours on", second.withGlobe);
    checks.push({
      id: 2,
      name: "GCRF, the clock at 3,600×: a still sky, a turning Earth",
      measured: {
        "scene seconds between the instants": second.seconds - first.seconds,
        "the Earth turned (°)": turn(first.placement, second.placement),
        "sky: FLIP mean": sky.mean,
        "sky: FLIP p95": sky.p95,
        "sky: pixels differing": sky.differing,
        "sky: star pixels outside the Earth": stars,
        "Moon from the view's axis (°, nearest)": Math.min(
          first.moon,
          second.moon,
        ),
        "globe: FLIP mean": turning.mean,
        "globe: pixels differing": turning.differing,
      },
      limit: `sky within FLIP mean ${TOLERANCE.mean}, p95 ${TOLERANCE.p95}, with stars; globe FLIP mean > ${TOLERANCE.mean}`,
      pass:
        second.seconds - first.seconds === (RATE * PLAYED_MS) / 1000 &&
        within(sky) &&
        stars >= 10 &&
        turning.mean > TOLERANCE.mean,
    });

    // 3. Re-rooting at a paused instant: GCRF to ITRF and back.
    status.textContent = "3: re-rooting at a paused instant…";
    // Three days and some on: the pose is Earth-fixed, so the same time of
    // day keeps it on the sunlit side.
    clock.time = T0 + 3 * DAY + 1_337_017;
    posed(onGcrf.view);
    await settle(engine, globeSettled);
    engine.renderFrame();
    lost();
    const before = await onGcrf.target.read();
    engine.cameras.setRig(onGcrf.view, rigOn(itrf));
    await settle(engine, globeSettled);
    engine.renderFrame();
    lost();
    const rooted = await onGcrf.target.read();
    const onItrfRoot = engine.cameras.root(onGcrf.view) === itrf;
    engine.cameras.setRig(onGcrf.view, rigOn(gcrf));
    await settle(engine, globeSettled);
    engine.renderFrame();
    lost();
    const back = await onGcrf.target.read();
    const toItrf = compare(before, rooted);
    const andBack = compare(before, back);
    show("3 · before re-rooting (GCRF)", before);
    show("3 · re-rooted to ITRF", rooted);
    checks.push({
      id: 3,
      name: "re-rooting at a paused instant",
      measured: {
        "GCRF → ITRF: FLIP max": toItrf.max,
        "GCRF → ITRF: FLIP mean": toItrf.mean,
        "GCRF → ITRF: pixels differing": toItrf.differing,
        "and back to GCRF: FLIP max": andBack.max,
        "and back to GCRF: FLIP mean": andBack.mean,
        "and back to GCRF: pixels differing": andBack.differing,
      },
      limit: `no pixel's FLIP above ${TOLERANCE.p95}`,
      pass:
        onItrfRoot &&
        engine.cameras.root(onGcrf.view) === gcrf &&
        toItrf.max <= TOLERANCE.p95 &&
        andBack.max <= TOLERANCE.p95,
    });
    detachSky();
  } finally {
    $("adapter").textContent = `Adapter: ${describe(engine)}`;
    stop(engine);
    checks.sort((a, b) => a.id - b.id);
    render(checks);
    const failed = checks.filter((c) => !c.pass);
    status.textContent = failed.length
      ? `FAIL: check ${failed.map((c) => c.id).join(", ")}`
      : `pass: all ${checks.length} checks`;
    if (failed.length) {
      // The benchmark runner (bench/run.mjs) fails a suite on console errors.
      console.error(
        `[rerooting] failed: ${failed.map((c) => `${c.id} ${c.name}`).join("; ")}`,
      );
    }
  }
  return {
    adapter: describe(engine),
    checks,
    pass: checks.length === 4 && checks.every((c) => c.pass),
  };
}

function describe(engine: Engine): string {
  const info = engine.gpu.adapter.info;
  return `${info.vendor} ${info.architecture} ${info.description}`;
}

function format(value: number): string {
  if (Number.isInteger(value)) {
    return value.toLocaleString("en-US");
  }
  return Math.abs(value) < 0.01 && value !== 0
    ? value.toExponential(2)
    : value.toFixed(3);
}

function render(checks: readonly Check[]): void {
  const cell = (text: string, className?: string) => {
    const td = document.createElement("td");
    td.textContent = text;
    if (className) {
      td.className = className;
    }
    return td;
  };
  const table = $("results");
  const head = document.createElement("tr");
  for (const title of ["check", "measured", "value", "passes when", ""]) {
    const th = document.createElement("th");
    th.textContent = title;
    head.append(th);
  }
  table.replaceChildren(head);
  for (const c of checks) {
    const entries = Object.entries(c.measured);
    entries.forEach(([key, value], i) => {
      const tr = document.createElement("tr");
      if (i === 0) {
        const name = cell(`${c.id}. ${c.name}`, "text");
        name.rowSpan = entries.length;
        tr.append(name);
      }
      tr.append(cell(key, "text"), cell(format(value)));
      if (i === 0) {
        const limit = cell(c.limit, "text");
        limit.rowSpan = entries.length;
        const verdict = cell(c.pass ? "pass" : "FAIL");
        verdict.rowSpan = entries.length;
        tr.append(limit, verdict);
      }
      table.append(tr);
    });
  }
}

export const harness: Harness = {
  mount(element) {
    root = element;
    root.innerHTML = TEMPLATE;
    return { run: runRerooting, dispose: () => stop(active) };
  },
};
