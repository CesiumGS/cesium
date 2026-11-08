// Sydney's model on the scale ladder (plan 4b Task 17b): an airport, about
// 4 km across, on one flat design plane. Two parallel runways with their
// shoulders and ICAO-style markings (threshold stripes, designations, the
// aiming point, touchdown-zone bars, side stripes and centreline dashes);
// parallel taxiways with their links, rapid exits, yellow centrelines and
// holding-position markings; and between the runways the apron, the
// terminal with its piers, jet bridges and parked aircraft, the control
// tower, hangars and the car park, on grass.
//
// Design units are the CRS's (metres, GDA2020 / MGA zone 56). The model's
// frame: u along the runways, in the direction a "16" runway is flown
// (`azimuth`, clockwise from grid north), v across, to the left of u.
import {
  LAYER_METRES,
  between,
  frameAt,
  placeIn,
  random,
  srgb,
} from "./meshBuilder.mjs";

const GRASS = srgb("#6f8a4e");
const ASPHALT = srgb("#3a3c3e");
const SHOULDER = srgb("#56595b");
const APRON = srgb("#9e9d97");
const WHITE = srgb("#ecece6");
const YELLOW = srgb("#e0b22c");
const TERMINAL = srgb("#d9dcdc");
const GLASS = srgb("#5b7385");
const ROOF = srgb("#a9adb0");
const BRIDGE = srgb("#b9bcbd");
const HANGAR = srgb("#c4c6c4");
const HANGAR_ROOF = srgb("#7b8288");
const TOWER = srgb("#e5e3dc");
const CAB = srgb("#2f3d48");
const LIVERIES = ["#f2f2f0", "#e8e8e4", "#dfe3e8"].map((c) => srgb(c));
const TAIL = ["#c8312b", "#1f4f8f", "#e07b1a", "#2b2b2b"].map((c) => srgb(c));

const SHOULDER_WIDTH = 7.5;
/**
 * The layer stack (meshBuilder's LAYER_METRES steps): the grass, then the
 * shoulders, then the pavement (runways, taxiways, links, exits, apron),
 * then the paint. Paint never crosses paint of another colour: the yellow
 * taxiway lines start beyond the runway's shoulder.
 */
const GRASS_LAYER = 0;
const SHOULDER_LAYER = 1;
const PAVEMENT_LAYER = 2;
const PAINT_LAYER = 3;

/** A 3 × 5 pixel font for runway designations: rows top to bottom. */
const GLYPHS = {
  0: ["111", "101", "101", "101", "111"],
  1: ["010", "110", "010", "010", "111"],
  2: ["111", "001", "111", "100", "111"],
  3: ["111", "001", "111", "001", "111"],
  4: ["101", "101", "111", "001", "001"],
  5: ["111", "100", "111", "001", "111"],
  6: ["111", "100", "111", "101", "111"],
  7: ["111", "001", "001", "001", "001"],
  8: ["111", "101", "111", "101", "111"],
  9: ["111", "101", "111", "001", "111"],
  L: ["100", "100", "100", "100", "111"],
  R: ["110", "101", "110", "101", "101"],
  C: ["111", "100", "100", "100", "111"],
};
/** A designation's character: 9 m long, 3 m wide (each pixel 1.8 by 1). */
const GLYPH_LENGTH = 9;
const GLYPH_WIDTH = 3;

/**
 * A designation's strokes, as [along, across, length, width] rectangles in
 * a reader's frame (along: away from the reader; across: to the reader's
 * left), the text's bottom edge at along 0 and centred across.
 */
function designationStrokes(text) {
  const pitch = GLYPH_WIDTH + 1.5;
  const width = text.length * pitch - 1.5;
  const strokes = [];
  [...text].forEach((ch, k) => {
    const glyph = GLYPHS[ch];
    if (glyph === undefined) {
      throw new Error(`airport: no glyph for ${ch}`);
    }
    const left = width / 2 - k * pitch;
    const px = GLYPH_WIDTH / 3;
    const py = GLYPH_LENGTH / 5;
    glyph.forEach((row, r) => {
      // Runs of filled pixels as one rectangle.
      for (let c = 0; c < 3;) {
        if (row[c] !== "1") {
          c++;
          continue;
        }
        let end = c;
        while (end + 1 < 3 && row[end + 1] === "1") {
          end++;
        }
        strokes.push([
          (4 - r + 0.5) * py,
          left - ((c + end + 1) / 2) * px,
          py,
          (end - c + 1) * px,
        ]);
        c = end + 1;
      }
    });
  });
  return strokes;
}

