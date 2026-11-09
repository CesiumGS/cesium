// The query interface for rays (spec section 7.10, plan 5a Task 18): the
// shape a GPU ray-query engine needs, on today's CPU terrain engine and the
// GPU cast. Asynchronous, batched, standing, three-way answers with their
// reasons and accuracy, and answers that improve.
import { beforeAll, describe, expect, it, vi } from "vitest";
import { LEVEL_ZERO_ERROR } from "../src/globe/TerrainSource.ts";
import {
  combineRayAnswers,
  createSpatialQueries,
  type QueryAnswer,
  type QueryHost,
  type RayAnswer,
  type RayBackend,
  type RayQuery,
} from "../src/query/queries.ts";
import { drawBackend } from "../src/query/drawBackend.ts";
import { terrainBackend, terrainQueries } from "../src/query/terrainBackend.ts";
import { EARTH } from "../src/scene/Body.ts";
import type { Engine } from "../src/scene/Engine.ts";
import { createBox } from "../src/scene/meshes.ts";
import { OffscreenTarget } from "../src/scene/renderTarget.ts";
import type { CastRay } from "../src/scene/World.ts";
import { fakeEngine } from "./fakeGpu.ts";
import { A, at, gridTile, strip, stripTarget } from "./terrainRayFixtures.ts";

const HALF = 20000 / A;
const W = 3000 / A;
const SIGMA = 3000 / A;
const hill = (lon: number, lat: number): number =>
  300 * Math.exp(-(lon * lon + lat * lat) / (2 * SIGMA * SIGMA));

/** Eight tiles along the equator over a 300 m hill; some unknown. */
function hillTarget(
  unknown: Record<number, "not drawn" | "not refined"> = {},
  level = 14,
) {
  const rects = strip(-HALF * 1.01, HALF * 1.01, 8, -W, W);
  const tiles = rects.map((r) => gridTile(r, 33, hill, level));
  return stripTarget(
    rects.map((rectangle, i) =>
      unknown[i]
        ? { rectangle, unknown: unknown[i] }
        : { rectangle, tile: tiles[i]! },
    ),
  );
}

const query = (
  rays: RayQuery["rays"],
  targets: RayQuery["targets"] = ["terrain"],
): RayQuery => ({ anchor: undefined, seconds: 0, rays, targets });

const one = async (
  target: ReturnType<typeof hillTarget>,
  from: Float64Array,
  to: Float64Array,
): Promise<RayAnswer> =>
  (await terrainQueries(target).castRays(query([{ from, to }]))).rays[0]!;

/** A host whose revision, loading and ticks the test drives. */
function testHost() {
  const ticks = new Set<() => void>();
  const state = { rev: 0, busy: false };
  const host: QueryHost = {
    revision: () => state.rev,
    loading: () => state.busy,
    onTick: (listener) => {
      ticks.add(listener);
      return () => void ticks.delete(listener);
    },
  };
  return Object.assign(state, host, {
    tick: () => ticks.forEach((l) => l()),
    ticks,
  });
}

