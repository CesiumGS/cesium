define(['exports'], (function (exports) { 'use strict';

  /**
   * ArcType defines the path that should be taken connecting vertices.
   *
   * @enum {number}
   */
  const ArcType = {
    /**
     * Straight line that does not conform to the surface of the ellipsoid.
     *
     * @type {number}
     * @constant
     */
    NONE: 0,

    /**
     * Follow geodesic path.
     *
     * @type {number}
     * @constant
     */
    GEODESIC: 1,

    /**
     * Follow rhumb or loxodrome path.
     *
     * @type {number}
     * @constant
     */
    RHUMB: 2,
  };
  var ArcType$1 = Object.freeze(ArcType);

  exports.ArcType = ArcType$1;

}));
