// The spike's measurements in Node: the four inputs through candidate (a),
// the same programs as ONNX graphs (b), and naga (WGSL to SPIR-V and GLSL ES)
// where (c) can be measured without a Rust build. `run.mjs` bundles this
// and passes in what the TypeScript project can't import (naga-wasm and the
// 1.x oracle).

import { evaluate as todayEvaluate } from "../../src/transform/evaluate.ts";
import { jacobian as todayJacobian } from "../../src/transform/ad.ts";
import { evaluateInterval as todayInterval } from "../../src/transform/interval.ts";
import { parseTransform } from "../../src/transform/parse.ts";
import { toWgsl as todayToWgsl } from "../../src/transform/wgsl.ts";
import { compileStyleExpression } from "../../src/scene/styleExpression.ts";
import { twistDescriptor } from "../../src/transforms/twist.ts";
import { evaluate, print, type Program, type Value } from "./cir.ts";
import { jacobianProgram } from "./ad.ts";
import { evaluateInterval } from "./interval.ts";
import { emit } from "./emit.ts";
import { fromJson, hoistLiterals, rates, toJson } from "./passes.ts";
import { styleProgram } from "./fromStyle.ts";
import { transformProgram } from "./fromTransform.ts";
import { materialXProgram, mtlxEdit } from "./fromMaterialX.ts";
import { fromSpirv } from "./fromSpirv.ts";
import { encodeOnnx, fromOnnx, toOnnx } from "./onnx.ts";
import { alignmentSection } from "./benchAlignment.ts";
import {
  FEATURES,
  MTLX,
  STYLE,
  STYLE_EDITED,
  TWIST_PARAMS,
  TWIST_POINTS,
  TWIST_SOURCE,
  WGSL_FN,
  falloffF64,
} from "./samples.ts";

export interface Naga {
  parseWgsl(source: string): unknown;
  validate(module: unknown): unknown;
  writeSpirv(
    module: unknown,
    info: unknown,
    options?: { flags?: { debug?: boolean } },
  ): Uint32Array;
  writeGlsl(
    module: unknown,
    info: unknown,
    options: { version: string; stage: string; entryPoint: string },
  ): string;
}

export interface Oracle1x {
  /** 1.x Cesium3DTileStyle: show and color (RGBA, as written) per feature. */
  evaluate(
    style: { show: string; color: string },
    feature: Record<string, number>,
  ): { show: boolean; color: number[] };
}

export interface Deps {
  naga?: Naga;
  oracle?: Oracle1x;
  ort?: (
    bytes: Uint8Array,
    feeds: Record<string, number | number[]>,
  ) => Promise<{ ms: number; out: Record<string, number[]> }>;
}

/** Median wall time of `f` in microseconds over `n` runs (after `warm` runs). */
export function timeUs(f: () => unknown, n = 500, warm = 50): number {
  for (let i = 0; i < warm; i++) {
    f();
  }
  const t: number[] = [];
  for (let i = 0; i < n; i++) {
    const s = performance.now();
    f();
    t.push((performance.now() - s) * 1000);
  }
  t.sort((a, b) => a - b);
  return Math.round(t[t.length >> 1]! * 10) / 10;
}

const lanes = (v: Value): number[] =>
  typeof v === "number" ? [v] : typeof v === "boolean" ? [v ? 1 : 0] : [...v];
const maxRel = (a: readonly number[], b: readonly number[]) =>
  a.reduce(
    (m, x, i) =>
      Math.max(m, Math.abs(x - b[i]!) / Math.max(1, Math.abs(b[i]!))),
    0,
  );

/** A wrapper that makes an entry point of a lone function, for naga's GLSL writer. */
function fragmentWrapper(code: string, call: string, outExpr: string): string {
  return `${code}\n@fragment fn cir_entry(@location(0) a: vec4f) -> @location(0) vec4f {\n  let r = ${call};\n  return ${outExpr};\n}\n`;
}

