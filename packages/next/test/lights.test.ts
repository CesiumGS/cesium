import { describe, expect, it } from "vitest";
import {
  LIGHT_FLOATS,
  LIGHT_HEADER_FLOATS,
  LIGHTS_SIZE,
  MAX_VIEW_LIGHTS,
  lightReach,
  packViewLights,
  type LightOptions,
} from "../src/scene/lights.ts";
import { readLight } from "../src/io/gltfLights.ts";

const transform = { index: 0, generation: 0 };

/** A matrix at (x, y, z), its −z down the world's −z. */
function at(x: number, y: number, z: number): Float64Array {
  const m = new Float64Array(16);
  m[0] = m[5] = m[10] = m[15] = 1;
  m[12] = x;
  m[13] = y;
  m[14] = z;
  return m;
}

// Looking down +y from the origin, z up.
const camera = {
  position: [0, 0, 0],
  direction: [0, 1, 0],
  up: [0, 0, 1],
  right: [1, 0, 0],
  near: 0.1,
  tanX: 1,
  tanY: 1,
};

function pack(lights: Array<[LightOptions, Float64Array]>, exposure = 1) {
  const out = new Float32Array(LIGHTS_SIZE / 4);
  const count = packViewLights(
    out,
    0,
    (visit) => lights.forEach(([l, m]) => visit(l, m)),
    camera,
    exposure,
  );
  return { out, count };
}

describe("lightReach", () => {
  it("ends where the light shows below 1/256 of white", () => {
    const reach = lightReach(100, 1);
    // E/π × exposure at the reach.
    expect(100 / (reach * reach) / Math.PI).toBeCloseTo(1 / 256, 8);
  });
  it("stops at its range, and at 10 km", () => {
    expect(lightReach(100, 1, 5)).toBe(5);
    expect(lightReach(1e12, 1)).toBe(10_000);
  });
});

describe("packViewLights", () => {
  const point = (intensity = 100): LightOptions => ({
    type: "point",
    intensity,
    range: 10,
    transform,
  });

  it("keeps lights in view, camera-relative, and drops those behind", () => {
    const { out, count } = pack([
      [point(), at(0, 20, 0)],
      [point(), at(0, -20, 0)], // behind, beyond its range
      [point(), at(100, 20, 0)], // far off to the side
    ]);
    expect(count).toBe(1);
    expect(out[3]).toBe(1);
    expect(
      Array.from(out.subarray(LIGHT_HEADER_FLOATS, LIGHT_HEADER_FLOATS + 4)),
    ).toEqual([0, 20, 0, 10]);
    // The grid ends at the farthest light's reach.
    expect(out[11]).toBeCloseTo(30);
  });

  it("keeps a light behind the camera whose reach comes into view", () => {
    expect(pack([[point(), at(0, -5, 0)]]).count).toBe(1);
  });

  it("packs a spot's axis and glTF's cone falloff", () => {
    const spot: LightOptions = {
      type: "spot",
      intensity: 50,
      color: [1, 0.5, 0.25],
      innerConeAngle: 0.2,
      outerConeAngle: 0.4,
      transform,
    };
    const { out } = pack([[spot, at(0, 5, 3)]]);
    const l = out.subarray(
      LIGHT_HEADER_FLOATS,
      LIGHT_HEADER_FLOATS + LIGHT_FLOATS,
    );
    expect(Array.from(l.subarray(4, 8))).toEqual([50, 25, 12.5, 1]);
    expect(Array.from(l.subarray(8, 11))).toEqual([-0, -0, -1]);
    const scale = 1 / (Math.cos(0.2) - Math.cos(0.4));
    expect(l[11]).toBeCloseTo(scale, 4);
    // Full inside the inner cone, nothing at the outer edge.
    expect(Math.cos(0.2) * l[11]! + l[12]!).toBeCloseTo(1, 5);
    expect(Math.cos(0.4) * l[11]! + l[12]!).toBeCloseTo(0, 5);
  });

  it("keeps the nearest when more are in view than it holds", () => {
    const lights: Array<[LightOptions, Float64Array]> = [];
    for (let i = 0; i < MAX_VIEW_LIGHTS + 10; i++) {
      lights.push([point(), at(0, 1000 - i * 0.5, 0)]);
    }
    const { out, count } = pack(lights);
    expect(count).toBe(MAX_VIEW_LIGHTS);
    let farthest = 0;
    for (let i = 0; i < count; i++) {
      farthest = Math.max(
        farthest,
        out[LIGHT_HEADER_FLOATS + i * LIGHT_FLOATS + 1]!,
      );
    }
    // The 10 farthest made way.
    expect(farthest).toBe(1000 - 10 * 0.5);
  });

  it("skips dark lights", () => {
    expect(pack([[point(0), at(0, 5, 0)]]).count).toBe(0);
  });
});

describe("readLight (KHR_lights_punctual)", () => {
  it("reads a spot with glTF's defaults", () => {
    const warnings: string[] = [];
    const m = at(1, 2, 3);
    const light = readLight(
      { type: "spot", intensity: 20, spot: {} },
      m,
      warnings,
    );
    expect(light).toEqual({
      type: "spot",
      color: [1, 1, 1],
      intensity: 20,
      innerConeAngle: 0,
      outerConeAngle: Math.PI / 4,
      matrix: m,
    });
  });
  it("skips directional lights, with a warning", () => {
    const warnings: string[] = [];
    expect(
      readLight({ type: "directional" }, at(0, 0, 0), warnings),
    ).toBeUndefined();
    expect(warnings).toHaveLength(1);
  });
});
