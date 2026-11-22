// Golden fixtures for CS-53 (transforms move onto Cesium IR, as pure moves):
// today's outputs, recorded before anything moved, so each switch is checked
// against them. For each built-in: its parsed program's listing (as Cesium
// IR, up to renumbering), its evaluator outputs, Jacobians, Hessians,
// parameter derivatives and intervals at sample points (bit for bit), the
// kinks its queries see, and a Taylor bound over a box. For each compiled
// route: its WGSL modules (up to the numbering of their `let` and `var`
// names), its per-draw and uniform layouts and values, and the corridor's
// budgets.
//
// A fixture holds hashes of the long texts. Set TRANSFORM_GOLDEN_DUMP to a
// folder to write the texts themselves, to diff two commits' outputs.
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ROAD } from "../examples/transform-graph/data/road.ts";
import {
  flattenDescriptor,
  geocentricToGeographic,
  geocentricToGeographicDescriptor,
  geographicToGeocentricDescriptor,
  heightOffsetDescriptor,
  lambertConformalConicDescriptor,
  lambertConformalConicToGeographicDescriptor,
  transverseMercatorDescriptor,
  transverseMercatorToGeographicDescriptor,
  utm,
  verticalExaggerationDescriptor,
  verticalExaggerationEdge,
  webMercatorDescriptor,
  webMercatorToGeographicDescriptor,
} from "../packages/next/src/georeference/index.ts";
import { COMMUTATIVE } from "../packages/next/src/ir/ops.ts";
import type { Id, Program } from "../packages/next/src/ir/types.ts";
import {
  hessian,
  jacobian,
  parameterDerivatives,
} from "../packages/next/src/transform/ad.ts";
import {
  clearCompileCache,
  compileRoute,
} from "../packages/next/src/transform/compile.ts";
import { curvatureAt } from "../packages/next/src/transform/curvature.ts";
import { evaluate } from "../packages/next/src/transform/evaluate.ts";
import {
  affine,
  routeBetween,
  TransformGraph,
  type Params,
  type Route,
} from "../packages/next/src/transform/index.ts";
import { evaluateInterval } from "../packages/next/src/transform/interval.ts";
import { stepIr } from "../packages/next/src/transform/stepIr.ts";
import { taylorBounds } from "../packages/next/src/transform/taylorBounds.ts";
import {
  bendDescriptor,
  bumpDescriptor,
  corridorUnroll,
  corridorUnrollDescriptor,
  defaultParams,
  displacementName,
  edgeOf,
  latticeDescriptor,
  radialDistortionDescriptor,
  scaleAboutDescriptor,
  scaleAlongAxesDescriptor,
  taperDescriptor,
  twist,
  twistDescriptor,
  velocityModelDescriptor,
  type TransformDescriptor,
} from "../packages/next/src/transforms/index.ts";
import { parseTransform } from "../packages/next/src/transform/parse.ts";

// --- What a fixture records, and how --------------------------------------

/** The parsed program, as Cesium IR. */
const programOf = (source: string): Program => parseTransform(source);

/** The float parameters the program reads, in input order. */
const paramsOf = (p: Program): string[] => [
  ...new Set(
    p.eqns.flatMap((e) =>
      e.op === "input" && p.inputs[e.index!]!.name !== "p"
        ? [p.inputs[e.index!]!.name]
        : [],
    ),
  ),
];

const sha = (text: string) =>
  createHash("sha256").update(text).digest("hex").slice(0, 32);

/** A number as JSON keeps it bit for bit, but for -0 and the non-finite ones. */
const num = (x: number): number | string =>
  Object.is(x, -0) ? "-0" : Number.isFinite(x) ? x : String(x);
const nums = (xs: ArrayLike<number>) => Array.from(xs, num);

const valueText = (v: unknown): string =>
  JSON.stringify(v, (_k, x: unknown) => (typeof x === "number" ? num(x) : x));

/**
 * The program's listing up to renumbering: equations in depth-first order
 * from the outputs, operands in order, a commutative op's operands sorted by
 * a hash of what they compute.
 */
