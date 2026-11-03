// The real-time atmosphere (Hillaire 2020: transmittance and multiple-
// scattering tables, ray-marched sky) against the reference path tracer,
// both in cd/m²: probes by sun angle and altitude, and the whole sky side
// by side with their difference.
import "../lab/harness.css";
import type { Harness } from "../lab/harness.ts";
import {
  differenceMap,
  figure,
  meanLuminance,
  picture,
  type HdrPixels,
} from "../lab/hdr.ts";
import { GpuDevice } from "../src/gpu/GpuDevice.ts";
import { AtmosphereReference } from "../src/atmosphere/AtmosphereReference.ts";
import { RealtimeAtmosphere } from "../src/atmosphere/RealtimeAtmosphere.ts";
import { EARTH, directSunIlluminance } from "../src/atmosphere/model.ts";
import { Engine } from "../src/scene/Engine.ts";
import { OffscreenTarget, type HdrImage } from "../src/scene/View.ts";
import { Ellipsoid, fromDegrees } from "../src/math/ellipsoid.ts";
import { eastNorthUpToFixedFrame } from "../src/math/transforms.ts";
import * as v3 from "../src/math/vec3.ts";
import * as m4 from "../src/math/mat4.ts";

type V3 = [number, number, number];

const TEMPLATE = `
  <h1>Real-time sky vs reference</h1>
  <p>Hillaire's real-time atmosphere (a transmittance table, a multiple-
  scattering table and a ray-marched sky, at three wavelengths turned into
  luminance-correct sRGB) against the spectral path-traced reference, the
  same atmosphere and units (cd/m²).</p>
  <div id="status">…</div>
  <table id="probes"></table>
  <h2>Sky: reference · real-time · difference (±25%)</h2>
  <div id="images"></div>
  <h2>In the engine</h2>
  <p>The sky behind a view (<code>background: "atmosphere"</code>), at a
  daylight exposure (EV100 15) unless noted: looking toward the sun from the
  ground as it sets, and the planet from orbit. A grid of 16 × 9 pixels is
  checked against the tables' own march in the same directions: inside the
  atmosphere the sky comes from the per-view sky-view table, interpolated,
  so this measures the table's error.</p>
  <table id="engine"></table>
  <h2>Sunlight on the scene</h2>
  <p>The sun's illuminance on a surface facing it, which the opaque pass
  reads per pixel from the engine's sun-light table (by altitude and sun
  angle), against the CPU model's direct sunlight (81 wavelengths, double
  precision), in lux.</p>
  <table id="sunLight"></table>
  <div id="engineImages"></div>
`;

let root: HTMLElement;
const $ = (id: string) => root.querySelector<HTMLElement>(`#${id}`)!;
const deg = Math.PI / 180;
const sunAt = (zenith: number): V3 => [
  Math.sin(zenith * deg),
  0,
  Math.cos(zenith * deg),
];
const at = (altitude: number): V3 => [0, 0, EARTH.bottomRadius + altitude];
const view = (zenith: number, azimuth: number): V3 => [
  Math.sin(zenith * deg) * Math.cos(azimuth * deg),
  Math.sin(zenith * deg) * Math.sin(azimuth * deg),
  Math.cos(zenith * deg),
];
const luminance = (rgb: ArrayLike<number>, i: number, stride = 3) =>
  0.2126 * rgb[i * stride]! +
  0.7152 * rgb[i * stride + 1]! +
  0.0722 * rgb[i * stride + 2]!;

function fisheye(size: number) {
  const directions: number[] = [];
  const inside: boolean[] = [];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = ((x + 0.5) / size) * 2 - 1;
      const v = 1 - ((y + 0.5) / size) * 2;
      const r = Math.hypot(u, v);
      inside.push(r <= 1);
      const zenith = Math.min(r, 1) * (Math.PI / 2);
      const azimuth = Math.atan2(v, u);
      directions.push(
        Math.sin(zenith) * Math.cos(azimuth),
        Math.sin(zenith) * Math.sin(azimuth),
        Math.cos(zenith),
      );
    }
  }
  return { directions, inside };
}

