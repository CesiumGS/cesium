// The camera layer (plan 5a, Task 11): the frame resolver over the core's
// transform table, rigs in their generic form, and the layer that picks
// each view's render root, re-roots, places the anchors each tick, stays
// awake while they move, falls back on errors, and guards the controls
// that read the camera as Earth-fixed.
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import {
  FrameUnavailableError,
  type FrameKey,
  type FrameResolver,
} from "../src/camera/frameResolver.ts";
import { defaultRig, type Rig } from "../src/camera/rig.ts";
import type { ClockChange, SceneClock } from "../src/core/sceneClock.ts";
import { EARTH, MOON } from "../src/scene/Body.ts";
import type { Engine } from "../src/scene/Engine.ts";
import { GlobeController } from "../src/scene/GlobeController.ts";
import { InspectController } from "../src/scene/InspectController.ts";
import { OrbitController } from "../src/scene/OrbitController.ts";
import { OffscreenTarget, type View } from "../src/scene/View.ts";
import type { AnchorHandle, World } from "../src/scene/World.ts";
import { fakeEngine } from "./fakeGpu.ts";

/** Column-major translation by (x, y, z). */
function translation(x: number, y: number, z: number): Float64Array {
  const m = new Float64Array(16);
  m[0] = m[5] = m[10] = m[15] = 1;
  m[12] = x;
  m[13] = y;
  m[14] = z;
  return m;
}

/** A rotation by `angle` about the unit `axis`, then a translation by `t`. */
function rigid(
  axis: readonly [number, number, number],
  angle: number,
  t: readonly [number, number, number],
): Float64Array {
  const [x, y, z] = axis;
  const c = Math.cos(angle),
    s = Math.sin(angle),
    k = 1 - c;
  // prettier-ignore
  return new Float64Array([
    c + x * x * k,     y * x * k + z * s, z * x * k - y * s, 0,
    x * y * k - z * s, c + y * y * k,     z * y * k + x * s, 0,
    x * z * k + y * s, y * z * k - x * s, c + z * z * k,     0,
    t[0], t[1], t[2], 1,
  ]);
}

const IDENTITY = translation(0, 0, 0);

/** A scene clock set by hand. */
class FakeClock implements SceneClock {
  seconds = 0;
  rate = 1;
  paused = false;
  change: ClockChange = "steady";
  private readonly listeners = new Set<() => void>();
  watch(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  get watchers(): number {
    return this.listeners.size;
  }
  set(seconds: number, change: ClockChange = "jump"): void {
    this.seconds = seconds;
    this.change = change;
    for (const listener of this.listeners) {
      listener();
    }
  }
  pause(paused: boolean): void {
    this.paused = paused;
    for (const listener of this.listeners) {
      listener();
    }
  }
}

/**
 * A resolver over a table of reference frames whose places in a common
 * root are functions of scene seconds, counting its calls.
 */
function timedResolver(
  places: Map<FrameKey, (seconds: number) => Float64Array>,
): FrameResolver & { calls: number; revision: number } {
  const inverse = (m: Float64Array): Float64Array => {
    // Rigid: Rᵀ and -Rᵀ t.
    const out = new Float64Array(16);
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        out[c * 4 + r] = m[r * 4 + c]!;
      }
    }
    for (let r = 0; r < 3; r++) {
      out[12 + r] = -(
        out[r]! * m[12]! +
        out[4 + r]! * m[13]! +
        out[8 + r]! * m[14]!
      );
    }
    out[15] = 1;
    return out;
  };
  const multiply = (a: Float64Array, b: Float64Array, out: Float64Array) => {
    const r = new Float64Array(16);
    for (let col = 0; col < 4; col++) {
      for (let row = 0; row < 4; row++) {
        let sum = 0;
        for (let k = 0; k < 4; k++) {
          sum += a[k * 4 + row]! * b[col * 4 + k]!;
        }
        r[col * 4 + row] = sum;
      }
    }
    out.set(r);
    return out;
  };
  const place = (key: FrameKey, seconds: number): Float64Array => {
    const f = places.get(key);
    if (!f) {
      throw new Error(`timedResolver: ${key.name} is unknown`);
    }
    return f(seconds);
  };
  const resolver = {
    calls: 0,
    revision: 0,
    resolve(
      frame: FrameKey,
      base: FrameKey,
      seconds: number,
      out: Float64Array,
    ): Float64Array {
      resolver.calls++;
      return multiply(
        inverse(place(base, seconds)),
        place(frame, seconds),
        out,
      );
    },
    routeRevision(): number {
      return resolver.revision;
    },
  };
  return resolver;
}

function expectClose(
  actual: ArrayLike<number>,
  expected: ArrayLike<number>,
  tolerance: number,
): void {
  expect(actual.length).toBe(expected.length);
  for (let i = 0; i < expected.length; i++) {
    expect(Math.abs(actual[i]! - expected[i]!)).toBeLessThanOrEqual(tolerance);
  }
}

