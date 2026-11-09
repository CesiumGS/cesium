// Rays through the frame tree (frames 5b, Task 7): a stub resolver places a
// station on the Earth's anchor and the Moon's anchor 384,400 km away, moving
// at 1 km/s.
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  FrameUnavailableError,
  type FrameKey,
  type FrameResolver,
} from "../src/camera/frameResolver.ts";
import { C } from "../src/math/constants.ts";
import type { QueryRay } from "../src/query/queries.ts";
import { EARTH, MOON } from "../src/scene/Body.ts";
import type { Engine } from "../src/scene/Engine.ts";
import type { World } from "../src/scene/World.ts";
import { fakeEngine } from "./fakeGpu.ts";

const R_EARTH = 6_378_137;
const MOON_X = 384_400_000;
const MOON_R = 1_737_400;

describe("rays through the frame tree", () => {
  let engine: Engine;
  let world: World;
  let places: Map<FrameKey, (seconds: number) => [number, number, number]>;
  let broken: Set<FrameKey>;
  let station: FrameKey;
  let inertial: FrameKey;
  beforeAll(async () => {
    engine = await fakeEngine();
  });
  function setup(): void {
    world = engine.createWorld();
    station = { name: "station" };
    inertial = { name: "inertial" };
    broken = new Set();
    places = new Map<FrameKey, (s: number) => [number, number, number]>([
      [world.root, () => [0, 0, 0]],
      [inertial, () => [0, 0, 0]],
      [station, () => [R_EARTH, 0, 0]],
      [world.bodyAnchor(EARTH), () => [0, 0, 0]],
      [world.bodyAnchor(MOON), (s) => [MOON_X, 1000 * s, 0]],
    ]);
    const place = (key: FrameKey, s: number) => {
      if (broken.has(key)) {
        throw new FrameUnavailableError(key.name, "loading");
      }
      const f = places.get(key);
      if (!f) {
        throw new Error(`stub: ${key.name} is unknown`);
      }
      return f(s);
    };
    const resolver: FrameResolver = {
      resolve(frame, base, seconds, out) {
        const a = place(frame, seconds);
        const b = place(base, seconds);
        out.fill(0);
        out[0] = out[5] = out[10] = out[15] = 1;
        out[12] = a[0] - b[0];
        out[13] = a[1] - b[1];
        out[14] = a[2] - b[2];
        return out;
      },
      routeRevision: () => 0,
    };
    engine.cameras.setResolver(world, resolver);
  }
  afterEach(() => {
    engine.removeWorld(world);
  });

  /** A ray from the station along +X, aimed at the Moon's centre offset by (0, y, 0). */
  const toMoon = (y = 0): QueryRay => ({
    from: [0, 0, 0],
    to: [MOON_X - R_EARTH, y, 0],
  });

  it("carries rays from their reference frame into each target's anchor", async () => {
    setup();
    const answer = await engine.queries.castRays({
      anchor: undefined,
      world,
      frame: station,
      seconds: 0,
      rays: [toMoon()],
      targets: [{ kind: "body", body: MOON }],
    });
    const ray = answer.rays[0]!;
    expect(ray.verdict).toBe("blocked");
    // The Moon's near side, 1,737.4 km short of its centre, in the station's frame.
    expect(ray.hit!.position[0]).toBeCloseTo(MOON_X - R_EARTH - MOON_R, 6);
    expect(ray.hit!.frame).toBe(station);
    expect(ray.hit!.target).toEqual({ kind: "body", body: MOON });
    expect(ray.accuracy.note).toMatch(/not its terrain/);
    expect(ray.accuracy.note).toMatch(/transform table states no error/);
  });

  it("reports the hit in the reference frame asked for, at float64 precision", async () => {
    setup();
    const y = 700_000;
    const answer = await engine.queries.castRays({
      anchor: undefined,
      world,
      frame: station,
      reportIn: inertial,
      seconds: 0,
      rays: [toMoon(y)],
      targets: [{ kind: "body", body: MOON }],
    });
    const hit = answer.rays[0]!.hit!;
    // The analytic hit: the ray's line to (MOON_X, y) from (R_EARTH, 0) meets
    // the sphere about (MOON_X, 0).
    const dx = MOON_X - R_EARTH;
    const len = Math.hypot(dx, y);
    const ux = dx / len;
    const uy = y / len;
    // The closest approach to the centre, then the half-chord about it:
    // the perpendicular distance is dx · uy, with no cancellation.
    const perpendicular = dx * uy;
    const s =
      dx * ux - Math.sqrt(MOON_R * MOON_R - perpendicular * perpendicular);
    expect(hit.frame).toBe(inertial);
    expect(hit.position[0]).toBeCloseTo(R_EARTH + s * ux, 6);
    expect(hit.position[1]).toBeCloseTo(s * uy, 6);
    expect(hit.t).toBeCloseTo(s / len, 12);
  });

  it("light-time correction places the target where it was when the light left it", async () => {
    setup();
    const y = 1_000_000;
    const ask = (correction: "geometric" | "lightTime") =>
      engine.queries.castRays({
        anchor: undefined,
        world,
        frame: station,
        correction,
        seconds: 100,
        rays: [toMoon(y)],
        targets: [{ kind: "body", body: MOON }],
      });
    const geometric = (await ask("geometric")).rays[0]!.hit!;
    const timed = (await ask("lightTime")).rays[0]!.hit!;
    // The light time to the Moon's centre, about 1.26 s.
    const tau = Math.hypot(MOON_X - R_EARTH, y) / C;
    expect(geometric.seconds).toBe(100);
    expect(100 - timed.seconds!).toBeCloseTo(tau, 3);
    // The Moon was about 1.26 km back along its track: the hit moves by
    // roughly y·shift/√(R² − y²) along the ray.
    const moved = Math.hypot(
      timed.position[0]! - geometric.position[0]!,
      timed.position[1]! - geometric.position[1]!,
    );
    expect(moved).toBeGreaterThan(500);
    expect(moved).toBeLessThan(2000);
  });

  it("an impostor blocks inside its relief, clears outside it, and can't tell between", async () => {
    setup();
    const ask = (altitude: number) =>
      engine.queries.castRays({
        anchor: undefined,
        world,
        frame: world.bodyAnchor(MOON),
        seconds: 0,
        // Straight in from far out, to this height above the sphere.
        rays: [
          {
            from: [MOON_R + 100_000, 0, 0],
            to: [MOON_R + altitude, 0, 0],
          },
        ],
        targets: [{ kind: "impostor", body: MOON }],
      });
    const outside = (await ask(30_000)).rays[0]!;
    expect(outside.verdict).toBe("clear");
    const between = (await ask(5_000)).rays[0]!;
    expect(between.verdict).toBe("unknown");
    expect(between.unknown[0]!.reason).toBe("withinError");
    const inside = (await ask(-20_000)).rays[0]!;
    expect(inside.verdict).toBe("blocked");
    expect(inside.unknown.map((u) => u.reason)).toEqual(["withinError"]);
    expect(inside.accuracy.meters).toBeGreaterThanOrEqual(10_800);
  });

  it("a target whose route the resolver can't answer is unknown, with the reason; the other targets answer", async () => {
    setup();
    broken.add(world.bodyAnchor(MOON));
    const answer = await engine.queries.castRays({
      anchor: undefined,
      world,
      frame: station,
      seconds: 0,
      // Down into the Earth, and one up and away.
      rays: [
        { from: [1000, 0, 0], to: [-R_EARTH, 0, 0] },
        { from: [1000, 0, 0], to: [2000, 0, 0] },
      ],
      targets: [
        { kind: "body", body: MOON },
        { kind: "body", body: EARTH },
      ],
    });
    const [down, up] = answer.rays;
    expect(down!.verdict).toBe("blocked");
    expect(down!.unknown.map((u) => u.reason)).toContain("route");
    expect(up!.verdict).toBe("unknown");
    expect(up!.unknown[0]!.reason).toBe("route");
    expect(up!.accuracy.note).toMatch(/still loading/);
  });

  it("5a's anchor queries answer as before", async () => {
    setup();
    const answer = await engine.queries.castRays({
      anchor: undefined,
      world,
      seconds: 0,
      rays: [{ from: [0, 0, 0], to: [1, 0, 0] }],
      targets: ["draws"],
    });
    expect(answer.rays[0]!.verdict).toBe("clear");
    expect(answer.rays[0]!.hit).toBeUndefined();
  });

  it("a string target through a frame is carried into the world's anchors", async () => {
    setup();
    const answer = await engine.queries.castRays({
      anchor: undefined,
      world,
      frame: station,
      seconds: 0,
      rays: [{ from: [0, 0, 0], to: [1, 0, 0] }],
      targets: ["draws"],
    });
    expect(answer.rays[0]!.verdict).toBe("clear");
  });

  it("answers stay asynchronous", async () => {
    setup();
    let settled = false;
    const promise = engine.queries
      .castRays({
        anchor: undefined,
        world,
        frame: station,
        seconds: 0,
        rays: [toMoon()],
        targets: [{ kind: "body", body: MOON }],
      })
      .then(() => {
        settled = true;
      });
    expect(settled).toBe(false);
    await promise;
    expect(settled).toBe(true);
  });

  it("names a frame query's world", async () => {
    setup();
    await expect(
      engine.queries.castRays({
        anchor: undefined,
        frame: station,
        seconds: 0,
        rays: [toMoon()],
        targets: [{ kind: "body", body: MOON }],
      }),
    ).rejects.toThrow(/names its world/);
  });
});
