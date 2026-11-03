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
import {
  OffscreenTarget,
  type HdrImage,
  type View,
} from "../src/scene/View.ts";
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
  <h2>The sky's light on the scene</h2>
  <p>Each view's environment comes from its atmosphere (rebuilt when the
  sun or the camera's altitude moves). Its irradiance on a horizontal
  surface, from the irradiance cube the opaque pass reads (and from SH9, as
  1.x lights), against the cosine-weighted integral of the sky's radiance
  over the hemisphere:</p>
  <table id="environment"></table>
  <h2>Aerial perspective</h2>
  <p>The air between the camera and the scene. Near the ground, the view's
  froxel volume (32 × 32 directions × 128 distances, quadratic out to the
  atmosphere's far edge, the same for every ray): its in-scattered light at
  a spread of froxels against the tables' own march along the same ray to
  the same distance. From higher up (above 5 km) each vertex marches its own
  ray instead; between 2 and 5 km the two blend.</p>
  <table id="aerial"></table>
  <div id="aerialImages"></div>
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
  // The tables compared with the engine's: the same air (its visibility).
  realtime.setHaze(engine.visibility, engine.aerosol);
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
  const environments: Array<Record<string, string | number>> = [];
  const aerials: Array<Record<string, string | number>> = [];
  /**
   * The aerial-perspective volume (its in-scattered light) at a spread of
   * froxels against the tables' own march along the same direction to the
   * same distance (64 even steps; the volume's are 2 per interval between
   * its 128 slices; froxels past the ground skipped).
   */
  const checkAerial = async (name: string, normal: Float64Array, r: number) => {
    // From high up the volume isn't built: marched per vertex (checked
    // against it below, the pictures).
    if (r - EARTH.bottomRadius > 5000) {
      return {
        view: name,
        froxels: 0,
        "brightest in-scatter (cd/m²)": "–",
        "median |difference|": "marched per vertex",
        worst: "–",
      };
    }
    const device = engine.gpu.device;
    const n = 32;
    const slices = 128;
    const buffer = device.createBuffer({
      size: n * n * slices * 8,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });
    const encoder = device.createCommandEncoder();
    encoder.copyTextureToBuffer(
      { texture: engine.sky.aerialInscatter },
      { buffer, bytesPerRow: n * 8, rowsPerImage: n },
      [n, n, slices],
    );
    device.queue.submit([encoder.finish()]);
    await buffer.mapAsync(GPUMapMode.READ);
    const halves = new Uint16Array(buffer.getMappedRange().slice(0));
    buffer.destroy();
    const top = EARTH.topRadius;
    const bottomRadius = EARTH.bottomRadius;
    const start = Math.max(0, r - top);
    const end =
      Math.sqrt(Math.max(0, r * r - bottomRadius * bottomRadius)) +
      Math.sqrt(top * top - bottomRadius * bottomRadius);
    const aspect = width / height;
    const tanY = Math.tan(camera.fovy(aspect) / 2);
    const observer = [normal[0]! * r, normal[1]! * r, normal[2]! * r];
    const sun = [
      engine.sunDirection[0]!,
      engine.sunDirection[1]!,
      engine.sunDirection[2]!,
    ];
    const errors: number[] = [];
    let largest = 0;
    for (const [x, y] of [
      [4, 4],
      [16, 4],
      [28, 10],
      [16, 16],
      [4, 26],
      [28, 28],
    ]) {
      const nx = ((x! + 0.5) / n) * 2 - 1;
      const ny = 1 - ((y! + 0.5) / n) * 2;
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
      // Where the ray meets the planet: slices past it hold the air beyond
      // (the volume goes through), the march stops there; compared before.
      const mu =
        (observer[0]! * d[0]! + observer[1]! * d[1]! + observer[2]! * d[2]!) /
        r;
      const bottom = EARTH.bottomRadius;
      const disc = r * r * (mu * mu - 1) + bottom * bottom;
      const ground =
        mu < 0 && disc >= 0
          ? -r * mu - Math.sqrt(disc)
          : Number.POSITIVE_INFINITY;
      for (const slice of [8, 32, 64, 96, 127]) {
        const w = (slice + 0.5) / slices;
        const distance = start + (end - start) * w * w;
        if (distance >= ground * 0.999) {
          continue;
        }
        const probe = await realtime.radiance(
          observer as never,
          sun as never,
          [...d],
          {
            steps: 64,
            maxLength: distance,
          },
        );
        const i = ((slice * n + y!) * n + x!) * 4;
        // The volume is pre-exposed (the view's exposure).
        const rgb = [0, 1, 2].map(
          (k) => halfToFloat(halves[i + k]!) / view.exposureScale,
        );
        const engineY = luminance(rgb, 0);
        const probeY = luminance(probe, 0);
        largest = Math.max(largest, probeY);
        if (probeY > 1) {
          errors.push(Math.abs(engineY - probeY) / probeY);
        }
      }
    }
    errors.sort((a, b) => a - b);
    return {
      view: name,
      froxels: errors.length,
      "brightest in-scatter (cd/m²)": Math.round(largest),
      "median |difference|": `${((errors[errors.length >> 1] ?? 0) * 100).toFixed(2)}%`,
      worst: `${((errors[errors.length - 1] ?? 0) * 100).toFixed(2)}%`,
    };
  };
  /**
   * The environment's diffuse light on a horizontal surface (its SH, as the
   * opaque pass evaluates it) against the cosine-weighted integral of the
   * tables' own sky radiance over the upper hemisphere (32 × 32 stratified
   * directions, Malley's method), in lux.
   */
  const skyIrradiance = async (
    name: string,
    normal: Float64Array,
    r: number,
    east: Float64Array,
    north: Float64Array,
    up: Float64Array,
  ) => {
    const sh = await engine.environment.readSphericalHarmonics();
    const cube = (await engine.environment.readIrradianceUp()).map(
      (c) => c * Math.PI,
    );
    // irradiance(n) is E/π; up is (0, 1, 0) in the environment frame.
    const shE = [0, 1, 2].map(
      (k) => Math.PI * (sh[0]![k]! + sh[1]![k]! - sh[6]![k]! - sh[8]![k]!),
    );
    const n = 32;
    const directions: number[] = [];
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const radius = Math.sqrt((i + 0.5) / n);
        const phi = (2 * Math.PI * (j + 0.5)) / n;
        const x = radius * Math.cos(phi);
        const y = radius * Math.sin(phi);
        const z = Math.sqrt(Math.max(0, 1 - radius * radius));
        directions.push(
          ...[0, 1, 2].map((k) => east[k]! * x + north[k]! * y + up[k]! * z),
        );
      }
    }
    const sky = await realtime.radiance(
      [normal[0]! * r, normal[1]! * r, normal[2]! * r],
      [
        engine.sunDirection[0]!,
        engine.sunDirection[1]!,
        engine.sunDirection[2]!,
      ],
      directions,
      { steps: 32 },
    );
    let sum = 0;
    for (let i = 0; i < n * n; i++) {
      sum += luminance(sky, i);
    }
    const integral = (Math.PI * sum) / (n * n);
    const shY = luminance(shE, 0);
    const cubeY = luminance(cube, 0);
    const versus = (y: number) =>
      integral < 1e-3
        ? `${y.toFixed(1)} lux`
        : `${(((y - integral) / integral) * 100).toFixed(1)}%`;
    return {
      view: name,
      "integral (lux)": Math.round(integral),
      "irradiance cube (lux)": Math.round(cubeY),
      difference: versus(cubeY),
      "SH9 (lux)": Math.round(shY),
      "SH9 difference": versus(shY),
      color: cube.map((c) => (c / Math.max(cubeY, 1e-9)).toFixed(2)).join(" "),
    };
  };
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
    // camera along the ellipsoid's normal at its height; from above the
    // atmosphere, where the engine marches with the ellipsoid scaled to
    // the ground sphere, the same scaling), away from the sun's disk.
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
    const fromSpace = r >= EARTH.topRadius - 1000;
    const shape = Ellipsoid.WGS84.radii.map((radius) =>
      fromSpace ? EARTH.bottomRadius / radius : 1,
    );
    const shaped = (v: ArrayLike<number>): number[] => {
      const out = [0, 1, 2].map((k) => v[k]! * shape[k]!);
      const length = Math.hypot(...out);
      return out.map((x) => x / length);
    };
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
        directions.push(...shaped(d));
      }
    }
    const observer: V3 = fromSpace
      ? [
          camera.position[0]! * shape[0]!,
          camera.position[1]! * shape[1]!,
          camera.position[2]! * shape[2]!,
        ]
      : [normal[0]! * r, normal[1]! * r, normal[2]! * r];
    const probe = await realtime.radiance(
      observer,
      shaped(engine.sunDirection) as V3,
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
          // Nearly black pixels (the bare planet's night side) say little.
          if (probeY < 1e-3) {
            return -1;
          }
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
    environments.push(await skyIrradiance(name, normal, r, east, north, up));
    aerials.push(await checkAerial(name, normal, r));
    const scale = 1 / (1.2 * 2 ** ev100);
    $("engineImages").append(
      figure(
        `${name} · EV100 ${ev100}`,
        picture({ width, height, data: image.data, stride: 4 }, scale, 1),
      ),
    );
  }
  $("engine").innerHTML = table(rows);
  $("environment").innerHTML = table(environments);
  $("aerial").innerHTML = table(aerials);

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
  await aerialPictures(engine, ground, east, north, up, setSun);
  engine.destroy();
  return { rows, environments, aerials, gpuMs: cost, sunLight };
}

