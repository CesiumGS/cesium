import { describe, expect, it } from "vitest";
import commonWgsl from "../src/shaders/common.wgsl?raw";
import * as layouts from "../src/render/generated/layouts.ts";

/**
 * The shared structs are defined once, in shaders/common.slang, and the
 * TypeScript offsets come from its reflection (render/generated/
 * layouts.ts). Until the last WGSL kernel is ported, common.wgsl still
 * declares them for the WGSL kernels: this checks it lays every struct out
 * exactly as the Slang does (CESIUM2_WEBGPU_PLAN.md §3.4, step 3), with
 * WGSL's own alignment and size rules.
 */
interface Layout {
  align: number;
  size: number;
}

const SCALAR: Record<string, Layout> = {
  f32: { align: 4, size: 4 },
  u32: { align: 4, size: 4 },
  i32: { align: 4, size: 4 },
  vec2f: { align: 8, size: 8 },
  vec2u: { align: 8, size: 8 },
  vec3f: { align: 16, size: 12 },
  vec3u: { align: 16, size: 12 },
  vec4f: { align: 16, size: 16 },
  vec4u: { align: 16, size: 16 },
  mat3x3f: { align: 16, size: 48 },
  mat4x4f: { align: 16, size: 64 },
};

const roundUp = (align: number, n: number) => Math.ceil(n / align) * align;

/** A struct body's fields, split at commas outside `<…>`. */
function topLevel(body: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let current = "";
  for (const c of body) {
    depth += c === "<" ? 1 : c === ">" ? -1 : 0;
    if (c === "," && depth === 0) {
      out.push(current);
      current = "";
    } else {
      current += c;
    }
  }
  return [...out, current];
}

/** The structs common.wgsl declares: each field's offset, and the size. */
function wgslStructs(
  source: string,
): Map<
  string,
  { size: number; align: number; fields: Array<[string, number]> }
> {
  const code = source.replace(/\/\/[^\n]*/g, "");
  const structs = new Map<
    string,
    { size: number; align: number; fields: Array<[string, number]> }
  >();
  const typeLayout = (type: string): Layout => {
    const array = /^array<\s*(\w+)\s*,\s*(\d+)\s*>$/.exec(type);
    if (array) {
      const element = typeLayout(array[1]!);
      const stride = roundUp(element.align, element.size);
      return { align: element.align, size: stride * Number(array[2]) };
    }
    const known = SCALAR[type] ?? structs.get(type);
    if (!known) {
      throw new Error(`no layout for ${type}`);
    }
    return known;
  };
  for (const m of code.matchAll(/struct\s+(\w+)\s*\{([^}]*)\}/g)) {
    const fields: Array<[string, number]> = [];
    let offset = 0;
    let align = 1;
    for (const line of topLevel(m[2]!)) {
      const f = /^\s*(\w+)\s*:\s*(.+?)\s*$/.exec(line);
      if (!f) {
        continue;
      }
      // A runtime-sized array ends a struct: no fixed size to compare.
      if (/^array<\s*\w+\s*>$/.test(f[2]!)) {
        break;
      }
      const t = typeLayout(f[2]!);
      offset = roundUp(t.align, offset);
      fields.push([f[1]!, offset]);
      offset += t.size;
      align = Math.max(align, t.align);
    }
    structs.set(m[1]!, { size: roundUp(align, offset), align, fields });
  }
  return structs;
}

describe("shared struct layouts", () => {
  const wgsl = wgslStructs(commonWgsl);
  const slang = Object.entries(layouts).map(([name, layout]) => ({
    name: name.replace(/Layout$/, ""),
    layout: layout as Record<string, number>,
  }));

  it("reflects every struct common.slang shares", () => {
    expect(slang.map((s) => s.name).sort()).toEqual(
      [
        "DrawItem",
        "DrawRecord",
        "Instance",
        "Light",
        "LightHeader",
        "Material",
        "Transform",
        "View",
      ].sort(),
    );
  });

  for (const { name, layout } of slang) {
    it(`lays out ${name} in common.wgsl as common.slang does`, () => {
      const w = wgsl.get(name);
      expect(w, `common.wgsl declares ${name}`).toBeDefined();
      const { size, align, ...fields } = layout;
      expect(w!.fields).toEqual(Object.entries(fields));
      expect(w!.size).toBe(size);
      expect(w!.align).toBe(align);
    });
  }
});
