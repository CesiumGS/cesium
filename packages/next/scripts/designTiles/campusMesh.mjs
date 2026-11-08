// Nairobi's model on the scale ladder (plan 4b Task 17b): a campus about
// 10 km across on one flat site plan, a grid of superblocks between roads.
// Each superblock is an academic quadrangle (buildings of varied footprint,
// rectangular, L, U or courtyard, round a lawn), a row of laboratories,
// housing, a park with a pond, sports fields with a track and a stand, or
// a car park; the middle one is the core: a tower, a round library and a
// plaza. Seeded, so the campus is the same every run.
//
// Design units are the CRS's (metres, WGS 84 / UTM zone 37S); the grid runs
// along design east and north.
import { between, pick, random, srgb } from "./meshBuilder.mjs";

const LAND = srgb("#8e8a55");
const ROAD = srgb("#3c3e40");
const LINE = srgb("#e6e6e0");
const LAWN = srgb("#5d8040");
const WATER = srgb("#2f5f78");
const TRACK = srgb("#9a4b36");
const PITCH = srgb("#4f8a3c");
const COURT = srgb("#3f6f8f");
const ASPHALT = srgb("#4a4c4e");
const PLAZA = srgb("#b9b0a0");
const TRUNK = srgb("#5a4634");
const CANOPY = srgb("#476f36");
const PLANT = srgb("#8d9093");
const FACADES = [
  "#d9cdb4",
  "#c99b6d",
  "#eae7df",
  "#b8a58a",
  "#a8644a",
  "#cfc6b5",
].map((c) => srgb(c));
const ROOFS = ["#7a6a5c", "#5d6062", "#9c4a36", "#6e7377"].map((c) => srgb(c));
const GLASS = srgb("#58707f");

/** Storey heights, metres: a hall's, a laboratory's (tall, for services), a residence's. */
const STOREY = 4;
const LAB_STOREY = 5.2;
const HOME_STOREY = 3.1;
const PAINT = 0.1;

