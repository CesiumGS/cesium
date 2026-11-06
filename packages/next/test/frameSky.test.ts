import { describe, expect, it } from "vitest";
import { FrameSky } from "../src/frames/frameSky.ts";
import { createSkyState, skyState } from "../src/frames/sky.ts";
import { LeapSeconds } from "../src/time/leapSeconds.ts";
import type { FrameData } from "../src/ephemeris/loadFrameData.ts";

const MS = Date.UTC(2026, 3, 6, 23);
const analytic = (ms: number) => skyState(ms, undefined, createSkyState());

/**
 * A stand-in whose ephemeris covers nothing, so `skyState` falls back to the
 * analytic numbers; only identity matters for the helper's bookkeeping.
 */
const stub = (): FrameData =>
  ({
    leapSeconds: LeapSeconds.builtIn(),
    eop: {},
    ephemeris: { contains: () => false },
    warnings: [],
  }) as unknown as FrameData;

describe("FrameSky", () => {
  it("is analytic with no data", () => {
    const sky = new FrameSky();
    expect(sky.at(MS).moonPosition).toEqual(analytic(MS).moonPosition);
    expect(sky.at(MS).source).toBe("analytic");
  });

  it("reads the data it is given through skyState", () => {
    const calls: unknown[] = [];
    const data = stub();
    (data.ephemeris as unknown as { contains: () => boolean }).contains =
      () => {
        calls.push(1);
        return false;
      };
    const sky = new FrameSky();
    sky.setData(data);
    sky.at(MS);
    expect(calls.length).toBe(1);
    expect(sky.data).toBe(data);
  });

  it("memoises by time, and setData invalidates the memo", () => {
    let calls = 0;
    const data = stub();
    (data.ephemeris as unknown as { contains: () => boolean }).contains =
      () => {
        calls++;
        return false;
      };
    const sky = new FrameSky();
    sky.setData(data);
    const a = sky.at(MS);
    sky.at(MS);
    expect(calls).toBe(1);
    sky.at(MS + 1000);
    expect(calls).toBe(2);
    // Same time, new data: must recompute.
    sky.at(MS + 1000);
    expect(calls).toBe(2);
    const other = stub();
    let otherCalls = 0;
    (other.ephemeris as unknown as { contains: () => boolean }).contains =
      () => {
        otherCalls++;
        return false;
      };
    sky.setData(other);
    sky.at(MS + 1000);
    expect(otherCalls).toBe(1);
    sky.setData(undefined);
    expect(sky.data).toBeUndefined();
    expect(sky.at(MS + 1000).moonPosition).toEqual(
      analytic(MS + 1000).moonPosition,
    );
    expect(a).toBe(sky.at(MS)); // one shared state object, refilled
  });
});
