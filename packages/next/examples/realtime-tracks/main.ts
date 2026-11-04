import {
  CustomShader,
  Ellipsoid,
  Tracks,
  cartographic,
  eastNorthUpToFixedFrame,
  fromDegrees,
  mat4,
  vec3,
} from "../../src/index.ts";
import type { ExampleContext } from "../types.ts";

/**
 * Real-time tracks: vehicles from a synthetic 10 Hz feed, driving over
 * the terrain around Boulder, Colorado (the Flatirons to the west, the
 * plains to the east).
 *
 * Each feed update is one typed array, four numbers per vehicle (east,
 * north, height above the ground, heading). The GPU does the rest every
 * frame: it moves each vehicle between its last two samples, clamps it
 * to the terrain the view draws, and draws a Cesium truck within 500 m of
 * the camera and a symbol beyond. The symbols are shaped and colored by
 * a custom shader from per-vehicle values (an affiliation, as
 * MIL-STD-2525 frames show it), so changing one is a write of a few
 * bytes, not a new image.
 */

const SITE = { longitude: -105.25, latitude: 40.02, height: 1650 };
/** Vehicles drive within this many meters of the site, each way. */
const EXTENT = 10_000;
const COUNTS = [1_000, 10_000, 100_000];
const FEED_HZ = 10;
const SWITCH_DISTANCE = 500;
const TRUCK =
  "/specs-data/Models/glTF-2.0/CesiumMilkTruck/glTF-Draco/CesiumMilkTruck.gltf";

/** Affiliations: a frame shape (in the shader) and a fill (sRGB). */
const AFFILIATIONS = [
  { name: "Friend", fill: [128, 224, 255], share: 0.55 },
  { name: "Hostile", fill: [255, 128, 128], share: 0.15 },
  { name: "Neutral", fill: [170, 255, 170], share: 0.2 },
  { name: "Unknown", fill: [255, 255, 128], share: 0.1 },
];

/** The symbols: frame and fill from each vehicle's `symbol` and `fill`. */
const SYMBOLS = new CustomShader({
  label: "track symbols",
  instance: { symbol: "u32", fill: "vec3f" },
  fragment: `fn fragmentMain(fsInput: FragmentInput, material: ptr<function, MaterialOutput>) {
  // The quad from -1 to 1 each way.
  let p = fsInput.texCoord0 * 2.0 - 1.0;
  let a = abs(p);
  var d: f32; // below 0 inside the frame
  switch fsInput.instance.symbol {
    case 0u: { d = max(a.x - 0.95, a.y - 0.65); }       // friend: rectangle
    case 1u: { d = (a.x + a.y - 0.95) * 0.7071; }       // hostile: diamond
    case 2u: { d = max(a.x, a.y) - 0.75; }              // neutral: square
    default: { d = length(p) - 0.85; }                  // unknown: circle
  }
  (*material).alpha = select(0.0, 1.0, d < 0.0);
  (*material).baseColor = select(fsInput.instance.fill, vec3f(0.01), d > -0.12);
}`,
});

/** Where each vehicle drives: a Lissajous loop (center, sizes, rates, phases). */
const PATH_WORDS = 8;

function makePaths(count: number, random: () => number): Float32Array {
  const paths = new Float32Array(count * PATH_WORDS);
  for (let i = 0; i < count; i++) {
    const o = i * PATH_WORDS;
    const speed = 8 + random() * 17; // m/s
    const ax = 300 + random() * 2700;
    const ay = 300 + random() * 2700;
    const wx = speed / ax;
    paths[o] = (random() * 2 - 1) * (EXTENT - ax);
    paths[o + 1] = (random() * 2 - 1) * (EXTENT - ay);
    paths[o + 2] = ax;
    paths[o + 3] = ay;
    paths[o + 4] = wx;
    paths[o + 5] = wx * (0.5 + random() * 1.5);
    paths[o + 6] = random() * Math.PI * 2;
    paths[o + 7] = random() * Math.PI * 2;
  }
  return paths;
}

/** Vehicle `i` at time `t`: east, north (m) and heading (clockwise from north). */
function sample(paths: Float32Array, i: number, t: number, out: Float32Array) {
  const o = i * PATH_WORDS;
  const ax = paths[o + 2]!,
    ay = paths[o + 3]!,
    wx = paths[o + 4]!,
    wy = paths[o + 5]!;
  const x = wx * t + paths[o + 6]!;
  const y = wy * t + paths[o + 7]!;
  out[0] = paths[o]! + ax * Math.sin(x);
  out[1] = paths[o + 1]! + ay * Math.sin(y);
  out[2] = Math.atan2(ax * wx * Math.cos(x), ay * wy * Math.cos(y));
}

