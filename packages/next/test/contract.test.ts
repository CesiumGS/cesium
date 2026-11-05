import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  CONTRACT_STRUCTS,
  ENGINE_STRUCTS,
} from "../src/shaders/generated/boundary.ts";
import {
  CONTRACT_WGSL,
  SLANG_BRIDGE,
  slangAdapter,
  slangBridge,
} from "../src/scene/contract.ts";
import { CustomShader } from "../src/scene/CustomShader.ts";
import {
  SURFACE_BOUNDARY,
  SURFACE_VERTEX_BOUNDARY,
  WgslLinker,
  canonicalType,
  declarations,
  linkFailure,
  wgslUnit,
} from "../src/shaders/link/index.ts";

/**
 * The surface boundary's description (shaders/generated/boundary.ts, from
 * Slang's reflection of surfaceBoundary.slang and cesium.slang; `npm run
 * shaders:check` keeps it current) and what is generated from it: the WGSL
 * contract and the Slang stages' bridge (scene/contract.ts).
 */

const source = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const surface = wgslUnit(
  "surface.slang",
  source("src/shaders/generated/surface.wgsl"),
);
const vertex = wgslUnit(
  "surfaceVertex.wgsl",
  source("src/shaders/surfaceVertex.wgsl"),
);
const moments = wgslUnit(
  "moment bindings",
  [
    "@group(3) @binding(3) var momentsZero: texture_storage_2d<r32float, read>;",
    "@group(3) @binding(4) var momentsHigher: texture_storage_2d<rgba32float, read>;",
  ].join("\n"),
);
const linker = new WgslLinker();
const link = (shader: CustomShader) =>
  linker.link({
    label: shader.label,
    units: [surface, vertex, moments, ...shader.units],
    boundaries: [
      SURFACE_BOUNDARY,
      SURFACE_VERTEX_BOUNDARY,
      ...shader.boundaries,
    ],
  });

describe("the boundary's description", () => {
  it("has one MaterialOutput: the engine's is the contract's", () => {
    expect(CONTRACT_STRUCTS.MaterialOutput).toEqual(
      ENGINE_STRUCTS.MaterialOutput,
    );
  });

  it("gives every contract input a field the engine passes, or named values", () => {
    const from = {
      VertexInput: ENGINE_STRUCTS.CesiumVertex,
      FragmentInput: ENGINE_STRUCTS.CesiumFragment,
    } as const;
    for (const [input, engine] of Object.entries(from)) {
      for (const f of CONTRACT_STRUCTS[input as keyof typeof from]) {
        if ("struct" in f) {
          expect(["attributes", "metadata", "instance"]).toContain(f.name);
          continue;
        }
        expect(
          engine.find((g) => g.name === f.name)?.type,
          `${input}.${f.name}`,
        ).toBe(f.type);
      }
    }
  });

  it("is what the engine's WGSL declares", () => {
    // The surface module's structs, field by field (Slang keeps the
    // boundary's names: `__extern_cpp`).
    for (const [name, fields] of Object.entries(ENGINE_STRUCTS)) {
      const body = new RegExp(`struct ${name}\\s*\\{([^}]*)\\}`).exec(
        surface.code,
      );
      expect(body, name).not.toBeNull();
      const declared = [...body![1]!.matchAll(/(\w+)\s*:\s*([^,]+?)\s*,/g)].map(
        (m) => ({ name: m[1], type: canonicalType(m[2]!) }),
      );
      expect(declared, name).toEqual(
        fields.map((f) => ({ name: f.name, type: canonicalType(f.type) })),
      );
    }
  });

  it("generates the WGSL contract's structs from cesium.slang's", () => {
    const structs = declarations(CONTRACT_WGSL).filter(
      (d) => d.kind === "struct",
    );
    expect(structs.map((d) => d.name)).toEqual([
      "VertexInput",
      "VertexOutput",
      "FragmentInput",
    ]);
    expect(CONTRACT_WGSL).toContain(
      `struct VertexOutput {\n${CONTRACT_STRUCTS.VertexOutput.map((f) => `  ${f.name}: ${f.type},`).join("\n")}\n};`,
    );
  });
});

describe("the Slang stages' bridge", () => {
  const named = {
    attributes: { shear: "mat2x2f", heat: "f32" },
    metadata: {},
  } as const;

  it("passes built-in types only, named values by name", () => {
    const bridge = slangBridge({ vertex: true, fragment: false }, named);
    expect(bridge).toMatch(
      /export __extern_cpp void cesiumSlangVertex\(float3 in_positionMC, .*float in_attributes_heat, float2x2 in_attributes_shear, inout float3 out_positionMC, inout float3 out_normalMC\)/,
    );
    // A named matrix transposed into Slang's convention.
    expect(bridge).toContain(
      "i.attributes.shear = transpose(in_attributes_shear);",
    );
    expect(bridge).not.toContain(SLANG_BRIDGE.fragment);
    const adapter = slangAdapter({ vertex: true, fragment: false }, named);
    expect(adapter).toContain(
      "vsInput.attributes.heat, vsInput.attributes.shear, &out_positionMC, &out_normalMC",
    );
    // Outputs through variables of their own (WGSL's aliasing rule).
    expect(adapter).toContain("var out_positionMC = (*vsOutput).positionMC;");
    expect(adapter).toContain("(*vsOutput).normalMC = out_normalMC;");
  });

  it("links Slang's output as it is, the adapter calling the bridge", () => {
    // Built by scripts/slangShader.mjs (parity/slang/shear.slang).
    const shader = new CustomShader({
      label: "shear",
      wgsl: source("parity/slang/shear.wgsl"),
      attributes: {
        shear: { semantic: "_SHEAR", type: "mat2x2f" },
        heat: { semantic: "_HEAT", type: "f32" },
      },
    });
    expect(shader.units.map((u) => u.name)).toEqual([
      "stages",
      "Slang adapter",
      "contract",
    ]);
    expect(link(shader).diagnostics).toEqual([]);
  });

  it("reports a Slang shader compiled against other named values", () => {
    const shader = new CustomShader({
      label: "shear",
      wgsl: source("parity/slang/shear.wgsl"),
      attributes: { heat: { semantic: "_HEAT", type: "f32" } },
    });
    expect(linkFailure(link(shader))).toMatch(
      /stages line \d+: `cesiumSlangVertex` must be `fn cesiumSlangVertex\(.*\)` \(the Slang stages \(compiled with these attributes, metadata and instance values\?\) boundary\)/,
    );
  });
});