async function runSky() {
  const gpu = await GpuDevice.create();
  const reference = await AtmosphereReference.create(gpu.device);
  const realtime = await RealtimeAtmosphere.create(gpu.device);
  const status = $("status");
  const results: Record<string, unknown> = {};

  // 1. Probes: zenith and near the horizon, by sun angle and altitude.
  status.textContent = "probes…";
  const probes: Array<Record<string, string | number>> = [];
  const directions: Array<[string, V3]> = [
    ["zenith", view(0, 0)],
    ["45° up, toward the sun", view(45, 0)],
    ["85°, toward the sun", view(85, 0)],
    ["85°, away", view(85, 180)],
    ["85°, side", view(85, 90)],
  ];
  let worst = 0;
  for (const [altitude, sunZenith] of [
    [1, 0],
    [1, 45],
    [1, 80],
    [1, 89],
    [1, 93],
    [10_000, 45],
  ] as Array<[number, number]>) {
    const sun = sunAt(sunZenith);
    const flat = directions.flatMap(([, d]) => d);
    // The reference: 256 independent copies of each direction.
    const copies = 128;
    const repeated: number[] = [];
    for (let c = 0; c < copies; c++) {
      repeated.push(...flat);
    }
    const ref = await reference.radiance({
      observer: at(altitude),
      sun,
      directions: repeated,
      samples: 256,
    });
    const rt = await realtime.radiance(at(altitude), sun, flat);
    for (const [i, [name]] of directions.entries()) {
      let sum = 0;
      for (let c = 0; c < copies; c++) {
        sum += ref.luminance[c * directions.length + i]!;
      }
      const refY = sum / copies;
      const rtY = luminance(rt, i);
      const error = (rtY - refY) / refY;
      if (refY > 1) {
        worst = Math.max(worst, Math.abs(error));
      }
      probes.push({
        altitude: `${altitude} m`,
        sun: `${sunZenith}°`,
        view: name,
        reference: Number(refY.toFixed(refY < 10 ? 2 : 0)),
        realtime: Number(rtY.toFixed(rtY < 10 ? 2 : 0)),
        difference: `${(error * 100).toFixed(1)}%`,
      });
    }
  }
  results.probes = probes;
  results.worstDifference = Number((worst * 100).toFixed(1));
  $("probes").innerHTML = table(probes);

  // 2. The whole sky.
  status.textContent = "pictures…";
  const size = 64;
  const dome = fisheye(size);
  const domeMeans: Record<string, unknown> = {};
  for (const sunZenith of [30, 80, 89, 93]) {
    const sun = sunAt(sunZenith);
    const ref = await reference.radiance({
      observer: at(1),
      sun,
      directions: dome.directions,
      samples: 1024,
    });
    const rt = await realtime.radiance(at(1), sun, dome.directions);
    const mask = (i: number) => dome.inside[i]!;
    const a: HdrPixels = {
      width: size,
      height: size,
      data: ref.rgb,
      stride: 3,
      mask,
    };
    const b: HdrPixels = {
      width: size,
      height: size,
      data: rt,
      stride: 3,
      mask,
    };
    const exposure = 0.18 / meanLuminance(a);
    const refMean = meanLuminance(a);
    const rtMean = meanLuminance(b);
    domeMeans[`sun ${sunZenith}°`] = {
      reference: Number(refMean.toFixed(1)),
      realtime: Number(rtMean.toFixed(1)),
      difference: `${(((rtMean - refMean) / refMean) * 100).toFixed(1)}%`,
    };
    $("images").append(
      figure(
        `sun ${90 - sunZenith}° above the horizon · mean sky ${Math.round(refMean)} (reference) vs ${Math.round(rtMean)} cd/m²`,
        picture(a, exposure, 3),
        picture(b, exposure, 3),
        differenceMap(a, b, 0.25, 3),
      ),
    );
  }
  results.domes = domeMeans;
  reference.destroy();

  status.textContent = "in the engine…";
  results.engine = await inTheEngine(realtime);
  status.textContent = "done";
  realtime.destroy();
  gpu.destroy();
  return results;
}

/**
 * The engine's sky: pictures from a few places and sun angles, the center
 * pixel against `realtime` (the same tables, on another device), and the
 * pass's cost.
 */
