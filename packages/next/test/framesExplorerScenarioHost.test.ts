// The frames explorer's scenario lifecycle on the main thread
// (examples/frames-explorer/scenarioHost.ts): switching scenarios while an
// evaluation is in flight (Review Focus 3), the overlays each scenario owns,
// knob changes (debounced, with the checked marker), "Back to the checked
// setup", and the deep link's round trip.
import { describe, expect, it } from "vitest";
import type { OverlayGeometry } from "../examples/frames-explorer/protocol.ts";
import {
  createScenarioHost,
  type ScenarioHostDeps,
  type ScenarioHostState,
} from "../examples/frames-explorer/scenarioHost.ts";
import type { ScenarioEvaluation } from "../examples/frames-explorer/scenarios/evaluate.ts";
import type {
  KnobState,
  ScenarioId,
} from "../examples/frames-explorer/scenarios/spec.ts";
import { SCENARIOS } from "../examples/frames-explorer/scenarios/specs.ts";
import {
  formatParams,
  parseParams,
} from "../examples/frames-explorer/selection.ts";

const spec = (id: ScenarioId) => SCENARIOS.find((s) => s.id === id)!;
const checkedMs = (id: ScenarioId) => Date.parse(spec(id).checked.epochUtc);

const geometry = (): OverlayGeometry => ({
  kind: "trajectoryPath",
  layers: [],
  ms: 0,
});

const evaluation = (
  id: ScenarioId,
  overlays: readonly string[] = [],
  value = 1,
): ScenarioEvaluation => ({
  scenario: id,
  added: [],
  answer: {
    label: "x",
    headline: `${id} answered`,
    value,
    accuracy: { note: "test" },
  },
  overlays: overlays.map((o) => ({ id: o, geometry: geometry() })),
  live: [],
});

interface Pending {
  id: ScenarioId;
  knobs: KnobState;
  epochUtcMs: number;
  resolve: (e: ScenarioEvaluation) => void;
  reject: (e: Error) => void;
}

/** A host over recorded deps: every call in order, evaluations answered by hand. */
function harness(
  options: {
    busy?: string;
    onEnter?: (host: ReturnType<typeof createScenarioHost>) => void;
  } = {},
) {
  const log: string[] = [];
  const pending: Pending[] = [];
  const timers: { fn: () => void; ms: number; live: boolean }[] = [];
  let clock = 0;
  const states: ScenarioHostState[] = [];
  const deps: ScenarioHostDeps = {
    evaluate: (id, knobs, epochUtcMs) =>
      new Promise((resolve, reject) => {
        log.push(`evaluate ${id}`);
        pending.push({ id, knobs, epochUtcMs, resolve, reject });
      }),
    drawOverlay: (id) => log.push(`draw ${id}`),
    removeOverlay: (id) => log.push(`remove ${id}`),
    enter: (s) => {
      log.push(`enter ${s.id}`);
      options.onEnter?.(host);
    },
    update: (s, knobs) => log.push(`update ${s.id} ${JSON.stringify(knobs)}`),
    leave: (s) => log.push(`leave ${s.id}`),
    reframe: (s) => log.push(`reframe ${s.id}`),
    setClock: (ms) => {
      clock = ms;
      log.push(`clock ${ms}`);
    },
    clock: () => clock,
    changed: (s) => states.push(s),
    busy: () => options.busy,
    schedule: (fn, ms) => {
      const t = { fn, ms, live: true };
      timers.push(t);
      return () => {
        t.live = false;
      };
    },
  };
  const host = createScenarioHost(deps);
  /** Fires every timer that is still set. */
  const flush = () => {
    for (const t of timers.splice(0)) {
      if (t.live) {
        t.fn();
      }
    }
  };
  const settle = () => new Promise((r) => setTimeout(r, 0));
  return {
    host,
    log,
    pending,
    timers,
    states,
    flush,
    settle,
    setClockByUser: (ms: number) => {
      clock = ms;
    },
    last: () => host.state(),
  };
}

