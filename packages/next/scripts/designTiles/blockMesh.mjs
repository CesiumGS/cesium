// Tokyo's model on the scale ladder (plan 4b Task 17b): a district of city
// blocks, about 1 km across, on one flat design plane. Streets with lane
// lines and zebra crossings; each block a raised pavement with street
// trees and its buildings: a tower on a podium, a pair of slabs, a
// courtyard block, a round tower, an old brick block or a small park, from a
// seeded generator so the district is the same every run.
//
// Design units are the CRS's (metres, for JGD2011 / Japan Plane Rectangular
// CS IX); the model's `angle` turns the street grid from design east.
import {
  between,
  frameAt,
  pick,
  placeIn,
  random,
  srgb,
} from "./meshBuilder.mjs";

const ASPHALT = srgb("#3b3e42");
const PAVEMENT = srgb("#a9a59c");
const LINE = srgb("#e4e4de");
const LAWN = srgb("#5f7d45");
const TRUNK = srgb("#5a4634");
const CANOPY = srgb("#3f6b3a");
const ROOF = srgb("#5c5f62");
const PLANT = srgb("#8d9093");
const GLASS = ["#5d7386", "#6a7e8b", "#4e5d6a", "#7a8c96"].map((c) => srgb(c));
const STONE = ["#c0b5a4", "#a99f90", "#d3cec3", "#b8b2a8"].map((c) => srgb(c));
const BRICK = srgb("#8f4f3b");
const BAND_DARK = srgb("#2f3a44");
const BAND_LIGHT = srgb("#e6e4de");

/** Storey height, metres. */
const FLOOR = 4.2;
/** Pavement height above the street (the kerb), and the sidewalk's width. */
const KERB = 0.15;
const SIDEWALK = 5;
/** A painted line's height above the street, so it isn't level with it. */
const PAINT = 0.03;

/**
 * Sides and a roof of its own colour for a box in frame `f`: centre
 * (`along`, `across`) from `centre`, base at `z`.
 */
function mass(b, f, centre, along, across, z, len, wid, h, facade, feature) {
  const at = placeIn(f, centre, along, across, z);
  b.cuboid(at, f, [len, wid, h], facade, feature, { topColor: ROOF });
}

/** A storey's spandrel band on each face of a box, just proud of the facade. */
function bands(b, f, centre, along, across, z, len, wid, h, color, feature) {
  const floors = Math.floor(h / FLOOR);
  for (let k = 1; k < floors; k++) {
    const at = placeIn(f, centre, along, across, z + k * FLOOR - 0.6);
    b.cuboid(at, f, [len + 0.1, wid + 0.1, 1.2], color, feature, {
      top: false,
    });
  }
}

/**
 * A building of the district: its masses as [along, across, z0, len, wid,
 * height] boxes in the block's frame (the first is the tallest), its facade,
 * and its roof plant.
 */
function buildingPart(f, centre, z0, masses, facade, band, name, kind) {
  const feature = { name, kind };
  const tallest = masses.reduce((t, m) => Math.max(t, m[2] + m[5]), 0);
  const [along, across] = [masses[0][0], masses[0][1]];
  const at = placeIn(f, centre, along, across, 0);
  const draw =
    ({ withBands, withPlant }) =>
    (b) => {
      for (const [a, c, z, len, wid, h] of masses) {
        mass(b, f, centre, a, c, z0 + z, len, wid, h, facade, feature);
        if (withBands && h > 2 * FLOOR) {
          bands(b, f, centre, a, c, z0 + z, len, wid, h, band, feature);
        }
      }
      if (withPlant) {
        const [a, c, z, len, wid, h] = masses[0];
        for (const s of [-0.22, 0.2]) {
          const p = placeIn(f, centre, a + s * len, c, z0 + z + h);
          b.cuboid(p, f, [len * 0.18, wid * 0.3, 3], PLANT, feature);
        }
      }
    };
  return {
    at: [at[0], at[1]],
    height: tallest,
    lods: [
      { error: 0, draw: draw({ withBands: true, withPlant: true }) },
      // The bands (half their 1.2 m) and the 3 m roof plant dropped.
      { error: 3, draw: draw({ withBands: false, withPlant: false }) },
    ],
  };
}

