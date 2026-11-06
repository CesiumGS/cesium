// Alignments (plan 4a Task 5): Fresnel integrals, lines, arcs, clothoid
// spirals and a vertical profile, in design (site-grid) coordinates with the
// azimuth clockwise from grid north and the offset positive to the right.
import { describe, expect, it } from "vitest";
import {
  Alignment,
  type AlignmentDefinition,
  type HorizontalElement,
} from "../src/engineering/alignment.ts";
import { fresnel } from "../src/engineering/fresnel.ts";

/** Deterministic PRNG (mulberry32) so the random samples are reproducible. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * ∫₀ᴸ exp(i·φ(s)) ds by composite 20-point Gauss–Legendre on 64 panels, an
 * independent check of the Fresnel form of a spiral (φ quadratic in s).
 */
function quadrature(
  phi: (s: number) => number,
  length: number,
): [number, number] {
  // Nodes and weights of 10 symmetric pairs (20-point rule) on [-1, 1].
  const x = [
    0.0765265211334973, 0.2277858511416451, 0.3737060887154195,
    0.5108670019508271, 0.636053680726515, 0.7463319064601508,
    0.8391169718222188, 0.9122344282513259, 0.9639719272779138,
    0.9931285991850949,
  ];
  const w = [
    0.1527533871307258, 0.1491729864726037, 0.142096109318382,
    0.1316886384491766, 0.1181945319615184, 0.1019301198172404,
    0.0832767415767048, 0.0626720483341091, 0.0406014298003869,
    0.0176140071391521,
  ];
  const panels = 64;
  const h = length / panels;
  let re = 0;
  let im = 0;
  for (let p = 0; p < panels; p++) {
    const mid = (p + 0.5) * h;
    for (let k = 0; k < x.length; k++) {
      for (const sign of [-1, 1]) {
        const angle = phi(mid + (sign * x[k]! * h) / 2);
        re += (w[k]! * h * Math.cos(angle)) / 2;
        im += (w[k]! * h * Math.sin(angle)) / 2;
      }
    }
  }
  return [re, im];
}

const START: [number, number] = [1000, 2000];
const AZ0 = 0.3;

describe("fresnel", () => {
  const reference: [number, number, number][] = [
    [0.5, 0.4923442258714464, 0.06473243285999929],
    [1, 0.7798934003768228, 0.4382591473903548],
    [3, 0.6057207892976856, 0.496312998967375],
    [10, 0.4998986942055157, 0.4681699785848822],
  ];

  it("matches the reference values within 1e-13", () => {
    for (const [t, c, s] of reference) {
      const [C, S] = fresnel(t);
      expect(Math.abs(C - c)).toBeLessThan(1e-13);
      expect(Math.abs(S - s)).toBeLessThan(1e-13);
    }
  });

  it("is odd in t", () => {
    for (const t of [1e-9, 0.3, 1.2, 1.5, 1.7, 3, 10, 123.4]) {
      const [C, S] = fresnel(t);
      const [Cn, Sn] = fresnel(-t);
      expect(Cn).toBe(-C);
      expect(Sn).toBe(-S);
    }
  });

  it("is continuous across the series / continued-fraction switch", () => {
    // Remove the step's linear part: C' = cos(πt²/2), S' = sin(πt²/2).
    const h = 1e-12;
    const [C0, S0] = fresnel(1.5 - h);
    const [C1, S1] = fresnel(1.5 + h);
    const phase = (Math.PI / 2) * 1.5 * 1.5;
    expect(Math.abs(C1 - C0 - 2 * h * Math.cos(phase))).toBeLessThan(1e-14);
    expect(Math.abs(S1 - S0 - 2 * h * Math.sin(phase))).toBeLessThan(1e-14);
  });
});