function listing(p: Program): string[] {
  const hash: string[] = [];
  const argsOf = (id: Id): Id[] => {
    const e = p.eqns[id]!;
    return COMMUTATIVE.has(e.op)
      ? [...e.args].sort((a, b) => (hash[a]! < hash[b]! ? -1 : 1))
      : [...e.args];
  };
  const head = (id: Id): string => {
    const e = p.eqns[id]!;
    const input = e.op === "input" ? p.inputs[e.index!]! : undefined;
    return [
      e.op,
      e.type,
      input ? `${input.name}@${input.rate}` : "",
      e.value !== undefined ? valueText(e.value) : "",
      e.op !== "input" && e.index !== undefined ? `[${e.index}]` : "",
      e.slot ?? "",
    ]
      .filter(Boolean)
      .join(" ");
  };
  p.eqns.forEach((_, id) => {
    hash[id] = sha(
      `${head(id)}(${argsOf(id)
        .map((a) => hash[a])
        .join(",")})`,
    );
  });
  const number = new Map<Id, number>();
  const lines: string[] = [];
  const visit = (id: Id) => {
    if (number.has(id)) {
      return;
    }
    const args = argsOf(id);
    args.forEach(visit);
    number.set(id, number.size);
    lines.push(
      `%${number.get(id)} = ${head(id)}${args.length ? ` ${args.map((a) => `%${number.get(a)}`).join(" ")}` : ""}`,
    );
  };
  for (const o of p.outputs) {
    visit(o.id);
  }
  lines.push(
    `out ${p.outputs.map((o) => `${o.name}=%${number.get(o.id)}`).join(" ")}`,
  );
  return lines;
}

/**
 * WGSL up to the numbering of the names it declares: each `let` or `var`
 * name with a digit in it becomes `_<k>`, counted from 0 in each function.
 * Struct members and the slots they hold (`c.v3.x`) keep their names.
 */
export function canonicalWgsl(text: string): string {
  let names = new Map<string, string>();
  return text
    .split("\n")
    .map((line) => {
      if (/^\s*fn /.test(line)) {
        names = new Map();
      }
      const declared = /\b(?:let|var) ([A-Za-z_]\w*)\b/.exec(line);
      if (declared && /\d/.test(declared[1]!)) {
        names.set(declared[1]!, `_${names.size}`);
      }
      return line.replace(
        /(?<![.\w])[A-Za-z_]\w*(?!\w)/g,
        (word) => names.get(word) ?? word,
      );
    })
    .join("\n");
}

const dumpDir = process.env.TRANSFORM_GOLDEN_DUMP;

function dump(name: string, file: string, text: string) {
  if (dumpDir) {
    mkdirSync(join(dumpDir, name), { recursive: true });
    writeFileSync(join(dumpDir, name, file), text);
  }
}

/** A long text's hash, its length, and its hash up to renumbering when it is WGSL. */
function textRecord(name: string, file: string, text: string, wgsl = true) {
  dump(name, file, text);
  if (!wgsl) {
    return { sha: sha(text), length: text.length };
  }
  const canonical = canonicalWgsl(text);
  dump(name, `${file}.canonical`, canonical);
  return { canonical: sha(canonical), canonicalLength: canonical.length };
}

const fixture = (name: string) =>
  `./fixtures/transformGolden/${name.replace(/[^A-Za-z0-9]+/g, "-")}.json`;

/** Arrays and maps longer than this are held as a hash of their exact text and a count. */
const LONG = 48;

/**
 * The record as JSON: numbers exact, long arrays and maps hashed, and an
 * array of numbers or strings on one line.
 */
function pretty(record: unknown): string {
  const exact = (x: unknown): unknown => {
    if (typeof x === "number") {
      return num(x);
    }
    if (Array.isArray(x)) {
      const items = x.map(exact);
      return items.length > LONG
        ? { n: items.length, sha: sha(JSON.stringify(items)) }
        : items;
    }
    if (x && typeof x === "object") {
      const entries = Object.entries(x).map(([k, v]) => [k, exact(v)]);
      return entries.length > LONG
        ? {
            n: entries.length,
            sha: sha(JSON.stringify(Object.fromEntries(entries))),
          }
        : Object.fromEntries(entries);
    }
    return x;
  };
  const text = JSON.stringify(exact(record), undefined, 1);
  // An array of plain values on one line.
  return `${text.replace(/\[\n[^[\]{}]*?\n\s*\]/g, (block) =>
    block.replace(/\n\s*/g, " ").replace("[ ", "[").replace(" ]", "]"),
  )}\n`;
}

// --- The built-ins ---------------------------------------------------------

const WGS84 = [6378137, 6378137, 6356752.314245179] as const;

