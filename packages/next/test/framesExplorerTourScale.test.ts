// The frames explorer's tour caption carries the "Show true scale" switch at
// the stops that exaggerate (owner's request, 2026-11-06): the convergence
// angle at stop 3, the rigid line's separation at stop 4.
import { describe, expect, it } from "vitest";
import { TOUR } from "../examples/frames-explorer/content.ts";
import { tourScaleSwitch } from "../examples/frames-explorer/panel/tourScale.ts";

const model = {
  trueScale: false,
  convergenceFactor: 20,
  sagTrueScale: false,
  sagFactor: 50,
};
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

  it("stop 4 switches the separation", () => {
    expect(stop("rigid-exact").trueScaleSwitch).toBe("sag");
    expect(tourScaleSwitch(stop("rigid-exact"), model)).toEqual({
      kind: "sag",
      checked: false,
      label: "Show true scale (separation drawn 50× larger)",
    });
  });

  it("reads the switch's state from the panel model, and drops the factor once on", () => {
    expect(
      tourScaleSwitch(stop("design-grid"), { ...model, trueScale: true }),
    ).toEqual({ kind: "convergence", checked: true, label: "Show true scale" });
    expect(
      tourScaleSwitch(stop("rigid-exact"), { ...model, sagTrueScale: true }),
    ).toEqual({ kind: "sag", checked: true, label: "Show true scale" });
  });

  it("is absent at the stops that draw nothing exaggerated", () => {
    for (const s of TOUR) {
      if (s.id !== "design-grid" && s.id !== "rigid-exact") {
        expect(tourScaleSwitch(s, model)).toBeUndefined();
      }
    }
  });
});
