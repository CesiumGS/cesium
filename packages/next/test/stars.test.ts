// Stars read out of a star map (plan §4.2): positions, brightness by rank,
// the background.
import { describe, expect, it } from "vitest";
import {
  MAGNITUDE_ZERO_ILLUMINANCE,
  STAR_FLOATS,
  cubeDirection,
  extractStars,
  magnitudeOfRank,
  type StarMapFace,
} from "../src/atmosphere/stars.ts";

const SIZE = 64;

function blankFaces(level = 4): StarMapFace[] {
  return Array.from({ length: 6 }, () => {
    const data = new Uint8ClampedArray(SIZE * SIZE * 4);
    for (let i = 0; i < SIZE * SIZE; i++) {
      data.set([level, level, level, 255], i * 4);
    }
    return { data, width: SIZE };
  });
}

function star(face: StarMapFace, x: number, y: number, value: number): void {
  face.data.set([value, value, value, 255], (y * SIZE + x) * 4);
}

describe("magnitudeOfRank", () => {
  it("follows the sky's star counts", () => {
    expect(magnitudeOfRank(1)).toBeCloseTo(-1.46, 2);
    expect(magnitudeOfRank(4800)).toBeCloseTo(6, 1);
    expect(magnitudeOfRank(41_000)).toBeCloseTo(8, 1);
  });
});

describe("cubeDirection", () => {
  it("puts each face's center on its axis", () => {
    expect(cubeDirection(0, 0, 0)).toEqual([1, 0, -0]);
    expect(cubeDirection(3, 0, 0)).toEqual([0, -1, 0]);
    expect(cubeDirection(5, 0, 0)).toEqual([-0, 0, -1]);
  });
});

describe("extractStars", () => {
  it("finds single-texel stars, brightest first, at their texels", () => {
    const faces = blankFaces();
    star(faces[4]!, 32, 32, 200); // +z, its center: the brightest
    star(faces[0]!, 10, 20, 60);
    star(faces[2]!, 40, 8, 120);
    const field = extractStars(faces);
    expect(field.count).toBe(3);
    const p = field.points;
    // +z face, texel 32 (just right of and below the center).
    const z = [p[0]!, p[1]!, p[2]!];
    expect(z[2]).toBeGreaterThan(0.99);
    // Brightness by rank: Sirius, then Canopus, then Arcturus.
    expect(p[3]).toBeCloseTo(
      MAGNITUDE_ZERO_ILLUMINANCE * 10 ** (0.4 * 1.46),
      12,
    );
    expect(p[STAR_FLOATS + 3]!).toBeLessThan(p[3]!);
    expect(p[2 * STAR_FLOATS + 3]!).toBeLessThan(p[STAR_FLOATS + 3]!);
    // White stars stay white (luminance 1).
    expect(p[4]).toBeCloseTo(1, 3);
    expect(p[6]).toBeCloseTo(1, 3);
  });

  it("ignores the background's noise", () => {
    const faces = blankFaces(6);
    star(faces[1]!, 30, 30, 12);
    expect(extractStars(faces).count).toBe(0);
  });

  it("keeps the background low-passed, a uniform map flat", () => {
    const field = extractStars(blankFaces(10));
    expect(field.backgroundSize).toBe(SIZE / 16);
    expect(field.backgroundLevels[0]![0]![0]).toBe(0);
  });
});