describe("switching scenarios mid-evaluation (Review Focus 3)", () => {
  it("drops A's late reply and draws B's", async () => {
    const h = harness();
    void h.host.show("one-path");
    void h.host.show("earth-turns");
    // A is in flight; B waits behind it (the worker can't cancel A).
    expect(h.pending.map((p) => p.id)).toEqual(["one-path"]);
    h.pending[0]!.resolve(evaluation("one-path", ["path"]));
    await h.settle();
    // A's reply drew nothing and answers nothing; B is now asked for.
    expect(h.log).not.toContain("draw scenario:one-path:path");
    expect(h.last().evaluation).toBeUndefined();
    expect(h.last().spec.id).toBe("earth-turns");
    expect(h.last().status).toBe("loading");
    expect(h.pending.map((p) => p.id)).toEqual(["one-path", "earth-turns"]);
    h.pending[1]!.resolve(evaluation("earth-turns", ["sky"]));
    await h.settle();
    expect(h.log).toContain("draw scenario:earth-turns:sky");
    expect(h.last().evaluation?.scenario).toBe("earth-turns");
    expect(h.last().status).toBe("ready");
  });

  it("keeps one request in flight and only the latest waiting", async () => {
    const h = harness();
    void h.host.show("one-path");
    void h.host.show("earth-turns");
    void h.host.show("stand-on-moon");
    void h.host.show("earth-turns", { rate: 60 });
    expect(h.pending).toHaveLength(1);
    h.pending[0]!.resolve(evaluation("one-path"));
    await h.settle();
    // The two in between were never sent.
    expect(h.pending.map((p) => [p.id, p.knobs])).toEqual([
      ["one-path", { frame: "MOON_ME" }],
      ["earth-turns", { rate: 60 }],
    ]);
  });

  it("drops A's late reply after switching A, B, then back to A at other knobs: only the latest generation draws", async () => {
    const h = harness();
    void h.host.show("one-path");
    void h.host.show("earth-turns");
    void h.host.show("one-path", { frame: "GCRF" });
    h.pending[0]!.resolve(evaluation("one-path", ["old"], 1));
    await h.settle();
    expect(h.log).not.toContain("draw scenario:one-path:old");
    expect(h.last().evaluation).toBeUndefined();
    expect(h.pending[1]!.knobs).toEqual({ frame: "GCRF" });
    h.pending[1]!.resolve(evaluation("one-path", ["new"], 2));
    await h.settle();
    expect(h.log).toContain("draw scenario:one-path:new");
    expect(h.last().evaluation?.answer.value).toBe(2);
  });

  it("drops a reply for the same scenario's earlier knobs", async () => {
    const h = harness();
    void h.host.show("stand-on-moon");
    h.host.setKnob("latitude", -10);
    h.flush();
    h.pending[0]!.resolve(evaluation("stand-on-moon", [], -90));
    await h.settle();
    expect(h.last().evaluation).toBeUndefined();
    expect(h.last().status).toBe("loading");
  });

  it("drops a late error from A: it never shows in B", async () => {
    const h = harness();
    void h.host.show("one-path");
    void h.host.show("earth-turns");
    h.pending[0]!.reject(new Error("A broke"));
    await h.settle();
    expect(h.last().problem).toBeUndefined();
    expect(h.last().status).toBe("loading");
  });

  it("drops a reply that names another scenario than the one asked for", async () => {
    const h = harness();
    void h.host.show("one-path");
    h.pending[0]!.resolve(evaluation("earth-turns", ["x"]));
    await h.settle();
    expect(h.last().evaluation).toBeUndefined();
    expect(h.log.filter((l) => l.startsWith("draw"))).toEqual([]);
  });

  it("shows the wait behind a catalog run as loading (R9)", () => {
    const h = harness({ busy: "Waiting for the catalog run to end" });
    void h.host.show("one-path");
    expect(h.last().status).toBe("loading");
    expect(h.last().queued).toBe("Waiting for the catalog run to end");
  });
});

