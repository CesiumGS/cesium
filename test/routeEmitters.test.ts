// CS-54: compiled routes on both emitters. The Node half: every built-in's
// route is written in WGSL and GLSL ES 3.00 with the same structs, functions
// and statements; the WGSL is CS-53's (the golden fixtures,
// `transformGolden.test.ts`, hold it byte for byte up to renumbering); the
// name-prefix option keeps two routes' names apart, and naga accepts two
// prefixed routes in one WGSL module (and two prefixed Cesium IR programs);
// and the WebGL 2 corridor baseline's float64 half holds: the map WebGL 2
// draws from (the CPU's center constants) within 10⁻⁸ m of the CPU map, and
// the Jacobian program within 10⁻⁹ of the analytic one. The GPU half (the
// readback of every route on both backends, the float32 change from the draw
// center under 0.1 mm, and two prefixed routes linked into one program) runs
// in the browser suites, `dyno lab irWgsl irGlsl`: the corridor rows' `drawn`
// bound holds the drawn position to 0.1 mm there, and the last test here
// checks that bound fails a GPU answer that misses it.
import { describe, expect, it } from "vitest";
import { ROAD } from "../examples/transform-graph/data/road.ts";
import {
  Builder,
  emitGlsl,
  emitWgsl,
  type Program,
} from "../packages/core/src/ir/index.ts";
import { fromFixParts } from "../packages/core/src/transform/centerTerm.ts";
import {
  clearCompileCache,
  compileRoute,
  type CompiledRoute,
} from "../packages/core/src/transform/compile.ts";
import {
  affine,
  evaluate,
  routeBetween,
  TransformGraph,
} from "../packages/core/src/transform/index.ts";
import {
  CENTER,
  compareRoute,
  CORRIDOR_CHANGE_M,
  CORRIDOR_DRAWN_M,
  expectedRoute,
  newRouteRow,
  routeKernelGlsl,
  routeKernelWgsl,
  routeOutStride,
  ROUTE_OUT_FLOATS,
} from "../packages/core/src/transform/routeReadback.ts";
import { routeCases } from "../packages/core/src/transforms/routeCases.ts";
import {
  corridorUnroll,
  corridorUnrollDescriptor,
  twist,
  type CorridorOptions,
} from "../packages/core/src/transforms/index.ts";
import { defaultParams } from "../packages/core/src/transforms/descriptor.ts";

interface Naga {
  parseWgsl(source: string): unknown;
  validate(module: unknown): unknown;
  writeWgsl(module: unknown, info: unknown): string;
}

// naga-wasm is a devDependency; a missing package skips the naga cases (as in irWgsl.test.ts).
const naga: Naga | undefined = await import("naga-wasm").then(
  (m) => m as unknown as Naga,
  (error: unknown) => {
    if ((error as { code?: string }).code === "ERR_MODULE_NOT_FOUND") {
      return undefined;
    }
    throw error;
  },
);

const IDENTITY = Float64Array.of(
  1,
  0,
  0,
  0,
  0,
  1,
  0,
  0,
  0,
  0,
  1,
  0,
  0,
  0,
  0,
  1,
);

const cases = routeCases();

