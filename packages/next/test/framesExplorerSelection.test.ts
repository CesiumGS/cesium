// The frames explorer's shared selection (examples/frames-explorer/selection.ts,
// R14, R15): its URL params round trip, unknown ids parse to none, and a
// re-run or a lens change never leaves a stale selection (Review Focus 8).
import { describe, expect, it, vi } from "vitest";
import {
  LENS_CHOICES,
  ViewStore,
  formatParams,
  groupOfResult,
  loadLinkedResult,
  parseParams,
  parseSelection,
  reconcile,
  type Known,
  type Selection,
} from "../examples/frames-explorer/selection.ts";
import type { ScenarioSpec } from "../examples/frames-explorer/scenarios/spec.ts";
import { SCENARIOS } from "../examples/frames-explorer/scenarios/specs.ts";

/** A scenario at its checked setup, as parseParams gives it. */
const checkedSetup = (s: ScenarioSpec) => ({
  scenario: s.id,
  knobs: s.checked.knobs,
  time: Date.parse(s.checked.epochUtc),
});

/** formatParams' output as the URL holds it: undefined ones removed. */
const present = (
  params: Record<string, string | undefined>,
): Record<string, string> =>
  Object.fromEntries(
    Object.entries(params).filter(
      (e): e is [string, string] => e[1] !== undefined,
    ),
  );

const known: Known = {
  frames: new Set(["MOON_PA", "ITRF", "engineering:California zone 3"]),
  results: new Map([
    ["space.lunar-time", ["space", "timing"]],
    ["measurement.grid-to-ground", ["civil"]],
  ]),
};

describe("URL params (R15)", () => {
  const selections: Selection[] = [
    { kind: "none" },
    { kind: "frame", id: "MOON_PA" },
    { kind: "frame", id: "engineering:California zone 3" },
    { kind: "result", id: "space.lunar-time" },
  ];

  it("round-trips every selection kind with every lens", () => {
    for (const selection of selections) {
      for (const lens of LENS_CHOICES) {
        const params = formatParams({ selection, lens });
        const clean = Object.fromEntries(
          Object.entries(params).filter(
            (e): e is [string, string] => e[1] !== undefined,
          ),
        );
        expect(parseParams(clean, known)).toMatchObject({ selection, lens });
      }
    }
  });

  it("writes the plan's form, select=result:<id>&lens=<lens>, and leaves defaults out", () => {
    expect(
      formatParams({
        selection: { kind: "result", id: "space.lunar-time" },
        lens: "space",
      }),
    ).toEqual({
      select: "result:space.lunar-time",
      lens: "space",
      tour: undefined,
    });
    expect(formatParams({ selection: { kind: "none" }, lens: "all" })).toEqual({
      select: undefined,
      lens: undefined,
      tour: undefined,
    });
  });

  it("reads an iModel id, and removes the retired tour's param from a link", () => {
    expect(parseParams({ imodel: "1234" }, known).imodel).toBe("1234");
    const params = formatParams({ selection: { kind: "none" }, lens: "all" });
    expect(Object.hasOwn(params, "tour")).toBe(true);
    expect(params.tour).toBeUndefined();
    expect(parseParams({ tour: "design-grid" }, known)).not.toHaveProperty(
      "tour",
    );
  });

  it("parses an unknown id, kind, lens or an old tour stop to the default without throwing", () => {
    expect(parseSelection("result:no.such.result", known)).toEqual({
      kind: "none",
    });
    expect(parseSelection("frame:NOT_A_FRAME", known)).toEqual({
      kind: "none",
    });
    expect(parseSelection("planet:MARS", known)).toEqual({ kind: "none" });
    expect(parseSelection("", known)).toEqual({ kind: "none" });
    expect(parseSelection(undefined, known)).toEqual({ kind: "none" });
    expect(
      parseParams({ lens: "astrology", tour: "nowhere", select: "x" }, known),
    ).toEqual({
      selection: { kind: "none" },
      lens: "all",
      against: "ITRF",
      ...checkedSetup(SCENARIOS[0]!),
    });
  });

  it("keeps a well-formed id when nothing is known yet (a deep link before the run)", () => {
    expect(parseSelection("result:space.lunar-time")).toEqual({
      kind: "result",
      id: "space.lunar-time",
    });
    expect(parseSelection(`result:${"x".repeat(500)}`)).toEqual({
      kind: "none",
    });
    expect(parseSelection("result:<script>")).toEqual({ kind: "none" });
  });

  it("drops an iModel id that isn't one", () => {
    expect(parseParams({ imodel: "javascript:alert(1)" }, known).imodel).toBe(
      undefined,
    );
    expect(
      parseParams({ imodel: "0b5a6c2e-8c2e-4b7f-9a8a-1f2e3d4c5b6a" }, known)
        .imodel,
    ).toBe("0b5a6c2e-8c2e-4b7f-9a8a-1f2e3d4c5b6a");
  });
});

