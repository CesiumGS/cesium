// @ts-check

import defined from "./defined.js";

/** @import Cartesian3 from "./Cartesian3.js"; */

/**
 * An hierarchy of linear rings which define a polygon and its holes.
 * The holes themselves may also have holes which nest inner polygons.
 */
class PolygonHierarchy {
  /**
   * @param {Cartesian3[]} [positions] A linear ring defining the outer boundary of the polygon or hole.
   * @param {PolygonHierarchy[]} [holes] An array of polygon hierarchies defining holes in the polygon.
   */
  constructor(positions, holes) {
    /**
     * A linear ring defining the outer boundary of the polygon or hole.
     * @type {Cartesian3[]}
     */
    this.positions = defined(positions) ? positions : [];

    /**
     * An array of polygon hierarchies defining holes in the polygon.
     * @type {PolygonHierarchy[]}
     */
    this.holes = defined(holes) ? holes : [];
  }
}
export default PolygonHierarchy;