const cameraErrors = (engine: Engine) =>
  engine.errors.filter((e) => e.kind === "camera");

describe("the camera layer", () => {
  let engine: Engine;
  let world: World;
  let view: View;
  let earth: AnchorHandle;
  let moon: AnchorHandle;
  beforeAll(async () => {
    engine = await fakeEngine();
  });
  function setup(): void {
    world = engine.createWorld();
    view = engine.addView({ target: new OffscreenTarget(640, 360), world });
    earth = world.bodyAnchor(EARTH);
    moon = world.bodyAnchor(MOON);
  }
  afterEach(() => {
    engine.removeWorld(world);
    vi.restoreAllMocks();
  });

  it("a globe-only tick does no resolve work on the default rig", () => {
    setup();
    // Spies on what the table resolver reads: an anchor's place, a node's matrix.
    const places = vi.spyOn(world, "anchorMatrix");
    const nodes = vi.spyOn(world, "worldMatrix");
    const clock = new FakeClock();
    engine.cameras.setClock(world, clock);
    const node = world.addTransform(IDENTITY, earth);
    const revision = view.anchorRevision;
    for (let i = 0; i < 10; i++) {
      // A running clock and an animated node under the Earth: neither is
      // an input of the default rig's placements.
      clock.set(1_000 + i, "steady");
      world.setTransform(node, translation(i, 0, 0));
      expect(engine.cameras.update()).toBe(false);
      engine.renderFrame();
    }
    expect(places).not.toHaveBeenCalled();
    expect(nodes.mock.calls.every(([h]) => h !== earth && h !== moon)).toBe(
      true,
    );
    expect(view.anchorRevision).toBe(revision);
    for (const anchor of [earth, moon, undefined]) {
      expect(view.anchorPlacement(anchor)).toEqual(IDENTITY);
    }
    expect(engine.cameras.root(view)).toBe(world.root);
    expect(engine.cameras.rig(view)).toEqual(defaultRig(world));
    expect(engine.cameras.clock(world)).toBe(clock);
  });

  it("the default rig places what the table places: placeAnchor reaches the view", () => {
    setup();
    const moonPlace = rigid([0, 0, 1], 0.3, [384_400_000, 0, 0]);
    world.placeAnchor(moon, moonPlace);
    engine.cameras.update();
    expect(view.anchorPlacement(moon)).toEqual(moonPlace);
    expect(view.anchorPlacement(earth)).toEqual(IDENTITY);
    // Then nothing again until a place changes.
    const places = vi.spyOn(world, "anchorMatrix");
    expect(engine.cameras.update()).toBe(false);
    expect(places).not.toHaveBeenCalled();
    // A new place reaches it too.
    world.placeAnchor(moon, translation(1, 2, 3));
    engine.cameras.update();
    expect(view.anchorPlacement(moon)).toEqual(translation(1, 2, 3));
    // The default rig set explicitly is the same rig.
    engine.cameras.setRig(view, defaultRig(world));
    expect(view.anchorPlacement(moon)).toEqual(translation(1, 2, 3));
    // A new anchor, placed.
    const site = world.addAnchor("site");
    world.placeAnchor(site, translation(5, 0, 0));
    engine.cameras.update();
    expect(view.anchorPlacement(site)).toEqual(translation(5, 0, 0));
  });

  it("setResolver under the default rig: the host's resolver places the anchors each tick", () => {
    setup();
    const resolver = timedResolver(
      new Map<FrameKey, (s: number) => Float64Array>([
        [world.root, () => IDENTITY],
        [earth, (s) => translation(0, s, 0)],
        [moon, () => translation(9, 0, 0)],
      ]),
    );
    let revisions = 0;
    engine.cameras.setResolver(world, {
      resolve: (f, b, s, out) => resolver.resolve(f, b, s, out),
      routeRevision: (f, b) => {
        revisions++;
        return resolver.routeRevision(f, b);
      },
    });
    const clock = new FakeClock();
    clock.set(4);
    engine.cameras.setClock(world, clock);
    expect(engine.cameras.update()).toBe(true);
    expect(view.anchorPlacement(earth)).toEqual(translation(0, 4, 0));
    expect(view.anchorPlacement(moon)).toEqual(translation(9, 0, 0));
    // The normal per-route check: no resolve while nothing changes.
    const calls = resolver.calls;
    expect(engine.cameras.update()).toBe(false);
    expect(resolver.calls).toBe(calls);
    expect(revisions).toBeGreaterThan(0);
    // A placement set by hand is put back on the next tick.
    view.setAnchorPlacement(moon, translation(0, 0, 1));
    engine.cameras.update();
    expect(view.anchorPlacement(moon)).toEqual(translation(9, 0, 0));
    clock.set(5, "steady");
    expect(engine.cameras.update()).toBe(true);
    expect(view.anchorPlacement(earth)).toEqual(translation(0, 5, 0));
  });

  it("a resolver that can watch wakes the loop; replacing it stops watching it", () => {
    setup();
    let listener: (() => void) | undefined;
    const watched: FrameResolver = {
      resolve: (_frame, _base, _seconds, out) => {
        out.set(IDENTITY);
        return out;
      },
      routeRevision: () => 0,
      watch(l) {
        listener = l;
        return () => {
          listener = undefined;
        };
      },
    };
    engine.cameras.setResolver(world, watched);
    expect(listener).toBeDefined();
    const wake = vi.spyOn(engine, "wake");
    listener!();
    expect(wake).toHaveBeenCalledTimes(1);
    engine.cameras.setResolver(world, timedResolver(new Map()));
    expect(listener).toBeUndefined();
  });

  it("a rig follows a moving node of the transform table without the frames module", () => {
    setup();
    const node = world.addTransform(translation(0, 0, 0));
    const car = world.frameOf(node, "car");
    engine.cameras.setRig(view, {
      position: { frame: world.root, anchor: car, offset: [0, -10, 2] },
      orientation: {
        kind: "aim",
        target: world.frameOf(node, "car"),
        upFrame: world.root,
        up: [0, 0, 1],
      },
    });
    expect(Array.from(view.camera.position)).toEqual([0, -10, 2]);
    world.setTransform(node, translation(100, 0, 0));
    engine.cameras.update();
    expect(Array.from(view.camera.position)).toEqual([100, -10, 2]);
    const d = Math.hypot(10, 2);
    expectClose(view.camera.direction, [0, 10 / d, -2 / d], 1e-15);
    expectClose(view.camera.right, [1, 0, 0], 1e-15);
    expectClose(view.camera.up, [0, 2 / d, 10 / d], 1e-15);
    // Nothing moved since: no camera write, no work.
    const version = view.camera.version;
    expect(engine.cameras.update()).toBe(false);
    expect(view.camera.version).toBe(version);
    // The table resolver's answers: the node in the table root, an anchor
    // at its place, and the route revision going up with the table.
    const resolver = engine.cameras.resolver(world);
    const out = new Float64Array(16);
    expect(resolver.resolve(car, world.root, 0, out)).toEqual(
      translation(100, 0, 0),
    );
    const under = world.addTransform(translation(1, 2, 3), moon);
    world.placeAnchor(moon, translation(10, 0, 0));
    expect(
      resolver.resolve(world.frameOf(under, "lander"), car, 0, out),
    ).toEqual(translation(-89, 2, 3));
    const before = resolver.routeRevision(car, world.root);
    world.setTransform(node, translation(101, 0, 0));
    expect(resolver.routeRevision(car, world.root)).toBeGreaterThan(before);
    expect(() =>
      resolver.resolve({ name: "elsewhere" }, world.root, 0, out),
    ).toThrow(/elsewhere is not a reference frame of this world/);
    world.removeTransform(under);
    expect(() =>
      resolver.resolve(world.frameOf(node, "car"), world.root, 0, out),
    ).not.toThrow();
  });

  it("re-rooting re-expresses the camera: the camera in each anchor is unchanged", () => {
    setup();
    world.placeAnchor(moon, rigid([0.6, 0, 0.8], 1.1, [384_400_000, 0, 0]));
    const site = world.addTransform(
      rigid([0, 0, 1], 0.4, [1_000, 2_000, 1_737_400]),
      moon,
    );
    engine.cameras.setRig(view, {
      position: { frame: earth },
      orientation: { kind: "free" },
    });
    expect(engine.cameras.root(view)).toBe(earth);
    const camera = view.camera;
    camera.position.set([380_000_000, 1_000_000, 2_000_000]);
    camera.direction.set([0, 0.6, -0.8]);
    camera.up.set([0, 0.8, 0.6]);
    camera.right.set([1, 0, 0]);
    camera.version++;
    engine.cameras.update();
    const inEach = () =>
      [earth, moon, undefined].map((a) => view.anchorCamera(a));
    const before = inEach();
    engine.cameras.setRig(view, {
      position: { frame: world.frameOf(site, "site") },
      orientation: { kind: "free" },
    });
    expect(engine.cameras.root(view)).toEqual(world.frameOf(site, "site"));
    engine.cameras.update();
    const after = inEach();
    for (let k = 0; k < 3; k++) {
      expectClose(after[k]!.position, before[k]!.position, 1e-6);
      expectClose(after[k]!.direction, before[k]!.direction, 1e-12);
      expectClose(after[k]!.up, before[k]!.up, 1e-12);
    }
    // In the site's own coordinates, a few thousand km from it.
    expect(Math.hypot(...camera.position)).toBeLessThan(10_000_000);
    // And back to the default rig: one pass, the placements back at the
    // identity, the camera in the table root again.
    engine.cameras.setRig(view, defaultRig(world));
    expect(engine.cameras.root(view)).toBe(world.root);
    expect(view.anchorPlacement(earth)).toEqual(IDENTITY);
    const back = inEach();
    for (let k = 0; k < 3; k++) {
      expectClose(back[k]!.position, before[k]!.position, 1e-6);
      expectClose(back[k]!.direction, before[k]!.direction, 1e-12);
    }
  });

  it("evaluates at the clock's seconds, stays awake while it runs and settles when paused", () => {
    setup();
    const resolver = timedResolver(
      new Map<FrameKey, (s: number) => Float64Array>([
        [world.root, () => IDENTITY],
        [earth, () => IDENTITY],
        [moon, (s) => translation(1_000 * s, 0, 0)],
      ]),
    );
    engine.cameras.setResolver(world, resolver);
    const clock = new FakeClock();
    clock.set(10);
    engine.cameras.setClock(world, clock);
    engine.cameras.setRig(view, {
      position: { frame: earth },
      orientation: { kind: "free" },
    });
    expect(view.anchorPlacement(moon)).toEqual(translation(10_000, 0, 0));
    // Same time, same routes: no work.
    const calls = resolver.calls;
    expect(engine.cameras.update()).toBe(false);
    expect(resolver.calls).toBe(calls);
    // Running: placed at the new seconds, and awake.
    clock.set(11, "steady");
    expect(engine.cameras.update()).toBe(true);
    expect(view.anchorPlacement(moon)).toEqual(translation(11_000, 0, 0));
    // Paused: it settles.
    clock.pause(true);
    expect(engine.cameras.update()).toBe(false);
    // A rig on the moving reference frame moves the camera with it.
    clock.pause(false);
    engine.cameras.setRig(view, {
      position: { frame: earth, anchor: moon, offset: [0, 0, 5] },
      orientation: { kind: "free" },
    });
    expect(Array.from(view.camera.position)).toEqual([11_000, 0, 5]);
    clock.set(12, "steady");
    expect(engine.cameras.update()).toBe(true);
    expect(Array.from(view.camera.position)).toEqual([12_000, 0, 5]);
    // A route revision forces work at the same seconds.
    const again = resolver.calls;
    resolver.revision++;
    expect(engine.cameras.update()).toBe(false);
    expect(resolver.calls).toBeGreaterThan(again);
  });

  it("joins the engine loop's busy: awake while placements move, asleep once paused", async () => {
    setup();
    let now = 1_000;
    const queue = new Map<number, FrameRequestCallback>();
    let handle = 1;
    vi.spyOn(performance, "now").mockImplementation(() => now);
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      queue.set(handle, cb);
      return handle++;
    });
    vi.stubGlobal("cancelAnimationFrame", (h: number) => queue.delete(h));
    const frames = async (n: number) => {
      for (let i = 0; i < n; i++) {
        now += 1000 / 60;
        const due = [...queue.values()];
        queue.clear();
        for (const cb of due) {
          cb(now);
        }
        await new Promise((resolve) => setImmediate(resolve));
      }
    };
    try {
      engine.cameras.setResolver(
        world,
        timedResolver(
          new Map<FrameKey, (s: number) => Float64Array>([
            [world.root, () => IDENTITY],
            [earth, () => IDENTITY],
            [moon, (s) => translation(1_000 * s, 0, 0)],
          ]),
        ),
      );
      const clock = new FakeClock();
      engine.cameras.setClock(world, clock);
      engine.cameras.setRig(view, {
        position: { frame: earth },
        orientation: { kind: "free" },
      });
      // The clock advances in a tick listener that never keeps the loop
      // awake itself: only the camera layer does.
      engine.onTick(() => {
        if (!clock.paused) {
          clock.seconds += 1;
        }
        return false;
      });
      engine.start();
      await frames(10);
      expect(queue.size).toBe(1);
      expect(view.anchorPlacement(moon)[12]).toBeGreaterThan(5_000);
      clock.pause(true);
      await frames(5);
      expect(queue.size).toBe(0);
      expect(engine.stats.idle).toBe(true);
      // Resuming wakes it (the clock's watch).
      clock.pause(false);
      expect(queue.size).toBe(1);
      const x = view.anchorPlacement(moon)[12]!;
      await frames(3);
      expect(view.anchorPlacement(moon)[12]).toBeGreaterThan(x);
      // renderFrame outside the loop places first.
      engine.stop();
      clock.seconds += 100;
      engine.renderFrame();
      expect(view.anchorPlacement(moon)[12]).toBe(clock.seconds * 1_000);
    } finally {
      engine.stop();
      vi.unstubAllGlobals();
    }
  });

  it("a clock that jumps back years re-evaluates there, with no stale placement", () => {
    setup();
    // The Moon's anchor on a slow circle, so every year places it apart.
    const orbit = (s: number) => {
      const a = (2 * Math.PI * s) / 2_360_591;
      return rigid([0, 0, 1], a, [
        384_400_000 * Math.cos(a),
        384_400_000 * Math.sin(a),
        0,
      ]);
    };
    const resolver = timedResolver(
      new Map<FrameKey, (s: number) => Float64Array>([
        [world.root, () => IDENTITY],
        [earth, () => IDENTITY],
        [moon, orbit],
      ]),
    );
    engine.cameras.setResolver(world, resolver);
    const clock = new FakeClock();
    clock.set(2_000_000_000);
    engine.cameras.setClock(world, clock);
    let wakes = 0;
    const wake = vi.spyOn(engine, "wake").mockImplementation(() => wakes++);
    engine.cameras.setRig(view, {
      position: { frame: moon, offset: [0, 0, 2_000_000] },
      orientation: {
        kind: "axes",
        frame: earth,
        forward: [1, 0, 0],
        up: [0, 0, 1],
      },
    });
    const check = (seconds: number) => {
      const inMoon = orbit(seconds);
      const earthInMoon = resolver.resolve(
        earth,
        moon,
        seconds,
        new Float64Array(16),
      );
      expectClose(view.anchorPlacement(earth), earthInMoon, 1e-6);
      expect(view.anchorPlacement(moon)).toEqual(IDENTITY);
      expect(Array.from(view.camera.position)).toEqual([0, 0, 2_000_000]);
      // The camera looks along the Earth's x axis, in the Moon's axes.
      expectClose(
        view.camera.direction,
        [inMoon[0]!, inMoon[4]!, inMoon[8]!],
        1e-12,
      );
    };
    check(2_000_000_000);
    // Paused and scrubbed ten years back: it wakes the loop, and the next
    // tick evaluates there.
    clock.pause(true);
    wakes = 0;
    clock.set(2_000_000_000 - 315_576_000, "jump");
    expect(wakes).toBeGreaterThan(0);
    expect(engine.cameras.update()).toBe(false); // paused: it settles
    check(2_000_000_000 - 315_576_000);
    // Running backward at 3,600×: each tick at its own time.
    clock.pause(false);
    for (let i = 1; i <= 3; i++) {
      clock.set(2_000_000_000 - 315_576_000 - 60 * i, "reverse");
      expect(engine.cameras.update()).toBe(true);
      check(2_000_000_000 - 315_576_000 - 60 * i);
    }
    wake.mockRestore();
  });

  it("a resolver that throws or returns NaN keeps the last good placements and reports once", () => {
    setup();
    const site = world.addAnchor("site");
    let failing = false;
    let nan = false;
    const resolver = timedResolver(
      new Map<FrameKey, (s: number) => Float64Array>([
        [world.root, () => IDENTITY],
        [earth, (s) => translation(s, 0, 0)],
        [
          moon,
          (s) => {
            if (failing) {
              throw new FrameUnavailableError("MOON_ME", "loading");
            }
            return translation(2 * s, 0, 0);
          },
        ],
        [
          site,
          (s) =>
            nan ? translation(Number.NaN, 0, 0) : translation(3 * s, 0, 0),
        ],
      ]),
    );
    engine.cameras.setResolver(world, resolver);
    const clock = new FakeClock();
    clock.set(1);
    engine.cameras.setClock(world, clock);
    engine.cameras.setRig(view, {
      position: { frame: world.root, anchor: moon, offset: [0, 0, 10] },
      orientation: { kind: "aim", target: site, upFrame: earth, up: [0, 0, 1] },
    });
    expect(view.anchorPlacement(moon)).toEqual(translation(2, 0, 0));
    expect(Array.from(view.camera.position)).toEqual([2, 0, 10]);
    const pose = Array.from(view.camera.direction);
    failing = true;
    nan = true;
    const cameras = engine.cameras;
    for (let s = 2; s < 7; s++) {
      clock.set(s, "steady");
      expect(() => cameras.update()).not.toThrow();
    }
    // The good one moved on; the others kept their last good placement,
    // and the camera its last good pose.
    expect(view.anchorPlacement(earth)).toEqual(translation(6, 0, 0));
    expect(view.anchorPlacement(moon)).toEqual(translation(2, 0, 0));
    expect(view.anchorPlacement(site)).toEqual(translation(3, 0, 0));
    expect(Array.from(view.camera.position)).toEqual([2, 0, 10]);
    expect(Array.from(view.camera.direction)).toEqual(pose);
    // Once per view and reference frame, each naming it.
    const errors = cameraErrors(engine);
    const moonError = errors.filter((e) => e.message.includes("Moon"));
    const siteError = errors.filter((e) => e.message.includes("site"));
    expect(moonError).toHaveLength(1);
    expect(moonError[0]!.count).toBe(1);
    expect(moonError[0]!.message).toMatch(/MOON_ME: its data is still loading/);
    expect(siteError).toHaveLength(1);
    expect(siteError[0]!.count).toBe(1);
    expect(siteError[0]!.message).toMatch(/not finite/);
    // When the data arrives (a route revision), the next tick places it.
    failing = false;
    nan = false;
    resolver.revision++;
    engine.cameras.update();
    expect(view.anchorPlacement(moon)).toEqual(translation(12, 0, 0));
    expect(view.anchorPlacement(site)).toEqual(translation(18, 0, 0));
    expect(Array.from(view.camera.position)).toEqual([12, 0, 10]);
    // A host resolver whose routeRevision throws doesn't throw the tick.
    engine.cameras.setResolver(world, {
      resolve: () => {
        throw new Error("the host's service is down");
      },
      routeRevision: () => {
        throw new Error("the host's service is down");
      },
    });
    expect(() => engine.cameras.update()).not.toThrow();
    expect(view.anchorPlacement(moon)).toEqual(translation(12, 0, 0));
    // A rig that can't be re-rooted yet keeps its old root and pose.
    engine.cameras.setResolver(world, resolver);
    failing = true;
    const position = Array.from(view.camera.position);
    engine.cameras.setRig(view, {
      position: { frame: moon },
      orientation: { kind: "free" },
    });
    expect(engine.cameras.root(view)).toBe(world.root);
    expect(Array.from(view.camera.position)).toEqual(position);
    failing = false;
    resolver.revision++;
    engine.cameras.update();
    expect(engine.cameras.root(view)).toBe(moon);
    expect(Array.from(view.camera.position)).toEqual([0, 0, 10]);
  });

  it("refuses a rig with a non-finite or degenerate vector, naming it", () => {
    setup();
    const rig = (r: Partial<Rig["position"]>, o?: Rig["orientation"]): Rig => ({
      position: { frame: earth, ...r },
      orientation: o ?? { kind: "free" },
    });
    expect(() =>
      engine.cameras.setRig(view, rig({ offset: [0, Number.NaN, 0] })),
    ).toThrow(/setRig: the position's offset is not 3 finite numbers/);
    expect(() =>
      engine.cameras.setRig(
        view,
        rig(
          {},
          { kind: "axes", frame: earth, forward: [0, 0, 0], up: [0, 0, 1] },
        ),
      ),
    ).toThrow(/setRig: the orientation's forward is not a direction/);
    expect(() =>
      engine.cameras.setRig(
        view,
        rig(
          {},
          { kind: "aim", target: moon, upFrame: earth, up: [Infinity, 0, 0] },
        ),
      ),
    ).toThrow(/setRig: the orientation's up is not a direction/);
    expect(engine.cameras.root(view)).toBe(world.root);
  });

  it("axes and aim orientations follow their reference frames", () => {
    setup();
    const node = world.addTransform(IDENTITY);
    const axes = world.frameOf(node, "body axes");
    engine.cameras.setRig(view, {
      position: { frame: earth, offset: [7, 8, 9] },
      orientation: {
        kind: "axes",
        frame: axes,
        forward: [1, 0, 0],
        up: [0, 0, 1],
      },
    });
    expectClose(view.camera.direction, [1, 0, 0], 1e-15);
    expectClose(view.camera.up, [0, 0, 1], 1e-15);
    world.setTransform(node, rigid([0, 0, 1], Math.PI / 2, [0, 0, 0]));
    engine.cameras.update();
    expectClose(view.camera.direction, [0, 1, 0], 1e-15);
    expectClose(view.camera.up, [0, 0, 1], 1e-15);
    expectClose(view.camera.right, [1, 0, 0], 1e-15);
    expect(Array.from(view.camera.position)).toEqual([7, 8, 9]);
    // Aim: from where the controller put the camera (no offset), at a
    // target that moves; re-aimed when the controller moves the camera.
    const target = world.addTransform(translation(0, 100, 0), moon);
    engine.cameras.setRig(view, {
      position: { frame: earth },
      orientation: {
        kind: "aim",
        target: world.frameOf(target, "target"),
        upFrame: earth,
        up: [0, 0, 1],
      },
    });
    expectClose(view.camera.direction, normalize([-7, 92, -9]), 1e-15);
    view.camera.position.set([0, 0, 0]);
    view.camera.version++;
    engine.cameras.update();
    expectClose(view.camera.direction, [0, 1, 0], 1e-15);
    world.placeAnchor(moon, translation(0, 0, 100));
    engine.cameras.update();
    expectClose(view.camera.direction, normalize([0, 100, 100]), 1e-15);
    // A target at the camera can't be aimed at: the last good pose stays.
    const direction = Array.from(view.camera.direction);
    view.camera.position.set([0, 100, 100]);
    view.camera.version++;
    expect(() => engine.cameras.update()).not.toThrow();
    expect(Array.from(view.camera.direction)).toEqual(direction);
    expect(cameraErrors(engine).some((e) => e.message.includes("target"))).toBe(
      true,
    );
  });

  it("reports each failure episode once: fail, recover, fail again", () => {
    setup();
    let state: "ok" | "loading" | "failed" = "ok";
    const resolver = timedResolver(
      new Map<FrameKey, (s: number) => Float64Array>([
        [world.root, () => IDENTITY],
        [earth, () => IDENTITY],
        [
          moon,
          (s) => {
            if (state !== "ok") {
              throw new FrameUnavailableError("MOON_PA", state);
            }
            return translation(s, 0, 0);
          },
        ],
      ]),
    );
    engine.cameras.setResolver(world, resolver);
    const clock = new FakeClock();
    engine.cameras.setClock(world, clock);
    engine.cameras.setRig(view, {
      position: { frame: earth },
      orientation: { kind: "free" },
    });
    const episodes = () =>
      cameraErrors(engine)
        .filter((e) => e.message.includes("MOON_PA"))
        .map((e) => [e.message.match(/\((\w+)\)/)![1], e.count]);
    const tick = (s: number) => {
      clock.set(s, "steady");
      engine.cameras.update();
    };
    state = "loading";
    tick(1);
    tick(2);
    expect(episodes()).toEqual([["loading", 1]]);
    // Loading turns into a failed load: a new report.
    state = "failed";
    tick(3);
    expect(episodes()).toEqual([
      ["loading", 1],
      ["failed", 1],
    ]);
    // Recovered, then failing again: reported again.
    state = "ok";
    tick(4);
    expect(view.anchorPlacement(moon)).toEqual(translation(4, 0, 0));
    state = "loading";
    tick(5);
    tick(6);
    expect(episodes()).toEqual([
      ["loading", 2],
      ["failed", 1],
    ]);
    // setResolver and setRig start afresh too.
    engine.cameras.setResolver(world, resolver);
    tick(7);
    expect(episodes()).toEqual([
      ["loading", 3],
      ["failed", 1],
    ]);
    engine.cameras.setRig(view, {
      position: { frame: earth },
      orientation: { kind: "free" },
    });
    expect(episodes()).toEqual([
      ["loading", 4],
      ["failed", 1],
    ]);
    expect(view.anchorPlacement(moon)).toEqual(translation(4, 0, 0));
  });

  it("a non-rigid answer while a re-root waits and the clock runs reports once, in either direction", () => {
    setup();
    // The review's case: every answer involving Deimos has a NaN, so the
    // re-root (table root in Deimos) and the placement (Deimos in the
    // table root) fail alike, tick after tick.
    const deimos = world.addAnchor("Deimos");
    const resolver: FrameResolver = {
      resolve(frame, base, _seconds, out) {
        out.set(IDENTITY);
        if (frame === deimos || base === deimos) {
          out[12] = Number.NaN;
        }
        return out;
      },
      routeRevision: () => 0,
    };
    engine.cameras.setResolver(world, resolver);
    const clock = new FakeClock();
    engine.cameras.setClock(world, clock);
    engine.cameras.setRig(view, {
      position: { frame: deimos },
      orientation: { kind: "free" },
    });
    for (let s = 1; s <= 5; s++) {
      clock.set(s, "steady");
      engine.cameras.update();
    }
    expect(engine.cameras.root(view)).toBe(world.root);
    const errors = cameraErrors(engine).filter((e) =>
      e.message.includes("Deimos"),
    );
    expect(errors.map((e) => e.count)).toEqual([1]);
    expect(errors[0]!.message).toMatch(
      /until it can re-root on Deimos: .*is not rigid: it has a value that is not finite/,
    );
  });

  it("a hand-set placement doesn't survive once anything is placed", () => {
    setup();
    world.placeAnchor(moon, translation(7, 0, 0));
    engine.cameras.update();
    const places = vi.spyOn(world, "anchorMatrix");
    view.setAnchorPlacement(moon, translation(0, 0, 1));
    engine.cameras.update();
    expect(view.anchorPlacement(moon)).toEqual(translation(7, 0, 0));
    expect(places).toHaveBeenCalled();
    // And nothing after that.
    places.mockClear();
    expect(engine.cameras.update()).toBe(false);
    expect(places).not.toHaveBeenCalled();
  });

  it("re-roots away from a removed root without re-expressing, and retries a waiting re-root only on change", () => {
    setup();
    const node = world.addTransform(translation(10, 0, 0), earth);
    const car = world.frameOf(node, "car");
    engine.cameras.setRig(view, {
      position: { frame: car },
      orientation: { kind: "free" },
    });
    view.camera.position.set([1, 2, 3]);
    view.camera.version++;
    world.removeTransform(node);
    // The old root is gone: the camera's numbers stay as they are, now in
    // the Earth's anchor.
    engine.cameras.setRig(view, {
      position: { frame: earth },
      orientation: { kind: "free" },
    });
    expect(engine.cameras.root(view)).toBe(earth);
    expect(Array.from(view.camera.position)).toEqual([1, 2, 3]);
    expect(view.anchorPlacement(earth)).toEqual(IDENTITY);
    // A re-root that can't resolve is retried only when its inputs change.
    let failing = true;
    const resolver = timedResolver(
      new Map<FrameKey, (s: number) => Float64Array>([
        [world.root, () => IDENTITY],
        [earth, () => IDENTITY],
        [
          moon,
          () => {
            if (failing) {
              throw new FrameUnavailableError("MOON_ME", "loading");
            }
            return translation(100, 0, 0);
          },
        ],
      ]),
    );
    engine.cameras.setResolver(world, resolver);
    engine.cameras.setRig(view, {
      position: { frame: moon },
      orientation: { kind: "free" },
    });
    expect(engine.cameras.root(view)).toBe(earth);
    const calls = resolver.calls;
    engine.cameras.update();
    engine.cameras.update();
    expect(resolver.calls).toBe(calls);
    failing = false;
    resolver.revision++;
    engine.cameras.update();
    expect(engine.cameras.root(view)).toBe(moon);
    expect(Array.from(view.camera.position)).toEqual([-99, 2, 3]);
  });

  it("globe controls ignore input while the Earth's anchor isn't at identity, and warn once", () => {
    setup();
    world.placeAnchor(moon, translation(384_400_000, 0, 0));
    const element = () => {
      const e = new EventTarget() as EventTarget & Record<string, unknown>;
      e.getBoundingClientRect = () => ({
        left: 0,
        top: 0,
        width: 640,
        height: 360,
      });
      e.setPointerCapture = () => {};
      e.hasPointerCapture = () => false;
      return e as unknown as HTMLElement;
    };
    const fire = (el: HTMLElement, type: string, init: object = {}) =>
      el.dispatchEvent(
        Object.assign(new Event(type, { cancelable: true }), {
          clientX: 320,
          clientY: 180,
          button: 0,
          pointerId: 1,
          deltaY: 100,
          ...init,
        }),
      );
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    view.camera.lookAt(Float64Array.of(6_378_137, 0, 0), 0, -0.5, 1_000);

    const globe = new GlobeController(view, element(), engine);
    const inspect = new InspectController(view, element());
    inspect.focus([6_378_137, 0, 0], 0, -0.5, 1_000);
    const orbit = new OrbitController(view, element());
    const poke = () => {
      for (const c of [globe, inspect, orbit]) {
        fire(c.element, "wheel");
        fire(c.element, "pointerdown");
        fire(c.element, "pointermove", { clientX: 340 });
        fire(c.element, "pointerup");
      }
    };
    // At the identity (the default rig), input moves the camera.
    let version = view.camera.version;
    fire(globe.element, "wheel");
    expect(globe.inputs).toBe(1);
    fire(inspect.element, "wheel");
    expect(view.camera.version).toBeGreaterThan(version);
    version = view.camera.version;
    fire(orbit.element, "wheel");
    expect(view.camera.version).toBeGreaterThan(version);
    globe.stop();
    expect(warn).not.toHaveBeenCalled();

    // A drag under way when the view re-roots off the Earth ends there.
    for (const c of [globe, inspect, orbit]) {
      fire(c.element, "pointerdown");
      fire(c.element, "pointermove", { clientX: 330 });
    }
    engine.cameras.setRig(view, {
      position: { frame: moon },
      orientation: { kind: "free" },
    });
    version = view.camera.version;
    for (const c of [globe, inspect, orbit]) {
      fire(c.element, "pointermove", { clientX: 400, clientY: 250 });
    }
    expect(view.camera.version).toBe(version);
    expect(inspect.dragging).toBe(false);
    for (const c of [globe, inspect, orbit]) {
      fire(c.element, "pointerup");
    }
    engine.cameras.setRig(view, {
      position: { frame: earth },
      orientation: { kind: "free" },
    });
    expect(warn).not.toHaveBeenCalled();

    // A rig on the Moon: the Earth's anchor is 384,400 km away.
    engine.cameras.setRig(view, {
      position: { frame: moon },
      orientation: { kind: "free" },
    });
    expect(view.anchorPlacement(earth)).not.toEqual(IDENTITY);
    version = view.camera.version;
    const range = inspect.range;
    poke();
    poke();
    globe.update();
    expect(view.camera.version).toBe(version);
    expect(globe.inputs).toBe(2); // the wheel, and the mid-drag press
    expect(inspect.range).toBe(range);
    // One warning per controller, naming it.
    expect(warn).toHaveBeenCalledTimes(3);
    for (const name of [
      "GlobeController",
      "InspectController",
      "OrbitController",
    ]) {
      expect(
        warn.mock.calls.filter((c) => String(c[0]).startsWith(name)),
      ).toHaveLength(1);
    }
    // Back on the Earth: input works again.
    engine.cameras.setRig(view, {
      position: { frame: earth },
      orientation: { kind: "free" },
    });
    fire(globe.element, "wheel");
    expect(globe.inputs).toBe(3);
    for (const c of [globe, inspect, orbit]) {
      c.dispose();
    }
  });
});

function normalize(v: number[]): number[] {
  const l = Math.hypot(...v);
  return v.map((x) => x / l);
}