export async function run(deps: Deps): Promise<Record<string, unknown>> {
  const R: Record<string, unknown> = {};

  // ------------------------------------------------ 1. style
  const style = styleProgram(STYLE);
  const hoisted = hoistLiterals(style);
  const edited = hoistLiterals(styleProgram(STYLE_EDITED));
  let styleErr = 0;
  let showMismatch = 0;
  const vsOracle: unknown[] = [];
  for (const f of FEATURES) {
    const ours = evaluate(style, f);
    const hoistedOurs = evaluate(hoisted.program, { ...f, ...hoisted.values });
    if (JSON.stringify(ours) !== JSON.stringify(hoistedOurs)) {
      throw new Error("hoisting changed a result");
    }
    if (deps.oracle) {
      const o = deps.oracle.evaluate(STYLE, f);
      styleErr = Math.max(styleErr, maxRel(lanes(ours.color!), o.color));
      if (ours.show !== o.show) {
        showMismatch++;
      }
      vsOracle.push({ f, ours: lanes(ours.color!), oracle: o.color });
    }
  }
  const styleIv = evaluateInterval(style, {
    Height: [{ lo: 20, hi: 60 }],
    Floors: [{ lo: 3, hi: 12 }],
  });
  R.style = {
    eqns: style.eqns.length,
    literals: Object.keys(hoisted.values).length,
    rates: [...new Set(rates(style))],
    maxRelErrVs1x: styleErr,
    showMismatches: showMismatch,
    intervalHeight20to60: styleIv,
    valueEditKeepsShape: hoisted.key === edited.key,
    frontEndUs: timeUs(() => styleProgram(STYLE)),
    frontEndHoistEmitWgslUs: timeUs(() =>
      emit(hoistLiterals(styleProgram(STYLE)).program, "wgsl"),
    ),
    emitGlslUs: timeUs(() => emit(hoisted.program, "glsl")),
    todayCompileStyleExpressionUs: timeUs(() =>
      compileStyleExpression(STYLE.color, (name) => ({
        wgsl: `m.${name}`,
        type: "number",
      })),
    ),
    wgsl: emit(hoisted.program, "wgsl").code,
    glsl: emit(hoisted.program, "glsl").code,
    listing: print(style),
    sampleVs1x: vsOracle.slice(3, 5),
  };

  // ------------------------------------------------ 2. twist + Jacobian
  const today = parseTransform(TWIST_SOURCE);
  const twist = transformProgram(TWIST_SOURCE);
  const J = jacobianProgram(twist, "q", "p");
  let fErr = 0;
  let jErrAnalytic = 0;
  let jErrToday = 0;
  for (const pt of TWIST_POINTS) {
    const ours = lanes(evaluate(twist, { p: pt, ...TWIST_PARAMS }).q!);
    const todays = todayEvaluate(today, pt, TWIST_PARAMS);
    fErr = Math.max(fErr, maxRel(ours, todays));
    const cols = evaluate(J, { p: pt, ...TWIST_PARAMS });
    const ourJ = [0, 1, 2].flatMap((i) => lanes(cols[`J${i}`]!)); // column-major
    const out = new Float64Array(3);
    const analytic = new Float64Array(9);
    twistDescriptor.forward(pt, TWIST_PARAMS, out, analytic);
    jErrAnalytic = Math.max(jErrAnalytic, maxRel(ourJ, [...analytic]));
    const tj = todayJacobian(today, pt, TWIST_PARAMS); // row-major 3x3
    const todayColMajor = [0, 1, 2].flatMap((c) =>
      [0, 1, 2].map((r) => tj[r * 3 + c]!),
    );
    jErrToday = Math.max(jErrToday, maxRel(ourJ, todayColMajor));
  }
  const box = { min: [100, -50, 0], max: [140, -30, 20] };
  const ourIv = evaluateInterval(twist, {
    p: [0, 1, 2].map((i) => ({ lo: box.min[i]!, hi: box.max[i]! })),
    ...Object.fromEntries(
      Object.entries(TWIST_PARAMS).map(([k, v]) => [k, [{ lo: v, hi: v }]]),
    ),
  }).q!;
  const todayIv = todayInterval(today, box, TWIST_PARAMS);
  R.twist = {
    todayNodes: today.eqns.length,
    eqns: twist.eqns.length,
    jacobianEqns: J.eqns.length,
    maxRelErrForwardVsToday: fErr,
    maxRelErrJacobianVsAnalytic: jErrAnalytic,
    maxRelErrJacobianVsTodayAD: jErrToday,
    intervalOurs: ourIv,
    intervalToday: todayIv,
    parseLowerUs: timeUs(() => transformProgram(TWIST_SOURCE)),
    parseLowerJacobianWgslUs: timeUs(() =>
      emit(jacobianProgram(transformProgram(TWIST_SOURCE), "q", "p"), "wgsl"),
    ),
    todayParseWgslUs: timeUs(() => todayToWgsl(parseTransform(TWIST_SOURCE))),
  };

  // ------------------------------------------------ 3. MaterialX, edited live
  const mx = materialXProgram(MTLX);
  const mxH = hoistLiterals(mx);
  const valueEdit = mtlxEdit.value(MTLX, "stripes_in", "in2", "12.0");
  const categoryEdit = mtlxEdit.category(MTLX, "stripes_in", "add");
  const wireEdit = mtlxEdit.wire(MTLX, "base", "mix", "edge");
  const keyOf = (t: string) => hoistLiterals(materialXProgram(t)).key;
  R.materialX = {
    eqns: mx.eqns.length,
    literals: Object.keys(mxH.values).length,
    rates: [...new Set(rates(mx))],
    valueEditIsUniformWrite: keyOf(valueEdit) === mxH.key,
    categoryEditChangesShape: keyOf(categoryEdit) !== mxH.key,
    wireEditChangesShape: keyOf(wireEdit) !== mxH.key,
    sampleAtUv: evaluate(mx, { texcoord: [0.3, 0.5], Height: 50 }),
    perEditUs: {
      parseLowerHoistEmitWgsl: timeUs(() =>
        emit(hoistLiterals(materialXProgram(categoryEdit)).program, "wgsl"),
      ),
      emitGlsl: timeUs(() =>
        emit(hoistLiterals(materialXProgram(categoryEdit)).program, "glsl"),
      ),
    },
    wgsl: emit(mxH.program, "wgsl").code,
  };

  // ------------------------------------------------ 4. WGSL through naga
  if (deps.naga) {
    const naga = deps.naga;
    const toProgram = () => {
      const m = naga.parseWgsl(WGSL_FN);
      const info = naga.validate(m);
      return fromSpirv(
        naga.writeSpirv(m, info, { flags: { debug: true } }),
        "falloff",
        { p: "vertex", r: "uniform", k: "uniform" },
      );
    };
    const fp = toProgram();
    const pts: [number, number, number][] = [
      [1, 2, 3],
      [-4, 0.5, 12],
      [0.1, -0.2, -1],
      [7, 7, 5],
    ];
    let err = 0;
    for (const p of pts) {
      err = Math.max(
        err,
        maxRel(lanes(evaluate(fp, { p, r: 6, k: 0.3 }).falloff!), [
          falloffF64(p, 6, 0.3),
        ]),
      );
    }
    const fJ = jacobianProgram(
      // ∂falloff/∂p as a "float3" by combining the scalar with itself is not needed: take jvp per lane.
      { ...fp, outputs: fp.outputs },
      "falloff",
      "p",
    );
    const h = 1e-6;
    const p0: [number, number, number] = [1, 2, 3];
    const fd = [0, 1, 2].map((i) => {
      const a = [...p0];
      const c = [...p0];
      a[i]! += h;
      c[i]! -= h;
      return (falloffF64(a, 6, 0.3) - falloffF64(c, 6, 0.3)) / (2 * h);
    });
    const ad = [0, 1, 2].map(
      (i) => lanes(evaluate(fJ, { p: p0, r: 6, k: 0.3 })[`J${i}`]!)[0]!,
    );
    // GLSL ES 3.00 from naga, for the style: our WGSL wrapped in an entry point.
    const styleWgsl = emit(hoisted.program, "wgsl")
      .code.replace("CIR_GROUP", "0")
      .replace("CIR_BINDING", "0");
    const wrapped = fragmentWrapper(
      styleWgsl,
      "cir_main(a.x, a.y)",
      "select(vec4f(0.0), r.color, r.show)",
    );
    let nagaGlsl = "";
    let nagaGlslError = "";
    try {
      const m = naga.parseWgsl(wrapped);
      nagaGlsl = naga.writeGlsl(m, naga.validate(m), {
        version: "300 es",
        stage: "fragment",
        entryPoint: "cir_entry",
      });
    } catch (e) {
      nagaGlslError = String(e);
    }
    R.wgslViaNaga = {
      eqns: fp.eqns.length,
      maxRelErrVsF64: err,
      jacobianVsCentralDifference: maxRel(ad, fd),
      ad,
      fd,
      nagaToProgramUs: timeUs(toProgram, 200, 20),
      nagaValidateStyleWgslUs: timeUs(
        () => naga.validate(naga.parseWgsl(wrapped)),
        200,
        20,
      ),
      nagaStyleToGlslUs: timeUs(
        () => {
          const m = naga.parseWgsl(wrapped);
          return naga.writeGlsl(m, naga.validate(m), {
            version: "300 es",
            stage: "fragment",
            entryPoint: "cir_entry",
          });
        },
        200,
        20,
      ),
      nagaGlsl,
      nagaGlslError,
      listing: print(fp),
    };
  }

  // ------------------------------------------------ JSON form and versioning
  const json = JSON.stringify(toJson(hoisted.program));
  const back = fromJson(JSON.parse(json));
  let refusesFuture = false;
  try {
    fromJson({ ...JSON.parse(json), version: "cesium-ir/1.0" });
  } catch {
    refusesFuture = true;
  }
  R.json = {
    styleBytes: json.length,
    roundTripSameShape: hoistLiterals(back).key === hoisted.key,
    refusesUnknownMajor: refusesFuture,
    parseCheckUs: timeUs(() => fromJson(JSON.parse(json))),
  };

  // ------------------------------------------------ (b) ONNX
  const onnxOf = (p: Program) => {
    const m = toOnnx(p);
    return { m, bytes: encodeOnnx(m) };
  };
  const cases: [string, Program, Record<string, Value>][] = [
    ["style", style, FEATURES[4]!],
    ["twist", twist, { p: TWIST_POINTS[1]!, ...TWIST_PARAMS }],
    ["materialX", mx, { texcoord: [0.3, 0.5], Height: 50 }],
  ];
  const onnx: Record<string, unknown> = {};
  for (const [name, p, inputs] of cases) {
    const { m, bytes } = onnxOf(p);
    const back2 = fromOnnx(m);
    const a = evaluate(p, inputs);
    const b = evaluate(back2, inputs);
    const row: Record<string, unknown> = {
      cirEqns: p.eqns.filter((e) => e.args.length > 0).length,
      onnxNodes: m.graph.node.length,
      protobufBytes: bytes.length,
      jsonBytes: JSON.stringify(m).length,
      roundTripMaxRelErr: Object.keys(a).reduce(
        (x, k) => Math.max(x, maxRel(lanes(a[k]!), lanes(b[k]!))),
        0,
      ),
      toOnnxEncodeUs: timeUs(() => onnxOf(p), 200, 20),
      opTypes: [...new Set(m.graph.node.map((n) => n.op_type))].sort(),
    };
    if (deps.ort) {
      const feeds: Record<string, number | number[]> = {};
      for (const inp of m.graph.input) {
        const v = inputs[inp.name];
        if (v !== undefined) {
          feeds[inp.name] =
            typeof v === "boolean" ? Number(v) : (v as number | number[]);
        }
      }
      try {
        // onnxruntime-web 1.31 refuses IR 14 (ONNX 1.23); IR 10 / opset 21 carries the same ops.
        const r = await deps.ort(
          encodeOnnx(toOnnx(p, { ir: 10, opset: 21 })),
          feeds,
        );
        row.ortSessionMs = r.ms;
        row.ortMaxRelErr = Object.keys(a).reduce(
          (x, k) => Math.max(x, maxRel(lanes(a[k]!), r.out[k] ?? [NaN])),
          0,
        );
      } catch (e) {
        row.ortError = String(e).slice(0, 300);
      }
    }
    onnx[name] = row;
  }
  R.onnx = onnx;
  R.alignment = await alignmentSection(deps);
  return R;
}
