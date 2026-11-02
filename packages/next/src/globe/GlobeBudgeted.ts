/**
 * `Budgeted` selection for terrain. 3D Tiles' dynamic screen-space error
 * (up to 24 pixels off distant tiles, density from the root's volume) is a
 * tileset setting; 1.x's globe lowers the SSE by its fog instead (at most
 * 2 pixels, `Fog.screenSpaceErrorFactor`), and only while fog is drawn.
 * With the tileset's, oblique views of terrain left mid-distance tiles below
 * zero SSE, drawn far too coarse (Rainier: 20 tiles at levels 0 to 12 where
 * 1.x draws 57 at levels 6 to 13).
 *
 * Tiles are expanded as they are visited (1.x QuadtreeTile children exist
 * before their parent loads): children whose availability is known can be
 * selected and requested at once. Expanded only when loaded, terrain loaded
 * one level per round trip and could not skip levels. The ellipsoid's
 * expansion has a time budget per pass (beyond it, tiles expand when they
 * load): it has every tile, so expanding all visited at once took one
 * startup frame 0.5 s and delayed a design model's first request by 0.3 s
 * (r38); its tiles are generated, so expanding ahead saves no round trips.
 * Limiting terrain the same way slowed OSM Philadelphia's settle by 0.5 s.
 *
 * No free detail from the cache (`opportunisticRatio` 0, as for 3D Tiles):
 * finer terrain brings finer imagery, and an imagery provider's levels can
 * be different captures (Bing's level 12 on Rainier's south flank is hazy
 * and snowless where 11 and 13 are not), so a still view would look
 * different depending on where the camera had been.
 */
import {
  BudgetedSelection,
  type BudgetedOptions,
} from "../streaming/Budgeted.ts";
import type { SelectionResult, SelectionView } from "../streaming/Stepwise.ts";
import type { Tile, TileViewState } from "../streaming/Tile.ts";
import type { TerrainSource } from "./TerrainSource.ts";
import { FOG_SSE, fog, fogDensity } from "./GlobeStepwise.ts";

/** Main-thread time per selection pass for expanding visited tiles, ms. */
const EXPAND_MS = 4;

export class GlobeBudgetedSelection extends BudgetedSelection {
  /**
   * 1.x scene.fog.enabled: fog lowers the SSE of distant tiles. Off while
   * 2.0 draws no fog (M4): detail is only worth dropping where fog hides it.
   */
  fog = false;
  /** This pass's fog density (0 without fog). */
  private passDensity = 0;
  /** When this pass's expansion budget runs out (performance.now). */
  private expandUntil = 0;
  imageryReady?: (tile: Tile) => boolean;

  constructor(
    private readonly source: TerrainSource,
    options: BudgetedOptions = {},
  ) {
    super({
      ...options,
      opportunisticRatio: options.opportunisticRatio ?? 0,
      dynamicScreenSpaceError: false,
    });
  }

  /**
   * Loaded terrain draws once it has imagery (1.x renderable): until then
   * the finer tiles or the ancestor already drawn stay, and its imagery
   * loads. Drawn untextured, a tile flashed gray while zooming out.
   */
  protected override drawable(tile: Tile, result: SelectionResult): boolean {
    if (!tile.contentAvailable) {
      return false;
    }
    if (!this.imageryReady || this.imageryReady(tile)) {
      return true;
    }
    (result.waiting ??= []).push(tile);
    return false;
  }

  /**
   * Expands the tile (its children, where availability is known) first;
   * the ellipsoid within the pass's budget.
   */
  protected override updateVisibility(
    tile: Tile,
    state: TileViewState,
    view: SelectionView,
    pass: number,
  ): void {
    if (
      tile.globe &&
      !tile.globe.expanded &&
      (!this.source.flat || performance.now() < this.expandUntil)
    ) {
      this.source.expand(tile);
    }
    super.updateVisibility(tile, state, view, pass);
  }

  override select(
    root: Tile,
    rootGeometricError: number,
    view: SelectionView,
  ): SelectionResult {
    this.passDensity = this.fog ? fogDensity(view) : 0;
    this.expandUntil = performance.now() + EXPAND_MS;
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