describe("a line, an arc of radius 1,000 and length 500, then a line", () => {
  const definition: AlignmentDefinition = {
    name: "arc",
    start: START,
    startAzimuth: AZ0,
    startStation: 1000,
    horizontal: [
      { kind: "line", length: 100 },
      { kind: "arc", length: 500, radius: 1000 },
      { kind: "line", length: 150 },
    ],
  };
  const alignment = new Alignment(definition);
  // The analytic circle: a positive radius curves left, so the centre is to
  // the left (azimuth − π/2) of the arc's start and the azimuth decreases.
  const A = [START[0] + 100 * Math.sin(AZ0), START[1] + 100 * Math.cos(AZ0)];
  const center = [A[0]! - 1000 * Math.cos(AZ0), A[1]! + 1000 * Math.sin(AZ0)];
  const circle = (azimuth: number, radius: number) => [
    center[0]! + radius * Math.cos(azimuth),
    center[1]! - radius * Math.sin(azimuth),
  ];

  it("has the length and end station of its elements", () => {
    expect(alignment.length).toBe(750);
    expect(alignment.endStation).toBe(1750);
  });

  it("puts the arc's midpoint on the analytic circle within 1e-9", () => {
    const p = alignment.pointAt(1350);
    expect(p.length).toBe(2);
    const q = circle(AZ0 - 0.25, 1000);
    expect(Math.abs(p[0]! - q[0]!)).toBeLessThan(1e-9);
    expect(Math.abs(p[1]! - q[1]!)).toBeLessThan(1e-9);
    expect(alignment.azimuthAt(1350)).toBeCloseTo(AZ0 - 0.25, 14);
    // +12 is to the right: outside a left curve, so on the circle of R + 12.
    const right = alignment.pointAt(1350, 12);
    const r = circle(AZ0 - 0.25, 1012);
    expect(Math.abs(right[0]! - r[0]!)).toBeLessThan(1e-9);
    expect(Math.abs(right[1]! - r[1]!)).toBeLessThan(1e-9);
  });

  it("recovers station and offset at offsets −12 and +12 within 1e-9", () => {
    for (const s of [1000, 1050, 1100, 1225, 1350, 1599.5, 1600, 1700, 1750]) {
      for (const o of [-12, 12]) {
        const result = alignment.stationOffset(alignment.pointAt(s, o));
        expect(Math.abs(result.station - s)).toBeLessThan(1e-9);
        expect(Math.abs(result.offset - o)).toBeLessThan(1e-9);
        expect(result.elevation).toBeUndefined();
      }
    }
  });

  it("turns right for a negative radius", () => {
    const right = new Alignment({
      ...definition,
      horizontal: [{ kind: "arc", length: 500, radius: -1000 }],
    });
    expect(right.azimuthAt(1500)).toBeCloseTo(AZ0 + 0.5, 14);
    // The centre is to the right; the start is 1000 from it.
    const c = [
      START[0] + 1000 * Math.cos(AZ0),
      START[1] - 1000 * Math.sin(AZ0),
    ];
    const p = right.pointAt(1250);
    expect(Math.hypot(p[0]! - c[0]!, p[1]! - c[1]!)).toBeCloseTo(1000, 10);
  });
});

/** Line, spiral ∞ → R, arc R, spiral R → ∞, line; `sign` −1 mirrors it. */
function spiralDefinition(sign: 1 | -1): AlignmentDefinition {
  return {
    name: "spiral",
    start: START,
    startAzimuth: AZ0,
    startStation: 2000,
    horizontal: [
      { kind: "line", length: 120 },
      {
        kind: "spiral",
        length: 200,
        startRadius: Infinity,
        endRadius: sign * 800,
      },
      { kind: "arc", length: 300, radius: sign * 800 },
      {
        kind: "spiral",
        length: 200,
        startRadius: sign * 800,
        endRadius: -Infinity,
      },
      { kind: "line", length: 180 },
    ],
  };
}

