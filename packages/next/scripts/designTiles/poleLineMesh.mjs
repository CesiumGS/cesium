// London's model on the scale ladder (plan 4b Task 17b): an overhead pole
// line about 30 km long on one flat design plane, across farmland. Wooden
// poles every `span` along a route of straight legs, each with a steel
// cross-arm and three pin insulators (two on the arm, one on the pole's
// top), the three conductors sagging between poles, stays at the angle and
// end poles, a pole-mounted transformer every 40th pole, and the line's
// wayleave strip as its ground.
//
// Design units are the CRS's (metres, OSGB36 / British National Grid). The
// route is relative to the site's origin.
import { srgb } from "./meshBuilder.mjs";

const WAYLEAVE = srgb("#7d9a52");
const POLE = srgb("#5b4636");
const STEEL = srgb("#8c8f90");
const INSULATOR = srgb("#7a6a5c");
const CONDUCTOR = srgb("#3a3a3a");
const TRANSFORMER = srgb("#5f6f5a");

/** Segments per conductor between poles: a sag of s errs s/36 at most. */
const SEGMENTS = 6;
/** The conductors' positions across the arm, metres from the pole. */
const PHASES = [-1, 0, 1];
const WIRE = 0.03;

/** @param {import("../../examples/design-globe/sites.ts").PortfolioSite} site */
export function poleLinePlan(site) {
  const m = site.model;
  const [e0, n0, z0] = site.origin;
  const route = m.route.map(([e, n]) => [e0 + e, n0 + n]);
  // The poles: every leg in whole spans, the angle points shared.
  const poles = [route[0]];
  // The route's corners' poles (its start, its angles and its end).
  const corners = [0];
  for (let k = 1; k < route.length; k++) {
    const [a, b] = [route[k - 1], route[k]];
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const spans = Math.max(1, Math.round(length / m.span));
    for (let s = 1; s <= spans; s++) {
      poles.push([
        a[0] + ((b[0] - a[0]) * s) / spans,
        a[1] + ((b[1] - a[1]) * s) / spans,
      ]);
    }
    corners.push(poles.length - 1);
  }
  const angles = new Set(corners);
  const direction = (i) => {
    const a = poles[Math.max(0, i - 1)];
    const b = poles[Math.min(poles.length - 1, i + 1)];
    const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
    return [(b[0] - a[0]) / d, (b[1] - a[1]) / d];
  };
  const armZ = z0 + m.poleHeight - 0.4;
  // The outer conductors' place: across from the pole, and below the middle one.
  const reach = m.armLength / 2 - 0.2;
  const middleZ = z0 + m.poleHeight + 0.25;
  const outerZ = armZ + 0.05 + 0.25;
  /** Where conductor `phase` is held on pole i: its insulator's top. */
  const attach = (i, phase) => {
    const [de, dn] = direction(i);
    const across = [-dn, de];
    const x = PHASES[phase] * reach;
    const z = PHASES[phase] === 0 ? middleZ : outerZ;
    return [poles[i][0] + across[0] * x, poles[i][1] + across[1] * x, z];
  };
  // The outer conductors from the middle one, sagging below its chord.
  const outerError = Math.hypot(reach, middleZ - outerZ + m.sag);

  const parts = [];
  poles.forEach((at, i) => {
    const pole = { name: `Pole ${i + 1}`, kind: "pole" };
    const span = { name: `Span ${i + 1}–${i + 2}`, kind: "conductor" };
    const last = i === poles.length - 1;
    const [de, dn] = direction(i);
    const turn = Math.atan2(dn, de);
    // A stay at each angle and end pole, on the outside of the angle (along
    // the line, outward, at an end).
    let stay;
    if (angles.has(i) || last) {
      const into =
        i > 0
          ? [poles[i][0] - poles[i - 1][0], poles[i][1] - poles[i - 1][1]]
          : [0, 0];
      const out = !last
        ? [poles[i + 1][0] - poles[i][0], poles[i + 1][1] - poles[i][1]]
        : [0, 0];
      const unit = (v) => {
        const d = Math.hypot(v[0], v[1]);
        return d > 0 ? [v[0] / d, v[1] / d] : [0, 0];
      };
      const [ui, uo] = [unit(into), unit(out)];
      let pull = [ui[0] - uo[0], ui[1] - uo[1]];
      if (Math.hypot(...pull) < 1e-3) {
        pull = ui;
      }
      const p = unit(pull);
      stay = [
        [at[0], at[1], z0 + m.poleHeight - 1],
        [at[0] + p[0] * 6, at[1] + p[1] * 6, z0],
      ];
    }
    const drawPole = (b, { arm, insulators }) => {
      b.box(at, z0, 0.32, 0.32, m.poleHeight, turn, POLE, pole, {
        topScale: 0.7,
      });
      if (arm) {
        b.beam(
          [
            at[0] + dn * (m.armLength / 2),
            at[1] - de * (m.armLength / 2),
            armZ,
          ],
          [
            at[0] - dn * (m.armLength / 2),
            at[1] + de * (m.armLength / 2),
            armZ,
          ],
          0.1,
          0.1,
          STEEL,
          pole,
        );
      }
      if (insulators) {
        for (let phase = 0; phase < 3; phase++) {
          const [x, y, z] = attach(i, phase);
          b.box([x, y], z - 0.25, 0.12, 0.12, 0.25, turn, INSULATOR, pole);
        }
      }
      if (stay) {
        b.wire(stay[0], stay[1], WIRE, STEEL, pole);
      }
      if ((i + 1) % 40 === 0) {
        b.box(
          [at[0] + dn * 0.5, at[1] - de * 0.5],
          z0 + 6,
          0.8,
          0.6,
          1.1,
          turn,
          TRANSFORMER,
          { name: `Pole ${i + 1} transformer`, kind: "transformer" },
        );
      }
    };
    const conductors = (b, phases, sagging) => {
      if (last) {
        return;
      }
      for (const phase of phases) {
        const p = attach(i, phase);
        const q = attach(i + 1, phase);
        const pieces = sagging ? SEGMENTS : 1;
        const point = (t) => [
          p[0] + (q[0] - p[0]) * t,
          p[1] + (q[1] - p[1]) * t,
          p[2] + (q[2] - p[2]) * t - (sagging ? 4 * m.sag * t * (1 - t) : 0),
        ];
        for (let k = 0; k < pieces; k++) {
          b.wire(
            point(k / pieces),
            point((k + 1) / pieces),
            WIRE,
            CONDUCTOR,
            span,
          );
        }
      }
    };
    parts.push({
      at,
      lods: [
        {
          error: 0,
          draw: (b) => {
            drawPole(b, { arm: true, insulators: true });
            conductors(b, [0, 1, 2], true);
          },
        },
        {
          // The conductors as chords (the sag, at most), the 0.25 m
          // insulators dropped.
          error: m.sag,
          draw: (b) => {
            drawPole(b, { arm: true, insulators: false });
            conductors(b, [0, 1, 2], false);
          },
        },
        {
          // One conductor, the middle one: the outer two are within
          // `outerError` of it.
          error: outerError,
          draw: (b) => {
            drawPole(b, { arm: true, insulators: false });
            conductors(b, [1], false);
          },
        },
        {
          // The cross-arm dropped too: it is within half its length of the pole.
          error: Math.max(outerError, m.armLength / 2),
          draw: (b) => {
            drawPole(b, { arm: false, insulators: false });
            conductors(b, [1], false);
          },
        },
        {
          // The pole dropped: every point of it is within half its height
          // of the ground or the conductor at its top; and its stay.
          error: Math.max(m.poleHeight / 2, 6),
          draw: (b) => conductors(b, [1], false),
        },
      ],
    });
  });

  // The wayleave: a strip along each leg, and a square at each angle.
  const grounds = [];
  const strip = { name: "Wayleave", kind: "ground" };
  for (let k = 1; k < route.length; k++) {
    const [a, b] = [route[k - 1], route[k]];
    grounds.push({
      at: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2],
      length: Math.hypot(b[0] - a[0], b[1] - a[1]),
      width: m.wayleave,
      angle: Math.atan2(b[1] - a[1], b[0] - a[0]),
      z: z0,
      color: WAYLEAVE,
      feature: strip,
      lods: [{ error: 0, keep: true }],
    });
  }
  for (const i of corners.slice(1, -1)) {
    const [de, dn] = direction(i);
    grounds.push({
      at: poles[i],
      length: m.wayleave,
      width: m.wayleave,
      angle: Math.atan2(dn, de),
      z: z0,
      color: WAYLEAVE,
      feature: strip,
      lods: [{ error: 0, keep: true }],
    });
  }

  const anchor = [e0, n0, z0];
  return {
    anchor,
    leafSize: 1_000,
    parts,
    grounds,
    poles: poles.length,
    landmark: {
      label: "Pole 1's top",
      design: [poles[0][0], poles[0][1], z0 + m.poleHeight],
    },
  };
}
