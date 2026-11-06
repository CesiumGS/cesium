// What a scenario's proof rows and answer say (examples/frames-explorer/
// panel/proofText.ts, answerText.ts): each row's status in words, and
// nothing reads as verified that isn't (Review Focus 1).
import { describe, expect, it } from "vitest";
import {
  accuracyLine,
  formatAnswer,
  formatDelta,
} from "../examples/frames-explorer/panel/answerText.ts";
import { proofRowText } from "../examples/frames-explorer/panel/proofText.ts";
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
        headline: "",
        accuracy: { meters: 0.017, note: "measured Earth orientation" },
      }),
    ).toBe("±17 mm (1σ): measured Earth orientation");
    expect(
      accuracyLine({
        headline: "",
        accuracy: { note: "not bounded: outside Orion's data" },
      }),
    ).toBe("Not bounded: outside Orion's data");
    expect(
      accuracyLine({ headline: "", accuracy: { note: "the OEM's gap" } }),
    ).toBe("Not bounded: the OEM's gap");
  });

  it("writes a delta with its sign, and no change as such", () => {
    expect(formatDelta(2.31, "°")).toBe("+2.31°");
    expect(formatDelta(-0.04, "km/s")).toBe("−0.04 km/s");
    expect(formatDelta(0, "km/s")).toBe("no change");
  });
});
