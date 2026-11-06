import { describe, expect, it } from "vitest";
import { frameTransform } from "../src/frames/Frame.ts";
import { createFrames } from "../src/frames/frames.ts";
import { convertPoint, framePoint } from "../src/frames/local.ts";
import { Instant } from "../src/time/Instant.ts";
import { LeapSeconds } from "../src/time/leapSeconds.ts";
import { Trajectory } from "../src/trajectory/Trajectory.ts";
import { parseOem } from "../src/trajectory/oem.ts";
import { writeSpk } from "./spkWriter.ts";
import { syntheticFrameData } from "./syntheticFrames.ts";

const leap = LeapSeconds.builtIn();
const frames = createFrames(syntheticFrameData());
const at = (tdb: number): Instant => Instant.fromTdb(tdb);

// x(t) = a + b t + c t^2 + d t^3 per axis (km, t in seconds).
const CUBIC: readonly (readonly number[])[] = [
  [1000, 2.5, -0.01, 3e-6],
  [-500, 0.75, 0.002, -1e-6],
  [20, -1.25, 0.0005, 2e-6],
];
const position = (axis: number, t: number): number => {
  const [a, b, c, d] = CUBIC[axis]!;
  return a! + b! * t + c! * t * t + d! * t * t * t;
};
const velocity = (axis: number, t: number): number => {
  const [, b, c, d] = CUBIC[axis]!;
  return b! + 2 * c! * t + 3 * d! * t * t;
};
const cubicStates = (epochs: Float64Array): Float64Array => {
  const states = new Float64Array(epochs.length * 6);
  epochs.forEach((t, i) => {
    for (let axis = 0; axis < 3; axis++) {
      states[i * 6 + axis] = position(axis, t);
      states[i * 6 + 3 + axis] = velocity(axis, t);
    }
  });
  return states;
};
const constantStates = (n: number, x: number): Float64Array => {
  const states = new Float64Array(n * 6);
  for (let i = 0; i < n; i++) {
    states[i * 6] = x;
  }
  return states;
};
const range = (from: number, to: number, step: number): Float64Array =>
  Float64Array.from(
    { length: Math.round((to - from) / step) + 1 },
    (_, i) => from + i * step,
  );

const J2000_UTC_MS = Date.UTC(2000, 0, 1, 12, 0, 0);
const isoTdb = (s: number): string =>
  new Date(J2000_UTC_MS + s * 1000).toISOString();

interface OemOptions {
  object?: string;
  objectId?: string;
  center?: string;
  frame?: string;
  scale?: string;
  interpolation?: string;
  epochs: string[];
  states: number[][];
  /** Covariance blocks appended after the data: [epoch, c11, c22, c33]. */
  covariances?: [string, number, number, number][];
}

/** A CCSDS covariance block whose diagonal starts c11, c22, c33, 1, 1, 1. */
function covarianceBlock(blocks: [string, number, number, number][]): string {
  const rows = (a: number, b: number, c: number): string[] => [
    `${a}`,
    `0 ${b}`,
    `0 0 ${c}`,
    "0 0 0 1",
    "0 0 0 0 1",
    "0 0 0 0 0 1",
  ];
  return [
    "COVARIANCE_START",
    ...blocks.flatMap(([e, a, b, c]) => [`EPOCH = ${e}`, ...rows(a, b, c)]),
    "COVARIANCE_STOP",
  ].join("\n");
}

