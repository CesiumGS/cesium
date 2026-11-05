import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  MATERIAL_WORDS,
  NO_TEXTURE,
  writeMaterial,
} from "../src/render/layout.ts";

/**
 * The bindless seam (CESIUM2_WEBGPU_PLAN.md §7.1, §13.15): material
 * textures are read only through surface.slang `materialTexture` (and
 * their presence through `materialHasTexture`), so a resource-table backend
 * replaces that one function, the records' references
 * (`World.textureRefs`) and the group-2 layout, and nothing else.
 */

const root = fileURLToPath(new URL("..", import.meta.url));
const BINDINGS =
  /\b(baseColor|metallicRoughness|normal|occlusion|emissive)(Texture|Sampler)\b/g;

function files(directory: string, pattern: RegExp): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) {
      return name === "node_modules" ? [] : files(path, pattern);
    }
    return pattern.test(name) ? [path] : [];
  });
}

/** Lines of `source` that read material texture bindings outside the seam. */
export function readsOutsideSeam(source: string): number[] {
  // Only modules with the material texture set (ao.slang has its own
  // `normalTexture`, a G-buffer), in WGSL or Slang.
  if (
    !/@group\(2\)\s*@binding\(0\)\s*var\s+baseColorTexture\b/.test(source) &&
    !/\[\[vk::binding\(0,\s*2\)\]\]\s*Texture2D<float4>\s+baseColorTexture\b/.test(
      source,
    )
  ) {
    return [];
  }
  const lines = source.split("\n");
  const out: number[] = [];
  let inSeam = false;
  let depth = 0;
  lines.forEach((text, i) => {
    const line = text.replace(/\/\/.*$/, "");
    if (/^\s*(fn|float4)\s+materialTexture\s*\(/.test(line)) {
      inSeam = true;
      depth = 0;
    }
    if (inSeam) {
      for (const c of line) {
        depth += c === "{" ? 1 : c === "}" ? -1 : 0;
      }
      if (depth <= 0 && line.includes("}")) {
        inSeam = false;
      }
      return;
    }
    // The declarations themselves.
    if (
      /^\s*@group\(2\)\s*@binding\(\d+\)\s*var\s+\w+\s*:/.test(line) ||
      /^\s*\[\[vk::binding\(\d+,\s*2\)\]\]/.test(line)
    ) {
      return;
    }
    if (BINDINGS.test(line)) {
      out.push(i + 1);
    }
    BINDINGS.lastIndex = 0;
  });
  return out;
}

describe("bindless seam", () => {
  it("flags material texture reads outside materialTexture", () => {
    const module = `@group(2) @binding(0) var baseColorTexture: texture_2d<f32>;
@group(2) @binding(5) var baseColorSampler: sampler;
fn materialTexture(m: Material, slot: u32, uv: vec2f) -> vec4f {
  switch slot {
    default: { return textureSample(baseColorTexture, baseColorSampler, uv); }
  }
}
fn shade() {
  let a = materialTexture(m, 0u, uv);
  let b = textureSample(baseColorTexture, baseColorSampler, uv);
}`;
    expect(readsOutsideSeam(module)).toEqual([10]);
    const slang = `[[vk::binding(0, 2)]] Texture2D<float4> baseColorTexture;
[[vk::binding(5, 2)]] SamplerState baseColorSampler;
float4 materialTexture(Material m, uint slot, float2 uv) {
  switch (slot) {
  default: return baseColorTexture.Sample(baseColorSampler, uv);
  }
}
void shade() {
  float4 b = baseColorTexture.Sample(baseColorSampler, uv);
}`;
    expect(readsOutsideSeam(slang)).toEqual([9]);
  });

  it("reads material textures only through materialTexture", () => {
    const violations: string[] = [];
    // The sources (generated WGSL renames the bindings: its Slang is read).
    for (const path of files(join(root, "src"), /\.(wgsl|slang)$/)) {
      if (path.includes(join("shaders", "generated"))) {
        continue;
      }
      for (const line of readsOutsideSeam(readFileSync(path, "utf8"))) {
        violations.push(`${relative(root, path)}:${line}`);
      }
    }
    // The seam is where the surface shaders read textures.
    expect(
      readsOutsideSeam(
        readFileSync(join(root, "src", "shaders", "surface.slang"), "utf8"),
      ),
    ).toEqual([]);
    expect(
      /\[\[vk::binding\(0,\s*2\)\]\]\s*Texture2D<float4>\s+baseColorTexture\b/.test(
        readFileSync(join(root, "src", "shaders", "surface.slang"), "utf8"),
      ),
    ).toBe(true);
    expect(violations).toEqual([]);
  });

  it("packs texture references two to a word, empty slots NO_TEXTURE", () => {
    const data = new ArrayBuffer(MATERIAL_WORDS * 4);
    const f32 = new Float32Array(data);
    const u32 = new Uint32Array(data);
    const material = {
      baseColor: [1, 1, 1, 1] as const,
      emissive: [0, 0, 0] as const,
      metallic: 0,
      roughness: 1,
      alphaCutoff: 0.5,
      normalScale: 1,
      occlusionStrength: 1,
      flags: 0,
    };
    writeMaterial(f32, u32, 0, {
      ...material,
      textures: [0, NO_TEXTURE, 2, NO_TEXTURE, 4],
    });
    // common.slang `materialTextureRef`.
    const ref = (slot: number) => {
      const word = slot < 2 ? u32[13]! : slot < 4 ? u32[14]! : u32[15]!;
      return (word >>> ((slot & 1) * 16)) & 0xffff;
    };
    expect([0, 1, 2, 3, 4].map(ref)).toEqual([0, NO_TEXTURE, 2, NO_TEXTURE, 4]);
    writeMaterial(f32, u32, 0, material);
    expect([0, 1, 2, 3, 4].map(ref)).toEqual(Array(5).fill(NO_TEXTURE));
  });
});
