// The frames resolver (plan 5a, Task 12): the catalog's reference frames
// resolved through the tree at the clock's instant, anchor bindings (the
// Earth's anchor to ITRF), route revisions that go up when data arrives,
// and rendering's fallback when a reference frame isn't ready (Review
// Focus 1, and the ruling that a precise reference frame outside its data
// draws on its stand-in while measurement still throws).
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { FrameUnavailableError } from "../src/camera/frameResolver.ts";
import { ANALYTIC_ACCURACY } from "../src/frames/analytic.ts";
import { createFrameCatalog } from "../src/frames/catalog.ts";
import { Frame, frameTransform } from "../src/frames/Frame.ts";
import { createFramesResolver } from "../src/frames/resolver.ts";
import type { FrameData } from "../src/ephemeris/loadFrameData.ts";
import { EARTH, MOON } from "../src/scene/Body.ts";
import type { Engine } from "../src/scene/Engine.ts";
import { OffscreenTarget, type View } from "../src/scene/View.ts";
import type { World } from "../src/scene/World.ts";
import { icrfToFixed } from "../src/time/celestial.ts";
import { Clock } from "../src/time/Clock.ts";
import type { EarthOrientationParameters } from "../src/time/eop.ts";
import { Instant } from "../src/time/Instant.ts";
import { LeapSeconds } from "../src/time/leapSeconds.ts";
import { fakeEngine } from "./fakeGpu.ts";
import { SAMPLE, syntheticFrameData } from "./syntheticFrames.ts";

const leap = LeapSeconds.builtIn();
/** UTC ms at TT `tt` seconds past J2000, whole milliseconds. */
const utcMsAt = (tt: number): number => Instant.fromTt(tt).toUtc(leap);
/** Inside the synthetic packs (TDB -200 s to 200 s around J2000). */
const INSIDE_MS = utcMsAt(0);
/** The stub EOP ends (degraded) 1,000 s of TT past J2000. */
const EOP_END_TT = 1000;

/**
 * Synthetic frame data whose EOP is degraded (past its predictions) from
 * `EOP_END_TT` on, as a real table is past its last row.
 */
function dataWithEopEnd(): FrameData {
  const data = syntheticFrameData();
  const eop = {
    atInstant: (instant: Instant) =>
      instant.tt > EOP_END_TT ? { ...SAMPLE, degraded: true } : SAMPLE,
    first: Date.UTC(1999, 11, 1),
    last: utcMsAt(EOP_END_TT),
  } as unknown as EarthOrientationParameters;
  return { ...data, eop };
}

/** Row-major 3 × 3 of a column-major Mat4's linear part. */
const rotationOf = (m: ArrayLike<number>): number[] => {
  const r: number[] = [];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      r.push(m[col * 4 + row]!);
    }
  }
  return r;
};
const maxDiff = (a: ArrayLike<number>, b: ArrayLike<number>): number => {
  let m = 0;
  for (let i = 0; i < a.length; i++) {
    m = Math.max(m, Math.abs(a[i]! - b[i]!));
  }
  return m;
};
const IDENTITY = new Float64Array([
  1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1,
]);

