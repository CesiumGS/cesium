/** Scenes 4 and 5: a corridor unrolled to a profile sheet, and seismic time to depth. */
import {
  scaleBy,
  translate,
  type FnDef,
  type GNode,
  type V2,
} from "./graph.ts";
import { aff, area, fnEdge, line, point, range, text } from "./kit.ts";
import type { Built, Flags, Item, SceneDef, Values } from "./model.ts";

interface Piece {
  s0: number;
  len: number;
  kappa: number;
  x0: number;
  y0: number;
  phi0: number;
}

/** Straight, arc, straight, arc, straight: (length, curvature). */
const SPEC: readonly (readonly [number, number])[] = [
  [150, 0],
  [269, 1 / 220],
  [100, 0],
  [262, -1 / 300],
  [150, 0],
];

function layout(): Piece[] {
  const out: Piece[] = [];
  let s = 0;
  let x = 0;
  let y = 0;
  let phi = 0.12;
  for (const [len, kappa] of SPEC) {
    out.push({ s0: s, len, kappa, x0: x, y0: y, phi0: phi });
    if (kappa === 0) {
      x += len * Math.cos(phi);
      y += len * Math.sin(phi);
    } else {
      const next = phi + kappa * len;
      x += (Math.sin(next) - Math.sin(phi)) / kappa;
      y -= (Math.cos(next) - Math.cos(phi)) / kappa;
      phi = next;
    }
    s += len;
  }
  return out;
}

const PIECES = layout();
const LENGTH = PIECES.reduce((n, p) => n + p.len, 0);

const pieceAt = (s: number): Piece => {
  let pc = PIECES[0]!;
  for (const p of PIECES) {
    if (s >= p.s0) {
      pc = p;
    }
  }
  return pc;
};

function pose(s: number): { x: number; y: number; phi: number } {
  const pc = pieceAt(s);
  const ds = s - pc.s0;
  if (pc.kappa === 0) {
    return {
      x: pc.x0 + ds * Math.cos(pc.phi0),
      y: pc.y0 + ds * Math.sin(pc.phi0),
      phi: pc.phi0,
    };
  }
  const phi = pc.phi0 + pc.kappa * ds;
  return {
    x: pc.x0 + (Math.sin(phi) - Math.sin(pc.phi0)) / pc.kappa,
    y: pc.y0 - (Math.cos(phi) - Math.cos(pc.phi0)) / pc.kappa,
    phi,
  };
}

/** Station and offset to plan. */
function world(s: number, d: number): V2 {
  const p = pose(s);
  return [p.x - d * Math.sin(p.phi), p.y + d * Math.cos(p.phi)];
}

const SAMPLES = range(-60, LENGTH + 60, 400).map((s) => ({ s, ...pose(s) }));

/** (station, offset) → plan: the corridor's own coordinates, so a camera inside it sees the strip unrolled. */
const corridor: FnDef = {
  name: "corridor unroll",
  f(s, d) {
    const pc = pieceAt(s.v);
    const ds = s.sub(pc.s0);
    if (pc.kappa === 0) {
      const c = Math.cos(pc.phi0);
      const sn = Math.sin(pc.phi0);
      return [
        ds.scale(c).add(pc.x0).sub(d.scale(sn)),
        ds.scale(sn).add(pc.y0).add(d.scale(c)),
      ];
    }
    const phi = ds.scale(pc.kappa).add(pc.phi0);
    const sp = phi.sin();
    const cp = phi.cos();
    const ax = sp
      .sub(Math.sin(pc.phi0))
      .scale(1 / pc.kappa)
      .add(pc.x0);
    const ay = cp
      .sub(Math.cos(pc.phi0))
      .scale(-1 / pc.kappa)
      .add(pc.y0);
    return [ax.sub(d.mul(sp)), ay.add(d.mul(cp))];
  },
  guess(p) {
    let best = SAMPLES[0]!;
    let bd = Infinity;
    for (const q of SAMPLES) {
      const dd = (q.x - p[0]) ** 2 + (q.y - p[1]) ** 2;
      if (dd < bd) {
        bd = dd;
        best = q;
      }
    }
    return [
      best.s,
      (p[0] - best.x) * -Math.sin(best.phi) +
        (p[1] - best.y) * Math.cos(best.phi),
    ];
  },
};

