// The frames explorer's overlay accuracy lines (examples/frames-explorer/legend.ts,
// R8): every drawn overlay states how well it's placed, from the recorded
// operation of the CRS it was drawn in.
import { describe, expect, it } from "vitest";
import {
  distortionAccuracy,
  operationText,
} from "../examples/frames-explorer/legend.ts";

const op = (
  accuracy: number | undefined,
  extra: { ballpark?: boolean; grids?: string[] } = {},
) => ({
  pipeline: "+proj=pipeline",
  accuracy,
  ballpark: extra.ballpark ?? false,
  grids: extra.grids ?? [],
});

describe("a recorded operation's accuracy line", () => {
  it("states a bounded operation in metres, 1σ", () => {
    const t = operationText(op(2, { grids: ["g.tif"] }));
    expect(t).toMatchObject({
      kind: "bounded",
      text: "±2.00 m (1σ), the recorded operation",
      caution: false,
    });
    expect(t.sentence).toMatch(/g\.tif/);
  });

  it("calls a zero-accuracy operation an exact conversion", () => {
    expect(operationText(op(0))).toMatchObject({
      kind: "exact",
      text: "exact, a conversion",
      caution: false,
    });
  });

  it("says not bounded, with caution, for a ballpark or an unstated accuracy", () => {
    for (const o of [op(undefined), op(5, { ballpark: true })]) {
      expect(operationText(o)).toMatchObject({
        kind: "unbounded",
        text: "not bounded: PROJ states no accuracy",
        caution: true,
      });
    }
  });

  it("has nothing to say without an operation", () => {
    expect(operationText(undefined)).toMatchObject({ kind: "none", text: "" });
  });
});

describe("the distortion overlay's accuracy line (R8)", () => {
  it("leads with the placement's figure", () => {
    expect(distortionAccuracy(operationText(op(2)))).toBe(
      "placed ±2.00 m (1σ), the recorded operation; contours from PROJ's scale factors",
    );
  });

  it("says a conversion is exact", () => {
    expect(distortionAccuracy(operationText(op(0)))).toBe(
      "placed exact, a conversion; contours from PROJ's scale factors",
    );
  });

  it("keeps a not-bounded placement in view", () => {
    expect(distortionAccuracy(operationText(op(undefined)))).toBe(
      "placement not bounded: PROJ states no accuracy; contours from PROJ's scale factors",
    );
  });

  it("says so when there is no recorded operation", () => {
    expect(distortionAccuracy(operationText(undefined))).toBe(
      "placement not stated; contours from PROJ's scale factors",
    );
  });

  it("reads the kind, not the wording: a reworded line keeps its form", () => {
    expect(
      distortionAccuracy({
        kind: "unbounded",
        text: "no accuracy stated",
        sentence: "",
        caution: true,
      }),
    ).toBe("placement no accuracy stated; contours from PROJ's scale factors");
  });
});
