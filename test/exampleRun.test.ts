import {
  createHashHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { describe, expect, it, vi } from "vitest";
import { parseSearch, stringifySearch } from "../bench/suite/search.ts";
import {
  createEngineKeeper,
  createParamsStore,
  exampleLink,
  mergeParams,
  normalizeRun,
  searchToParams,
  share,
  undoAll,
} from "../bench/suite/views/exampleRun.ts";

describe("searchToParams", () => {
  it("keeps strings, stringifies numbers and drops the rest", () => {
    expect(
      searchToParams({
        select: "result:space.lunar-time",
        n: 12,
        empty: "",
        flag: true,
        nested: { a: 1 },
        list: ["a"],
        gone: undefined,
        nil: null,
      }),
    ).toEqual({ select: "result:space.lunar-time", n: "12" });
  });
});

describe("mergeParams", () => {
  it("adds, replaces and deletes on undefined, without mutating", () => {
    const current = Object.freeze({ a: "1", b: "2" });
    expect(mergeParams(current, { b: "3", c: "4", a: undefined })).toEqual({
      b: "3",
      c: "4",
    });
    expect(current).toEqual({ a: "1", b: "2" });
  });
});

describe("createParamsStore", () => {
  it("holds the params at start", () => {
    expect(createParamsStore({ lens: "gis" }, () => {}).params).toEqual({
      lens: "gis",
    });
  });

  it("commits the merged params, deleting undefined keys", () => {
    const commit = vi.fn();
    const store = createParamsStore({ a: "1", b: "2" }, commit);
    store.setParams({ a: undefined, c: "3" });
    expect(commit).toHaveBeenCalledExactlyOnceWith({ b: "2", c: "3" });
    expect(store.params).toEqual({ b: "2", c: "3" });
    store.setParams({ d: "4" });
    expect(commit).toHaveBeenLastCalledWith({ b: "2", c: "3", d: "4" });
  });

  it("does not commit a change that changes nothing", () => {
    const commit = vi.fn();
    const store = createParamsStore({ a: "1" }, commit);
    store.setParams({ a: "1", z: undefined });
    expect(commit).not.toHaveBeenCalled();
  });

  it("watches navigation (back and forward) but not its own sets", () => {
    const store = createParamsStore({ a: "1" }, () => {});
    const seen: unknown[] = [];
    store.watch((p) => seen.push(p));
    store.setParams({ a: "2" });
    // The router reports what setParams wrote: not news.
    store.sync({ a: "2" });
    expect(seen).toEqual([]);
    // Back: the router now reports the earlier params.
    store.sync({ a: "1" });
    expect(seen).toEqual([{ a: "1" }]);
    expect(store.params).toEqual({ a: "1" });
    // The same params again: nothing changed.
    store.sync({ a: "1" });
    expect(seen).toHaveLength(1);
  });

  it("stops watching when unsubscribed or closed", () => {
    const store = createParamsStore({}, () => {});
    const a = vi.fn();
    const b = vi.fn();
    const off = store.watch(a);
    store.watch(b);
    off();
    store.sync({ x: "1" });
    expect(a).not.toHaveBeenCalled();
    expect(b).toHaveBeenCalledOnce();
    store.close();
    store.sync({ x: "2" });
    expect(b).toHaveBeenCalledOnce();
  });
});

describe("normalizeRun", () => {
  it("wraps a plain Dispose, with no React panel", () => {
    const dispose = vi.fn();
    const run = normalizeRun(dispose);
    expect(run.dispose).toBe(dispose);
    expect(run.panel).toBeUndefined();
  });

  it("passes { dispose, panel } through", () => {
    const given = { dispose: () => {}, panel: "controls" };
    expect(normalizeRun(given)).toBe(given);
  });
});

describe("exampleLink", () => {
  // Dyno's own router setup: hash history (over a stand-in window, at a
  // page under a subpath), the app's plain-string search, and the
  // example route's validation.
  function dynoRouter(page = "https://host.test/dyno/index.html") {
    const url = new URL(page);
    const win = {
      location: {
        pathname: url.pathname,
        search: "",
        hash: "#/examples/other?keep=1",
      },
      history: {
        state: { __TSR_key: "k", key: "k", __TSR_index: 0 },
        pushState() {},
        replaceState() {},
      },
      addEventListener() {},
      removeEventListener() {},
    };
    const root = createRootRoute();
    const example = createRoute({
      getParentRoute: () => root,
      path: "/examples/$id",
      validateSearch: (s: Record<string, unknown>) => searchToParams(s),
    });
    return createRouter({
      routeTree: root.addChildren([example]),
      parseSearch,
      stringifySearch,
      history: createHashHistory({ window: win as unknown as Window }),
    });
  }

  it("builds an absolute link to the example with exactly the given params", () => {
    const router = dynoRouter();
    expect(
      exampleLink(
        router,
        "frames-explorer",
        { select: "result:space.lunar-time", lens: "space" },
        "https://host.test/dyno/index.html",
      ),
    ).toBe(
      "https://host.test/dyno/index.html#/examples/frames-explorer?select=result%3Aspace.lunar-time&lens=space",
    );
  });

  it("drops undefined and empty params, and links to the bare example without any", () => {
    const router = dynoRouter();
    const base = "https://host.test/dyno/index.html";
    expect(
      exampleLink(
        router,
        "frames-explorer",
        { tour: undefined, lens: "" },
        base,
      ),
    ).toBe("https://host.test/dyno/index.html#/examples/frames-explorer");
    expect(exampleLink(router, "translucency", {}, base)).toBe(
      "https://host.test/dyno/index.html#/examples/translucency",
    );
  });

  it("round-trips a numeric-looking value as the same text", () => {
    const router = dynoRouter();
    const link = exampleLink(
      router,
      "frames-explorer",
      { n: "1.50" },
      "https://host.test/dyno/index.html",
    );
    const query = link.split("?")[1]!;
    expect(searchToParams(parseSearch(query))).toEqual({ n: "1.50" });
  });
});

describe("share", () => {
  it("destroys once the owner and every holder let go, owner first", () => {
    // Leaving the Examples page: React runs the page's passive cleanup (the
    // engine's owner) before the runner's (the example on it).
    const destroy = vi.fn();
    const { shared, release } = share("engine", destroy);
    const letGo = shared.hold();
    release();
    expect(destroy).not.toHaveBeenCalled();
    letGo();
    expect(destroy).toHaveBeenCalledOnce();
    expect(destroy).toHaveBeenCalledWith("engine");
  });

  it("destroys once the owner and every holder let go, holders first", () => {
    const destroy = vi.fn();
    const { shared, release } = share("engine", destroy);
    const a = shared.hold();
    const b = shared.hold();
    a();
    b();
    expect(destroy).not.toHaveBeenCalled();
    release();
    expect(destroy).toHaveBeenCalledOnce();
  });

  it("destroys with no holders when the owner lets go", () => {
    const destroy = vi.fn();
    share("engine", destroy).release();
    expect(destroy).toHaveBeenCalledOnce();
  });

  it("counts each release once, however often it is called", () => {
    const destroy = vi.fn();
    const { shared, release } = share("engine", destroy);
    const a = shared.hold();
    shared.hold(); // still held
    a();
    a();
    release();
    release();
    expect(destroy).not.toHaveBeenCalled();
  });

  it("can't be held once destroyed", () => {
    const { shared, release } = share("engine", () => {});
    release();
    expect(() => shared.hold()).toThrow(/destroyed/);
  });
});

describe("undoAll", () => {
  it("runs every step in order and returns no errors when none throw", () => {
    const order: string[] = [];
    expect(
      undoAll([
        () => order.push("dispose"),
        () => order.push("scope"),
        () => order.push("viewer"),
      ]),
    ).toEqual([]);
    expect(order).toEqual(["dispose", "scope", "viewer"]);
  });

  it("runs the steps after one that throws, and returns what each threw", () => {
    const order: string[] = [];
    const first = new Error("World: no slab 0");
    const second = new Error("scope");
    const errors = undoAll([
      () => {
        order.push("dispose");
        throw first;
      },
      () => {
        order.push("scope");
        throw second;
      },
      () => order.push("viewer"),
    ]);
    expect(order).toEqual(["dispose", "scope", "viewer"]);
    expect(errors).toEqual([first, second]);
  });

  it("releases the engine when the example's dispose throws", () => {
    // The runner's cleanup: the page has let go already (parent first).
    const destroy = vi.fn();
    const { shared, release } = share("engine", destroy);
    const releaseRun = shared.hold();
    release();
    const errors = undoAll([
      () => {
        throw new Error("dispose");
      },
      () => {}, // scope, viewer
      releaseRun,
    ]);
    expect(errors).toHaveLength(1);
    expect(destroy).toHaveBeenCalledOnce();
  });
});

describe("createEngineKeeper", () => {
  /** A keeper on a fake clock: `advance` runs the timers that fall due. */
  function setup(graceMs = 1000) {
    let now = 0;
    const timers = new Map<number, { at: number; callback: () => void }>();
    let nextTimer = 1;
    const created: string[] = [];
    const destroyed: string[] = [];
    const keeper = createEngineKeeper<string>({
      create: async () => {
        const name = `engine ${created.length + 1}`;
        created.push(name);
        return name;
      },
      destroy: (name) => destroyed.push(name),
      graceMs,
      setTimer: (callback, ms) => {
        const id = nextTimer++;
        timers.set(id, { at: now + ms, callback });
        return id;
      },
      clearTimer: (id) => void timers.delete(id as number),
    });
    const advance = (ms: number) => {
      now += ms;
      for (const [id, timer] of [...timers]) {
        if (timer.at <= now) {
          timers.delete(id);
          timer.callback();
        }
      }
    };
    return { keeper, created, destroyed, advance, timers };
  }

  it("shares one engine between a mount, an unmount and a remount (strict mode)", async () => {
    const { keeper, created, destroyed, advance } = setup();
    const first = keeper.acquire();
    first.release();
    const second = keeper.acquire();
    const [a, b] = await Promise.all([first.ready, second.ready]);
    expect(a).toBe(b);
    expect(created).toEqual(["engine 1"]);
    advance(5000);
    expect(destroyed).toEqual([]);
    second.release();
    advance(999);
    expect(destroyed).toEqual([]);
    advance(1);
    expect(destroyed).toEqual(["engine 1"]);
  });

  it("keeps the engine for the grace period after the last lease, for a returning page", async () => {
    const { keeper, created, destroyed, advance } = setup();
    const first = keeper.acquire();
    await first.ready;
    first.release();
    advance(600);
    const again = keeper.acquire();
    expect((await again.ready).value).toBe("engine 1");
    advance(10_000);
    expect(destroyed).toEqual([]);
    again.release();
    advance(1000);
    expect(destroyed).toEqual(["engine 1"]);
    // Past the grace period it is made again.
    const later = keeper.acquire();
    expect((await later.ready).value).toBe("engine 2");
    expect(created).toEqual(["engine 1", "engine 2"]);
  });

  it("destroys only once what still holds the engine lets go", async () => {
    const { keeper, destroyed, advance } = setup();
    const lease = keeper.acquire();
    const shared = await lease.ready;
    const releaseRun = shared.hold();
    lease.release();
    advance(1000);
    expect(destroyed).toEqual([]);
    releaseRun();
    expect(destroyed).toEqual(["engine 1"]);
  });

  it("counts each release once, however often it is called", async () => {
    const { keeper, destroyed, advance } = setup();
    const one = keeper.acquire();
    const two = keeper.acquire();
    await one.ready;
    one.release();
    one.release();
    advance(5000);
    expect(destroyed).toEqual([]);
    two.release();
    advance(1000);
    expect(destroyed).toEqual(["engine 1"]);
  });

  it("destroys an engine that was let go of before it was made", async () => {
    const { keeper, destroyed, advance } = setup(0);
    const lease = keeper.acquire();
    lease.release();
    advance(0);
    await lease.ready;
    expect(destroyed).toEqual(["engine 1"]);
  });

  it("makes a new one after a failure, and tells each lease", async () => {
    let attempts = 0;
    const keeper = createEngineKeeper<string>({
      create: async () => {
        if (++attempts === 1) {
          throw new Error("no adapter");
        }
        return "engine";
      },
      destroy: () => {},
      graceMs: 1000,
    });
    const failed = keeper.acquire();
    await expect(failed.ready).rejects.toThrow("no adapter");
    const retried = keeper.acquire();
    expect((await retried.ready).value).toBe("engine");
    expect(attempts).toBe(2);
  });
});
