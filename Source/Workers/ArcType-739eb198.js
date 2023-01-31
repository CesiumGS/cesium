/* This file is automatically rebuilt by the Cesium build process. */
define(['exports'], function (exports) { 'use strict';

  /**
   * ArcType defines the path that should be taken connecting vertices.
   *
   * @enum {Number}
   */
  var ArcType = {
    /**
     * Straight line that does not conform to the surface of the ellipsoid.
     *
     * @type {Number}
     * @constant
     */
    NONE: 0,

    /**
     * Follow geodesic path.
     *
     * @type {Number}
     * @constant
     */
    GEODESIC: 1,

    /**
     * Follow rhumb or loxodrome path.
     *
     * @type {Number}
     * @constant
     */
    RHUMB: 2,
  };
  var ArcType$1 = Object.freeze(ArcType);

  exports.ArcType = ArcType$1;

});