describe("the frames resolver, on its own", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("resolves catalog reference frames at the clock's instant (GCRF → ITRF is icrfToFixed)", () => {
    const catalog = createFrameCatalog({ data: syntheticFrameData() });
    const resolver = createFramesResolver(catalog);
    const gcrf = catalog.get("GCRF");
    const itrf = catalog.get("ITRF");
    for (const ms of [INSIDE_MS, Date.UTC(2026, 3, 6, 23, 17, 5, 123)]) {
      const m = resolver.resolve(gcrf, itrf, ms / 1000, new Float64Array(16));
      expect(maxDiff(rotationOf(m), icrfToFixed(ms))).toBeLessThan(1e-15);
      expect(maxDiff([m[12]!, m[13]!, m[14]!], [0, 0, 0])).toBe(0);
      // The inverse route, the other way round.
      const back = resolver.resolve(
        itrf,
        gcrf,
        ms / 1000,
        new Float64Array(16),
      );
      const r = icrfToFixed(ms);
      const transposed = [0, 1, 2].flatMap((i) => [
        r[i]!,
        r[3 + i]!,
        r[6 + i]!,
      ]);
      expect(maxDiff(rotationOf(back), transposed)).toBeLessThan(1e-15);
    }
  });

  it("instant maps scene seconds through the catalog's leap seconds, as Clock.instant does", () => {
    const catalog = createFrameCatalog({ data: syntheticFrameData() });
    const resolver = createFramesResolver(catalog);
    const clock = new Clock({ time: Date.UTC(2017, 0, 1, 0, 0, 0, 250) });
    expect(resolver.instant(clock.seconds).tt).toBe(clock.instant().tt);
  });

  it("asks for precise on every catalog edge of a route at precision precise, and only then", async () => {
    const analytic = createFrameCatalog({ data: syntheticFrameData() });
    createFramesResolver(analytic).resolve(
      analytic.get("MOON_ME"),
      analytic.get("ITRF"),
      INSIDE_MS / 1000,
      new Float64Array(16),
    );
    for (const name of analytic.names) {
      expect(analytic.precisionOf(name)).toBe(
        name === "EME2000" || name === "MOON_PA" || name === "ICRF"
          ? "precise"
          : "analytic",
      );
    }
    const catalog = createFrameCatalog({ data: syntheticFrameData() });
    const resolver = createFramesResolver(catalog, { precision: "precise" });
    resolver.routeRevision(catalog.get("MOON_ME"), catalog.get("ITRF"));
    await catalog.ready("MOON_ME", "precise");
    await catalog.ready("ITRF", "precise");
    for (const name of ["ITRF", "GCRF", "MOON_ICRF", "MOON_ME"] as const) {
      expect(catalog.precisionOf(name)).toBe("precise");
    }
    // Off the route: still analytic.
    expect(catalog.precisionOf("HCRS")).toBe("analytic");
    expect(catalog.precisionOf("EARTH_ICRF")).toBe("analytic");
  });

  it("routeRevision goes up when the catalog's data arrives, and watch is told", async () => {
    const catalog = createFrameCatalog({ data: syntheticFrameData() });
    const resolver = createFramesResolver(catalog, { precision: "precise" });
    const itrf = catalog.get("ITRF");
    const gcrf = catalog.get("GCRF");
    const told = vi.fn();
    const unwatch = resolver.watch!(told);
    const before = resolver.routeRevision(itrf, gcrf);
    const standIn = resolver.resolve(
      itrf,
      gcrf,
      INSIDE_MS / 1000,
      new Float64Array(16),
    );
    await catalog.ready("ITRF", "precise");
    expect(resolver.routeRevision(itrf, gcrf)).toBeGreaterThan(before);
    expect(told).toHaveBeenCalled();
    const precise = resolver.resolve(
      itrf,
      gcrf,
      INSIDE_MS / 1000,
      new Float64Array(16),
    );
    expect(maxDiff(precise, standIn)).toBeGreaterThan(1e-9);
    unwatch();
  });

  it("an anchor's binding: body anchors bind to their body-fixed reference frame; bindAnchor binds any", async () => {
    const engine = await fakeEngine();
    const world = engine.createWorld();
    const catalog = createFrameCatalog({ data: syntheticFrameData() });
    const resolver = createFramesResolver(catalog);
    const earth = world.bodyAnchor(EARTH);
    const moon = world.bodyAnchor(MOON);
    const site = world.addAnchor("site");
    const seconds = INSIDE_MS / 1000;
    const instant = resolver.instant(seconds);
    const out = new Float64Array(16);
    const gcrf = catalog.get("GCRF");
    expect(
      maxDiff(
        resolver.resolve(earth, gcrf, seconds, out),
        frameTransform(catalog.get("ITRF"), gcrf, instant),
      ),
    ).toBe(0);
    expect(
      maxDiff(
        resolver.resolve(moon, earth, seconds, out),
        frameTransform(catalog.get("MOON_ME"), catalog.get("ITRF"), instant),
      ),
    ).toBeLessThan(1e-6);
    // Unbound: it sits at the render root's origin, whatever the base.
    expect(maxDiff(resolver.resolve(site, gcrf, seconds, out), IDENTITY)).toBe(
      0,
    );
    const before = resolver.routeRevision(site, gcrf);
    resolver.bindAnchor(site, catalog.get("MOON_ICRF"));
    expect(resolver.routeRevision(site, gcrf)).not.toBe(before);
    expect(
      maxDiff(
        resolver.resolve(site, gcrf, seconds, out),
        frameTransform(catalog.get("MOON_ICRF"), gcrf, instant),
      ),
    ).toBe(0);
    // A node under the Moon's anchor: the anchor's reference frame times its matrix.
    const node = world.addTransform(
      new Float64Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1000, 0, 0, 1]),
      moon,
    );
    const key = world.frameOf(node, "lander");
    const m = resolver.resolve(key, catalog.get("MOON_ME"), seconds, out);
    expect(maxDiff([m[12]!, m[13]!, m[14]!], [1000, 0, 0])).toBe(0);
    // A reference frame from another tree is refused, naming it.
    expect(() => resolver.bindAnchor(site, Frame.root("elsewhere"))).toThrow(
      /elsewhere/,
    );
    engine.removeWorld(world);
  });

  it("marks a rig's reference frames as rig users, and anchors' bindings as the application's", async () => {
    const engine = await fakeEngine();
    const world = engine.createWorld();
    const catalog = createFrameCatalog({ data: syntheticFrameData() });
    const resolver = createFramesResolver(catalog);
    const earth = world.bodyAnchor(EARTH);
    const gcrf = catalog.get("GCRF");
    resolver.resolve(earth, gcrf, INSIDE_MS / 1000, new Float64Array(16));
    resolver.resolve(
      catalog.get("MOON_ICRF"),
      gcrf,
      INSIDE_MS / 1000,
      new Float64Array(16),
    );
    const users = new Map(
      catalog.treeInUse().map((f) => [f.frame.name, f.users]),
    );
    expect(users.get("GCRF")).toEqual(["rig"]);
    expect(users.get("MOON_ICRF")).toEqual(["rig"]);
    expect(users.get("ITRF")).toEqual(["application"]);
    engine.removeWorld(world);
  });

  it("motion: velocity and angular velocity by central differences", () => {
    const catalog = createFrameCatalog({ data: syntheticFrameData() });
    const resolver = createFramesResolver(catalog);
    const motion = {
      velocity: new Float64Array(3),
      angularVelocity: new Float64Array(3),
    };
    resolver.motion!(
      catalog.get("ITRF"),
      catalog.get("GCRF"),
      INSIDE_MS / 1000,
      motion,
    );
    // The Earth turns about its pole at its sidereal rate (7.292e-5 rad/s).
    expect(Math.hypot(...motion.angularVelocity)).toBeCloseTo(7.2921e-5, 8);
    expect(motion.angularVelocity[2]).toBeGreaterThan(7.29e-5);
    expect(maxDiff(motion.velocity, [0, 0, 0])).toBe(0);
    resolver.motion!(
      catalog.get("MOON_ICRF"),
      catalog.get("GCRF"),
      INSIDE_MS / 1000,
      motion,
    );
    // The Moon moves about 1 km/s about the Earth.
    const speed = Math.hypot(...motion.velocity);
    expect(speed).toBeGreaterThan(900);
    expect(speed).toBeLessThan(1100);
  });
});