/**
 * @param {import("../../examples/design-globe/sites.ts").PortfolioSite} site
 * @param {{ metersPerUnit: number }} units
 */
export function airportPlan(site, { metersPerUnit }) {
  const m = site.model;
  const rand = random(m.seed);
  const angle = Math.PI / 2 - m.azimuth;
  const f = frameAt(angle);
  const centre = [site.origin[0], site.origin[1]];
  const z0 = site.origin[2];
  const layer = (k) => z0 + (k * LAYER_METRES) / metersPerUnit;
  const zPaint = layer(PAINT_LAYER);
  const spot = (along, across, z) => placeIn(f, centre, along, across, z);
  const at2 = (along, across) => {
    const p = spot(along, across, 0);
    return [p[0], p[1]];
  };
  const parts = [];
  const grounds = [];
  const ground = (along, across, len, wid, z, color, feature, turn = 0) =>
    grounds.push({
      at: at2(along, across),
      length: len,
      width: wid,
      angle: angle + turn,
      z,
      color,
      feature,
      lods: [{ error: 0, keep: true }],
    });
  /**
   * A painted rectangle, kept up to level `through` and dropped above it,
   * where it counts half its width: the distance from any of its points to
   * the bare pavement's edge of colour.
   */
  const paint = (
    along,
    across,
    len,
    wid,
    color,
    feature,
    through = Infinity,
    turn = 0,
  ) => {
    const at = at2(along, across);
    const draw = (b) =>
      b.flat(at, zPaint, len, wid, angle + turn, color, feature);
    const lods = [{ error: 0, draw }];
    for (let l = 1; l <= Math.min(through, 3); l++) {
      lods.push({ error: 0, draw });
    }
    if (through < 3) {
      lods.push({ error: Math.min(len, wid) / 2, draw: null });
    }
    parts.push({ at, lods });
  };

  // The airfield's extent: every runway's ends and the taxiways, with 150 m of grass.
  const ends = m.runways.flatMap((r) => [
    r.along - r.length / 2,
    r.along + r.length / 2,
  ]);
  const across = m.runways.map((r) => r.across);
  const u0 = Math.min(...ends) - 150;
  const u1 = Math.max(...ends) + 150;
  const v0 = Math.min(...across) - 200;
  const v1 = Math.max(...across) + 200;
  ground(
    (u0 + u1) / 2,
    (v0 + v1) / 2,
    u1 - u0,
    v1 - v0,
    layer(GRASS_LAYER),
    GRASS,
    {
      name: "Airfield grass",
      kind: "grass",
    },
  );

  for (const r of m.runways) {
    const label = r.designations.join("/");
    const pavement = { name: `Runway ${label}`, kind: "runway" };
    const zp = layer(PAVEMENT_LAYER);
    ground(r.along, r.across, r.length, r.width, zp, ASPHALT, pavement);
    for (const side of [-1, 1]) {
      ground(
        r.along,
        r.across + (side * (r.width + SHOULDER_WIDTH)) / 2,
        r.length,
        SHOULDER_WIDTH,
        layer(SHOULDER_LAYER),
        SHOULDER,
        {
          name: `Runway ${label} shoulders`,
          kind: "shoulder",
        },
      );
    }
    // The parallel taxiway, toward the terminal (the model's middle).
    const toward = r.across > 0 ? -1 : 1;
    const tv = r.across + toward * m.taxiwayOffset;
    const taxiway = { name: `Taxiway parallel to ${label}`, kind: "taxiway" };
    ground(r.along, tv, r.length, m.taxiwayWidth, zp, ASPHALT, taxiway);
    const taxiLine = {
      name: `${taxiway.name}, centreline`,
      kind: "taxiway marking",
    };
    for (let a = r.along - r.length / 2; a < r.along + r.length / 2; a += 200) {
      const len = Math.min(200, r.along + r.length / 2 - a);
      paint(a + len / 2, tv, len, 0.3, YELLOW, taxiLine, 1);
    }
    // Links at the ends and the middle, and two rapid exits each way.
    const linkLength = m.taxiwayOffset;
    const links = [-0.5, -0.17, 0.17, 0.5].map(
      (k) => r.along + k * (r.length - m.taxiwayWidth),
    );
    links.forEach((a, k) => {
      const feature = { name: `${label} link ${k + 1}`, kind: "taxiway" };
      ground(
        a,
        (r.across + tv) / 2,
        m.taxiwayWidth,
        linkLength,
        zp,
        ASPHALT,
        feature,
      );
      // Its centreline from beyond the shoulder to the taxiway's.
      const from = r.across + toward * (r.width / 2 + SHOULDER_WIDTH + 1);
      paint(a, (from + tv) / 2, 0.3, Math.abs(tv - from), YELLOW, feature, 1);
      // Holding position: two solid and two dashed lines across the link.
      const hold = {
        name: `${label} link ${k + 1} holding position`,
        kind: "taxiway marking",
      };
      const hv = r.across + toward * (r.width / 2 + SHOULDER_WIDTH + 40);
      for (let line = 0; line < 4; line++) {
        const v = hv + toward * line * 0.6;
        if (line < 2) {
          paint(a, v, m.taxiwayWidth, 0.3, YELLOW, hold, 2);
        } else {
          for (
            let d = -m.taxiwayWidth / 2 + 0.5;
            d < m.taxiwayWidth / 2;
            d += 2
          ) {
            paint(a + d + 0.5, v, 1, 0.3, YELLOW, hold, 2);
          }
        }
      }
    });
    for (const direction of [-1, 1]) {
      // A rapid exit, 30° off the runway, about 1,700 m after the threshold.
      const turn = (direction * Math.PI) / 6;
      const length = (m.taxiwayOffset - r.width / 2) / Math.sin(Math.PI / 6);
      const start = r.along - direction * (r.length / 2 - 1_700);
      const a = start + direction * (length / 2) * Math.cos(Math.PI / 6);
      const v = (r.across + tv) / 2;
      const feature = {
        name: `${label} rapid exit ${direction > 0 ? 1 : 2}`,
        kind: "taxiway",
      };
      ground(a, v, length, m.taxiwayWidth, zp, ASPHALT, feature, toward * turn);
      // Its centreline from beyond the shoulder (s from the exit's middle,
      // toward the taxiway, along its axis) to its end.
      const sin = Math.sin(Math.PI / 6);
      const cos = Math.cos(Math.PI / 6);
      const s0 =
        (r.width / 2 + SHOULDER_WIDTH + 1 - toward * (v - r.across)) / sin;
      const sc = (s0 + length / 2) / 2;
      paint(
        a + direction * sc * cos,
        v + toward * sc * sin,
        length / 2 - s0,
        0.3,
        YELLOW,
        feature,
        1,
        toward * turn,
      );
    }

    // The runway's markings, at each end in its reader's frame.
    const marks = { name: `Runway ${label} markings`, kind: "runway marking" };
    r.designations.forEach((text, end) => {
      // End 0 is flown along +u; end 1 along −u, its frame turned 180°.
      const s = end === 0 ? 1 : -1;
      const threshold = r.along - s * (r.length / 2);
      const mark = (along, acrossOffset, len, wid, through) =>
        paint(
          threshold + s * along,
          r.across + s * acrossOffset,
          len,
          wid,
          WHITE,
          marks,
          through,
        );
      // Threshold: twelve stripes 30 m by 1.8 m, 6 m in.
      for (let k = 0; k < 6; k++) {
        for (const side of [-1, 1]) {
          mark(6 + 15, side * (2.7 + k * 3.6), 30, 1.8);
        }
      }
      // The designation, its letter nearer the threshold.
      const letter = text.slice(-1);
      const number = text.slice(0, -1);
      for (const [a, c, len, wid] of designationStrokes(letter)) {
        mark(48 + a, c, len, wid, 2);
      }
      for (const [a, c, len, wid] of designationStrokes(number)) {
        mark(48 + GLYPH_LENGTH + 6 + a, c, len, wid, 2);
      }
      // The aiming point: two 50 m by 8 m bars, 400 m in.
      for (const side of [-1, 1]) {
        mark(400, side * 13, 50, 8);
      }
      // Touchdown-zone bars, 22.5 m by 1.8 m, in sets of three, two and one.
      for (const [at, bars] of [
        [150, 3],
        [600, 2],
        [750, 2],
        [900, 1],
      ]) {
        for (let k = 0; k < bars; k++) {
          for (const side of [-1, 1]) {
            mark(at, side * (9.9 + k * 3.3), 22.5, 1.8, 2);
          }
        }
      }
    });
    // Centreline dashes, 30 m on and 20 m off, between the designations.
    for (let a = 90; a + 30 <= r.length - 90; a += 50) {
      paint(
        r.along - r.length / 2 + a + 15,
        r.across,
        30,
        0.9,
        WHITE,
        marks,
        1,
      );
    }
    // Side stripes, 0.9 m, along both edges.
    for (const side of [-1, 1]) {
      for (let a = 0; a < r.length; a += 200) {
        const len = Math.min(200, r.length - a);
        paint(
          r.along - r.length / 2 + a + len / 2,
          r.across + side * (r.width / 2 - 0.45),
          len,
          0.9,
          WHITE,
          marks,
          1,
        );
      }
    }
  }

  // The apron, between the taxiways.
  const inner =
    Math.min(...m.runways.map((r) => Math.abs(r.across))) -
    m.taxiwayOffset -
    m.taxiwayWidth / 2 -
    8;
  const apronLength = m.terminal.length + 500;
  ground(0, 0, apronLength, 2 * inner, layer(PAVEMENT_LAYER), APRON, {
    name: "Apron",
    kind: "apron",
  });

  // The terminal: the main hall along u, piers across it toward both
  // taxiways, a jet bridge and a stand at each gate.
  const t = m.terminal;
  const hall = { name: "Terminal", kind: "terminal" };
  const zp = layer(PAVEMENT_LAYER);
  const hallDraw = (b) => {
    b.cuboid(spot(0, 0, zp), f, [t.length, t.depth, 22], TERMINAL, hall, {
      topColor: ROOF,
    });
    // A glazed band along both faces.
    b.cuboid(
      spot(0, 0, zp + 5),
      f,
      [t.length + 0.2, t.depth + 0.2, 8],
      GLASS,
      hall,
      { top: false },
    );
  };
  parts.push({ at: at2(0, 0), lods: [{ error: 0, draw: hallDraw }] });
  const pierLength = inner - t.depth / 2 - 70;
  const gatesPerSide = Math.floor(pierLength / 45);
  for (let p = 0; p < t.piers; p++) {
    const pa = -t.length / 2 + (t.length * (p + 0.5)) / t.piers;
    for (const side of [-1, 1]) {
      const pv = side * (t.depth / 2 + pierLength / 2);
      const pier = {
        name: `Pier ${String.fromCharCode(65 + 2 * p + (side > 0 ? 1 : 0))}`,
        kind: "terminal",
      };
      parts.push({
        at: at2(pa, pv),
        lods: [
          {
            error: 0,
            draw: (b) => {
              b.cuboid(
                spot(pa, pv, zp),
                f,
                [26, pierLength, 14],
                TERMINAL,
                pier,
                {
                  topColor: ROOF,
                },
              );
              b.cuboid(
                spot(pa, pv, zp + 4),
                f,
                [26.2, pierLength + 0.2, 6],
                GLASS,
                pier,
                { top: false },
              );
            },
          },
        ],
      });
      for (let g = 0; g < gatesPerSide; g++) {
        const gv = side * (t.depth / 2 + 30 + g * 45);
        for (const flank of [-1, 1]) {
          const gate = `${pier.name.replace("Pier ", "")}${2 * g + (flank > 0 ? 2 : 1)}`;
          const bridge = {
            name: `Gate ${gate} jet bridge`,
            kind: "jet bridge",
          };
          const ba = pa + flank * 13;
          parts.push({
            at: at2(ba + flank * 14, gv),
            lods: [
              {
                error: 0,
                draw: (b) =>
                  b.beam(
                    spot(ba, gv, zp + 5),
                    spot(ba + flank * 28, gv, zp + 5),
                    3.5,
                    3.5,
                    BRIDGE,
                    bridge,
                  ),
              },
              {
                error: 0,
                draw: (b) =>
                  b.beam(
                    spot(ba, gv, zp + 5),
                    spot(ba + flank * 28, gv, zp + 5),
                    3.5,
                    3.5,
                    BRIDGE,
                    bridge,
                  ),
              },
              // Dropped: 7 m above the apron.
              { error: 7, draw: null },
            ],
          });
          // The stand's lead-in line.
          paint(
            ba + flank * 50,
            gv,
            60,
            0.3,
            YELLOW,
            { name: `Gate ${gate} stand`, kind: "apron marking" },
            1,
          );
          // An aircraft at about two stands in three.
          if (rand() < 0.65) {
            parts.push(
              aircraft(
                spot,
                at2,
                f,
                ba + flank * 33,
                gv,
                flank,
                zp,
                `Aircraft at gate ${gate}`,
                rand,
              ),
            );
          }
        }
      }
    }
  }

  // The control tower, the hangars and the car park.
  const tower = { name: "Control tower", kind: "tower" };
  const towerAt = at2(t.length / 2 + 120, inner - 60);
  const towerDraw = (sides) => (b) => {
    b.cylinder(towerAt, zp, 70, 4, sides, TOWER, tower);
    b.cylinder(towerAt, zp + 70, 6, 8, sides, CAB, tower, { topColor: TOWER });
    b.cylinder(towerAt, zp + 76, 0.8, 9, sides, TOWER, tower);
  };
  parts.push({
    at: towerAt,
    lods: [
      { error: 0, draw: towerDraw(16) },
      { error: 0, draw: towerDraw(16) },
      // An octagon in the circle: r(1 − cos π/8) inside it at most.
      { error: 9 * (1 - Math.cos(Math.PI / 8)), draw: towerDraw(8) },
    ],
  });
  for (let k = 0; k < 3; k++) {
    const a = -apronLength / 2 + 70 + k * 105;
    const v = -inner + 60;
    const feature = { name: `Hangar ${k + 1}`, kind: "hangar" };
    parts.push({
      at: at2(a, v),
      lods: [
        {
          error: 0,
          draw: (b) =>
            b.cuboid(spot(a, v, zp), f, [90, 70, 24], HANGAR, feature, {
              topColor: HANGAR_ROOF,
            }),
        },
      ],
    });
  }
  const park = { name: "Car park", kind: "car park" };
  parts.push({
    at: at2(t.length / 2 + 80, 0),
    lods: [
      {
        error: 0,
        draw: (b) =>
          b.cuboid(
            spot(t.length / 2 + 80, 0, zp),
            f,
            [120, 60, 15],
            HANGAR,
            park,
            { topColor: ASPHALT },
          ),
      },
    ],
  });

  const first = m.runways[0];
  const anchor = [site.origin[0], site.origin[1], z0];
  return {
    anchor,
    leafSize: 500,
    parts,
    grounds,
    landmark: {
      label: `Runway ${first.designations[0]} threshold, on the centreline`,
      design: spot(first.along - first.length / 2, first.across, zPaint),
    },
  };
}

