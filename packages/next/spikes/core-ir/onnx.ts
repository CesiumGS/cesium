// Spike (b): ONNX's graph format as the core IR. A program becomes an ONNX
// model (opset 28, IR 14) over double tensors: scalars are shape [], vectors
// shape [n]. Literals become graph inputs with initializers (ONNX's own
// "overridable default"), so literals-to-uniforms maps onto the format.
// Rates have no place in ONNX and go in `metadata_props`. Ops ONNX lacks
// (atan2, fract, mix, smoothstep, dot, cross, ...) are decomposed. The
// reader turns such a graph back into the IR, so the same passes run; a
// real (b) would write them against ONNX nodes instead.

import { Builder, width, type Id, type Program, type Type } from "./cir.ts";

export const OPSET = 28;
export const ONNX_IR_VERSION = 14;
const DOUBLE = 11;
const BOOL = 9;
const INT64 = 7;

export interface OnnxNode {
  op_type: string;
  input: string[];
  output: string[];
  attribute?: { name: string; i?: number; ints?: number[]; type: number }[];
}
export interface OnnxTensor {
  name: string;
  data_type: number;
  dims: number[];
  double_data?: number[];
  int64_data?: number[];
}
export interface OnnxValueInfo {
  name: string;
  elem_type: number;
  dims: number[];
}
export interface OnnxModel {
  ir_version: number;
  opset_import: { domain: string; version: number }[];
  graph: {
    name: string;
    node: OnnxNode[];
    initializer: OnnxTensor[];
    input: OnnxValueInfo[];
    output: OnnxValueInfo[];
  };
  metadata_props: { key: string; value: string }[];
}

const SIMPLE: Record<string, string> = {
  "math/add": "Add",
  "math/sub": "Sub",
  "math/mul": "Mul",
  "math/div": "Div",
  "math/neg": "Neg",
  "math/abs": "Abs",
  "math/sign": "Sign",
  "math/floor": "Floor",
  "math/ceil": "Ceil",
  "math/sqrt": "Sqrt",
  "math/exp": "Exp",
  "math/log": "Log",
  "math/sin": "Sin",
  "math/cos": "Cos",
  "math/tan": "Tan",
  "math/asin": "Asin",
  "math/acos": "Acos",
  "math/atan": "Atan",
  "math/sinh": "Sinh",
  "math/cosh": "Cosh",
  "math/tanh": "Tanh",
  "math/pow": "Pow",
  "math/min": "Min",
  "math/max": "Max",
  "math/lt": "Less",
  "math/le": "LessOrEqual",
  "math/gt": "Greater",
  "math/ge": "GreaterOrEqual",
  "math/eq": "Equal",
  "math/and": "And",
  "math/or": "Or",
  "math/not": "Not",
  "math/select": "Where",
};

const dimsOf = (t: Type) => (width(t) === 1 || t === "bool" ? [] : [width(t)]);
const elemOf = (t: Type) => (t === "bool" ? BOOL : DOUBLE);

