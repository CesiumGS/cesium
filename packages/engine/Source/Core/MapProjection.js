// @ts-check

import DeveloperError from "./DeveloperError.js";

/** @import Cartesian3 from "./Cartesian3.js"; */
/** @import Cartographic from "./Cartographic.js"; */
/** @import Ellipsoid from "./Ellipsoid.js"; */

/**
 * Defines how geodetic ellipsoid coordinates ({@link Cartographic}) project to a
 * flat map like Cesium's 2D and Columbus View modes.
 *
 * @see GeographicProjection
 * @see WebMercatorProjection
 *
 * @interface
 */
class MapProjection {
  /**
   * Gets the {@link Ellipsoid}.
   *
   * @type {Ellipsoid}
   * @readonly
   */
  ellipsoid;

  /**
   * Projects {@link Cartographic} coordinates, in radians, to projection-specific map coordinates, in meters.
   *
   * @param {Cartographic} cartographic The coordinates to project.
   * @param {Cartesian3} [result] An instance into which to copy the result.  If this parameter is
   *        undefined, a new instance is created and returned.
   * @returns {Cartesian3} The projected coordinates.  If the result parameter is not undefined, the
   *          coordinates are copied there and that instance is returned.  Otherwise, a new instance is
   *          created and returned.
   */
  project(cartographic, result) {
    DeveloperError.throwInstantiationError();
  }

  /**
   * Unprojects projection-specific map {@link Cartesian3} coordinates, in meters, to {@link Cartographic}
   * coordinates, in radians.
   *
   * @param {Cartesian3} cartesian The Cartesian position to unproject with height (z) in meters.
   * @param {Cartographic} [result] An instance into which to copy the result.  If this parameter is
   *        undefined, a new instance is created and returned.
   * @returns {Cartographic} The unprojected coordinates.  If the result parameter is not undefined, the
   *          coordinates are copied there and that instance is returned.  Otherwise, a new instance is
   *          created and returned.
   */
  unproject(cartesian, result) {
    DeveloperError.throwInstantiationError();
  }
}

export default MapProjection;
