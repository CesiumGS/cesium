// Plan 4b Task 20: the design globe's short tour (examples/design-globe/
// tour.ts; DESIGN.md "A short tour"): six steps, one sentence each, Next,
// Back and "Explore on your own" always there; a deep link opens at a step;
// leaving keeps everything. And the viewer toggles' link (viewParams.ts).
import { describe, expect, it } from "vitest";
import {
  TOUR_LADDER,
  TOUR_STEPS,
  formatTourStep,
  nextTour,
  parseTourStep,
  tourAutoStart,
  tourCard,
  tourTarget,
  type TourFacts,
} from "../examples/design-globe/tour.ts";
import {
  DEFAULT_VIEW,
  formatView,
  parseView,
} from "../examples/design-globe/viewParams.ts";

const FACTS: TourFacts = {
  markerSeparation: 30.58593643467373,
  codes: "EPSG:6420+6360",
  mark: { pid: "HS5109", name: "GOLD CREEK", rigidOffset: 19.278 },
  pair: { horizontal: 10_000.000000000253, symbol: "ftUS", rigidShort: 0.233 },
  ladder: new Map([
    ["amsterdam", { error: 0.0025631575, extent: 60.03 }],
    ["sydney", { error: 0.39011286, extent: 3970.34 }],
    ["london", { error: 18.338542359, extent: 30_726.8 }],
  ]),
};

