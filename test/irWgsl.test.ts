// CS-51: the WGSL emitter. Every test program's WGSL is validated by naga
// (naga-wasm, a dev dependency of this package, until CS-57 replaces it),
// and the emitter's layout, source map and refusals are checked. The
// GPU readback half runs in the browser suite (`node bench/run.mjs irWgsl`).
import { describe, expect, it } from "vitest";
import {
  Builder,
  emitWgsl,
  emitWgslKernel,
  f32Literal,
  packUniforms,
} from "../packages/core/src/ir/index.ts";
import { wgslCases } from "../packages/core/src/ir/wgslCases.ts";

interface Naga {
  parseWgsl(source: string): unknown;
  validate(module: unknown): unknown;
}

// naga-wasm is a devDependency, so `pnpm install` provides it. A missing
// package skips these cases with a message (and fails the run under CI).
const naga: Naga | undefined = await import("naga-wasm").then(
  (m) => m as unknown as Naga,
  (error: unknown) => {
    // Only a package that isn't installed skips; a broken install throws.
    if ((error as { code?: string }).code === "ERR_MODULE_NOT_FOUND") {
      return undefined;
    }
    throw error;
  },
);

describe("naga accepts the emitted WGSL", () => {
  it("is installed (run `pnpm install` if this fails or the cases below skip)", () => {
    if (process.env.CI) {
      expect(naga).toBeDefined();
    } else if (!naga) {
      console.warn(
        "naga-wasm is not installed, so the WGSL validation cases are skipped. Run `pnpm install` at the repository root.",
      );
    }
  });
  const cases = wgslCases();
  it("has a case for every op in the vocabulary", async () => {
    const { OPS } = await import("../packages/core/src/ir/index.ts");
    const used = new Set(cases.flatMap((c) => c.program.eqns.map((e) => e.op)));
    for (const op of Object.keys(OPS)) {
      expect(used.has(op), op).toBe(true);
    }
  });
  for (const c of cases) {
    it.skipIf(!naga)(c.name, () => {
      for (const code of [
        emitWgsl(c.program).code,
        emitWgslKernel(c.program).code,
      ]) {
        const module = naga!.parseWgsl(code);
        naga!.validate(module);
      }
    });
  }
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
  it("gives the uniform block one vec4 slot per uniform input and literal", () => {
    const e = emitWgsl(build());
    expect(e.uniforms).toEqual([
      { name: "k", kind: "input", type: "float3", index: 0 },
      { name: "gain", kind: "literal", type: "float", index: 1 },
    ]);
    expect(e.code).toContain("array<vec4f, 2>");
    expect(Array.from(packUniforms(build(), { k: [1, 2, 3] }))).toEqual([
      1, 2, 3, 0, 2, 0, 0, 0,
    ]);
  });
  it("makes the other inputs parameters, in order", () => {
    const e = emitWgsl(build());
    expect(e.params).toEqual([{ name: "a", type: "float" }]);
    expect(e.code).toContain("fn cir_main(in_a: f32) -> CirOut");
  });
  it("tags every equation's line with its id", () => {
    const p = build();
    const e = emitWgsl(p);
    const lines = e.code.split("\n");
    expect(e.sourceMap.map((s) => s.eqn)).toEqual(p.eqns.map((_, i) => i));
    for (const s of e.sourceMap) {
      expect(lines[s.line - 1]).toContain(`let v${s.eqn} =`);
      expect(lines[s.line - 1]).toMatch(new RegExp(`// eqn ${s.eqn}$`));
    }
  });
  it("writes shortest float32 literals and refuses what float32 can't hold", () => {
    expect(f32Literal(0.1)).toBe("0.1");
    expect(f32Literal(2)).toBe("2.0");
    expect(f32Literal(-0)).toBe("-0.0");
    expect(f32Literal(16777216)).toBe("16777216.0");
    expect(f32Literal(1e-7)).toBe("1e-7");
    expect(() => f32Literal(1e300)).toThrow(RangeError);
    expect(() => f32Literal(NaN)).toThrow(RangeError);
  });
  it("refuses an output name that isn't a field name", () => {
    const b = new Builder();
    const a = b.input("a", "float", "vertex");
    expect(() => emitWgsl(b.program({ "bad name": a }))).toThrow(/field name/);
  });
  it("is deterministic", () => {
    expect(emitWgsl(build()).code).toBe(emitWgsl(build()).code);
  });
});
