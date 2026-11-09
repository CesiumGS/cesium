// CameraLayer.held (frames 5b, Task 3): a rig that keeps its last good pose
// says which reference frame failed and why, and resumes on the next good tick.
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  FrameUnavailableError,
  type FrameResolver,
} from "../src/camera/frameResolver.ts";
import type { ClockChange, SceneClock } from "../src/core/sceneClock.ts";
import { createFrameCatalog } from "../src/frames/catalog.ts";
import { createFrames } from "../src/frames/frames.ts";
import { Frame } from "../src/frames/Frame.ts";
import { rigPreset } from "../src/frames/presets.ts";
import { createFramesResolver } from "../src/frames/resolver.ts";
import { identity } from "../src/math/mat4.ts";
import { EARTH } from "../src/scene/Body.ts";
import type { Engine } from "../src/scene/Engine.ts";
import { OffscreenTarget } from "../src/scene/renderTarget.ts";
import type { View } from "../src/scene/View.ts";
import type { World } from "../src/scene/World.ts";
import { Instant } from "../src/time/Instant.ts";
import { LeapSeconds } from "../src/time/leapSeconds.ts";
import { Trajectory } from "../src/trajectory/Trajectory.ts";
import { fakeEngine } from "./fakeGpu.ts";
import { writeSpk } from "./spkWriter.ts";
import { syntheticFrameData } from "./syntheticFrames.ts";