export function toOnnx(
  p: Program,
  versions = { ir: ONNX_IR_VERSION, opset: OPSET },
): OnnxModel {
  const node: OnnxNode[] = [];
  const initializer: OnnxTensor[] = [];
  const input: OnnxValueInfo[] = [];
  const meta: { key: string; value: string }[] = [
    { key: "cesium.ir", value: p.version },
  ];
  let tmp = 0;
  const fresh = () => `t${tmp++}`;
  const consts = new Map<string, string>();
  const k = (v: number | number[]): string => {
    const key = JSON.stringify(v);
    let name = consts.get(key);
    if (!name) {
      name = `c${consts.size}`;
      consts.set(key, name);
      initializer.push({
        name,
        data_type: DOUBLE,
        dims: typeof v === "number" ? [] : [v.length],
        double_data: typeof v === "number" ? [v] : v,
      });
    }
    return name;
  };
  const i64 = (v: number[], scalar = false): string => {
    const name = `i${initializer.length}`;
    initializer.push({
      name,
      data_type: INT64,
      dims: scalar ? [] : [v.length],
      int64_data: v,
    });
    return name;
  };
  const emit = (
    op_type: string,
    ins: string[],
    out = fresh(),
    attribute?: OnnxNode["attribute"],
  ) => {
    node.push(
      attribute
        ? { op_type, input: ins, output: [out], attribute }
        : { op_type, input: ins, output: [out] },
    );
    return out;
  };
  const names: string[] = [];
  p.eqns.forEach((e, id) => {
    const a = e.args.map((x) => names[x]!);
    const out = `v${id}`;
    const simple = SIMPLE[e.op];
    if (simple) {
      names[id] = emit(simple, a, out);
      return;
    }
    switch (e.op) {
      case "const": {
        const v = e.value!;
        names[id] =
          typeof v === "boolean"
            ? emit("Cast", [k(v ? 1 : 0)], out, [
                { name: "to", i: BOOL, type: 2 },
              ])
            : k(v as number | number[]);
        return;
      }
      case "literal":
        // An input with a default: the uniform a person edits.
        initializer.push({
          name: out,
          data_type: DOUBLE,
          dims: dimsOf(e.type),
          double_data:
            typeof e.value === "number"
              ? [e.value]
              : [...(e.value as number[])],
        });
        input.push({ name: out, elem_type: DOUBLE, dims: dimsOf(e.type) });
        meta.push({ key: `slot.${out}`, value: e.slot! });
        names[id] = out;
        return;
      case "input": {
        const inp = p.inputs[e.index!]!;
        input.push({
          name: inp.name,
          elem_type: elemOf(inp.type),
          dims: dimsOf(inp.type),
        });
        meta.push({ key: `rate.${inp.name}`, value: inp.rate });
        names[id] = inp.name;
        return;
      }
      case "math/rem":
        names[id] = emit("Mod", a, out, [{ name: "fmod", i: 1, type: 2 }]);
        return;
      case "math/trunc": {
        const neg = emit("Less", [a[0]!, k(0)]);
        names[id] = emit(
          "Where",
          [neg, emit("Ceil", [a[0]!]), emit("Floor", [a[0]!])],
          out,
        );
        return;
      }
      case "math/fract":
        names[id] = emit("Sub", [a[0]!, emit("Floor", [a[0]!])], out);
        return;
      case "math/round":
        names[id] = emit(
          "Mul",
          [
            emit("Sign", [a[0]!]),
            emit("Floor", [emit("Add", [emit("Abs", [a[0]!]), k(0.5)])]),
          ],
          out,
        );
        return;
      case "math/saturate":
        names[id] = emit("Min", [emit("Max", [a[0]!, k(0)]), k(1)], out);
        return;
      case "math/log2":
        names[id] = emit("Div", [emit("Log", [a[0]!]), k(Math.LN2)], out);
        return;
      case "math/clamp": {
        // KHR's min(max(a, min(b, c)), max(b, c)); Clip takes scalar bounds and no reversed ones.
        const lo = emit("Min", [a[1]!, a[2]!]);
        const hi = emit("Max", [a[1]!, a[2]!]);
        names[id] = emit("Min", [emit("Max", [a[0]!, lo]), hi], out);
        return;
      }
      case "math/mix":
        // KHR's (1 - c) a + c b, in that form.
        names[id] = emit(
          "Add",
          [
            emit("Mul", [emit("Sub", [k(1), a[2]!]), a[0]!]),
            emit("Mul", [a[2]!, a[1]!]),
          ],
          out,
        );
        return;
      case "math/smoothStep": {
        // KHR: saturate((c - min(a, b)) / |b - a|).
        const span = emit("Abs", [emit("Sub", [a[1]!, a[0]!])]);
        const t = emit("Min", [
          emit("Max", [
            emit("Div", [
              emit("Sub", [a[2]!, emit("Min", [a[0]!, a[1]!])]),
              span,
            ]),
            k(0),
          ]),
          k(1),
        ]);
        names[id] = emit(
          "Mul",
          [emit("Mul", [t, t]), emit("Sub", [k(3), emit("Mul", [k(2), t])])],
          out,
        );
        return;
      }
      case "math/atan2": {
        // atan(y/x) with the quadrant fixed: + π where x < 0 (sign of y), and ±π/2 at x = 0.
        const [y, x] = [a[0]!, a[1]!];
        const base = emit("Atan", [emit("Div", [y, x])]);
        const yNeg = emit("Less", [y, k(0)]);
        const turn = emit("Where", [yNeg, k(-Math.PI), k(Math.PI)]);
        const left = emit("Add", [base, turn]);
        const xNeg = emit("Less", [x, k(0)]);
        const xZero = emit("Equal", [x, k(0)]);
        const half = emit("Where", [yNeg, k(-Math.PI / 2), k(Math.PI / 2)]);
        names[id] = emit(
          "Where",
          [xZero, half, emit("Where", [xNeg, left, base])],
          out,
        );
        return;
      }
      case "math/dot":
        names[id] = emit("ReduceSum", [emit("Mul", a), i64([0])], out, [
          { name: "keepdims", i: 0, type: 2 },
        ]);
        return;
      case "math/length":
        names[id] = emit(
          "Sqrt",
          [
            emit(
              "ReduceSum",
              [emit("Mul", [a[0]!, a[0]!]), i64([0])],
              fresh(),
              [{ name: "keepdims", i: 0, type: 2 }],
            ),
          ],
          out,
        );
        return;
      case "math/normalize": {
        const len = emit("Sqrt", [
          emit("ReduceSum", [emit("Mul", [a[0]!, a[0]!]), i64([0])], fresh(), [
            { name: "keepdims", i: 0, type: 2 },
          ]),
        ]);
        names[id] = emit("Div", [a[0]!, len], out);
        return;
      }
      case "math/cross": {
        const g = (v: string, idx: number[]) =>
          emit("Gather", [v, i64(idx)], fresh(), [
            { name: "axis", i: 0, type: 2 },
          ]);
        const l = emit("Mul", [g(a[0]!, [1, 2, 0]), g(a[1]!, [2, 0, 1])]);
        const r = emit("Mul", [g(a[0]!, [2, 0, 1]), g(a[1]!, [1, 2, 0])]);
        names[id] = emit("Sub", [l, r], out);
        return;
      }
      case "type/boolToFloat":
        names[id] = emit("Cast", a, out, [{ name: "to", i: DOUBLE, type: 2 }]);
        return;
      default:
        break;
    }
    if (e.op.startsWith("math/combine")) {
      const axes = i64([0]);
      names[id] = emit(
        "Concat",
        a.map((x) => emit("Unsqueeze", [x, axes])),
        out,
        [{ name: "axis", i: 0, type: 2 }],
      );
      return;
    }
    if (e.op.startsWith("math/extract")) {
      names[id] = emit("Gather", [a[0]!, i64([e.index!], true)], out, [
        { name: "axis", i: 0, type: 2 },
      ]);
      return;
    }
    throw new Error(`onnx: no lowering for '${e.op}'`);
  });
  const output = p.outputs.map((o) => {
    const t = p.eqns[o.id]!.type;
    // An output must be a node's output: route constants and inputs through Identity.
    const name = emit("Identity", [names[o.id]!], o.name);
    return { name, elem_type: elemOf(t), dims: dimsOf(t) };
  });
  return {
    ir_version: versions.ir,
    opset_import: [{ domain: "", version: versions.opset }],
    graph: { name: "cesium", node, initializer, input, output },
    metadata_props: meta,
  };
}

