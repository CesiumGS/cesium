import { describe, expect, it } from "vitest";
import * as layouts from "../src/render/generated/layouts.ts";

/**
 * The shared structs are defined once, in shaders/common.slang, and the
 * TypeScript offsets come from its reflection (render/generated/
 * layouts.ts; `npm run shaders:check` keeps it current). Every shader is
 * Slang now (CESIUM2_WEBGPU_PLAN.md §3.4, step 7): no WGSL copy of the
 * structs remains to check against.
 */
describe("shared struct layouts", () => {
  it("reflects every struct common.slang shares", () => {
    expect(
      Object.keys(layouts)
        .map((name) => name.replace(/Layout$/, ""))
        .sort(),
    ).toEqual(
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

  it("gives each struct a size, an alignment and its fields' offsets", () => {
    for (const [name, layout] of Object.entries(layouts)) {
      const { size, align, ...fields } = layout as {
        size: number;
        align: number;
      } & Record<string, number>;
      expect(size % align, name).toBe(0);
      for (const [field, offset] of Object.entries(fields)) {
        expect(offset, `${name}.${field}`).toBeLessThan(size);
      }
    }
  });
});
