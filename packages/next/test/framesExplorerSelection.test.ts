// The frames explorer's shared selection (examples/frames-explorer/selection.ts,
// R14, R15): its URL params round trip, unknown ids parse to none, and a
// re-run or a lens change never leaves a stale selection (Review Focus 8).
import { describe, expect, it, vi } from "vitest";
import {
  LENS_CHOICES,
  ViewStore,
  formatParams,
  parseParams,
  parseSelection,
  reconcile,
  type Known,
  type Selection,
} from "../examples/frames-explorer/selection.ts";

const known: Known = {
  frames: new Set(["MOON_PA", "ITRF", "engineering:California zone 3"]),
  results: new Map([
    ["space.lunar-time", ["space", "timing"]],
    ["measurement.grid-to-ground", ["civil"]],
  ]),
  tours: ["earth-frames", "design-grid"],
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

  it("round-trips a tour stop and an iModel id", () => {
    const params = formatParams({
      selection: { kind: "none" },
      lens: "all",
      tour: "design-grid",
    });
    expect(parseParams({ tour: params.tour! }, known).tour).toBe("design-grid");
    expect(parseParams({ imodel: "1234" }, known).imodel).toBe("1234");
  });

  it("parses an unknown id, kind, lens or tour to the default without throwing", () => {
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
    ).toEqual({ selection: { kind: "none" }, lens: "all" });
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
