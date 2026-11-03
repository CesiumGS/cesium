// The reference atmosphere (plan §4.2), checked and measured:
// 1. the GPU path tracer limited to single scattering against the CPU's
//    deterministic integral (same model, same units): they must agree;
// 2. the full reference (multiple scattering, ozone, the ground's bounce):
//    zenith and horizon luminance, diffuse horizontal illuminance and the
//    share of multiple scattering, by sun angle and altitude;
// 3. fisheye images of the sky, for looking at.
import "../lab/harness.css";
import type { Harness } from "../lab/harness.ts";
import { meanLuminance, picture, type HdrPixels } from "../lab/hdr.ts";
import { GpuDevice } from "../src/gpu/GpuDevice.ts";
import { AtmosphereReference } from "../src/atmosphere/AtmosphereReference.ts";
import {
  EARTH,
  directSunIlluminance,
  singleScattering,
} from "../src/atmosphere/model.ts";

type V3 = [number, number, number];

const TEMPLATE = `
  <h1>Reference atmosphere</h1>
  <p>Spectral Monte Carlo path tracing through Earth's atmosphere (Rayleigh,
  aerosols, ozone, a Lambertian ground): the oracle for 2.0's real-time sky
  and environment lighting. Single scattering is checked against a
  deterministic integral; the full result is measured in physical units.</p>
  <div id="status">…</div>
  <h2>Single scattering: GPU path tracer vs CPU integral</h2>
  <p>z: the difference in standard errors of the path tracer's estimate
  (256 independent estimates per case); |z| &lt; 3 everywhere passes.</p>
  <table id="single"></table>
  <h2>Full reference</h2>
  <table id="full"></table>
  <h2>Sky</h2>
  <p>Per sun angle: the whole sky as a fisheye (zenith at the center, the sun
  to the right) and the horizon as a panorama (the sun in the middle, the
  ground below). The sun's disk itself is not drawn.</p>
  <div id="images" style="display:flex;gap:12px;flex-wrap:wrap"></div>
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
/** A view direction from zenith angle and azimuth (0: toward the sun). */
const view = (zenith: number, azimuth: number): V3 => [
  Math.sin(zenith * deg) * Math.cos(azimuth * deg),
  Math.sin(zenith * deg) * Math.sin(azimuth * deg),
  Math.cos(zenith * deg),
];

async function runAtmosphere() {
  const gpu = await GpuDevice.create();
  const reference = await AtmosphereReference.create(gpu.device);
  const results: Record<string, unknown> = {};
  const status = $("status");

  // 1. Single scattering, ground observer, no ground reflection.
  status.textContent = "single scattering…";
  const single: Array<Record<string, number | string>> = [];
  const cases: Array<[string, number, V3]> = [
    ["zenith, sun 45°", 45, view(0, 0)],
    ["60° toward the sun, sun 45°", 45, view(60, 0)],
    ["60° away from the sun, sun 45°", 45, view(60, 180)],
    ["horizon (85°) toward the sun, sun 80°", 80, view(85, 0)],
    ["horizon (85°) at right angles, sun 80°", 80, view(85, 90)],
    ["zenith, sun 0°", 0, view(0, 0)],
  ];
  let worst = 0;
  for (const [name, sunZenith, direction] of cases) {
    const sun = sunAt(sunZenith);
    const gpuResult = await estimate(reference, {
      observer: at(1),
      sun,
      directions: direction,
      samples: 512,
      maxScattering: 1,
      groundReflection: false,
    });
    const cpu = singleScattering(EARTH, at(1), direction, sun, {
      steps: 800,
      sunSteps: 200,
      lambdaStep: 5,
    });
    const z = (gpuResult.y - cpu.y) / gpuResult.yError;
    worst = Math.max(worst, Math.abs(z));
    single.push({
      case: name,
      cpu: Math.round(cpu.y),
      gpu: Math.round(gpuResult.y),
      standardError: `${((gpuResult.yError / gpuResult.y) * 100).toFixed(2)}%`,
      difference: `${(((gpuResult.y - cpu.y) / cpu.y) * 100).toFixed(2)}%`,
      z: z.toFixed(2),
      cpuRgb: cpu.rgb.map((v) => Math.round(v)).join(" "),
      gpuRgb: gpuResult.rgb.map((v) => Math.round(v)).join(" "),
    });
  }
  results.single = single;
  // The path tracer agrees with the integral within its own noise.
  results.singlePass = worst < 3;
  results.singleWorstZ = Number(worst.toFixed(2));
  $("single").innerHTML = table(single);

  // 2. The full reference by sun angle and altitude.
  status.textContent = "full reference…";
  const hemisphere = hemisphereDirections(16, 32);
  const full: Array<Record<string, number | string>> = [];
  for (const [altitude, sunZenith] of [
    [1, 0],
    [1, 45],
    [1, 80],
    [1, 90],
    [1, 96],
    [10_000, 45],
  ] as Array<[number, number]>) {
    const sun = sunAt(sunZenith);
    const observer = at(altitude);
    // Zenith, and near the horizon toward and away from the sun.
    const probe = (direction: V3, single = false) =>
      estimate(reference, {
        observer,
        sun,
        directions: direction,
        samples: 256,
        ...(single ? { maxScattering: 1, groundReflection: false } : {}),
      });
    const zenith = await probe(view(0, 0));
    const toSun = await probe(view(88, 0));
    const away = await probe(view(88, 180));
    const zenithSingle = await probe(view(0, 0), true);
    const dome = await reference.radiance({
      observer,
      sun,
      directions: hemisphere.directions,
      samples: 256,
    });
    // Diffuse horizontal illuminance: ∫ L cosθ dω over the upper hemisphere.
    let diffuse = 0;
    for (let i = 0; i < hemisphere.weights.length; i++) {
      diffuse += dome.luminance[i]! * hemisphere.weights[i]!;
    }
    const direct = directSunIlluminance(EARTH, observer, sun);
    full.push({
      altitude: `${altitude} m`,
      sunZenith: `${sunZenith}°`,
      zenith: Math.round(zenith.y),
      horizonToSun: Math.round(toSun.y),
      horizonAway: Math.round(away.y),
      multipleShare: `${((1 - zenithSingle.y / zenith.y) * 100).toFixed(0)}%`,
      diffuseHorizontalLux: Math.round(diffuse),
      directHorizontalLux: Math.round(direct.y * Math.max(0, sun[2])),
      zenithRgb: zenith.rgb.map((v) => Math.round(v)).join(" "),
    });
  }
  results.full = full;
  $("full").innerHTML = table(full);

  // 3. Pictures: a fisheye of the whole sky and a panorama of the horizon
  // per sun angle, each exposed for its mean luminance and tonemapped as
  // 2.0 presents (PBR Neutral, sRGB).
  status.textContent = "pictures…";
  const images: Record<string, number> = {};
  for (const sunZenith of [30, 80, 89, 93]) {
    const sun = sunAt(sunZenith);
    const dome = fisheye(64);
    const sky = await reference.radiance({
      observer: at(1),
      sun,
      directions: dome.directions,
      samples: 2048,
    });
    const strip = panorama(192, 40);
    const horizon = await reference.radiance({
      observer: at(1),
      sun,
      directions: strip.directions,
      samples: 1024,
    });
    const domePixels: HdrPixels = {
      width: 64,
      height: 64,
      data: sky.rgb,
      stride: 3,
      mask: (i) => dome.inside[i]!,
    };
    const stripPixels: HdrPixels = {
      width: 192,
      height: 40,
      data: horizon.rgb,
      stride: 3,
    };
    // One exposure for both pictures of a sun angle: the dome's mean.
    const exposure = 0.18 / meanLuminance(domePixels);
    const figure = document.createElement("figure");
    figure.style.margin = "0";
    figure.append(
      picture(domePixels, exposure, 3),
      picture(stripPixels, exposure, 2),
    );
    const caption = document.createElement("figcaption");
    caption.textContent = `sun ${90 - sunZenith}° above the horizon · mean sky ${Math.round(0.18 / exposure)} cd/m²`;
    figure.append(caption);
    $("images").append(figure);
    images[`sun ${sunZenith}°`] = Math.round(0.18 / exposure);
  }
  results.images = images;
  status.textContent = "done";
  reference.destroy();
  gpu.destroy();
  return results;
}

/**
 * One direction estimated by 256 independent copies (one invocation each):
 * the mean, and its standard error from the spread of the copies.
 */
async function estimate(
  reference: AtmosphereReference,
  options: Parameters<AtmosphereReference["radiance"]>[0] & { directions: V3 },
  copies = 256,
) {
  const directions: number[] = [];
  for (let i = 0; i < copies; i++) {
    directions.push(...options.directions);
  }
  const r = await reference.radiance({ ...options, directions });
  let y = 0;
  let y2 = 0;
  const rgb = [0, 0, 0];
  for (let i = 0; i < copies; i++) {
    y += r.luminance[i]!;
    y2 += r.luminance[i]! ** 2;
    for (let k = 0; k < 3; k++) {
      rgb[k]! += r.rgb[i * 3 + k]!;
    }
  }
  const mean = y / copies;
  const variance =
    Math.max(0, y2 / copies - mean * mean) * (copies / (copies - 1));
  return {
    y: mean,
    yError: Math.sqrt(variance / copies),
    rgb: rgb.map((v) => v / copies),
  };
}

/** Directions over the upper hemisphere with solid-angle × cosθ weights. */
function hemisphereDirections(rings: number, segments: number) {
  const directions: number[] = [];
  const weights: number[] = [];
  for (let r = 0; r < rings; r++) {
    const t0 = (r / rings) * (Math.PI / 2);
    const t1 = ((r + 1) / rings) * (Math.PI / 2);
    const theta = (t0 + t1) / 2;
    // ∫ cosθ sinθ dθ over the ring, per segment.
    const w =
      ((Math.sin(t1) ** 2 - Math.sin(t0) ** 2) / 2) *
      ((2 * Math.PI) / segments);
    for (let s = 0; s < segments; s++) {
      const phi = ((s + 0.5) / segments) * 2 * Math.PI;
      directions.push(
        Math.sin(theta) * Math.cos(phi),
        Math.sin(theta) * Math.sin(phi),
        Math.cos(theta),
      );
      weights.push(w);
    }
  }
  return { directions, weights };
}

/** Equidistant fisheye of the upper hemisphere, zenith at the center. */
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

/**
 * A panorama around the horizon: azimuth 0-360° (the sun at the center),
 * elevation from -10° to +50°; the ground shows below the horizon.
 */
function panorama(width: number, height: number) {
  const directions: number[] = [];
  const inside: boolean[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const azimuth = ((x + 0.5) / width) * 360 - 180;
      const elevation = 50 - ((y + 0.5) / height) * 60;
      directions.push(...view(90 - elevation, azimuth));
      inside.push(true);
    }
  }
  return { directions, inside };
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
    return { run: runAtmosphere };
  },
};
