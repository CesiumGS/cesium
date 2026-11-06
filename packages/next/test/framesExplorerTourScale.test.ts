// The frames explorer's tour caption carries the "Show true scale" switch at
// the stop that exaggerates (owner's request, 2026-11-06): the convergence
// angle at stop 3. Stop 4 draws its two lines at true scale (owner's rework,
// 2026-11-06), so it has no switch.
import { describe, expect, it } from "vitest";
import { TOUR } from "../examples/frames-explorer/content.ts";
import { tourScaleSwitch } from "../examples/frames-explorer/panel/tourScale.ts";

const model = { trueScale: false, convergenceFactor: 20 };
const stop = (id: string) => TOUR.find((t) => t.id === id)!;

describe("the tour caption's true-scale switch", () => {
  it("stop 3 switches the convergence angle", () => {
    expect(stop("design-grid").trueScaleSwitch).toBe("convergence");
    expect(tourScaleSwitch(stop("design-grid"), model)).toEqual({
      kind: "convergence",
      checked: false,
      label: "Show true scale (angle drawn 20× larger)",
    });
  });

  it("reads the switch's state from the panel model, and drops the factor once on", () => {
    expect(
      tourScaleSwitch(stop("design-grid"), { ...model, trueScale: true }),
    ).toEqual({ kind: "convergence", checked: true, label: "Show true scale" });
  });

  it("is absent at stop 4, which draws at true scale", () => {
    expect(stop("rigid-exact").trueScaleSwitch).toBeUndefined();
    expect(tourScaleSwitch(stop("rigid-exact"), model)).toBeUndefined();
  });

  it("is absent at every stop but stop 3", () => {
    for (const s of TOUR) {
      if (s.id !== "design-grid") {
        expect(tourScaleSwitch(s, model)).toBeUndefined();
      }
    }
  });
});
