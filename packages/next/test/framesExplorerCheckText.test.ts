// What a scenario's check rows and answer say (examples/frames-explorer/
// panel/checkText.ts, answerText.ts): each row's status in words, its kind
// apart from it, and nothing reads as verified that isn't (Review Focus 1).
import { describe, expect, it } from "vitest";
import {
  accuracyLine,
  accuracyWarns,
  answerTitle,
  publishedText,
  formatAnswer,
  formatDelta,
} from "../examples/frames-explorer/panel/answerText.ts";
import { movedText } from "../examples/frames-explorer/panel/knobText.ts";
import {
  KIND_TEXT,
  checkRowText,
} from "../examples/frames-explorer/panel/checkText.ts";
import { CHECK_KINDS } from "../examples/frames-explorer/scenarios/checks.ts";
import { SCENARIOS } from "../examples/frames-explorer/scenarios/specs.ts";
import type { StressResult } from "../examples/frames-explorer/tests.ts";

const result = (over: Partial<StressResult> = {}): StressResult => ({
  id: "lunar-time.moon-vs-earth.synodic",
  group: "lunar-time",
  title: "A long title",
  pass: true,
  value: 0.00054,
  tolerance: 0.02,
  ...over,
});

describe("a check row's words", () => {
  it("says a judged catalog result is checked, with its kind apart from its status", () => {
    const t = checkRowText(
      {
        status: "checked",
        kind: "published",
        result: result({
          source: {
            document: "Ashby & Patla",
            retrieved: "2026-11-06",
          } as StressResult["source"],
        }),
      },
      { "lunar-time.moon-vs-earth.synodic": { label: "Lunar clock gain" } },
    );
    expect(t.status).toBe("Checked");
    expect(t.kind).toBe("published");
    expect(t.tone).toBe("pass");
    expect(t.title).toBe("Lunar clock gain");
    expect(t.summary).toMatch(/within/);
  });

  it("keeps a round trip's kind its own: the tag, not the status, says it", () => {
    const t = checkRowText(
      { status: "checked", kind: "roundTrip", result: result() },
      {},
    );
    expect(t.status).toBe("Checked");
    expect(t.kind).toBe("roundTrip");
  });

  it("names a live re-run's failure plainly", () => {
    const t = checkRowText(
      {
        status: "live",
        kind: "live",
        result: result({ pass: false, value: 1 }),
      },
      {},
    );
    expect(t.status).toBe("Failed");
    expect(t.kind).toBe("live");
    expect(t.tone).toBe("fail");
    expect(t.summary).toMatch(/beyond/);
  });

  it("gives a reference-only row no verdict, and says the reference applies at the checked setup and how far the setting moves the answer", () => {
    const t = checkRowText(
      {
        status: "reference-only",
        kind: "published",
        id: "x.y",
        title: "X",
        delta: { value: 0.0123, unit: "µs/day" },
      },
      {},
    );
    expect(t.status).toBe("Not judged here");
    expect(t.tone).toBe("reference");
    expect(t.result).toBeUndefined();
    expect(t.summary).toBe(
      "Reference applies at the checked setup; your setting moves the answer by +0.01 µs/day",
    );
  });

  it("shows a pending row as loading, never a pass (R9)", () => {
    const t = checkRowText(
      { status: "pending", kind: "hand", id: "x.y", title: "X" },
      {},
    );
    expect(t.status).toBe("Loading");
    expect(t.kind).toBe("hand");
    expect(t.tone).toBe("loading");
  });

  it("names every kind with a short tag and a legend name, and only measured data says validated", () => {
    expect(Object.keys(KIND_TEXT).sort()).toEqual([...CHECK_KINDS].sort());
    expect(CHECK_KINDS.map((k) => KIND_TEXT[k].name)).toEqual([
      "Published reference",
      "Measured data",
      "Hand formula",
      "Round trip",
      "Live re-run",
    ]);
    for (const k of CHECK_KINDS) {
      const text = Object.values(KIND_TEXT[k]).join(" ");
      expect(/\bvalidated\b/i.test(text), k).toBe(k === "measured");
    }
  });
});

