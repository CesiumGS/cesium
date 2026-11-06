// What a scenario's proof rows and answer say (examples/frames-explorer/
// panel/proofText.ts, answerText.ts): each row's status in words, and
// nothing reads as verified that isn't (Review Focus 1).
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
import { proofRowText } from "../examples/frames-explorer/panel/proofText.ts";
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

describe("a proof row's words", () => {
  it("says a catalog result with a source is checked against a reference, with its verdict", () => {
    const t = proofRowText(
      {
        kind: "checked",
        result: result({
          source: {
            document: "Ashby & Patla",
            retrieved: "2026-11-06",
          } as StressResult["source"],
        }),
      },
      { "lunar-time.moon-vs-earth.synodic": { label: "Lunar clock gain" } },
    );
    expect(t.status).toBe("Checked against a reference");
    expect(t.verdict).toBe("Pass");
    expect(t.title).toBe("Lunar clock gain");
    expect(t.summary).toMatch(/within/);
  });

  it("says a catalog round trip that cites nothing is checked by the catalog, not against a reference", () => {
    const t = proofRowText({ kind: "checked", result: result() }, {});
    expect(t.status).toBe("Checked by the catalog");
  });

  it("names a live re-run and a failure plainly", () => {
    const t = proofRowText(
      { kind: "live", result: result({ pass: false, value: 1 }) },
      {},
    );
    expect(t.status).toBe("Live re-run");
    expect(t.verdict).toBe("Fail");
    expect(t.tone).toBe("fail");
    expect(t.summary).toMatch(/beyond/);
  });

  it("gives a reference-only row no verdict, and says how far the setting moves the answer", () => {
    const t = proofRowText(
      {
        kind: "reference-only",
        id: "x.y",
        title: "X",
        delta: { value: 0.0123, unit: "µs/day" },
      },
      {},
    );
    expect(t.status).toBe("Reference applies at the checked setup");
    expect(t.verdict).toBeUndefined();
    expect(t.result).toBeUndefined();
    expect(t.summary).toBe("your setting moves the answer by +0.01 µs/day");
  });

  it("shows a pending row as loading, never a pass (R9)", () => {
    const t = proofRowText({ kind: "pending", id: "x.y", title: "X" }, {});
    expect(t.status).toBe("Loading");
    expect(t.verdict).toBeUndefined();
    expect(t.tone).toBe("loading");
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
        accuracy: { note: "not bounded: outside Orion's data" },
      }),
    ).toBe("Not bounded: outside Orion's data");
    expect(
      accuracyLine({
        label: "",
        headline: "",
        accuracy: { note: "the OEM's gap" },
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
    kind: "checked" as const,
    result: result({ source: { document: "x" } as StressResult["source"] }),
  };
  const reference = {
    kind: "reference-only" as const,
    id: "x.y",
    title: "X",
    delta: { value: 1, unit: "°" },
  };

  it("withholds every verdict, its colour and the delta while updating", () => {
    for (const row of [checked, { kind: "live" as const, result: result() }]) {
      const t = proofRowText(row, {}, "updating");
      expect(t.status).toBe("Updating");
      expect(t.verdict).toBeUndefined();
      expect(t.tone).toBe("stale");
      expect(t.result).toBeUndefined();
    }
    const r = proofRowText(reference, {}, "updating");
    expect(r.summary).not.toMatch(/moves the answer/);
    expect(r.status).toBe("Updating");
  });

  it("follows the clock in one steady state, its value updated in place, no verdict", () => {
    const t = proofRowText({ kind: "live", result: result() }, {}, "following");
    expect(t.status).toBe("Following the clock");
    expect(t.verdict).toBeUndefined();
    // The value only: "within" would read as a verdict (fix 2).
    expect(t.summary).not.toMatch(/within|beyond/);
  });

  it("keeps a pending row loading whatever the freshness", () => {
    const t = proofRowText(
      { kind: "pending", id: "a", title: "A" },
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

describe("the accuracy's warning colour (fix 2)", () => {
  const a = (note: string, meters?: number) => ({
    label: "",
    headline: "",
    accuracy: { note, ...(meters !== undefined && { meters }) },
  });
  it("warns for not bounded, not stated or not known, never for a bounded figure", () => {
    expect(accuracyWarns(a("not bounded: outside Orion's data"))).toBe(true);
    expect(accuracyWarns(a("not stated: no published uncertainty"))).toBe(true);
    expect(accuracyWarns(a("within 2% of the method"))).toBe(false);
    expect(accuracyWarns(a("measured Earth orientation", 0.017))).toBe(false);
  });
});