function oemBlock(o: OemOptions): string {
  const lines = [
    "META_START",
    `OBJECT_NAME = ${o.object ?? "ORION"}`,
    `OBJECT_ID = ${o.objectId ?? "2026-001A"}`,
    `CENTER_NAME = ${o.center ?? "EARTH"}`,
    `REF_FRAME = ${o.frame ?? "EME2000"}`,
    `TIME_SYSTEM = ${o.scale ?? "TDB"}`,
    `START_TIME = ${o.epochs[0]}`,
    `STOP_TIME = ${o.epochs[o.epochs.length - 1]}`,
  ];
  if (o.interpolation) {
    lines.push(...o.interpolation.split(";"));
  }
  lines.push("META_STOP");
  o.epochs.forEach((e, i) => lines.push(`${e} ${o.states[i]!.join(" ")}`));
  if (o.covariances) {
    lines.push("", covarianceBlock(o.covariances));
  }
  return lines.join("\n");
}
const oemText = (...blocks: OemOptions[]): string =>
  `CCSDS_OEM_VERS = 2.0\nCREATION_DATE = 2026-04-01T00:00:00\nORIGINATOR = TEST\n\n${blocks.map(oemBlock).join("\n\n")}\n`;

const HERMITE7 = "INTERPOLATION = HERMITE;INTERPOLATION_DEGREE = 7";
const OPTIONS = { name: "Orion", accuracy: "precise" } as const;

function cubicOem(): ReturnType<typeof parseOem> {
  const epochs = range(0, 600, 60);
  const states = cubicStates(epochs);
  return parseOem(
    oemText({
      interpolation: HERMITE7,
      epochs: Array.from(epochs, isoTdb),
      states: Array.from(epochs, (_, i) =>
        Array.from(states.subarray(i * 6, i * 6 + 6)),
      ),
    }),
    leap,
  );
}

function cubicSpk(frame = 1, center = 399, target = 1000): ArrayBuffer {
  const epochs = range(0, 600, 60);
  return writeSpk({
    kind: "SPK",
    segments: [
      {
        target,
        center,
        frame,
        type: 13,
        epochs,
        states: cubicStates(epochs),
        degree: 3,
      },
    ],
  });
}

function constantSpk(from: number, to: number, step: number, km: number) {
  const epochs = range(from, to, step);
  return writeSpk({
    kind: "SPK",
    segments: [
      {
        target: 1000,
        center: 399,
        frame: 1,
        type: 13,
        epochs,
        states: constantStates(epochs.length, km),
        degree: 1,
      },
    ],
  });
}

