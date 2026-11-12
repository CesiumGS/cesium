/** Scenes 1 to 3: an exaggeration over Earth content, with and without a projection under it. */
import { Jet } from "./ad.ts";
import {
  rotation,
  translate,
  type FnDef,
  type GNode,
  type V2,
} from "./graph.ts";
import { aff, area, circle, fnEdge, line, point, range, text } from "./kit.ts";
import type { Built, Flags, Item, SceneDef, Values } from "./model.ts";

const R = 100;
/** The exaggeration's ceiling, in the same schematic units. */
const CEILING = 3.2;
const BLEND = 0.45;

const polar = (th: number, h: number): V2 => [
  (R + h) * Math.sin(th),
  (R + h) * Math.cos(th),
];

/**
 * Heights scale by k below the ceiling and are lifted by a constant above it,
 * smoothed over a short blend so J is continuous and H finite. Radial about
 * the Earth's centre.
 */
function exaggerate(k: number): FnDef {
  return {
    name: "exaggerate",
    f(x, y) {
      const r = x.sq().add(y.sq()).sqrt();
      const h = r.sub(R);
      const kept = Jet.c(CEILING).sub(
        h
          .neg()
          .add(CEILING)
          .scale(1 / BLEND)
          .softplus()
          .scale(BLEND),
      );
      const g = h.add(kept.scale(k - 1));
      const ratio = g.add(R).div(r);
      return [x.mul(ratio), y.mul(ratio)];
    },
  };
}

const terrainHeight = (th: number) =>
  0.7 + 0.28 * Math.sin(th * 11 + 0.6) + 0.18 * Math.sin(th * 27 + 1.3);

const BUILDINGS = [
  { th: -0.2, h: 1.1, w: 0.016 },
  { th: -0.11, h: 1.7, w: 0.014 },
  { th: 0.06, h: 0.9, w: 0.017 },
  { th: 0.25, h: 1.4, w: 0.013 },
];

const SAT_TH = 0.04;
const SAT_H = 24;

