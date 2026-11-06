import { describe, expect, it, vi } from "vitest";
import {
  createParamsStore,
  mergeParams,
  normalizeRun,
  searchToParams,
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