describe("overlay ownership", () => {
  it("removes every one of A's overlays, and leaves A, before B enters or draws", async () => {
    const h = harness();
    void h.host.show("one-path");
    h.pending[0]!.resolve(evaluation("one-path", ["path", "moon"]));
    await h.settle();
    h.log.length = 0;
    void h.host.show("earth-turns");
    h.pending[1]!.resolve(evaluation("earth-turns", ["sky"]));
    await h.settle();
    const at = (line: string) => h.log.indexOf(line);
    expect(at("remove scenario:one-path:path")).toBeGreaterThanOrEqual(0);
    expect(at("remove scenario:one-path:moon")).toBeGreaterThanOrEqual(0);
    for (const removed of [
      "remove scenario:one-path:path",
      "remove scenario:one-path:moon",
    ]) {
      expect(at(removed)).toBeLessThan(at("leave one-path"));
    }
    expect(at("leave one-path")).toBeLessThan(at("enter earth-turns"));
    expect(at("enter earth-turns")).toBeLessThan(
      at("draw scenario:earth-turns:sky"),
    );
  });

  it("replaces a scenario's own overlays on a new evaluation: those it no longer has go", async () => {
    const h = harness();
    void h.host.show("stand-on-moon");
    h.pending[0]!.resolve(evaluation("stand-on-moon", ["a", "b"]));
    await h.settle();
    h.log.length = 0;
    h.host.setKnob("latitude", -45);
    h.flush();
    h.pending[1]!.resolve(evaluation("stand-on-moon", ["b"]));
    await h.settle();
    expect(h.log).toContain("remove scenario:stand-on-moon:a");
    // b's geometry is the same: it stays drawn, not uploaded again (Task 4d).
    expect(h.log).not.toContain("draw scenario:stand-on-moon:b");
    expect(h.log).not.toContain("remove scenario:stand-on-moon:b");
    expect(h.log).not.toContain("leave stand-on-moon");
  });

  it("uploads an overlay again only when its geometry changed (Task 4d)", async () => {
    const h = harness();
    const moved = (e: ScenarioEvaluation): ScenarioEvaluation => ({
      ...e,
      overlays: e.overlays.map((o) => ({
        ...o,
        geometry: { ...o.geometry, sagAtEnd: 2 },
      })),
    });
    void h.host.show("stand-on-moon");
    h.pending[0]!.resolve(evaluation("stand-on-moon", ["b"]));
    await h.settle();
    expect(h.log).toContain("draw scenario:stand-on-moon:b");
    h.log.length = 0;
    h.host.setKnob("latitude", -45);
    h.flush();
    h.pending[1]!.resolve(moved(evaluation("stand-on-moon", ["b"])));
    await h.settle();
    expect(h.log).toContain("draw scenario:stand-on-moon:b");
    // Switched away and back: drawn again, its old drawing having gone.
    h.log.length = 0;
    void h.host.show("one-path");
    h.pending.at(-1)!.resolve(evaluation("one-path"));
    await h.settle();
    void h.host.show("stand-on-moon");
    h.pending.at(-1)!.resolve(moved(evaluation("stand-on-moon", ["b"])));
    await h.settle();
    const removed = h.log.indexOf("remove scenario:stand-on-moon:b");
    expect(removed).toBeGreaterThanOrEqual(0);
    expect(h.log.indexOf("draw scenario:stand-on-moon:b")).toBeGreaterThan(
      removed,
    );
  });

  it("removes its overlays and leaves the scenario on dispose; a reply after it draws nothing", async () => {
    const h = harness();
    void h.host.show("one-path");
    h.pending[0]!.resolve(evaluation("one-path", ["path"]));
    await h.settle();
    h.host.setKnob("frame", "GCRF");
    h.flush();
    h.host.dispose();
    expect(h.log).toContain("remove scenario:one-path:path");
    expect(h.log.at(-1)).toBe("leave one-path");
    h.log.length = 0;
    h.pending[1]!.resolve(evaluation("one-path", ["path"]));
    await h.settle();
    expect(h.log).toEqual([]);
  });
});