/** Lets queued answers arrive. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("three-way answers with reasons and accuracy", () => {
  it("clear: over drawn terrain, by more than its error, with that accuracy", async () => {
    const r = await one(hillTarget(), at(-HALF, 0, 900), at(HALF, 0, 900));
    expect(r.verdict).toBe("clear");
    expect(r.unknown).toEqual([]);
    expect(r.hit).toBeUndefined();
    expect(r.accuracy.meters).toBeCloseTo(LEVEL_ZERO_ERROR / 2 ** 14, 9);
    expect(r.accuracy.note).toMatch(
      /exact against the drawn terrain triangles \(level 14\)/,
    );
    expect(r.clearance?.margin?.meters).toBeGreaterThan(0);
  });

  it("blocked: the nearest hit, as a fraction and a position", async () => {
    const from = at(-HALF, 0, 100);
    const to = at(HALF, 0, 100);
    const r = await one(hillTarget(), from, to);
    expect(r.verdict).toBe("blocked");
    expect(r.hit!.t).toBeGreaterThan(0);
    expect(r.hit!.t).toBeLessThan(0.5);
    for (let i = 0; i < 3; i++) {
      expect(r.hit!.position[i]).toBeCloseTo(
        from[i]! + r.hit!.t * (to[i]! - from[i]!),
        3,
      );
    }
  });

  it("unknown: the spans not loaded and not refined, where they are", async () => {
    const target = hillTarget({ 1: "not drawn", 6: "not refined" });
    const r = await one(target, at(-HALF, 0, 2000), at(HALF, 0, 2000));
    expect(r.verdict).toBe("unknown");
    expect(r.unknown.map((s) => s.reason)).toEqual(["notLoaded", "notRefined"]);
    const [a, b] = r.unknown;
    // Tile 1 of eight lies about an eighth to a quarter along; tile 6 three
    // quarters on.
    expect(a!.from).toBeGreaterThan(0.1);
    expect(a!.to).toBeLessThan(0.27);
    expect(b!.from).toBeGreaterThan(0.72);
    expect(b!.to).toBeLessThan(0.9);
    expect(r.accuracy.note).toMatch(/unknown over 25% of the path/);
  });

  it("unknown: within the terrain's error, at the deciding clearance", async () => {
    // 300 m peak; the ray clears it by tens of metres, inside level 9's 150 m.
    const r = await one(hillTarget({}, 9), at(-HALF, 0, 360), at(HALF, 0, 360));
    expect(r.verdict).toBe("unknown");
    expect(r.unknown).toHaveLength(1);
    const span = r.unknown[0]!;
    expect(span.reason).toBe("withinError");
    expect(span.from).toBeCloseTo(r.clearance!.margin!.t, 12);
    expect(r.clearance!.margin!.meters).toBeLessThanOrEqual(0);
    expect(r.accuracy.meters).toBeCloseTo(LEVEL_ZERO_ERROR / 2 ** 9, 9);
    expect(r.accuracy.note).toMatch(/so the true terrain may block/);
  });

  it("unknown: a target no engine here answers is unsupported", async () => {
    const queries = createSpatialQueries({}, testHost());
    const answer = await queries.castRays(
      query([{ from: at(0, 0, 10), to: at(HALF, 0, 10) }]),
    );
    expect(answer.rays[0]).toMatchObject({
      verdict: "unknown",
      unknown: [{ from: 0, to: 1, reason: "unsupported" }],
    });
  });
});

describe("asynchronous and batched", () => {
  it("is still pending right after the call, and no engine has run", async () => {
    const answer = vi.fn((queries: readonly RayQuery[]) =>
      queries.map((q) => q.rays.map(() => clearAnswer())),
    );
    const queries = createSpatialQueries({ terrain: { answer } }, testHost());
    let done = false;
    const pending = queries
      .castRays(query([{ from: [0, 0, 0], to: [1, 0, 0] }]))
      .then(() => (done = true));
    expect(done).toBe(false);
    expect(answer).not.toHaveBeenCalled();
    await pending;
    expect(done).toBe(true);
    expect(answer).toHaveBeenCalledTimes(1);
  });

  it("is asynchronous over the CPU terrain too, which knows at once", async () => {
    const target = hillTarget();
    const before = target.calls;
    let done = false;
    const pending = terrainQueries(target)
      .castRays(query([{ from: at(-HALF, 0, 900), to: at(HALF, 0, 900) }]))
      .then(() => (done = true));
    expect(done).toBe(false);
    expect(target.calls).toBe(before);
    await pending;
    expect(target.calls).toBeGreaterThan(before);
  });

  it("carries 64 rays in one call, and the queries of one task to each engine together", async () => {
    const answer = vi.fn((queries: readonly RayQuery[]) =>
      queries.map((q) => q.rays.map(() => clearAnswer())),
    );
    const queries = createSpatialQueries({ draws: { answer } }, testHost());
    const rays = Array.from({ length: 64 }, (_, i) => ({
      from: [0, 0, i],
      to: [100, 0, i],
    }));
    const [a, b] = await Promise.all([
      queries.castRays(query(rays, ["draws"])),
      queries.castRays(query(rays.slice(0, 3), ["draws"])),
    ]);
    expect(a.rays).toHaveLength(64);
    expect(b.rays).toHaveLength(3);
    expect(answer).toHaveBeenCalledTimes(1);
    expect(answer.mock.calls[0]![0].map((q) => q.rays.length)).toEqual([64, 3]);

    // The CPU terrain engine answers each of 64 lines of sight.
    const fan = Array.from({ length: 64 }, (_, i) => ({
      from: at(-HALF, 0, 100 + 20 * i),
      to: at(HALF, 0, 100 + 20 * i),
    }));
    const terrain = await terrainQueries(hillTarget()).castRays(query(fan));
    expect(terrain.rays).toHaveLength(64);
    expect(terrain.rays[0]!.verdict).toBe("blocked");
    expect(terrain.rays[63]!.verdict).toBe("clear");
  });

  it("casts a batch's draw rays in one dispatch per world and anchor", async () => {
    const casts: CastRay[][] = [];
    const world = {
      castRays: async (rays: readonly CastRay[]) => {
        casts.push([...rays]);
        return rays.map((r) => (r.origin[2] === 0 ? 25 : undefined));
      },
    };
    const backend = drawBackend(() => ({ world, options: {}, key: "w" }));
    const queries = createSpatialQueries({ draws: backend }, testHost());
    const [a, b] = await Promise.all([
      queries.castRays(
        query(
          [
            { from: [0, 0, 0], to: [100, 0, 0] },
            { from: [0, 0, 5], to: [0, 100, 5] },
          ],
          ["draws"],
        ),
      ),
      queries.castRays(query([{ from: [0, 0, 0], to: [0, 50, 0] }], ["draws"])),
    ]);
    expect(casts).toHaveLength(1);
    expect(casts[0]!.map((r) => r.maxDistance)).toEqual([100, 100, 50]);
    expect(a.rays[0]).toMatchObject({ verdict: "blocked", hit: { t: 0.25 } });
    expect([...a.rays[0]!.hit!.position]).toEqual([25, 0, 0]);
    expect(a.rays[1]!.verdict).toBe("clear");
    expect(b.rays[0]).toMatchObject({ verdict: "blocked", hit: { t: 0.5 } });
  });

  it("joins targets: the nearer block wins, unknown otherwise", async () => {
    const terrain: RayBackend = {
      answer: (qs) =>
        qs.map((q) =>
          q.rays.map(() => ({
            verdict: "unknown" as const,
            unknown: [{ from: 0.5, to: 0.6, reason: "notLoaded" as const }],
            accuracy: { meters: 5, note: "terrain words" },
          })),
        ),
    };
    const draws: RayBackend = {
      answer: (qs) =>
        qs.map((q) =>
          q.rays.map((r) =>
            r.from[0] === 0
              ? {
                  verdict: "blocked" as const,
                  hit: { t: 0.3, position: Float64Array.of(3, 0, 0) },
                  unknown: [],
                  accuracy: { note: "draw words" },
                }
              : clearAnswer(),
          ),
        ),
    };
    const queries = createSpatialQueries({ terrain, draws }, testHost());
    const answer = await queries.castRays(
      query(
        [
          { from: [0, 0, 0], to: [10, 0, 0] },
          { from: [1, 0, 0], to: [10, 0, 0] },
        ],
        ["terrain", "draws"],
      ),
    );
    expect(answer.rays[0]).toMatchObject({
      verdict: "blocked",
      hit: { t: 0.3 },
    });
    expect(answer.rays[0]!.accuracy.note).toBe(
      "terrain: terrain words; draws: draw words",
    );
    expect(answer.rays[1]!.verdict).toBe("unknown");
    expect(answer.rays[1]!.accuracy.meters).toBe(5);
  });

  it("refuses a target named twice", async () => {
    const queries = terrainQueries(hillTarget());
    await expect(
      queries.castRays(query([], ["terrain", "terrain"])),
    ).rejects.toThrow(/a target is listed twice/);
  });

  it("carries a target's unknown spans through a join, and keeps the clearance only when its target decides", async () => {
    const measured: RayAnswer = {
      verdict: "clear",
      unknown: [],
      accuracy: { meters: 2, note: "terrain words" },
      clearance: { min: { meters: 40, t: 0.5 } },
    };
    const untested: RayAnswer = {
      verdict: "unknown",
      unknown: [{ from: 0.2, to: 0.3, reason: "notLoaded" }],
      accuracy: { note: "draw words" },
    };
    const blocks: RayAnswer = {
      verdict: "blocked",
      hit: { t: 0.1, position: Float64Array.of(1, 0, 0) },
      unknown: [],
      accuracy: { note: "draw words" },
    };
    const joined = combineRayAnswers(
      [measured, untested],
      ["terrain", "draws"],
    );
    expect(joined.verdict).toBe("unknown");
    expect(joined.unknown).toEqual(untested.unknown);
    expect(joined.clearance).toEqual(measured.clearance); // nothing blocks
    const blocked = combineRayAnswers([measured, blocks], ["terrain", "draws"]);
    expect(blocked.verdict).toBe("blocked");
    expect(blocked.clearance).toBeUndefined(); // the draw's block decides
    const own = combineRayAnswers(
      [
        {
          ...measured,
          verdict: "blocked",
          hit: { t: 0.05, position: Float64Array.of(0, 0, 0) },
        },
        blocks,
      ],
      ["terrain", "draws"],
    );
    expect(own.hit!.t).toBe(0.05);
    expect(own.clearance).toEqual(measured.clearance); // the terrain's block decides
  });

  it("fails only the query whose revision, loading or engine throws; the rest of the batch is answered", async () => {
    const host = testHost();
    const bad = (q: RayQuery) => q.seconds === 13;
    const queries = createSpatialQueries(
      {
        terrain: {
          answer: (qs) => {
            if (qs.some((q) => q.seconds === 7)) {
              throw new Error("the engine failed on 7");
            }
            return qs.map((q) => q.rays.map(() => clearAnswer()));
          },
        },
      },
      {
        ...host,
        revision: (q) => {
          if (bad(q)) {
            throw new Error("no route for 13");
          }
          return 0;
        },
        loading: (q) => {
          if (q.seconds === 21) {
            throw new Error("no loading for 21");
          }
          return false;
        },
      },
    );
    const at = (seconds: number) =>
      queries.castRays({
        ...query([{ from: [0, 0, 0], to: [1, 0, 0] }]),
        seconds,
      });
    const [ok, route, engine, loading] = await Promise.allSettled([
      at(0),
      at(13),
      at(7),
      at(21),
    ]);
    expect(ok.status).toBe("fulfilled");
    expect(route).toMatchObject({
      status: "rejected",
      reason: { message: "no route for 13" },
    });
    expect(engine).toMatchObject({
      status: "rejected",
      reason: { message: "the engine failed on 7" },
    });
    expect(loading).toMatchObject({
      status: "rejected",
      reason: { message: "no loading for 21" },
    });
  });

  it("rejects every query of a batch the interface itself fails on, none left waiting", async () => {
    const report = vi.fn();
    const queries = createSpatialQueries(
      { terrain: { answer: () => [] } }, // answers no query: a broken engine
      { ...testHost(), report },
    );
    const asked = [0, 1].map(() =>
      queries.castRays(query([{ from: [0, 0, 0], to: [1, 0, 0] }])),
    );
    const settled = await Promise.allSettled(asked);
    expect(settled.map((s) => s.status)).toEqual(["rejected", "rejected"]);
    expect(report).toHaveBeenCalledTimes(1);
  });

  it("rejects with the signal's reason when aborted", async () => {
    const queries = terrainQueries(hillTarget());
    const early = new AbortController();
    early.abort();
    await expect(
      queries.castRays(query([{ from: [0, 0, 0], to: [1, 0, 0] }]), {
        signal: early.signal,
      }),
    ).rejects.toMatchObject({ name: "AbortError" });
    const late = new AbortController();
    const pending = queries.castRays(
      query([{ from: at(-HALF, 0, 900), to: at(HALF, 0, 900) }]),
      { signal: late.signal },
    );
    late.abort();
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
  });
});

describe("standing queries and answers that improve", () => {
  it("is answered again when its revision goes up, and not on a tick without", async () => {
    const host = testHost();
    const queries = createSpatialQueries(
      { terrain: terrainBackend(() => hillTarget()) },
      host,
    );
    const answers: QueryAnswer[] = [];
    const ask = vi.fn(() =>
      query([{ from: at(-HALF, 0, 900), to: at(HALF, 0, 900) }]),
    );
    const standing = queries.standing(ask, (a) => answers.push(a));
    expect(answers).toHaveLength(0); // asynchronous, as every answer
    await settle();
    expect(answers.map((a) => a.revision)).toEqual([0]);
    host.tick();
    await settle();
    expect(answers).toHaveLength(1);
    host.rev = 3;
    host.tick();
    await settle();
    expect(answers.map((a) => a.revision)).toEqual([0, 3]);
    expect(answers[1]!.rays[0]!.verdict).toBe("clear");
    standing.dispose();
    host.rev = 4;
    host.tick();
    await settle();
    expect(answers).toHaveLength(2);
    expect(host.ticks.size).toBe(0);
  });

  it("is answered each tick with everyTick", async () => {
    const host = testHost();
    const queries = terrainQueries(hillTarget(), host);
    const answers: QueryAnswer[] = [];
    const standing = queries.standing(
      () => query([{ from: at(-HALF, 0, 900), to: at(HALF, 0, 900) }]),
      (a) => answers.push(a),
      { everyTick: true },
    );
    await settle();
    for (let i = 0; i < 3; i++) {
      host.tick();
      await settle();
    }
    expect(answers).toHaveLength(4);
    standing.dispose();
  });

  it("says final: false while tiles load, then final: true with a higher revision", async () => {
    const host = testHost();
    host.busy = true;
    // Tile 3 stands in coarsely while it loads; then it is drawn.
    let target = hillTarget({ 3: "not refined" });
    const queries = createSpatialQueries(
      { terrain: terrainBackend(() => target) },
      host,
    );
    const answers: QueryAnswer[] = [];
    const standing = queries.standing(
      () => query([{ from: at(-HALF, 0, 900), to: at(HALF, 0, 900) }]),
      (a) => answers.push(a),
    );
    await settle();
    expect(answers[0]).toMatchObject({ final: false, revision: 0 });
    expect(answers[0]!.rays[0]!.verdict).toBe("unknown");
    expect(answers[0]!.rays[0]!.unknown[0]!.reason).toBe("notRefined");
    // The tile is placed: the revision goes up, loading ends.
    target = hillTarget();
    host.rev = 1;
    host.busy = false;
    host.tick();
    await settle();
    expect(answers).toHaveLength(2);
    expect(answers[1]).toMatchObject({ final: true, revision: 1 });
    expect(answers[1]!.revision).toBeGreaterThan(answers[0]!.revision);
    expect(answers[1]!.rays[0]!.verdict).toBe("clear");
    standing.dispose();
  });

  it("asks again when loading ends without a revision change", async () => {
    const host = testHost();
    host.busy = true;
    const queries = terrainQueries(hillTarget(), host);
    const answers: QueryAnswer[] = [];
    queries.standing(
      () => query([{ from: at(-HALF, 0, 900), to: at(HALF, 0, 900) }]),
      (a) => answers.push(a),
    );
    await settle();
    host.tick();
    await settle();
    expect(answers.map((a) => a.final)).toEqual([false]);
    host.busy = false;
    host.tick();
    await settle();
    expect(answers.map((a) => a.final)).toEqual([false, true]);
  });
});

describe("Engine.queries", () => {
  let engine: Engine;
  beforeAll(async () => {
    engine = await fakeEngine();
  });

  it("answers terrain under an anchor without a globe as unsupported", async () => {
    const world = engine.createWorld();
    const earth = world.bodyAnchor(EARTH);
    const site = world.addAnchor("site");
    for (const anchor of [earth, site]) {
      const answer = await engine.queries.castRays({
        anchor,
        seconds: 0,
        rays: [{ from: [0, 0, 0], to: [1000, 0, 0] }],
        targets: ["terrain"],
      });
      expect(answer.rays[0]).toMatchObject({
        verdict: "unknown",
        unknown: [{ from: 0, to: 1, reason: "unsupported" }],
      });
      expect(answer.rays[0]!.accuracy.note).toContain(
        `no globe under ${anchor.name}`,
      );
      expect(answer.final).toBe(true);
    }
    // The draws: none here, so the GPU cast meets nothing.
    const draws = await engine.queries.castRays({
      anchor: site,
      seconds: 0,
      rays: [{ from: [0, 0, 0], to: [1000, 0, 0] }],
      targets: ["draws"],
    });
    expect(draws.rays[0]!.verdict).toBe("clear");
    engine.removeWorld(world);
  });

  it("rejects another world's anchor, and a query naming no world among several", async () => {
    const a = engine.createWorld();
    const b = engine.createWorld();
    const other = b.addAnchor("other");
    await expect(
      engine.queries.castRays({
        anchor: other,
        seconds: 0,
        rays: [],
        targets: ["terrain"],
        view: engine.addView({ target: new OffscreenTarget(8, 8), world: a }),
      }),
    ).rejects.toThrow(/other is not an anchor of the view's world/);
    await expect(
      engine.queries.castRays(query([], ["terrain"])),
    ).rejects.toThrow(/name a view or an anchor/);
    engine.removeWorld(a);
    engine.removeWorld(b);
  });

  it("counts draws added and removed as the revision", async () => {
    const world = engine.createWorld({
      maxDraws: 16,
      vertexBytes: 1 << 16,
      indexBytes: 1 << 16,
    });
    const anchor = world.addAnchor("site");
    const ask: RayQuery = {
      anchor,
      seconds: 0,
      rays: [],
      targets: ["terrain"],
    };
    const first = await engine.queries.castRays(ask);
    const draw = world.addDraw({
      mesh: world.addMesh(createBox()),
      origin: Float64Array.of(0, 0, 0),
      parent: anchor,
    });
    const second = await engine.queries.castRays(ask);
    world.removeDraw(draw);
    const third = await engine.queries.castRays(ask);
    expect(second.revision).toBe(first.revision + 1);
    expect(third.revision).toBe(first.revision + 2);
    engine.removeWorld(world);
  });
});

function clearAnswer(): RayAnswer {
  return { verdict: "clear", unknown: [], accuracy: { note: "clear" } };
}
