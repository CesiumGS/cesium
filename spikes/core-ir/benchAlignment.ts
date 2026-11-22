// Input 5 measured: a plan-and-profile alignment written with tables (a),
// its ONNX form (b), and today's per-element corridor compile for scale
// (the baseline in test/corridorUnrollCompiled.test.ts: map within
// 1e-8 m, J within 1e-9, float32 change from the draw center under 0.1 mm,
// offsets to ±1.5 km).

import { ROAD } from "../../examples/transform-graph/data/road.ts";
import {
  clearCompileCache,
  compileRoute,
} from "../../packages/core/src/transform/compile.ts";
import {
  affine,
  routeBetween,
  TransformGraph,
} from "../../packages/core/src/transform/index.ts";
import { parseTransform } from "../../packages/core/src/transform/parse.ts";
import { paramsOf } from "../../packages/core/src/transform/program.ts";
import {
  corridorUnroll,
  corridorUnrollDescriptor,
  type CorridorOptions,
} from "../../packages/core/src/transforms/corridorUnroll.ts";
import { evaluate, type Program, type Value } from "./cir.ts";
import { jacobianProgram } from "./ad.ts";
import { evaluateInterval, evaluateIntervalSplit } from "./interval.ts";
import { emit } from "./emit.ts";
import { fromJson, hoistLiterals, toJson } from "./passes.ts";
import { encodeOnnx, toOnnx } from "./onnx.ts";
import {
  alignmentProgram,
  perDrawEstimate,
  planTable,
  profileTable,
  referenceCurvilinearMap,
  residualDelta,
  type ProfileRow,
} from "./fromAlignment.ts";
import { timeUs, type Deps } from "./bench.ts";

export const ALIGNMENT: CorridorOptions = {
  start: [2000, 1000],
  heading: 0.4,
  station: 0,
  elements: [
    { kind: "line", length: 300 },
    { kind: "arc", length: 400, radius: 500 },
    { kind: "line", length: 300 },
  ],
};
const R_VC = (-0.02 - 0.03) / 300;
export const PROFILE: ProfileRow[] = [
  { s: 0, z: 492.5, g: 0.03, r: 0 },
  { s: 250, z: 500, g: 0.03, r: R_VC },
  { s: 550, z: 500 + 300 * (0.03 + 0.5 * R_VC * 300), g: -0.02, r: 0 },
];

const lanes = (v: Value): number[] =>
  typeof v === "number" ? [v] : typeof v === "boolean" ? [v ? 1 : 0] : [...v];

function routeOf(options: CorridorOptions) {
  const graph = new TransformGraph();
  const world = graph.root("world");
  const unroll = graph.add("corridor", world, corridorUnroll(options));
  const content = graph.add(
    "content",
    unroll,
    affine({
      matrix: Float64Array.of(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1),
    }),
  );
  return routeBetween(content, world);
}

/** Today's per-element compile: parse, nodes, and the compiled route's size, per-draw data and time. */
function today(options: CorridorOptions) {
  const d = corridorUnrollDescriptor(options);
  const t0 = performance.now();
  const parsed = parseTransform(d.source!);
  const parseMs = performance.now() - t0;
  clearCompileCache();
  const t1 = performance.now();
  const compiled = compileRoute(routeOf(options));
  const compileMs = performance.now() - t1;
  if (!compiled.ok) {
    throw new Error(compiled.reason);
  }
  return {
    irNodes: parsed.eqns.length,
    params: paramsOf(parsed).length,
    parseMs: Math.round(parseMs * 10) / 10,
    compileRouteMs: Math.round(compileMs * 10) / 10,
    wgslChars: compiled.wgsl.length,
    perDrawFloats: compiled.perDrawLayout.floats,
  };
}

