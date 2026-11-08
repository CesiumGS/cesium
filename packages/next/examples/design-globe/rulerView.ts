// "Close in on the ruler" (Task 20 fix 1, I7; UX review S10, I2): while the
// camera is close in on the ruler's far end, the ghost deck and the error
// ribbon are set aside, so the ruler isn't seen through an orange field.
// They come back when the user takes the camera or sets either, when the
// tour moves off its pair step or is left, and when another site is
// selected. The toolbar and the legend say what is drawn meanwhile.
import type { TourTarget } from "./tour.ts";

export interface RulerViewDeps {
  /** The ghost as drawn now. */
  ghost(): boolean;
  /** Draws the ghost or not. */
  setGhost(on: boolean): void;
  /** Hides the ribbon, or shows it again as the user set it. */
  setRibbonHidden(hidden: boolean): void;
}

export interface RulerView {
  /** The ghost and the ribbon are set aside. */
  readonly active: boolean;
  /** Sets the ghost and the ribbon aside (again: no change). */
  begin(): void;
  /** Brings them back as they were; nothing when not active. */
  end(): void;
  /**
   * A tour step is shown, or the tour is left (undefined): only the pair
   * step keeps the ruler's view (it closes in on the ruler itself).
   */
  tourStep(target: TourTarget | undefined): void;
  /** Whether the ribbon is drawn, as the toolbar and the legend say it. */
  ribbonShown(setting: boolean): boolean;
}

export function createRulerView(deps: RulerViewDeps): RulerView {
  /** The ghost as it was before the ruler's view; undefined when not in it. */
  let saved: { readonly ghost: boolean } | undefined;
  const end = () => {
    if (saved === undefined) {
      return;
    }
    const { ghost } = saved;
    saved = undefined;
    deps.setGhost(ghost);
    deps.setRibbonHidden(false);
  };
  return {
    get active() {
      return saved !== undefined;
    },
    begin() {
      saved ??= { ghost: deps.ghost() };
      deps.setGhost(false);
      deps.setRibbonHidden(true);
    },
    end,
    tourStep(target) {
      if (target?.shot !== "pair") {
        end();
      }
    },
    ribbonShown: (setting) => setting && saved === undefined,
  };
}
