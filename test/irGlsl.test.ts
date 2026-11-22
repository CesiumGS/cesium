// CS-52: the GLSL ES 3.00 emitter. The Node half checks the text: every
// program CS-51 tests is emitted by both emitters (so an op missing from
// either fails here, in both), each difference the plan lists has its form,
// and the layout, source map and refusals match the WGSL emitter's. The
// compile, link and readback half runs in the browser suite
// (`node bench/run.mjs irGlsl`), which also compiles naga's GLSL ES output
// beside ours (CS-777). The Node half of that cross-check, naga-wasm writing
// GLSL ES 3.00 for every module, runs here whenever naga-wasm is installed.
import { describe, expect, it } from "vitest";
import {
  Builder,
  OPS,
  emitGlsl,
  emitGlslKernel,
  emitWgsl,
  packUniforms,
  type Program,
} from "../packages/core/src/ir/index.ts";
import { nagaGlsl, type NagaApi } from "../packages/core/src/ir/nagaVertex.ts";
import { wgslCases } from "../packages/core/src/ir/wgslCases.ts";

const cases = wgslCases();

/** The one program in `cases` named `name`. */
const programOf = (name: string): Program =>
  cases.find((c) => c.name === name)!.program;

/** The first line of `code` that writes equation `eqn` of the case `name`. */
const lineFor = (name: string, op: string): string => {
  const p = programOf(name);
  const id = p.eqns.findIndex((e) => e.op === op);
  expect(id, `${name} has no ${op}`).toBeGreaterThanOrEqual(0);
  const e = emitGlsl(p);
  const line = e.sourceMap.find((s) => s.eqn === id)!.line;
  return e.code.split("\n")[line - 1]!;
};

describe("the two emitters cover one vocabulary", () => {
  it("has a case for every op in the vocabulary", () => {
    const used = new Set(cases.flatMap((c) => c.program.eqns.map((e) => e.op)));
    for (const op of Object.keys(OPS)) {
      expect(used.has(op), op).toBe(true);
    }
  });
  for (const c of cases) {
    it(`emits ${c.name} in both`, () => {
      for (const emit of [emitWgsl, emitGlsl]) {
        expect(() => emit(c.program)).not.toThrow();
      }
      expect(() => emitGlslKernel(c.program)).not.toThrow();
    });
  }
  it("gives every program the same uniform slots, parameters and outputs", () => {
    for (const c of cases) {
      const w = emitWgsl(c.program);
      const g = emitGlsl(c.program);
      expect(g.uniforms, c.name).toEqual(w.uniforms);
      expect(g.params, c.name).toEqual(w.params);
      expect(g.outputs, c.name).toEqual(w.outputs);
      expect(g.sourceMap.map((s) => s.eqn)).toEqual(
        w.sourceMap.map((s) => s.eqn),
      );
    }
  });
});