const ground = (s: number) =>
  20 + 5 * Math.sin(s / 110) + 3 * Math.sin(s / 43 + 1) + 0.002 * s;
const GRADE0 = 17;
const GRADE = 0.009;
const Z_BASE = 10;

function road(v: Values, t: Flags): Built {
  const V = v.V!;
  const cam = t.worldView ? "world" : "sheet";
  const nodes: GNode[] = [
    { id: "world", label: "World (plan x, y)" },
    {
      id: "corridor",
      label: "Corridor (station, offset)",
      parent: "world",
      edge: fnEdge("f: unroll, A(s) + d·n(s)", corridor),
    },
    {
      id: "sheet",
      label: "Sheet (plan band)",
      parent: "corridor",
      edge: aff("place the plan band", translate(0, -160)),
    },
    {
      id: "vprofile",
      label: `Profile (station, elevation) ×${V.toFixed(0)}`,
      parent: "sheet",
      edge: aff("vertical × V, placed below", {
        a: 1,
        b: 0,
        c: 0,
        d: V,
        e: 0,
        f: -250 - Z_BASE * V,
      }),
    },
  ];

  const hills = [
    { s: 260, d: 75 },
    { s: 640, d: -80 },
  ];
  const rings = (inCorridor: boolean): V2[][] => {
    const out: V2[][] = [];
    for (const h of hills) {
      const c = world(h.s, h.d);
      const phi = pose(h.s).phi;
      for (const r of [30, 55, 80]) {
        out.push(
          range(0, 2 * Math.PI, 40)
            .slice(0, 40)
            .map((a): V2 => {
              const lx = 1.3 * r * Math.cos(a);
              const ly = r * Math.sin(a);
              if (inCorridor) {
                return [h.s + lx, h.d + ly];
              }
              return [
                c[0] + lx * Math.cos(phi) - ly * Math.sin(phi),
                c[1] + lx * Math.sin(phi) + ly * Math.cos(phi),
              ];
            }),
        );
      }
    }
    return out;
  };
  const fence: V2[] = inCorridorFence(t.hillsCorridor === true);
  const hillNode = t.hillsCorridor ? "corridor" : "world";

  const items: Item[] = [
    area("hills", "hills", hillNode, rings(t.hillsCorridor === true), "warm", {
      pick: true,
      plain: false,
    }),
    line("fence", "fence", hillNode, [fence], "ink", {
      width: 1.5,
      pick: true,
      dash: "7 4",
    }),
    area(
      "road",
      "road",
      "corridor",
      [
        [
          [0, -6],
          [LENGTH, -6],
          [LENGTH, 6],
          [0, 6],
        ],
      ],
      "accent",
      { pick: true, normals: true },
    ),
    line(
      "cl",
      "centreline",
      "corridor",
      [
        [
          [0, 0],
          [LENGTH, 0],
        ],
      ],
      "ink",
      { dash: "10 6", width: 1.2 },
    ),
    line(
      "row",
      "right of way",
      "corridor",
      [
        [
          [0, 22],
          [LENGTH, 22],
        ],
        [
          [0, -22],
          [LENGTH, -22],
        ],
      ],
      "muted",
      { dash: "3 4", width: 1 },
    ),
    line(
      "ticks",
      "station ticks",
      "corridor",
      range(0, 900, 9).map(
        (s) =>
          [
            [s, -10],
            [s, 10],
          ] as V2[],
      ),
      "ink",
      { width: 1, plain: true },
    ),
    // Profile and sheet furniture: authored in the sheet, so seen only there.
    line(
      "ground-profile",
      "ground profile",
      "vprofile",
      [range(0, LENGTH, 62).map((s): V2 => [s, ground(s)])],
      "warm",
      { width: 2.2, pick: true, only: "sheet", normals: true },
    ),
    line(
      "grade",
      "design grade",
      "vprofile",
      [
        [
          [0, GRADE0],
          [LENGTH, GRADE0 + GRADE * LENGTH],
        ],
      ],
      "accent",
      { dash: "8 4", width: 1.5, pick: true, only: "sheet" },
    ),
    line(
      "datum",
      "datum",
      "vprofile",
      [
        [
          [0, Z_BASE],
          [LENGTH, Z_BASE],
        ],
      ],
      "muted",
      {
        width: 1,
        only: "sheet",
      },
    ),
    text("plan-t", "sheet", [0, 280], "PLAN  H 1:500", {
      only: "sheet",
      dy: -4,
    }),
    text(
      "prof-t",
      "sheet",
      [0, -278],
      `PROFILE  H 1:500, V 1:${Math.round(500 / V)} (×${V.toFixed(0)})`,
      {
        only: "sheet",
      },
    ),
  ];
  for (const s of range(0, 900, 9).filter((_, i) => i % 2 === 0)) {
    items.push(
      text(`st${s}`, "corridor", [s, 0], `${s}`, {
        dy: 22,
        dx: -8,
        only: "sheet",
      }),
    );
  }
  // The two ends of the steepest 100 m of ground, for the slope measure.
  let s1 = 0;
  let best = 0;
  for (let s = 0; s <= LENGTH - 100; s += 10) {
    const dz = Math.abs(ground(s + 100) - ground(s));
    if (dz > best) {
      best = dz;
      s1 = s;
    }
  }
  const cols = (extra: boolean) => [
    { key: "world", label: "True (World, m)", node: "world" },
    ...(extra
      ? [{ key: "strip", label: "Strip (Corridor)", node: "corridor" }]
      : []),
    { key: "drawn", label: "Drawn (camera)", node: cam },
  ];

  const xs = [
    ...SAMPLES.map((q) => q.x),
    ...rings(false).flatMap((r) => r.map((p) => p[0])),
  ];
  const ys = [
    ...SAMPLES.map((q) => q.y),
    ...rings(false).flatMap((r) => r.map((p) => p[1])),
  ];
  const [x0, x1] = [Math.min(...xs), Math.max(...xs)];
  const [y0, y1] = [Math.min(...ys), Math.max(...ys)];
  const sW = 0.86 * Math.min(800 / (x1 - x0), 520 / (y1 - y0));
  const tissotPts: V2[] = [];
  for (const s of [150, 350, 550, 750]) {
    for (const d of [-60, 0, 60]) {
      tissotPts.push(world(s, d));
    }
  }
  return {
    nodes,
    items,
    panels: [
      {
        id: "main",
        x: 0,
        y: 0,
        w: 800,
        h: 520,
        camera: cam,
        view:
          cam === "world"
            ? { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, sx: sW, sy: sW }
            : { cx: 475, cy: 70, sx: 0.72, sy: 0.72 },
      },
    ],
    measures: [
      {
        id: "cl",
        label: "Centreline, station 100 to 800",
        mode: "curve",
        a: { node: "corridor", p: [100, 0] },
        b: { node: "corridor", p: [800, 0] },
        cols: cols(true),
      },
      {
        id: "left",
        label: "Left edge, offset +22 m",
        mode: "curve",
        a: { node: "corridor", p: [100, 22] },
        b: { node: "corridor", p: [800, 22] },
        cols: cols(true),
      },
      {
        id: "right",
        label: "Right edge, offset −22 m",
        mode: "curve",
        a: { node: "corridor", p: [100, -22] },
        b: { node: "corridor", p: [800, -22] },
        cols: cols(true),
      },
      {
        id: "slope",
        label: `Grade chord, stations ${s1} to ${s1 + 100}`,
        mode: "curve",
        a: { node: "vprofile", p: [s1, ground(s1)] },
        b: { node: "vprofile", p: [s1 + 100, ground(s1 + 100)] },
        cols: [
          { key: "world", label: "True (profile, m)", node: "vprofile" },
          { key: "drawn", label: "Drawn (camera)", node: cam },
        ],
      },
    ],
    tissot: { node: "world", pts: tissotPts, r: 14 },
    sigma: { node: "world", at: world(240, 70), sigma: 15, unit: "m" },
  };
}

