// Input 5: a plan-and-profile alignment as one curvilinear map, written with tables.
// (station, offset, height) -> plan point + offset · left normal, with the
// profile's elevation added. The plan table holds one row per element
// (start station, start point, start heading's cosine and sine, curvature),
// with a tangent row before the first element and after the last; the
// profile table holds grade tangents and parabolic vertical curves (start
// station, elevation, grade, rate of change of grade). One search per table
// picks the row; the closed forms are a line and an arc (selected by the
// row's curvature) and a parabola. The program's size doesn't depend on the
// number of elements: a 39-line road and a 3-element alignment are the same
// program with different table data.
//
// Also here: the float64 reference (today's corridorUnroll descriptor for the
// plan, the profile by hand), and an emulation in float32 of how the
// compiler's residual pass would carry a table lookup (see `residualDelta`).

import {
  corridorUnrollDescriptor,
  type CorridorOptions,
} from "../../packages/core/src/transforms/corridorUnroll.ts";
import { defaultParams } from "../../packages/core/src/transforms/descriptor.ts";
import {
  Builder,
  evaluate,
  searchRows,
  width,
  type Id,
  type Program,
  type TableDecl,
  type Value,
} from "./cir.ts";

export interface ProfileRow {
  /** Start station, m. */
  readonly s: number;
  /** Elevation at the start, m. */
  readonly z: number;
  /** Grade at the start (rise over run). */
  readonly g: number;
  /** Rate of change of grade, 1/m (0 on a tangent). */
  readonly r: number;
}

export const PLAN_COLUMNS = ["s", "x", "y", "c", "n", "k"] as const;
export const PROFILE_COLUMNS = ["s", "z", "g", "r"] as const;

/** The plan table's rows (row-major) from a corridor's elements. */
export function planTable(options: CorridorOptions): {
  data: number[];
  rows: number;
} {
  const d = corridorUnrollDescriptor(options);
  const v = defaultParams(d);
  const n = Object.keys(d.params).filter((k) => /^s\d+$/.test(k)).length;
  const data: number[] = [];
  // Before the first element: its start tangent, as a line.
  data.push(v.s0!, v.x0!, v.y0!, v.c0!, v.n0!, 0);
  for (let i = 0; i < n; i++) {
    data.push(
      v[`s${i}`]!,
      v[`x${i}`]!,
      v[`y${i}`]!,
      v[`c${i}`]!,
      v[`n${i}`]!,
      v[`k${i}`]!,
    );
  }
  data.push(v.se!, v.xe!, v.ye!, v.ce!, v.ne!, 0);
  return { data, rows: n + 2 };
}

/** A profile from grades and vertical curves: rows in station order. */
export function profileTable(rows: readonly ProfileRow[]): {
  data: number[];
  rows: number;
} {
  return { data: rows.flatMap((r) => [r.s, r.z, r.g, r.r]), rows: rows.length };
}

/** The alignment curvilinear map as a program over tables of `planRows` and `profileRows` rows. */
export function alignmentProgram(
  planRows: number,
  profileRows: number,
): Program {
  const b = new Builder();
  const plan = b.table("plan", PLAN_COLUMNS, planRows);
  const prof = b.table("profile", PROFILE_COLUMNS, profileRows);
  const p = b.input("p", "float3", "vertex");
  const st = b.op("math/extract3", [p], 0);
  const off = b.op("math/extract3", [p], 1);
  const h = b.op("math/extract3", [p], 2);
  const op = (name: string, ...args: Id[]) => b.op(name, args);
  const k = (v: number) => b.const(v);

  // Plan: the row, then a line or an arc from its start.
  const i = b.search(plan, "s", st);
  const col = (t: TableDecl, c: string, row: Id) => b.get(t, c, row);
  const [s0, x0, y0, c0, n0, k0] = PLAN_COLUMNS.map((c) => col(plan, c, i)) as [
    Id,
    Id,
    Id,
    Id,
    Id,
    Id,
  ];
  const u = op("math/sub", st, s0);
  const a = op("math/mul", k0, u);
  const ca = op("math/cos", a);
  const sa = op("math/sin", a);
  const cm1 = op("math/sub", ca, k(1));
  const arcX = op(
    "math/add",
    x0,
    op(
      "math/div",
      op("math/add", op("math/mul", n0, cm1), op("math/mul", c0, sa)),
      k0,
    ),
  );
  const arcY = op(
    "math/sub",
    y0,
    op(
      "math/div",
      op("math/sub", op("math/mul", c0, cm1), op("math/mul", n0, sa)),
      k0,
    ),
  );
  const arcTx = op("math/sub", op("math/mul", c0, ca), op("math/mul", n0, sa));
  const arcTy = op("math/add", op("math/mul", n0, ca), op("math/mul", c0, sa));
  const lineX = op("math/add", x0, op("math/mul", u, c0));
  const lineY = op("math/add", y0, op("math/mul", u, n0));
  const isLine = op("math/eq", k0, k(0));
  const px = op("math/select", isLine, lineX, arcX);
  const py = op("math/select", isLine, lineY, arcY);
  const tx = op("math/select", isLine, c0, arcTx);
  const ty = op("math/select", isLine, n0, arcTy);
  const qx = op("math/sub", px, op("math/mul", off, ty));
  const qy = op("math/add", py, op("math/mul", off, tx));

  // Profile: z + g v + r v² / 2 from the row's start.
  const j = b.search(prof, "s", st);
  const [ps, pz, pg, pr] = PROFILE_COLUMNS.map((c) => col(prof, c, j)) as [
    Id,
    Id,
    Id,
    Id,
  ];
  const v = op("math/sub", st, ps);
  const z = op(
    "math/add",
    pz,
    op(
      "math/mul",
      v,
      op("math/add", pg, op("math/mul", op("math/mul", k(0.5), pr), v)),
    ),
  );
  const qz = op("math/add", z, h);
  return b.program({ q: op("math/combine3", qx, qy, qz) });
}

