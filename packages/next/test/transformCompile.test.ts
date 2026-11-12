// The transform graph compiler (plan 2026-11-12, task 4a), without a GPU:
// the generated code's structure, the uniform and per-draw layouts, the
// float64 centre constants against the route, which parameters are uniforms
// and which force a recompute, refusals, and caching. The GPU's numbers are
// spikes/transformGraph.ts's.
import { beforeEach, describe, expect, it } from "vitest";
import {
  geocentricToGeographic,
  utm,
  verticalExaggeration,
} from "../src/georeference/index.ts";
import {
  clearCompileCache,
  compileRoute,
  type CompiledRoute,
} from "../src/transform/compile.ts";
import {
  affine,
  routeBetween,
  smooth,
  TransformGraph,
  type Route,
} from "../src/transform/index.ts";
import { radialDistortion, twist } from "../src/transforms/index.ts";

const RAD = Math.PI / 180;

/** Column-major local-to-ECEF on the sphere-ish ENU frame at a point (a rigid map). */
function enu(lon: number, lat: number, h: number): Float64Array {
  const l = lon * RAD;
  const p = lat * RAD;
  const r = 6371000 + h;
  // prettier-ignore
  return Float64Array.from([
    -Math.sin(l), Math.cos(l), 0, 0,
    -Math.sin(p) * Math.cos(l), -Math.sin(p) * Math.sin(l), Math.cos(p), 0,
    Math.cos(p) * Math.cos(l), Math.cos(p) * Math.sin(l), Math.sin(p), 0,
    r * Math.cos(p) * Math.cos(l), r * Math.cos(p) * Math.sin(l), r * Math.sin(p), 1,
  ]);
}

function rigid(angle: number, t: ArrayLike<number>): Float64Array {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  // prettier-ignore
  return Float64Array.from([
    c, s, 0, 0,
    -s, c, 0, 0,
    0, 0, 1, 0,
    t[0]!, t[1]!, t[2]!, 1,
  ]);
}

function exaggerationRoute(factor = 10) {
  const graph = new TransformGraph();
  const world = graph.root("world");
  const view = graph.add(
    "view",
    world,
    affine({ matrix: rigid(0.5, [1000, -2000, 500]) }),
  );
  const ex = graph.add(
    "ex",
    view,
    verticalExaggeration({ factor, ceiling: 9000 }),
  );
  const content = graph.add(
    "content",
    ex,
    affine({ matrix: enu(8.5, 46.5, 0) }),
  );
  return { graph, ex, route: routeBetween(content, world) };
}

function utmRoute() {
  const graph = new TransformGraph();
  const world = graph.root("utm");
  const geo = graph.add("geo", world, utm({ zone: 31 }));
  const earth = graph.add("earth", geo, geocentricToGeographic());
  const ex = graph.add(
    "ex",
    earth,
    verticalExaggeration({ factor: 3, ceiling: 9000 }),
  );
  const content = graph.add("content", ex, affine({ matrix: enu(5, 46, 0) }));
  return { graph, ex, route: routeBetween(content, world) };
}

function twistRoute(rate = 0.001) {
  const graph = new TransformGraph();
  const world = graph.root("world");
  const view = graph.add(
    "view",
    world,
    affine({ matrix: rigid(0.3, [6378137.25, 12345.678, -9876.5]) }),
  );
  const tw = graph.add("tw", view, twist({ rate }));
  const content = graph.add(
    "content",
    tw,
    affine({ matrix: rigid(0, [1, 2, 3]) }),
  );
  return { graph, tw, route: routeBetween(content, world) };
}

function compiled(route: Route, options?: Parameters<typeof compileRoute>[1]) {
  const result = compileRoute(route, options);
  if (!result.ok) {
    throw new Error(result.reason);
  }
  return result;
}

/** The record's value at the centre plus the separable terms, in float64. */
function centreValue(
  c: CompiledRoute,
  record: Float32Array,
  values: Record<string, number>,
): number[] {
  const { outHi, outLo } = c.perDrawLayout.fields;
  return [0, 1, 2].map((a) => {
    let v = record[outHi! + a]! + record[outLo! + a]!;
    for (const key of c.separableParams) {
      const g = c.perDrawLayout.fields[`outG:${key}`]!;
      v += values[key]! * (record[g + a]! + record[g + 4 + a]!);
    }
    return v;
  });
}

beforeEach(() => clearCompileCache());