describe("knobs", () => {
  it("re-evaluates once for a burst of changes, debounced, and moves the checked marker at once", async () => {
    const h = harness();
    void h.host.show("stand-on-moon");
    h.pending[0]!.resolve(evaluation("stand-on-moon"));
    await h.settle();
    expect(h.last().atChecked).toBe(true);
    h.host.setKnob("latitude", -80);
    // The marker moves before any evaluation comes back.
    expect(h.last().atChecked).toBe(false);
    expect(h.last().changed).toEqual(["latitude"]);
    h.host.setKnob("latitude", -70);
    h.host.setKnob("latitude", -60);
    expect(h.pending).toHaveLength(1);
    h.flush();
    expect(h.pending).toHaveLength(2);
    expect(h.pending[1]!.knobs).toEqual({ latitude: -60 });
    // The scene follows each change at once (the site's triad moves).
    expect(
      h.log.filter((l) => l.startsWith("update stand-on-moon")),
    ).toHaveLength(3);
  });

  it("clamps a knob's value to its spec and ignores a knob the scenario hasn't", () => {
    const h = harness();
    void h.host.show("stand-on-moon");
    h.host.setKnob("latitude", -500);
    expect(h.last().knobs).toEqual({ latitude: -90 });
    expect(h.last().atChecked).toBe(true);
    h.host.setKnob("frame", "GCRF");
    expect(h.last().knobs).toEqual({ latitude: -90 });
  });

  it("marks the time off the checked setup when the clock moves, and re-evaluates at most once per wait", async () => {
    const h = harness();
    void h.host.show("earth-turns");
    h.pending[0]!.resolve(evaluation("earth-turns"));
    await h.settle();
    h.setClockByUser(checkedMs("earth-turns") + 3_600_000);
    h.host.clockChanged();
    expect(h.last().changed).toEqual(["time"]);
    h.setClockByUser(checkedMs("earth-turns") + 7_200_000);
    h.host.clockChanged();
    expect(h.timers.filter((t) => t.live)).toHaveLength(1);
    h.flush();
    expect(h.pending.at(-1)!.epochUtcMs).toBe(
      checkedMs("earth-turns") + 7_200_000,
    );
  });

  it("keeps the time in whole milliseconds, as the link carries it", async () => {
    const h = harness();
    void h.host.show("earth-turns");
    h.setClockByUser(checkedMs("earth-turns") + 1000.3);
    h.host.clockChanged();
    expect(h.host.params().time).toBe(checkedMs("earth-turns") + 1000);
    const out = formatParams({
      selection: { kind: "none" },
      lens: "all",
      ...h.host.params(),
    });
    expect(parseParams(out as Record<string, string>).time).toBe(
      checkedMs("earth-turns") + 1000,
    );
  });

  it("ignores the clock change the host made itself", () => {
    const h = harness();
    void h.host.show("earth-turns");
    h.host.clockChanged();
    expect(h.last().atChecked).toBe(true);
    expect(h.timers.filter((t) => t.live)).toHaveLength(0);
  });
});

