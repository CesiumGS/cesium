/** Scenes 6 and 7: an exploded view, and a lens on the camera. */
import {
  translate,
  type Edge,
  type FnDef,
  type GNode,
  type V2,
} from "./graph.ts";
import { aff, area, fnEdge, line, point, range, rect, text } from "./kit.ts";
import type { Built, Flags, Item, SceneDef, Tone, Values } from "./model.ts";

interface Part {
  id: string;
  label: string;
  dir: V2;
  tone: Tone;
  poly: V2[];
  /** Where the label sits, in the part's own frame. */
  at: V2;
}

const PARTS: Part[] = [
  {
    id: "nut",
    label: "nut",
    dir: [0, -70],
    tone: "warm",
    poly: rect(-8, -8, 8, 0),
    at: [10, -4],
  },
  {
    id: "base",
    label: "base plate",
    dir: [0, -32],
    tone: "muted",
    poly: rect(-70, 0, 70, 10),
    at: [74, 5],
  },
  {
    id: "bracket",
    label: "bracket",
    dir: [0, 6],
    tone: "accent",
    poly: [
      [-50, 10],
      [50, 10],
      [50, 22],
      [-36, 22],
      [-36, 64],
      [-50, 64],
    ],
    at: [54, 16],
  },
  {
    id: "washer",
    label: "washer",
    dir: [0, 34],
    tone: "good",
    poly: rect(-9, 22, 9, 24.5),
    at: [13, 23],
  },
  {
    id: "bolt",
    label: "bolt",
    dir: [0, 76],
    tone: "bad",
    poly: [
      [-9, 34.5],
      [9, 34.5],
      [9, 24.5],
      [4, 24.5],
      [4, -12],
      [-4, -12],
      [-4, 24.5],
      [-9, 24.5],
    ],
    at: [13, 33],
  },
];

const centre = (p: Part): V2 => {
  const ys = p.poly.map((q) => q[1]);
  return [0, (Math.min(...ys) + Math.max(...ys)) / 2];
};

function exploded(v: Values, t: Flags): Built {
  const e = v.t!;
  const cam = t.onBolt ? "ex_bolt" : "asm";
  const nodes: GNode[] = [
    { id: "asm", label: "Assembly" },
    ...PARTS.map((p): GNode => ({
      id: `ex_${p.id}`,
      label: `Explode: ${p.label}`,
      parent: "asm",
      edge: aff(
        `offset (${p.dir[0]}, ${p.dir[1]}) × t`,
        translate(p.dir[0] * e, p.dir[1] * e),
      ),
    })),
  ];
  const rest: Record<string, Edge> = Object.fromEntries(
    PARTS.map((p) => [`ex_${p.id}`, aff("at rest", translate(0, 0))]),
  );
  const items: Item[] = [
    ...PARTS.map((p) =>
      line(
        `trail_${p.id}`,
        `${p.label} trail`,
        "asm",
        [
          [
            centre(p),
            [centre(p)[0] + p.dir[0] * e, centre(p)[1] + p.dir[1] * e],
          ],
        ],
        "muted",
        { dash: "2 3", width: 1 },
      ),
    ),
    ...PARTS.map((p) =>
      area(`part_${p.id}`, p.label, `ex_${p.id}`, [p.poly], p.tone, {
        pick: true,
        normals: true,
      }),
    ),
    ...PARTS.map((p) =>
      text(`lbl_${p.id}`, `ex_${p.id}`, p.at, p.label, { dx: 4, dy: 4 }),
    ),
    point("a_head", "bolt head underside", "ex_bolt", [0, 24.5], "ink", {
      size: 3,
    }),
    point("a_flange", "bracket flange top", "ex_bracket", [0, 22], "ink", {
      size: 3,
    }),
    point("a_shank", "bolt shank", "ex_bolt", [4, 10], "ink", { size: 3 }),
    point("a_wall", "bracket wall", "ex_bracket", [-36, 40], "ink", {
      size: 3,
    }),
  ];
  const cols = (): Built["measures"][number]["cols"] => [
    {
      key: "true",
      label: "True (Assembly, t = 0)",
      node: "asm",
      override: rest,
    },
    { key: "drawn", label: "Drawn (camera)", node: cam },
  ];
  const tissotPts: V2[] = [];
  for (const x of [-45, 0, 45]) {
    for (const y of [-35, 5, 45, 85]) {
      tissotPts.push([x, y]);
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
        view: {
          cx: 0,
          cy: t.onBolt ? 10 : 12,
          sx: t.onBolt ? 1.5 : 2.3,
          sy: t.onBolt ? 1.5 : 2.3,
        },
      },
    ],
    measures: [
      {
        id: "head",
        label: "Bolt head to bracket flange",
        mode: "pair",
        a: { node: "ex_bolt", p: [0, 24.5] },
        b: { node: "ex_bracket", p: [0, 22] },
        cols: cols(),
      },
      {
        id: "wall",
        label: "Bolt shank to bracket wall",
        mode: "pair",
        a: { node: "ex_bolt", p: [4, 10] },
        b: { node: "ex_bracket", p: [-36, 40] },
        cols: cols(),
      },
    ],
    tissot: { node: "asm", pts: tissotPts, r: 9 },
    sigma: { node: "ex_bolt", at: [0, -12], sigma: 3, unit: "mm" },
  };
}