/**
 * The bare globe (the ellipsoid, untextured) with aerial perspective off and
 * on, side by side, from a few heights.
 */
async function aerialPictures(
  engine: Engine,
  ground: Float64Array,
  east: Float64Array,
  north: Float64Array,
  up: Float64Array,
  setSun: (elevation: number) => void,
) {
  const width = 480;
  const height = 270;
  const world = engine.createWorld({});
  engine.addEllipsoid(world);
  const views = [false, true].map((aerialPerspective) =>
    engine.addView({
      target: new OffscreenTarget(width, height),
      world,
      aerialPerspective,
    }),
  );
  const shots: Array<[string, number, number, number, number]> = [
    ["10 km up, sun 20° up, looking toward it", 10_000, -8, 20, 0],
    ["1 km up, sun 20° behind", 1_000, -3, 20, 180],
    ["orbit, 400 km, sun 30° up", 400_000, -30, 30, 90],
  ];
  for (const [name, altitude, pitch, sun, azimuth] of shots) {
    setSun(sun);
    for (const view of views) {
      const camera = view.camera;
      camera.fov = (70 * Math.PI) / 180;
      v3.scaleAndAdd(camera.position, ground, up, altitude);
      // Toward the west, turned by `azimuth` degrees.
      const a = (azimuth * Math.PI) / 180;
      const p = (pitch * Math.PI) / 180;
      const h = [0, 1, 2].map(
        (k) => -east[k]! * Math.cos(a) + north[k]! * Math.sin(a),
      );
      v3.normalize(
        camera.direction,
        Float64Array.from(
          [0, 1, 2].map((k) => h[k]! * Math.cos(p) + up[k]! * Math.sin(p)),
        ),
      );
      camera.orient(up);
    }
    // Content streams in: render until the globe settles.
    for (let i = 0; i < 60; i++) {
      engine.renderFrame();
      await new Promise((resolve) => setTimeout(resolve, 30));
    }
    const images = await Promise.all(
      views.map((view) => {
        const image = view.readHdr();
        engine.renderFrame();
        return image;
      }),
    );
    const scale = 1 / (1.2 * 2 ** 15);
    if (altitude === 1_000) {
      await checkMarch(engine, views[1]!);
    }
    $("aerialImages").append(
      figure(
        `${name}: without · with aerial perspective (EV100 15)`,
        ...images.map((image) =>
          picture({ width, height, data: image.data, stride: 4 }, scale, 1),
        ),
      ),
    );
  }
  views.forEach((view) => engine.removeView(view));
}

