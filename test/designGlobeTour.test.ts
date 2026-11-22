// Plan 4b Task 20: the design globe's short tour (examples/design-globe/
// tour.ts; DESIGN.md "A short tour"): seven steps, one sentence each, Next,
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
  type TourAction,
  type TourFacts,
  type TourTarget,
} from "../examples/design-globe/tour.ts";
import {
  DEFAULT_VIEW,
  formatView,
  parseView,
} from "../examples/design-globe/viewParams.ts";
import { createRulerView } from "../examples/design-globe/rulerView.ts";
import { createTour } from "../examples/design-globe/tourRuntime.ts";

const FACTS: TourFacts = {
  markerSeparation: 30.58593643467373,
  markerStation: 170_000,
  markerKm: 23.78,
  codes: "EPSG:6420+6360",
  structures: { tunnels: 19, viaducts: 18, share: 0.662 },
  mark: { pid: "HS5109", name: "GOLD CREEK", rigidOffset: 19.278 },
  pair: {
    horizontal: 10_000.000000000253,
    symbol: "ftUS",
    rigidShort: 0.233,
    rigidOffset: 37.4,
    ruler: { feet: 10_000, gap: 0.938 },
  },
  ladder: new Map([
    [
      "amsterdam",
      {
        error: 0.0025631575,
        extent: 60.03,
        combinedFactor: 0.99991163,
        terms: { curvature: 0.00007, scale: 0.00265, geoid: 0 },
      },
    ],
    [
      "sydney",
      {
        error: 0.39011286,
        extent: 3970.34,
        terms: { curvature: 0.309, scale: 0.11, geoid: -0.02 },
      },
    ],
    [
      "london",
      {
        error: 18.338542359,
        extent: 30_726.8,
        terms: { curvature: 18.5, scale: 1.2, geoid: 0.3 },
      },
    ],
  ]),
};

