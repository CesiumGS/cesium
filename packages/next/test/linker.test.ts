import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  POINT_STYLE_BOUNDARY,
  POOL_STYLE_BOUNDARY,
  SURFACE_BOUNDARY,
  WgslLinker,
  compileFailure,
  declarations,
  linkFailure,
  wgslUnit,
  type Boundary,
  type ShaderUnit,
} from "../src/shaders/link/index.ts";
import { CustomShader, DEFAULT_STAGES } from "../src/scene/CustomShader.ts";
import { POINT_STYLE_DEFAULTS } from "../src/scene/pointStyle.ts";
import { compileVectorStyle } from "../src/vector/VectorStyle.ts";

const source = (path: string) =>
  readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8");
const common = wgslUnit("common.wgsl", source("shaders/common.wgsl"));
const opaque = wgslUnit("opaque.wgsl", source("shaders/opaque.wgsl"));
const translucent = wgslUnit(
  "translucent.wgsl",
  source("shaders/translucent.wgsl"),
);
const moments = wgslUnit(
  "moment bindings",
  [
    "@group(3) @binding(3) var momentsZero: texture_storage_2d<r32float, read>;",
    "@group(3) @binding(4) var momentsHigher: texture_storage_2d<rgba32float, read>;",
  ].join("\n"),
);
const stages = wgslUnit("engine stages", DEFAULT_STAGES);

const linker = new WgslLinker();
const link = (units: ShaderUnit[], boundaries: Boundary[]) =>
  linker.link({ label: "test", units, boundaries });

/** Every name a boundary says its side provides, defined by those units. */
function expectProvides(boundary: Boundary, units: ShaderUnit[]) {
  const names = new Set(
    units.flatMap((u) => u.declarations.map((d) => d.name)),
  );
  for (const name of boundary.provides) {
    expect(names.has(name), `${boundary.name} provides ${name}`).toBe(true);
  }
}

describe("WGSL declarations", () => {
  it("reads top-level heads, not bodies or comments", () => {
    const d = declarations(`
enable f16;
// fn commented(x: u32) {}
/* struct Hidden { a: u32 }; /* nested */ */
struct S { @location(0) a: vec4f, b: array<u32, 4> };
@group(2) @binding(10) var<uniform> uniforms: S;
const K = vec2f(1.0, 2.0);
override flag: bool = false;
fn f(a: u32, out: ptr<function, S>, @builtin(position) p: vec4f) -> vec4f {
  let inner = 1u;
  return vec4f(0.0);
}
@fragment fn g() -> @location(0) vec4f { return vec4f(1.0); }
`);
    expect(d.map((x) => `${x.kind} ${x.name}`)).toEqual([
      "directive enable",
      "struct S",
      "var uniforms",
      "const K",
      "override flag",
      "fn f",
      "fn g",
    ]);
    const f = d.find((x) => x.name === "f")!;
    expect(f.params).toEqual(["u32", "ptr<function,S>", "vec4f"]);
    expect(f.result).toBe("vec4f");
    expect(f.line).toBe(9);
    expect(d.find((x) => x.name === "g")!.result).toBe("vec4f");
    expect(d.find((x) => x.name === "uniforms")!.attributes).toEqual({
      group: "2",
      binding: "10",
    });
  });
});

