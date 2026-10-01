// @ts-check

import { Cartesian3, EllipsoidalOccluder } from "@cesium/core";
/** @import { Ellipsoid } from "@cesium/core"; */

/**
 * A set of occluders that can be used to test quadtree tiles for occlusion.
 *
 * @private
 */
class QuadtreeOccluders {
  /**
   * @param {object} [options]
   * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid that potentially occludes tiles.
   */
  constructor(options) {
    this._ellipsoid = new EllipsoidalOccluder(
      options.ellipsoid,
      Cartesian3.ZERO,
    );
  }

  /**
   * Gets the {@link EllipsoidalOccluder} that can be used to determine if a point is
   * occluded by an {@link Ellipsoid}.
   * @type {EllipsoidalOccluder}
   */
  get ellipsoid() {
    return this._ellipsoid;
  }
}

export default QuadtreeOccluders;