describe("the frames resolver under the camera layer", () => {
  let engine: Engine;
  let world: World;
  let view: View;
  beforeAll(async () => {
    engine = await fakeEngine();
  });
  function setup(): void {
    world = engine.createWorld();
    view = engine.addView({ target: new OffscreenTarget(640, 360), world });
  }
  afterEach(() => {
    engine.removeWorld(world);
    vi.restoreAllMocks();
  });
  const cameraErrors = () => engine.errors.filter((e) => e.kind === "camera");

  it("the Earth's anchor binds to ITRF, so a rig on ITRF places it at the identity exactly", () => {
    setup();
    const errorsBefore = cameraErrors().length;
    const catalog = createFrameCatalog({ data: syntheticFrameData() });
    const earth = world.bodyAnchor(EARTH);
    const clock = new Clock({ time: Date.UTC(2026, 3, 6, 23, 17, 5, 123) });
    engine.cameras.setResolver(world, createFramesResolver(catalog));
    engine.cameras.setClock(world, clock);
    engine.cameras.setRig(view, {
      position: { frame: catalog.get("ITRF") },
      orientation: { kind: "free" },
    });
    for (let i = 0; i < 3; i++) {
      clock.time += 60_000;
      engine.cameras.update();
      expect(
        maxDiff(view.anchorPlacement(earth, new Float64Array(16)), IDENTITY),
      ).toBe(0);
      // The table root, unbound, sits at the render root's origin.
      expect(
        maxDiff(
          view.anchorPlacement(undefined, new Float64Array(16)),
          IDENTITY,
        ),
      ).toBe(0);
    }
    expect(cameraErrors().slice(errorsBefore)).toEqual([]);
  });

  it("data arriving wakes the engine and the next tick places the precise anchor", async () => {
    setup();
    const catalog = createFrameCatalog({ data: syntheticFrameData() });
    const earth = world.bodyAnchor(EARTH);
    const clock = new Clock({ time: INSIDE_MS });
    const wake = vi.spyOn(engine, "wake");
    engine.cameras.setResolver(
      world,
      createFramesResolver(catalog, { precision: "precise" }),
    );
    engine.cameras.setClock(world, clock);
    engine.cameras.setRig(view, {
      position: { frame: catalog.get("GCRF") },
      orientation: { kind: "free" },
    });
    const standIn = view.anchorPlacement(earth, new Float64Array(16));
    expect(catalog.precisionOf("ITRF")).toBe("analytic");
    wake.mockClear();
    await catalog.ready("ITRF", "precise");
    expect(wake).toHaveBeenCalled();
    engine.cameras.update();
    const precise = view.anchorPlacement(earth, new Float64Array(16));
    const expected = frameTransform(
      catalog.get("ITRF"),
      catalog.get("GCRF"),
      Instant.fromUtc(INSIDE_MS, catalog.leapSeconds),
    );
    expect(maxDiff(precise, expected)).toBeLessThan(1e-15);
    expect(maxDiff(precise, standIn)).toBeGreaterThan(1e-9);
  });

  it("a rig on a reference frame with no stand-in, loading: the last good placement, one warning naming it, placed once its data arrives", () => {
    setup();
    const catalog = createFrameCatalog({ data: syntheticFrameData() });
    const earth = world.bodyAnchor(EARTH);
    const itrf = catalog.get("ITRF");
    // An application's reference frame 1 km above the geocentre along z,
    // whose own data is still loading (it has no stand-in).
    let loaded = false;
    const site = new Frame("SITE", itrf, (_instant, out) => {
      if (!loaded) {
        throw new FrameUnavailableError("SITE", "loading");
      }
      out.set([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1000, 1]);
    });
    catalog.add(site);
    const clock = new Clock({ time: Date.UTC(2026, 3, 6) });
    engine.cameras.setResolver(world, createFramesResolver(catalog));
    engine.cameras.setClock(world, clock);
    engine.cameras.setRig(view, {
      position: { frame: itrf },
      orientation: { kind: "free" },
    });
    expect(
      maxDiff(view.anchorPlacement(earth, new Float64Array(16)), IDENTITY),
    ).toBe(0);
    const good = view.anchorPlacement(earth, new Float64Array(16));
    const before = cameraErrors().length;
    engine.cameras.setRig(view, {
      position: { frame: site },
      orientation: { kind: "free" },
    });
    for (let i = 0; i < 5; i++) {
      clock.time += 1000;
      engine.cameras.update();
      // The last good placement holds: no throw, no jump.
      expect([...view.anchorPlacement(earth, new Float64Array(16))]).toEqual([
        ...good,
      ]);
    }
    const reported = cameraErrors().slice(before);
    expect(reported).toHaveLength(1);
    expect(reported[0]!.message).toMatch(/SITE/);
    expect(reported[0]!.message).toMatch(/loading/);
    // The data arrives: the reference frame says its edge changed.
    loaded = true;
    site.invalidate();
    engine.cameras.update();
    const placed = view.anchorPlacement(earth, new Float64Array(16));
    expect(
      maxDiff([placed[12]!, placed[13]!, placed[14]!], [0, 0, -1000]),
    ).toBe(0);
    expect(cameraErrors().slice(before)).toHaveLength(1);
  });

  it("precise outside its data: the resolver draws on the stand-in, warns once stating its accuracy; measurement still throws", async () => {
    setup();
    const errorsBefore = cameraErrors().length;
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const catalog = createFrameCatalog({ data: dataWithEopEnd() });
    const earth = world.bodyAnchor(EARTH);
    const gcrf = catalog.get("GCRF");
    const itrf = catalog.get("ITRF");
    const resolver = createFramesResolver(catalog, { precision: "precise" });
    const clock = new Clock({ time: INSIDE_MS });
    engine.cameras.setResolver(world, resolver);
    engine.cameras.setClock(world, clock);
    engine.cameras.setRig(view, {
      position: { frame: gcrf },
      orientation: { kind: "free" },
    });
    await catalog.ready("ITRF", "precise");
    engine.cameras.update();
    const inside = view.anchorPlacement(earth, new Float64Array(16));
    expect(
      maxDiff(
        inside,
        frameTransform(
          itrf,
          gcrf,
          Instant.fromUtc(INSIDE_MS, catalog.leapSeconds),
        ),
      ),
    ).toBeLessThan(1e-15);
    // Scrub past the EOP predictions: the globe keeps turning, on the stand-in.
    const placements: number[][] = [];
    for (let day = 1; day <= 3; day++) {
      const ms = INSIDE_MS + day * 86_400_000 + 3_600_000 * day;
      clock.time = ms;
      engine.cameras.update();
      const m = view.anchorPlacement(earth, new Float64Array(16));
      placements.push([...m]);
      // The stand-in: icrfToFixed, transposed (ITRF in GCRF).
      const r = icrfToFixed(ms);
      const transposed = [0, 1, 2].flatMap((i) => [
        r[i]!,
        r[3 + i]!,
        r[6 + i]!,
      ]);
      expect(maxDiff(rotationOf(m), transposed)).toBeLessThan(1e-15);
      // Measurement still gets FrameUnavailableError.
      const instant = Instant.fromUtc(ms, catalog.leapSeconds);
      let error: unknown;
      try {
        frameTransform(gcrf, itrf, instant);
      } catch (e) {
        error = e;
      }
      expect(error).toBeInstanceOf(FrameUnavailableError);
      expect((error as FrameUnavailableError).reason).toBe("outsideData");
    }
    expect(placements[0]).not.toEqual(placements[1]);
    expect(cameraErrors().slice(errorsBefore)).toEqual([]);
    expect(resolver.warnings).toHaveLength(1);
    const warning = resolver.warnings[0]!;
    expect(warning.kind).toBe("standIn");
    expect(warning.frame).toBe("ITRF");
    expect(warning.accuracy).toEqual(ANALYTIC_ACCURACY.ITRF);
    expect(warning.message).toMatch(/ITRF/);
    expect(warning.message).toMatch(/18″/);
    expect(warn).toHaveBeenCalledTimes(1);
    // Back inside: precise again, and no further warning.
    clock.time = INSIDE_MS;
    engine.cameras.update();
    expect(
      maxDiff(view.anchorPlacement(earth, new Float64Array(16)), inside),
    ).toBe(0);
    expect(resolver.warnings).toHaveLength(1);
    // Out again: a new episode, one more warning.
    clock.time = INSIDE_MS + 5 * 86_400_000;
    engine.cameras.update();
    expect(resolver.warnings).toHaveLength(2);
    expect(cameraErrors().slice(errorsBefore)).toEqual([]);
  });

  it("outside the data, a second resolve at the same instant doesn't ask the precise edge again", async () => {
    setup();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const catalog = createFrameCatalog({ data: dataWithEopEnd() });
    const resolver = createFramesResolver(catalog, { precision: "precise" });
    const itrf = catalog.get("ITRF");
    const gcrf = catalog.get("GCRF");
    resolver.routeRevision(itrf, gcrf);
    await catalog.ready("ITRF", "precise");
    const seconds = (INSIDE_MS + 86_400_000) / 1000;
    const toParent = vi.spyOn(itrf, "toParent");
    const out = new Float64Array(16);
    resolver.resolve(itrf, gcrf, seconds, out);
    const first = Float64Array.from(out);
    resolver.resolve(itrf, gcrf, seconds, out);
    resolver.resolve(gcrf, itrf, seconds, out);
    expect(toParent).toHaveBeenCalledTimes(1);
    resolver.resolve(itrf, gcrf, seconds, out);
    expect(maxDiff(out, first)).toBe(0);
    // Another instant asks again.
    resolver.resolve(itrf, gcrf, seconds + 1, out);
    expect(toParent).toHaveBeenCalledTimes(2);
  });

  it("rebinding an anchor with the clock paused re-places it on the next tick", () => {
    setup();
    const catalog = createFrameCatalog({ data: syntheticFrameData() });
    const gcrf = catalog.get("GCRF");
    const at = (x: number) => (_instant: Instant, out: Float64Array) => {
      out.set([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, 0, 0, 1]);
    };
    // Two application reference frames under GCRF; the first has been
    // invalidated once, so a sum of revisions over the route would not
    // change when the binding moves from it to the second.
    const first = new Frame("FIRST", gcrf, at(1000));
    const second = new Frame("SECOND", gcrf, at(2000));
    first.invalidate();
    catalog.add(first);
    catalog.add(second);
    const site = world.addAnchor("site");
    const resolver = createFramesResolver(catalog);
    resolver.bindAnchor(site, first);
    const clock = new Clock({ time: INSIDE_MS, mode: "paused" });
    engine.cameras.setResolver(world, resolver);
    engine.cameras.setClock(world, clock);
    engine.cameras.setRig(view, {
      position: { frame: gcrf },
      orientation: { kind: "free" },
    });
    expect(view.anchorPlacement(site, new Float64Array(16))[12]).toBe(1000);
    // The route's own revision changes, not only the table root's.
    const before = resolver.routeRevision(site, gcrf);
    resolver.bindAnchor(site, second);
    expect(resolver.routeRevision(site, gcrf)).not.toBe(before);
    engine.cameras.update();
    expect(view.anchorPlacement(site, new Float64Array(16))[12]).toBe(2000);
  });

  it("a host's edge that is slightly off rigid reaches the camera layer's refusal", () => {
    setup();
    const errorsBefore = cameraErrors().length;
    const catalog = createFrameCatalog({ data: syntheticFrameData() });
    const gcrf = catalog.get("GCRF");
    // Scaled by 1 + 1e-8: past the camera layer's 1e-9, well inside 1e-6.
    const k = 1 + 1e-8;
    const scaled = new Frame("SCALED", gcrf, (_instant, out) => {
      out.set([k, 0, 0, 0, 0, k, 0, 0, 0, 0, k, 0, 0, 0, 0, 1]);
    });
    catalog.add(scaled);
    const site = world.addAnchor("site");
    const resolver = createFramesResolver(catalog);
    resolver.bindAnchor(site, scaled);
    const m = resolver.resolve(
      site,
      gcrf,
      INSIDE_MS / 1000,
      new Float64Array(16),
    );
    expect(m[0]).toBe(k);
    engine.cameras.setResolver(world, resolver);
    engine.cameras.setClock(world, new Clock({ time: INSIDE_MS }));
    engine.cameras.setRig(view, {
      position: { frame: gcrf },
      orientation: { kind: "free" },
    });
    const reported = cameraErrors().slice(errorsBefore);
    expect(reported).toHaveLength(1);
    expect(reported[0]!.message).toMatch(/not rigid|orthonormal/);
  });

  it("removing a world stops watching its resolver", () => {
    setup();
    const catalog = createFrameCatalog({ data: syntheticFrameData() });
    const resolver = createFramesResolver(catalog);
    const unwatch = vi.fn();
    vi.spyOn(resolver, "watch").mockReturnValue(unwatch);
    engine.cameras.setResolver(world, resolver);
    engine.removeWorld(world);
    expect(unwatch).toHaveBeenCalledTimes(1);
    // afterEach removes it again: harmless.
  });
});
