// The tour caption's "Show true scale" switch (owner's request, 2026-11-06):
// the stops that exaggerate carry the same switch the overlay's options do,
// so the true drawing is one click away from the caption that explains it.

/** What a stop exaggerates: the convergence angle (stop 3) or the rigid line's separation (stop 4). */
export type TrueScaleKind = "convergence" | "sag";

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
    readonly sagTrueScale: boolean;
    readonly sagFactor: number;
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
    case "sag":
      return {
        kind: "sag",
        checked: model.sagTrueScale,
        label: model.sagTrueScale
          ? "Show true scale"
          : `Show true scale (separation drawn ${model.sagFactor}× larger)`,
      };
    default:
      return undefined;
  }
}