describe("Trajectory", () => {
  it("reproduces a cubic exactly through fromOem (Hermite degree 7)", () => {
    const traj = Trajectory.fromOem(cubicOem(), frames, OPTIONS);
    for (const t of [0, 30, 123.456, 299.5, 411, 600]) {
      const s = traj.state(at(t));
      for (let axis = 0; axis < 3; axis++) {
        expect(Math.abs(s[axis]! - 1000 * position(axis, t))).toBeLessThan(
          1e-6,
        );
        expect(Math.abs(s[3 + axis]! - 1000 * velocity(axis, t))).toBeLessThan(
          1e-6,
        );
      }
    }
  });

  it("reproduces the same cubic through fromSpk (type 13)", () => {
    const traj = Trajectory.fromSpk([cubicSpk()], 1000, frames, {
      ...OPTIONS,
      j2000: "eme2000",
    });
    const viaOem = Trajectory.fromOem(cubicOem(), frames, OPTIONS);
    for (const t of [0, 77.7, 250, 599]) {
      const s = traj.state(at(t));
      const o = viaOem.state(at(t));
      for (let axis = 0; axis < 3; axis++) {
        expect(Math.abs(s[axis]! - 1000 * position(axis, t))).toBeLessThan(
          1e-6,
        );
        expect(Math.abs(s[axis]! - o[axis]!)).toBeLessThan(1e-6);
      }
    }
    expect(traj.spans).toEqual([[0, 600]]);
  });

  it("writes into `out` when given", () => {
    const traj = Trajectory.fromOem(cubicOem(), frames, OPTIONS);
    const out = new Float64Array(6);
    expect(traj.state(at(60), out)).toBe(out);
    expect(out[0]).toBeCloseTo(1000 * position(0, 60), 6);
  });

  it("throws in a gap, naming the covered spans, and never extrapolates", () => {
    const utc = (h: number, m: number, s: number, ms: number): number =>
      Date.UTC(2026, 3, 2, h, m, s, ms);
    const iso = (ms: number): string => new Date(ms).toISOString();
    const firstEnd = utc(22, 49, 21, 397);
    const secondStart = utc(22, 49, 59, 741);
    const block = (epochMs: number[], x: number): OemOptions => ({
      scale: "UTC",
      interpolation: HERMITE7,
      epochs: epochMs.map(iso),
      states: epochMs.map(() => [x, 0, 0, 0, 0, 0]),
    });
    const traj = Trajectory.fromOem(
      parseOem(
        oemText(
          block(
            [0, 1, 2, 3, 4].map((k) => firstEnd - (4 - k) * 10_000),
            1,
          ),
          block(
            [0, 1, 2, 3, 4].map((k) => secondStart + k * 10_000),
            2,
          ),
        ),
        leap,
      ),
      frames,
      OPTIONS,
    );
    expect(traj.spans).toHaveLength(2);
    const inGap = Instant.fromUtc(utc(22, 49, 40, 0), leap);
    expect(traj.contains(inGap)).toBe(false);
    expect(() => traj.state(inGap)).toThrow(/2026-04-02T22:49:21/);
    expect(() => traj.state(inGap)).toThrow(/2026-04-02T22:49:59/);
    expect(traj.contains(Instant.fromUtc(utc(22, 49, 10, 0), leap))).toBe(true);
    expect(traj.contains(Instant.fromUtc(utc(22, 50, 10, 0), leap))).toBe(true);
    expect(traj.contains(Instant.fromUtc(utc(23, 50, 0, 0), leap))).toBe(false);
    expect(() => traj.state(Instant.fromUtc(utc(21, 0, 0, 0), leap))).toThrow(
      /2026-04-02T22:/,
    );
  });

  it("merges overlapping and touching spans", () => {
    const traj = Trajectory.fromSpk(
      [constantSpk(0, 100, 20, 1), constantSpk(100, 200, 20, 2)],
      1000,
      frames,
      { ...OPTIONS, j2000: "icrf" },
    );
    expect(traj.spans).toEqual([[0, 200]]);
  });

  describe("precedence (R4)", () => {
    const files = [
      constantSpk(0, 100, 20, 1),
      constantSpk(100, 200, 20, 2),
      constantSpk(90, 110, 5, 3),
    ];
    const traj = Trajectory.fromSpk(files, 1000, frames, {
      ...OPTIONS,
      j2000: "icrf",
    });

    it("lets a later file win where files overlap", () => {
      expect(traj.state(at(100))[0]).toBeCloseTo(3000, 9);
      expect(traj.state(at(95))[0]).toBeCloseTo(3000, 9);
    });

    it("uses the earlier file elsewhere", () => {
      expect(traj.state(at(50))[0]).toBeCloseTo(1000, 9);
      expect(traj.state(at(150))[0]).toBeCloseTo(2000, 9);
    });

    it("lets a later segment of the same file win", () => {
      const e1 = range(0, 100, 20);
      const e2 = range(50, 150, 20);
      const file = writeSpk({
        kind: "SPK",
        segments: [e1, e2].map((epochs, i) => ({
          target: 1000,
          center: 399,
          frame: 1,
          type: 13 as const,
          epochs,
          states: constantStates(epochs.length, i + 1),
          degree: 1,
        })),
      });
      const t = Trajectory.fromSpk([file], 1000, frames, {
        ...OPTIONS,
        j2000: "icrf",
      });
      expect(t.state(at(70))[0]).toBeCloseTo(2000, 9);
      expect(t.state(at(30))[0]).toBeCloseTo(1000, 9);
    });
  });

  it("requires an interpolation when the OEM has none (R5)", () => {
    const epochs = range(0, 240, 60);
    const text = oemText({
      epochs: Array.from(epochs, isoTdb),
      states: Array.from(epochs, () => [1, 2, 3, 0, 0, 0]),
    });
    expect(() =>
      Trajectory.fromOem(parseOem(text, leap), frames, OPTIONS),
    ).toThrow(/interpolation/);
    const traj = Trajectory.fromOem(parseOem(text, leap), frames, {
      ...OPTIONS,
      interpolation: { method: "hermite", degree: 7 },
    });
    expect(traj.state(at(100))[0]).toBeCloseTo(1000, 9);
  });

  it("prefers the header's interpolation over the option", () => {
    const traj = Trajectory.fromOem(cubicOem(), frames, {
      ...OPTIONS,
      interpolation: { method: "lagrange", degree: 1 },
    });
    // Linear would miss a cubic by far more than this.
    const s = traj.state(at(123.456));
    expect(Math.abs(s[0]! - 1000 * position(0, 123.456))).toBeLessThan(1e-6);
  });

  it("rejects an even Hermite degree and a window larger than the data", () => {
    const epochs = range(0, 240, 60);
    const text = oemText({
      epochs: Array.from(epochs, isoTdb),
      states: Array.from(epochs, () => [1, 2, 3, 0, 0, 0]),
    });
    const oem = parseOem(text, leap);
    expect(() =>
      Trajectory.fromOem(oem, frames, {
        ...OPTIONS,
        interpolation: { method: "hermite", degree: 6 },
      }),
    ).toThrow(/degree/);
    expect(() =>
      Trajectory.fromOem(oem, frames, {
        ...OPTIONS,
        interpolation: { method: "lagrange", degree: 9 },
      }),
    ).toThrow(/states/);
  });

  describe("the J2000 label (R1)", () => {
    const file = writeSpk({
      kind: "SPK",
      segments: [
        {
          target: 1000,
          center: 399,
          frame: 1,
          type: 13,
          epochs: range(0, 240, 60),
          states: constantStates(5, 4e5),
          degree: 1,
        },
      ],
    });
    const asEme = Trajectory.fromSpk([file], 1000, frames, {
      ...OPTIONS,
      j2000: "eme2000",
    });
    const asIcrf = Trajectory.fromSpk([file], 1000, frames, {
      ...OPTIONS,
      j2000: "icrf",
    });

    it("picks the reference frame from the declared axes", () => {
      expect(asEme.reference).toBe(frames.eme2000);
      expect(asIcrf.reference).toBe(frames.earthIcrf);
    });

    it("differs in EARTH_ICRF by the frame bias of the position", () => {
      const t = at(100);
      const a = convertPoint(
        framePoint(asEme.reference, asEme.state(t), t),
        frames.earthIcrf,
      ).position;
      const b = asIcrf.state(t);
      const m = frameTransform(frames.eme2000, frames.earthIcrf, t);
      const p = asEme.state(t);
      const expected = [
        m[0]! * p[0]! + m[4]! * p[1]! + m[8]! * p[2]!,
        m[1]! * p[0]! + m[5]! * p[1]! + m[9]! * p[2]!,
        m[2]! * p[0]! + m[6]! * p[1]! + m[10]! * p[2]!,
      ];
      const diff = Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!, a[2]! - b[2]!);
      // About 45 m at 400,000 km.
      expect(diff).toBeGreaterThan(10);
      expect(diff).toBeLessThan(100);
      for (let i = 0; i < 3; i++) {
        expect(a[i]).toBeCloseTo(expected[i]!, 6);
      }
    });

    it("reads an ITRF SPK (frame 13000) as itrf", () => {
      const itrfFile = cubicSpk(13000);
      const traj = Trajectory.fromSpk([itrfFile], 1000, frames, {
        ...OPTIONS,
        j2000: "icrf",
      });
      expect(traj.reference).toBe(frames.itrf);
    });
  });

  it("maps centers and axes to the built-in frames", () => {
    const cases: [number, string, "icrf" | "eme2000", unknown][] = [
      [301, "moonIcrf", "icrf", frames.moonIcrf],
      [10, "hcrs", "icrf", frames.hcrs],
      [0, "icrf", "icrf", frames.icrf],
    ];
    for (const [center, , j2000, expected] of cases) {
      const t = Trajectory.fromSpk([cubicSpk(1, center)], 1000, frames, {
        ...OPTIONS,
        j2000,
      });
      expect(t.reference).toBe(expected);
    }
    expect(() =>
      Trajectory.fromSpk([cubicSpk(1, 301)], 1000, frames, {
        ...OPTIONS,
        j2000: "eme2000",
      }),
    ).toThrow(/not supported yet/);
    const oemFor = (
      center: string,
      frame: string,
    ): ReturnType<typeof parseOem> => {
      const epochs = range(0, 240, 60);
      return parseOem(
        oemText({
          center,
          frame,
          interpolation: HERMITE7,
          epochs: Array.from(epochs, isoTdb),
          states: Array.from(epochs, () => [1, 2, 3, 0, 0, 0]),
        }),
        leap,
      );
    };
    const ref = (c: string, f: string): unknown =>
      Trajectory.fromOem(oemFor(c, f), frames, OPTIONS).reference;
    expect(ref("EARTH", "EME2000")).toBe(frames.eme2000);
    expect(ref("EARTH", "ICRF")).toBe(frames.earthIcrf);
    expect(ref("EARTH", "GCRF")).toBe(frames.earthIcrf);
    expect(ref("EARTH", "ITRF93")).toBe(frames.itrf);
    expect(ref("MOON", "ICRF")).toBe(frames.moonIcrf);
    expect(ref("SUN", "ICRF")).toBe(frames.hcrs);
    expect(ref("SOLAR SYSTEM BARYCENTER", "ICRF")).toBe(frames.icrf);
    expect(() => ref("MOON", "EME2000")).toThrow(/not supported yet/);
  });

  it("makes `frame` a member of the frame tree at the object's position", () => {
    const traj = Trajectory.fromOem(cubicOem(), frames, OPTIONS);
    expect(traj.frame.parent).toBe(traj.reference);
    expect(traj.frame.name).toBe("Orion");
    const t = at(123.456);
    const viaTree = convertPoint(
      framePoint(traj.frame, [0, 0, 0], t),
      frames.earthIcrf,
    ).position;
    const s = traj.state(t);
    const m = frameTransform(frames.eme2000, frames.earthIcrf, t);
    for (let i = 0; i < 3; i++) {
      const expected =
        m[i]! * s[0]! + m[4 + i]! * s[1]! + m[8 + i]! * s[2]! + m[12 + i]!;
      expect(Math.abs(viaTree[i]! - expected)).toBeLessThan(1e-6);
    }
    // The frame keeps the reference's axes: a point 1 m along x is 1 m along x.
    const x = convertPoint(
      framePoint(traj.frame, [1, 0, 0], t),
      traj.reference,
    );
    expect(x.position[0]).toBeCloseTo(s[0]! + 1, 6);
    expect(x.position[1]).toBeCloseTo(s[1]!, 6);
  });

  it("throws from the frame outside the data and recovers", () => {
    const traj = Trajectory.fromOem(cubicOem(), frames, OPTIONS);
    const a = convertPoint(
      framePoint(traj.frame, [0, 0, 0], at(60)),
      traj.reference,
    );
    expect(() =>
      convertPoint(framePoint(traj.frame, [0, 0, 0], at(9000)), traj.reference),
    ).toThrow(/Trajectory/);
    const b = convertPoint(
      framePoint(traj.frame, [0, 0, 0], at(60)),
      traj.reference,
    );
    expect(Array.from(b.position)).toEqual(Array.from(a.position));
  });

  describe("rejections", () => {
    it("names the center of an SPK around Mars", () => {
      expect(() =>
        Trajectory.fromSpk([cubicSpk(1, 499)], 1000, frames, {
          ...OPTIONS,
          j2000: "icrf",
        }),
      ).toThrow(/499/);
    });

    it("names the center of an OEM around Mars", () => {
      const epochs = range(0, 240, 60);
      const oem = parseOem(
        oemText({
          center: "MARS",
          interpolation: HERMITE7,
          epochs: Array.from(epochs, isoTdb),
          states: Array.from(epochs, () => [1, 2, 3, 0, 0, 0]),
        }),
        leap,
      );
      expect(() => Trajectory.fromOem(oem, frames, OPTIONS)).toThrow(/MARS/);
    });

    it("names an SPK frame it cannot map", () => {
      expect(() =>
        Trajectory.fromSpk([cubicSpk(17)], 1000, frames, {
          ...OPTIONS,
          j2000: "icrf",
        }),
      ).toThrow(/frame 17/);
    });

    it("rejects segments that map to different references", () => {
      const epochs = range(0, 240, 60);
      const block = (frame: string): OemOptions => ({
        frame,
        interpolation: HERMITE7,
        epochs: Array.from(epochs, isoTdb),
        states: Array.from(epochs, () => [1, 2, 3, 0, 0, 0]),
      });
      const oem = parseOem(oemText(block("EME2000"), block("ICRF")), leap);
      expect(() => Trajectory.fromOem(oem, frames, OPTIONS)).toThrow(
        /one reference/,
      );
    });

    it("lists both objects when an OEM has two and no `object`", () => {
      const epochs = range(0, 240, 60);
      const block = (object: string): OemOptions => ({
        object,
        objectId: `id-${object}`,
        interpolation: HERMITE7,
        epochs: Array.from(epochs, isoTdb),
        states: Array.from(epochs, () => [1, 2, 3, 0, 0, 0]),
      });
      const oem = parseOem(oemText(block("ORION"), block("ICPS")), leap);
      expect(() => Trajectory.fromOem(oem, frames, OPTIONS)).toThrow(
        /ORION.*ICPS/s,
      );
      const icps = Trajectory.fromOem(oem, frames, {
        ...OPTIONS,
        object: "ICPS",
      });
      expect(icps.state(at(60))[0]).toBeCloseTo(1000, 9);
      expect(() =>
        Trajectory.fromOem(oem, frames, { ...OPTIONS, object: "NOPE" }),
      ).toThrow(/NOPE/);
    });

    it("throws for an SPK target it does not contain", () => {
      expect(() =>
        Trajectory.fromSpk([cubicSpk()], 4242, frames, {
          ...OPTIONS,
          j2000: "icrf",
        }),
      ).toThrow(/4242/);
    });
  });

  it("honors the OEM's useable range, each side on its own", () => {
    const epochs = range(0, 600, 60);
    const base = {
      interpolation: HERMITE7,
      epochs: Array.from(epochs, isoTdb),
      states: Array.from(epochs, () => [1, 2, 3, 0, 0, 0]),
    };
    const both = Trajectory.fromOem(
      parseOem(
        oemText({
          ...base,
          interpolation: `${HERMITE7};USEABLE_START_TIME = ${isoTdb(120)};USEABLE_STOP_TIME = ${isoTdb(480)}`,
        }),
        leap,
      ),
      frames,
      OPTIONS,
    );
    expect(both.spans).toEqual([[120, 480]]);
    expect(both.state(at(300))[0]).toBeCloseTo(1000, 9);
    expect(both.contains(at(60))).toBe(false);
    expect(() => both.state(at(60))).toThrow(/outside its data/);
    expect(() => both.state(at(540))).toThrow(/outside its data/);
    const startOnly = Trajectory.fromOem(
      parseOem(
        oemText({
          ...base,
          interpolation: `${HERMITE7};USEABLE_START_TIME = ${isoTdb(120)}`,
        }),
        leap,
      ),
      frames,
      OPTIONS,
    );
    expect(startOnly.spans).toEqual([[120, 600]]);
    // A state inside the range near its edge still uses states outside it.
    expect(both.state(at(120))[0]).toBeCloseTo(1000, 9);
  });

  it("leaves a piece whose useable range lies outside its epochs out of spans", () => {
    const block = (from: number, to: number, extra = ""): OemOptions => {
      const epochs = range(from, to, 60);
      return {
        interpolation: `${HERMITE7}${extra}`,
        epochs: Array.from(epochs, isoTdb),
        states: Array.from(epochs, () => [1, 2, 3, 0, 0, 0]),
      };
    };
    const traj = Trajectory.fromOem(
      parseOem(
        oemText(
          block(0, 600),
          block(
            1000,
            1600,
            `;USEABLE_START_TIME = ${isoTdb(5000)};USEABLE_STOP_TIME = ${isoTdb(6000)}`,
          ),
        ),
        leap,
      ),
      frames,
      OPTIONS,
    );
    expect(traj.spans).toEqual([[0, 600]]);
    expect(() => traj.state(at(1300))).toThrow(
      /outside its data \(covered: [^;]*\)$/,
    );
    expect(() =>
      Trajectory.fromOem(
        parseOem(
          oemText(
            block(
              0,
              600,
              `;USEABLE_START_TIME = ${isoTdb(5000)};USEABLE_STOP_TIME = ${isoTdb(6000)}`,
            ),
          ),
          leap,
        ),
        frames,
        OPTIONS,
      ),
    ).toThrow(/Trajectory "Orion": none of its data covers any time/);
  });

  it("rejects a non-finite SPK summary time with a descriptive error", () => {
    const buffer = constantSpk(100, 300, 50, 1);
    new Float64Array(buffer, 1024, 128)[3] = NaN;
    expect(() =>
      Trajectory.fromSpk([buffer], 1000, frames, {
        name: "x",
        accuracy: "precise",
        j2000: "icrf",
      }),
    ).toThrow(/non-finite summary time/);
  });

  it("clamps an SPK summary to the stored epochs (R3)", () => {
    const buffer = constantSpk(100, 300, 50, 1);
    // Record 2 is the summary record: 3 control doubles, then start and end.
    const view = new Float64Array(buffer, 1024, 128);
    expect(view[3]).toBe(100);
    view[3] = 0;
    view[4] = 1000;
    const traj = Trajectory.fromSpk([buffer], 1000, frames, {
      ...OPTIONS,
      j2000: "icrf",
    });
    expect(traj.spans).toEqual([[100, 300]]);
    expect(() => traj.state(at(50))).toThrow(/outside its data/);
    expect(() => traj.state(at(500))).toThrow(/outside its data/);
    expect(traj.state(at(150))[0]).toBeCloseTo(1000, 9);
  });

  it("rejects a half-specified OEM interpolation (R5)", () => {
    const epochs = range(0, 240, 60);
    const base = {
      epochs: Array.from(epochs, isoTdb),
      states: Array.from(epochs, () => [1, 2, 3, 0, 0, 0]),
    };
    const option = {
      ...OPTIONS,
      interpolation: { method: "lagrange", degree: 3 },
    } as const;
    const onlyMethod = parseOem(
      oemText({ ...base, interpolation: "INTERPOLATION = HERMITE" }),
      leap,
    );
    expect(() => Trajectory.fromOem(onlyMethod, frames, option)).toThrow(
      /ORION.*INTERPOLATION but no INTERPOLATION_DEGREE/,
    );
    const onlyDegree = parseOem(
      oemText({ ...base, interpolation: "INTERPOLATION_DEGREE = 7" }),
      leap,
    );
    expect(() => Trajectory.fromOem(onlyDegree, frames, option)).toThrow(
      /ORION.*INTERPOLATION_DEGREE but no INTERPOLATION$/,
    );
  });

  it("stores the accuracy as given", () => {
    for (const accuracy of ["precise", "approximate"] as const) {
      const traj = Trajectory.fromOem(cubicOem(), frames, {
        ...OPTIONS,
        accuracy,
      });
      expect(traj.accuracy).toBe(accuracy);
      expect(traj.name).toBe("Orion");
    }
  });
});