// ---------------------------------------------------------------- reader

const INVERSE: Record<string, string> = Object.fromEntries(
  Object.entries(SIMPLE).map(([c, o]) => [o, c]),
);

/** An ONNX model this writer made, back to the IR (the passes' input). */
export function fromOnnx(m: OnnxModel): Program {
  const b = new Builder();
  const vals = new Map<string, Id>();
  const inits = new Map(m.graph.initializer.map((t) => [t.name, t]));
  const meta = new Map(m.metadata_props.map((x) => [x.key, x.value]));
  const typeOfInfo = (v: OnnxValueInfo): Type =>
    v.elem_type === BOOL
      ? "bool"
      : v.dims.length === 0
        ? "float"
        : (`float${v.dims[0]}` as Type);
  for (const v of m.graph.input) {
    const slot = meta.get(`slot.${v.name}`);
    const init = inits.get(v.name);
    if (slot && init) {
      vals.set(
        v.name,
        b.literal(
          slot,
          init.dims.length === 0 ? init.double_data![0]! : init.double_data!,
        ),
      );
    } else {
      vals.set(
        v.name,
        b.input(
          v.name,
          typeOfInfo(v),
          (meta.get(`rate.${v.name}`) ?? "fragment") as never,
        ),
      );
    }
  }
  for (const t of m.graph.initializer) {
    if (!vals.has(t.name) && t.data_type === DOUBLE) {
      vals.set(
        t.name,
        b.const(t.dims.length === 0 ? t.double_data![0]! : t.double_data!),
      );
    }
  }
  const get = (n: string) => {
    const v = vals.get(n);
    if (v === undefined) {
      throw new Error(`onnx: '${n}' has no value`);
    }
    return v;
  };
  const attr = (n: OnnxNode, name: string) =>
    n.attribute?.find((a) => a.name === name)?.i;
  for (const n of m.graph.node) {
    const out = n.output[0]!;
    const simple = INVERSE[n.op_type];
    let id: Id;
    if (simple) {
      const args = n.input.map(get);
      // ONNX broadcasts [] against [n]; the IR wants matching widths.
      const w = Math.max(...args.map((a) => width(b.typeOf(a))));
      const lifted = args.map((a, i) =>
        (n.op_type === "Where" && i === 0) || b.typeOf(a) === "bool"
          ? a
          : width(b.typeOf(a)) < w
            ? b.splat(a, w)
            : a,
      );
      id = b.op(simple, lifted);
    } else {
      switch (n.op_type) {
        case "Identity":
          id = get(n.input[0]!);
          break;
        case "Mod":
          id = b.op("math/rem", n.input.map(get));
          break;
        case "Cast":
          id =
            attr(n, "to") === BOOL
              ? b.const(b.constOf(get(n.input[0]!)) !== 0)
              : b.op("type/boolToFloat", [get(n.input[0]!)]);
          break;
        case "ReduceSum": {
          const x = get(n.input[0]!);
          const lanes = Array.from({ length: width(b.typeOf(x)) }, (_, i) =>
            b.op(`math/extract${width(b.typeOf(x))}`, [x], i),
          );
          id = lanes.reduce((s, l) => b.op("math/add", [s, l]));
          break;
        }
        case "Gather": {
          const x = get(n.input[0]!);
          const idx = inits.get(n.input[1]!)!;
          const nx = width(b.typeOf(x));
          const lanes = idx.int64_data!.map((i) =>
            b.op(`math/extract${nx}`, [x], i),
          );
          id =
            idx.dims.length === 0
              ? lanes[0]!
              : b.op(`math/combine${lanes.length}`, lanes);
          break;
        }
        case "Unsqueeze":
          id = get(n.input[0]!);
          break;
        case "Concat":
          id = b.op(`math/combine${n.input.length}`, n.input.map(get));
          break;
        default:
          throw new Error(`onnx reader: '${n.op_type}' isn't in the spike`);
      }
    }
    vals.set(out, id);
  }
  return b.program(
    Object.fromEntries(m.graph.output.map((o) => [o.name, get(o.name)])),
  );
}