/** @param {import("../../examples/design-globe/sites.ts").PortfolioSite} site */
export function campusPlan(site) {
  const m = site.model;
  const rand = random(m.seed);
  const [e0, n0, z0] = site.origin;
  const nE = Math.round(m.width / m.superBlock);
  const nN = Math.round(m.depth / m.superBlock);
  const W = nE * m.superBlock;
  const D = nN * m.superBlock;
  const west = e0 - W / 2;
  const south = n0 - D / 2;
  const parts = [];
  const grounds = [];
  const ground = (at, length, width, z, color, name, kind, lods) =>
    grounds.push({
      at,
      length,
      width,
      angle: 0,
      z,
      color,
      feature: { name, kind },
      lods: lods ?? [{ error: 0, keep: true }],
    });
  /** A flat part (a court, a car park's bays), dropped above `through` at half its width. */
  const flat = (at, length, width, z, color, feature, through) => {
    const draw = (b) => b.flat(at, z, length, width, 0, color, feature);
    const lods = [{ error: 0, draw }];
    for (let l = 1; l <= through; l++) {
      lods.push({ error: 0, draw });
    }
    lods.push({ error: Math.min(length, width) / 2, draw: null });
    parts.push({ at, lods });
  };
  const tree = (at, z) => {
    const h = between(rand, 6, 12);
    const feature = { name: "Trees", kind: "tree" };
    parts.push({
      at,
      lods: [
        {
          error: 0,
          draw: (b) => {
            b.box(at, z, 0.45, 0.45, h * 0.4, 0, TRUNK, feature);
            b.pyramid(at, z + h * 0.3, h * 0.7, h * 0.33, CANOPY, feature);
          },
        },
        { error: h, draw: null },
      ],
    });
  };
  /**
   * A building of boxes [de, dn, length (east), width (north), storeys]
   * about `at`, its roof plant on the first, dropped at coarse levels when
   * low: below 3 storeys above level 2, below 5 above level 3.
   */
  let landmark;
  const building = (at, masses, name, kind, storey = STOREY) => {
    const feature = { name, kind };
    const facade = pick(rand, FACADES);
    const roof = pick(rand, ROOFS);
    const storeys = Math.max(...masses.map((x) => x[4]));
    const height = storeys * storey;
    const draw = (plant) => (b) => {
      for (const [de, dn, len, wid, s] of masses) {
        b.box(
          [at[0] + de, at[1] + dn],
          z0,
          len,
          wid,
          s * storey,
          0,
          facade,
          feature,
          {
            topColor: roof,
          },
        );
      }
      if (plant) {
        const [de, dn, len, wid, s] = masses[0];
        b.box(
          [at[0] + de, at[1] + dn],
          z0 + s * storey,
          len * 0.25,
          wid * 0.3,
          3,
          0,
          PLANT,
          feature,
        );
      }
    };
    const lods = [
      { error: 0, draw: draw(true) },
      // The 3 m roof plant dropped.
      { error: 3, draw: draw(false) },
      { error: 3, draw: draw(false) },
      storeys < 3
        ? { error: height, draw: null }
        : { error: 3, draw: draw(false) },
      storeys < 5
        ? { error: height, draw: null }
        : { error: 3, draw: draw(false) },
    ];
    parts.push({ at, height, lods });
    if (landmark === undefined || height > landmark.height) {
      landmark = { at, height };
    }
  };
  /** A footprint of the given shape, centred on `at`, `l` by `w`, `s` storeys. */
  const shaped = (at, shape, l, w, s, name) => {
    const wing = Math.min(l, w) * 0.32;
    const masses =
      shape === "rect"
        ? [[0, 0, l, w, s]]
        : shape === "L"
          ? [
              [0, -(w - wing) / 2, l, wing, s],
              [-(l - wing) / 2, wing / 2, wing, w - wing, s],
            ]
          : shape === "U"
            ? [
                [0, -(w - wing) / 2, l, wing, s],
                [-(l - wing) / 2, wing / 2, wing, w - wing, s],
                [(l - wing) / 2, wing / 2, wing, w - wing, s],
              ]
            : [
                [0, -(w - wing) / 2, l, wing, s],
                [0, (w - wing) / 2, l, wing, s],
                [-(l - wing) / 2, 0, wing, w - 2 * wing, s],
                [(l - wing) / 2, 0, wing, w - 2 * wing, s],
              ];
    building(at, masses, name, "building");
  };

  ground([e0, n0], W, D, z0, LAND, "Site plan", "landscape");
  // The road grid, and a dashed centreline along each road.
  const roadLine = { name: "Road centrelines", kind: "road marking" };
  for (let i = 0; i <= nE; i++) {
    const e = west + i * m.superBlock;
    ground(
      [e, n0],
      m.road,
      D + m.road,
      z0 + 0.05,
      ROAD,
      `Avenue ${i + 1}`,
      "road",
    );
    for (let n = south + 20; n < south + D - 20; n += 24) {
      flat([e, n + 4], 0.15, 8, z0 + PAINT, LINE, roadLine, 1);
    }
  }
  for (let j = 0; j <= nN; j++) {
    const n = south + j * m.superBlock;
    ground(
      [e0, n],
      W + m.road,
      m.road,
      z0 + 0.05,
      ROAD,
      `Street ${j + 1}`,
      "road",
    );
    for (let e = west + 20; e < west + W - 20; e += 24) {
      flat([e + 4, n], 8, 0.15, z0 + PAINT, LINE, roadLine, 1);
    }
  }

  const inner = m.superBlock - m.road - 20;
  const core = [Math.floor(nE / 2), Math.floor(nN / 2)];
  for (let i = 0; i < nE; i++) {
    for (let j = 0; j < nN; j++) {
      const c = [
        west + (i + 0.5) * m.superBlock,
        south + (j + 0.5) * m.superBlock,
      ];
      const label = `${String.fromCharCode(65 + j)}${i + 1}`;
      const off = (de, dn) => [c[0] + de, c[1] + dn];
      if (i === core[0] && j === core[1]) {
        ground(c, inner, inner, z0 + 0.05, PLAZA, "Central plaza", "plaza");
        building(
          off(-150, 120),
          [[0, 0, 50, 40, 14]],
          "Administration tower",
          "tower",
        );
        // The great hall, two faculty buildings and the student centre.
        shaped(off(-150, -170), "U", 150, 90, 4, "Great Hall");
        shaped(off(170, 210), "court", 140, 110, 6, "Faculty of Engineering");
        shaped(off(-230, 10), "L", 90, 120, 5, "Faculty of Science");
        building(
          off(40, 250),
          [[0, 0, 110, 45, 3]],
          "Student centre",
          "building",
        );
        const library = { name: "Library", kind: "library" };
        const libraryAt = off(120, -60);
        parts.push({
          at: libraryAt,
          height: 6 * STOREY,
          lods: [
            {
              error: 0,
              draw: (b) => {
                b.cylinder(
                  libraryAt,
                  z0,
                  6 * STOREY,
                  60,
                  32,
                  FACADES[2],
                  library,
                  { topColor: ROOFS[1] },
                );
                b.cylinder(
                  libraryAt,
                  z0 + 2 * STOREY,
                  2 * STOREY,
                  60.3,
                  32,
                  GLASS,
                  library,
                  { top: false },
                );
              },
            },
            {
              error: 0.3,
              draw: (b) =>
                b.cylinder(
                  libraryAt,
                  z0,
                  6 * STOREY,
                  60,
                  32,
                  FACADES[2],
                  library,
                  { topColor: ROOFS[1] },
                ),
            },
          ],
        });
        for (let t = 0; t < 24; t++) {
          tree(
            off(
              -inner / 2 + 20 + (t % 12) * ((inner - 40) / 11),
              t < 12 ? -inner / 2 + 15 : inner / 2 - 15,
            ),
            z0 + 0.05,
          );
        }
        continue;
      }
      const kind = pick(rand, [
        "academic",
        "academic",
        "academic",
        "academic",
        "labs",
        "labs",
        "housing",
        "housing",
        "park",
        "sports",
        "parking",
      ]);
      if (kind === "academic") {
        // A lawn crossed by two paths, a ring of halls round it, and a
        // row of long buildings along the superblock's edges.
        const lawn = inner * 0.46;
        ground(c, lawn, lawn, z0 + 0.05, LAWN, `Quadrangle ${label}`, "lawn");
        const paths = { name: `Quadrangle ${label} paths`, kind: "path" };
        flat(c, lawn, 5, z0 + 0.08, PLAZA, paths, 2);
        flat(c, 5, lawn, z0 + 0.08, PLAZA, paths, 2);
        const ring = Math.floor(between(rand, 8, 13));
        for (let k = 0; k < ring; k++) {
          const t = (2 * Math.PI * (k + 0.5)) / ring;
          const r = inner * between(rand, 0.3, 0.33);
          const shape = pick(rand, ["rect", "rect", "L", "U", "court"]);
          shaped(
            off(r * Math.cos(t), r * Math.sin(t)),
            shape,
            between(rand, 60, 110),
            between(rand, 40, 70),
            Math.floor(between(rand, 2, 10)),
            `Hall ${label}-${k + 1}`,
          );
        }
        let edge = 0;
        for (const [ue, un] of [
          [1, 0],
          [0, 1],
          [-1, 0],
          [0, -1],
        ]) {
          if (rand() < 0.35) {
            continue;
          }
          const length = between(rand, 200, 380);
          const depth = between(rand, 24, 34);
          const at = off(
            ue * (inner / 2 - depth / 2) + un * between(rand, -100, 100),
            un * (inner / 2 - depth / 2) + ue * between(rand, -100, 100),
          );
          building(
            at,
            [
              [
                0,
                0,
                ue !== 0 ? depth : length,
                ue !== 0 ? length : depth,
                Math.floor(between(rand, 2, 6)),
              ],
            ],
            `Teaching building ${label}-${++edge}`,
            "building",
          );
        }
        for (let t = 0; t < 12; t++) {
          tree(
            off(
              between(rand, -0.21, 0.21) * inner,
              between(rand, -0.21, 0.21) * inner,
            ),
            z0 + 0.05,
          );
        }
      } else if (kind === "labs") {
        const count = Math.floor(between(rand, 4, 8));
        for (let k = 0; k < count; k++) {
          const dn =
            -inner / 2 + 45 + (k * (inner - 90)) / Math.max(1, count - 1);
          building(
            off(between(rand, -80, 80), dn),
            [
              [
                0,
                0,
                between(rand, 200, 380),
                between(rand, 36, 54),
                Math.floor(between(rand, 1, 5)),
              ],
            ],
            `Laboratory ${label}-${k + 1}`,
            "laboratory",
            LAB_STOREY,
          );
        }
      } else if (kind === "housing") {
        for (let a = 0; a < 5; a++) {
          for (let b = 0; b < 6; b++) {
            if (rand() < 0.15) {
              continue;
            }
            building(
              off(
                -inner / 2 + 60 + a * ((inner - 120) / 4),
                -inner / 2 + 45 + b * ((inner - 90) / 5),
              ),
              [
                [
                  0,
                  0,
                  between(rand, 60, 95),
                  between(rand, 16, 22),
                  Math.floor(between(rand, 3, 9)),
                ],
              ],
              `Residence ${label}-${6 * a + b + 1}`,
              "residence",
              HOME_STOREY,
            );
          }
        }
        for (let t = 0; t < 16; t++) {
          tree(
            off(
              between(rand, -0.45, 0.45) * inner,
              between(rand, -0.45, 0.45) * inner,
            ),
            z0,
          );
        }
      } else if (kind === "park") {
        ground(c, inner, inner, z0 + 0.05, LAWN, `Park ${label}`, "lawn");
        ground(
          off(between(rand, -80, 80), between(rand, -80, 80)),
          between(rand, 120, 220),
          between(rand, 80, 140),
          z0 + 0.1,
          WATER,
          `Pond ${label}`,
          "water",
        );
        for (let t = 0; t < 30; t++) {
          tree(
            off(
              between(rand, -0.45, 0.45) * inner,
              between(rand, -0.45, 0.45) * inner,
            ),
            z0 + 0.1,
          );
        }
      } else if (kind === "sports") {
        const fields = { name: `Sports fields ${label}`, kind: "sports" };
        flat(off(-120, 0), 180, 110, z0 + 0.06, TRACK, fields, 3);
        flat(off(-120, 0), 105, 68, z0 + 0.08, PITCH, fields, 3);
        building(
          off(-120, 75),
          [[0, 0, 120, 18, 3]],
          `Stand ${label}`,
          "stand",
        );
        for (let k = 0; k < 6; k++) {
          flat(
            off(150 + (k % 2) * 40, -120 + Math.floor(k / 2) * 45),
            36,
            18,
            z0 + 0.06,
            COURT,
            fields,
            2,
          );
        }
      } else {
        const bays = { name: `Car park ${label}`, kind: "car park" };
        flat(c, inner * 0.8, inner * 0.5, z0 + 0.06, ASPHALT, bays, 3);
        for (let r = 0; r < 8; r++) {
          for (let k = 0; k < 40; k++) {
            flat(
              off(
                -inner * 0.38 + k * ((inner * 0.76) / 39),
                -inner * 0.22 + r * ((inner * 0.44) / 7),
              ),
              0.12,
              5,
              z0 + PAINT,
              LINE,
              bays,
              1,
            );
          }
        }
      }
    }
  }

  const anchor = [e0, n0, z0];
  return {
    anchor,
    leafSize: 700,
    parts,
    grounds,
    landmark: {
      label: "The tallest roof",
      design: [landmark.at[0], landmark.at[1], z0 + landmark.height],
    },
  };
}