class Clock implements SceneClock {
  seconds = 0;
  rate = 1;
  paused = true;
  change: ClockChange = "jump";
  private readonly listeners = new Set<() => void>();
  watch(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  at(tdb: number): void {
    // UTC seconds since 1970 of a TDB instant.
    this.seconds = Instant.fromTdb(tdb).toUtc(LeapSeconds.builtIn()) / 1000;
    for (const l of this.listeners) {
      l();
    }
  }
}

describe("CameraLayer.held", () => {
  let engine: Engine;
  let world: World;
  let view: View;
  beforeAll(async () => {
    engine = await fakeEngine();
  });
  function setup(): Clock {
    world = engine.createWorld();
    view = engine.addView({ target: new OffscreenTarget(640, 360), world });
    const clock = new Clock();
    engine.cameras.setClock(world, clock);
    return clock;
  }
  afterEach(() => {
    engine.removeWorld(world);
  });

  it("names the reference frame and the message while the throw lasts, and is undefined after", () => {
    const clock = setup();
    const anchor = world.addAnchor("Site");
    let broken = false;
    const resolver: FrameResolver = {
      resolve(frame, _base, _seconds, out) {
        if (frame === anchor && broken) {
          throw new FrameUnavailableError("Site frame", "loading");
        }
        return identity(out);
      },
      routeRevision: () => 0,
    };
    engine.cameras.setResolver(world, resolver);
    engine.cameras.setRig(view, {
      position: { frame: world.root, offset: [0, 0, 10] },
      orientation: { kind: "free" },
    });
    const before = Array.from(view.camera.position);
    expect(engine.cameras.held(view)).toBeUndefined();
    broken = true;
    clock.at(5);
    engine.cameras.update();
    expect(engine.cameras.held(view)).toEqual({
      frame: "Site frame",
      reason: expect.stringContaining("still loading"),
    });
    expect(Array.from(view.camera.position)).toEqual(before);
    broken = false;
    clock.at(6);
    engine.cameras.update();
    expect(engine.cameras.held(view)).toBeUndefined();
  });

  /** A world with an Earth anchor bound to ITRF, so the rig's reference frame is on its route. */
  function onFrames(precision: "analytic" | "precise") {
    const catalog = createFrameCatalog(
      precision === "precise" ? { data: syntheticFrameData() } : {},
    );
    const clock = setup();
    const resolver = createFramesResolver(catalog, { precision });
    engine.cameras.setResolver(world, resolver);
    const earth = world.bodyAnchor(EARTH);
    resolver.bindAnchor(earth, catalog.get("ITRF", { precision }));
    return { catalog, clock };
  }

  it("a rig on a two-vector reference frame whose vectors turn parallel holds, naming the angle, and resumes", () => {
    const { catalog, clock } = onFrames("analytic");
    const earthIcrf = catalog.get("EARTH_ICRF", { precision: "analytic" });
    // Circular, then straight out along the radius from 100 s to 200 s.
    const target = new Frame(
      "T",
      earthIcrf,
      (i, out) => {
        identity(out);
        const t = i.tdb();
        if (t < 100 || t > 200) {
          out[12] = 7e6 * Math.cos(1e-3 * t);
          out[13] = 7e6 * Math.sin(1e-3 * t);
        } else {
          out[12] = 7e6 + 1000 * (t - 100);
        }
      },
      { cache: false },
    );
    const p = rigPreset("orbital", {
      catalog,
      target,
      precision: "analytic",
    });
    clock.at(10);
    engine.cameras.setRig(view, p.rig);
    expect(engine.cameras.held(view)).toBeUndefined();
    clock.at(150);
    engine.cameras.update();
    const held = engine.cameras.held(view);
    expect(held?.frame).toBe("T orbital");
    expect(held?.reason).toMatch(/degenerate/);
    clock.at(300);
    engine.cameras.update();
    expect(engine.cameras.held(view)).toBeUndefined();
  });

  /**
   * A target whose data runs from 0 to 100 s TDB. A real trajectory (on its own
   * tree: the synthetic data's GCRF has no rigid edge to compose a route
   * through) gives the error past its data, and the target throws it.
   */
  function straightLine(catalog: ReturnType<typeof createFrameCatalog>): Frame {
    const epochs = Float64Array.from({ length: 11 }, (_, i) => i * 10);
    const states = new Float64Array(epochs.length * 6);
    epochs.forEach((t, i) => {
      states.set([7000 + 0.2 * t, 100 + 1 * t, 50, 0.2, 1, 0], i * 6);
    });
    const spk = writeSpk({
      kind: "SPK",
      segments: [
        {
          target: 1000,
          center: 399,
          frame: 1,
          type: 13,
          epochs,
          states,
          degree: 3,
        },
      ],
    });
    const trajectory = Trajectory.fromSpk(
      [spk],
      1000,
      createFrames(syntheticFrameData()),
      { name: "Orion", accuracy: "precise", j2000: "icrf" },
    );
    const earth = catalog.get("EARTH_ICRF", { precision: "analytic" });
    return new Frame(
      "Orion",
      earth,
      (i, out) => {
        const s = trajectory.state(i);
        identity(out);
        out[12] = s[0]!;
        out[13] = s[1]!;
        out[14] = s[2]!;
      },
      { cache: false },
    );
  }

  it("a rig on orbital past Orion's data holds, the reason naming the covered span, and resumes", () => {
    const { catalog, clock } = onFrames("analytic");
    const p = rigPreset("orbital", {
      catalog,
      target: straightLine(catalog),
      precision: "analytic",
    });
    clock.at(50);
    engine.cameras.setRig(view, p.rig);
    expect(engine.cameras.held(view)).toBeUndefined();
    clock.at(150);
    engine.cameras.update();
    expect(engine.cameras.held(view)?.reason).toMatch(
      /outside its data \(covered: /,
    );
    clock.at(60);
    engine.cameras.update();
    expect(engine.cameras.held(view)).toBeUndefined();
  });

  it("a frozen inertial whose freeze instant is outside the data holds the same way", () => {
    const { catalog, clock } = onFrames("analytic");
    const p = rigPreset("inertial", {
      catalog,
      target: straightLine(catalog),
      at: Instant.fromTdb(150),
      precision: "analytic",
    });
    clock.at(50);
    engine.cameras.setRig(view, p.rig);
    expect(engine.cameras.held(view)?.reason).toMatch(/outside its data/);
  });
});