describe("Back to the checked setup", () => {
  it("restores the checked knobs and epoch, and asks at once", async () => {
    const h = harness();
    void h.host.show("one-path", { frame: "GCRF" }, checkedMs("one-path") + 60);
    expect(h.last().atChecked).toBe(false);
    expect(h.last().changed).toEqual(["frame", "time"]);
    h.host.setKnob("frame", "ITRF");
    h.host.backToChecked();
    expect(h.last().knobs).toEqual({ frame: "MOON_ME" });
    expect(h.last().epochUtcMs).toBe(checkedMs("one-path"));
    expect(h.last().atChecked).toBe(true);
    expect(h.log).toContain(`clock ${checkedMs("one-path")}`);
    // No debounce: the pending knob change is dropped, the checked setup asked for.
    h.flush();
    h.pending[0]!.resolve(evaluation("one-path"));
    await h.settle();
    expect(h.pending.map((p) => p.knobs)).toEqual([
      { frame: "GCRF" },
      { frame: "MOON_ME" },
    ]);
  });
});

describe("Back to the checked setup reframes the scene (Task 4c re-review, item 3)", () => {
  it("flies to the scene's view again, after the clock and the knobs are back: its framing is of the time it was flown at", () => {
    const h = harness();
    // Entered at a time far off the checked one (a link, or a long play):
    // the scene was framed with the Moon where it was then.
    void h.host.show(
      "one-path",
      { frame: "MOON_ME" },
      checkedMs("one-path") + 13 * 86_400_000,
    );
    h.log.length = 0;
    h.host.backToChecked();
    expect(h.log).toEqual([
      `clock ${checkedMs("one-path")}`,
      `update one-path {"frame":"MOON_ME"}`,
      "reframe one-path",
    ]);
  });

  it("doesn't reframe when the clock or a knob moves, only on Back", () => {
    const h = harness();
    void h.host.show("one-path", {}, checkedMs("one-path"));
    h.host.setKnob("frame", "GCRF");
    h.setClockByUser(checkedMs("one-path") + 3_600_000);
    h.host.clockChanged();
    h.flush();
    expect(h.log.filter((l) => l.startsWith("reframe"))).toEqual([]);
  });
});

describe("the deep link (R15)", () => {
  it("round-trips the scenario, its knobs, the time and a node selection", () => {
    const h = harness();
    const url = {
      scenario: "stand-on-moon",
      "k.latitude": "-45.5",
      t: String(checkedMs("stand-on-moon") + 86_400_000),
      select: "node:MOON_ME",
    };
    const parsed = parseParams(url, { frames: new Set(["MOON_ME"]) });
    void h.host.show(parsed.scenario!, parsed.knobs, parsed.time);
    const out = formatParams({
      selection: parsed.selection,
      lens: parsed.lens,
      against: parsed.against,
      ...h.host.params(),
    });
    expect(
      Object.fromEntries(
        Object.entries(out).filter(([, v]) => v !== undefined),
      ),
    ).toEqual(url);
    expect(h.last().epochUtcMs).toBe(Number(url.t));
    expect(h.log).toContain(`clock ${url.t}`);
  });

  it("leaves the checked setup out of the link", () => {
    const h = harness();
    void h.host.show("earth-turns");
    const out = formatParams({
      selection: { kind: "none" },
      lens: "all",
      ...h.host.params(),
    });
    expect(
      Object.fromEntries(
        Object.entries(out).filter(([, v]) => v !== undefined),
      ),
    ).toEqual({ scenario: "earth-turns" });
  });
});

describe("the host's own clock changes", () => {
  it("doesn't take the old scene's time when entering the new one fires a clock change (its rate)", () => {
    const h = harness({
      // The viewer fires its change event at once when a scene sets the
      // clock's rate, with the clock still at the old scenario's time.
      onEnter: (host) => host.clockChanged(),
    });
    void h.host.show("stand-on-moon");
    void h.host.show("earth-turns");
    expect(h.last().epochUtcMs).toBe(checkedMs("earth-turns"));
    expect(h.last().atChecked).toBe(true);
    expect(h.timers.filter((t) => t.live)).toHaveLength(0);
  });
});

