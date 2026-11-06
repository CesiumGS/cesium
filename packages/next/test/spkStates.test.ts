import { describe, expect, it } from "vitest";
import { readDaf, readSpk, type StateSegment } from "../src/ephemeris/spk.ts";
import {
  interpolateState,
  windowStart,
} from "../src/trajectory/interpolate.ts";
import {
  writeSpk,
  type SpkStateWriterSegment,
  type SpkWriterSegment,
} from "./spkWriter.ts";

// x(t) = a + b t + c t^2 + d t^3 per axis (km, t in seconds); velocity is its derivative.
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

function statesAt(epochs: Float64Array): Float64Array {
  const states = new Float64Array(epochs.length * 6);
  epochs.forEach((t, i) => {
    for (let axis = 0; axis < 3; axis++) {
      states[i * 6 + axis] = position(axis, t);
      states[i * 6 + 3 + axis] = velocity(axis, t);
    }
  });
  return states;
}

const EVEN = Float64Array.from({ length: 12 }, (_, i) => 100 + i * 60);
const UNEVEN = Float64Array.of(
  100,
  160,
  197,
  257,
  267,
  327,
  387,
  397,
  457,
  517,
  530,
  590,
);

function segment(
  type: 8 | 9 | 12 | 13,
  epochs: Float64Array,
): SpkStateWriterSegment {
  const hermite = type === 12 || type === 13;
  return {
    target: 399_001,
    center: 399,
    frame: 1,
    type,
    epochs,
    step: type === 8 || type === 12 ? 60 : undefined,
    states: statesAt(epochs),
    degree: hermite ? 1 : 3, // window 2 (Hermite, cubic) or degree 3 (Lagrange)
  };
}

function read(type: 8 | 9 | 12 | 13, epochs: Float64Array): StateSegment {
  const { segments } = readSpk(
    writeSpk({ kind: "SPK", segments: [segment(type, epochs)] }),
  );
  return segments[0] as StateSegment;
}

function check(seg: StateSegment, t: number): void {
  const first = windowStart(seg.epochs, t, seg.windowSize);
  const out = interpolateState(
    seg.method,
    seg.epochs,
    seg.states,
    first,
    seg.windowSize,
    t,
    new Float64Array(6),
  );
  for (let axis = 0; axis < 3; axis++) {
    expect(Math.abs(out[axis]! - position(axis, t))).toBeLessThan(1e-9);
    expect(Math.abs(out[3 + axis]! - velocity(axis, t))).toBeLessThan(1e-12);
  }
}

