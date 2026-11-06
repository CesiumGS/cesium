// Orion on the frames explorer's page (examples/frames-explorer/orion.ts):
// the legend line computed from the worker's statement (R8), the redraw
// cadence that drops stale requests instead of queueing them, and the view
// down on the orbit plane that frames the Earth and the Moon.
import { describe, expect, it, vi } from "vitest";
import {
  latestOnly,
  orionLegend,
  planeFraming,
} from "../examples/frames-explorer/orion.ts";
import type { ComposedView } from "../examples/frames-explorer/panel/model.ts";

/** Orion's statement against ITRF near the flyby, as the worker gives it. */
const near: ComposedView = {
  statement: {
    meters: 10.33,
    terms: [
      { source: "ephemeris", meters: 0.01, note: "DE440 Earth-Moon fit" },
      {
        source: "trajectory",
        meters: 0.278,
        note: 'End a: Trajectory "orion": position sigma',
      },
      {
        source: "coordinateScale",
        meters: 10.33,
        note: 'End a: Trajectory "orion": the scale of its coordinates (TDB or TT) is not stated, taken as TDB-compatible: 2.5e-8 of the geocentric distance',
      },
      { source: "earthOrientation", meters: 0, note: "End b: measured" },
    ],
    warnings: [],
  },
  termEdges: [["GCRF"], ["orion"], ["orion"], ["ITRF"]],
  zeroAtOrigin: [],
};

