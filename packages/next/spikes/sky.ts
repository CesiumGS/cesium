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
import { EARTH } from "../src/atmosphere/model.ts";

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
const luminance = (rgb: ArrayLike<number>, i: number) =>
  0.2126 * rgb[i * 3]! + 0.7152 * rgb[i * 3 + 1]! + 0.0722 * rgb[i * 3 + 2]!;

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
  status.textContent = "done";
  reference.destroy();
  realtime.destroy();
  gpu.destroy();
  return results;
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