/** A narrow-body airliner parked nose-in at a gate, along u (`facing` the pier). */
function aircraft(spot, at2, f, along, across, facing, z, name, rand) {
  const feature = { name, kind: "aircraft" };
  const livery = LIVERIES[Math.floor(rand() * LIVERIES.length)];
  const tail = TAIL[Math.floor(rand() * TAIL.length)];
  const length = between(rand, 36, 40);
  const nose = along - facing * 3;
  const aft = nose + facing * length;
  const point = (a, v, h) => spot(a, v, z + h);
  const fuselage = (b) =>
    b.beam(
      point(nose, across, 4),
      point(aft, across, 4),
      4,
      4,
      livery,
      feature,
    );
  const wings = (b) => {
    const wa = nose + facing * length * 0.45;
    b.beam(
      point(wa, across - 17, 3),
      point(wa, across + 17, 3),
      6,
      0.5,
      livery,
      feature,
    );
  };
  const fin = (b) =>
    b.cuboid(
      point(aft - facing * 3, across, 6),
      f,
      [4, 0.4, 6.5],
      tail,
      feature,
    );
  const details = (b) => {
    for (const side of [-1, 1]) {
      const ea = nose + facing * length * 0.4;
      b.beam(
        point(ea - facing * 1.5, across + side * 5.5, 2),
        point(ea + facing * 1.5, across + side * 5.5, 2),
        2,
        2,
        tail,
        feature,
      );
    }
    b.beam(
      point(aft - facing * 2, across - 6, 5.5),
      point(aft - facing * 2, across + 6, 5.5),
      3,
      0.3,
      livery,
      feature,
    );
  };
  return {
    at: at2(along + (facing * length) / 2, across),
    lods: [
      {
        error: 0,
        draw: (b) => {
          fuselage(b);
          wings(b);
          fin(b);
          details(b);
        },
      },
      {
        // The engines and the tailplane dropped (each about 2 m).
        error: 2,
        draw: (b) => {
          fuselage(b);
          wings(b);
          fin(b);
        },
      },
      // Dropped: its fin stands 12.5 m.
      { error: 12.5, draw: null },
    ],
  };
}