function earth(v: Values, t: Flags, cameraInExag: boolean): Built {
  const k = v.k!;
  const satNode = t.satUnder ? "exag" : "earth";
  const cam = cameraInExag ? "exag" : "earth";
  const nodes: GNode[] = [
    { id: "icrf", label: "Root (ICRF)" },
    {
      id: "earth",
      label: "Earth (ITRF)",
      parent: "icrf",
      edge: aff("rotation: the Earth's spin", rotation(0.35)),
    },
    {
      id: "exag",
      label: `Exaggerate ×${k.toFixed(1)}`,
      parent: "earth",
      edge: fnEdge("f: h → k·h below the ceiling, lifted above", exaggerate(k)),
    },
  ];

  const ths = range(-0.34, 0.34, 30);
  const top = ths.map((th) => polar(th, terrainHeight(th)));
  const bottom = ths.map((th) => polar(th, -1.6)).reverse();
  const bTh = BUILDINGS[1]!;
  const bBase = terrainHeight(bTh.th);
  const items: Item[] = [
    line(
      "sea",
      "sea level",
      "earth",
      [range(-0.62, 0.62, 8).map((th) => polar(th, 0))],
      "muted",
      {
        dash: "5 4",
      },
    ),
    area("terrain-fill", "terrain", "exag", [[...top, ...bottom]], "warm"),
    line("terrain", "terrain", "exag", [top], "warm", {
      width: 2.2,
      pick: true,
      normals: true,
    }),
    area(
      "buildings",
      "buildings",
      "exag",
      BUILDINGS.map(({ th, h, w }) => {
        const hb = terrainHeight(th);
        return [
          polar(th - w, hb - 0.3),
          polar(th - w, hb + h),
          polar(th + w, hb + h),
          polar(th + w, hb - 0.3),
        ];
      }),
      "accent",
      { pick: true, normals: true },
    ),
    line(
      "pipe",
      "buried pipe",
      "exag",
      [range(-0.3, 0.3, 6).map((th) => polar(th, -0.8))],
      "good",
      {
        width: 3,
        pick: true,
      },
    ),
    line(
      "ceiling",
      "ceiling",
      "exag",
      [range(-0.62, 0.62, 8).map((th) => polar(th, CEILING))],
      "warm",
      {
        dash: "2 4",
        width: 1,
      },
    ),
    text("ceiling-t", "exag", polar(0.4, CEILING), "ceiling", {
      dx: 6,
      dy: -5,
    }),
    point("sat", "satellite", satNode, polar(SAT_TH, SAT_H), "ink", {
      marker: "diamond",
      size: 6,
      pick: true,
      panels: ["main", "inset"],
    }),
    text("sat-t", satNode, polar(SAT_TH, SAT_H), "satellite", {
      dx: 11,
      dy: 4,
      panels: ["main"],
    }),
    area("earth-disk", "Earth", "earth", [circle(0, 0, R, 72)], "muted", {
      panels: ["inset"],
    }),
    text("earth-t", "earth", [0, -100], "Earth", {
      panels: ["inset"],
      dx: -16,
      dy: 14,
    }),
    point(
      "moon",
      "Moon",
      "icrf",
      [760 * Math.cos(1.1), 760 * Math.sin(1.1)],
      "muted",
      { marker: "dot", size: 5, pick: true, panels: ["inset"] },
    ),
    text("moon-t", "icrf", [760 * Math.cos(1.1), 760 * Math.sin(1.1)], "Moon", {
      panels: ["inset"],
      dx: -34,
      dy: 4,
    }),
  ];

  const tissotPts: V2[] = [];
  for (const th of [-0.3, -0.15, 0, 0.15, 0.3]) {
    for (const h of [0.6, 2.2, 6, 14, 24]) {
      tissotPts.push(polar(th, h));
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
        view: { cx: 0, cy: R + 20, sx: 7.8, sy: 7.8 },
      },
      {
        id: "inset",
        x: 588,
        y: 10,
        w: 202,
        h: 168,
        camera: cam,
        view: { cx: 278, cy: 259, sx: 0.22, sy: 0.22 },
        title: "whole system, same graph",
      },
    ],
    measures: [
      {
        id: "height",
        label: "Building height",
        mode: "curve",
        a: { node: "exag", p: polar(bTh.th, bBase) },
        b: { node: "exag", p: polar(bTh.th, bBase + bTh.h) },
        cols: [
          { key: "true", label: "True (below the warp)", node: "exag" },
          { key: "drawn", label: "Drawn (camera)", node: cam },
        ],
      },
      {
        id: "altitude",
        label: "Satellite above sea level",
        mode: "pair",
        a: { node: satNode, p: polar(SAT_TH, SAT_H) },
        b: { node: "earth", p: polar(SAT_TH, 0) },
        cols: [
          {
            key: "true",
            label: "True (below the warp)",
            node: satNode,
          },
          { key: "drawn", label: "Drawn (camera)", node: cam },
        ],
      },
    ],
    tissot: { node: "exag", pts: tissotPts, r: 1.1 },
    sigma: {
      node: "exag",
      at: polar(bTh.th, bBase + bTh.h),
      sigma: 0.9,
      unit: "u",
    },
  };
}

export const EXAGGERATION: SceneDef = {
  id: "exaggeration",
  title: "Exaggeration over Earth content",
  short: "1 · Exaggeration",
  caption:
    "A cross-section of an Earth arc. Terrain, buildings and the pipe sit under the exaggeration node, so they stretch with k, while the satellite and the Moon sit above it and do not. Put the satellite under the node and it is lifted by (k − 1) × the ceiling. What is warped is decided by where things are placed, with no mode and no region.",
  controls: [
    {
      key: "k",
      label: "Exaggeration k",
      min: 1,
      max: 10,
      step: 0.1,
      init: 5,
      digits: 1,
    },
  ],
  toggles: [
    {
      key: "satUnder",
      label: "Satellite under the exaggeration node",
      init: false,
    },
  ],
  build: (v, t) => earth(v, t, false),
};