describe("a stale evaluation (fix 1, item 1: Review Focus 1, R9)", () => {
  it("is marked stale from the moment a knob moves until its own setup's reply is in", async () => {
    const h = harness();
    void h.host.show("stand-on-moon");
    h.pending[0]!.resolve(evaluation("stand-on-moon"));
    await h.settle();
    expect(h.last().stale).toBe(false);
    expect(h.last().evaluatedAt).toEqual({
      knobs: { latitude: -90 },
      epochUtcMs: checkedMs("stand-on-moon"),
    });
    h.host.setKnob("latitude", -45);
    // Before the burst ends: the shown evaluation is the last setup's.
    expect(h.last().stale).toBe(true);
    expect(h.last().staleBy).toEqual(["latitude"]);
    expect(h.last().evaluation).toBeDefined();
    h.flush();
    expect(h.last().stale).toBe(true);
    h.pending[1]!.resolve(evaluation("stand-on-moon", [], 2));
    await h.settle();
    expect(h.last().stale).toBe(false);
    expect(h.last().evaluatedAt?.knobs).toEqual({ latitude: -45 });
  });

  it("is stale by the time alone while the clock moves", async () => {
    const h = harness();
    void h.host.show("earth-turns");
    h.pending[0]!.resolve(evaluation("earth-turns"));
    await h.settle();
    h.setClockByUser(checkedMs("earth-turns") + 60_000);
    h.host.clockChanged();
    expect(h.last().stale).toBe(true);
    expect(h.last().staleBy).toEqual(["time"]);
  });

  it("is not stale when the knobs come back to the evaluated setup", async () => {
    const h = harness();
    void h.host.show("stand-on-moon");
    h.pending[0]!.resolve(evaluation("stand-on-moon"));
    await h.settle();
    h.host.setKnob("latitude", -45);
    h.host.setKnob("latitude", -90);
    expect(h.last().stale).toBe(false);
  });
});

describe("scrubbing the clock (fix 1: the owner's one-path report)", () => {
  it("evaluates the scrub's last time once it rests, and marks every answer from before then stale", async () => {
    const h = harness();
    void h.host.show("one-path", { frame: "ITRF" });
    h.pending[0]!.resolve(evaluation("one-path"));
    await h.settle();
    const t0 = checkedMs("one-path");
    // A drag: many clock changes, a timer firing mid-drag, more changes.
    for (let i = 1; i <= 5; i++) {
      h.setClockByUser(t0 + i * 600_000);
      h.host.clockChanged();
    }
    h.flush();
    expect(h.pending).toHaveLength(2);
    expect(h.pending[1]!.epochUtcMs).toBe(t0 + 5 * 600_000);
    for (let i = 6; i <= 9; i++) {
      h.setClockByUser(t0 + i * 600_000);
      h.host.clockChanged();
    }
    expect(h.last().stale).toBe(true);
    expect(h.last().staleBy).toEqual(["time"]);
    // The mid-drag reply comes back. It is the latest asked for, so it
    // shows, but as the time it was made at: stale, never current (before
    // this round it read as the current answer and checks: the bug).
    h.pending[1]!.resolve(evaluation("one-path", ["mid"], 5));
    await h.settle();
    expect(h.last().evaluation?.answer.value).toBe(5);
    expect(h.last().evaluatedAt?.epochUtcMs).toBe(t0 + 5 * 600_000);
    expect(h.last().stale).toBe(true);
    // The drag rests: the last time is asked for, and its reply is current.
    h.flush();
    expect(h.pending.at(-1)!.epochUtcMs).toBe(t0 + 9 * 600_000);
    expect(h.pending.at(-1)!.knobs).toEqual({ frame: "ITRF" });
    h.pending.at(-1)!.resolve(evaluation("one-path", ["end"], 9));
    await h.settle();
    expect(h.last().stale).toBe(false);
    expect(h.last().evaluation?.answer.value).toBe(9);
    expect(h.host.params().time).toBe(t0 + 9 * 600_000);
  });
});
