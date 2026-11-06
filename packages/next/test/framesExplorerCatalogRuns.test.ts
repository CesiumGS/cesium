// The run summary over every result the page holds
// (examples/frames-explorer/catalogRuns.ts): a group's run joins the rest.
import { describe, expect, it } from "vitest";
import { wholeSummary } from "../examples/frames-explorer/catalogRuns.ts";
import type { StressResult } from "../examples/frames-explorer/tests.ts";

const result = (r: Partial<StressResult>): StressResult =>
  ({ id: "x", group: "g", title: "x", pass: true, ...r }) as StressResult;

describe("wholeSummary", () => {
  it("counts passed, failed, skipped and shown apart", () => {
    const s = wholeSummary(
      [
        result({ pass: true }),
        result({ pass: true }),
        result({ pass: false }),
        result({ pass: false, missing: ["proj"] }),
        result({ pass: true, displayOnly: true }),
      ],
      1234,
    );
    expect(s).toEqual({
      passed: 2,
      failed: 1,
      skipped: 1,
      shown: 1,
      ms: 1234,
      cancelled: false,
    });
  });

  it("is all zeros with nothing run", () => {
    expect(wholeSummary([], 0)).toMatchObject({
      passed: 0,
      failed: 0,
      skipped: 0,
      shown: 0,
    });
  });
});