describe("Trajectory accuracy inputs", () => {
  const epochs = range(0, 600, 60);
  const states = Array.from(epochs, (_, i) =>
    Array.from(cubicStates(epochs).subarray(i * 6, i * 6 + 6)),
  );
  const build = (
    covariances: [string, number, number, number][] | undefined,
    options: Record<string, unknown> = {},
  ): Trajectory<"Orion"> =>
    Trajectory.fromOem(
      parseOem(
        oemText({
          interpolation: HERMITE7,
          epochs: Array.from(epochs, isoTdb),
          states,
          ...(covariances ? { covariances } : {}),
        }),
        leap,
      ),
      frames,
      { ...OPTIONS, ...options },
    );
  const COVS: [string, number, number, number][] = [
    [isoTdb(120), 4, 9, 36], // 7 -> sqrt(49) in km^2 terms: 4+9+36 = 49
    [isoTdb(360), 1, 1, 2], // 4
  ];

  it("labels its source", () => {
    expect(build(undefined).source).toBe("oem");
    expect(
      Trajectory.fromSpk([cubicSpk()], 1000, frames, {
        name: "x",
        accuracy: "precise",
        j2000: "icrf",
      }).source,
    ).toBe("spk");
  });

  it("uses the latest covariance epoch at or before the instant", () => {
    const traj = build(COVS, { covarianceUnits: "m" });
    expect(traj.positionSigma(at(120))).toBeCloseTo(7, 9);
    expect(traj.positionSigma(at(240))).toBeCloseTo(7, 9);
    expect(traj.positionSigma(at(360))).toBeCloseTo(2, 9);
    expect(traj.positionSigma(at(600))).toBeCloseTo(2, 9);
  });

  it("falls back to the option before the first epoch, else undefined", () => {
    expect(build(COVS, { covarianceUnits: "m" }).positionSigma(at(60))).toBe(
      undefined,
    );
    expect(
      build(COVS, { covarianceUnits: "m", positionSigma: 123 }).positionSigma(
        at(60),
      ),
    ).toBe(123);
    expect(build(undefined, { positionSigma: 5 }).positionSigma(at(300))).toBe(
      5,
    );
    expect(build(undefined).positionSigma(at(300))).toBeUndefined();
  });

  it("reads km^2 by default and m^2 on request, 1000 times apart", () => {
    const km = build(COVS).positionSigma(at(240))!;
    const m = build(COVS, { covarianceUnits: "m" }).positionSigma(at(240))!;
    expect(km / m).toBeCloseTo(1000, 9);
    expect(
      build(COVS, { covarianceUnits: "km" }).positionSigma(at(240)),
    ).toBeCloseTo(km, 9);
  });

  it("returns undefined, not a throw, outside the data", () => {
    const traj = build(COVS, { positionSigma: 1 });
    expect(traj.positionSigma(at(-10))).toBeUndefined();
    expect(traj.positionSigma(at(601))).toBeUndefined();
    expect(() => traj.state(at(601))).toThrow();
  });

  it("uses the covariance of the piece whose state wins (R4)", () => {
    const seg = (
      from: number,
      to: number,
      covariances?: [string, number, number, number][],
    ): OemOptions => {
      const e = range(from, to, 60);
      return {
        interpolation: HERMITE7,
        epochs: Array.from(e, isoTdb),
        states: Array.from(e, (_, i) =>
          Array.from(cubicStates(e).subarray(i * 6, i * 6 + 6)),
        ),
        ...(covariances ? { covariances } : {}),
      };
    };
    const traj = Trajectory.fromOem(
      parseOem(
        oemText(
          seg(0, 600, [[isoTdb(0), 9, 0, 0]]),
          seg(300, 900, [[isoTdb(300), 16, 0, 0]]),
        ),
        leap,
      ),
      frames,
      { ...OPTIONS, covarianceUnits: "m" },
    );
    expect(traj.positionSigma(at(100))).toBeCloseTo(3, 9);
    expect(traj.positionSigma(at(400))).toBeCloseTo(4, 9);
  });

  it("rejects a bad positionSigma option", () => {
    expect(() => build(undefined, { positionSigma: -1 })).toThrow(
      /positionSigma/,
    );
    expect(() => build(undefined, { positionSigma: NaN })).toThrow(
      /positionSigma/,
    );
  });
});