export const CAMERA_PLACE: SceneDef = {
  id: "camera",
  title: "Where the camera sits",
  short: "2 · Camera placement",
  caption:
    "The same graph with the camera moved into the exaggeration node. Content under the node now looks true, and everything outside it, the satellite and the Moon, is carried down through the inverse and so looks squashed. That is legal and occasionally useful, a true view of a warped world, but it is usually not what you want.",
  controls: [
    {
      key: "k",
      label: "Exaggeration k",
      min: 1,
      max: 10,
      step: 0.1,
      init: 5,
      digits: 1,
    },
  ],
  toggles: [
    { key: "camera", label: "Camera in the exaggeration node", init: true },
    {
      key: "satUnder",
      label: "Satellite under the exaggeration node",
      init: false,
    },
  ],
  build: (v, t) => earth(v, t, t.camera === true),
};

/** A simple transverse-Mercator-like map along the equator: (easting, height) → Earth Cartesian. */
function projection(k0: number): FnDef {
  return {
    name: "transverse Mercator",
    f(e, h) {
      const u = e.scale(1 / (k0 * R));
      const rad = h.add(R);
      return [rad.mul(u.tanh()), rad.div(u.cosh())];
    },
    guess(p) {
      const r = Math.hypot(p[0], p[1]);
      const z = Math.max(-0.999, Math.min(0.999, p[0] / r));
      return [k0 * R * 0.5 * Math.log((1 + z) / (1 - z)), r - R];
    },
  };
}