describe("the surface boundary", () => {
  it("is what opaque.wgsl and common.wgsl define", () => {
    expectProvides(SURFACE_BOUNDARY, [common, opaque]);
  });

  it("is met by the engine's own stages, opaque and translucent", () => {
    for (const units of [
      [common, opaque, stages],
      [common, opaque, translucent, moments, stages],
    ]) {
      expect(link(units, [SURFACE_BOUNDARY]).diagnostics).toEqual([]);
    }
  });

  it("is met by a custom shader's units, named values included", () => {
    const shader = new CustomShader({
      fragment:
        "fn fragmentMain(fsInput: FragmentInput, material: ptr<function, MaterialOutput>) { (*material).alpha = fsInput.metadata.t; }",
      attributes: { heat: { semantic: "_HEAT", type: "vec3f" } },
      metadata: { t: "f32", warp: "mat2x2f" },
      uniforms: { amount: { type: "f32", value: 1 } },
    });
    expect(
      shader.units.map((u) => u.name),
      "its units, each named for its diagnostics",
    ).toEqual(["vertex stage", "fragment stage", "contract", "uniforms"]);
    const linked = link([common, opaque, ...shader.units], [SURFACE_BOUNDARY]);
    expect(linked.diagnostics).toEqual([]);
  });

  it("reports a name defined twice, at both places", () => {
    const shader = new CustomShader({
      fragment: [
        "fn readNamed(a: u32) -> u32 { return a; }",
        "fn fragmentMain(fsInput: FragmentInput, material: ptr<function, MaterialOutput>) {}",
      ].join("\n"),
    });
    const message = linkFailure(
      link([common, opaque, ...shader.units], [SURFACE_BOUNDARY]),
    );
    expect(message).toMatch(
      /fragment stage line 1: `readNamed` is already defined \(opaque\.wgsl, line \d+\)/,
    );
  });

  it("reports a stage missing, or defined with other types", () => {
    const missing = link([common, opaque], [SURFACE_BOUNDARY]);
    expect(linkFailure(missing)).toMatch(
      /needs `fn cesiumVertexStage\(CesiumVertex\) -> CesiumVertexResult`; no unit defines it/,
    );
    const wrong = wgslUnit(
      "stages",
      `${DEFAULT_STAGES.replace("fn cesiumFragmentStage(f: CesiumFragment, material: ptr<function, MaterialOutput>) {}", "")}
fn cesiumFragmentStage(f: CesiumFragment) {}`,
    );
    expect(
      linkFailure(link([common, opaque, wrong], [SURFACE_BOUNDARY])),
    ).toMatch(
      /stages line 7: `cesiumFragmentStage` must be `fn cesiumFragmentStage\(CesiumFragment, ptr<function, MaterialOutput>\)`/,
    );
  });

  it("wants directives in the first unit", () => {
    const late = wgslUnit("late", "enable f16;\nfn x() {}");
    expect(linkFailure(link([common, late], []))).toMatch(
      /late line 1: `enable` must come first in the module/,
    );
  });

  it("maps a line of the module to its unit's line", () => {
    const a = wgslUnit("a", "fn a() {}\nfn b() {}");
    const b = wgslUnit("b", "fn c() {}\nfn d() {}\nfn e() {}");
    const linked = link([a, b], []);
    expect(linked.locate(2)).toEqual({ unit: "a", line: 2 });
    expect(linked.locate(4)).toEqual({ unit: "b", line: 2 });
    expect(
      compileFailure(linked, [
        { type: "error", lineNum: 5, message: "oops" } as GPUCompilationMessage,
      ]),
    ).toBe("test: b line 3: oops");
  });
});

describe("the styles' boundaries", () => {
  const pointCull = wgslUnit(
    "pointCull.slang",
    source("shaders/generated/pointCull.wgsl"),
  );
  const modelPool = wgslUnit(
    "modelPool.slang",
    source("shaders/generated/modelPool.wgsl"),
  );
  const uniforms = (group: number, binding: number) =>
    wgslUnit(
      "style uniforms",
      `struct Uniforms { _unused: f32 };\n@group(${group}) @binding(${binding}) var<uniform> uniforms: Uniforms;`,
    );

  it("are what the generated kernels export", () => {
    expectProvides(POINT_STYLE_BOUNDARY, [pointCull]);
    expectProvides(POOL_STYLE_BOUNDARY, [modelPool]);
  });

  it("are met by the engine's defaults and VectorStyle's output", () => {
    expect(
      link(
        [pointCull, uniforms(3, 0), wgslUnit("style", POINT_STYLE_DEFAULTS)],
        [POINT_STYLE_BOUNDARY],
      ).diagnostics,
    ).toEqual([]);
    const style = compileVectorStyle(
      {
        layers: [
          { id: "dots", shape: "'circle'", size: "6px" },
          { id: "trucks", shape: "model('truck')" },
        ],
        resources: { truck: { kind: "model", uri: "truck.gltf" } },
      },
      {},
    );
    const [shapes, models] = style.layers as unknown as [
      { kernel: string },
      { code: string },
    ];
    expect(
      link(
        [pointCull, uniforms(3, 0), wgslUnit("style", shapes.kernel)],
        [POINT_STYLE_BOUNDARY],
      ).diagnostics,
    ).toEqual([]);
    expect(
      link(
        [modelPool, uniforms(0, 6), wgslUnit("style", models.code)],
        [POOL_STYLE_BOUNDARY],
      ).diagnostics,
    ).toEqual([]);
  });
});