describe("design globe tour", () => {
  it("has the seven steps DESIGN.md lists, in order", () => {
    expect(TOUR_STEPS.map((s) => s.id)).toEqual([
      "rigid",
      "morph",
      "mark",
      "pair",
      "tunnel",
      "ladder",
      "yours",
    ]);
    expect(TOUR_LADDER.map((s) => s.site)).toEqual([
      "amsterdam",
      "sydney",
      "london",
    ]);
  });

  it("steps forward and back, staying inside the seven, and leaves", () => {
    let s = nextTour(undefined, { type: "start" });
    expect(s).toEqual({ step: 0, stop: 0 });
    s = nextTour(s, { type: "back" });
    expect(s).toEqual({ step: 0, stop: 0 });
    for (let i = 0; i < 9; i++) {
      s = nextTour(s, { type: "next" });
    }
    expect(s).toEqual({ step: 6, stop: 0 });
    s = nextTour(s, { type: "back" });
    expect(s?.step).toBe(5);
    expect(nextTour(s, { type: "leave" })).toBeUndefined();
    expect(nextTour(undefined, { type: "next" })).toBeUndefined();
    expect(nextTour(undefined, { type: "start", step: 3 })).toEqual({
      step: 3,
      stop: 0,
    });
  });

  it("chooses a ladder stop only on the ladder step", () => {
    const ladder = nextTour(undefined, { type: "start", step: 5 });
    expect(nextTour(ladder, { type: "stop", stop: 2 })).toEqual({
      step: 5,
      stop: 2,
    });
    expect(nextTour(ladder, { type: "stop", stop: 7 })).toEqual(ladder);
    const first = nextTour(undefined, { type: "start" });
    expect(nextTour(first, { type: "stop", stop: 1 })).toEqual(first);
    // Leaving the step forgets its stop.
    const back = nextTour({ step: 5, stop: 2 }, { type: "back" });
    expect(back).toEqual({ step: 4, stop: 0 });
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
    expect(at(4)).toEqual({
      mode: "reprojected",
      site: "corridor",
      shot: "tunnel",
    });
    expect(at(5, 2)).toEqual({ mode: "rigid", site: "london", shot: "site" });
    // The hand-off keeps the view, the placement and the site.
    expect(at(6)).toEqual({ shot: "keep" });
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
    // Step 1 names the point it means (the self-check's station), as Fly along does.
    expect(texts[0]).toContain("station 1700+00");
    expect(texts[0]).toContain("23.8 km from the anchor");
    expect(texts[0]).toContain("30.6 m");
    expect(texts[0]).not.toContain("20 km");
    expect(texts[1]).toContain("EPSG:6420+6360");
    expect(texts[1]).toContain("0.000 m");
    // Step 2 names the orange ghost.
    expect(texts[1]).toMatch(/orange.*ghost/);
    expect(texts[2]).toContain("HS5109 GOLD CREEK");
    expect(texts[2]).toContain("19.3 m");
    // Step 4: the length error apart from the position.
    expect(texts[3]).toMatch(/measure 10,000 ftUS in both placements/);
    // The step's claim: only reprojected draws it where it is (UX review M-c).
    expect(texts[3]).toMatch(
      /only reprojected draws the line where it is \(rigid draws it about/,
    );
    // Read at the ruler's far end, where the tour's shot is (UX review S10).
    expect(texts[3]).toMatch(
      /ground's 10,000 ftUS ends 0\.938 ftUS before design's/,
    );
    expect(texts[3]).not.toMatch(/\d ft\b/);
    expect(texts[3]).toContain("37.4 m away");
    expect(texts[3]).toContain("233 mm short");
    // Step 5: the structures, from corridor.ts, and See underground.
    expect(texts[4]).toContain(
      "19 tunnels and 18 viaducts carry 66% of the road",
    );
    expect(texts[4]).toContain("See underground");
    // Step 7 says what is checked, no more.
    expect(texts[6]).not.toMatch(/every number/);
    expect(texts[6]).toContain("Checks");
  });

  it("says each ladder stop's verdict and cause", () => {
    const at = (stop: number) => tourCard({ step: 5, stop }, FACTS).narration;
    expect(at(0)).toMatch(/^A canal building, 60 m across: rigid is fine here/);
    expect(at(0)).toContain("2.6 mm");
    expect(at(0)).toContain("mostly the scale factor rigid ignores");
    expect(at(0)).toContain("0.99991");
    // One formatter for every extent, to three figures (UX review P1).
    expect(at(1)).toMatch(/^An airport, 3\.97 km across/);
    expect(at(1)).toContain("390 mm");
    expect(at(1)).toContain("mostly the Earth's curvature");
    expect(at(1)).toMatch(/reproject it\.$/);
    expect(at(2)).toMatch(/30\.7 km pole line/);
    expect(at(2)).toContain("18.3 m");
    expect(at(2)).toMatch(/reproject it\.$/);
    for (const t of [at(0), at(1), at(2)]) {
      expect(t.slice(0, -1)).not.toMatch(/[.!?]\s/);
    }
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
      count: 7,
      progress: "Step 1 of 7",
      canBack: false,
      canNext: true,
    });
    const last = tourCard({ step: 6, stop: 0 }, FACTS);
    expect(last).toMatchObject({ canBack: true, canNext: false });
    const ladder = tourCard({ step: 5, stop: 1 }, FACTS);
    expect(ladder.stops?.map((s) => [s.label, s.selected])).toEqual([
      ["Building", false],
      ["Airport", true],
      ["Pole line", false],
    ]);
    expect(first.stops).toBeUndefined();
  });

  it("reads and writes its step in the link, 1 to 7", () => {
    expect(parseTourStep({ tour: "3" })).toBe(2);
    expect(parseTourStep({ tour: "1" })).toBe(0);
    expect(parseTourStep({ tour: "7" })).toBe(6);
    for (const bad of ["0", "8", "x", "2.5", "-1", " 3", ""]) {
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

describe("design globe tour: the ruler's close-in (UX review I2)", () => {
  /**
   * The page as main.ts drives it: a ghost and a ribbon the user set on;
   * each step's `apply` first lets the ruler's view follow the tour, and
   * the pair step closes in on the ruler (which sets both aside).
   */
  function page() {
    const drawn = { ghost: true, ribbonHidden: false };
    const ruler = createRulerView({
      ghost: () => drawn.ghost,
      setGhost: (on) => (drawn.ghost = on),
      setRibbonHidden: (hidden) => (drawn.ribbonHidden = hidden),
    });
    const tour = createTour({
      initial: { tour: "1" },
      setLink: () => {},
      apply(target: TourTarget) {
        ruler.tourStep(target);
        if (target.shot === "pair") {
          ruler.begin();
        }
        return true;
      },
      left: () => ruler.tourStep(undefined),
      changed: () => {},
    });
    /** The toolbar and the legend: what is drawn. */
    const shown = () => ({
      ghost: drawn.ghost,
      ribbon: ruler.ribbonShown(true) && !drawn.ribbonHidden,
    });
    const go = (action: TourAction) => tour.go(action);
    return { drawn, ruler, tour, shown, go };
  }
  const pairStep = TOUR_STEPS.findIndex((s) => s.id === "pair");

  it("sets the ghost and the ribbon aside on the pair step, and says so", () => {
    const p = page();
    p.go({ type: "start", step: pairStep });
    expect(p.ruler.active).toBe(true);
    expect(p.drawn).toEqual({ ghost: false, ribbonHidden: true });
    expect(p.shown()).toEqual({ ghost: false, ribbon: false });
  });

  for (const [name, action] of [
    ["Next", { type: "next" }],
    ["Back", { type: "back" }],
    ["a step button", { type: "start", step: 0 }],
    ["Explore on your own", { type: "leave" }],
  ] as const) {
    it(`brings them back when the pair step is left by ${name}`, () => {
      const p = page();
      p.go({ type: "start", step: pairStep });
      p.go(action);
      expect(p.ruler.active).toBe(false);
      expect(p.drawn).toEqual({ ghost: true, ribbonHidden: false });
      expect(p.shown()).toEqual({ ghost: true, ribbon: true });
    });
  }

  it("keeps the user's ghost off when it was off before", () => {
    const p = page();
    p.drawn.ghost = false;
    p.go({ type: "start", step: pairStep });
    p.go({ type: "next" });
    expect(p.drawn.ghost).toBe(false);
  });
});

describe("design globe view toggles", () => {
  it("are off by default and left out of the link", () => {
    expect(DEFAULT_VIEW).toEqual({
      compass: false,
      ribbon: false,
      underground: false,
    });
    expect(parseView({})).toEqual(DEFAULT_VIEW);
    expect(formatView(DEFAULT_VIEW)).toEqual({
      compass: undefined,
      ribbon: undefined,
      underground: undefined,
    });
  });

  it("round-trip on, each on its own", () => {
    for (const compass of [false, true]) {
      for (const ribbon of [false, true]) {
        for (const underground of [false, true]) {
          const v = { compass, ribbon, underground };
          expect(parseView(formatView(v))).toEqual(v);
        }
      }
    }
    expect(
      parseView({ compass: "on", ribbon: "yes", underground: "on" }),
    ).toEqual({ compass: true, ribbon: false, underground: true });
  });
});