describe("keeping the selection valid (Review Focus 8)", () => {
  it("keeps a still-valid selection after a re-run", () => {
    const s: Selection = { kind: "result", id: "space.lunar-time" };
    expect(reconcile(s, "all", known)).toBe(s);
  });

  it("clears a selection that vanished in a re-run", () => {
    const after: Known = { ...known, results: new Map() };
    expect(
      reconcile({ kind: "result", id: "space.lunar-time" }, "all", after),
    ).toEqual({ kind: "none" });
    expect(reconcile({ kind: "frame", id: "GONE" }, "all", known)).toEqual({
      kind: "none",
    });
  });

  it("clears a result the lens hides, and keeps one it shows", () => {
    const s: Selection = { kind: "result", id: "measurement.grid-to-ground" };
    expect(reconcile(s, "space", known)).toEqual({ kind: "none" });
    expect(reconcile(s, "civil", known)).toBe(s);
    // A frame selection is not filtered by the lens.
    const f: Selection = { kind: "frame", id: "MOON_PA" };
    expect(reconcile(f, "space", known)).toBe(f);
  });
});

describe("the view store", () => {
  it("notifies on change only, and reconciles on a lens change", () => {
    const store = new ViewStore();
    store.setKnown(known);
    const listener = vi.fn();
    store.subscribe(listener);
    store.select({ kind: "result", id: "measurement.grid-to-ground" });
    expect(listener).toHaveBeenCalledTimes(1);
    store.select({ kind: "result", id: "measurement.grid-to-ground" });
    expect(listener).toHaveBeenCalledTimes(1);
    store.setLens("space");
    expect(store.get().selection).toEqual({ kind: "none" });
    expect(store.get().lens).toBe("space");
  });

  it("clears a vanished selection when what is known changes", () => {
    const store = new ViewStore();
    store.setKnown(known);
    store.select({ kind: "result", id: "space.lunar-time" });
    store.setKnown({ ...known, results: new Map() });
    expect(store.get().selection).toEqual({ kind: "none" });
  });

  it("keeps a deep-linked selection until the results it names are known", () => {
    const store = new ViewStore();
    store.apply(parseParams({ select: "result:space.lunar-time" }));
    expect(store.get().selection).toEqual({
      kind: "result",
      id: "space.lunar-time",
    });
    store.setKnown(known);
    expect(store.get().selection).toEqual({
      kind: "result",
      id: "space.lunar-time",
    });
  });
});