/** The float64 reference: today's corridor descriptor for the plan, the profile by hand. */
export function referenceCurvilinearMap(
  options: CorridorOptions,
  profile: readonly ProfileRow[],
) {
  const d = corridorUnrollDescriptor(options);
  const v = defaultParams(d);
  const rowOf = (st: number) => {
    let r = 0;
    for (let i = 1; i < profile.length; i++) {
      if (profile[i]!.s <= st) {
        r = i;
      }
    }
    return profile[r]!;
  };
  return {
    forward(p: readonly number[]): number[] {
      const out = new Float64Array(3);
      d.forward(p, v, out);
      const r = rowOf(p[0]!);
      const u = p[0]! - r.s;
      return [out[0]!, out[1]!, r.z + u * (r.g + 0.5 * r.r * u) + p[2]!];
    },
    /** Column-major J: the corridor's analytic J, plus the profile's grade. */
    jacobian(p: readonly number[]): number[] {
      const out = new Float64Array(3);
      const J = new Float64Array(9);
      d.forward(p, v, out, J);
      const r = rowOf(p[0]!);
      J[2] = r.g + r.r * (p[0]! - r.s);
      return [...J];
    },
  };
}

// ---------------------------------------------------------------- residual emulation

const f = Math.fround;
type Lanes = number[];
const lanesOf = (v: Value): Lanes =>
  typeof v === "number" ? [v] : typeof v === "boolean" ? [v ? 1 : 0] : [...v];

/** Evaluates `p` with every search of table `t` forced to `rows[t]` (a row specialization). */
export function evaluateRows(
  p: Program,
  inputs: Readonly<Record<string, Value>>,
  rows: Readonly<Record<string, number>>,
): { values: Value[]; out: Record<string, Value> } {
  const forced: Program = {
    ...p,
    eqns: p.eqns.map((e) =>
      e.op === "cesium/search"
        ? { op: "const", args: [], type: "int", value: rows[e.table!]! }
        : e,
    ),
  };
  // `const` of type int: evaluate() returns the value as is.
  const values: Value[] = [];
  const all = {
    ...forced,
    outputs: forced.eqns.map((_, id) => ({ name: `#${id}`, id })),
  };
  const r = evaluate(all, inputs);
  forced.eqns.forEach((_, id) => values.push(r[`#${id}`]!));
  return {
    values,
    out: Object.fromEntries(p.outputs.map((o) => [o.name, values[o.id]!])),
  };
}

/**
 * How the compiler's residual pass (src/transform/residual.ts) would carry a
 * table lookup, emulated in float32. A draw stores, per table, its center's
 * row and the rows either side (a window), and for each window row the
 * center values the rules read, the change of the output from the center's
 * row to that row at the center (a float64 difference, stored in float32),
 * and the window's breakpoints relative to the center. A vertex picks its
 * row by comparing its float32 offset with those breakpoints (no search over
 * the table per vertex), then adds that row's crossing term to the change
 * the residual rules give within the row: Δ = [v_i(c) - v_ic(c)] + Δ_i(δ).
 * Within a row the table's values are constants (Δ = 0), so the rules are
 * those of a smooth closed form; across rows the crossing term is a
 * difference at one point, small where the alignment is continuous.
 */
