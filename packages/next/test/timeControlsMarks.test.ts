// The time controls' marked spans (Task 6b): where each band falls on the
// day strip, clipped to the day, never thinner than a device pixel.
import { describe, expect, it } from "vitest";
import { markAt, markSpans } from "../widgets/timeControls.ts";

const DAY = 86_400_000;
const start = Date.parse("2026-04-06T00:00:00Z");

describe("markSpans", () => {
  it("places a span by its share of the day, clipped to the strip", () => {
    const mark = (a: string, b: string) => ({
      start: Date.parse(a),
      end: Date.parse(b),
      title: "x",
    });
    // 22:42:53 to 23:23:12 on a 960 px strip: 909 px in, 27 px wide.
    expect(
      markSpans(
        [mark("2026-04-06T22:42:53Z", "2026-04-06T23:23:12Z")],
        start,
        960,
      ),
    ).toEqual([[908, 27]]);
    // Running past midnight: clipped at the strip's end.
    expect(
      markSpans(
        [mark("2026-04-06T23:00:00Z", "2026-04-07T01:00:00Z")],
        start,
        960,
      ),
    ).toEqual([[920, 40]]);
    // Another day: nothing.
    expect(
      markSpans(
        [mark("2026-04-07T02:00:00Z", "2026-04-07T03:00:00Z")],
        start,
        960,
      ),
    ).toEqual([]);
  });

  it("keeps a very short span visible at its minimum width", () => {
    expect(
      markSpans(
        [{ start: start + DAY / 2, end: start + DAY / 2 + 1000, title: "" }],
        start,
        960,
        2,
      ),
    ).toEqual([[480, 2]]);
  });
});

describe("markAt (Task 6c: a click in a marked span jumps to its start)", () => {
  const mark = (a: string, b: string, title = "x") => ({
    start: Date.parse(a),
    end: Date.parse(b),
    title,
  });
  const behind = mark("2026-04-06T22:42:53Z", "2026-04-06T23:23:12Z", "Moon");

  it("finds the span under a point, with a little slop for thin bands", () => {
    // 908 to 935 px on a 960 px strip.
    expect(markAt([behind], start, 960, 920)).toBe(behind);
    expect(markAt([behind], start, 960, 906)).toBe(behind);
    expect(markAt([behind], start, 960, 938)).toBe(behind);
    expect(markAt([behind], start, 960, 900)).toBeUndefined();
    expect(markAt([behind], start, 960, 940)).toBeUndefined();
  });

  it("ignores other days' spans and an empty strip", () => {
    const tomorrow = mark("2026-04-07T02:00:00Z", "2026-04-07T03:00:00Z");
    expect(markAt([tomorrow], start, 960, 80)).toBeUndefined();
    expect(markAt([behind], start, 0, 0)).toBeUndefined();
  });

  it("takes the latest-starting span where two overlap", () => {
    const network = mark("2026-04-06T22:40:00Z", "2026-04-06T23:30:00Z", "Net");
    expect(markAt([network, behind], start, 960, 920)).toBe(behind);
    expect(markAt([behind, network], start, 960, 920)).toBe(behind);
    // Only the wider one under this point.
    expect(markAt([network, behind], start, 960, 940)).toBe(network);
  });
});