describe("a line, a spiral ∞ → 800, an arc of 800, a spiral 800 → ∞, a line", () => {
  const joins = [2120, 2320, 2620, 2820];
  const curvature = [0, 1 / 800, 1 / 800, 0];

  for (const sign of [1, -1] as const) {
    const alignment = new Alignment(spiralDefinition(sign));
    const label = sign === 1 ? "left" : "right";

    it(`(${label}) turns by L/2R + L/R + L/2R in azimuth`, () => {
      const total = 200 / 1600 + 300 / 800 + 200 / 1600;
      expect(alignment.azimuthAt(3000)).toBeCloseTo(AZ0 - sign * total, 14);
      expect(alignment.azimuthAt(2120 + 200)).toBeCloseTo(
        AZ0 - (sign * 200) / 1600,
        14,
      );
    });

    it(`(${label}) has a continuous azimuth at each join within 1e-12`, () => {
      const h = 1e-6;
      joins.forEach((j, i) => {
        // Remove the linear part (dα/ds = −κ) of each one-sided step.
        const slope = -sign * curvature[i]!;
        const left = alignment.azimuthAt(j - h) + slope * h;
        const right = alignment.azimuthAt(j + h) - slope * h;
        expect(Math.abs(left - right)).toBeLessThan(1e-12);
        expect(Math.abs(alignment.azimuthAt(j) - left)).toBeLessThan(1e-12);
      });
    });

    it(`(${label}) has a continuous position at each join within 1e-9`, () => {
      const h = 1e-10;
      for (const j of joins) {
        const a = alignment.pointAt(j - h);
        const b = alignment.pointAt(j + h);
        const c = alignment.pointAt(j);
        expect(Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!)).toBeLessThan(1e-9);
        expect(Math.hypot(a[0]! - c[0]!, a[1]! - c[1]!)).toBeLessThan(1e-9);
      }
    });

    it(`(${label}) puts the spirals where an independent quadrature does`, () => {
      // Entry spiral end: φ(s) = κ1 s²/(2L) to the left of the start heading.
      const k1 = sign / 800;
      const [x, y] = quadrature((s) => (k1 * s * s) / 400, 200);
      const base = alignment.pointAt(2120);
      const p = alignment.pointAt(2320);
      // Local x along the azimuth AZ0, local y to the left of it.
      const tx = Math.sin(AZ0);
      const ty = Math.cos(AZ0);
      const q = [base[0]! + x * tx - y * ty, base[1]! + x * ty + y * tx];
      expect(Math.abs(p[0]! - q[0]!)).toBeLessThan(1e-9);
      expect(Math.abs(p[1]! - q[1]!)).toBeLessThan(1e-9);
    });

    it(`(${label}) recovers 200 seeded random (s, o) within 1e-9, joins included`, () => {
      const random = mulberry32(sign === 1 ? 0x5eed : 0xfeed);
      const samples: [number, number][] = [];
      for (const j of [2000, ...joins, 3000]) {
        samples.push([j, -25], [j, 0], [j, 31]);
      }
      while (samples.length < 200) {
        samples.push([2000 + random() * 1000, (random() * 2 - 1) * 40]);
      }
      let worst = 0;
      for (const [s, o] of samples) {
        const result = alignment.stationOffset(alignment.pointAt(s, o));
        worst = Math.max(
          worst,
          Math.abs(result.station - s),
          Math.abs(result.offset - o),
        );
      }
      expect(worst).toBeLessThan(1e-9);
    });

    it(`(${label}) resolves a point exactly at a join from both sides`, () => {
      for (const j of joins) {
        for (const o of [-20, 20]) {
          const p = alignment.pointAt(j, o);
          const result = alignment.stationOffset(p);
          expect(Math.abs(result.station - j)).toBeLessThan(1e-9);
          expect(Math.abs(result.offset - o)).toBeLessThan(1e-9);
          // Nudged across the join either way, station and offset move by the nudge.
          for (const d of [-1e-7, 1e-7]) {
            const r = alignment.stationOffset(alignment.pointAt(j + d, o));
            expect(Math.abs(r.station - (j + d))).toBeLessThan(1e-9);
            expect(Math.abs(r.offset - o)).toBeLessThan(1e-9);
          }
        }
      }
    });
  }

  it("puts a partial spiral (800 → 400) where an independent quadrature does", () => {
    const k0 = 1 / 800;
    const k1 = 1 / 400;
    const alignment = new Alignment({
      name: "partial",
      start: [0, 0],
      startAzimuth: Math.PI / 2, // due grid east: local x = E, local y = N
      startStation: 0,
      horizontal: [
        { kind: "spiral", length: 150, startRadius: 800, endRadius: 400 },
      ],
    });
    for (const s of [37.5, 75, 150]) {
      const [x, y] = quadrature((u) => k0 * u + ((k1 - k0) * u * u) / 300, s);
      const p = alignment.pointAt(s);
      expect(Math.abs(p[0]! - x)).toBeLessThan(1e-9);
      expect(Math.abs(p[1]! - y)).toBeLessThan(1e-9);
      const r = alignment.stationOffset(alignment.pointAt(s, -7));
      expect(Math.abs(r.station - s)).toBeLessThan(1e-9);
      expect(Math.abs(r.offset + 7)).toBeLessThan(1e-9);
    }
  });
});

