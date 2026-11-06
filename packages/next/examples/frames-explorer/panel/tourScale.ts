// The tour caption's "Show true scale" switch (owner's request, 2026-11-06):
// the stop that exaggerates carries the same switch the overlay's options do,
// so the true drawing is one click away from the caption that explains it.
// Only stop 3 does: stop 4 draws its lines at true scale (owner's rework,
// 2026-11-06), with an inset for the gap.

/** What a stop exaggerates: the convergence angle (stop 3). */
export type TrueScaleKind = "convergence";

/** The switch the caption shows, or undefined at a stop that draws nothing exaggerated. */
export interface TourScaleSwitch {
  kind: TrueScaleKind;
  checked: boolean;
  label: string;
}

export function tourScaleSwitch(
  stop: { readonly trueScaleSwitch?: TrueScaleKind },
  model: {
    readonly trueScale: boolean;
    readonly convergenceFactor: number;
  },
): TourScaleSwitch | undefined {
  switch (stop.trueScaleSwitch) {
    case "convergence":
      return {
        kind: "convergence",
        checked: model.trueScale,
        label: model.trueScale
          ? "Show true scale"
          : `Show true scale (angle drawn ${model.convergenceFactor}× larger)`,
      };
    default:
      return undefined;
  }
}