interface Case {
  readonly name: string;
  readonly descriptor: TransformDescriptor;
  readonly params?: Params;
  /** Sample points in the function's input, and the draw centers of its route. */
  readonly points: readonly (readonly [number, number, number])[];
  /** The half-extent of the boxes about each point, per axis. */
  readonly half: readonly [number, number, number];
}

function latticeParams(degree: [number, number, number]): Params {
  const values: Record<string, number> = {
    ox: 1,
    oy: -2,
    oz: 3,
    e1x: 10,
    e1y: 1,
    e1z: 0,
    e2x: 0,
    e2y: 12,
    e2z: 1,
    e3x: 1,
    e3y: 0,
    e3z: 9,
  };
  let k = 0;
  for (let i = 0; i <= degree[0]; i++) {
    for (let j = 0; j <= degree[1]; j++) {
      for (let m = 0; m <= degree[2]; m++) {
        for (const axis of ["x", "y", "z"] as const) {
          values[displacementName(i, j, m, axis)] = Math.sin(1.7 * ++k) * 0.8;
        }
      }
    }
  }
  return values;
}

const polyline = [
  [0, 0],
  [100, 10],
  [180, 40],
  [230, 40.5],
] as const;

const alignment = {
  start: [100, -50] as const,
  heading: 0.3,
  station: 1000,
  elements: [
    { kind: "line", length: 100 },
    { kind: "arc", length: 80, radius: 150 },
    { kind: "line", length: 50 },
    { kind: "arc", length: 60, radius: -100 },
    { kind: "line", length: 40 },
  ] as const,
};

const utm32 = {
  centralMeridian: 9,
  scaleFactor: 0.9996,
  falseEasting: 500000,
  falseNorthing: 0,
};
const lcc = {
  lon0: -96,
  lat0: 23,
  lat1: 33,
  lat2: 45,
  falseEasting: 1e6,
  falseNorthing: -2e6,
};