export function residualDelta(
  p: Program,
  tables: Readonly<Record<string, readonly number[]>>,
  center: readonly number[],
  delta: readonly number[],
  window = 1,
): { delta: number[]; rows: Record<string, number> } {
  const inputsAt = (x: readonly number[]): Record<string, Value> => ({
    p: [...x],
    ...tables,
  });
  const c = center;
  const d32 = delta.map(f);
  // The center's row per table, and the vertex's row within the window.
  const rowsC: Record<string, number> = {};
  const rowsV: Record<string, number> = {};
  for (const t of p.tables ?? []) {
    const data = tables[t.name]!;
    const sCol = t.columns.indexOf("s");
    const ic = searchRows(data, t, sCol, c[0]!);
    rowsC[t.name] = ic;
    let iv = Math.max(ic - window, 0);
    for (
      let r = Math.max(ic - window, 0);
      r <= Math.min(ic + window, t.rows - 1);
      r++
    ) {
      // The breakpoint relative to the center, float64 on the CPU, stored as float32.
      if (r === 0 || f(data[r * t.columns.length + sCol]! - c[0]!) <= d32[0]!) {
        iv = r;
      }
    }
    rowsV[t.name] = iv;
  }
  const centerAtVertexRows = evaluateRows(p, inputsAt(c), rowsV);
  const centerAtCenterRows = evaluateRows(p, inputsAt(c), rowsC);
  const vc = centerAtVertexRows.values;
  // Δ within the vertex's rows, by the residual rules, every operation in float32.
  const dl: Lanes[] = [];
  const stored = (id: number) => lanesOf(vc[id]!).map(f); // stored center values (float32)
  p.eqns.forEach((e, id) => {
    const a = e.args.map((x) => dl[x]!);
    const zero = () => Array<number>(width(e.type)).fill(0);
    switch (e.op) {
      case "input":
        dl[id] = d32.slice(0, width(e.type));
        return;
      case "const":
      case "literal":
      case "cesium/search":
      case "cesium/tableGet":
      case "math/eq":
      case "math/lt":
      case "math/le":
      case "math/gt":
      case "math/ge":
        dl[id] = zero();
        return;
      case "math/extract3":
        dl[id] = [a[0]![e.index!]!];
        return;
      case "math/combine3":
        dl[id] = a.map((x) => x[0]!);
        return;
      case "math/add":
        dl[id] = a[0]!.map((x, l) => f(x + a[1]![l]!));
        return;
      case "math/sub":
        dl[id] = a[0]!.map((x, l) => f(x - a[1]![l]!));
        return;
      case "math/mul": {
        const [ac, bc] = [stored(e.args[0]!), stored(e.args[1]!)];
        dl[id] = a[0]!.map((da, l) => {
          const db = a[1]![l]!;
          return f(f(f(ac[l]! * db) + f(bc[l]! * da)) + f(da * db));
        });
        return;
      }
      case "math/div": {
        const [vcv, bc] = [stored(id), stored(e.args[1]!)];
        dl[id] = a[0]!.map((da, l) => {
          const db = a[1]![l]!;
          return f(f(da - f(vcv[l]! * db)) / f(bc[l]! + db));
        });
        return;
      }
      case "math/sin":
      case "math/cos": {
        const ac = lanesOf(vc[e.args[0]!]!);
        dl[id] = a[0]!.map((da, l) => {
          const s = f(Math.sin(ac[l]!));
          const co = f(Math.cos(ac[l]!));
          const sd = f(Math.sin(da));
          const h2 = f(2 * f(f(Math.sin(f(da / 2))) ** 2));
          return e.op === "math/sin"
            ? f(f(co * sd) - f(s * h2))
            : f(f(-s * sd) - f(co * h2));
        });
        return;
      }
      case "math/select": {
        // The condition reads only table values: constant within a row.
        const cond = vc[e.args[0]!] as boolean;
        dl[id] = cond ? a[1]! : a[2]!;
        return;
      }
      default:
        throw new Error(`residual emulation: no rule for ${e.op}`);
    }
  });
  const out = p.outputs[0]!;
  const crossing = lanesOf(centerAtVertexRows.out[out.name]!).map((x, l) =>
    f(x - lanesOf(centerAtCenterRows.out[out.name]!)[l]!),
  );
  return { delta: dl[out.id]!.map((x, l) => f(crossing[l]! + x)), rows: rowsV };
}

/** Per-draw floats the residual form would store, by the count of center values its rules read. */
export function perDrawEstimate(
  p: Program,
  window = 1,
): { floats: number; detail: Record<string, number> } {
  const tablesOf: Set<string>[] = [];
  const posDep: boolean[] = [];
  p.eqns.forEach((e, id) => {
    tablesOf[id] = new Set(e.args.flatMap((x) => [...tablesOf[x]!]));
    if (e.table) {
      tablesOf[id]!.add(e.table);
    }
    posDep[id] = e.op === "input" || e.args.some((x) => posDep[x]);
  });
  const read = new Set<number>();
  p.eqns.forEach((e) => {
    if (e.op === "math/mul" || e.op === "math/div") {
      e.args.forEach((x) => posDep[x] && read.add(x));
    }
    if (e.op === "math/sin" || e.op === "math/cos") {
      read.add(e.args[0]!);
    }
  });
  const rows = 2 * window + 1;
  let centerValues = 0;
  for (const id of read) {
    const per = p.eqns[id]!.type === "float" ? 1 : width(p.eqns[id]!.type);
    centerValues += per * rows ** tablesOf[id]!.size;
  }
  const tables = p.tables?.length ?? 0;
  const detail = {
    "F(c), hi and lo": 6,
    "center values the rules read, per window row": centerValues,
    "crossing terms (3 lanes per window row per table)": 3 * rows * tables,
    "window breakpoints, relative to the center": (rows - 1) * tables,
    "center rows (as floats)": tables,
  };
  return { floats: Object.values(detail).reduce((s, x) => s + x, 0), detail };
}