function inCorridorFence(inCorridor: boolean): V2[] {
  return inCorridor
    ? [
        [100, -120],
        [820, 110],
      ]
    : [world(100, -120), world(820, 110)];
}

export const PLAN_PROFILE: SceneDef = {
  id: "road",
  title: "Nested: plan and profile (civil)",
  short: "4 · Plan and profile",
  caption:
    "A road alignment curves across hills. The corridor node is a function from (station, offset) to plan, so a camera inside it sees the corridor unrolled to a straight strip, while the hills, authored in plan, are carried through its inverse (Newton). The profile below is authored in (station, elevation) and its vertical ×V is affine, so it collapses into a matrix. Measure the edge of the road: station length and true length part company away from the centreline.",
  controls: [
    {
      key: "V",
      label: "Vertical ×",
      min: 2,
      max: 12,
      step: 1,
      init: 10,
      digits: 0,
    },
  ],
  toggles: [
    { key: "worldView", label: "Camera in World (as surveyed)", init: false },
    {
      key: "hillsCorridor",
      label: "Hills authored in the Corridor node, not in World",
      init: false,
    },
  ],
  overlays: { tissot: true },
  build: road,
};

/* -------------------------------------------------------------------------- */

const X_MID = 3000;
const NOMINAL = { v0: 2000, k: 0.5, b: 0.1 };

