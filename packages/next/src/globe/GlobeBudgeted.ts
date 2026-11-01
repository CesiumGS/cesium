/**
 * `Budgeted` selection for terrain. 3D Tiles' dynamic screen-space error
 * (up to 24 pixels off distant tiles, density from the root's volume) is a
 * tileset setting; 1.x's globe lowers the SSE by its fog instead (at most
 * 2 pixels, `Fog.screenSpaceErrorFactor`), and only while fog is drawn.
 * With the tileset's, oblique views of terrain left mid-distance tiles below
 * zero SSE, drawn far too coarse (Rainier: 20 tiles at levels 0 to 12 where
 * 1.x draws 57 at levels 6 to 13).
 */
import {
  BudgetedSelection,
  type BudgetedOptions,
} from "../streaming/Budgeted.ts";
import type { SelectionResult, SelectionView } from "../streaming/Legacy1x.ts";
import type { Tile } from "../streaming/Tile.ts";
import { FOG_SSE, fog, fogDensity } from "./GlobeLegacy1x.ts";

export class GlobeBudgetedSelection extends BudgetedSelection {
  /**
   * 1.x scene.fog.enabled: fog lowers the SSE of distant tiles. Off while
   * 2.0 draws no fog (M4): detail is only worth dropping where fog hides it.
   */
  fog = false;
  /** This pass's fog density (0 without fog). */
  private passDensity = 0;

  constructor(options: BudgetedOptions = {}) {
    super({ ...options, dynamicScreenSpaceError: false });
  }

  override select(
    root: Tile,
    rootGeometricError: number,
    view: SelectionView,
  ): SelectionResult {
    this.passDensity = this.fog ? fogDensity(view) : 0;
    return super.select(root, rootGeometricError, view);
  }

  /** 1.x QuadtreePrimitive screenSpaceError (perspective) with fog. */
  protected override screenSpaceError(
    tile: Tile,
    view: SelectionView,
    useParentGeometricError: boolean,
    rootError: number,
  ): number {
    const sse = super.screenSpaceError(
      tile,
      view,
      useParentGeometricError,
      rootError,
    );
    if (this.passDensity === 0 || sse === 0) {
      return sse;
    }
    const distance = Math.max(tile.viewState(view.id).distance, 1e-7);
    return (
      sse - (fog(distance, this.passDensity) * FOG_SSE) / (view.pixelRatio ?? 1)
    );
  }
}
