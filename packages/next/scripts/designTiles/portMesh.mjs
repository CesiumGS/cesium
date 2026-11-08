// Jakarta's model on the scale ladder (plan 4b Task 17b): a container port,
// about 3 km across, on one flat design plane. From the sea inward: a
// breakwater, the harbour basin with two container ships at berth, the
// quay wall with its fenders, the crane apron with ship-to-shore gantry
// cranes on their rails, the container yard (blocks of stacks one to five
// high, each block with its rubber-tyred gantry crane), and a back strip of
// sheds, the gate and the port road. Seeded, so it is the same every run.
//
// Design units are the CRS's (metres, SRGI2013 / UTM zone 48S). The model's
// frame: u along the quay (the model's `angle` from design east), v across,
// toward the sea. The deck is the site's height; the sea is `deckHeight`
// below it.
import {
  PORT_BACK_STRIP as BACK_STRIP,
  PORT_BREAKWATER as BREAKWATER,
} from "../../examples/design-globe/sites.ts";
import {
  LAYER_METRES,
  between,
  frameAt,
  pick,
  placeIn,
  random,
  srgb,
} from "./meshBuilder.mjs";

const WATER = srgb("#24506a");
const ROCK = srgb("#77736b");
const CONCRETE = srgb("#a4a39b");
const YARD = srgb("#55575a");
const BACK = srgb("#6e6f6c");
const ROAD = srgb("#3d3f42");
const RAIL = srgb("#2b2b2b");
const SAFETY = srgb("#d9b020");
const FENDER = srgb("#1d1d1d");
const CRANE = srgb("#b9432f");
const CRANE_HOUSE = srgb("#e8e6df");
const RTG = srgb("#d8a92a");
const HULL = srgb("#1f2a36");
const DECK = srgb("#6a6e70");
const BRIDGE_WHITE = srgb("#ecebe6");
const SHED = srgb("#9aa3a8");
const SHED_ROOF = srgb("#5f7480");
const CONTAINERS = [
  "#2f5f8a",
  "#a63a2b",
  "#8a8f94",
  "#e2e2dc",
  "#3f7a4a",
  "#c9822b",
  "#6b4c3b",
  "#b8a23a",
  "#1f3f66",
].map((c) => srgb(c));

/** A 40 ft container's footprint with its gap (12.5 m by 2.6 m), and a tier. */
const BAY = 12.5;
const ROW = 2.6;
const TIER = 2.6;
/** The ship-to-shore cranes' rail gauge and how far the sea rail is from the quay edge. */
const GAUGE = 30;
const SEA_RAIL = 3;

/**
 * The layer stack (meshBuilder's LAYER_METRES steps) on the deck: the
 * apron, yard and back strip at layer 0, roads, lots and paint at 1, paint
 * on a lot at 2.
 */
const ROAD_LAYER = 1;
const PAINT_LAYER = 1;
const LOT_PAINT_LAYER = 2;

/**
 * @param {import("../../examples/design-globe/sites.ts").PortfolioSite} site
 * @param {{ metersPerUnit: number }} units
 */
