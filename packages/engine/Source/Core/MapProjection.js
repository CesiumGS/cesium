import DeveloperError from "./DeveloperError.js";

/**
 * Defines how geodetic ellipsoid coordinates ({@link Cartographic}) project to a
 * flat map like Cesium's 2D and Columbus View modes.
 *
 * @alias MapProjection
 * @constructor
 * @abstract
 *
 * @see GeographicProjection
 * @see WebMercatorProjection
 */
function MapProjection() {
  DeveloperError.throwInstantiationError();
}

Object.defineProperties(MapProjection.prototype, {
  /**
   * Gets the {@link Ellipsoid}.
   *
   * @memberof MapProjection.prototype
   *
   * @type {Ellipsoid}
   * @readonly
   */
  ellipsoid: {
    get: DeveloperError.throwInstantiationError,
  },
});

/**
 * Projects {@link Cartographic} coordinates, in radians, to projection-specific map coordinates, in meters.
 *
 * @memberof MapProjection
 * @function
 *
 * @param {Cartographic} cartographic The coordinates to project.
 * @param {Cartesian3} [result] An instance into which to copy the result.  If this parameter is
 *        undefined, a new instance is created and returned.
 * @returns {Cartesian3} The projected coordinates.  If the result parameter is not undefined, the
 *          coordinates are copied there and that instance is returned.  Otherwise, a new instance is
 *          created and returned.
 */
MapProjection.prototype.project = DeveloperError.throwInstantiationError;

/**
 * Unprojects projection-specific map {@link Cartesian3} coordinates, in meters, to {@link Cartographic}
 * coordinates, in radians.
 *
 * @memberof MapProjection
 * @function
 *
 * @param {Cartesian3} cartesian The Cartesian position to unproject with height (z) in meters.
 * @param {Cartographic} [result] An instance into which to copy the result.  If this parameter is
 *        undefined, a new instance is created and returned.
 * @returns {Cartographic} The unprojected coordinates.  If the result parameter is not undefined, the
 *          coordinates are copied there and that instance is returned.  Otherwise, a new instance is
 *          created and returned.
 */
MapProjection.prototype.unproject = DeveloperError.throwInstantiationError;
export default MapProjection;
