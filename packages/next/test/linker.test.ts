import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  POINT_STYLE_BOUNDARY,
  POOL_STYLE_BOUNDARY,
  SURFACE_BOUNDARY,
  SURFACE_VERTEX_BOUNDARY,
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
const surface = wgslUnit(
  "surface.slang",
  source("shaders/generated/surface.wgsl"),
);
const vertex = wgslUnit(
  "surfaceVertex.wgsl",
  source("shaders/surfaceVertex.wgsl"),
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
const SURFACE = [SURFACE_BOUNDARY, SURFACE_VERTEX_BOUNDARY];
/** The engine's side of the surface boundary, as RenderContext links it. */
const engine = [surface, vertex, moments];

/** A struct's `@location`ed fields by name (Slang's numbered suffix off). */
function locations(code: string, struct: string): Map<string, number> {
  const body = new RegExp(`struct ${struct}\\s*\\{([^}]*)\\}`).exec(code);
  expect(body, struct).not.toBeNull();
  return new Map(
    [
      ...body![1]!.matchAll(
        /@location\((\d+)\)\s*(?:@\w+\([^)]*\)\s*)*(\w+?)(?:_\d+)?\s*:/g,
      ),
    ].map((m) => [m[2]!, Number(m[1])]),
  );
}

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
  it("is what surface.slang exports", () => {
    expectProvides(SURFACE_BOUNDARY, [surface]);
    expectProvides(SURFACE_VERTEX_BOUNDARY, [vertex]);
  });

  it("is met by the engine's own stages", () => {
    expect(link([...engine, stages], SURFACE).diagnostics).toEqual([]);
  });

  it("passes the vertex entries' outputs to the fragment entries' inputs", () => {
    const out = locations(vertex.code, "VsOut");
    const pickOut = locations(vertex.code, "VsPickOut");
    const fields = [...surface.code.matchAll(/struct (pixelInput_\d+)/g)].map(
      (m) => m[1]!,
    );
    expect(fields.length, "every fragment entry point's inputs").toBe(25);
    // The pick variant's vertex entries put out the same, and the triangle
    // number (flat) one location past them.
    expect(pickOut).toEqual(new Map([...out, ["triangle", out.size]]));
    let picks = 0;
    for (const name of fields) {
      // Each entry point's inputs are those `VsOut` puts out, at its
      // locations (an entry may read fewer: none here do); the pick
      // variant's, those of `VsPickOut`.
      const inputs = locations(surface.code, name);
      if (inputs.has("triangle")) {
        picks++;
        expect(inputs, name).toEqual(pickOut);
      } else {
        expect(inputs, name).toEqual(out);
      }
    }
    expect(picks, "the pick variant's fragment entry points").toBe(2);
    // And `SurfaceVertex` is `VsOut`'s fields in its order.
    const vertexFields = /struct SurfaceVertex\s*\{([^}]*)\}/
      .exec(surface.code)![1]!
      .match(/\b(\w+)\s*:/g)!
      .map((f) => f.replace(/\s*:$/, ""));
    expect(vertexFields).toEqual(["position", ...out.keys()]);
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
    const linked = link([...engine, ...shader.units], SURFACE);
    expect(linked.diagnostics).toEqual([]);
  });

  it("reports a name defined twice, at both places", () => {
    const shader = new CustomShader({
      fragment: [
        "fn readNamed(a: u32) -> u32 { return a; }",
        "fn fragmentMain(fsInput: FragmentInput, material: ptr<function, MaterialOutput>) {}",
      ].join("\n"),
    });
    const message = linkFailure(link([...engine, ...shader.units], SURFACE));
    expect(message).toMatch(
      /fragment stage line 1: `readNamed` is already defined \(surface\.slang, line \d+\)/,
    );
  });

  it("reports a stage missing, or defined with other types", () => {
    const missing = link(engine, SURFACE);
    expect(linkFailure(missing)).toMatch(
      /needs `fn cesiumVertexStage\(CesiumVertex\) -> CesiumVertexResult`; no unit defines it/,
    );
    const wrong = wgslUnit(
      "stages",
      `${DEFAULT_STAGES.replace("fn cesiumFragmentStage(f: CesiumFragment, material: ptr<function, MaterialOutput>) {}", "")}
fn cesiumFragmentStage(f: CesiumFragment) {}`,
    );
    expect(linkFailure(link([...engine, wrong], SURFACE))).toMatch(
      /stages line 7: `cesiumFragmentStage` must be `fn cesiumFragmentStage\(CesiumFragment, ptr<function, MaterialOutput>\)`/,
    );
  });

  it("wants directives in the first unit", () => {
    const late = wgslUnit("late", "enable f16;\nfn x() {}");
    expect(linkFailure(link([surface, late], []))).toMatch(
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
