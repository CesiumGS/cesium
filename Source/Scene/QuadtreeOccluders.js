import Cartesian3 from "../Core/Cartesian3.js";
import EllipsoidalOccluder from "../Core/EllipsoidalOccluder.js";

/**
 * A set of occluders that can be used to test quadtree tiles for occlusion.
 *
 * @alias QuadtreeOccluders
 * @constructor
 * @private
 *
 * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid that potentially occludes tiles.
 */
function QuadtreeOccluders(options) {
  this._ellipsoid = new EllipsoidalOccluder(options.ellipsoid, Cartesian3.ZERO);
}

Object.defineProperties(QuadtreeOccluders.prototype, {
  /**
   * Gets the {@link EllipsoidalOccluder} that can be used to determine if a point is
   * occluded by an {@link Ellipsoid}.
   * @type {EllipsoidalOccluder}
   * @memberof QuadtreeOccluders.prototype
   */
  ellipsoid: {
    get: function () {
      return this._ellipsoid;
    },
  },
});
export default QuadtreeOccluders;