/** Time to depth: v(z) = v₀(x) + k·z, with a lateral gradient b in v₀. */
function velocity(v0: number, k: number, b: number): FnDef {
  return {
    name: "velocity model",
    f(x, t) {
      const vx = x
        .sub(X_MID)
        .scale(b / X_MID)
        .add(1)
        .scale(v0);
      const e = t
        .scale(k / 2000)
        .exp()
        .sub(1);
      return [x, vx.mul(e).scale(1 / k)];
    },
    guess(p) {
      const vx = v0 * (1 + (b * (p[0] - X_MID)) / X_MID);
      return [p[0], (2000 / k) * Math.log(1 + (k * p[1]) / vx)];
    },
  };
}

const depthAt = (
  x: number,
  t: number,
  v0 = NOMINAL.v0,
  k = NOMINAL.k,
  b = NOMINAL.b,
) => {
  const vx = v0 * (1 + (b * (x - X_MID)) / X_MID);
  return (vx / k) * (Math.exp((k * t) / 2000) - 1);
};

const HORIZONS: ((x: number) => number)[] = [
  (x) => 330 + 45 * Math.sin(x / 950),
  (x) => 640 + 80 * Math.cos(x / 1250 + 0.4),
  (x) =>
    960 - 150 * Math.exp(-(((x - 3000) / 1000) ** 2)) + 25 * Math.sin(x / 600),
  (x) =>
    1230 - 60 * Math.exp(-(((x - 3100) / 1600) ** 2)) + 30 * Math.sin(x / 700),
];
const T_MAX = 1400;
const X_MAX = 6000;
const WELL_X = 4800;

