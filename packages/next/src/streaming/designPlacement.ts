/** How a tileset's design coordinates become drawn positions. */
export type PlacementMode = "rigid" | "reprojected";

/**
 * Where a tileset's design coordinates are drawn, and the exact way back:
 * the part of a placement that a tileset and a pick need. The core never
 * builds one. The proj entry's `TilesetPlacement` extends it with the
 * engineering frame, and its `georeferenceTileset` sets one from a
 * tileset's declaration; an application may set its own.
 */
export interface DesignPlacement {
  readonly mode: PlacementMode;
  /** The name of the reference frame the design coordinates are in. */
  readonly frameName: string;
  /** Body-fixed metres of a design point, as this placement draws it. */
  displayed(
    design: ArrayLike<number>,
    out?: Float64Array<ArrayBuffer>,
  ): Float64Array;
  /**
   * The design coordinates of a drawn position: the exact inverse of
   * `displayed`, so a measurement agrees with the CAD data in either mode.
   */
  designOf(
    position: ArrayLike<number>,
    out?: Float64Array<ArrayBuffer>,
  ): Float64Array;
  /**
   * How far this placement draws a design point from where it truly is, in
   * metres. 0 when reprojected.
   */
  displayError(design: ArrayLike<number>): number;
}
