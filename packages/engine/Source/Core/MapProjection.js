// @ts-check

import Cartesian2 from "./Cartesian2.js";
import Cartographic from "./Cartographic.js";
import CesiumMath from "./Math.js";
import DeveloperError from "./DeveloperError.js";

/** @import Cartesian3 from "./Cartesian3.js"; */
/** @import Ellipsoid from "./Ellipsoid.js"; */
/** @import {SerializedMapProjection} from "./SerializedMapProjection.js"; */

const scratchCartographic = new Cartographic();

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
   * @constant
   */
  ellipsoid;

  /**
   * Gets whether this projection is a normal cylindrical projection,
   * where meridians map to vertical lines and circles of latitude
   * map to horizontal lines. This is true for Geographic and WebMercator
   * projections but false for arbitrary custom projections.
   *
   * When true, the renderer can use faster code paths that assume
   * the projected space is a simple rectangle.
   *
   * @type {boolean}
   * @readonly
   */
  isNormalCylindrical;

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

  /**
   * Serializes this projection to a JSON object for transfer to a web worker.
   *
   * @returns {SerializedMapProjection} The serialized projection.
   */
  serialize() {
    DeveloperError.throwInstantiationError();
  }
}

/**
 * Approximates the maximum projected coordinates for a given map projection
 * by sampling the edges of the projection's valid area.
 *
 * For normal cylindrical projections, this is a simple calculation. For
 * non-cylindrical projections, it samples a grid of points along the boundary.
 *
 * @param {MapProjection} mapProjection The map projection.
 * @param {Cartesian2} [result] The instance into which to copy the result.
 * @returns {Cartesian2} The approximate maximum x and y coordinates.
 */
MapProjection.approximateMaximumCoordinate = function (mapProjection, result) {
  if (!result) {
    result = new Cartesian2();
  }

  if (mapProjection.isNormalCylindrical) {
    // For normal cylindrical projections, the maximum is at (PI, PI/2)
    scratchCartographic.longitude = Math.PI;
    scratchCartographic.latitude = CesiumMath.PI_OVER_TWO;
    scratchCartographic.height = 0.0;
    const projected = mapProjection.project(scratchCartographic);
    result.x = projected.x;
    result.y = projected.y;
    return result;
  }

  // For non-cylindrical projections, sample along the edges of the valid area
  // Some projections (e.g. Lambert Conformal Conic) are singular at one
  // pole and return Infinity or NaN there. Skip those samples so the
  // aggregated max stays finite and doesn't poison the SCENE2D frustum
  // bounds downstream (Camera._max2Dfrustum uses _maxCoord.x).
  // Cap accumulated values at a small multiple of the sphere radius.
  // Lambert Conformal Conic, stereographic and similar projections have
  // an antipodal singularity where projected coordinates grow to 1e14 m
  // or more. Those values are finite (so isFinite() doesn't reject them)
  // but they make the SCENE2D frustum absurdly large, which destabilises
  // clamping and culling. 4 * semiMajorAxis is a generous but sane cap
  // that still accommodates legitimate world-spanning projections
  // (Mollweide/Robinson max out near 2 * R).
  const coordCap = mapProjection.ellipsoid
    ? mapProjection.ellipsoid.maximumRadius * 4.0
    : 4.0 * 6378137.0;

  /**
   * @param {number} x
   * @param {number} y
   */
  function accumulate(x, y) {
    if (
      isFinite(x) &&
      isFinite(y) &&
      Math.abs(x) <= coordCap &&
      Math.abs(y) <= coordCap
    ) {
      maxX = Math.max(maxX, Math.abs(x));
      maxY = Math.max(maxY, Math.abs(y));
    }
  }

  let maxX = 0.0;
  let maxY = 0.0;

  const sampleCount = 36;
  for (let i = 0; i <= sampleCount; i++) {
    const fraction = i / sampleCount;

    // Sample along the top edge (latitude = PI/2)
    scratchCartographic.longitude = CesiumMath.PI * (2.0 * fraction - 1.0);
    scratchCartographic.latitude = CesiumMath.PI_OVER_TWO;
    scratchCartographic.height = 0.0;
    let projected = mapProjection.project(scratchCartographic);
    accumulate(projected.x, projected.y);

    // Sample along the bottom edge (latitude = -PI/2)
    scratchCartographic.latitude = -CesiumMath.PI_OVER_TWO;
    projected = mapProjection.project(scratchCartographic);
    accumulate(projected.x, projected.y);

    // Sample along the left edge (longitude = -PI)
    scratchCartographic.longitude = -Math.PI;
    scratchCartographic.latitude =
      CesiumMath.PI_OVER_TWO * (2.0 * fraction - 1.0);
    projected = mapProjection.project(scratchCartographic);
    accumulate(projected.x, projected.y);

    // Sample along the right edge (longitude = PI)
    scratchCartographic.longitude = Math.PI;
    projected = mapProjection.project(scratchCartographic);
    accumulate(projected.x, projected.y);
  }

  // Fallback if every sample was non-finite — e.g. a projection that
  // produces singularities everywhere on the boundary. Use two Earth radii
  // as a conservative default so the frustum stays finite.
  if (maxX === 0.0 && maxY === 0.0) {
    const r = mapProjection.ellipsoid
      ? mapProjection.ellipsoid.maximumRadius * 2.0
      : 2.0 * 6378137.0;
    maxX = r;
    maxY = r;
  }

  result.x = maxX;
  result.y = maxY;
  return result;
};

export default MapProjection;