export const EXPLODED: SceneDef = {
  id: "exploded",
  title: "Exploded view",
  short: "6 · Exploded view",
  caption:
    "Each part sits under its own explode node, an affine offset along a direction times t. Every route is affine, so each collapses to a single matrix. Picks and measurements map back through the inverse matrix for free, and the true distance is the same route with the explode nodes at rest.",
  controls: [
    {
      key: "t",
      label: "Explode t",
      min: 0,
      max: 1,
      step: 0.01,
      init: 0.6,
      digits: 2,
    },
  ],
  toggles: [
    { key: "onBolt", label: "Camera on the bolt's explode node", init: false },
  ],
  overlays: { route: true },
  build: exploded,
};

/* -------------------------------------------------------------------------- */

/** Radial distortion about the image centre: p ↦ p·(1 + k₁r² + k₂r⁴). */
function lens(k1: number, k2: number): FnDef {
  return {
    name: "radial distortion",
    f(x, y) {
      const r2 = x.sq().add(y.sq());
      const s = r2.scale(k1).add(r2.sq().scale(k2)).add(1);
      return [x.mul(s), y.mul(s)];
    },
    // The principal branch: a fixed point from the undistorted radius.
    guess(p) {
      let q = p;
      for (let i = 0; i < 12; i++) {
        const r2 = q[0] * q[0] + q[1] * q[1];
        const s = 1 + k1 * r2 + k2 * r2 * r2;
        q = [p[0] / s, p[1] / s];
      }
      return q;
    },
    domain(q) {
      const r2 = q[0] * q[0] + q[1] * q[1];
      return 1 + 3 * k1 * r2 + 5 * k2 * r2 * r2 > 0;
    },
  };
}

