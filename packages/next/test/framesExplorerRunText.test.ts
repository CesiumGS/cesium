// The Verify tab's run line (examples/frames-explorer/panel/runText.ts, R5,
// F44): a stopped or partial run says why.
import { describe, expect, it } from "vitest";
import {
  runLine,
  valueNote,
} from "../examples/frames-explorer/panel/runText.ts";
import type { StressResult } from "../examples/frames-explorer/tests.ts";

const LABEL = {
  frames: "Frame data",
  proj: "PROJ",
  geoid: "GEOID18",
  orion: "Orion OEM",
} as const;
const summary = {
  passed: 212,
  failed: 0,
  skipped: 0,
  shown: 13,
  ms: 3800,
  cancelled: false,
};
const skipped = (
  id: string,
  missing: StressResult["missing"],
): StressResult => ({
  id,
  group: "time",
  title: id,
  pass: false,
  missing,
});

describe("the run line", () => {
  it("says not run yet before a run", () => {
    expect(runLine({ state: "idle", done: 0, total: 0 }, [], LABEL)).toBe(
      "Not run yet",
    );
  });

  it("counts while running", () => {
    expect(runLine({ state: "running", done: 12, total: 225 }, [], LABEL)).toBe(
      "12 of 225 checks run",
    );
  });

  it("gives the counts and time when a run is done", () => {
    expect(
      runLine({ state: "done", done: 225, total: 225, summary }, [], LABEL),
    ).toBe("212 passed, 0 failed, 0 skipped, 13 shown, not judged; 3.8 s");
  });

  it("names the missing data a partial run skipped for", () => {
    const results = [
      skipped("a", ["frames"]),
      skipped("b", ["frames", "orion"]),
      skipped("c", ["proj"]),
    ];
    expect(
      runLine(
        {
          state: "done",
          done: 183,
          total: 183,
          summary: { ...summary, passed: 150, skipped: 3 },
        },
        results,
        LABEL,
      ),
    ).toBe(
      "150 passed, 0 failed, 3 skipped (Frame data, Orion OEM and PROJ missing), 13 shown, not judged; 3.8 s",
    );
  });

  it("says why a run stopped, with how far it got", () => {
    expect(
      runLine(
        {
          state: "cancelled",
          done: 19,
          total: 225,
          reason: "the frames data store is not served at /frames-data/",
        },
        [],
        LABEL,
      ),
    ).toBe(
      "Stopped after 19 of 225 checks: the frames data store is not served at /frames-data/",
    );
  });

  it("says when the user stopped it", () => {
    expect(
      runLine(
        {
          state: "cancelled",
          done: 19,
          total: 225,
          summary: { ...summary, passed: 19, cancelled: true },
        },
        [],
        LABEL,
      ),
    ).toBe("Stopped after 19 of 225 checks: you stopped it");
  });
});

describe("a row without a value and a tolerance", () => {
  const r = (extra: Partial<StressResult>): StressResult => ({
    id: "r",
    group: "bound-crss",
    title: "r",
    pass: true,
    ...extra,
  });

  it("says a shown-only result isn't judged (the bound CRS's accuracy row)", () => {
    expect(valueNote(r({ displayOnly: true }))).toBe("shown, not judged");
  });

  it("says whether an expected throw threw", () => {
    expect(valueNote(r({ expectedError: "leap" }))).toBe("threw as expected");
    expect(valueNote(r({ expectedError: "leap", pass: false }))).toBe(
      "didn't throw as expected",
    );
  });

  it("says the case judged a result with no number", () => {
    expect(valueNote(r({}))).toBe("judged by the case");
  });

  it("says what a skipped result needs", () => {
    expect(valueNote(r({ pass: false, missing: ["frames"] }))).toBe(
      "skipped: missing data",
    );
  });
});