describe("the vertical profile", () => {
  // Grade +2% for 100, a sag-to-crest parabola +2% → −3% over 200, then −3%.
  const g1 = 0.02;
  const g2 = -0.03;
  const definition: AlignmentDefinition = {
    name: "profile",
    start: START,
    startAzimuth: AZ0,
    startStation: 1000,
    horizontal: [{ kind: "line", length: 500 }],
    vertical: {
      startStation: 1050,
      startElevation: 100,
      segments: [
        { kind: "grade", length: 100, grade: g1 },
        { kind: "parabola", length: 200, startGrade: g1, endGrade: g2 },
        { kind: "grade", length: 100, grade: g2 },
      ],
    },
  };
  const alignment = new Alignment(definition);

  it("puts the parabola's midpoint at E0 + g1·L/2 + (g2 − g1)·L/8", () => {
    const E0 = 100 + 100 * g1;
    expect(alignment.elevationAt(1150)).toBeCloseTo(E0, 12);
    const expected = E0 + (g1 * 200) / 2 + ((g2 - g1) * 200) / 8;
    expect(Math.abs(alignment.elevationAt(1250) - expected)).toBeLessThan(
      1e-12,
    );
  });

  it("has a continuous grade at the joins", () => {
    // One-sided three-point derivatives are exact for quadratics.
    const z = (s: number) => alignment.elevationAt(s);
    const h = 1;
    const grades = [g1, g2];
    [1150, 1350].forEach((j, i) => {
      const left = (3 * z(j) - 4 * z(j - h) + z(j - 2 * h)) / (2 * h);
      const right = (-3 * z(j) + 4 * z(j + h) - z(j + 2 * h)) / (2 * h);
      expect(Math.abs(left - grades[i]!)).toBeLessThan(1e-12);
      expect(Math.abs(right - grades[i]!)).toBeLessThan(1e-12);
    });
  });

  it("adds the elevation to pointAt and stationOffset", () => {
    const p = alignment.pointAt(1250, 5);
    expect(p.length).toBe(3);
    expect(p[2]).toBe(alignment.elevationAt(1250));
    const r = alignment.stationOffset(p);
    expect(r.elevation).toBeCloseTo(alignment.elevationAt(1250), 12);
  });

  it("throws outside the profile, never extrapolating", () => {
    expect(() => alignment.elevationAt(1049)).toThrow(/outside the profile/);
    expect(() => alignment.elevationAt(1451)).toThrow(/outside the profile/);
    expect(alignment.elevationAt(1050)).toBe(100);
    expect(() =>
      new Alignment({ ...definition, vertical: undefined }).elevationAt(1100),
    ).toThrow(/no vertical profile/);
  });
});