/** A seeded generator, so each count shows the same vehicles. */
function mulberry32(seed: number): () => number {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export async function run({ viewer, panel, signal }: ExampleContext) {
  const { engine, world } = viewer;
  const ellipsoid = Ellipsoid.WGS84;
  const origin = ellipsoid.cartographicToCartesian(
    fromDegrees(SITE.longitude, SITE.latitude, SITE.height),
    vec3.vec3(),
  );
  const frame = eastNorthUpToFixedFrame(origin, ellipsoid, mat4.mat4());
  const renderMode = engine.renderMode;
  // Vehicles move between feed updates: render every frame.
  engine.renderMode = "continuous";

  let tracks: Tracks | undefined;
  let paths: Float32Array = new Float32Array(0);
  let samples: Float32Array = new Float32Array(0);
  let count = 0;
  let building = 0;
  const startedAt = performance.now();
  const feedTime = () => (performance.now() - startedAt) / 1000;
  const timing = { feedMs: 0, engineMs: 0 };

  /** A collection of `n` vehicles, replacing the last. */
  async function build(n: number) {
    const token = ++building;
    // An asset is placed in one world, once: loaded for each collection.
    const asset = await engine.loadGltf(new URL(TRUCK, location.href).href);
    if (token !== building || signal.aborted) {
      return;
    }
    tracks?.destroy();
    tracks = new Tracks(engine, world, {
      capacity: n,
      origin,
      model: { asset },
      billboard: {
        // Smaller as they crowd: 18 px for 1,000, 14 for 10,000, 10 for 100,000.
        size: Math.round(30 - 4 * Math.log10(n)),
        anchor: "center",
        lift: 6,
        shader: SYMBOLS,
        streams: {
          stride: 4,
          layout: {
            symbol: { offset: 0, components: 1 },
            fill: { offset: 1, components: 3 },
          },
        },
        alphaCutoff: 0.5,
      },
      clamp: { halfExtent: EXTENT + 500, size: 4096, top: 1500, bottom: -800 },
      switchDistance: SWITCH_DISTANCE,
      delay: 1 / FEED_HZ,
    });
    const random = mulberry32(2026);
    paths = makePaths(n, random);
    samples = new Float32Array(n * 4);
    // Affiliations by share, as the symbols' values (fill in linear color).
    const symbols = new Float32Array(n * 4);
    const words = new Uint32Array(symbols.buffer);
    for (let i = 0; i < n; i++) {
      let r = random();
      let k = 0;
      while (k < AFFILIATIONS.length - 1 && r >= AFFILIATIONS[k]!.share) {
        r -= AFFILIATIONS[k]!.share;
        k++;
      }
      words[i * 4] = k;
      AFFILIATIONS[k]!.fill.forEach((c, j) => {
        symbols[i * 4 + 1 + j] = (c / 255) ** 2.2;
      });
    }
    tracks.setSymbols(0, symbols);
    tracks.count = count = n;
    feed();
  }

  /** One feed update: every vehicle's new sample, in one array. */
  function feed() {
    if (!tracks) {
      return;
    }
    const start = performance.now();
    const t = feedTime();
    const s = new Float32Array(3);
    for (let i = 0; i < count; i++) {
      sample(paths, i, t, s);
      samples[i * 4] = s[0]!;
      samples[i * 4 + 1] = s[1]!;
      samples[i * 4 + 2] = 0; // on the ground
      samples[i * 4 + 3] = s[2]!;
    }
    const engineStart = performance.now();
    tracks.update(0, samples);
    const end = performance.now();
    timing.feedMs = timing.feedMs * 0.8 + (engineStart - start) * 0.2;
    timing.engineMs = timing.engineMs * 0.8 + (end - engineStart) * 0.2;
  }
  const feedTimer = setInterval(feed, 1000 / FEED_HZ);

  /** The ground at `east`, `north` (m from the site), Earth-fixed. */
  function ground(east: number, north: number) {
    const p = vec3.vec3(
      frame[12]! + east * frame[0]! + north * frame[4]!,
      frame[13]! + east * frame[1]! + north * frame[5]!,
      frame[14]! + east * frame[2]! + north * frame[6]!,
    );
    const c = ellipsoid.cartesianToCartographic(p, cartographic())!;
    c.height =
      viewer.globe?.surfaceHeight(c.longitude, c.latitude) ?? SITE.height;
    return ellipsoid.cartographicToCartesian(c, p);
  }

  /** The vehicle the camera follows, until the camera is moved. */
  let follow: { vehicle: number; inputs: number } | undefined;
  const followed = new Float32Array(3);
  function chase() {
    if (!follow) {
      return;
    }
    if (viewer.controller.inputs !== follow.inputs || follow.vehicle >= count) {
      follow = undefined;
      return;
    }
    // Where the vehicle is shown: a feed interval behind the feed.
    sample(paths, follow.vehicle, feedTime() - 1 / FEED_HZ, followed);
    viewer.view.camera.lookAt(
      ground(followed[0]!, followed[1]!),
      followed[2]!,
      -0.3,
      40,
    );
  }

  function overview() {
    follow = undefined;
    viewer.zoomTo({ center: ground(0, 0), radius: 8000 });
  }

  // The panel: count, camera, readouts, legend.
  const el = <K extends keyof HTMLElementTagNameMap>(
    tag: K,
    props: Record<string, unknown> = {},
    ...children: Array<Node | string>
  ): HTMLElementTagNameMap[K] => {
    const e = Object.assign(document.createElement(tag), props);
    e.append(...children);
    return e;
  };
  const select = el(
    "select",
    { onchange: () => void build(Number(select.value)) },
    ...COUNTS.map((n) =>
      el(
        "option",
        { value: String(n), selected: n === 10_000 },
        n.toLocaleString(),
      ),
    ),
  );
  const readouts = el("dl");
  const readout = (term: string) => {
    const value = el("dd");
    readouts.append(el("dt", {}, term), value);
    return value;
  };
  const feedOut = readout("Feed");
  const frameOut = readout("Frame");
  const legend = el("ul", { className: "legend" });
  AFFILIATIONS.forEach((a, k) => {
    const shape = [
      '<rect x="1" y="4" width="16" height="10"/>',
      '<path d="M9 1 17 9 9 17 1 9Z"/>',
      '<rect x="3" y="3" width="12" height="12"/>',
      '<circle cx="9" cy="9" r="7.5"/>',
    ][k];
    const item = el("li");
    item.innerHTML = `<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><g fill="rgb(${a.fill})" stroke="#000" stroke-width="2">${shape}</g></svg>`;
    item.append(a.name);
    legend.append(item);
  });
  panel.append(
    el("label", {}, "Vehicles ", select),
    el(
      "div",
      { className: "buttons" },
      el(
        "button",
        {
          type: "button",
          onclick: () => {
            if (count) {
              follow = {
                vehicle: Math.floor(Math.random() * count),
                inputs: viewer.controller.inputs,
              };
            }
          },
        },
        "Follow a vehicle",
      ),
      el("button", { type: "button", onclick: overview }, "Overview"),
    ),
    readouts,
    legend,
    el(
      "p",
      {},
      `Trucks within ${SWITCH_DISTANCE} m of the camera, symbols beyond. Moving the camera stops following.`,
    ),
  );

  // Readouts twice a second.
  let frames = 0;
  let lastFrame = performance.now();
  let raf = requestAnimationFrame(function tick() {
    frames++;
    chase();
    raf = requestAnimationFrame(tick);
  });
  const readoutTimer = setInterval(() => {
    const now = performance.now();
    const fps = (frames * 1000) / (now - lastFrame);
    frames = 0;
    lastFrame = now;
    const ms = (x: number) => (Number.isFinite(x) ? x.toFixed(1) : "–");
    feedOut.textContent = `${count.toLocaleString()} at ${FEED_HZ} Hz: ${ms(timing.feedMs)} ms making samples, ${ms(timing.engineMs)} ms in the engine`;
    frameOut.textContent = `${fps.toFixed(0)} fps, CPU ${ms(engine.stats.cpuMs)} ms, GPU ${ms(engine.stats.gpuMs)} ms`;
  }, 500);

  overview();
  await build(Number(select.value));

  return () => {
    building++;
    clearInterval(feedTimer);
    clearInterval(readoutTimer);
    cancelAnimationFrame(raf);
    tracks?.destroy();
    engine.renderMode = renderMode;
    panel.replaceChildren();
  };
}