async function inTheEngine(realtime: RealtimeAtmosphere) {
  const width = 480;
  const height = 270;
  const engine = await Engine.create();
  const world = engine.createWorld({
    maxDraws: 16,
    vertexBytes: 1 << 20,
    indexBytes: 1 << 20,
  });
  const view = engine.addView({
    target: new OffscreenTarget(width, height),
    world,
  });
  const camera = view.camera;
  camera.fov = (70 * Math.PI) / 180;
  const ground = Ellipsoid.WGS84.cartographicToCartesian(
    fromDegrees(-105, 40, 0),
    v3.vec3(),
  );
  const enu = eastNorthUpToFixedFrame(ground, Ellipsoid.WGS84, m4.mat4());
  const axis = (i: number) => v3.vec3(enu[i]!, enu[i + 1]!, enu[i + 2]!);
  const [east, north, up] = [axis(0), axis(4), axis(8)];
  const local = (e: number, n: number, u: number) =>
    v3.normalize(
      v3.vec3(),
      Float64Array.from(
        [0, 1, 2].map((k) => east[k]! * e + north[k]! * n + up[k]! * u),
      ),
    );
  /** Sun to the west at `elevation` degrees. */
  const setSun = (elevation: number) =>
    v3.copy(
      engine.sunDirection,
      local(-Math.cos(elevation * deg), 0, Math.sin(elevation * deg)),
    );
  /** At `altitude` meters, looking west, `pitch` degrees up. */
  const lookWest = (altitude: number, pitch: number) => {
    v3.scaleAndAdd(camera.position, ground, up, altitude);
    v3.copy(
      camera.direction,
      local(-Math.cos(pitch * deg), 0, Math.sin(pitch * deg)),
    );
    camera.orient(up);
  };
  const render = async (): Promise<HdrImage> => {
    const image = view.readHdr();
    engine.renderFrame();
    return image;
  };
  const rows: Array<Record<string, string | number>> = [];
  // Name, EV100, the sun's elevation, the camera's altitude and pitch.
  const shots: Array<[string, number, number, number, number]> = [
    ["noon", 15, 60, 2, 10],
    ["sun 20° up", 15, 20, 2, 5],
    ["sun 5° up", 14, 5, 2, 3],
    ["sun on the horizon", 12, 0, 2, 3],
    ["twilight, sun 4° down", 8, -4, 2, 3],
    ["10 km up, sun 10° up", 15, 10, 10_000, -2],
    ["orbit, 2,000 km", 15, 30, 2_000_000, -60],
  ];
  for (const [name, ev100, sun, altitude, pitch] of shots) {
    setSun(sun);
    lookWest(altitude, pitch);
    view.exposure = { ev100 };
    const image = await render();
    // A grid of pixels against the tables' own per-direction march (what
    // the table interpolates), from the same point on their sphere (the
    // camera along the ellipsoid's normal at its height), away from the
    // sun's disk.
    const c = Ellipsoid.WGS84.cartesianToCartographic(camera.position, {
      longitude: 0,
      latitude: 0,
      height: 0,
    })!;
    const normal = Ellipsoid.WGS84.geodeticSurfaceNormal(
      camera.position,
      v3.vec3(),
    )!;
    const r = EARTH.bottomRadius + Math.max(c.height, 1);
    const aspect = width / height;
    const tanY = Math.tan(camera.fovy(aspect) / 2);
    const pixels: number[] = [];
    // Above the horizon (the bare planet's ground, below, is covered by
    // the globe in a scene; within a pixel of the horizon its radiance
    // changes faster than the table resolves).
    const sky: boolean[] = [];
    const directions: number[] = [];
    for (let gy = 0; gy < 9; gy++) {
      for (let gx = 0; gx < 16; gx++) {
        const px = Math.floor(((gx + 0.5) / 16) * width);
        const py = Math.floor(((gy + 0.5) / 9) * height);
        const nx = ((px + 0.5) / width) * 2 - 1;
        const ny = 1 - ((py + 0.5) / height) * 2;
        const d = v3.normalize(
          v3.vec3(),
          Float64Array.from(
            [0, 1, 2].map(
              (k) =>
                camera.direction[k]! +
                camera.right[k]! * nx * tanY * aspect +
                camera.up[k]! * ny * tanY,
            ),
          ),
        );
        if (v3.dot(d, engine.sunDirection) > Math.cos(2 * deg)) {
          continue;
        }
        pixels.push(py * width + px);
        sky.push(v3.dot(d, normal) > 0);
        directions.push(d[0]!, d[1]!, d[2]!);
      }
    }
    const probe = await realtime.radiance(
      [normal[0]! * r, normal[1]! * r, normal[2]! * r],
      [
        engine.sunDirection[0]!,
        engine.sunDirection[1]!,
        engine.sunDirection[2]!,
      ],
      directions,
      { steps: 32 },
    );
    const errorsOf = (above: boolean) =>
      pixels
        .map((pixel, i) => {
          if (sky[i] !== above) {
            return -1;
          }
          const probeY = luminance(probe, i);
          return Math.abs(luminance(image.data, pixel, 4) - probeY) / probeY;
        })
        .filter((e) => e >= 0)
        .sort((a, b) => a - b);
    const percent = (x: number | undefined) =>
      x === undefined ? "–" : `${(x * 100).toFixed(1)}%`;
    const above = errorsOf(true);
    const below = errorsOf(false);
    rows.push({
      view: name,
      EV100: ev100,
      "sky pixels": above.length,
      "sky: median |difference|": percent(above[above.length >> 1]),
      "95th percentile": percent(above[Math.floor(above.length * 0.95)]),
      worst: percent(above[above.length - 1]),
      "ground pixels": below.length,
      "ground: median": percent(below[below.length >> 1]),
      "ground: worst": percent(below[below.length - 1]),
    });
    const scale = 1 / (1.2 * 2 ** ev100);
    $("engineImages").append(
      figure(
        `${name} · EV100 ${ev100}`,
        picture({ width, height, data: image.data, stride: 4 }, scale, 1),
      ),
    );
  }
  $("engine").innerHTML = table(rows);

  // Cost: the same frame with and without the sky.
  lookWest(2, 10);
  setSun(30);
  const cost: Record<string, number> = {};
  for (const background of ["color", "atmosphere"] as const) {
    view.background = background;
    for (let i = 0; i < 60; i++) {
      engine.renderFrame();
      await engine.gpu.device.queue.onSubmittedWorkDone();
    }
    cost[background] = Number(engine.stats.gpuMs.toFixed(3));
  }
  const skyMs = cost.atmosphere! - cost.color!;
  $("engine").insertAdjacentHTML(
    "afterend",
    `<p>GPU per frame at ${width} × ${height}: ${cost.color} ms without the sky, ${cost.atmosphere} ms with it (${skyMs.toFixed(3)} ms; ${((skyMs / (width * height)) * 1e6).toFixed(2)} ns per pixel).</p>`,
  );
  const sunLight = await checkSunLight(engine);
  engine.destroy();
  return { rows, gpuMs: cost, sunLight };
}