const CASES: Case[] = [
  {
    name: "scaleAbout",
    descriptor: scaleAboutDescriptor,
    params: { cx: 3, cy: -2, cz: 1, sx: 2, sy: 0.5, sz: -1.5 },
    points: [
      [1, 2, 3],
      [-40, 25, 11],
    ],
    half: [5, 5, 5],
  },
  {
    name: "scaleAlongAxes",
    descriptor: scaleAlongAxesDescriptor,
    params: { ox: 2, oy: -1, oz: 0.5, sa: 1.5, sb: 0.75, sc: 2 },
    points: [
      [1, 2, 3],
      [-40, 25, 11],
    ],
    half: [5, 5, 5],
  },
  {
    name: "bump",
    descriptor: bumpDescriptor,
    params: {
      cx: 1,
      cy: 2,
      cz: 3,
      ux: 1,
      uy: 2,
      uz: 2,
      amplitude: 7,
      sigma: 20,
    },
    points: [
      [1, 2, 3],
      [10, -5, 6],
      [-30, 12, 0.5],
    ],
    half: [4, 4, 4],
  },
  {
    name: "bend",
    descriptor: bendDescriptor,
    params: { ox: 1, oz: -2, curvature: 0.02 },
    points: [
      [1, 2, 3],
      [10, -5, 6],
      [-20, 7, -3],
    ],
    half: [2, 2, 2],
  },
  {
    name: "twist",
    descriptor: twistDescriptor,
    params: { ox: 1, oy: 2, oz: 0, rate: 0.01 },
    points: [
      [1, 2, 3],
      [10, -5, 6],
      [-20, 7, -30],
    ],
    half: [3, 3, 3],
  },
  {
    name: "taper",
    descriptor: taperDescriptor,
    params: { ox: 1, oy: -1, oz: 2, ax: 1, ay: -1, az: 2, rate: 0.01 },
    points: [
      [1, 2, 3],
      [10, -5, 6],
      [-20, 7, -30],
    ],
    half: [3, 3, 3],
  },
  {
    name: "lattice 2x2x2",
    descriptor: latticeDescriptor([2, 2, 2]),
    params: latticeParams([2, 2, 2]),
    points: [
      [3, 2, 5],
      [8, 9, 7],
    ],
    half: [0.5, 0.5, 0.5],
  },
  {
    name: "lattice 1x2x3",
    descriptor: latticeDescriptor([1, 2, 3]),
    params: latticeParams([1, 2, 3]),
    points: [
      [3, 2, 5],
      [8, 9, 7],
    ],
    half: [0.5, 0.5, 0.5],
  },
  {
    name: "radialDistortion",
    descriptor: radialDistortionDescriptor,
    params: { k1: -0.2, k2: 0.05, k3: -0.01, p1: 0.001, p2: -0.002 },
    points: [
      [0.1, 0.2, 3],
      [-0.3, 0.4, 2],
      [2.5, -1.5, 6],
    ],
    half: [0.05, 0.05, 0.1],
  },
  {
    name: "velocityModel",
    descriptor: velocityModelDescriptor,
    params: { v0: 1800, g: 0.6 },
    points: [
      [1, 2, 0.5],
      [-30, 40, 2],
      [50, -60, 3.5],
    ],
    half: [5, 5, 0.2],
  },
  {
    name: "velocityModel, constant velocity",
    descriptor: velocityModelDescriptor,
    params: { v0: 1800, g: 0 },
    points: [
      [1, 2, 0.5],
      [-30, 40, 2],
    ],
    half: [5, 5, 0.2],
  },
  {
    name: "corridorUnroll, lines and arcs",
    descriptor: corridorUnrollDescriptor(alignment),
    points: [
      [1010, 3, 1],
      [1120, -8, 2],
      [1250, 15, -3],
      [1360, 2, 0],
    ],
    half: [2, 2, 1],
  },
  {
    name: "corridorUnroll, a polyline",
    descriptor: corridorUnrollDescriptor({ polyline }),
    points: [
      [50, 1, 2],
      [150, -2, 1],
      [215, 1.5, -2],
    ],
    half: [2, 1, 1],
  },
  {
    name: "verticalExaggeration",
    descriptor: verticalExaggerationDescriptor(WGS84),
    params: { factor: 3, ceiling: 9000, baseHeight: 0, band: 1800 },
    points: [
      [4.0e6, 3.0e5, 4.9e6],
      [4.2e6, 7.0e5, 4.75e6],
    ],
    half: [100, 100, 100],
  },
  {
    name: "heightOffset",
    descriptor: heightOffsetDescriptor(WGS84),
    params: { offset: 123 },
    points: [
      [4.0e6, 3.0e5, 4.9e6],
      [4.2e6, 7.0e5, 4.75e6],
    ],
    half: [100, 100, 100],
  },
  {
    name: "flatten",
    descriptor: flattenDescriptor(
      [
        [10, 45],
        [10.3, 44.95],
        [10.35, 45.2],
        [10.15, 45.1],
        [9.95, 45.25],
      ],
      WGS84,
    ),
    params: { height: 150, falloff: 4000 },
    points: [
      [4.4545e6, 7.86e5, 4.4885e6],
      [4.448e6, 8.04e5, 4.499e6],
    ],
    half: [200, 200, 200],
  },
  {
    name: "transverseMercator",
    descriptor: transverseMercatorDescriptor(WGS84),
    params: utm32,
    points: [
      [9.5, 46, 100],
      [5.1, 52.3, 20],
    ],
    half: [0.01, 0.01, 10],
  },
  {
    name: "lambertConformalConic",
    descriptor: lambertConformalConicDescriptor(WGS84),
    params: lcc,
    points: [
      [-96, 40, 10],
      [-110, 30, 500],
    ],
    half: [0.01, 0.01, 10],
  },
  {
    name: "webMercator",
    descriptor: webMercatorDescriptor(WGS84),
    points: [
      [10, 40, 10],
      [-120, -60, 300],
    ],
    half: [0.01, 0.01, 10],
  },
  {
    name: "geographicToGeocentric",
    descriptor: geographicToGeocentricDescriptor(WGS84),
    points: [
      [10, 40, 10],
      [-120, -60, 300],
    ],
    half: [0.01, 0.01, 10],
  },
  {
    name: "geocentricToGeographic",
    descriptor: geocentricToGeographicDescriptor(WGS84),
    points: [
      [4.0e6, 3.0e5, 4.9e6],
      [-2.0e6, -5.0e6, -3.1e6],
    ],
    half: [100, 100, 100],
  },
  {
    name: "transverseMercatorToGeographic",
    descriptor: transverseMercatorToGeographicDescriptor(WGS84),
    params: utm32,
    points: [
      [500100, 5.1e6, 100],
      [420000, 5.6e6, 20],
    ],
    half: [50, 50, 10],
  },
  {
    name: "lambertConformalConicToGeographic",
    descriptor: lambertConformalConicToGeographicDescriptor(WGS84),
    params: lcc,
    points: [
      [1.0e6, -1.0e6, 10],
      [2.5e5, -1.8e6, 500],
    ],
    half: [50, 50, 10],
  },
  {
    name: "webMercatorToGeographic",
    descriptor: webMercatorToGeographicDescriptor(WGS84),
    points: [
      [1.1e6, 4.8e6, 10],
      [-1.3e7, -8.0e6, 300],
    ],
    half: [50, 50, 10],
  },
];