describe("ends and the centerline", () => {
  const alignment = new Alignment(spiralDefinition(1));
  const t0 = [Math.sin(AZ0), Math.cos(AZ0)];

  it("throws for a point before the start or after the end", () => {
    const before = [
      START[0] - 5 * t0[0]! + 3 * t0[1]!,
      START[1] - 5 * t0[1]! - 3 * t0[0]!,
    ];
    expect(() => alignment.stationOffset(before)).toThrow(
      /outside the alignment/,
    );
    const end = alignment.pointAt(3000);
    const az = alignment.azimuthAt(3000);
    const after = [
      end[0]! + 0.001 * Math.sin(az),
      end[1]! + 0.001 * Math.cos(az),
    ];
    expect(() => alignment.stationOffset(after)).toThrow(
      /outside the alignment/,
    );
    // The ends themselves resolve.
    expect(alignment.stationOffset(START).station).toBe(2000);
    expect(Math.abs(alignment.stationOffset(end).station - 3000)).toBeLessThan(
      1e-9,
    );
  });

  it("throws past the end even when a farther element has a perpendicular foot", () => {
    // A hairpin: east 100, a U-turn left of radius 100, west 50.
    const hairpin = new Alignment({
      name: "hairpin",
      start: [0, 0],
      startAzimuth: Math.PI / 2,
      startStation: 0,
      horizontal: [
        { kind: "line", length: 100 },
        { kind: "arc", length: 100 * Math.PI, radius: 100 },
        { kind: "line", length: 50 },
      ],
    });
    // Beyond the end (50, 200), heading west; the first line's foot is (40, 0).
    expect(() => hairpin.stationOffset([40, 195])).toThrow(
      /outside the alignment/,
    );
    // Equidistant from the two lines (the hairpin's axis), the lower station wins.
    const r = hairpin.stationOffset([75, 100]);
    expect(Math.abs(r.station - 75)).toBeLessThan(1e-9);
    expect(Math.abs(r.offset + 100)).toBeLessThan(1e-9);
  });

  it("throws for stations outside the alignment", () => {
    expect(() => alignment.pointAt(1999.999)).toThrow(/outside the alignment/);
    expect(() => alignment.pointAt(3000.001)).toThrow(/outside the alignment/);
    expect(() => alignment.azimuthAt(3001)).toThrow(/outside the alignment/);
  });

  it("gives offset 0 within 1e-12 for a point on the centerline", () => {
    for (const s of [
      2000, 2060, 2120, 2200, 2320, 2470, 2620, 2700, 2820, 2900, 3000,
    ]) {
      const r = alignment.stationOffset(alignment.pointAt(s));
      expect(Math.abs(r.offset)).toBeLessThan(1e-12);
      expect(Math.abs(r.station - s)).toBeLessThan(1e-9);
    }
  });

  it("resolves the ends and joins at state-plane magnitudes (E ≈ 6,000,000)", () => {
    // ulp(6e6) ≈ 9.3e-10: the design point itself carries that rounding, so
    // the end and join windows must allow for it (a point at the end station
    // may round to just past the end).
    for (const sign of [1, -1] as const) {
      const far = new Alignment({
        ...spiralDefinition(sign),
        start: [6_000_000, 2_000_000],
      });
      for (const j of [2000, 2120, 2320, 2620, 2820, 3000]) {
        for (const o of [-40, -12, 0, 12, 40]) {
          const r = far.stationOffset(far.pointAt(j, o));
          expect(Math.abs(r.station - j)).toBeLessThan(1e-9);
          expect(Math.abs(r.offset - o)).toBeLessThan(1e-9);
        }
      }
    }
  });

  it("rejects malformed elements", () => {
    const bad = (horizontal: HorizontalElement[]) => () =>
      new Alignment({ ...spiralDefinition(1), horizontal });
    expect(bad([])).toThrow(/at least one/);
    expect(bad([{ kind: "line", length: 0 }])).toThrow(/length/);
    expect(bad([{ kind: "arc", length: 10, radius: 0 }])).toThrow(/radius/);
    expect(bad([{ kind: "arc", length: 10, radius: Infinity }])).toThrow(
      /radius/,
    );
    expect(
      bad([{ kind: "spiral", length: 10, startRadius: 0, endRadius: 5 }]),
    ).toThrow(/radius/);
  });
});