describe("where GLSL differs from WGSL", () => {
  it("writes atan2 as atan(y, x)", () => {
    expect(lineFor("math/atan2", "math/atan2")).toContain("atan(v0, v1)");
    expect(emitGlsl(programOf("math/atan2")).code).not.toContain("atan2");
  });
  it("writes rem through trunc, not % or mod", () => {
    const line = lineFor("math/rem", "math/rem");
    expect(line).toContain("(v0 - v1 * trunc(v0 / v1))");
    expect(line).not.toMatch(/%|mod\(/);
  });
  it("writes select as a ternary with the condition first", () => {
    expect(lineFor("math/select", "math/select")).toMatch(
      /float v\d+ = \(v\d+ \? v\d+ : v\d+\);/,
    );
    expect(lineFor("math/select:float3", "math/select")).toMatch(
      /vec3 v\d+ = \(v\d+ \? v\d+ : v\d+\);/,
    );
    expect(emitGlsl(programOf("math/select")).code).not.toContain("select(");
  });
  it("writes saturate as clamp", () => {
    expect(lineFor("math/saturate", "math/saturate")).toContain(
      "clamp(v0, float(0.0), float(1.0))",
    );
    expect(lineFor("math/saturate:float3", "math/saturate")).toContain(
      "clamp(v0, vec3(0.0), vec3(1.0))",
    );
  });
  it("converts with float() and int()", () => {
    expect(
      lineFor("type/intToFloat, boolToFloat", "type/intToFloat"),
    ).toContain("float(v0)");
    expect(
      lineFor("type/intToFloat, boolToFloat", "type/boolToFloat"),
    ).toContain("float(v1)");
    const composite = emitGlsl(programOf("composite")).code;
    expect(composite).not.toMatch(/f32|i32/);
  });
  it("reads an int uniform with int() and a bool uniform against zero", () => {
    const b = new Builder();
    const n = b.input("n", "int", "uniform");
    const flag = b.input("flag", "bool", "uniform");
    const e = emitGlsl(
      b.program({
        r: b.op("math/select", [
          flag,
          b.op("type/intToFloat", [n]),
          b.const(0),
        ]),
      }),
    );
    expect(e.code).toContain("int(cir_u.k[0].x)");
    expect(e.code).toContain("(cir_u.k[1].x != 0.0)");
  });
  it("tests vectors with lessThan, notEqual and equal, and picks with mix", () => {
    const pow = lineFor("math/pow:float3", "math/pow");
    expect(pow).toContain("lessThan(v0, vec3(0.0))");
    expect(pow).toContain("notEqual(");
    expect(pow).toContain("equal(v1, vec3(0.0))");
    expect(pow).toContain("mix(");
    expect(pow).not.toMatch(/&&|&|\?/);
    expect(lineFor("math/sinh:float3", "math/sinh")).toContain(
      "mix(sinh(v0), ",
    );
    expect(lineFor("math/tanh:float3", "math/tanh")).toContain(
      "lessThan(abs(v0), vec3(0.1))",
    );
  });
  it("tests scalars with comparison operators and picks with the ternary", () => {
    const pow = lineFor("math/pow", "math/pow");
    expect(pow).toContain("(v0 < float(0.0))");
    expect(pow).toContain("? float(1.0) :");
    expect(pow).not.toMatch(/lessThan|mix\(/);
  });
  it("gives the zero vector zeros from normalize", () => {
    expect(lineFor("math/normalize:float3", "math/normalize")).toContain(
      "(length(v0) > 0.0 ? v0 / length(v0) : vec3(0.0))",
    );
    expect(lineFor("math/normalize:float", "math/normalize")).toContain(
      "(v0 != 0.0 ? v0 / abs(v0) : 0.0)",
    );
  });
  it("writes no GLSL keyword the language lacks", () => {
    for (const c of cases) {
      const { code } = emitGlsl(c.program);
      expect(code, c.name).not.toMatch(/\b(let|fn|vec[234]f|var|select)\b|->/);
    }
  });
});

describe("the emitter", () => {
  const build = () => {
    const b = new Builder();
    const a = b.input("a", "float", "vertex");
    const k = b.input("k", "float3", "uniform");
    const g = b.literal("gain", 2);
    const out = b.op("math/mul", [
      b.op("math/add", [a, g]),
      b.op("math/extract3", [k], 2),
    ]);
    return b.program({ r: out });
  };
  it("gives a std140 block one vec4 slot per uniform input and literal", () => {
    const e = emitGlsl(build());
    expect(e.uniforms).toEqual([
      { name: "k", kind: "input", type: "float3", index: 0 },
      { name: "gain", kind: "literal", type: "float", index: 1 },
    ]);
    expect(e.uniformBlock).toBe("CirUniforms");
    expect(e.code).toContain(
      "layout(std140) uniform CirUniforms { vec4 k[2]; } cir_u;",
    );
    expect(Array.from(packUniforms(build(), { k: [1, 2, 3] }))).toEqual([
      1, 2, 3, 0, 2, 0, 0, 0,
    ]);
  });
  it("has no block when there is no uniform", () => {
    const b = new Builder();
    const a = b.input("a", "float", "vertex");
    expect(emitGlsl(b.program({ r: a })).code).not.toContain("uniform");
  });
  it("makes the other inputs parameters, in order", () => {
    const e = emitGlsl(build());
    expect(e.params).toEqual([{ name: "a", type: "float" }]);
    expect(e.code).toContain("CirOut cir_main(float in_a) {");
    expect(e.code).toContain("struct CirOut { float r; };");
  });
  it("tags every equation's line with its id", () => {
    const p = build();
    const e = emitGlsl(p);
    const lines = e.code.split("\n");
    expect(e.sourceMap.map((s) => s.eqn)).toEqual(p.eqns.map((_, i) => i));
    for (const s of e.sourceMap) {
      expect(lines[s.line - 1]).toMatch(new RegExp(`v${s.eqn} = .*;`));
      expect(lines[s.line - 1]).toMatch(new RegExp(`// eqn ${s.eqn}$`));
    }
  });
  it("keeps the source map right once the kernel adds its header", () => {
    const k = emitGlslKernel(build());
    const lines = k.code.split("\n");
    expect(lines[0]).toBe("#version 300 es");
    for (const s of k.sourceMap) {
      expect(lines[s.line - 1]).toMatch(new RegExp(`// eqn ${s.eqn}$`));
    }
  });
  it("starts the kernel with #version and ends its function with main", () => {
    const k = emitGlslKernel(build());
    expect(k.code.startsWith("#version 300 es\n")).toBe(true);
    expect(k.attributes).toEqual(["cir_in0"]);
    expect(k.varyings).toEqual(["cir_out0"]);
    expect(k.inStride).toBe(1);
    expect(k.outStride).toBe(1);
    expect(k.code).toContain("in float cir_in0;");
    expect(k.code).toContain("out float cir_out0;");
    expect(k.code).toContain("CirOut r = cir_main(cir_in0);");
  });
  it("strides the kernel's buffers like the WGSL kernel", () => {
    const k = emitGlslKernel(programOf("composite"));
    // a: float, n: int, flag: bool -> 3 lanes in; r: float, t: float3 -> 4 out.
    expect(k.inStride).toBe(3);
    expect(k.outStride).toBe(4);
    expect(k.code).toContain("in float cir_in1;");
    expect(k.code).toContain("int(cir_in1)");
    expect(k.code).toContain("cir_in2 != 0.0");
    expect(k.code).toContain("out vec3 cir_out1;");
  });
  it("is deterministic", () => {
    expect(emitGlsl(build()).code).toBe(emitGlsl(build()).code);
  });
  it("refuses what GLSL ES 3.00 can't name", () => {
    const b = new Builder();
    const a = b.input("a", "float", "vertex");
    expect(() => emitGlsl(b.program({ "bad name": a }))).toThrow(/field name/);
    expect(() => emitGlsl(b.program({ input: a }))).toThrow(/reserved word/);
    expect(() => emitGlsl(b.program({ gl_x: a }))).toThrow(/reserved/);
    expect(() => emitGlsl(b.program({ a__b: a }))).toThrow(/reserved/);
    expect(() => emitGlsl(b.program({ r: a }), { fn: "main" })).toThrow(
      /reserved word/,
    );
    expect(() => emitGlsl(b.program({ r: a }), { fn: "1x" })).toThrow(
      /identifier/,
    );
  });
  it("refuses two inputs that become one parameter name, and a doubled underscore", () => {
    const b = new Builder();
    const x = b.input("a b", "float", "vertex");
    const y = b.input("a_b", "float", "vertex");
    expect(() => emitGlsl(b.program({ r: b.op("math/add", [x, y]) }))).toThrow(
      /both become in_a_b/,
    );
    const c = new Builder();
    const z = c.input("a__b", "float", "vertex");
    expect(() => emitGlsl(c.program({ r: z }))).toThrow(/parameter/);
  });
});

// naga-wasm is a devDependency, so `npm install` provides it. Only a package
// that isn't installed skips the cases below, with a hint (and the run fails
// under CI); a broken install throws.
const naga: NagaApi | undefined = await import("naga-wasm").then(
  (m) => m as unknown as NagaApi,
  (error: unknown) => {
    if ((error as { code?: string }).code === "ERR_MODULE_NOT_FOUND") {
      return undefined;
    }
    throw error;
  },
);

describe("naga's GLSL ES output, as a cross-check", () => {
  // CS-52 asked for naga's GLSL ES 3.00 for one emitted WGSL module per test,
  // compiled beside ours. This half checks that naga writes it for every
  // module and that the names the browser page binds by are there; the page
  // (`bench/irGlsl.ts`) compiles, links and reads it back in WebGL 2.
  it("is installed (run `npm install` if this fails or the cases below skip)", () => {
    if (process.env.CI) {
      expect(naga).toBeDefined();
    } else if (!naga) {
      console.warn(
        "naga-wasm is not installed, so the naga cross-check cases are skipped. Run `npm install` at the repository root.",
      );
    }
  });
  for (const c of cases) {
    it.skipIf(!naga)(`writes ${c.name} as GLSL ES 3.00`, () => {
      const w = emitWgsl(c.program);
      const g = nagaGlsl(naga!, w);
      expect(g.code, c.name).toMatch(/^#version 300 es\n/);
      // Vertex inputs keep their @location, as `layout(location = n)`.
      for (const a of g.attributes) {
        expect(g.code, c.name).toMatch(
          new RegExp(`layout\\(location = ${a.location}\\) in \\w+ \\w+;`),
        );
      }
      // The outputs are the names the page records through transform feedback.
      for (const [i, name] of g.varyingNames.entries()) {
        const out = g.varyings[i]!;
        expect(g.code, c.name).toMatch(
          new RegExp(`out (float|vec[234]) ${name};`),
        );
        expect(g.code, c.name).toContain(
          `${name} = _tmp_return.o${out.location}_;`,
        );
      }
      // One std140 block for the uniform buffer, and none without one.
      expect(g.uniformBlock !== undefined, c.name).toBe(w.uniforms.length > 0);
      if (g.uniformBlock) {
        expect(g.code, c.name).toContain(
          `layout(std140) uniform ${g.uniformBlock}`,
        );
      }
    });
  }
  it.skipIf(!naga)(
    "rewrites gl_Position.yz for clip-space depth, and no output reads it",
    () => {
      const g = nagaGlsl(naga!, emitWgsl(programOf("composite")));
      expect(g.code).toContain(
        "gl_Position.yz = vec2(-gl_Position.y, gl_Position.z * 2.0 - gl_Position.w);",
      );
      // The page reads transform feedback varyings, never gl_Position, so the
      // rewrite can't reach a readback.
      expect(g.varyingNames.every((n) => n.startsWith("_vs2fs_"))).toBe(true);
    },
  );
  it.skipIf(!naga)("refuses nothing the emitter writes", () => {
    const refused: string[] = [];
    for (const c of cases) {
      try {
        nagaGlsl(naga!, emitWgsl(c.program));
      } catch (error) {
        refused.push(`${c.name}: ${(error as Error).message}`);
      }
    }
    expect(refused).toEqual([]);
  });
});
