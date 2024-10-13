import Cartesian3 from "./Cartesian3.js";
import Cartographic from "./Cartographic.js";
import defined from "./defined.js";
import DeveloperError from "./DeveloperError.js";
import Ellipsoid from "./Ellipsoid.js";

/**
 * A simple map projection where longitude and latitude are linearly mapped to X and Y by multiplying
 * them by the {@link Ellipsoid#maximumRadius}.  This projection
 * is commonly known as geographic, equirectangular, equidistant cylindrical, or plate carrée. When using the WGS84 ellipsoid, it
 * is also known as EPSG:4326.
 *
 * @alias GeographicProjection
 * @constructor
 *
 * @param {Ellipsoid} [ellipsoid=Ellipsoid.default] The ellipsoid.
 *
 * @see WebMercatorProjection
 */
function GeographicProjection(ellipsoid) {
  this._ellipsoid = ellipsoid ?? Ellipsoid.default;
  this._semimajorAxis = this._ellipsoid.maximumRadius;
  this._oneOverSemimajorAxis = 1.0 / this._semimajorAxis;
}

Object.defineProperties(GeographicProjection.prototype, {
  /**
   * Gets the {@link Ellipsoid}.
   *
   * @memberof GeographicProjection.prototype
   *
   * @type {Ellipsoid}
   * @readonly
   */
  ellipsoid: {
    get: function () {
      return this._ellipsoid;
    },
  },
});

/**
 * Projects a set of {@link Cartographic} coordinates, in radians, to map coordinates, in meters.
 * X and Y are the longitude and latitude, respectively, multiplied by the maximum radius of the
 * ellipsoid.  Z is the unmodified height.
 *
 * @param {Cartographic} cartographic The coordinates to project.
 * @param {Cartesian3} [result] An instance into which to copy the result.  If this parameter is
 *        undefined, a new instance is created and returned.
 * @returns {Cartesian3} The projected coordinates.  If the result parameter is not undefined, the
 *          coordinates are copied there and that instance is returned.  Otherwise, a new instance is
 *          created and returned.
 */
GeographicProjection.prototype.project = function (cartographic, result) {
  // Actually this is the special case of equidistant cylindrical called the plate carree
  const semimajorAxis = this._semimajorAxis;
  const x = cartographic.longitude * semimajorAxis;
  const y = cartographic.latitude * semimajorAxis;
  const z = cartographic.height;

  if (!defined(result)) {
    return new Cartesian3(x, y, z);
  }

  result.x = x;
  result.y = y;
  result.z = z;
  return result;
};

/**
 * Unprojects a set of projected {@link Cartesian3} coordinates, in meters, to {@link Cartographic}
 * coordinates, in radians.  Longitude and Latitude are the X and Y coordinates, respectively,
 * divided by the maximum radius of the ellipsoid.  Height is the unmodified Z coordinate.
 *
 * @param {Cartesian3} cartesian The Cartesian position to unproject with height (z) in meters.
 * @param {Cartographic} [result] An instance into which to copy the result.  If this parameter is
 *        undefined, a new instance is created and returned.
 * @returns {Cartographic} The unprojected coordinates.  If the result parameter is not undefined, the
 *          coordinates are copied there and that instance is returned.  Otherwise, a new instance is
 *          created and returned.
 */
GeographicProjection.prototype.unproject = function (cartesian, result) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(cartesian)) {
    throw new DeveloperError("cartesian is required");
  }
  //>>includeEnd('debug');

  const oneOverEarthSemimajorAxis = this._oneOverSemimajorAxis;
  const longitude = cartesian.x * oneOverEarthSemimajorAxis;
  const latitude = cartesian.y * oneOverEarthSemimajorAxis;
  const height = cartesian.z;

  if (!defined(result)) {
    return new Cartographic(longitude, latitude, height);
  }

  result.longitude = longitude;
  result.latitude = latitude;
  result.height = height;
  return result;
};

export default GeographicProjection;