/** Module-scope functions and structs, in order: WGSL's `fn f(` and `struct S`, GLSL's `T f(` and `struct S`. */
function declared(code: string, lang: "wgsl" | "glsl"): string[] {
  const pattern =
    lang === "wgsl"
      ? /^(?:fn|struct) ([A-Za-z_]\w*)/gm
      : /^(?:struct ([A-Za-z_]\w*)|[A-Za-z_]\w* ([A-Za-z_]\w*)\()/gm;
  return [...code.matchAll(pattern)].map((m) => (m[1] ?? m[2])!);
}

/** Each function's statement count (lines ending in `;` inside it), by name. */
function statements(code: string, lang: "wgsl" | "glsl"): Map<string, number> {
  const out = new Map<string, number>();
  let current: string | undefined;
  for (const line of code.split("\n")) {
    const head =
      lang === "wgsl"
        ? /^fn ([A-Za-z_]\w*)\(/.exec(line)
        : /^[A-Za-z_]\w* ([A-Za-z_]\w*)\(/.exec(line);
    if (head) {
      current = head[1]!;
      out.set(current, 0);
    } else if (line === "}") {
      current = undefined;
    } else if (current && line.trimEnd().endsWith(";")) {
      out.set(current, out.get(current)! + 1);
    }
  }
  return out;
}

function corridorRoute(options: CorridorOptions, prefix = "") {
  const graph = new TransformGraph();
  const world = graph.root("world");
  const unroll = graph.add("corridor", world, corridorUnroll(options));
  const content = graph.add("content", unroll, affine({ matrix: IDENTITY }));
  const route = routeBetween(content, world);
  const compiled = compileRoute(route, { prefix });
  if (!compiled.ok) {
    throw new Error(compiled.reason);
  }
  return { route, compiled };
}

describe("the route cases", () => {
  it("are there, one curvilinear step to a route (what the readback's expected J reads)", () => {
    expect(cases.length).toBeGreaterThan(0);
    for (const c of cases) {
      for (const u of c.routes) {
        expect(u.compiled.steps, c.name).toHaveLength(1);
      }
    }
  });
});

describe("every built-in's route in both languages", () => {
  const MODES = [
    ["exact", {}],
    ["linear", { normals: "linear" }],
    ["auto", { normals: "auto" }],
    ["none", { normals: false }],
  ] as const;
  const seen = new Set<string>();
  for (const c of cases) {
    const unit = c.routes[0]!;
    const name = c.name.replace(/ @\d+$/, "");
    if (c.routes.length > 1 || seen.has(name)) {
      continue;
    }
    seen.add(name);
    it(`${name}: the same structs, functions and statements, in every normals mode`, () => {
      for (const [mode, options] of MODES) {
        clearCompileCache();
        const r = compileRoute(unit.route, options);
        expect(r.ok, mode).toBe(true);
        const compiled = r as CompiledRoute;
        for (const [w, g] of [
          [compiled.wgsl, compiled.glsl],
          [compiled.positionWgsl, compiled.positionGlsl],
        ] as const) {
          expect(declared(g, "glsl"), mode).toEqual(declared(w, "wgsl"));
          expect(statements(g, "glsl"), mode).toEqual(statements(w, "wgsl"));
          expect(g.replace(/\/\/.*$/gm, ""), mode).not.toMatch(
            /\b(?:let|var|fn|select|vec[234]f|mat3x3f|atan2|f32|ptr)\b/,
          );
        }
      }
    });
  }

  it("spells select as the ternary and leaves the slots alone", () => {
    clearCompileCache();
    const { compiled } = corridorRoute({
      polyline: [
        [0, 0],
        [100, 10],
        [180, 40],
      ],
    });
    // The corridor's segment choice is a select: tg_select and comparisons.
    expect(compiled.wgsl).toMatch(/select\(0\.0, 1\.0, /);
    expect(compiled.glsl).toMatch(/\? 1\.0 : 0\.0\)/);
    const slots = (code: string) =>
      [...code.matchAll(/\b[cu]\.v\d+\.[xyzw]+/g)].map((m) => m[0]);
    expect(slots(compiled.glsl)).toEqual(slots(compiled.wgsl));
  });

  it("has no GLSL form for the df64 center pass: WebGL 2's center constants come from the CPU", () => {
    clearCompileCache();
    const { compiled } = corridorRoute({
      polyline: [
        [0, 0],
        [100, 10],
        [180, 40],
      ],
    });
    expect(compiled.centerConstantsWgsl).toBeDefined();
    expect(compiled.glsl).not.toContain("centerConstants");
    expect(compiled.dynamicParams.length).toBeGreaterThan(0);
  });
});

describe("the name-prefix option", () => {
  it("puts the prefix before every module-scope name and changes nothing else", () => {
    clearCompileCache();
    const plain = corridorRoute({
      polyline: [
        [0, 0],
        [100, 10],
        [180, 40],
      ],
    }).compiled;
    clearCompileCache();
    const a = corridorRoute(
      {
        polyline: [
          [0, 0],
          [100, 10],
          [180, 40],
        ],
      },
      "q7_",
    ).compiled;
    expect(plain.prefix).toBe("");
    expect(a.prefix).toBe("q7_");
    expect(a.key).not.toBe(plain.key);
    for (const [lang, p, q] of [
      ["wgsl", plain.wgsl, a.wgsl],
      ["glsl", plain.glsl, a.glsl],
      ["wgsl", plain.positionWgsl, a.positionWgsl],
      ["glsl", plain.positionGlsl, a.positionGlsl],
    ] as const) {
      const names = declared(p, lang);
      expect(declared(q, lang)).toEqual(names.map((n) => `q7_${n}`));
      expect(q.replace(/\bq7_/g, "")).toBe(p);
    }
    // The compute pass is a module of its own and keeps its names.
    expect(a.centerConstantsWgsl).toBe(plain.centerConstantsWgsl);
  });

  it("makes the GLSL on first read, and spreading a route doesn't", () => {
    clearCompileCache();
    const { compiled } = corridorRoute({
      polyline: [
        [0, 0],
        [100, 10],
      ],
    });
    expect(Object.keys(compiled)).not.toContain("glsl");
    expect(Object.keys(compiled)).not.toContain("positionGlsl");
    const spread = { ...compiled } as Partial<CompiledRoute>;
    expect(spread.glsl).toBeUndefined();
    expect(compiled.glsl).toContain("tgRoute(");
  });

  it("refuses a prefix that can't start a name in both languages", () => {
    const graph = new TransformGraph();
    const world = graph.root("world");
    const tw = graph.add("tw", world, twist({ rate: 0.001 }));
    const content = graph.add("content", tw, affine({ matrix: IDENTITY }));
    const route = routeBetween(content, world);
    for (const bad of ["1a", "a__", "_a", "gl-", "a b"]) {
      expect(() => compileRoute(route, { prefix: bad }), bad).toThrow(/prefix/);
    }
  });

  it("keeps two prefixed routes' names apart in both languages", () => {
    const two = cases.find((c) => c.routes.length === 2)!;
    const [a, b] = two.routes as [
      (typeof two.routes)[0],
      (typeof two.routes)[0],
    ];
    for (const lang of ["wgsl", "glsl"] as const) {
      const na = declared(a.compiled[lang], lang);
      const nb = new Set(declared(b.compiled[lang], lang));
      expect(na.length).toBeGreaterThan(10);
      expect(na.filter((n) => nb.has(n))).toEqual([]);
    }
    // One GLSL shader holds both, each declared once.
    const k = routeKernelGlsl(two);
    const names = declared(k.code, "glsl");
    expect(new Set(names).size).toBe(names.length);
    expect(k.varyings).toHaveLength(10);
  });

  it.skipIf(!naga)(
    "naga accepts two prefixed routes in one WGSL module",
    () => {
      const two = cases.find((c) => c.routes.length === 2)!;
      const k = routeKernelWgsl(two);
      expect(k.code).toContain("a_tgRoute(p, rc0, ru0, &j0)");
      expect(k.code).toContain("b_tgRoute(p, rc1, ru1, &j1)");
      naga!.validate(naga!.parseWgsl(k.code));
    },
  );

  it.skipIf(!naga)(
    "naga's own list of module-scope names in two prefixed routes: each carries its prefix",
    () => {
      // Independent of the prefix pass's declaration pattern: naga parses the
      // two modules and writes them back, with every module-scope name it
      // holds (functions, structs, constants, globals, aliases).
      const two = cases.find((c) => c.routes.length === 2)!;
      const module = naga!.parseWgsl(
        two.routes.map((u) => u.compiled.wgsl).join("\n"),
      );
      const written = naga!.writeWgsl(module, naga!.validate(module));
      const names = [
        ...written.matchAll(
          /^(?:fn|struct|const|override|alias|var(?:<[^>]*>)?) ([A-Za-z_]\w*)/gm,
        ),
      ].map((m) => m[1]!);
      expect(names.length).toBeGreaterThan(20);
      expect(names.filter((n) => !/^(?:a_|b_)/.test(n))).toEqual([]);
      expect(names.filter((n) => n.startsWith("a_")).length).toBeGreaterThan(
        10,
      );
      expect(names.filter((n) => n.startsWith("b_")).length).toBeGreaterThan(
        10,
      );
    },
  );

  it.skipIf(!naga)("naga accepts every route readback kernel", () => {
    for (const c of cases) {
      naga!.validate(naga!.parseWgsl(routeKernelWgsl(c).code));
    }
  });

  it.skipIf(!naga)(
    "Cesium IR's emitters: two prefixed programs share one module",
    () => {
      const program = (k: number): Program => {
        const b = new Builder();
        const x = b.input("x", "float", "vertex");
        const g = b.input("gain", "float", "uniform");
        const s = b.literal("bias", k);
        return b.program({
          y: b.op("math/add", [b.op("math/mul", [x, g]), s]),
        });
      };
      const wa = emitWgsl(program(1), { prefix: "a_", binding: 0 });
      const wb = emitWgsl(program(2), { prefix: "b_", binding: 1 });
      expect([wa.fn, wa.outStruct, wb.fn, wb.outStruct]).toEqual([
        "a_cir_main",
        "a_CirOut",
        "b_cir_main",
        "b_CirOut",
      ]);
      const module = [
        wa.code,
        wb.code,
        "@compute @workgroup_size(1) fn both() {",
        `  let r = ${wa.fn}(1.0).y + ${wb.fn}(2.0).y;`,
        "}",
      ].join("\n");
      naga!.validate(naga!.parseWgsl(module));
      // The default is today's output.
      expect(emitWgsl(program(1)).code).toBe(wa.code.replace(/\ba_/g, ""));
      const ga = emitGlsl(program(1), { prefix: "a_" });
      const gb = emitGlsl(program(2), { prefix: "b_" });
      expect([ga.uniformBlock, gb.uniformBlock]).toEqual([
        "a_CirUniforms",
        "b_CirUniforms",
      ]);
      const names = (code: string) => declared(code, "glsl");
      expect(names(ga.code).filter((n) => names(gb.code).includes(n))).toEqual(
        [],
      );
      expect(emitGlsl(program(1)).code).toBe(ga.code.replace(/\ba_/g, ""));
      expect(() => emitGlsl(program(1), { prefix: "a__" })).toThrow(/reserved/);
      expect(() => emitWgsl(program(1), { prefix: "1" })).toThrow(/WGSL name/);
    },
  );
});

describe("the WebGL 2 corridor baseline, its float64 half", () => {
  /** The road in plan meters about its middle, as corridorUnrollCompiled.test.ts has it. */
  const road = ROAD.map(
    ([lon, lat]) => [(lon - 7.765) * 77_000, (lat - 46.045) * 111_000] as const,
  );
  const mixed: CorridorOptions = {
    start: [100, -50],
    heading: 0.3,
    station: 1000,
    elements: [
      { kind: "line", length: 400 },
      { kind: "arc", length: 380, radius: 650 },
      { kind: "line", length: 250 },
      { kind: "arc", length: 600, radius: -900 },
      { kind: "line", length: 1400 },
      { kind: "arc", length: 500, radius: 1500 },
      { kind: "line", length: 40 },
    ],
  };
  for (const [name, options, offsets] of [
    ["the 39-line road", { polyline: road }, [-35, 0, 35, 1500, -1500]],
    ["lines and arcs", mixed, [-300, 0, 300, 600, -600]],
  ] as const) {
    it(`${name}: the CPU's center constants (WebGL 2's map) within 10⁻⁸ m, and the Jacobian program within 10⁻⁹`, () => {
      clearCompileCache();
      const descriptor = corridorUnrollDescriptor(options);
      const params = defaultParams(descriptor);
      const { compiled } = corridorRoute(options);
      const layout = compiled.perDrawLayout.fields;
      const step = compiled.steps[0]!;
      const joins = Object.keys(params)
        .filter((k) => /^s\d+$/.test(k) || k === "se")
        .map((k) => params[k]!);
      const first = Math.min(...joins);
      const last = Math.max(...joins);
      const stations = [
        ...joins.flatMap((s) => [s - 1e-6, s, s + 1e-6]),
        ...Array.from(
          { length: 81 },
          (_, i) => first + ((last - first) * i) / 80 + 0.137,
        ),
      ];
      const want = new Float64Array(3);
      const analytic = new Float64Array(9);
      let mapM = 0;
      let jac = 0;
      for (const s of stations) {
        for (const o of offsets) {
          const c = [s, o, 12.5];
          descriptor.forward(c, params, want, analytic);
          // What WebGL 2 draws from: the record's F(c) as the center term's parts, from float64 on the CPU.
          const record = compiled.centerConstants(c);
          for (let a = 0; a < 3; a++) {
            const got = fromFixParts(record, layout.out! + 4 * a);
            mapM = Math.max(mapM, Math.abs(got - want[a]!));
          }
          // The Jacobian program both emitters' normals come from, in float64 (row-major).
          const j = evaluate(step.jacobian!, c, params);
          for (let r = 0; r < 3; r++) {
            for (let k = 0; k < 3; k++) {
              jac = Math.max(
                jac,
                Math.abs(j[3 * r + k]! - analytic[3 * k + r]!),
              );
            }
          }
        }
      }
      expect(
        mapM,
        `the map is ${mapM} m from the CPU map; 1e-8 m allowed`,
      ).toBeLessThan(1e-8);
      expect(
        jac,
        `the Jacobian is ${jac} (dimensionless) from the analytic one; 1e-9 allowed`,
      ).toBeLessThan(1e-9);
    });
  }

  it("the GPU half holds the drawn position, and the change from the draw center, to 0.1 mm, in meters", () => {
    // The eye at the image: the eye-away cases hold the center term alone,
    // since a float32 position d from the eye can't keep 0.1 mm past 1.7 km.
    const corridor = cases.filter(
      (c) =>
        !c.eyes &&
        (c.name.startsWith("route: corridorUnroll") || c.routes.length === 2),
    );
    expect(corridor.length).toBeGreaterThan(0);
    expect(CORRIDOR_CHANGE_M).toBe(1e-4);
    expect(CORRIDOR_DRAWN_M).toBe(1e-4);
    for (const c of corridor) {
      expect(c.units).toBe("m");
      expect(c.position.abs).toBe(CORRIDOR_CHANGE_M);
      expect(c.drawn, c.name).toEqual({ abs: CORRIDOR_DRAWN_M, rel: 0 });
      // The center term may not take the rest: it is held to its derived
      // bound at its own parts (CS-921, CS-986), under 10⁻¹³ m here.
      expect(c.center, c.name).toEqual(CENTER);
      expect(CENTER).toEqual({ abs: 0, rel: 1 });
    }
    // The readback's comparison, on GPU answers made from the float64 ones:
    // exact, then off by 0.07 mm in the center term and 0.07 mm in the change.
    // The change bound passes them; the center bound (its derived bound
    // since CS-921) and the drawn position (0.14 mm) fail.
    const c = corridor[0]!;
    const want = expectedRoute(c);
    const exact = Float32Array.from(want);
    const exactRow = newRouteRow(c);
    compareRoute(exactRow, c, exact);
    expect(exactRow.pass, "exact answers pass").toBe(true);
    expect(exactRow.drawn!.compared).toBe(3 * c.rows.length);
    const off = Float32Array.from(want);
    const stride = routeOutStride(c);
    const miss = 0.7e-4;
    for (let i = 0; i < c.rows.length; i++) {
      off[stride * i] = want[stride * i]! + 2 * miss;
      off[stride * i + 3] = want[stride * i + 3]! + miss;
    }
    const row = newRouteRow(c);
    compareRoute(row, c, off);
    expect(row.center.worstRatio).toBeGreaterThan(1);
    expect(row.position.worstRatio).toBeLessThan(1);
    expect(
      row.drawn!.maxAbs,
      `the drawn position is ${row.drawn!.maxAbs} m off; ${CORRIDOR_DRAWN_M} m allowed`,
    ).toBeGreaterThan(CORRIDOR_DRAWN_M);
    expect(row.pass).toBe(false);
    expect(ROUTE_OUT_FLOATS).toBe(15);
  });
});