function utmScene(v: Values, t: Flags): Built {
  const k = v.k!;
  const k0 = v.k0!;
  const e0 = v.e0!;
  const cam = t.mapView ? "utm" : "earth";
  const nodes: GNode[] = [
    { id: "icrf", label: "Root (ICRF)" },
    {
      id: "earth",
      label: "Earth (ITRF)",
      parent: "icrf",
      edge: aff("rotation: the Earth's spin", rotation(0.35)),
    },
    {
      id: "exag",
      label: `Exaggerate ×${k.toFixed(1)}`,
      parent: "earth",
      edge: fnEdge("f: h → k·h below the ceiling, lifted above", exaggerate(k)),
    },
    {
      id: "utm",
      label: "UTM zone (E, h)",
      parent: "exag",
      edge: fnEdge(
        `f: transverse Mercator, k₀ = ${k0.toFixed(3)}`,
        projection(k0),
      ),
    },
    {
      id: "site",
      label: "BIM site",
      parent: "utm",
      edge: aff("site → grid: translate by E₀", translate(e0, 0)),
    },
  ];
  const W = 6;
  const H = 2.6;
  const items: Item[] = [
    line(
      "grid-e",
      "grid, E lines",
      "utm",
      range(-60, 60, 6).map((e) => [
        [e, 0],
        [e, 16],
      ]),
      "muted",
      { width: 1 },
    ),
    line(
      "grid-h",
      "grid, h lines",
      "utm",
      [4, 8, 12, 16].map((h) => [
        [-64, h],
        [64, h],
      ]),
      "muted",
      { width: 1 },
    ),
    line(
      "ground",
      "ground (h = 0)",
      "utm",
      [
        [
          [-64, 0],
          [64, 0],
        ],
      ],
      "warm",
      { width: 2.5, pick: true, normals: true },
    ),
    area(
      "building",
      "BIM building",
      "site",
      [
        [
          [-W, 0],
          [W, 0],
          [W, H],
          [0, H + 0.45],
          [-W, H],
        ],
      ],
      "accent",
      { pick: true, normals: true },
    ),
    line(
      "floors",
      "floors and bays",
      "site",
      [
        [
          [-W, H / 3],
          [W, H / 3],
        ],
        [
          [-W, (2 * H) / 3],
          [W, (2 * H) / 3],
        ],
        ...[-3, 0, 3].map(
          (x) =>
            [
              [x, 0],
              [x, H],
            ] as V2[],
        ),
      ],
      "accent",
      { width: 1 },
    ),
    point("sat", "satellite", "earth", polar(0.1, 30), "ink", {
      marker: "diamond",
      size: 6,
      pick: true,
    }),
    text("sat-t", "earth", polar(0.1, 30), "satellite", { dx: 11, dy: 4 }),
    text("ground-t", "utm", [-62, 0], "ground", { dx: 0, dy: 16 }),
  ];
  for (const e of [-60, -30, 0, 30, 60]) {
    items.push(text(`e${e}`, "utm", [e, 0], `E ${e}`, { dy: 20, dx: -10 }));
  }
  const tissotPts: V2[] = [];
  for (const e of [-48, -24, 0, 24, 48]) {
    for (const h of [0.8, 2, 5, 10, 16]) {
      tissotPts.push([e, h]);
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
        view: { cx: 0, cy: cam === "utm" ? 20 : R + 20, sx: 6.8, sy: 6.8 },
      },
    ],
    measures: [
      {
        id: "w",
        label: "Building width",
        mode: "curve",
        a: { node: "site", p: [-W, 0] },
        b: { node: "site", p: [W, 0] },
        cols: [
          { key: "site", label: "Site", node: "site" },
          { key: "grid", label: "Grid (UTM)", node: "utm" },
          { key: "true", label: "Ground (true)", node: "exag" },
          { key: "drawn", label: "Drawn (camera)", node: cam },
        ],
      },
      {
        id: "h",
        label: "Building height",
        mode: "curve",
        a: { node: "site", p: [0, 0] },
        b: { node: "site", p: [0, H] },
        cols: [
          { key: "site", label: "Site", node: "site" },
          { key: "grid", label: "Grid (UTM)", node: "utm" },
          { key: "true", label: "Ground (true)", node: "exag" },
          { key: "drawn", label: "Drawn (camera)", node: cam },
        ],
      },
      {
        id: "span",
        label: "100 u of grid across the zone",
        mode: "curve",
        a: { node: "utm", p: [-50, 0] },
        b: { node: "utm", p: [50, 0] },
        cols: [
          { key: "site", label: "Site", node: "site" },
          { key: "grid", label: "Grid (UTM)", node: "utm" },
          { key: "true", label: "Ground (true)", node: "exag" },
          { key: "drawn", label: "Drawn (camera)", node: cam },
        ],
      },
    ],
    tissot: { node: "utm", pts: tissotPts, r: 1.8 },
    sigma: { node: "site", at: [W, H], sigma: 0.6, unit: "u" },
  };
}

export const NESTED_UTM: SceneDef = {
  id: "utm",
  title: "Nested: a BIM site in a projected CRS under the exaggeration",
  short: "3 · Projection + exaggeration",
  caption:
    "The site is placed in a UTM-zone node, itself a non-linear node under the exaggeration, so its straight edges arrive as curves after two functions. The grid scale factor grows away from the central meridian, so grid distance and ground distance part company, and the Tissot ellipses show the local stretch of the whole route. The σ ellipse goes through the same J.",
  controls: [
    {
      key: "k",
      label: "Exaggeration k",
      min: 1,
      max: 10,
      step: 0.1,
      init: 5,
      digits: 1,
    },
    {
      key: "k0",
      label: "Central scale k₀",
      min: 0.94,
      max: 1,
      step: 0.005,
      init: 0.97,
      digits: 3,
    },
    {
      key: "e0",
      label: "Site easting E₀",
      min: -56,
      max: 56,
      step: 2,
      init: 40,
      unit: " u",
    },
  ],
  toggles: [
    {
      key: "mapView",
      label: "Camera in the UTM node (a map view)",
      init: false,
    },
  ],
  overlays: { tissot: true },
  build: utmScene,
};