function seismic(v: Values, t: Flags): Built {
  const V = v.V!;
  const cam = t.timeView ? "time" : "display";
  const nodes: GNode[] = [
    { id: "display", label: `Display (depth ×${V.toFixed(1)})` },
    {
      id: "depth",
      label: "Depth section (x, z)",
      parent: "display",
      edge: aff("vertical exaggeration", scaleBy(1, V)),
    },
    {
      id: "time",
      label: "Time section (x, TWT ms)",
      parent: "depth",
      edge: fnEdge(
        `f: velocity model v = ${v.v0!.toFixed(0)} + ${v.k!.toFixed(2)}·z`,
        velocity(v.v0!, v.k!, v.b!),
      ),
    },
  ];
  const xs = range(0, X_MAX, 24);
  const hz = HORIZONS.map((h) => xs.map((x): V2 => [x, h(x)]));
  const flat = (tt: number): V2[] => xs.map((x): V2 => [x, tt]);
  const bounds = [flat(0), ...hz, flat(T_MAX)];
  const tones = ["muted", "warm", "muted", "warm", "muted"] as const;
  const items: Item[] = [
    ...tones.map((tone, i) =>
      area(
        `layer${i}`,
        `layer ${i + 1}`,
        "time",
        [[...bounds[i]!, ...[...bounds[i + 1]!].reverse()]],
        tone,
        { plain: false },
      ),
    ),
    ...hz.map((h, i) =>
      line(
        `h${i + 1}`,
        `horizon H${i + 1}`,
        "time",
        [h],
        i === 2 ? "accent" : "ink",
        {
          width: i === 2 ? 2.6 : 1.4,
          pick: i === 2,
          normals: i === 2,
        },
      ),
    ),
    line(
      "fault",
      "fault",
      "time",
      [
        [
          [3700, 260],
          [4350, 1380],
        ],
      ],
      "bad",
      {
        width: 2,
        pick: true,
      },
    ),
    line(
      "iso",
      "iso-time lines",
      "time",
      [400, 800, 1200].map(
        (tt) =>
          [
            [0, tt],
            [X_MAX, tt],
          ] as V2[],
      ),
      "muted",
      { dash: "4 4", width: 1 },
    ),
    ...[400, 800, 1200].map((tt) =>
      text(`t${tt}`, "time", [X_MAX, tt], `${tt} ms`, { dx: 6, dy: 4 }),
    ),
    line(
      "well",
      "well and tops",
      "depth",
      [
        [
          [WELL_X, 0],
          [WELL_X, 1600],
        ],
      ],
      "good",
      { width: 2.4, pick: true },
    ),
    ...HORIZONS.map((h, i) =>
      point(
        `top${i}`,
        `H${i + 1} top`,
        "depth",
        [WELL_X, depthAt(WELL_X, h(WELL_X))],
        "good",
        {
          marker: "square",
          size: 4.5,
        },
      ),
    ),
    ...[0, 500, 1000, 1500].map((z) =>
      text(`z${z}`, "depth", [0, z], `${z} m`, { dx: -8, dy: 4 }),
    ),
  ];
  const tissotPts: V2[] = [];
  for (const x of [800, 2000, 3200, 4400, 5400]) {
    for (const tt of [250, 600, 950, 1250]) {
      tissotPts.push([x, tt]);
    }
  }
  const h3 = HORIZONS[2]!;
  const h4 = HORIZONS[3]!;
  return {
    nodes,
    items,
    panels: [
      {
        id: "main",
        x: 0,
        y: 0,
        w: 800,
        h: 520,
        camera: cam,
        view:
          cam === "time"
            ? { cx: X_MID, cy: 700, sx: 0.1, sy: -0.34 }
            : { cx: X_MID, cy: V * 838, sx: 0.1, sy: -0.1 },
      },
    ],
    measures: [
      {
        id: "tie",
        label: "H3 against the well's top",
        mode: "pair",
        a: { node: "time", p: [WELL_X, h3(WELL_X)] },
        b: { node: "depth", p: [WELL_X, depthAt(WELL_X, h3(WELL_X))] },
        cols: [
          { key: "true", label: "True (depth, m)", node: "depth" },
          {
            key: "drawn",
            label: cam === "time" ? "Drawn (camera, ms)" : "Drawn (camera)",
            node: cam,
          },
        ],
      },
      {
        id: "thick",
        label: "H3 to H4 at x = 3000",
        mode: "pair",
        a: { node: "time", p: [3000, h3(3000)] },
        b: { node: "time", p: [3000, h4(3000)] },
        cols: [
          { key: "true", label: "True (depth, m)", node: "depth" },
          {
            key: "drawn",
            label: cam === "time" ? "Drawn (camera, ms)" : "Drawn (camera)",
            node: cam,
          },
        ],
      },
    ],
    tissot: { node: "time", pts: tissotPts, r: 170 },
    sigma: { node: "time", at: [3000, h3(3000)], sigma: 120, unit: "m, ms" },
  };
}

export const SEISMIC: SceneDef = {
  id: "seismic",
  title: "Nested: seismic time to depth",
  short: "5 · Time to depth",
  caption:
    "A seismic section recorded in two-way time is placed under a velocity-model node, whose function maps time to depth with v increasing downward, and the depth section sits under an affine vertical exaggeration. Horizons become curves, a straight fault bends, and moving the velocity model shifts the horizon against the well's fixed tops. A time pick's σ grows into a depth σ through the same J.",
  controls: [
    {
      key: "v0",
      label: "Surface velocity v₀",
      min: 1500,
      max: 3000,
      step: 50,
      init: NOMINAL.v0,
      unit: " m/s",
      digits: 0,
    },
    {
      key: "k",
      label: "Velocity gradient k",
      min: 0.1,
      max: 1.2,
      step: 0.05,
      init: NOMINAL.k,
      unit: " /s",
      digits: 2,
    },
    {
      key: "b",
      label: "Lateral gradient b",
      min: -0.3,
      max: 0.3,
      step: 0.02,
      init: NOMINAL.b,
      digits: 2,
    },
    {
      key: "V",
      label: "Vertical exaggeration",
      min: 1,
      max: 3,
      step: 0.1,
      init: 2.5,
      digits: 1,
    },
  ],
  toggles: [
    {
      key: "timeView",
      label: "Camera in the Time node (the raw section)",
      init: false,
    },
  ],
  overlays: { tissot: true },
  build: seismic,
};