describe("generated code", () => {
  it("defines the point and normal functions on the stated signatures", () => {
    const c = compiled(exaggerationRoute().route);
    expect(c.wgsl).toContain(
      "fn transformPoint(pLocal: vec3f, c: DrawCentre, u: RouteUniforms) -> vec3f",
    );
    expect(c.wgsl).toContain(
      "fn transformNormal(nLocal: vec3f, pLocal: vec3f, c: DrawCentre, u: RouteUniforms) -> vec3f",
    );
    expect(c.wgsl).toContain("fn transformNormalTangent(");
    expect(c.wgsl).toContain("fn routeJacobian(");
    expect(c.wgsl).toContain("struct DrawCentre {");
    expect(c.wgsl).toContain("struct RouteUniforms {");
    expect(c.wgsl).toContain("fn transformVertex(");
    expect(c.wgsl).toContain("fn tgCofactor(");
  });

  it("collapses affine runs into 3×3s and gives each smooth step a function", () => {
    const c = compiled(exaggerationRoute().route);
    const point = /fn transformPoint[\s\S]*?\n}\n/.exec(c.wgsl)![0];
    // affine, smooth, affine: two matrices around one step
    expect(point.match(/mat3x3f\(/g)).toHaveLength(2);
    expect(point.match(/tgStep\d+\(/g)).toEqual(["tgStep0("]);
    expect(c.uniformsLayout.fields).toHaveProperty("affine0");
    expect(c.uniformsLayout.fields).toHaveProperty("affine2");
    const nested = compiled(utmRoute().route);
    expect(nested.wgsl).toContain("fn tgStep2(");
    expect(nested.wgsl).not.toContain("fn tgStep3(");
  });

  it("evaluates through the residual rules, with no float32 trigonometry on whole values", () => {
    const c = compiled(utmRoute().route);
    const steps = c.wgsl
      .split("\n")
      .filter((line) => line.startsWith("  let d"));
    expect(steps.length).toBeGreaterThan(100);
    expect(steps.some((line) => /tg_atan2\(/.test(line))).toBe(true);
    expect(steps.some((line) => /\b(sin|cos|atan2|exp|log)\(/.test(line))).toBe(
      false,
    );
    expect(c.approximations).toEqual([]);
  });

  it("leaves out the normal code when asked", () => {
    const withNormals = compiled(exaggerationRoute().route);
    const without = compiled(exaggerationRoute().route, { normals: false });
    expect(without.wgsl).not.toContain("transformNormal");
    expect(without.wgsl).toContain("fn transformPoint(");
    expect(without.perDrawLayout.floats).toBeLessThan(
      withNormals.perDrawLayout.floats / 3,
    );
    expect(without.key).not.toBe(withNormals.key);
  });

  it("emits a df64 compute pass with the stated bindings", () => {
    const c = compiled(twistRoute().route);
    const text = c.centreConstantsWgsl!;
    expect(text).toContain("fn centreConstants(");
    expect(text).toContain("@group(0) @binding(0) var<uniform> cu");
    expect(text).toContain(
      "@group(0) @binding(2) var<storage, read_write> records",
    );
    expect(text).toContain("fn df_sincos(");
    expect(c.centreBindings).toEqual({ uniforms: 0, centres: 1, records: 2 });
    expect(
      compiled(twistRoute().route, { centreCompute: false })
        .centreConstantsWgsl,
    ).toBeUndefined();
  });
});

describe("layouts", () => {
  it("has non-overlapping 4-aligned records and the named header fields", () => {
    for (const { route } of [exaggerationRoute(), utmRoute(), twistRoute()]) {
      const c = compiled(route);
      expect(c.perDrawLayout.floats % 4).toBe(0);
      expect(c.uniformsLayout.floats % 4).toBe(0);
      const draw = c.perDrawLayout.fields;
      expect(draw.outHi! % 4).toBe(0);
      expect(draw.outLo! % 4).toBe(0);
      const offsets = Object.values(draw);
      expect(new Set(offsets).size).toBe(offsets.length);
      expect(Math.max(...offsets)).toBeLessThan(c.perDrawLayout.floats);
      expect(c.uniformsLayout.fields.eyeHi! % 4).toBe(0);
      expect(Math.max(...Object.values(c.uniformsLayout.fields))).toBeLessThan(
        c.uniformsLayout.floats,
      );
    }
  });

  it("keeps the exaggeration factor a uniform and recomputes for the rest", () => {
    const c = compiled(exaggerationRoute().route);
    expect(c.separableParams).toEqual(["verticalExaggeration.factor"]);
    expect([...c.dynamicParams].sort()).toEqual([
      "verticalExaggeration.band",
      "verticalExaggeration.baseHeight",
      "verticalExaggeration.ceiling",
    ]);
    expect(c.uniformsLayout.fields).toHaveProperty(
      "param:verticalExaggeration.factor",
    );
    expect(c.perDrawLayout.fields).toHaveProperty(
      "outG:verticalExaggeration.factor",
    );
  });

  it("takes only the last smooth step's separable parameters (the nested route)", () => {
    const c = compiled(utmRoute().route);
    expect([...c.separableParams].sort()).toEqual([
      "transverseMercator.falseEasting",
      "transverseMercator.falseNorthing",
      "transverseMercator.scaleFactor",
    ]);
    // the exaggeration is not last: its factor feeds the next step's centre
    expect(c.dynamicParams).toContain("verticalExaggeration.factor");
    expect(c.dynamicParams).toContain("transverseMercator.centralMeridian");
  });

  it("marks a twist's parameters dynamic and a lens's separable", () => {
    const t = compiled(twistRoute().route);
    expect(t.separableParams).toEqual([]);
    expect(t.dynamicParams).toContain("twist.rate");
    const lens = new TransformGraph();
    const world = lens.root("world");
    const cam = lens.add("cam", world, affine({ matrix: rigid(0, [0, 0, 0]) }));
    const node = lens.add("lens", cam, radialDistortion({ k1: -0.1 }));
    const l = compiled(routeBetween(node, world));
    expect(l.dynamicParams).toEqual([]);
    expect(l.separableParams).toHaveLength(5);
  });

  it("demotes a declared-separable parameter the function is nonlinear in", () => {
    const graph = new TransformGraph();
    const world = graph.root("world");
    const make = (source: string) =>
      smooth({
        id: "custom",
        forward(p, params, out) {
          out[0] = p[0]! + params.k!;
          out[1] = p[1]!;
          out[2] = p[2]!;
        },
        params: { k: 2 },
        source,
        separable: ["k"],
      });
    const linear = graph.add(
      "linear",
      world,
      make("(p, params) => [p[0] + params.k * p[1], p[1], p[2]]"),
    );
    const bent = graph.add(
      "bent",
      world,
      make("(p, params) => [p[0] * Math.exp(params.k), p[1], p[2]]"),
    );
    const a = compiled(routeBetween(linear, world));
    expect(a.separableParams).toEqual(["custom.k"]);
    expect(a.dynamicParams).toEqual([]);
    clearCompileCache();
    const b = compiled(routeBetween(bent, world));
    expect(b.separableParams).toEqual([]);
    expect(b.dynamicParams).toEqual(["custom.k"]);
  });
});

describe("float64 centre constants", () => {
  it("carry the route's value at the centre, in hi and lo", () => {
    const { route } = exaggerationRoute();
    const c = compiled(route);
    for (const centre of [
      [1234.5, -20000.25, 1500],
      [-30000, 4000, 0],
      [0.25, 0.5, 2999.75],
    ]) {
      const record = c.centreConstants(centre);
      const truth = route.forward(centre);
      const got = centreValue(c, record, c.paramValues(route));
      for (let a = 0; a < 3; a++) {
        expect(Math.abs(got[a]! - truth[a]!)).toBeLessThan(1e-5);
      }
    }
  });

  it("follow a separable parameter with no recompute", () => {
    const { graph, ex, route } = exaggerationRoute(10);
    const c = compiled(route);
    const centre = [4000, -3000, 1200];
    const record = c.centreConstants(centre);
    graph.setParams(ex, { factor: 3.5 });
    // same record, the factor read from the uniform's value
    const got = centreValue(c, record, c.paramValues(route));
    const truth = route.forward(centre);
    for (let a = 0; a < 3; a++) {
      expect(Math.abs(got[a]! - truth[a]!)).toBeLessThan(1e-5);
    }
  });

  it("follow a dynamic parameter when recomputed", () => {
    const { graph, tw, route } = twistRoute(0.001);
    const c = compiled(route);
    const centre = [800, -1500, 2500];
    const before = c.centreConstants(centre);
    graph.setParams(tw, { rate: 0.0007 });
    const after = c.centreConstants(centre);
    expect(Array.from(after)).not.toEqual(Array.from(before));
    const got = centreValue(c, after, c.paramValues(route));
    const truth = route.forward(centre);
    for (let a = 0; a < 3; a++) {
      expect(Math.abs(got[a]! - truth[a]!)).toBeLessThan(1e-5);
    }
  });

  it("agree with the route through nested smooth steps", () => {
    const { route } = utmRoute();
    const c = compiled(route);
    const centre = [12000, -8000, 900];
    const got = centreValue(c, c.centreConstants(centre), c.paramValues(route));
    const truth = route.forward(centre);
    for (let a = 0; a < 3; a++) {
      expect(Math.abs(got[a]! - truth[a]!)).toBeLessThan(1e-4);
    }
  });

  it("take parameter values given by name", () => {
    const { route } = twistRoute(0.001);
    const c = compiled(route);
    const centre = [100, 200, 300];
    const values = { ...c.paramValues(route), "twist.rate": 0.002 };
    const record = c.centreConstants(centre, values);
    const same = c.centreConstants(centre, c.paramValues(route));
    expect(Array.from(record)).not.toEqual(Array.from(same));
  });

  it("fill the per-view uniforms with the matrices, the parameters and the eye", () => {
    const { route } = exaggerationRoute(6);
    const c = compiled(route);
    const eye = [6378137.123456, -1234.5678, 987.6543];
    const uniforms = c.fillUniforms(route, undefined, eye);
    expect(uniforms).toHaveLength(c.uniformsLayout.floats);
    const {
      eyeHi,
      eyeLo,
      affine0,
      ["param:verticalExaggeration.factor"]: p,
    } = c.uniformsLayout.fields;
    for (let a = 0; a < 3; a++) {
      expect(uniforms[eyeHi! + a]! + uniforms[eyeLo! + a]!).toBeCloseTo(
        eye[a]!,
        6,
      );
    }
    const m = (route.steps[0] as { matrix: Float64Array }).matrix;
    for (let col = 0; col < 3; col++) {
      for (let row = 0; row < 3; row++) {
        expect(uniforms[affine0! + 4 * col + row]).toBeCloseTo(
          m[4 * col + row]!,
          6,
        );
      }
    }
    expect(uniforms[p!]! + uniforms[p! + 1]!).toBeCloseTo(6, 10);
  });
});

describe("refusals and caching", () => {
  function customRoute(source: string | undefined, down = false) {
    const graph = new TransformGraph();
    const world = graph.root("world");
    const node = graph.add(
      "custom",
      world,
      smooth({
        id: "custom",
        forward(p, _params, out) {
          out[0] = Math.tanh(p[0]!);
          out[1] = p[1]!;
          out[2] = p[2]!;
        },
        params: {},
        ...(source !== undefined && { source }),
      }),
    );
    return down ? routeBetween(world, node) : routeBetween(node, world);
  }

  it("refuses a smooth step with no source, naming it", () => {
    const result = compileRoute(customRoute(undefined));
    expect(result.ok).toBe(false);
    expect(!result.ok && result.reason).toMatch(
      /"custom".*no restricted-JS source/,
    );
  });

  it("refuses a source outside the subset, with the construct", () => {
    const result = compileRoute(
      customRoute("(p, params) => [helper(p[0]), p[1], p[2]]"),
    );
    expect(result.ok).toBe(false);
    expect(!result.ok && result.reason).toContain('"custom"');
  });

  it("refuses a step the route takes through its inverse", () => {
    const result = compileRoute(
      customRoute("(p, params) => [Math.tanh(p[0]), p[1], p[2]]", true),
    );
    expect(result.ok).toBe(false);
    expect(!result.ok && result.reason).toMatch(/inverse/);
  });

  it("compiles a plain function with a source", () => {
    const result = compileRoute(
      customRoute("(p, params) => [Math.tanh(p[0]), p[1], p[2]]"),
    );
    expect(result.ok).toBe(true);
  });

  it("caches by shape: parameter values do not change the key, sources do", () => {
    const a = compiled(exaggerationRoute(10).route);
    const b = compiled(exaggerationRoute(2).route);
    expect(b.key).toBe(a.key);
    expect(b.wgsl).toBe(a.wgsl);
    expect(a.key.startsWith(exaggerationRoute().route.shapeKey)).toBe(true);
    const other = compiled(twistRoute().route);
    expect(other.key).not.toBe(a.key);
    const first = compileRoute(
      customRoute("(p, params) => [Math.tanh(p[0]), p[1], p[2]]"),
    );
    const second = compileRoute(
      customRoute("(p, params) => [Math.atan(p[0]), p[1], p[2]]"),
    );
    expect(first.ok && second.ok && first.key !== second.key).toBe(true);
  });

  it("builds the same program after the cache is cleared", () => {
    const a = compiled(utmRoute().route);
    clearCompileCache();
    const b = compiled(utmRoute().route);
    expect(b.wgsl).toBe(a.wgsl);
    expect(b.perDrawLayout).toEqual(a.perDrawLayout);
  });
});
