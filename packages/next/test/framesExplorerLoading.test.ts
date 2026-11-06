// The frames explorer's data-item states (examples/frames-explorer/loading.ts,
// R9): idle → fetching → ready | missing | error, with abort back to idle, so
// an indicator can never stick (Review Focus 5).
import { describe, expect, it, vi } from "vitest";
import {
  LoadingModel,
  initialStatus,
  transition,
} from "../examples/frames-explorer/loading.ts";

describe("an item's transitions", () => {
  const idle = initialStatus("proj");

  it("starts idle", () => {
    expect(idle).toEqual({ item: "proj", state: "idle" });
  });

  it("goes idle → fetching → ready with bytes and time", () => {
    const fetching = transition(idle, { type: "fetching" });
    expect(fetching.state).toBe("fetching");
    const progressed = transition(fetching, {
      type: "progress",
      received: 10,
      total: 100,
    });
    expect(progressed).toMatchObject({ received: 10, total: 100 });
    const ready = transition(progressed, { type: "ready", bytes: 100, ms: 5 });
    expect(ready).toEqual({ item: "proj", state: "ready", bytes: 100, ms: 5 });
  });

  it("ends a fetch at missing or error with its detail, and no progress left over", () => {
    const fetching = transition(transition(idle, { type: "fetching" }), {
      type: "progress",
      received: 3,
    });
    const missing = transition(fetching, {
      type: "missing",
      detail: "run npm run setup",
    });
    expect(missing).toEqual({
      item: "proj",
      state: "missing",
      detail: "run npm run setup",
    });
    const error = transition(fetching, { type: "error", detail: "ended" });
    expect(error).toEqual({ item: "proj", state: "error", detail: "ended" });
  });

  it("treats a duplicate final state as no change (a joined load answers twice)", () => {
    const ready = transition(transition(idle, { type: "fetching" }), {
      type: "ready",
      bytes: 100,
      ms: 5,
    });
    expect(transition(ready, { type: "ready", bytes: 100, ms: 9 })).toBe(ready);
    const error = transition(transition(idle, { type: "fetching" }), {
      type: "error",
      detail: "x",
    });
    expect(transition(error, { type: "error", detail: "x" })).toBe(error);
  });

  it("ignores progress that arrives after the end", () => {
    const ready = transition(transition(idle, { type: "fetching" }), {
      type: "ready",
    });
    expect(transition(ready, { type: "progress", received: 5 })).toBe(ready);
  });

  it("starts a progress report's fetch when the fetching state was missed", () => {
    expect(
      transition(idle, { type: "progress", received: 5, total: 9 }),
    ).toEqual({ item: "proj", state: "fetching", received: 5, total: 9 });
  });

  it("keeps a ready item ready: a later missing or error doesn't replace it", () => {
    const ready = transition(transition(idle, { type: "fetching" }), {
      type: "ready",
    });
    expect(transition(ready, { type: "error", detail: "late" })).toBe(ready);
    expect(transition(ready, { type: "fetching" })).toBe(ready);
  });

  it("fetches again after a failure (Retry)", () => {
    const error = transition(transition(idle, { type: "fetching" }), {
      type: "error",
      detail: "x",
    });
    expect(transition(error, { type: "fetching" })).toEqual({
      item: "proj",
      state: "fetching",
    });
  });

  it("aborts a fetch back to idle, and leaves a final state alone", () => {
    const fetching = transition(idle, { type: "fetching" });
    expect(transition(fetching, { type: "abort" })).toEqual(idle);
    const ready = transition(fetching, { type: "ready" });
    expect(transition(ready, { type: "abort" })).toBe(ready);
  });

  it("takes an error straight from idle (a worker that failed before it fetched)", () => {
    expect(transition(idle, { type: "error", detail: "worker" })).toEqual({
      item: "proj",
      state: "error",
      detail: "worker",
    });
  });
});

describe("the model", () => {
  it("holds every item, idle", () => {
    const model = new LoadingModel();
    expect(model.items.map((s) => [s.item, s.state])).toEqual([
      ["frames", "idle"],
      ["proj", "idle"],
      ["geoid", "idle"],
      ["orion", "idle"],
    ]);
  });

  it("applies the worker's progress and state replies", () => {
    const model = new LoadingModel();
    model.reply({ type: "state", item: "proj", state: "fetching" });
    model.reply({ type: "progress", item: "proj", received: 4, total: 8 });
    expect(model.get("proj")).toMatchObject({
      state: "fetching",
      received: 4,
      total: 8,
    });
    model.reply({
      type: "state",
      item: "proj",
      state: "ready",
      bytes: 8,
      ms: 2,
      id: 3,
    });
    expect(model.get("proj")).toEqual({
      item: "proj",
      state: "ready",
      bytes: 8,
      ms: 2,
    });
  });

  it("notifies only on change, and gives a new items array each change", () => {
    const model = new LoadingModel();
    const listener = vi.fn();
    model.subscribe(listener);
    const before = model.items;
    model.apply("orion", { type: "fetching" });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(model.items).not.toBe(before);
    model.apply("orion", { type: "ready" });
    model.apply("orion", { type: "ready" });
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("resets every item left fetching to idle (dispose), and only those", () => {
    const model = new LoadingModel();
    model.apply("frames", { type: "fetching" });
    model.apply("frames", { type: "ready" });
    model.apply("proj", { type: "fetching" });
    model.apply("orion", { type: "progress", received: 1 });
    model.reset();
    expect(model.items.map((s) => s.state)).toEqual([
      "ready",
      "idle",
      "idle",
      "idle",
    ]);
    expect(model.items.some((s) => s.state === "fetching")).toBe(false);
  });

  it("says whether an item is final", () => {
    const model = new LoadingModel();
    expect(model.isFinal("geoid")).toBe(false);
    model.apply("geoid", { type: "missing", detail: "no grid" });
    expect(model.isFinal("geoid")).toBe(true);
  });

  it("stops notifying an unsubscribed listener", () => {
    const model = new LoadingModel();
    const listener = vi.fn();
    const stop = model.subscribe(listener);
    stop();
    model.apply("proj", { type: "fetching" });
    expect(listener).not.toHaveBeenCalled();
  });
});
