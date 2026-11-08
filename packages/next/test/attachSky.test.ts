// attachSky (plan 5a, Task 12; plan's call 30): the engine's sky inputs
// from the catalog's GCRF, ITRF, HCRS, MOON_ICRF and MOON_ME, in the Earth's
// anchor axes. At "analytic" it is today's analytic sky to the bit and
// fetches nothing; at "precise" it is skyState's ephemeris sky inside the
// data and the analytic one outside it.
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { attachSky } from "../src/frames/attachSky.ts";
import { createFrameCatalog } from "../src/frames/catalog.ts";
import { createSkyState, skyState, type SkyState } from "../src/frames/sky.ts";
import type { Engine } from "../src/scene/Engine.ts";
import { Clock } from "../src/time/Clock.ts";
import { Instant } from "../src/time/Instant.ts";
import { LeapSeconds } from "../src/time/leapSeconds.ts";
import { fakeEngine } from "./fakeGpu.ts";
import { syntheticFrameData } from "./syntheticFrames.ts";

const maxDiff = (a: ArrayLike<number>, b: ArrayLike<number>): number => {
  let m = 0;
  for (let i = 0; i < a.length; i++) {
    m = Math.max(m, Math.abs(a[i]! - b[i]!));
  }
  return m;
};

/** The engine's four sky inputs against a SkyState, the largest difference (positions relative). */
function skyDifference(engine: Engine, sky: SkyState): number {
  const moon = Math.hypot(...sky.moonPosition);
  return Math.max(
    maxDiff(engine.icrfToFixed, sky.icrfToFixed),
    maxDiff(engine.sunDirection, sky.sunDirection),
    maxDiff(engine.moonPosition!, sky.moonPosition) / moon,
    maxDiff(engine.moonAxes!, sky.moonAxes),
  );
}

const leap = LeapSeconds.builtIn();
/** Inside the synthetic packs (TDB -200 s to 200 s around J2000). */
const INSIDE_MS = Instant.fromTt(0).toUtc(leap);

let engine: Engine;
let fetchSpy: ReturnType<typeof vi.fn>;
beforeAll(async () => {
  engine = await fakeEngine();
});
beforeEach(() => {
  fetchSpy = vi.fn(async () => new Response("not found", { status: 404 }));
  vi.stubGlobal("fetch", fetchSpy);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("attachSky", () => {
  it("at analytic, the engine's sky is skyState(ms, undefined)'s to the bit at 100 instants, fetching nothing", async () => {
    const catalog = createFrameCatalog();
    const clock = new Clock({ time: Date.UTC(2000, 0, 1) });
    const detach = attachSky(engine, { catalog, clock });
    const expected = createSkyState();
    for (let k = 0; k < 100; k++) {
      clock.time = Date.UTC(2000, 0, 1) + k * 18_262_310_017; // about 0.58 years apart, to 2058
      skyState(clock.time, undefined, expected);
      expect(skyDifference(engine, expected)).toBe(0);
      expect(skyDifference(engine, expected)).toBeLessThan(1e-12);
    }
    // Let any dynamic import settle: nothing loads.
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(fetchSpy).not.toHaveBeenCalled();
    for (const name of [
      "GCRF",
      "ITRF",
      "HCRS",
      "MOON_ICRF",
      "MOON_ME",
    ] as const) {
      expect(catalog.precisionOf(name)).toBe("analytic");
    }
    const users = new Map(
      catalog.treeInUse().map((f) => [f.frame.name, f.users]),
    );
    for (const name of ["GCRF", "ITRF", "HCRS", "MOON_ICRF", "MOON_ME"]) {
      expect(users.get(name)).toEqual(["sky"]);
    }
    detach();
  });

  it("sets the sky at once, renders when the clock moves, and stops when detached", () => {
    const catalog = createFrameCatalog();
    const clock = new Clock({ time: Date.UTC(2026, 3, 6, 23) });
    const render = vi.spyOn(engine, "requestRender");
    const detach = attachSky(engine, { catalog, clock });
    const expected = skyState(clock.time, undefined, createSkyState());
    expect(skyDifference(engine, expected)).toBe(0);
    render.mockClear();
    clock.time += 1000;
    expect(render).toHaveBeenCalled();
    expect(
      skyDifference(engine, skyState(clock.time, undefined, createSkyState())),
    ).toBe(0);
    detach();
    const before = Float64Array.from(engine.icrfToFixed);
    clock.time += 3_600_000;
    expect([...engine.icrfToFixed]).toEqual([...before]);
  });

  it("at precise: analytic while the data loads, skyState(ms, data)'s once it arrives, analytic outside it", async () => {
    const data = syntheticFrameData();
    const catalog = createFrameCatalog({ data });
    const clock = new Clock({ time: INSIDE_MS });
    const detach = attachSky(engine, { catalog, clock, precision: "precise" });
    expect(
      skyDifference(engine, skyState(clock.time, undefined, createSkyState())),
    ).toBe(0);
    const render = vi.spyOn(engine, "requestRender");
    for (const name of [
      "GCRF",
      "ITRF",
      "HCRS",
      "MOON_ICRF",
      "MOON_ME",
    ] as const) {
      await catalog.ready(name, "precise");
    }
    // The data arrived: the sky is the ephemeris's without the clock moving.
    expect(render).toHaveBeenCalled();
    const sky = skyState(clock.time, data, createSkyState());
    expect(sky.source).toBe("ephemeris");
    expect(skyDifference(engine, sky)).toBeLessThan(1e-11);
    // Outside the data (the synthetic packs end 200 s past J2000): analytic.
    clock.time = INSIDE_MS + 86_400_000;
    expect(
      skyDifference(engine, skyState(clock.time, undefined, createSkyState())),
    ).toBe(0);
    detach();
  });
});