/** A round tower: a 24-sided prism on a podium; 8 sides at the coarsest level. */
function roundTowerPart(f, centre, z0, podium, radius, height, facade, name) {
  const feature = { name, kind: "tower" };
  const at = placeIn(f, centre, 0, 0, 0);
  const draw = (sides, withPlant) => (b) => {
    const [len, wid, h] = podium;
    mass(b, f, centre, 0, 0, z0, len, wid, h, STONE[2], feature);
    b.cylinder(
      [at[0], at[1]],
      z0 + h,
      height - h,
      radius,
      sides,
      facade,
      feature,
      {
        topColor: ROOF,
      },
    );
    if (withPlant) {
      b.cylinder(
        [at[0], at[1]],
        z0 + height,
        4,
        radius * 0.35,
        8,
        PLANT,
        feature,
      );
    }
  };
  return {
    at: [at[0], at[1]],
    height,
    lods: [
      { error: 0, draw: draw(24, true) },
      { error: 4, draw: draw(24, false) },
      // An octagon inscribed in the circle: r(1 − cos π/8) inside it at most.
      {
        error: Math.max(4, radius * (1 - Math.cos(Math.PI / 8))),
        draw: draw(8, false),
      },
    ],
  };
}

/** @param {import("../../examples/design-globe/sites.ts").PortfolioSite} site */
export function blockPlan(site) {
  const m = site.model;
  const rand = random(m.seed);
  const f = frameAt(m.angle);
  const centre = [site.origin[0], site.origin[1]];
  const z0 = site.origin[2];
  const pitchA = m.blockLength + m.street;
  const pitchX = m.blockWidth + m.street;
  const L = m.blocksAlong * m.blockLength + (m.blocksAlong + 1) * m.street;
  const W = m.blocksAcross * m.blockWidth + (m.blocksAcross + 1) * m.street;
  const parts = [];
  const flat = (along, across, len, wid, z, color, feature, error) => {
    const at = placeIn(f, centre, along, across, z);
    const draw = (b) =>
      b.flat([at[0], at[1]], z, len, wid, m.angle, color, feature);
    parts.push({
      at: [at[0], at[1]],
      lods: [
        { error: 0, draw },
        { error, draw: null },
      ],
    });
  };

  // The streets' lane lines (white dashes, 6 m on, 6 m off, 0.15 m wide)
  // and a zebra crossing on every approach to every crossing.
  const lines = { name: "Lane lines", kind: "road marking" };
  const zebra = { name: "Pedestrian crossings", kind: "road marking" };
  // The streets' centrelines, along the grid and across it.
  const streetsAlong = [];
  for (let j = 0; j <= m.blocksAcross; j++) {
    streetsAlong.push(-W / 2 + m.street / 2 + j * pitchX);
  }
  const streetsAcross = [];
  for (let i = 0; i <= m.blocksAlong; i++) {
    streetsAcross.push(-L / 2 + m.street / 2 + i * pitchA);
  }
  for (const across of streetsAlong) {
    for (let i = 0; i < m.blocksAlong; i++) {
      const from = -L / 2 + m.street + i * pitchA + 8;
      for (let a = from; a + 6 <= from + m.blockLength - 16; a += 12) {
        flat(a + 3, across, 6, 0.15, z0 + PAINT, LINE, lines, 0.075);
      }
    }
  }
  for (const along of streetsAcross) {
    for (let j = 0; j < m.blocksAcross; j++) {
      const from = -W / 2 + m.street + j * pitchX + 8;
      for (let c = from; c + 6 <= from + m.blockWidth - 16; c += 12) {
        flat(along, c + 3, 0.15, 6, z0 + PAINT, LINE, lines, 0.075);
      }
    }
  }
  for (const along of streetsAcross) {
    for (const across of streetsAlong) {
      // Stripes 0.45 m wide every 0.9 m across the street, 4 m long, just
      // outside the crossing on each side.
      for (const side of [-1, 1]) {
        const a = along + side * (m.street / 2 + 3);
        for (let s = -m.street / 2 + 1.5; s <= m.street / 2 - 1.5; s += 0.9) {
          flat(a, across + s, 4, 0.45, z0 + PAINT, LINE, zebra, 0.225);
        }
        const c = across + side * (m.street / 2 + 3);
        for (let s = -m.street / 2 + 1.5; s <= m.street / 2 - 1.5; s += 0.9) {
          flat(along + s, c, 0.45, 4, z0 + PAINT, LINE, zebra, 0.225);
        }
      }
    }
  }

  let tallest = { height: 0 };
  for (let i = 0; i < m.blocksAlong; i++) {
    for (let j = 0; j < m.blocksAcross; j++) {
      const ba = -L / 2 + m.street + m.blockLength / 2 + i * pitchA;
      const bx = -W / 2 + m.street + m.blockWidth / 2 + j * pitchX;
      const label = `Block ${String.fromCharCode(65 + j)}${i + 1}`;
      const pavement = { name: `${label} pavement`, kind: "pavement" };
      const bc = placeIn(f, centre, ba, bx, z0);
      parts.push({
        at: [bc[0], bc[1]],
        lods: [
          {
            error: 0,
            draw: (b) =>
              b.cuboid(
                bc,
                f,
                [m.blockLength, m.blockWidth, KERB],
                PAVEMENT,
                pavement,
              ),
          },
        ],
      });
      // Street trees along the kerb, every 15 m.
      const trees = { name: `${label} street trees`, kind: "tree" };
      const kerbA = m.blockLength / 2 - 2;
      const kerbX = m.blockWidth / 2 - 2;
      const spots = [];
      for (let a = -kerbA + 6; a <= kerbA - 6; a += 15) {
        spots.push([a, -kerbX], [a, kerbX]);
      }
      for (let c = -kerbX + 10; c <= kerbX - 10; c += 15) {
        spots.push([-kerbA, c], [kerbA, c]);
      }
      for (const [a, c] of spots) {
        const p = placeIn(f, centre, ba + a, bx + c, 0);
        const h = between(rand, 6, 9);
        parts.push({
          at: [p[0], p[1]],
          lods: [
            {
              error: 0,
              draw: (b) => {
                b.box(
                  [p[0], p[1]],
                  z0 + KERB,
                  0.35,
                  0.35,
                  h * 0.4,
                  0,
                  TRUNK,
                  trees,
                );
                b.pyramid(
                  [p[0], p[1]],
                  z0 + KERB + h * 0.3,
                  h * 0.7,
                  h * 0.28,
                  CANOPY,
                  trees,
                );
              },
            },
            { error: h, draw: null },
          ],
        });
      }

      // The block's buildings, on the pavement inside the sidewalk.
      const z = z0 + KERB;
      const inL = m.blockLength - 2 * SIDEWALK;
      const inW = m.blockWidth - 2 * SIDEWALK;
      const kind = pick(rand, [
        "tower",
        "tower",
        "pair",
        "court",
        "round",
        "brick",
        "park",
      ]);
      const here = [];
      const facade = pick(rand, [...GLASS, ...STONE]);
      if (kind === "tower") {
        const podium = Math.round(between(rand, 4, 8)) * FLOOR;
        const height = Math.round(between(rand, 26, 48)) * FLOOR;
        const tl = inL * between(rand, 0.4, 0.55);
        const tw = inW * between(rand, 0.5, 0.7);
        const ta = between(rand, -1, 1) * (inL - tl) * 0.4;
        const crown = 2 * FLOOR;
        here.push(
          buildingPart(
            f,
            centre,
            z,
            [
              [ba + ta, bx, 0, tl, tw, height - crown],
              [ba, bx, 0, inL, inW, podium],
              [ba + ta, bx, height - crown, tl - 4, tw - 4, crown],
            ],
            pick(rand, GLASS),
            BAND_DARK,
            `${label} tower`,
            "tower",
          ),
        );
      } else if (kind === "pair") {
        const gap = 12;
        const len = (inL - gap) / 2;
        for (const side of [-1, 1]) {
          const h = Math.round(between(rand, 8, 22)) * FLOOR;
          here.push(
            buildingPart(
              f,
              centre,
              z,
              [[ba + (side * (len + gap)) / 2, bx, 0, len, inW, h]],
              pick(rand, [...GLASS, ...STONE]),
              side < 0 ? BAND_DARK : BAND_LIGHT,
              `${label} ${side < 0 ? "west" : "east"} building`,
              "office",
            ),
          );
        }
      } else if (kind === "court") {
        const wing = 18;
        const h = Math.round(between(rand, 6, 11)) * FLOOR;
        here.push(
          buildingPart(
            f,
            centre,
            z,
            [
              [ba, bx - (inW - wing) / 2, 0, inL, wing, h],
              [ba, bx + (inW - wing) / 2, 0, inL, wing, h],
              [ba - (inL - wing) / 2, bx, 0, wing, inW - 2 * wing, h],
              [ba + (inL - wing) / 2, bx, 0, wing, inW - 2 * wing, h],
            ],
            facade,
            BAND_LIGHT,
            `${label} courtyard building`,
            "office",
          ),
        );
      } else if (kind === "round") {
        const radius = Math.min(inL, inW) * between(rand, 0.28, 0.34);
        const height = Math.round(between(rand, 22, 36)) * FLOOR;
        const bcentre = placeIn(f, centre, ba, bx, 0);
        here.push(
          roundTowerPart(
            f,
            [bcentre[0], bcentre[1]],
            z,
            [inL, inW, 3 * FLOOR],
            radius,
            height,
            pick(rand, GLASS),
            `${label} round tower`,
          ),
        );
      } else if (kind === "brick") {
        // An old three-storey brick block with a taller centre pavilion.
        here.push(
          buildingPart(
            f,
            centre,
            z,
            [
              [ba, bx, 0, inL * 0.3, inW * 0.6, 5 * FLOOR],
              [ba, bx, 0, inL, inW * 0.45, 3 * FLOOR],
            ],
            BRICK,
            BAND_LIGHT,
            `${label} brick building`,
            "heritage",
          ),
        );
      } else {
        const lawn = { name: `${label} park`, kind: "park" };
        const lc = placeIn(f, centre, ba, bx, z + 0.05);
        parts.push({
          at: [lc[0], lc[1]],
          lods: [
            {
              error: 0,
              draw: (b) =>
                b.flat([lc[0], lc[1]], z + 0.05, inL, inW, m.angle, LAWN, lawn),
            },
          ],
        });
        for (let t = 0; t < 14; t++) {
          const p = placeIn(
            f,
            centre,
            ba + between(rand, -0.42, 0.42) * inL,
            bx + between(rand, -0.4, 0.4) * inW,
            0,
          );
          const h = between(rand, 7, 12);
          parts.push({
            at: [p[0], p[1]],
            lods: [
              {
                error: 0,
                draw: (b) => {
                  b.box([p[0], p[1]], z, 0.45, 0.45, h * 0.4, 0, TRUNK, lawn);
                  b.pyramid(
                    [p[0], p[1]],
                    z + h * 0.3,
                    h * 0.7,
                    h * 0.32,
                    CANOPY,
                    lawn,
                  );
                },
              },
              { error: h, draw: null },
            ],
          });
        }
      }
      for (const p of here) {
        parts.push(p);
        if (p.height > tallest.height) {
          tallest = p;
        }
      }
    }
  }

  const anchor = [site.origin[0], site.origin[1], z0];
  return {
    anchor,
    leafSize: 250,
    parts,
    grounds: [
      {
        at: centre,
        length: L,
        width: W,
        angle: m.angle,
        z: z0,
        color: ASPHALT,
        feature: { name: "Streets", kind: "road" },
        lods: [{ error: 0, keep: true }],
      },
    ],
    landmark: {
      label: "The tallest roof",
      design: [tallest.at[0], tallest.at[1], z0 + KERB + tallest.height],
    },
  };
}