// --- Routes ----------------------------------------------------------------

const RAD = Math.PI / 180;
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

/** A built-in's route: content (the identity) through the built-in to the world. */
function builtinRoute(c: Case): Route {
  const graph = new TransformGraph();
  const world = graph.root("world");
  const step = graph.add("step", world, edgeOf(c.descriptor, c.params));
  const content = graph.add("content", step, affine({ matrix: IDENTITY }));
  return routeBetween(content, world);
}

interface RouteCase {
  readonly name: string;
  readonly route: () => Route;
  readonly centers: readonly (readonly [number, number, number])[];
}

const ROUTES: RouteCase[] = [
  {
    name: "route exaggeration",
    route() {
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
        verticalExaggerationEdge({ factor: 10, ceiling: 9000 }),
      );
      const content = graph.add(
        "content",
        ex,
        affine({ matrix: enu(8.5, 46.5, 0) }),
      );
      return routeBetween(content, world);
    },
    centers: [
      [0, 0, 0],
      [1200, -800, 350],
    ],
  },
  {
    name: "route utm nested",
    route() {
      const graph = new TransformGraph();
      const world = graph.root("utm");
      const geo = graph.add("geo", world, utm({ zone: 31 }));
      const earth = graph.add("earth", geo, geocentricToGeographic());
      const ex = graph.add(
        "ex",
        earth,
        verticalExaggerationEdge({ factor: 3, ceiling: 9000 }),
      );
      const content = graph.add(
        "content",
        ex,
        affine({ matrix: enu(5, 46, 0) }),
      );
      return routeBetween(content, world);
    },
    centers: [
      [0, 0, 0],
      [1200, -800, 350],
    ],
  },
  {
    name: "route twist",
    route() {
      const graph = new TransformGraph();
      const world = graph.root("world");
      const view = graph.add(
        "view",
        world,
        affine({ matrix: rigid(0.3, [6378137.25, 12345.678, -9876.5]) }),
      );
      const tw = graph.add("tw", view, twist({ rate: 0.001 }));
      const content = graph.add(
        "content",
        tw,
        affine({ matrix: rigid(0, [1, 2, 3]) }),
      );
      return routeBetween(content, world);
    },
    centers: [
      [0, 0, 0],
      [40, -25, 12],
    ],
  },
];

const MODES = [
  ["exact", {}],
  ["linear", { normals: "linear" }],
  ["auto", { normals: "auto" }],
  ["none", { normals: false }],
] as const;

const EYE = [12.5, -40.25, 7.75];

function routeRecord(
  name: string,
  route: Route,
  centers: readonly (readonly [number, number, number])[],
) {
  const record: Record<string, unknown> = {};
  for (const [mode, options] of MODES) {
    clearCompileCache();
    const c = compileRoute(route, options);
    if (!c.ok) {
      record[mode] = { refused: c.reason };
      continue;
    }
    const at = `${name}/${mode}`;
    record[mode] = {
      wgsl: textRecord(at, "module.wgsl", c.wgsl),
      positionWgsl: textRecord(at, "position.wgsl", c.positionWgsl),
      centerConstantsWgsl:
        c.centerConstantsWgsl === undefined
          ? null
          : textRecord(at, "center.wgsl", c.centerConstantsWgsl),
      uniformsLayout: c.uniformsLayout,
      perDrawLayout: c.perDrawLayout,
      dynamicParams: c.dynamicParams,
      separableParams: c.separableParams,
      uniformParams: c.uniformParams,
      approximations: c.approximations,
      normalModes: c.normalModes,
      steps: c.steps.map((s) => ({
        id: s.id,
        locals: s.locals,
        value: s.value.outputs.length,
        jacobian: s.jacobian?.outputs.length ?? null,
      })),
      paramValues: c.paramValues(route),
      uniforms: nums(c.fillUniforms(route, undefined, EYE)),
      records: centers.map((p) => nums(c.centerConstants(p))),
      centerUniforms:
        c.centerConstantsWgsl === undefined
          ? null
          : nums(c.centerUniforms(route, centers.length)),
      packCenters: nums(c.packCenters(centers)),
    };
  }
  return record;
}

