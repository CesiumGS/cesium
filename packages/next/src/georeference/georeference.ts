/**
 * How a tileset's design coordinates become drawn positions (spec sections
 * 7.3 and 7.9): `"rigid"`, one transform at an anchor, sagging away from
 * it; `"reprojected"`, every point through the engineering frame; or
 * `"hosted"`, the producer or the host reprojected the content, which is
 * drawn as delivered (the engine doesn't reproduce the operation). The
 * engine never guesses a mode.
 */
export type PlacementMode = "rigid" | "reprojected" | "hosted";

/**
 * Where a tileset's design coordinates are drawn, and the exact way back:
 * the part of a placement that a tileset and a pick need. The core never
 * builds one. The proj entry's `TilesetPlacement` extends it with the
 * engineering frame, and its `georeferenceTileset` sets one from a
 * tileset's declaration; an application may set its own.
 */
export interface Georeference {
  readonly mode: PlacementMode;
  /** The name of the reference frame the design coordinates are in. */
  readonly frameName: string;
  /**
   * Body-fixed metres of a design point, as this placement draws it. A
   * hosted placement's content is already in body-fixed metres: `displayed`
   * is the identity on them.
   */
  displayed(
    design: ArrayLike<number>,
    out?: Float64Array<ArrayBuffer>,
  ): Float64Array;
  /**
   * The design coordinates of a drawn position: the exact inverse of
   * `displayed`, so a measurement agrees with the CAD data in either mode.
   * A hosted placement's come from the host's coordinate service instead
   * (its operation's inverse), and it throws without one: a pick on such
   * content then reports true values only.
   */
  designOf(
    position: ArrayLike<number>,
    out?: Float64Array<ArrayBuffer>,
  ): Float64Array;
  /**
   * How far this placement draws a design point from where it truly is, in
   * metres. 0 when reprojected, and when hosted (drawn as delivered: the
   * host's reprojection is the host's, not counted here).
   */
  displayError(design: ArrayLike<number>): number;
}