export function portPlan(site, { metersPerUnit }) {
  const m = site.model;
  const rand = random(m.seed);
  const f = frameAt(m.angle);
  const centre = [site.origin[0], site.origin[1]];
  const z0 = site.origin[2];
  const zw = z0 - m.deckHeight;
  const layer = (k) => z0 + (k * LAYER_METRES) / metersPerUnit;
  const L = m.quayLength;
  const H = BREAKWATER + m.basinWidth + m.apronDepth + m.yardDepth + BACK_STRIP;
  // Across positions, from the sea (+v) inward.
  const quay = H / 2 - BREAKWATER - m.basinWidth;
  const yardTop = quay - m.apronDepth;
  const yardBottom = yardTop - m.yardDepth;
  const at2 = (along, across) => {
    const p = placeIn(f, centre, along, across, 0);
    return [p[0], p[1]];
  };
  const spot = (along, across, z) => placeIn(f, centre, along, across, z);
  const parts = [];
  const grounds = [];
  const ground = (along, across, len, wid, z, color, name, kind) =>
    grounds.push({
      at: at2(along, across),
      length: len,
      width: wid,
      angle: m.angle,
      z,
      color,
      feature: { name, kind },
      lods: [{ error: 0, keep: true }],
    });

  ground(
    0,
    H / 2 - BREAKWATER / 2,
    L,
    BREAKWATER,
    zw + 2.5,
    ROCK,
    "Breakwater",
    "breakwater",
  );
  ground(
    0,
    quay + m.basinWidth / 2,
    L,
    m.basinWidth,
    zw,
    WATER,
    "Harbour basin",
    "water",
  );
  ground(
    0,
    quay - m.apronDepth / 2,
    L,
    m.apronDepth,
    z0,
    CONCRETE,
    "Crane apron",
    "apron",
  );
  ground(
    0,
    (yardTop + yardBottom) / 2,
    L,
    m.yardDepth,
    z0,
    YARD,
    "Container yard",
    "yard",
  );
  ground(
    0,
    yardBottom - BACK_STRIP / 2,
    L,
    BACK_STRIP,
    z0,
    BACK,
    "Port services",
    "pavement",
  );
  ground(
    0,
    yardBottom - BACK_STRIP + 25,
    L,
    30,
    layer(ROAD_LAYER),
    ROAD,
    "Port road",
    "road",
  );

  // The quay wall: its face from below the sea to the deck, and fenders.
  const wall = { name: "Quay wall", kind: "quay" };
  parts.push({
    at: at2(0, quay - 1),
    lods: [
      {
        error: 0,
        draw: (b) =>
          b.cuboid(
            spot(0, quay - 1, zw - 1),
            f,
            [L, 2, m.deckHeight + 1],
            CONCRETE,
            wall,
          ),
      },
    ],
  });
  const fenders = { name: "Quay fenders", kind: "fender" };
  for (let a = -L / 2 + 12; a < L / 2; a += 25) {
    parts.push({
      at: at2(a, quay + 0.5),
      lods: [
        {
          error: 0,
          draw: (b) =>
            b.cuboid(
              spot(a, quay + 0.5, zw + 0.5),
              f,
              [2, 1, 2.2],
              FENDER,
              fenders,
            ),
        },
        { error: 1.5, draw: null },
      ],
    });
  }
  // The cranes' rails and the apron's yellow safety line, painted.
  const rails = { name: "Crane rails", kind: "rail" };
  for (const [across, width, color] of [
    [quay - SEA_RAIL, 0.4, RAIL],
    [quay - SEA_RAIL - GAUGE, 0.4, RAIL],
    [quay - SEA_RAIL - GAUGE - 6, 0.3, SAFETY],
  ]) {
    for (let a = -L / 2; a < L / 2; a += 200) {
      const len = Math.min(200, L / 2 - a);
      parts.push({
        at: at2(a + len / 2, across),
        lods: [
          {
            error: 0,
            draw: (b) =>
              b.flat(
                at2(a + len / 2, across),
                layer(PAINT_LAYER),
                len,
                width,
                m.angle,
                color,
                rails,
              ),
          },
          {
            error: 0,
            draw: (b) =>
              b.flat(
                at2(a + len / 2, across),
                layer(PAINT_LAYER),
                len,
                width,
                m.angle,
                color,
                rails,
              ),
          },
          { error: width / 2, draw: null },
        ],
      });
    }
  }

  // Ship-to-shore cranes along the quay, between the two ships' berths.
  const sts = [];
  for (let k = 0; k < m.cranes; k++) {
    sts.push(-L / 2 + 180 + (k * (L - 360)) / Math.max(1, m.cranes - 1));
  }
  sts.forEach((a, k) => {
    const feature = { name: `Ship-to-shore crane ${k + 1}`, kind: "crane" };
    const seaV = quay - SEA_RAIL;
    const landV = seaV - GAUGE;
    const top = z0 + 46;
    const boom = z0 + 49;
    const tip = quay + 58;
    const back = landV - 22;
    const apex = z0 + 74;
    const draw = (detail) => (b) => {
      for (const da of [-9, 9]) {
        for (const v of [seaV, landV]) {
          b.cuboid(spot(a + da, v, z0), f, [2, 2, 46], CRANE, feature);
        }
        // The portal's beams across, at the sill and the top.
        b.beam(
          spot(a + da, landV, z0 + 12),
          spot(a + da, seaV, z0 + 12),
          1.5,
          1.5,
          CRANE,
          feature,
        );
        b.beam(
          spot(a + da, landV, top),
          spot(a + da, seaV, top),
          1.8,
          2,
          CRANE,
          feature,
        );
      }
      for (const v of [seaV, landV]) {
        b.beam(
          spot(a - 9, v, top),
          spot(a + 9, v, top),
          1.8,
          2,
          CRANE,
          feature,
        );
      }
      // The boom's two girders, from the backreach out over the water.
      for (const da of [-4, 4]) {
        b.beam(
          spot(a + da, back, boom),
          spot(a + da, tip, boom),
          1.6,
          3,
          CRANE,
          feature,
        );
      }
      b.cuboid(
        spot(a, landV - 12, boom + 1.5),
        f,
        [12, 10, 6],
        CRANE_HOUSE,
        feature,
      );
      if (detail >= 1) {
        // The apex and its stays to the boom's ends.
        for (const da of [-4, 4]) {
          b.beam(
            spot(a + da, landV, top),
            spot(a + da, landV, apex),
            1.4,
            1.4,
            CRANE,
            feature,
          );
          b.beam(
            spot(a + da, landV, apex),
            spot(a + da, tip - 8, boom + 3),
            0.8,
            0.8,
            CRANE,
            feature,
          );
          b.beam(
            spot(a + da, landV, apex),
            spot(a + da, back + 4, boom + 3),
            0.8,
            0.8,
            CRANE,
            feature,
          );
        }
      }
      if (detail >= 2) {
        // The trolley and its cabin, out over the ship.
        b.cuboid(
          spot(a, quay + 20, boom - 3),
          f,
          [6, 9, 3],
          CRANE_HOUSE,
          feature,
        );
      }
    };
    parts.push({
      at: at2(a, landV),
      lods: [
        { error: 0, draw: draw(2) },
        // The 3 m trolley dropped.
        { error: 3, draw: draw(1) },
        // The apex dropped: its top is 25 m above the boom.
        { error: 25, draw: draw(0) },
      ],
    });
  });

  // Two container ships at berth.
  const ships = [
    { name: "Container ship at berth 1", along: -L / 4, length: 300 },
    { name: "Container ship at berth 2", along: L / 4 - 30, length: 260 },
  ];
  for (const ship of ships) {
    const feature = { name: ship.name, kind: "ship" };
    const beamWidth = 46;
    const v0 = quay + 4;
    const v1 = v0 + beamWidth;
    const deck = zw + 16;
    const half = ship.length / 2;
    const bow = ship.along + half;
    const bays = Math.floor((ship.length - 80) / BAY);
    const rows = 16;
    const stacks = [];
    for (let i = 0; i < bays; i++) {
      for (let j = 0; j < rows; j++) {
        stacks.push({
          a: ship.along - half + 50 + (i + 0.5) * BAY,
          v: v0 + 4 + (j + 0.5) * ROW,
          tiers: Math.floor(between(rand, 3, 8)),
          color: pick(rand, CONTAINERS),
          bay: i,
        });
      }
    }
    const hull = (b) => {
      // The deck's outline: a box with a pointed bow, counterclockwise.
      const outline = [
        [ship.along - half, v0],
        [bow - 30, v0],
        [bow, (v0 + v1) / 2],
        [bow - 30, v1],
        [ship.along - half, v1],
      ].map(([a, v]) => spot(a, v, deck));
      b.polygon(outline, DECK, feature);
      for (let k = 0; k < outline.length; k++) {
        const p = outline[k];
        const q = outline[(k + 1) % outline.length];
        b.quad([p[0], p[1], zw], [q[0], q[1], zw], q, p, HULL, feature);
      }
      // The bridge (accommodation) near the stern.
      b.cuboid(
        spot(ship.along - half + 30, (v0 + v1) / 2, deck),
        f,
        [18, 36, 26],
        BRIDGE_WHITE,
        feature,
      );
    };
    const meanTop = deck + 5 * TIER;
    parts.push({
      at: at2(ship.along, (v0 + v1) / 2),
      lods: [
        {
          error: 0,
          draw: (b) => {
            hull(b);
            for (const s of stacks) {
              b.cuboid(
                spot(s.a, s.v, deck),
                f,
                [BAY - 0.4, ROW - 0.2, s.tiers * TIER],
                s.color,
                feature,
              );
            }
          },
        },
        {
          // Each bay as one box at its highest stack: 4 tiers at most above the lowest.
          error: 4 * TIER,
          draw: (b) => {
            hull(b);
            for (let i = 0; i < bays; i++) {
              const bay = stacks.filter((s) => s.bay === i);
              const tiers = Math.max(...bay.map((s) => s.tiers));
              b.cuboid(
                spot(bay[0].a, v0 + 4 + (rows * ROW) / 2, deck),
                f,
                [BAY - 0.4, rows * ROW, tiers * TIER],
                bay[0].color,
                feature,
              );
            }
          },
        },
        {
          // The cargo as one mass at the mean height: within 3 tiers of every stack, and the bays' gaps.
          error: 3 * TIER,
          draw: (b) => {
            hull(b);
            b.cuboid(
              spot(ship.along + 5, v0 + 4 + (rows * ROW) / 2, deck),
              f,
              [bays * BAY, rows * ROW, meanTop - deck],
              CONTAINERS[0],
              feature,
            );
          },
        },
      ],
    });
  }

  // The container yard: blocks of six rows by sixteen bays, roads between.
  const blockLength = 16 * BAY;
  const blockWidth = 6 * ROW;
  const pitchA = blockLength + m.yardRoad;
  const pitchV = blockWidth + 8 + m.yardRoad;
  const nA = Math.floor((L - 60) / pitchA);
  const nV = Math.min(m.yardRows, Math.floor((m.yardDepth - 40) / pitchV));
  for (let i = 0; i < nA; i++) {
    for (let j = 0; j < nV; j++) {
      const ba = -((nA - 1) * pitchA) / 2 + i * pitchA;
      const bv = yardTop - 20 - pitchV / 2 - j * pitchV;
      const name = `Yard block ${String.fromCharCode(65 + j)}${i + 1}`;
      const feature = { name, kind: "container stack" };
      const stacks = [];
      for (let r = 0; r < 6; r++) {
        for (let c = 0; c < 16; c++) {
          const roll = rand();
          const tiers =
            roll < 0.1
              ? 0
              : roll < 0.25
                ? 1
                : roll < 0.45
                  ? 2
                  : roll < 0.75
                    ? 3
                    : roll < 0.93
                      ? 4
                      : 5;
          stacks.push({
            a: ba - blockLength / 2 + (c + 0.5) * BAY,
            v: bv - blockWidth / 2 + (r + 0.5) * ROW,
            r,
            tiers,
            color: pick(rand, CONTAINERS),
          });
        }
      }
      const filled = stacks.filter((s) => s.tiers > 0);
      if (filled.length === 0) {
        continue;
      }
      const top = Math.max(...filled.map((s) => s.tiers));
      const low = Math.min(...stacks.map((s) => s.tiers));
      parts.push({
        at: at2(ba, bv),
        lods: [
          {
            error: 0,
            draw: (b) => {
              for (const s of filled) {
                b.cuboid(
                  spot(s.a, s.v, z0),
                  f,
                  [BAY - 0.4, ROW - 0.16, s.tiers * TIER],
                  s.color,
                  feature,
                );
              }
            },
          },
          {
            // Each row as one box at its highest stack.
            error: (top - low) * TIER,
            draw: (b) => {
              for (let r = 0; r < 6; r++) {
                const row = stacks.filter((s) => s.r === r);
                const tiers = Math.max(...row.map((s) => s.tiers));
                if (tiers > 0) {
                  b.cuboid(
                    spot(ba, row[0].v, z0),
                    f,
                    [blockLength - 0.4, ROW - 0.16, tiers * TIER],
                    row[0].color,
                    feature,
                  );
                }
              }
            },
          },
          {
            // The block as one box at its highest stack.
            error: (top - low) * TIER + ROW,
            draw: (b) =>
              b.cuboid(
                spot(ba, bv, z0),
                f,
                [blockLength, blockWidth, top * TIER],
                pick(random(i * 31 + j), CONTAINERS),
                feature,
              ),
          },
        ],
      });
      // The block's rubber-tyred gantry crane, astride it.
      const ga = ba + between(rand, -0.4, 0.4) * blockLength;
      const rtg = { name: `${name} gantry crane`, kind: "crane" };
      const span = blockWidth + 6;
      const rtgDraw = (b) => {
        for (const da of [-3.5, 3.5]) {
          for (const dv of [-span / 2, span / 2]) {
            b.cuboid(spot(ga + da, bv + dv, z0), f, [1.2, 1.2, 21], RTG, rtg);
          }
        }
        for (const da of [-3.5, 3.5]) {
          b.beam(
            spot(ga + da, bv - span / 2 - 0.6, z0 + 20),
            spot(ga + da, bv + span / 2 + 0.6, z0 + 20),
            1.2,
            2,
            RTG,
            rtg,
          );
        }
        b.cuboid(
          spot(ga, bv + span / 2 - 2, z0 + 15),
          f,
          [2.4, 2.4, 2.6],
          CRANE_HOUSE,
          rtg,
        );
      };
      parts.push({
        at: at2(ga, bv),
        lods: [
          { error: 0, draw: rtgDraw },
          { error: 0, draw: rtgDraw },
          { error: 0, draw: rtgDraw },
          // Dropped: it stands 22 m.
          { error: 22, draw: null },
        ],
      });
    }
  }

  // Behind the stacks, the rail terminal: four sidings and three trains of
  // container wagons.
  const railTop = yardTop - 20 - nV * pitchV - 30;
  const sidings = { name: "Rail sidings", kind: "rail" };
  for (let k = 0; k < 4; k++) {
    const v = railTop - k * 6;
    for (const gauge of [-0.72, 0.72]) {
      for (let a = -L / 2 + 50; a < L / 2 - 50; a += 200) {
        const len = Math.min(200, L / 2 - 50 - a);
        const at = at2(a + len / 2, v + gauge);
        const draw = (b) =>
          b.flat(at, layer(PAINT_LAYER), len, 0.15, m.angle, RAIL, sidings);
        parts.push({
          at,
          lods: [
            { error: 0, draw },
            { error: 0, draw },
            { error: 0.075, draw: null },
          ],
        });
      }
    }
  }
  for (let train = 0; train < 3; train++) {
    const v = railTop - train * 6;
    const feature = { name: `Train ${train + 1}`, kind: "train" };
    const first = -L / 2 + 150 + train * 400;
    for (let w = 0; w < 25; w++) {
      const a = first + w * 19;
      const color = pick(rand, CONTAINERS);
      parts.push({
        at: at2(a, v),
        lods: [
          {
            error: 0,
            draw: (b) => {
              b.cuboid(spot(a, v, z0 + 0.3), f, [18, 2.9, 1.2], RAIL, feature);
              b.cuboid(
                spot(a, v, z0 + 1.5),
                f,
                [BAY - 0.4, ROW - 0.2, TIER],
                color,
                feature,
              );
            },
          },
          {
            // The wagon as one box: within half the 5.5 m gap of the wagons.
            error: 2.75,
            draw: (b) =>
              b.cuboid(
                spot(a, v, z0 + 0.3),
                f,
                [18, 2.9, 1.2 + TIER],
                color,
                feature,
              ),
          },
        ],
      });
    }
  }

  // Behind the rail terminal: an empty-container depot (tall stacks in
  // runs of four bays), a truck holding lot with its bays and trucks, the
  // repair workshops and the terminal offices.
  const depotTop = railTop - 4 * 6 - 25;
  const depotRows = 4;
  const depotWidth = depotRows * ROW;
  for (let band = 0; band < 2; band++) {
    const bv = depotTop - depotWidth / 2 - band * (depotWidth + 22);
    for (let i = 0; i < nA; i++) {
      const ba = -((nA - 1) * pitchA) / 2 + i * pitchA;
      const feature = {
        name: `Empty depot ${band + 1}-${i + 1}`,
        kind: "container stack",
      };
      const runs = [];
      for (let r = 0; r < depotRows; r++) {
        for (let k = 0; k < 4; k++) {
          runs.push({
            a: ba - blockLength / 2 + (k + 0.5) * (blockLength / 4),
            v: bv - depotWidth / 2 + (r + 0.5) * ROW,
            tiers: Math.floor(between(rand, 4, 8)),
            color: pick(rand, CONTAINERS),
          });
        }
      }
      const top = Math.max(...runs.map((x) => x.tiers));
      const low = Math.min(...runs.map((x) => x.tiers));
      parts.push({
        at: at2(ba, bv),
        lods: [
          {
            error: 0,
            draw: (b) => {
              for (const x of runs) {
                b.cuboid(
                  spot(x.a, x.v, z0),
                  f,
                  [blockLength / 4 - 0.4, ROW - 0.16, x.tiers * TIER],
                  x.color,
                  feature,
                );
              }
            },
          },
          {
            // The band as one box at its highest run.
            error: (top - low) * TIER + ROW,
            draw: (b) =>
              b.cuboid(
                spot(ba, bv, z0),
                f,
                [blockLength, depotWidth, top * TIER],
                runs[0].color,
                feature,
              ),
          },
        ],
      });
    }
  }
  const lotV = depotTop - 2 * (depotWidth + 22) - 60;
  const lotLength = L * 0.45;
  const lotA = -L / 2 + 60 + lotLength / 2;
  grounds.push({
    at: at2(lotA, lotV),
    length: lotLength,
    width: 90,
    angle: m.angle,
    z: layer(ROAD_LAYER),
    color: ROAD,
    feature: { name: "Truck holding lot", kind: "parking" },
    lods: [{ error: 0, keep: true }],
  });
  const bays = { name: "Truck holding lot bays", kind: "parking" };
  const trucks = { name: "Trucks waiting", kind: "truck" };
  for (let k = 0; k * 6 < lotLength - 10; k++) {
    const a = lotA - lotLength / 2 + 5 + k * 6;
    for (const side of [-1, 1]) {
      const v = lotV + side * 22;
      const at = at2(a, v);
      const line = (b) =>
        b.flat(
          at,
          layer(LOT_PAINT_LAYER),
          0.15,
          20,
          m.angle,
          BRIDGE_WHITE,
          bays,
        );
      parts.push({
        at,
        lods: [
          { error: 0, draw: line },
          { error: 0, draw: line },
          { error: 0.075, draw: null },
        ],
      });
      if (k > 0 && rand() < 0.45) {
        const ta = a - 3;
        const color = pick(rand, CONTAINERS);
        parts.push({
          at: at2(ta, v),
          lods: [
            {
              error: 0,
              draw: (b) => {
                b.cuboid(
                  spot(ta, v + side * 7.5, z0),
                  f,
                  [2.5, 5, 3.2],
                  CRANE_HOUSE,
                  trucks,
                );
                b.cuboid(
                  spot(ta, v - side * 2, z0 + 1.2),
                  f,
                  [2.5, 12.2, TIER],
                  color,
                  trucks,
                );
              },
            },
            // Dropped: a truck stands 3.8 m.
            { error: 3.8, draw: null },
          ],
        });
      }
    }
  }
  for (let k = 0; k < 2; k++) {
    const a = L / 2 - 200 - k * 180;
    const feature = { name: `Repair workshop ${k + 1}`, kind: "shed" };
    parts.push({
      at: at2(a, lotV),
      lods: [
        {
          error: 0,
          draw: (b) =>
            b.cuboid(spot(a, lotV, z0), f, [130, 55, 18], SHED, feature, {
              topColor: SHED_ROOF,
            }),
        },
      ],
    });
  }
  for (let k = 0; k < 3; k++) {
    const a = 60 + k * 70;
    const feature = { name: `Terminal office ${k + 1}`, kind: "office" };
    parts.push({
      at: at2(a, lotV),
      lods: [
        {
          error: 0,
          draw: (b) =>
            b.cuboid(
              spot(a, lotV, z0),
              f,
              [45, 22, 12 + 8 * k],
              BRIDGE_WHITE,
              feature,
              {
                topColor: SHED_ROOF,
              },
            ),
        },
      ],
    });
  }
  if (lotV - 45 < yardBottom) {
    throw new Error("portPlan: the yard is too shallow for its depot and lot");
  }

  // The back strip: sheds, the gate's canopy and booths, the office.
  const backV = yardBottom - 60;
  const sheds = 5;
  for (let k = 0; k < sheds; k++) {
    const a = -L / 2 + 240 + (k * (L - 480)) / (sheds - 1);
    const feature = { name: `Freight shed ${k + 1}`, kind: "shed" };
    parts.push({
      at: at2(a, backV),
      lods: [
        {
          error: 0,
          draw: (b) =>
            b.cuboid(spot(a, backV, z0), f, [160, 60, 14], SHED, feature, {
              topColor: SHED_ROOF,
            }),
        },
      ],
    });
  }
  const gate = { name: "Terminal gate", kind: "gate" };
  const gateA = 0;
  parts.push({
    at: at2(gateA, backV),
    lods: [
      {
        error: 0,
        draw: (b) => {
          b.cuboid(
            spot(gateA, backV, z0 + 7),
            f,
            [90, 30, 1],
            CRANE_HOUSE,
            gate,
            {
              bottom: true,
            },
          );
          for (let k = 0; k < 10; k++) {
            b.cuboid(
              spot(gateA - 40 + k * 9, backV, z0),
              f,
              [2, 3, 2.6],
              RTG,
              gate,
            );
          }
          b.cuboid(
            spot(gateA, backV - 40, z0),
            f,
            [60, 18, 16],
            BRIDGE_WHITE,
            gate,
            { topColor: SHED_ROOF },
          );
        },
      },
      {
        error: 2.6,
        draw: (b) =>
          b.cuboid(
            spot(gateA, backV - 40, z0),
            f,
            [60, 18, 16],
            BRIDGE_WHITE,
            gate,
            { topColor: SHED_ROOF },
          ),
      },
    ],
  });

  const anchor = [site.origin[0], site.origin[1], z0];
  const first = sts[0];
  return {
    anchor,
    leafSize: 450,
    parts,
    grounds,
    landmark: {
      label: "Ship-to-shore crane 1's boom tip",
      design: spot(first, quay + 58, z0 + 49),
    },
  };
}