// --- The fixtures ----------------------------------------------------------

describe("golden fixtures: the built-ins", () => {
  for (const c of CASES) {
    it(`${c.name}: program, values, derivatives, intervals and its compiled route`, async () => {
      const values = { ...defaultParams(c.descriptor), ...c.params };
      const today = parseTransform(c.descriptor.source);
      const program = programOf(c.descriptor.source);
      const names = paramsOf(program);
      const lines = listing(program);
      dump(c.name, "listing.txt", `${lines.join("\n")}\n`);
      const edge = edgeOf(c.descriptor, c.params);
      const ir = stepIr(edge.spec);
      const route = builtinRoute(c);
      const record = {
        program: {
          equations: lines.length - 1,
          listing: sha(lines.join("\n")),
          params: names,
          outputs: program.outputs.length,
        },
        points: c.points.map((p) => {
          const box = {
            min: p.map((x, i) => x - c.half[i]!),
            max: p.map((x, i) => x + c.half[i]!),
          };
          return {
            p: nums(p),
            value: nums(evaluate(today, p, values)),
            jacobian: nums(jacobian(today, p, values)),
            hessian: nums(hessian(today, p, values)),
            parameters: nums(parameterDerivatives(today, names, p, values)),
            interval: evaluateInterval(today, box, values).map((b) => [
              num(b.lo),
              num(b.hi),
            ]),
          };
        }),
        stepIr: ir
          ? { kinked: ir.kinked, discontinuous: ir.discontinuous }
          : null,
        taylor: c.points.map((p) => {
          const t = taylorBounds(route, { center: p, halfExtent: c.half });
          return t.ok
            ? {
                center: nums(t.center),
                linear: nums(t.linear),
                remainder: nums(t.remainder),
                halfExtent: nums(t.halfExtent),
                continuous: t.continuous,
                hessianNorm: num(t.hessianNorm),
                oscillation: num(t.oscillation),
              }
            : { refused: t.reason };
        }),
        curvature: c.points.map((p) => num(curvatureAt(route, p))),
        route: routeRecord(c.name, route, c.points),
      };
      await expect(pretty(record)).toMatchFileSnapshot(fixture(c.name));
    });
  }
});

describe("golden fixtures: routes", () => {
  for (const r of ROUTES) {
    it(`${r.name}: its compiled modules, layouts and values`, async () => {
      const route = r.route();
      await expect(
        pretty(routeRecord(r.name, route, r.centers)),
      ).toMatchFileSnapshot(fixture(r.name));
    });
  }

  it("the corridor over the 39-line road: its budgets", async () => {
    clearCompileCache();
    const road = ROAD.map(
      ([lon, lat]) =>
        [(lon - 7.765) * 77_000, (lat - 46.045) * 111_000] as const,
    );
    const graph = new TransformGraph();
    const world = graph.root("world");
    const unroll = graph.add(
      "corridor",
      world,
      corridorUnroll({ polyline: road }),
    );
    const content = graph.add("content", unroll, affine({ matrix: IDENTITY }));
    const route = routeBetween(content, world);
    const c = compileRoute(route);
    if (!c.ok) {
      throw new Error(c.reason);
    }
    const program = programOf(
      corridorUnrollDescriptor({ polyline: road }).source,
    );
    const record = {
      wgsl: textRecord("corridor road", "module.wgsl", c.wgsl),
      wgslLength: c.wgsl.length,
      perDrawFloats: c.perDrawLayout.floats,
      uniformFloats: c.uniformsLayout.floats,
      dynamicParams: c.dynamicParams.length,
      equations: listing(program).length - 1,
      listing: sha(listing(program).join("\n")),
      route: routeRecord("corridor road", route, [
        [500, 3, 0],
        [4100, -12, 2],
      ]),
    };
    await expect(pretty(record)).toMatchFileSnapshot(
      fixture("route corridor road"),
    );
  });
});