/**
 * Aerial perspective marched per vertex against the volume, both forced on
 * the same frame from 1 km up, where both hold: the ground's pixels.
 */
async function checkMarch(engine: Engine, view: View) {
  const render = async (march: number) => {
    engine.sky.marchOverride = march;
    engine.renderFrame();
    const image = view.readHdr();
    engine.renderFrame();
    return image;
  };
  const volume = await render(0);
  const marched = await render(1);
  engine.sky.marchOverride = undefined;
  const differences: number[] = [];
  for (let i = 0; i < volume.data.length; i += 4) {
    const a = luminance(volume.data, i / 4, 4);
    const b = luminance(marched.data, i / 4, 4);
    // The ground: the sky's pixels are the same in both.
    if (a > 1 && a !== b) {
      differences.push(Math.abs(b - a) / a);
    }
  }
  differences.sort((a, b) => a - b);
  const percent = (x: number | undefined) => `${((x ?? 0) * 100).toFixed(2)}%`;
  $("aerialImages").insertAdjacentHTML(
    "beforebegin",
    `<p>Marched per vertex against the volume, both forced from 1 km up: ${differences.length} ground pixels, median |difference| ${percent(differences[differences.length >> 1])}, 95th percentile ${percent(differences[Math.floor(differences.length * 0.95)])}.</p>`,
  );
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
        engine.sky.atmosphere.effectiveParameters,
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
