// Paths and accuracy over spans (frames 5b, Task 9) on synthetic frames.
import { describe, expect, it } from "vitest";
import { Frame, frameTransform } from "../src/frames/Frame.ts";
import type { FrameAccuracy } from "../src/frames/frameAccuracy.ts";
import { accuracySpan, samplePath } from "../src/frames/bulk.ts";
import { framePoint } from "../src/frames/local.ts";
import { piecewiseFrame } from "../src/frames/piecewise.ts";
import { pointAccuracy } from "../src/frames/pointAccuracy.ts";
import { identity } from "../src/math/mat4.ts";
import { Instant } from "../src/time/Instant.ts";

const at = (t: number) => Instant.fromTdb(t);
const root = Frame.root("ROOT");
const moving = (
  name: string,
  x: (t: number) => number,
  accuracy: FrameAccuracy = { meters: 0.1, note: name },
  limit = Infinity,
) =>
  new Frame(
    name,
    root,
    (i, out) => {
      const t = i.tdb();
      if (t > limit) {
        throw new Error(`${name}: ${t} is outside its data`);
      }
      identity(out);
      out[12] = x(t);
    },
    { cache: false, accuracy },
  );

describe("samplePath", () => {
  const a = moving("A", (t) => t);
  const b = moving("B", (t) => t, { meters: 0.3, note: "b" });
  const stage = piecewiseFrame("stage", [
    { frame: a, from: at(0), simulated: true, note: "simulated" },
    { frame: b, from: at(25) },
  ]);

  it("includes the change instant, marks the simulated span, and matches frameTransform exactly", async () => {
    const path = await samplePath(stage, root, at(0), at(50), 10);
    expect(Array.from(path.tdb)).toEqual([0, 10, 20, 25, 30, 40, 50]);
    for (let i = 0; i < path.tdb.length; i++) {
      const m = frameTransform(stage, root, at(path.tdb[i]!));
      expect(path.positions[i * 3]).toBe(m[12]);
      expect(path.positions[i * 3 + 1]).toBe(m[13]);
      expect(path.positions[i * 3 + 2]).toBe(m[14]);
    }
    expect(path.spans).toEqual([
      { start: 0, end: 20, simulated: true },
      { start: 25, end: 50, simulated: false },
    ]);
    expect(path.gaps).toEqual([]);
  });

  it("records a gap past the data's end with its message, and keeps going", async () => {
    const short = moving("short", (t) => t, undefined, 30);
    const path = await samplePath(short, root, at(0), at(60), 10);
    expect(Array.from(path.tdb)).toEqual([0, 10, 20, 30]);
    expect(path.gaps).toHaveLength(1);
    expect(path.gaps[0]).toMatchObject({ start: 40, end: 60 });
    expect(path.gaps[0]!.reason).toMatch(/outside its data/);
  });

  it("reports progress, can be aborted, and refuses a step that is not positive", async () => {
    const progress: number[] = [];
    await samplePath(a, root, at(0), at(100), 1, {
      onProgress: (p) => progress.push(p.done),
    });
    expect(progress.at(-1)).toBe(101);
    const controller = new AbortController();
    controller.abort();
    await expect(
      samplePath(a, root, at(0), at(10), 1, { signal: controller.signal }),
    ).rejects.toMatchObject({ name: "AbortError" });
    await expect(samplePath(a, root, at(0), at(10), 0)).rejects.toThrow(/step/);
    await expect(samplePath(a, root, at(0), at(2_000_000), 1)).rejects.toThrow(
      /exceeds the limit/,
    );
  });
});

describe("accuracySpan", () => {
  it("equals pointAccuracy at each instant", async () => {
    const a = moving("A", (t) => t, { radians: 1e-6, note: "a" });
    const point = framePoint(a, [1000, 0, 0]);
    const rows = await accuracySpan(point, root, at(0), at(30), 10, {
      confidence: "95%",
    });
    expect(rows.map((r) => r.instant.tdb())).toEqual([0, 10, 20, 30]);
    for (const row of rows) {
      const direct = pointAccuracy(point, root, row.instant, {
        confidence: "95%",
      });
      expect(row.error).toBeUndefined();
      expect(row.accuracy!.meters).toBe(direct.meters);
    }
  });

  it("records a sample that throws", async () => {
    const other = Frame.root("OTHER");
    const point = framePoint(root, [0, 0, 0]);
    const rows = await accuracySpan(point, other, at(0), at(10), 10);
    expect(rows).toHaveLength(2);
    expect(rows[0]!.error).toMatch(/no common ancestor/);
  });
});