describe("SPK discrete-state segments", () => {
  describe.each([8, 9, 12, 13] as const)("type %i", (type) => {
    const epochs = EVEN;

    it("reads back its description", () => {
      const seg = read(type, epochs);
      expect(seg.type).toBe(type);
      expect(seg.target).toBe(399_001);
      expect(seg.center).toBe(399);
      expect(seg.frame).toBe(1);
      expect(seg.start).toBe(epochs[0]);
      expect(seg.end).toBe(epochs[epochs.length - 1]);
      expect(Array.from(seg.epochs)).toEqual(Array.from(epochs));
      expect(Array.from(seg.states)).toEqual(Array.from(statesAt(epochs)));
      expect(seg.windowSize).toBe(type === 8 || type === 9 ? 4 : 2);
      expect(seg.method).toBe(
        type === 8 || type === 9 ? "lagrange" : "hermite",
      );
    });

    it("reproduces a cubic between epochs, on epochs and in the first and last windows", () => {
      const seg = read(type, epochs);
      const first = epochs[0]!;
      const last = epochs[epochs.length - 1]!;
      const instants = [
        first,
        first + 1,
        first + 30,
        first + 95,
        epochs[5]!,
        epochs[5]! + 17.3,
        last - 40,
        last - 0.5,
        last,
      ];
      for (const t of instants) {
        check(seg, t);
      }
    });
  });

  it.each([9, 13] as const)("type %i handles uneven spacing", (type) => {
    const seg = read(type, UNEVEN);
    for (const t of [101, 180, 197, 262, 300, 392, 500, 525, 589]) {
      check(seg, t);
    }
  });

  it("reads an epoch directory spanning several hundred epochs", () => {
    const epochs = Float64Array.from({ length: 450 }, (_, i) => i * 10);
    for (const type of [9, 13] as const) {
      const seg = read(type, epochs);
      expect(seg.epochs.length).toBe(450);
      check(seg, 2234.5);
    }
  });

  describe("windowStart", () => {
    const epochs = Float64Array.from({ length: 10 }, (_, i) => i);
    it("centers an even window on the interval holding t", () => {
      expect(windowStart(epochs, 4.5, 6)).toBe(2);
    });
    it("clamps at the first and last windows", () => {
      expect(windowStart(epochs, 0.2, 6)).toBe(0);
      expect(windowStart(epochs, 8.9, 6)).toBe(4);
    });
    it("centers an odd window on the nearest epoch", () => {
      expect(windowStart(epochs, 4.4, 5)).toBe(2);
      expect(windowStart(epochs, 4.6, 5)).toBe(3);
    });
  });

  it("interpolates a degree-5 Lagrange window over a quintic, and Hermite over a quintic", () => {
    const epochs = Float64Array.from({ length: 10 }, (_, i) => i * 2);
    const f = (t: number): number =>
      1 + t * (2 + t * (-0.5 + t * (0.1 + t * t * 0.01)));
    const df = (t: number): number => 2 + t * (-1 + t * (0.3 + t * t * 0.05));
    const states = new Float64Array(60);
    epochs.forEach((t, i) => {
      for (let axis = 0; axis < 3; axis++) {
        states[i * 6 + axis] = f(t) * (axis + 1);
        states[i * 6 + 3 + axis] = df(t) * (axis + 1);
      }
    });
    const out = new Float64Array(6);
    // Lagrange: 6 points fit a quintic. Hermite: 3 points (6 conditions) fit a quintic.
    for (const [method, size] of [
      ["lagrange", 6],
      ["hermite", 3],
    ] as const) {
      const t = 7.3;
      const first = windowStart(epochs, t, size);
      interpolateState(method, epochs, states, first, size, t, out);
      expect(out[1]).toBeCloseTo(2 * f(t), 9);
      expect(out[5]).toBeCloseTo(3 * df(t), 9);
    }
  });

  describe("rejections", () => {
    it("readSpk throws for a type-21 segment, naming the type", () => {
      const seg: SpkWriterSegment = {
        target: 1,
        frame: 1,
        type: 21,
        init: 0,
        intervalLength: 10,
        recordSize: 5,
        records: new Float64Array(5),
      };
      expect(() => readSpk(writeSpk({ kind: "SPK", segments: [seg] }))).toThrow(
        /type 21/,
      );
    });

    it("readDaf keeps its type-2-only contract", () => {
      const buf = writeSpk({ kind: "SPK", segments: [segment(13, EVEN)] });
      expect(() => readDaf(buf)).toThrow(/type 13/);
    });

    it("rejects a trailer that disagrees with the address range", () => {
      const seg = segment(9, EVEN);
      const buf = writeSpk({
        kind: "SPK",
        segments: [{ ...seg, epochs: EVEN }],
      });
      // Corrupt n in the trailer: it is the last double of the segment.
      const view = new DataView(buf);
      const bytes = buf.byteLength;
      // The segment is the file's last data; find the trailer by scanning for n = 12 after degree 3.
      let patched = false;
      for (let at = bytes - 8; at > 0 && !patched; at -= 8) {
        if (
          view.getFloat64(at, true) === 12 &&
          view.getFloat64(at - 8, true) === 3
        ) {
          view.setFloat64(at, 13, true);
          patched = true;
        }
      }
      expect(patched).toBe(true);
      expect(() => readSpk(buf)).toThrow(/trailer/);
    });
  });
});
