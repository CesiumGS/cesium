// @ts-check

import Cartesian3 from "./Cartesian3.js";
import Cartographic from "./Cartographic.js";
import createSerializedMapProjection from "./SerializedMapProjection.js";
import defined from "./defined.js";
import DeveloperError from "./DeveloperError.js";
import Ellipsoid from "./Ellipsoid.js";
import MapProjectionType from "./MapProjectionType.js";

/** @import MapProjection from "./MapProjection.js"; */
/** @import {SerializedMapProjection} from "./SerializedMapProjection.js"; */

/**
 * A simple map projection where longitude and latitude are linearly mapped to X and Y by multiplying
 * them by the {@link Ellipsoid#maximumRadius}.  This projection
 * is commonly known as geographic, equirectangular, equidistant cylindrical, or plate carrée. When using the WGS84 ellipsoid, it
 * is also known as EPSG:4326.
 *
 * @see WebMercatorProjection
 *
 * @implements MapProjection
 */
class GeographicProjection {
  /**
   * @param {Ellipsoid} [ellipsoid=Ellipsoid.default] The ellipsoid.
   */
  constructor(ellipsoid) {
    this._ellipsoid = ellipsoid ?? Ellipsoid.default;
    this._semimajorAxis = this._ellipsoid.maximumRadius;
    this._oneOverSemimajorAxis = 1.0 / this._semimajorAxis;
  }

  /**
   * Gets the {@link Ellipsoid}.
   *
   * @type {Ellipsoid}
   * @readonly
   */
  get ellipsoid() {
    return this._ellipsoid;
  }

  /**
   * Gets whether this is a normal cylindrical projection.
   * Always returns <code>true</code> for GeographicProjection.
   *
   * @type {boolean}
   * @readonly
   */
  get isNormalCylindrical() {
    return true;
  }

  /**
   * Serializes this projection to a JSON object for transfer to a web worker.
   *
   * @returns {SerializedMapProjection} The serialized projection.
   */
  serialize() {
    return createSerializedMapProjection(MapProjectionType.GEOGRAPHIC, {
      ellipsoid: Ellipsoid.pack(this._ellipsoid, []),
    });
  }

  /**
   * Reconstructs a GeographicProjection from a serialized form.
   *
   * @param {any} json The serialized data.
   * @returns {GeographicProjection} The deserialized projection.
   */
  static deserialize(json) {
    const ellipsoid = Ellipsoid.unpack(json.ellipsoid);
    return new GeographicProjection(ellipsoid);
  }

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
  project(cartographic, result) {
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
  }

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
  unproject(cartesian, result) {
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
  }
}

export default GeographicProjection;