describe("orionLegend (R8: computed, not fixed text)", () => {
  it("states the total at the instant, its largest term and the frame drawn in", () => {
    const l = orionLegend(near, {
      drawIn: "GCRF",
      utc: "2026-04-06T23:00:00Z",
    });
    expect(l.accuracy).toMatch(/^±10 m \(1σ\)/);
    expect(l.accuracy).toContain("2026-04-06 23:00 UTC");
    expect(l.accuracy).toMatch(/mostly the unstated time scale/);
    expect(l.accuracy).toMatch(/drawn in GCRF/);
    // It rests on an assumption (TDB taken for an unstated scale).
    expect(l.caution).toBe(true);
    expect(l.unbounded).toBe(false);
  });

  it("follows the statement: near the Earth the covariance can lead", () => {
    const close: ComposedView = {
      ...near,
      statement: {
        meters: 0.33,
        terms: [
          { source: "trajectory", meters: 0.3, note: "position sigma" },
          { source: "coordinateScale", meters: 0.16, note: "scale" },
        ],
        warnings: [],
      },
    };
    const l = orionLegend(close, {
      drawIn: "ITRF",
      utc: "2026-04-03T00:00:00Z",
    });
    expect(l.accuracy).toMatch(/^±330 mm \(1σ\)/);
    expect(l.accuracy).toMatch(/mostly the OEM's covariance/);
    expect(l.accuracy).toMatch(/drawn in ITRF/);
  });

  it("says how it was sampled, and when a budget capped it", () => {
    const l = orionLegend(near, {
      drawIn: "MOON_ME",
      utc: "2026-04-06T23:00:00Z",
      sampling: { samples: 730, finest: 23.75 },
    });
    expect(l.accuracy).toMatch(/730 samples, finest 24 s/);
    expect(l.accuracy).not.toMatch(/capped/);
    const capped = orionLegend(near, {
      drawIn: "MOON_ME",
      utc: "2026-04-06T23:00:00Z",
      sampling: { samples: 8000, finest: 5, capped: "time" },
    });
    expect(capped.accuracy).toMatch(/capped by its time budget/);
  });

  it("reads not bounded, naming the term, when the total is undefined", () => {
    const open: ComposedView = {
      ...near,
      statement: {
        meters: undefined,
        terms: [
          {
            source: "trajectory",
            meters: undefined,
            note: 'End a: Trajectory "orion": no position sigma (no covariance, no positionSigma option)',
          },
        ],
        warnings: [],
      },
    };
    const l = orionLegend(open, {
      drawIn: "GCRF",
      utc: "2026-04-06T23:00:00Z",
    });
    expect(l.unbounded).toBe(true);
    expect(l.accuracy).toMatch(/^not bounded: .*no position sigma/);
    expect(l.accuracy).not.toMatch(/End a/);
  });

  it("waits for the statement before it has one", () => {
    const l = orionLegend(undefined, {
      drawIn: "GCRF",
      utc: "2026-04-06T23:00:00Z",
    });
    expect(l.accuracy).toMatch(/waiting/);
    expect(l.unbounded).toBe(false);
  });
});

/** A promise and its resolvers. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((a, b) => {
    resolve = a;
    reject = b;
  });
  return { promise, resolve, reject };
}

describe("latestOnly (the redraw cadence: drop stale requests, never queue)", () => {
  it("keeps one request in flight and, of those made meanwhile, only the latest", async () => {
    const calls: number[] = [];
    const pending: ReturnType<typeof deferred<string>>[] = [];
    const applied: [string, number][] = [];
    const work = vi.fn((n: number) => {
      calls.push(n);
      const d = deferred<string>();
      pending.push(d);
      return d.promise;
    });
    const r = latestOnly(work, (result, n) => applied.push([result, n]));
    r.request(1);
    r.request(2);
    r.request(3);
    r.request(4);
    expect(calls).toEqual([1]);
    expect(r.busy).toBe(true);
    pending[0]!.resolve("one");
    await vi.waitFor(() => expect(calls).toEqual([1, 4]));
    expect(applied).toEqual([["one", 1]]);
    pending[1]!.resolve("four");
    await vi.waitFor(() => expect(r.busy).toBe(false));
    expect(applied).toEqual([
      ["one", 1],
      ["four", 4],
    ]);
    expect(calls).toEqual([1, 4]);
  });

  it("drop discards the answer in flight and the request waiting", async () => {
    const d = deferred<string>();
    const work = vi.fn((_: number) => d.promise);
    const apply = vi.fn();
    const r = latestOnly(work, apply);
    r.request(1);
    r.request(2);
    r.drop();
    d.resolve("stale");
    await vi.waitFor(() => expect(r.busy).toBe(false));
    expect(apply).not.toHaveBeenCalled();
    expect(work).toHaveBeenCalledTimes(1);
  });

  it("a request after drop runs once the one in flight is done", async () => {
    const first = deferred<string>();
    const second = deferred<string>();
    const work = vi
      .fn<(n: number) => Promise<string>>()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const apply = vi.fn();
    const r = latestOnly(work, apply);
    r.request(1);
    r.drop();
    r.request(2);
    expect(work).toHaveBeenCalledTimes(1);
    first.resolve("old");
    await vi.waitFor(() => expect(work).toHaveBeenCalledTimes(2));
    second.resolve("new");
    await vi.waitFor(() => expect(apply).toHaveBeenCalledWith("new", 2));
    expect(apply).toHaveBeenCalledTimes(1);
  });

  it("reports a failure and goes on to the latest request", async () => {
    const first = deferred<string>();
    const work = vi
      .fn<(n: number) => Promise<string>>()
      .mockReturnValueOnce(first.promise)
      .mockResolvedValueOnce("ok");
    const apply = vi.fn();
    const fail = vi.fn();
    const r = latestOnly(work, apply, fail);
    r.request(1);
    r.request(2);
    first.reject(new Error("the worker failed"));
    await vi.waitFor(() => expect(apply).toHaveBeenCalledWith("ok", 2));
    expect(fail).toHaveBeenCalledWith(expect.any(Error), 1);
  });
});

describe("planeFraming (tour stop 5: down on the orbit plane)", () => {
  const n = [0, 0, 1];
  const moon = [3.84e8, 0, 0];
  const points = [[0, 0, 0], moon, [-1e7, 2e7, 0], [4.0e8, -3e7, 0]];

  it("looks along the plane's normal with the Earth–Moon line across the screen", () => {
    const f = planeFraming(points, n, moon, { fov: Math.PI / 3, aspect: 1.5 });
    expect(f.from.direction).toEqual([0, 0, 1]);
    // Screen up is n × (Earth→Moon): the Moon to the right.
    expect(f.from.up[0]).toBeCloseTo(0, 12);
    expect(f.from.up[1]).toBeCloseTo(1, 12);
    expect(f.from.up[2]).toBeCloseTo(0, 12);
  });

  it("centers on the points' extent and frames all of them", () => {
    const aspect = 1.5;
    const fov = Math.PI / 3;
    const f = planeFraming(points, n, moon, { fov, aspect });
    expect(f.center[0]).toBeCloseTo((-1e7 + 4.0e8) / 2, 0);
    expect(f.center[1]).toBeCloseTo((2e7 - 3e7) / 2, 0);
    // fov is the wider (horizontal) angle when the view is wider than tall.
    const halfWidth = (4.0e8 + 1e7) / 2;
    expect(f.range).toBeGreaterThanOrEqual(halfWidth / Math.tan(fov / 2));
    expect(f.range).toBeLessThan((1.3 * halfWidth) / Math.tan(fov / 2));
  });

  it("frames the height when the view is tall", () => {
    const tall = [
      [0, -3e8, 0],
      [0, 3e8, 0],
      [1e8, 0, 0],
    ];
    const fov = Math.PI / 3;
    const f = planeFraming(tall, n, [1, 0, 0], { fov, aspect: 0.5 });
    // Tall: fov is the vertical angle.
    expect(f.range).toBeGreaterThanOrEqual(3e8 / Math.tan(fov / 2));
  });
});