describe("an answer's text", () => {
  it("writes the figure with its unit, angles on the number", () => {
    expect(formatAnswer(357.7, "°")).toBe("357.70°");
    expect(formatAnswer(56.0123, "µs/day")).toBe("56.01 µs/day");
    expect(formatAnswer(-1.5, "km/s")).toBe("−1.50 km/s");
  });

  it("states a bounded accuracy as a 1σ and an unbounded one with its reason", () => {
    expect(
      accuracyLine({
        label: "",
        headline: "",
        accuracy: { meters: 0.017, note: "measured Earth orientation" },
      }),
    ).toBe("±17 mm (1σ): measured Earth orientation");
    expect(
      accuracyLine({
        label: "",
        headline: "",
        accuracy: {
          note: "not bounded: outside Orion's data",
          unbounded: true,
        },
      }),
    ).toBe("Not bounded: outside Orion's data");
    expect(
      accuracyLine({
        label: "",
        headline: "",
        accuracy: { note: "the OEM's gap", unbounded: true },
      }),
    ).toBe("Not bounded: the OEM's gap");
  });

  it("writes a delta with its sign, and no change as such", () => {
    expect(formatDelta(2.31, "°")).toBe("+2.31°");
    expect(formatDelta(-0.04, "km/s")).toBe("−0.04 km/s");
    expect(formatDelta(0, "km/s")).toBe("no change");
  });
});

describe("a stale evaluation's rows (fix 1, item 1)", () => {
  const checked = {
    status: "checked" as const,
    kind: "published" as const,
    result: result({ source: { document: "x" } as StressResult["source"] }),
  };
  const reference = {
    status: "reference-only" as const,
    kind: "published" as const,
    id: "x.y",
    title: "X",
    delta: { value: 1, unit: "°" },
  };

  it("withholds every verdict, its colour and the delta while updating", () => {
    for (const row of [
      checked,
      { status: "live" as const, kind: "live" as const, result: result() },
    ]) {
      const t = checkRowText(row, {}, "updating");
      expect(t.status).toBe("Updating");
      expect(t.kind).toBe(row.kind);
      expect(t.tone).toBe("stale");
      expect(t.result).toBeUndefined();
    }
    const r = checkRowText(reference, {}, "updating");
    expect(r.summary).not.toMatch(/moves the answer/);
    expect(r.summary).toBe("Reference applies at the checked setup");
    expect(r.status).toBe("Updating");
  });

  it("follows the clock in one steady state, its value updated in place, no verdict", () => {
    const t = checkRowText(
      { status: "live", kind: "live", result: result() },
      {},
      "following",
    );
    expect(t.status).toBe("Following");
    expect(t.tone).toBe("stale");
    // The value only: "within" would read as a verdict (fix 2).
    expect(t.summary).not.toMatch(/within|beyond/);
  });

  it("keeps a pending row loading whatever the freshness", () => {
    const t = checkRowText(
      { status: "pending", kind: "roundTrip", id: "a", title: "A" },
      {},
      "updating",
    );
    expect(t.status).toBe("Loading");
  });
});

describe("the off-checked marker's words (fix 1, item 6)", () => {
  const frame = SCENARIOS.find((s) => s.id === "one-path")!.knobs[0]!;
  const latitude = SCENARIOS.find((s) => s.id === "stand-on-moon")!.knobs[0]!;
  it("names what moved and its checked value, not just the knob", () => {
    expect(
      movedText({
        changed: ["frame", "time"],
        knobs: [frame],
        values: { frame: "ITRF" },
        checked: { frame: "MOON_ME" },
        epochUtc: "2026-04-07T04:00:00.000Z",
        checkedEpochUtc: "2026-04-06T23:00:00.000Z",
      }),
    ).toBe(
      "Draw Orion's path in ITRF (checked: MOON_ME); and time 2026-04-07 04:00 UTC (checked: 2026-04-06 23:00 UTC)",
    );
    expect(
      movedText({
        changed: ["latitude"],
        knobs: [latitude],
        values: { latitude: -45 },
        checked: { latitude: -90 },
        epochUtc: "",
        checkedEpochUtc: "",
      }),
    ).toBe("Site latitude −45.0° (checked: −90.0°)");
  });
});

