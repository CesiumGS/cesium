// The sky's environment lighting per view: its probes, their updates, and the
// axes they're expressed in.
import type { EnvironmentProbe } from "../../gpu/Environment.ts";
import { Ellipsoid, type Cartographic } from "../../math/ellipsoid.ts";
import * as m4 from "../../math/mat4.ts";
import { eastNorthUpToFixedFrame } from "../../math/transforms.ts";
import * as v3 from "../../math/vec3.ts";
import type { Vec3 } from "../../math/vec3.ts";
import { type ViewFrame, drawsSky } from "./viewFrameData.ts";
import type { Engine } from "../../scene/Engine.ts";
import type { View } from "../../scene/View.ts";

const scratchEnu = m4.mat4();
const scratchEast = v3.vec3();
const scratchUp = v3.vec3();
const scratchSouth = v3.vec3();
export const scratchFrame: [Vec3, Vec3, Vec3] = [
  scratchEast,
  scratchUp,
  scratchSouth,
];

export function environmentFrame(
  position: Vec3,
  ellipsoid: Ellipsoid = Ellipsoid.WGS84,
): [Vec3, Vec3, Vec3] {
  const enu = eastNorthUpToFixedFrame(position, ellipsoid, scratchEnu);
  v3.set(scratchEast, enu[0]!, enu[1]!, enu[2]!);
  v3.set(scratchUp, enu[8]!, enu[9]!, enu[10]!);
  v3.set(scratchSouth, -enu[4]!, -enu[5]!, -enu[6]!);
  return scratchFrame;
}
const scratchCartographic: Cartographic = {
  longitude: 0,
  latitude: 0,
  height: 0,
};

/**
 * The environment a view's lighting reads: its atmosphere's (rebuilt by
 * `updateEnvironment`), black without one, or the procedural sky.
 */
function probeOf(engine: Engine, view: View): EnvironmentProbe {
  const environment = engine.ctx.environment;
  if (view.lighting.environment !== "atmosphere") {
    return environment.procedural;
  }
  if (!view.body.atmosphere) {
    // Never built: textures and buffers start as zeros.
    return (engine.darkProbe ??= environment.createProbe("env.dark"));
  }
  return engine.probes.get(view)!.probe;
}

/**
 * Marks a view's environment for rebuilding from its atmosphere (this
 * frame, `encodeEnvironment`) when the sun has
 * moved by about 0.1° in its local frame (or the camera about 13 km
 * along the ground), or its altitude by 10% (500 m and below count as
 * 500 m: below the 8 km scale height the sky changes slowly with
 * altitude); by night, when the Moon has moved as much or its light by
 * 10%; and when the exposure has moved by a stop (the sky it's built
 * from is pre-exposed: a night sky at a day's exposure is below fp16's
 * smallest values). About 10 ms of GPU work each time (plan §4.2: to
 * cut).
 */
export function updateEnvironment(engine: Engine, view: View): void {
  if (view.lighting.environment !== "atmosphere" || !view.body.atmosphere) {
    return;
  }
  let entry = engine.probes.get(view);
  if (!entry) {
    entry = {
      probe: engine.ctx.environment.createProbe("env.view"),
      key: new Float64Array(9).fill(Number.NaN),
      exposure: Number.NaN,
      pending: false,
    };
    engine.probes.set(view, entry);
  }
  const ellipsoid = view.body.ellipsoid;
  const position = engine.bodyCamera(view).position;
  const frame = environmentFrame(position, ellipsoid);
  const sun = engine.sunDirection;
  const east = v3.dot(frame[0], sun);
  const up = v3.dot(frame[1], sun);
  const south = v3.dot(frame[2], sun);
  const height =
    ellipsoid.cartesianToCartographic(position, scratchCartographic)?.height ??
    0;
  const altitude = Math.max(height, 500);
  const k = entry.key;
  const turned = Math.hypot(east - k[0]!, up - k[1]!, south - k[2]!);
  const climbed = Math.abs(Math.log(altitude / k[3]!));
  // The Moon by night (the air's share is 0 by day), and the exposure.
  const moon = engine.viewBlock.moonAir > 0 ? engine.viewBlock.moon : undefined;
  const moonEast = moon ? v3.dot(frame[0], moon.direction) : 0;
  const moonUp = moon ? v3.dot(frame[1], moon.direction) : 0;
  const moonSouth = moon ? v3.dot(frame[2], moon.direction) : 0;
  const moonLight = engine.viewBlock.moonAir;
  const moonTurned = Math.hypot(
    moonEast - k[4]!,
    moonUp - k[5]!,
    moonSouth - k[6]!,
  );
  const moonChanged =
    moonLight === 0
      ? k[7] !== 0
      : !(Math.abs(Math.log(moonLight / k[7]!)) <= 0.1);
  const stops = Math.abs(Math.log2(view.exposureScale / entry.exposure));
  // The city's light (its glow, its ground) by 10%.
  const city = engine.viewCityLight;
  const cityChanged =
    city === 0 ? k[8] !== 0 : !(Math.abs(Math.log(city / k[8]!)) <= 0.1);
  // NaN (never built) compares false: rebuild.
  if (
    turned <= 0.002 &&
    climbed <= 0.1 &&
    moonTurned <= 0.002 &&
    !moonChanged &&
    !cityChanged &&
    stops <= 1
  ) {
    return;
  }
  k[0] = east;
  k[1] = up;
  k[2] = south;
  k[3] = altitude;
  k[4] = moonEast;
  k[5] = moonUp;
  k[6] = moonSouth;
  k[7] = moonLight;
  k[8] = city;
  entry.exposure = view.exposureScale;
  entry.pending = true;
}

/**
 * @internal Encodes a pending rebuild of a view's environment (after its sky-view
 * table, which it reads when the view has one), then selects the view's
 * environment for its draws.
 */
export function encodeEnvironment(
  engine: Engine,
  encoder: GPUCommandEncoder,
  view: View,
  frame: ViewFrame,
): void {
  const entry = engine.probes.get(view);
  if (entry?.pending) {
    entry.pending = false;
    const position = engine.bodyCamera(view).position;
    const ellipsoid = view.body.ellipsoid;
    engine.sky.encodeEnvironment(
      encoder,
      frame.sky,
      entry.probe.skyCube,
      ellipsoid,
      position,
      environmentFrame(position, ellipsoid),
      engine.sunDirection,
      drawsSky(view) && frame.sky.inside
        ? { exposure: view.exposureScale }
        : undefined,
    );
    engine.ctx.environment.build(entry.probe, encoder);
    engine.stats.environmentBuilds++;
  }
  engine.ctx.environment.select(encoder, probeOf(engine, view));
}