// ---------------------------------------------------------------- protobuf

/** The model as protobuf bytes (onnx.proto field numbers), no dependency. */
export function encodeOnnx(m: OnnxModel): Uint8Array {
  const out: number[] = [];
  const varint = (buf: number[], v: number) => {
    let x = BigInt.asUintN(64, BigInt(v));
    do {
      let byte = Number(x & 0x7fn);
      x >>= 7n;
      if (x) {
        byte |= 0x80;
      }
      buf.push(byte);
    } while (x);
  };
  const key = (buf: number[], field: number, wire: number) =>
    varint(buf, (field << 3) | wire);
  const int = (buf: number[], field: number, v: number) => {
    key(buf, field, 0);
    varint(buf, v);
  };
  const bytes = (buf: number[], field: number, data: ArrayLike<number>) => {
    key(buf, field, 2);
    varint(buf, data.length);
    for (let i = 0; i < data.length; i++) {
      buf.push(data[i]!);
    }
  };
  const str = (buf: number[], field: number, s: string) =>
    bytes(buf, field, new TextEncoder().encode(s));
  const msg = (buf: number[], field: number, f: (b: number[]) => void) => {
    const inner: number[] = [];
    f(inner);
    bytes(buf, field, inner);
  };
  const tensor = (b: number[], t: OnnxTensor) => {
    for (const d of t.dims) {
      int(b, 1, d);
    }
    int(b, 2, t.data_type);
    if (t.int64_data) {
      const packed: number[] = [];
      for (const v of t.int64_data) {
        varint(packed, v);
      }
      bytes(b, 7, packed);
    }
    str(b, 8, t.name);
    if (t.double_data) {
      const f = new Float64Array(t.double_data);
      bytes(b, 10, new Uint8Array(f.buffer));
    }
  };
  const valueInfo = (b: number[], v: OnnxValueInfo) => {
    str(b, 1, v.name);
    msg(b, 2, (tp) =>
      msg(tp, 1, (tt) => {
        int(tt, 1, v.elem_type);
        msg(tt, 2, (shape) => {
          for (const d of v.dims) {
            msg(shape, 1, (dim) => int(dim, 1, d));
          }
        });
      }),
    );
  };
  int(out, 1, m.ir_version);
  str(out, 2, "cesium-core-ir-spike");
  msg(out, 7, (g) => {
    for (const n of m.graph.node) {
      msg(g, 1, (nb) => {
        for (const i of n.input) {
          str(nb, 1, i);
        }
        for (const o of n.output) {
          str(nb, 2, o);
        }
        str(nb, 4, n.op_type);
        for (const a of n.attribute ?? []) {
          msg(nb, 5, (ab) => {
            str(ab, 1, a.name);
            if (a.i !== undefined) {
              int(ab, 3, a.i);
            }
            int(ab, 20, a.type);
          });
        }
      });
    }
    str(g, 2, m.graph.name);
    for (const t of m.graph.initializer) {
      msg(g, 5, (tb) => tensor(tb, t));
    }
    for (const v of m.graph.input) {
      msg(g, 11, (vb) => valueInfo(vb, v));
    }
    for (const v of m.graph.output) {
      msg(g, 12, (vb) => valueInfo(vb, v));
    }
  });
  for (const o of m.opset_import) {
    msg(out, 8, (ob) => {
      str(ob, 1, o.domain);
      int(ob, 2, o.version);
    });
  }
  for (const p of m.metadata_props) {
    msg(out, 14, (pb) => {
      str(pb, 1, p.key);
      str(pb, 2, p.value);
    });
  }
  return new Uint8Array(out);
}
