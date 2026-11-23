// The corridor unroll on the GPU path: the restricted-JS source the route
// compiler reads, against the float64 map the CPU runs, over a long
// alignment (the Täsch to Zermatt road's 39 lines, and a mixed one of lines
// and arcs), at stations across every join and offsets out to kilometers.
// The compiled route is exact closed-form code, never a fit: this pins its
// map, its Jacobian and its size.
import { describe, expect, it } from "vitest";
import { ROAD } from "../examples/transform-graph/data/road.ts";
import {
  clearCompileCache,
  compileRoute,
} from "../packages/core/src/transform/compile.ts";
import { parseTransform } from "../packages/core/src/transform/parse.ts";
import {
  affine,
  evaluate,
  jacobian,
  routeBetween,
  TransformGraph,
} from "../packages/core/src/transform/index.ts";
import {
  corridorUnroll,
  corridorUnrollDescriptor,
  type CorridorOptions,
} from "../packages/core/src/transforms/index.ts";
import { defaultParams } from "../packages/core/src/transforms/descriptor.ts";

/** The road in plan meters about its middle (an equirectangular scale is enough for a shape). */
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

interface Case {
  readonly name: string;
  readonly options: CorridorOptions;
  /** The offsets to test, m: the largest stays inside every radius of curvature. */
  readonly offsets: readonly number[];
}

const cases: Case[] = [
  {
    name: "a 39-line polyline",
    options: { polyline: road },
    offsets: [-35, 0, 35, 1500, -1500],
  },
  {
    name: "lines and arcs",
    options: mixed,
    offsets: [-300, 0, 300, 600, -600],
  },
];

/** Stations across the alignment: each join and a hair either side, past both ends, and a sweep. */
function stationsOf(
  values: Readonly<Record<string, number>>,
  elements: number,
): number[] {
  const out: number[] = [];
  const joins = [
    ...Array.from({ length: elements }, (_, i) => values[`s${i}`]!),
    values.se!,
  ];
  for (const s of joins) {
    out.push(s - 1e-6, s - 1e-9, s, s + 1e-9, s + 1e-6);
  }
  const first = joins[0]!;
  const last = joins[joins.length - 1]!;
  out.push(first - 500, first - 1e-3, last + 1e-3, last + 500);
  for (let i = 0; i <= 400; i++) {
    out.push(first + ((last - first) * i) / 400 + 0.137);
  }
  return out;
}

describe("corridorUnroll's compiled source", () => {
  for (const { name, options, offsets } of cases) {
    const descriptor = corridorUnrollDescriptor(options);
    const params = defaultParams(descriptor);
    const elements = Object.keys(descriptor.params).filter((k) =>
      /^s\d+$/.test(k),
    ).length;
    const program = parseTransform(descriptor.source);
    const stations = stationsOf(params, elements);

    it(`${name}: the map agrees with the float64 map at every station and offset`, () => {
      const out = new Float64Array(3);
      let worst = 0;
      for (const s of stations) {
        for (const o of offsets) {
          const p = [s, o, 12.5];
          descriptor.forward(p, params, out);
          const q = evaluate(program, p, params);
          worst = Math.max(
            worst,
            Math.abs(q[0]! - out[0]!),
            Math.abs(q[1]! - out[1]!),
            Math.abs(q[2]! - out[2]!),
          );
        }
      }
      // The same arithmetic in two places: float64 rounding of kilometers.
      expect(worst).toBeLessThan(1e-8);
    });

    it(`${name}: the autodiff Jacobian agrees with the analytic one`, () => {
      const out = new Float64Array(3);
      const analytic = new Float64Array(9);
      let worst = 0;
      for (const s of stations) {
        for (const o of offsets) {
          const p = [s, o, 3];
          descriptor.forward(p, params, out, analytic);
          const ad = jacobian(program, p, params);
          // The autodiff's J is row-major, the descriptor's column-major.
          for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
              worst = Math.max(
                worst,
                Math.abs(ad[3 * i + j]! - analytic[3 * j + i]!),
              );
            }
          }
        }
      }
      // J = [T (1 - offset κ), N, ẑ]: unit tangents and normals, so absolute.
      expect(worst).toBeLessThan(1e-9);
    });

    it(`${name}: a float32 evaluation about the draw's own center keeps millimeters at kilometer offsets`, () => {
      // The compiled route works on the change from a draw's center, so what
      // float32 has to hold is the offset from it, not the plan coordinate.
      const out = new Float64Array(3);
      const center = new Float64Array(3);
      const f32 = Math.fround;
      let worst = 0;
      for (let i = 0; i < stations.length; i += 7) {
        for (const o of offsets) {
          const c = [stations[i]!, o, 0];
          descriptor.forward(c, params, center);
          for (const [ds, dOff] of [
            [3, 0.5],
            [-8, -2],
            [25, 40],
            [-60, 90],
          ] as const) {
            const p = [c[0]! + ds, c[1]! + dOff, 0];
            descriptor.forward(p, params, out);
            // The change in the output, float64, then through float32 as the residual pass stores it.
            const exact = [out[0]! - center[0]!, out[1]! - center[1]!];
            const q = evaluate(program, p, params);
            const viaSource = [
              f32(q[0]! - center[0]!),
              f32(q[1]! - center[1]!),
            ];
            worst = Math.max(
              worst,
              Math.abs(viaSource[0]! - exact[0]!),
              Math.abs(viaSource[1]! - exact[1]!),
            );
          }
        }
      }
      expect(worst).toBeLessThan(1e-4);
    });
  }

  it("a route over the 39-line polyline compiles, as closed-form code and not a fit", () => {
    clearCompileCache();
    const graph = new TransformGraph();
    const world = graph.root("world");
    const unroll = graph.add(
      "corridor",
      world,
      corridorUnroll({ polyline: road }),
    );
    const content = graph.add(
      "content",
      unroll,
      affine({
        matrix: Float64Array.of(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1),
      }),
    );
    const compiled = compileRoute(routeBetween(content, world));
    if (!compiled.ok) {
      throw new Error(compiled.reason);
    }
    // A regression budget at today's size (37,811 characters, 416 floats per
    // draw, 200 dynamic parameters): the program grows with the element
    // count, which a table lookup in the IR would remove. 3,551 of those
    // characters are the center term's integer helpers (CS-921, CS-1096 A:
    // centerTerm.ts), which every route module carries once, whatever its
    // element count.
    expect(compiled.wgsl.length).toBeLessThan(39_500);
    expect(compiled.perDrawLayout.floats).toBeLessThan(440);
  });
});
