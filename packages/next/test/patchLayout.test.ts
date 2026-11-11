// The patch shaders' layout agrees with the CPU's (src/brep/gpuPatches.ts):
// the span record's word offsets, the dice's uniform, the record flag, the
// chunk's packing and the vertex entries' boundary.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  SPAN,
  SPAN_NEEDS_TRIM,
  SPAN_REVERSED,
  SPAN_WORDS,
} from "../src/brep/gpuPatches.ts";
import { RecordFlags } from "../src/render/layout.ts";
import { CHUNK_BYTES, PATCH_DICE_BYTES } from "../src/scene/world/patches.ts";
import { SURFACE_VERTEX_BOUNDARY } from "../src/shaders/link/index.ts";

const source = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

/** `public static const uint NAME = n;` of a Slang module, by name. */
function constants(text: string): Map<string, number> {
  const out = new Map<string, number>();
  for (const m of text.matchAll(
    /(?:public\s+)?static\s+const\s+uint\s+(\w+)\s*=\s*(\d+)u\s*;/g,
  )) {
    out.set(m[1]!, Number(m[2]));
  }
  return out;
}

describe("patch.slang", () => {
  const patch = constants(source("src/shaders/patch.slang"));

  it("reads the span record where gpuPatches.ts writes it", () => {
    expect(patch.get("SPAN_WORDS")).toBe(SPAN_WORDS);
    const names: Record<string, number> = {
      SPAN_KIND: SPAN.kind,
      SPAN_DEGREES: SPAN.degrees,
      SPAN_FACE: SPAN.face,
      SPAN_CONTROLS: SPAN.controls,
      SPAN_ORIGIN: SPAN.origin,
      SPAN_AXIS_X: SPAN.axisX,
      SPAN_AXIS_Y: SPAN.axisY,
      SPAN_PARAMS: SPAN.params,
      SPAN_DOMAIN: SPAN.domain,
      SPAN_RECT: SPAN.rect,
      SPAN_CORNER: SPAN.corner,
      SPAN_SPHERE: SPAN.sphere,
      SPAN_FACE_SPHERE: SPAN.faceSphere,
      SPAN_DENSITY: SPAN.density,
      SPAN_SPEED: SPAN.speed,
      SPAN_TRIM: SPAN.trim,
    };
    for (const [name, word] of Object.entries(names)) {
      expect(patch.get(name), name).toBe(word);
    }
    expect(patch.get("SPAN_REVERSED_BIT")).toBe(SPAN_REVERSED);
    expect(patch.get("SPAN_NEEDS_TRIM_BIT")).toBe(SPAN_NEEDS_TRIM);
  });

  it("agrees with the surface kinds, in the order form.ts numbers them", () => {
    expect([
      patch.get("KIND_PLANE"),
      patch.get("KIND_CYLINDER"),
      patch.get("KIND_CONE"),
      patch.get("KIND_SPHERE"),
      patch.get("KIND_TORUS"),
    ]).toEqual([0, 1, 2, 3, 4]);
    // The vertex stage's Bézier branch is the kind after them.
    expect(source("src/shaders/surface.slang")).toMatch(/s\.kind == 5u/);
  });

  it("makes chunks of 8 × 8 cells of at most 64 a side", () => {
    expect(patch.get("CHUNK_CELLS")).toBe(8);
    expect(patch.get("MAX_CELLS")).toBe(64);
    // The chunk's packing holds the counts and origins in a byte each.
    expect(patch.get("MAX_CELLS")!).toBeLessThan(256);
  });
});

describe("the dice and the vertex stage", () => {
  const dice = source("src/shaders/dice.slang");
  const surface = source("src/shaders/surface.slang");

  it("take the parameters the world writes: 8 words", () => {
    const block = /struct PatchDice \{([^}]*)\}/.exec(dice)![1]!;
    const fields = [...block.matchAll(/\b(?:uint|float)\s+\w+\s*;/g)];
    expect(fields).toHaveLength(8);
    expect(PATCH_DICE_BYTES).toBe(32);
    expect(CHUNK_BYTES).toBe(16);
    expect(dice).toContain("chunks[first + c] = uint4(");
  });

  it("agree on a chunk's packing: origin and counts a byte each", () => {
    expect(dice).toContain("i0 | (j0 << 8u) | (nu << 16u) | (nv << 24u)");
    expect(surface).toContain("(packed >> 16u) & 255u");
    expect(surface).toContain("(packed >> 24u) & 255u");
    expect(surface).toContain("(packed & 255u)");
    expect(surface).toContain("((packed >> 8u) & 255u)");
  });

  it("agree on the record flag", () => {
    expect(RecordFlags.patches).toBe(128);
    expect(surface).toMatch(/bool patched = \(r\.flags & 128u\) != 0u;/);
  });

  it("evaluate a draw once: through the common vertex function", () => {
    expect(surface.match(/placeVertex\(/g)!.length).toBe(1);
    expect(surface).toMatch(
      /surfacePatchVertex\(uint vertexIndex, uint4 chunk\) \{\s*patchChunk = chunk;\s*return vertexOut\(vertexIndex, chunk\.x, true\);/,
    );
  });

  it("have vertex entries the boundary requires, and the wrapper provides", () => {
    const wgsl = source("src/shaders/surfaceVertex.wgsl");
    for (const name of ["vsPatch", "vsPatchDepth"]) {
      expect(wgsl).toMatch(
        new RegExp(
          `fn ${name}\\(@builtin\\(vertex_index\\) vertexIndex: u32, @location\\(0\\) chunk: vec4u\\)`,
        ),
      );
      expect(SURFACE_VERTEX_BOUNDARY.provides).toContain(name);
    }
    expect(
      SURFACE_VERTEX_BOUNDARY.requires.filter(
        (r) => r.params[1] === "vec4<u32>",
      ),
    ).toHaveLength(2);
  });
});