function lensScene(v: Values, t: Flags): Built {
  const cam = t.camLens ? "lens" : "image";
  const hudNode = t.hudLens ? "lens" : "image";
  const nodes: GNode[] = [
    { id: "image", label: "Image (camera)" },
    {
      id: "lens",
      label: "Lens (radial distortion)",
      parent: "image",
      edge: fnEdge(
        `f: radial, k₁ = ${v.k1!.toFixed(2)}, k₂ = ${v.k2!.toFixed(2)}`,
        lens(v.k1!, v.k2!),
      ),
    },
    {
      id: "facade",
      label: "Building facade (m)",
      parent: "lens",
      edge: aff("pose: metres → ideal image", {
        a: 1 / 12,
        b: 0,
        c: 0,
        d: 1 / 12,
        e: -10 / 12,
        f: -6.5 / 12,
      }),
    },
  ];
  const windows: V2[][] = [];
  for (const x of [2, 8.25, 14.5]) {
    for (const y of [3.5, 7.5]) {
      windows.push(rect(x, y, x + 3.5, y + 2.5));
    }
  }
  const items: Item[] = [
    line(
      "hud-v",
      "grid",
      hudNode,
      range(-0.8, 0.8, 8).map(
        (x) =>
          [
            [x, -0.6],
            [x, 0.6],
          ] as V2[],
      ),
      "muted",
      { width: 1 },
    ),
    line(
      "hud-h",
      "grid",
      hudNode,
      range(-0.6, 0.6, 6).map(
        (y) =>
          [
            [-0.8, y],
            [0.8, y],
          ] as V2[],
      ),
      "muted",
      { width: 1 },
    ),
    area(
      "outline",
      "building outline",
      "facade",
      [
        [
          [0, 0],
          [20, 0],
          [20, 11],
          [10, 14],
          [0, 11],
        ],
      ],
      "accent",
      { pick: true, normals: true },
    ),
    area(
      "windows",
      "windows",
      "facade",
      [...windows, rect(8.5, 0, 11.5, 2.8)],
      "ink",
      {
        pick: true,
      },
    ),
    line(
      "pilasters",
      "pilasters",
      "facade",
      [0, 5, 10, 15, 20].map(
        (x) =>
          [
            [x, 0],
            [x, 11],
          ] as V2[],
      ),
      "accent",
      { width: 1.2 },
    ),
    line(
      "cornice",
      "cornice",
      "facade",
      [
        [
          [0, 11],
          [20, 11],
        ],
      ],
      "accent",
      {
        width: 2,
        pick: true,
      },
    ),
  ];
  const tissotPts: V2[] = [];
  for (const x of [-0.7, -0.35, 0, 0.35, 0.7]) {
    for (const y of [-0.5, -0.25, 0, 0.25, 0.5]) {
      tissotPts.push([x, y]);
    }
  }
  const cols = (): Built["measures"][number]["cols"] => [
    { key: "site", label: "Facade (m)", node: "facade" },
    { key: "ideal", label: "Ideal image (× 12)", node: "lens", scale: 12 },
    { key: "drawn", label: "Drawn (× 12)", node: cam, scale: 12 },
  ];
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
        view: { cx: 0, cy: 0, sx: 300, sy: 300 },
      },
    ],
    measures: [
      {
        id: "cornice",
        label: "Cornice, a straight 20 m",
        mode: "curve",
        a: { node: "facade", p: [0, 11] },
        b: { node: "facade", p: [20, 11] },
        cols: cols(),
      },
      {
        id: "base",
        label: "Left pilaster, a straight 11 m",
        mode: "curve",
        a: { node: "facade", p: [0, 0] },
        b: { node: "facade", p: [0, 11] },
        cols: cols(),
      },
    ],
    tissot: { node: "lens", pts: tissotPts, r: 0.06 },
    sigma: { node: "lens", at: [0.7, 0.45], sigma: 0.02, unit: "image units" },
  };
}

export const LENS: SceneDef = {
  id: "lens",
  title: "Lens on the camera",
  short: "7 · Lens",
  caption:
    "A radial distortion node sits between the camera and the building, so the building's straight edges arrive as curves. H bounds how far each edge sags from its chord, and subdivision follows it: a few extra points where the curve bends, none where it does not. Drawn with endpoints only, the same edges would stay straight and the error would show.",
  controls: [
    {
      key: "k1",
      label: "Barrel / pincushion k₁",
      min: -0.25,
      max: 0.35,
      step: 0.01,
      init: -0.2,
      digits: 2,
    },
    {
      key: "k2",
      label: "Higher order k₂",
      min: 0,
      max: 0.15,
      step: 0.01,
      init: 0,
      digits: 2,
    },
    {
      key: "tol",
      label: "Chord tolerance",
      min: 0.1,
      max: 4,
      step: 0.1,
      init: 0.5,
      unit: " px",
      digits: 1,
    },
  ],
  toggles: [
    { key: "naive", label: "Show the endpoints-only chords", init: true },
    { key: "hudLens", label: "Grid placed under the Lens node", init: false },
    {
      key: "camLens",
      label: "Camera in the Lens node (an ideal pinhole)",
      init: false,
    },
  ],
  overlays: { subdivision: true },
  build: lensScene,
};