export async function alignmentSection(
  deps: Deps,
): Promise<Record<string, unknown>> {
  const plan = planTable(ALIGNMENT);
  const prof = profileTable(PROFILE);
  const tables = { plan: plan.data, profile: prof.data };
  const program = alignmentProgram(plan.rows, prof.rows);
  const ref = referenceCurvilinearMap(ALIGNMENT, PROFILE);
  const J = jacobianProgram(program, "q", "p");

  // Stations: every breakpoint and a hair either side, past both ends, and a sweep.
  const breaks = [0, 250, 300, 550, 700, 1000];
  const stations: number[] = [];
  for (const s of breaks) {
    stations.push(s - 1e-6, s - 1e-9, s, s + 1e-9, s + 1e-6);
  }
  stations.push(-500, -1e-3, 1000 + 1e-3, 1500);
  for (let i = 0; i <= 400; i++) {
    stations.push((1000 * i) / 400 + 0.137);
  }
  const offsets = [-1500, -450, 0, 450, 1500];

  let mapErr = 0;
  let jErr = 0;
  for (const s of stations) {
    for (const o of offsets) {
      const p = [s, o, 12.5];
      const q = lanes(evaluate(program, { p, ...tables }).q!);
      const r = ref.forward(p);
      mapErr = Math.max(mapErr, ...q.map((x, i) => Math.abs(x - r[i]!)));
      const cols = evaluate(J, { p, ...tables });
      const ours = [0, 1, 2].flatMap((c) => lanes(cols[`J${c}`]!));
      const rj = ref.jacobian(p);
      jErr = Math.max(jErr, ...ours.map((x, i) => Math.abs(x - rj[i]!)));
    }
  }

  // The float32 change from a draw's center, through the residual emulation.
  let resErr = 0;
  let crossed = 0;
  for (let i = 0; i < stations.length; i += 7) {
    for (const o of offsets) {
      const c = [stations[i]!, o, 0];
      const qc = ref.forward(c);
      for (const [ds, dOff] of [
        [3, 0.5],
        [-8, -2],
        [25, 40],
        [-60, 90],
      ] as const) {
        const delta = [ds, dOff, 0];
        const exact = ref
          .forward([c[0]! + ds, c[1]! + dOff, 0])
          .map((x, l) => x - qc[l]!);
        const r = residualDelta(program, tables, c, delta);
        const cRows = residualDelta(program, tables, c, [0, 0, 0]).rows;
        if (r.rows.plan !== cRows.plan || r.rows.profile !== cRows.profile) {
          crossed++;
        }
        resErr = Math.max(
          resErr,
          ...r.delta.map((x, l) => Math.abs(x - exact[l]!)),
        );
      }
    }
  }

  // Intervals over a box straddling the plan's line-to-arc join at 300 m.
  const box = {
    p: [
      { lo: 280, hi: 330 },
      { lo: -20, hi: 20 },
      { lo: 0, hi: 5 },
    ],
  };
  const naive = evaluateInterval(program, box, tables).q!;
  const split = evaluateIntervalSplit(program, box, tables, "p", 0);
  let outside = 0;
  for (let s = 280; s <= 330; s += 0.5) {
    for (const o of [-20, -10, 0, 10, 20]) {
      for (const h of [0, 5]) {
        const q = ref.forward([s, o, h]);
        for (let l = 0; l < 3; l++) {
          const b = split.bounds.q![l]!;
          if (q[l]! < b.lo - 1e-9 || q[l]! > b.hi + 1e-9) {
            outside++;
          }
        }
      }
    }
  }
  const width = (ls: readonly { lo: number; hi: number }[]) =>
    ls.map((x) => Math.round((x.hi - x.lo) * 1000) / 1000);

  // Costs: ours (the same program for any number of elements) against today's per element.
  const wgsl = emit(program, "wgsl").code;
  const glsl = emit(program, "glsl").code;
  const jWgsl = emit(J, "wgsl").code;
  const roadOptions: CorridorOptions = {
    polyline: ROAD.map(
      ([lon, lat]) =>
        [(lon - 7.765) * 77_000, (lat - 46.045) * 111_000] as const,
    ),
  };
  const roadPlan = planTable(roadOptions);
  const roadProgram = alignmentProgram(roadPlan.rows, prof.rows);
  const roadSegments: number[] = [];
  for (let r = 2; r < roadPlan.rows; r++) {
    roadSegments.push(roadPlan.data[r * 6]! - roadPlan.data[(r - 1) * 6]!);
  }
  // Our table program against the road's corridor descriptor (flat profile).
  const flat = profileTable([{ s: -1e9, z: 0, g: 0, r: 0 }]);
  const roadRef = corridorUnrollDescriptor(roadOptions);
  const roadV = Object.fromEntries(
    Object.entries(roadRef.params).map(([k, spec]) => [k, spec.default]),
  );
  let roadErr = 0;
  const roadProgramFlat = alignmentProgram(roadPlan.rows, 1);
  for (let i = 0; i <= 200; i++) {
    const s =
      roadPlan.data[6]! +
      ((roadPlan.data[(roadPlan.rows - 1) * 6]! - roadPlan.data[6]!) * i) /
        200 +
      0.137;
    for (const o of [-1500, 0, 35]) {
      const out = new Float64Array(3);
      roadRef.forward([s, o, 0], roadV, out);
      const q = lanes(
        evaluate(roadProgramFlat, {
          p: [s, o, 0],
          plan: roadPlan.data,
          profile: flat.data,
        }).q!,
      );
      roadErr = Math.max(
        roadErr,
        Math.abs(q[0]! - out[0]!),
        Math.abs(q[1]! - out[1]!),
      );
    }
  }

  const json = JSON.stringify(toJson(program));
  const R: Record<string, unknown> = {
    eqns: program.eqns.length,
    jacobianEqns: J.eqns.length,
    planRows: plan.rows,
    profileRows: prof.rows,
    maxMapErrM: mapErr,
    maxJacobianErr: jErr,
    residualMaxErrM: resErr,
    residualSamplesCrossingARow: crossed,
    intervalNaiveWidths: width(naive),
    intervalSplitWidths: width(split.bounds.q!),
    intervalSplitPieces: split.pieces,
    intervalSamplesOutside: outside,
    buildUs: timeUs(() => alignmentProgram(plan.rows, prof.rows)),
    buildEmitWgslUs: timeUs(() =>
      emit(alignmentProgram(plan.rows, prof.rows), "wgsl"),
    ),
    buildJacobianWgslUs: timeUs(
      () =>
        emit(
          jacobianProgram(alignmentProgram(plan.rows, prof.rows), "q", "p"),
          "wgsl",
        ),
      200,
      20,
    ),
    wgslChars: wgsl.length,
    glslChars: glsl.length,
    jacobianWgslChars: jWgsl.length,
    perDraw: perDrawEstimate(program),
    tableFloatsPerView: plan.data.length + prof.data.length,
    jsonBytes: json.length,
    jsonRoundTrip:
      hoistLiterals(fromJson(JSON.parse(json))).key ===
      hoistLiterals(program).key,
    road: {
      planRows: roadPlan.rows,
      oursEqns: roadProgram.eqns.length,
      oursWgslChars: emit(roadProgram, "wgsl").code.length,
      oursTableFloatsPerView: roadPlan.data.length + prof.data.length,
      oursMaxMapErrVsCorridorM: roadErr,
      shortestSegmentM: Math.round(Math.min(...roadSegments) * 10) / 10,
      today: today(roadOptions),
    },
    todayThreeElements: today(ALIGNMENT),
    wgsl,
    glsl,
  };

  // (b) the same program as ONNX, evaluated by onnxruntime-web.
  const m = toOnnx(program);
  R.onnx = {
    nodes: m.graph.node.length,
    protobufBytes: encodeOnnx(m).length,
    opTypes: [...new Set(m.graph.node.map((n) => n.op_type))].sort().join(" "),
  };
  if (deps.ort) {
    const feeds: Record<string, number | number[]> = {};
    for (const t of program.tables!) {
      const data = tables[t.name as "plan" | "profile"];
      t.columns.forEach((col, ci) => {
        feeds[`${t.name}.${col}`] = Array.from(
          { length: t.rows },
          (_, r) => data[r * t.columns.length + ci]!,
        );
      });
    }
    let err = 0;
    let ms = 0;
    try {
      for (const p of [
        [120, 30, 2],
        [310, -40, 0],
        [650, 450, 1],
        [-80, 5, 0],
      ]) {
        const r = await deps.ort(
          encodeOnnx(toOnnx(program as Program, { ir: 10, opset: 21 })),
          { ...feeds, p },
        );
        ms = r.ms;
        const ours = lanes(evaluate(program, { p, ...tables }).q!);
        err = Math.max(err, ...ours.map((x, i) => Math.abs(x - r.out.q![i]!)));
      }
      (R.onnx as Record<string, unknown>).ortMaxErrM = err;
      (R.onnx as Record<string, unknown>).ortSessionMs = ms;
    } catch (e) {
      (R.onnx as Record<string, unknown>).ortError = String(e).slice(0, 300);
    }
  }
  return R;
}