describe("the headline (fix 1: questions and answers line up)", () => {
  it("is the figure and its words, one string for the panel and the callout alike", () => {
    expect(
      answerTitle({
        label: "relative to the Moon (MOON_ME)",
        headline: "",
        value: 1.4,
        unit: "km/s",
        accuracy: { note: "" },
      }),
    ).toBe("1.40 km/s relative to the Moon (MOON_ME)");
    expect(
      answerTitle({
        label: "east of GCRF's x axis",
        headline: "",
        value: 357.7,
        unit: "°",
        accuracy: { note: "" },
      }),
    ).toBe("357.70° east of GCRF's x axis");
    expect(
      answerTitle({ label: "", headline: "x", accuracy: { note: "" } }),
    ).toBeUndefined();
    // No figure, but words that answer it (the BIM site outside its CRS's
    // area of use): the words alone.
    expect(
      answerTitle({
        label: "Not placed: California zone 3 doesn't cover Portland, Oregon",
        headline: "x",
        accuracy: { note: "", unbounded: true },
      }),
    ).toBe("Not placed: California zone 3 doesn't cover Portland, Oregon");
  });
});

describe("the published comparison under the headline (the owner, fix 1)", () => {
  const base = {
    printed: "56.02 µs/day",
    document: "Ashby, N. and Patla, B. R., A Relativistic Framework …",
    tolerance: "within 2%",
    unit: "µs/day",
  };
  it("at the checked setup: the value, ours, the difference and the verdict in words", () => {
    const t = publishedText({
      ...base,
      state: "checked",
      ours: 55.99,
      difference: { value: 0.00054 },
      pass: true,
    });
    expect(t.published).toBe("Published: 56.02 µs/day");
    expect(t.comparison).toBe(
      "ours 55.99 µs/day · difference 0.054% · within 2% · passes",
    );
  });
  it("off it: the value applies at the checked setup, the delta, and no verdict", () => {
    const t = publishedText({
      ...base,
      state: "off",
      delta: { value: 0.0123, unit: "µs/day" },
    });
    expect(t.published).toBe("Published: 56.02 µs/day");
    expect(t.comparison).toMatch(/applies at the checked setup/);
    expect(t.comparison).toMatch(/\+0\.01 µs\/day/);
    expect(t.comparison).not.toMatch(/passes|fails/);
  });
  it("loading: no verdict", () => {
    const t = publishedText({ ...base, state: "loading" });
    expect(t.comparison).not.toMatch(/passes|fails/);
  });
});

describe("the accuracy's warning colour (fix 2; Task 4c item 4: a flag, not the note's words)", () => {
  const a = (note: string, meters?: number, unbounded?: boolean) => ({
    label: "",
    headline: "",
    accuracy: {
      note,
      ...(meters !== undefined && { meters }),
      ...(unbounded !== undefined && { unbounded }),
    },
  });
  it("warns for an accuracy flagged unbounded (not bounded, not stated or not known), never for a bounded figure", () => {
    expect(
      accuracyWarns(a("not bounded: outside Orion's data", undefined, true)),
    ).toBe(true);
    expect(
      accuracyWarns(a("not stated: no published uncertainty", undefined, true)),
    ).toBe(true);
    expect(accuracyWarns(a("within 2% of the method"))).toBe(false);
    expect(accuracyWarns(a("measured Earth orientation", 0.017))).toBe(false);
  });
  it("reads the flag, not the note: a note's first words change neither way", () => {
    // A bounded note that happens to start with the words.
    expect(accuracyWarns(a("not known to better than 2%: the method"))).toBe(
      false,
    );
    // An unbounded one whose note says why without them.
    expect(accuracyWarns(a("outside Orion's data", undefined, true))).toBe(
      true,
    );
    expect(accuracyLine(a("outside Orion's data", undefined, true))).toBe(
      "Not bounded: outside Orion's data",
    );
    expect(accuracyLine(a("within 2% of the method"))).toBe(
      "Within 2% of the method",
    );
  });
});
