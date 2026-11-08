// Phoenix's model on the scale ladder (plan 4b Task 17b): a utility-scale
// solar farm, about 4 km across, on one flat design plane. Blocks of
// fixed-tilt tables facing south in east-west rows, with an inverter skid in
// each block's middle aisle and gravel roads between the blocks; the
// substation, its control house and the operations building take one
// block's place.
//
// Design units are the CRS's: international feet (EPSG:6405 + 8228). The
// rows run along design east.
import { srgb } from "./meshBuilder.mjs";

const GRAVEL = srgb("#c2ad88");
const SOIL = srgb("#a88f6c");
const PANEL = srgb("#1b2738");
const PANEL_FAR = srgb("#2a3442");
const SKID = srgb("#d6d7d2");
const STEEL = srgb("#9a9c9b");
const TRANSFORMER = srgb("#6f7f72");
const HOUSE = srgb("#c9c2b2");
const ROOF = srgb("#6b6e70");

/** @param {import("../../examples/design-globe/sites.ts").PortfolioSite} site */
export function solarFarmPlan(site) {
  const m = site.model;
  const [e0, n0, z0] = site.origin;
  const E = m.blocksEast * m.blockLength + (m.blocksEast + 1) * m.road;
  const N = m.blocksNorth * m.blockWidth + (m.blocksNorth + 1) * m.road;
  const run = m.tableWidth * Math.cos(m.tilt);
  const rise = m.tableWidth * Math.sin(m.tilt);
  const parts = [];
  const grounds = [
    {
      at: [e0, n0],
      length: E,
      width: N,
      angle: 0,
      z: z0,
      color: GRAVEL,
      feature: { name: "Access roads", kind: "road" },
      lods: [{ error: 0, keep: true }],
    },
  ];
  // The substation takes the south-east block's place.
  const substation = [m.blocksEast - 1, 0];
  const blockCentre = (i, j) => [
    e0 - E / 2 + m.road + m.blockLength / 2 + i * (m.blockLength + m.road),
    n0 - N / 2 + m.road + m.blockWidth / 2 + j * (m.blockWidth + m.road),
  ];

  for (let i = 0; i < m.blocksEast; i++) {
    for (let j = 0; j < m.blocksNorth; j++) {
      const [be, bn] = blockCentre(i, j);
      const label = `Array block ${String.fromCharCode(65 + j)}${i + 1}`;
      grounds.push({
        at: [be, bn],
        length: m.blockLength,
        width: m.blockWidth,
        angle: 0,
        z: z0 + 0.1,
        color: SOIL,
        feature: { name: `${label} ground`, kind: "ground" },
        lods: [{ error: 0, keep: true }],
      });
      if (i === substation[0] && j === substation[1]) {
        continue;
      }
      const rows = Math.floor((m.blockWidth - 20) / m.rowPitch);
      const tables = Math.floor(
        (m.blockLength - 20 + m.tableGap) / (m.tableLength + m.tableGap),
      );
      const rowLength = tables * m.tableLength + (tables - 1) * m.tableGap;
      const aisle = Math.floor(rows / 2);
      const feature = { name: label, kind: "solar array" };
      for (let r = 0; r < rows; r++) {
        if (r === aisle) {
          continue;
        }
        const south = bn - m.blockWidth / 2 + 10 + r * m.rowPitch;
        const west = be - rowLength / 2;
        const z = z0 + m.lowEdge;
        // A tilted quad from its low (south) edge to its high (north) one.
        const panel = (b, w0, w1, color) =>
          b.quad(
            [w0, south, z],
            [w1, south, z],
            [w1, south + run, z + rise],
            [w0, south + run, z + rise],
            color,
            feature,
          );
        parts.push({
          at: [be, south + run / 2],
          lods: [
            {
              error: 0,
              draw: (b) => {
                for (let t = 0; t < tables; t++) {
                  const w0 = west + t * (m.tableLength + m.tableGap);
                  panel(b, w0, w0 + m.tableLength, PANEL);
                }
              },
            },
            {
              // The row as one table: it spans the gaps between tables.
              error: m.tableGap / 2,
              draw: (b) => panel(b, west, west + rowLength, PANEL),
            },
            {
              // The row's pitch as a flat band at the panels' mid height:
              // within half the rise of every panel, and half the open
              // ground between rows of one.
              error: Math.hypot((m.rowPitch - run) / 2, rise / 2),
              draw: (b) =>
                b.flat(
                  [be, south + m.rowPitch / 2],
                  z + rise / 2,
                  rowLength,
                  m.rowPitch,
                  0,
                  PANEL_FAR,
                  feature,
                ),
            },
          ],
        });
      }
      // The inverter skid in the middle aisle.
      const skid = { name: `${label} inverter`, kind: "inverter" };
      const aisleN =
        bn - m.blockWidth / 2 + 10 + aisle * m.rowPitch + m.rowPitch / 2;
      const drawSkid = (b) => b.box([be, aisleN], z0, 20, 8, 8, 0, SKID, skid);
      parts.push({
        at: [be, aisleN],
        lods: [
          { error: 0, draw: drawSkid },
          { error: 0, draw: drawSkid },
          { error: 8, draw: null },
        ],
      });
    }
  }

  // The substation: three main transformers, the bus's H-frame gantries,
  // the control house; and the operations building beside it.
  const [se, sn] = blockCentre(...substation);
  const yard = { name: "Substation", kind: "substation" };
  const ops = { name: "Operations building", kind: "building" };
  const transformer = (b, k) =>
    b.box([se - 200 + k * 120, sn + 60], z0, 30, 24, 22, 0, TRANSFORMER, yard);
  parts.push({
    at: [se, sn + 60],
    lods: [
      {
        error: 0,
        draw: (b) => {
          for (let k = 0; k < 3; k++) {
            transformer(b, k);
            const e = se - 200 + k * 120;
            // An H-frame: two posts and a beam, 45 ft high, over the transformer's bushing.
            for (const de of [-25, 25]) {
              b.box([e + de, sn + 120], z0, 2, 2, 45, 0, STEEL, yard);
            }
            b.beam(
              [e - 26, sn + 120, z0 + 44],
              [e + 26, sn + 120, z0 + 44],
              2,
              2,
              STEEL,
              yard,
            );
          }
          // The bus, along the gantries.
          b.beam(
            [se - 240, sn + 120, z0 + 38],
            [se + 80, sn + 120, z0 + 38],
            1,
            1,
            STEEL,
            yard,
          );
          b.box([se + 200, sn + 40], z0, 60, 40, 14, 0, HOUSE, yard, {
            topColor: ROOF,
          });
        },
      },
      {
        // The 1 ft bus dropped.
        error: 1,
        draw: (b) => {
          for (let k = 0; k < 3; k++) {
            transformer(b, k);
            const e = se - 200 + k * 120;
            for (const de of [-25, 25]) {
              b.box([e + de, sn + 120], z0, 2, 2, 45, 0, STEEL, yard);
            }
            b.beam(
              [e - 26, sn + 120, z0 + 44],
              [e + 26, sn + 120, z0 + 44],
              2,
              2,
              STEEL,
              yard,
            );
          }
          b.box([se + 200, sn + 40], z0, 60, 40, 14, 0, HOUSE, yard, {
            topColor: ROOF,
          });
        },
      },
      {
        // The gantries dropped: 45 ft high, 2 ft wide.
        error: 23,
        draw: (b) => {
          for (let k = 0; k < 3; k++) {
            transformer(b, k);
          }
          b.box([se + 200, sn + 40], z0, 60, 40, 14, 0, HOUSE, yard, {
            topColor: ROOF,
          });
        },
      },
    ],
  });
  parts.push({
    at: [se, sn - 220],
    lods: [
      {
        error: 0,
        draw: (b) =>
          b.box([se, sn - 220], z0, 160, 70, 18, 0, HOUSE, ops, {
            topColor: ROOF,
          }),
      },
    ],
  });

  const anchor = [e0, n0, z0];
  return {
    anchor,
    leafSize: 1_500,
    parts,
    grounds,
    landmark: {
      label: "The substation's first transformer, top",
      design: [se - 200, sn + 60, z0 + 22],
    },
  };
}