describe("a deep-linked result that isn't loaded (R15, Review Focus 8)", () => {
  const linked = () => {
    const store = new ViewStore();
    store.select({ kind: "result", id: "space.lunar-time" });
    return store;
  };

  it("runs its group, then says it's there to show", async () => {
    const store = linked();
    let loaded = false;
    const run = vi.fn(async () => {
      loaded = true;
    });
    const notice = vi.fn();
    const outcome = await loadLinkedResult(store, "space.lunar-time", {
      has: () => loaded,
      run,
      notice,
    });
    expect(outcome).toBe("shown");
    expect(run).toHaveBeenCalledWith("space");
    expect(notice).not.toHaveBeenCalled();
  });

  it("retries a failing run once, then clears the selection and says why, without hanging", async () => {
    const store = linked();
    const run = vi.fn(() => Promise.reject(new Error("the worker failed")));
    const notice = vi.fn();
    const outcome = await loadLinkedResult(store, "space.lunar-time", {
      has: () => false,
      run,
      notice,
    });
    expect(outcome).toBe("cleared");
    expect(run).toHaveBeenCalledTimes(2);
    expect(store.get().selection).toEqual({ kind: "none" });
    expect(notice).toHaveBeenCalledTimes(1);
    expect(notice.mock.calls[0]![0]).toMatch(
      /space\.lunar-time.*the worker failed/,
    );
  });

  it("clears a result its group's run doesn't give", async () => {
    const store = linked();
    const notice = vi.fn();
    const outcome = await loadLinkedResult(store, "space.lunar-time", {
      has: () => false,
      run: async () => {},
      notice,
    });
    expect(outcome).toBe("cleared");
    expect(store.get().selection).toEqual({ kind: "none" });
    expect(notice.mock.calls[0]![0]).toMatch(/isn't in/);
  });

  it("clears an id that names no group, without running anything", async () => {
    const store = new ViewStore();
    store.select({ kind: "result", id: "nowhere.at-all" });
    const run = vi.fn(async () => {});
    const outcome = await loadLinkedResult(store, "nowhere.at-all", {
      has: () => false,
      run,
      notice: () => {},
    });
    expect(outcome).toBe("cleared");
    expect(run).not.toHaveBeenCalled();
  });

  it("leaves a selection the user changed meanwhile alone", async () => {
    const store = linked();
    const outcome = await loadLinkedResult(store, "space.lunar-time", {
      has: () => false,
      run: async () => {
        store.select({ kind: "frame", id: "ITRF" });
      },
      notice: () => {},
    });
    expect(outcome).toBe("stale");
    expect(store.get().selection).toEqual({ kind: "frame", id: "ITRF" });
  });
});

describe("a deep-linked result the run's results clear", () => {
  it("still says why", async () => {
    const store = new ViewStore();
    store.select({ kind: "result", id: "space.lunar-time" });
    const notice = vi.fn();
    const outcome = await loadLinkedResult(store, "space.lunar-time", {
      has: () => false,
      run: async () => {
        store.setKnown({ results: new Map() });
      },
      notice,
    });
    expect(outcome).toBe("cleared");
    expect(notice).toHaveBeenCalledTimes(1);
  });
});

describe("a deep link into a group that hasn't run (partial runs, R15)", () => {
  // Only Measurement has run: Space's results aren't known yet.
  const partial: Known = {
    ...known,
    results: new Map([["measurement.grid-to-ground", ["civil"]]]),
    ran: new Set(["measurement"]),
  };

  it("keeps a result whose group hasn't run, for its run to confirm", () => {
    const s: Selection = { kind: "result", id: "space.lunar-time" };
    expect(reconcile(s, "all", partial)).toBe(s);
    expect(
      parseParams({ select: "result:space.lunar-time" }, partial).selection,
    ).toEqual(s);
  });

  it("still clears an unknown result of a group that ran", () => {
    expect(
      reconcile({ kind: "result", id: "measurement.nothing" }, "all", partial),
    ).toEqual({ kind: "none" });
  });

  it("starts that group's run and shows the result, instead of clearing it", async () => {
    const store = new ViewStore();
    store.setKnown(partial);
    store.apply(parseParams({ select: "result:space.lunar-time" }));
    expect(store.get().selection).toEqual({
      kind: "result",
      id: "space.lunar-time",
    });
    let loaded = false;
    const run = vi.fn(async (group: string) => {
      loaded = true;
      store.setKnown({
        ...partial,
        results: new Map([
          ...partial.results!,
          ["space.lunar-time", ["space", "timing"] as const],
        ]),
        ran: new Set([...partial.ran!, group]),
      });
    });
    const outcome = await loadLinkedResult(store, "space.lunar-time", {
      has: () => loaded,
      run,
      notice: () => {},
    });
    expect(run).toHaveBeenCalledWith("space");
    expect(outcome).toBe("shown");
    expect(store.get().selection).toEqual({
      kind: "result",
      id: "space.lunar-time",
    });
  });

  it("knows a result's group from its id", () => {
    expect(groupOfResult("space.lunar-time")).toBe("space");
    expect(groupOfResult("measurement.grid-to-ground")).toBe("measurement");
    expect(groupOfResult("nowhere.at-all")).toBeUndefined();
  });
});

describe("the walk's reference in the shared view (S-I5, R15)", () => {
  it("round-trips against= and leaves the default (ITRF) out", () => {
    for (const against of ["ITRF", "GCRF", "ICRF"] as const) {
      const p = formatParams({
        selection: { kind: "frame", id: "MOON_PA" },
        lens: "all",
        against,
      });
      expect(p.against).toBe(against === "ITRF" ? undefined : against);
      const clean = Object.fromEntries(
        Object.entries(p).filter(
          (e): e is [string, string] => e[1] !== undefined,
        ),
      );
      expect(parseParams(clean).against).toBe(against);
    }
    expect(parseParams({ against: "WGS84" }).against).toBe("ITRF");
  });

  it("is kept by the store, and notifies when it changes", () => {
    const store = new ViewStore();
    const listener = vi.fn();
    store.subscribe(listener);
    expect(store.get().against).toBe("ITRF");
    store.setAgainst("ICRF");
    expect(store.get().against).toBe("ICRF");
    expect(listener).toHaveBeenCalledTimes(1);
    store.setAgainst("ICRF");
    expect(listener).toHaveBeenCalledTimes(1);
    store.apply(parseParams({ against: "GCRF" }));
    expect(store.get().against).toBe("GCRF");
  });
});

describe("node and edge selections (the tree diagram)", () => {
  it("round-trip as select=node:<id> and select=edge:<id>, an edge named by its child", () => {
    for (const selection of [
      { kind: "node", id: "MOON_PA" },
      { kind: "edge", id: "engineering:California zone 3" },
    ] as const) {
      const params = formatParams({ selection, lens: "all" });
      expect(params.select).toBe(`${selection.kind}:${selection.id}`);
      expect(parseParams(present(params), known).selection).toEqual(selection);
    }
  });

  it("parse to none when the tree hasn't that node, or the id isn't one", () => {
    expect(parseSelection("node:NOT_A_FRAME", known)).toEqual({ kind: "none" });
    expect(parseSelection("edge:GONE", known)).toEqual({ kind: "none" });
    expect(parseSelection("edge:<script>", known)).toEqual({ kind: "none" });
    // Before the tree is drawn, a well-formed id stands, for the tree to confirm.
    expect(parseSelection("edge:ITRF")).toEqual({ kind: "edge", id: "ITRF" });
  });

  it("are cleared when the node leaves the tree, and not filtered by the lens", () => {
    const s: Selection = { kind: "node", id: "MOON_PA" };
    expect(reconcile(s, "civil", known)).toBe(s);
    expect(
      reconcile({ kind: "edge", id: "MOON_PA" }, "all", {
        frames: new Set(["ITRF"]),
      }),
    ).toEqual({ kind: "none" });
  });
});

describe("scenario, knob and time params (R15, Review Focus 4)", () => {
  const first = SCENARIOS[0]!;
  const dish = SCENARIOS.find((s) => s.id === "dish-tracks")!;
  const bim = SCENARIOS.find((s) => s.id === "bim-site")!;
  const drone = SCENARIOS.find((s) => s.id === "drone")!;

  it("opens on the first scenario at its checked setup when the URL names none", () => {
    expect(parseParams({})).toMatchObject(checkedSetup(first));
  });

  it("falls back to the default scenario's checked setup for a hostile link, without throwing", () => {
    const hostile = {
      scenario: "nope",
      "k.station": "Mars",
      "k.tilt": "1e9",
      t: "abc",
    };
    expect(() => parseParams(hostile, known)).not.toThrow();
    expect(parseParams(hostile, known)).toMatchObject(checkedSetup(first));
  });

  it("falls back per value: an unknown choice and a malformed time to the checked setup, a range clamped", () => {
    expect(
      parseParams({ scenario: "dish-tracks", "k.station": "Mars", t: "abc" }),
    ).toMatchObject(checkedSetup(dish));
    for (const t of ["", "1.5e", "Infinity", "NaN", "0x10", "1e400", "9e15"]) {
      expect(parseParams({ scenario: "dish-tracks", t }).time, t).toBe(
        Date.parse(dish.checked.epochUtc),
      );
    }
    // A hostile long knob value parses quickly, to the checked value (ReDoS).
    const start = performance.now();
    expect(
      parseParams({
        scenario: "bim-site",
        "k.rotation": `${"1".repeat(100_000)}x`,
      }).knobs?.rotation,
    ).toBe(bim.checked.knobs.rotation);
    // 1 s, not 50 ms: a loaded machine mustn't make it flake (P1); a
    // backtracking regex would take minutes.
    expect(performance.now() - start).toBeLessThan(1000);
    // Minus zero is the epoch, not −0.
    expect(Object.is(parseParams({ t: "-0" }).time, 0)).toBe(true);
    const tilt = drone.knobs.find((k) => k.id === "tilt")!;
    expect(
      parseParams({ scenario: "drone", "k.tilt": "1e9" }).knobs?.tilt,
    ).toBe(tilt.max);
    // A prototype key, or another scenario's knob, is no knob of this one.
    expect(
      parseParams({ scenario: "__proto__", "k.__proto__": "x" }),
    ).toMatchObject(checkedSetup(first));
    expect(
      parseParams({ scenario: "dish-tracks", "k.tilt": "10" }).knobs,
    ).toEqual(dish.checked.knobs);
  });

  it("round-trips a scenario off its checked setup", () => {
    const view = {
      selection: { kind: "node", id: "ITRF" } as const,
      lens: "all" as const,
      scenario: bim.id,
      knobs: { crs: "utm-10n", rotation: -30.5, scale: 0.99996 },
      time: Date.parse("2026-05-01T08:30:00.250Z"),
    };
    const params = formatParams(view);
    expect(present(params)).toEqual({
      select: "node:ITRF",
      scenario: "bim-site",
      "k.crs": "utm-10n",
      "k.rotation": "-30.5",
      "k.scale": "0.99996",
      t: String(view.time),
    });
    expect(parseParams(present(params), known)).toMatchObject(view);
  });

  it("formatParams(parseParams(x)) gives back valid params, with checked values left out", () => {
    const valid: Record<string, string>[] = [
      {},
      { scenario: "dish-tracks" },
      { scenario: "dish-tracks", "k.station": "DSS-14" },
      { scenario: "drone", "k.tilt": "30", t: "1775480153020" },
      { scenario: "stand-on-moon", "k.latitude": "-45.5", select: "edge:ITRF" },
      { "k.frame": "GCRF" },
    ];
    for (const x of valid) {
      expect(
        present(formatParams(parseParams(x, known))),
        JSON.stringify(x),
      ).toEqual(x);
    }
  });

  it("removes the knobs of the scenario switched from, and leaves scenario params alone without a scenario", () => {
    const params = formatParams({
      selection: { kind: "none" },
      lens: "all",
      scenario: dish.id,
      knobs: dish.checked.knobs,
      time: Date.parse(dish.checked.epochUtc),
    });
    expect(present(params)).toEqual({ scenario: "dish-tracks" });
    for (const s of SCENARIOS) {
      for (const k of s.knobs) {
        expect(Object.hasOwn(params, `k.${k.id}`), k.id).toBe(true);
      }
    }
    expect(params).toHaveProperty("t", undefined);
    // A view without a scenario (the page before scenarios) writes none of them.
    const plain = formatParams({ selection: { kind: "none" }, lens: "all" });
    expect(Object.keys(plain).some((key) => key.startsWith("k."))).toBe(false);
    expect(Object.hasOwn(plain, "scenario")).toBe(false);
    expect(Object.hasOwn(plain, "t")).toBe(false);
  });
});