/** The engine's sun-light table against the CPU model, at its own texels. */
async function checkSunLight(engine: Engine) {
  const device = engine.gpu.device;
  const [width, height] = [256, 64];
  const buffer = device.createBuffer({
    size: width * height * 8,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
  });
  const encoder = device.createCommandEncoder();
  encoder.copyTextureToBuffer(
    { texture: engine.sky.sunLight },
    { buffer, bytesPerRow: width * 8 },
    [width, height],
  );
  device.queue.submit([encoder.finish()]);
  await buffer.mapAsync(GPUMapMode.READ);
  const halves = new Uint16Array(buffer.getMappedRange().slice(0));
  buffer.destroy();
  // The table's mapping (sky.wgsl sunLightFragment), texel to (mu, r).
  const unit = (i: number, size: number) => i / (size - 1);
  const rows: Array<Record<string, string | number>> = [];
  let worst = 0;
  for (const altitude of [0, 2_000, 10_000]) {
    const y = Math.round(
      Math.sqrt(altitude / (EARTH.topRadius - EARTH.bottomRadius)) *
        (height - 1),
    );
    const v = unit(y, height);
    const r =
      EARTH.bottomRadius + (EARTH.topRadius - EARTH.bottomRadius) * v * v;
    for (const elevation of [90, 45, 20, 10, 5, 2]) {
      const target = Math.sin(elevation * deg);
      const x = Math.round((0.5 + 0.5 * Math.sqrt(target)) * (width - 1));
      const s = unit(x, width) * 2 - 1;
      const mu = Math.sign(s) * s * s;
      const i = (y * width + x) * 4;
      const rgb = [0, 1, 2].map((k) => halfToFloat(halves[i + k]!) * 1e5);
      const engineY = luminance(rgb, 0);
      const cpu = directSunIlluminance(
        EARTH,
        [0, 0, r],
        [Math.sqrt(1 - mu * mu), 0, mu],
      ).y;
      const error = (engineY - cpu) / cpu;
      worst = Math.max(worst, Math.abs(error));
      rows.push({
        altitude: `${(r - EARTH.bottomRadius).toFixed(0)} m`,
        "sun elevation": `${((Math.asin(mu) * 180) / Math.PI).toFixed(1)}°`,
        engine: Math.round(engineY),
        "CPU model": Math.round(cpu),
        difference: `${(error * 100).toFixed(1)}%`,
        color: rgb.map((c) => (c / engineY).toFixed(2)).join(" "),
      });
    }
  }
  $("sunLight").innerHTML = table(rows);
  return { rows, worst: Number((worst * 100).toFixed(2)) };
}

function halfToFloat(h: number): number {
  const exponent = (h >> 10) & 0x1f;
  const fraction = h & 0x3ff;
  const sign = h & 0x8000 ? -1 : 1;
  if (exponent === 0) {
    return sign * 2 ** -14 * (fraction / 1024);
  }
  if (exponent === 31) {
    return fraction ? Number.NaN : sign * Infinity;
  }
  return sign * 2 ** (exponent - 15) * (1 + fraction / 1024);
}

function table(rows: Array<Record<string, number | string>>): string {
  const keys = Object.keys(rows[0] ?? {});
  return `<tr>${keys.map((k) => `<th>${k}</th>`).join("")}</tr>${rows
    .map((r) => `<tr>${keys.map((k) => `<td>${r[k]}</td>`).join("")}</tr>`)
    .join("")}`;
}

export const harness: Harness = {
  mount(element) {
    root = element;
    root.innerHTML = TEMPLATE;
    return { run: runSky };
  },
};