describe("design globe tour", () => {
  it("has the six steps DESIGN.md lists, in order", () => {
    expect(TOUR_STEPS.map((s) => s.id)).toEqual([
      "rigid",
      "morph",
      "mark",
      "pair",
      "ladder",
      "yours",
    ]);
    expect(TOUR_LADDER.map((s) => s.site)).toEqual([
      "amsterdam",
      "sydney",
      "london",
    ]);
  });

  it("steps forward and back, staying inside the six, and leaves", () => {
    let s = nextTour(undefined, { type: "start" });
    expect(s).toEqual({ step: 0, stop: 0 });
    s = nextTour(s, { type: "back" });
    expect(s).toEqual({ step: 0, stop: 0 });
    for (let i = 0; i < 9; i++) {
      s = nextTour(s, { type: "next" });
    }
    expect(s).toEqual({ step: 5, stop: 0 });
    s = nextTour(s, { type: "back" });
    expect(s?.step).toBe(4);
    expect(nextTour(s, { type: "leave" })).toBeUndefined();
    expect(nextTour(undefined, { type: "next" })).toBeUndefined();
    expect(nextTour(undefined, { type: "start", step: 3 })).toEqual({
      step: 3,
      stop: 0,
    });
  });

  it("chooses a ladder stop only on the ladder step", () => {
    const ladder = nextTour(undefined, { type: "start", step: 4 });
    expect(nextTour(ladder, { type: "stop", stop: 2 })).toEqual({
      step: 4,
      stop: 2,
    });
    expect(nextTour(ladder, { type: "stop", stop: 7 })).toEqual(ladder);
    const first = nextTour(undefined, { type: "start" });
    expect(nextTour(first, { type: "stop", stop: 1 })).toEqual(first);
    // Leaving the step forgets its stop.
    const back = nextTour({ step: 4, stop: 2 }, { type: "back" });
    expect(back).toEqual({ step: 3, stop: 0 });
  });

  it("says what each step shows: its placement, site and shot", () => {
    const at = (step: number, stop = 0) => tourTarget({ step, stop });
    expect(at(0)).toEqual({ mode: "rigid", site: "corridor", shot: "opening" });
    expect(at(1)).toEqual({
      mode: "reprojected",
      site: "corridor",
      shot: "opening",
    });
    expect(at(2)).toEqual({
      mode: "reprojected",
      site: "corridor",
      shot: "mark",
    });
    expect(at(3)).toEqual({
      mode: "reprojected",
      site: "corridor",
      shot: "pair",
    });
    expect(at(4, 2)).toEqual({ mode: "rigid", site: "london", shot: "site" });
    // The hand-off keeps the view, the placement and the site.
    expect(at(5)).toEqual({ shot: "keep" });
  });

  it("narrates each step in one sentence, from the data", () => {
    const texts = TOUR_STEPS.map(
      (_, i) => tourCard({ step: i, stop: 0 }, FACTS).narration,
    );
    for (const t of texts) {
      // One sentence: one full stop, at the end.
      expect(t.endsWith(".")).toBe(true);
      expect(t.slice(0, -1)).not.toMatch(/[.!?]\s/);
    }
    expect(texts[0]).toContain("30.6 m");
    expect(texts[1]).toContain("EPSG:6420+6360");
    expect(texts[1]).toContain("0.000 m");
    expect(texts[2]).toContain("HS5109 GOLD CREEK");
    expect(texts[2]).toContain("19.3 m");
    expect(texts[3]).toContain("10,000 ftUS");
    expect(texts[3]).toContain("233 mm");
    expect(texts[4]).toContain("2.6 mm");
    expect(texts[4]).toContain("390 mm");
    expect(texts[4]).toContain("18.3 m");
  });

  it("leaves a figure out rather than inventing one", () => {
    const bare: TourFacts = { codes: "EPSG:6420+6360", ladder: new Map() };
    for (let i = 0; i < TOUR_STEPS.length; i++) {
      const t = tourCard({ step: i, stop: 0 }, bare).narration;
      expect(t).not.toMatch(/undefined|NaN/);
      expect(t.endsWith(".")).toBe(true);
    }
  });

  it("keeps Next, Back and Explore on your own on every card, disabled at the ends", () => {
    const first = tourCard({ step: 0, stop: 0 }, FACTS);
    expect(first).toMatchObject({
      index: 0,
      count: 6,
      progress: "Step 1 of 6",
      canBack: false,
      canNext: true,
    });
    const last = tourCard({ step: 5, stop: 0 }, FACTS);
    expect(last).toMatchObject({ canBack: true, canNext: false });
    const ladder = tourCard({ step: 4, stop: 1 }, FACTS);
    expect(ladder.stops?.map((s) => [s.label, s.selected])).toEqual([
      ["Building", false],
      ["Airport", true],
      ["Pole line", false],
    ]);
    expect(first.stops).toBeUndefined();
  });

  it("reads and writes its step in the link, 1 to 6", () => {
    expect(parseTourStep({ tour: "3" })).toBe(2);
    expect(parseTourStep({ tour: "1" })).toBe(0);
    for (const bad of ["0", "7", "x", "2.5", "-1", " 3", ""]) {
      expect(parseTourStep({ tour: bad })).toBeUndefined();
    }
    expect(parseTourStep({})).toBeUndefined();
    expect(parseTourStep(Object.create({ tour: "2" }))).toBeUndefined();
    expect(formatTourStep(2)).toEqual({ tour: "3" });
    expect(formatTourStep(undefined)).toEqual({ tour: undefined });
  });

  it("starts by itself on a bare link only, and at a linked step", () => {
    expect(tourAutoStart({}, false)).toBe(0);
    expect(tourAutoStart({}, true)).toBeUndefined();
    expect(tourAutoStart({ tour: "4" }, true)).toBe(3);
    expect(tourAutoStart({ site: "london" }, false)).toBeUndefined();
    expect(tourAutoStart({ a: "1,2,3", b: "4,5,6" }, false)).toBeUndefined();
  });
});

describe("design globe view toggles", () => {
  it("are off by default and left out of the link", () => {
    expect(DEFAULT_VIEW).toEqual({ compass: false, ribbon: false });
    expect(parseView({})).toEqual(DEFAULT_VIEW);
    expect(formatView(DEFAULT_VIEW)).toEqual({
      compass: undefined,
      ribbon: undefined,
    });
  });

  it("round-trip on, each on its own", () => {
    for (const compass of [false, true]) {
      for (const ribbon of [false, true]) {
        expect(parseView(formatView({ compass, ribbon }))).toEqual({
          compass,
          ribbon,
        });
      }
    }
    expect(parseView({ compass: "on", ribbon: "yes" })).toEqual({
      compass: true,
      ribbon: false,
    });
  });
});
