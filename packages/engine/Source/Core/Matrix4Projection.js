// @ts-check

import Cartesian3 from "./Cartesian3.js";
import Cartesian4 from "./Cartesian4.js";
import Cartographic from "./Cartographic.js";
import CesiumMath from "./Math.js";
import createSerializedMapProjection from "./SerializedMapProjection.js";
import defined from "./defined.js";
import DeveloperError from "./DeveloperError.js";
import Ellipsoid from "./Ellipsoid.js";
import MapProjectionType from "./MapProjectionType.js";
import Matrix4 from "./Matrix4.js";

/** @import MapProjection from "./MapProjection.js"; */
/** @import {SerializedMapProjection} from "./SerializedMapProjection.js"; */

const scratchCartesian4 = new Cartesian4();

/**
 * A map projection defined by a 4x4 transformation matrix. Input coordinates
 * are treated as [longitude, latitude, height, 1.0] (in degrees by default)
 * and multiplied by the matrix to produce projected [x, y, z] coordinates.
 *
 * <p>
 * <b>Known Limitations:</b> some rendering features behave differently with
 * non-cylindrical projections. Polygons rendered with the default
 * <code>granularity</code> may show empty fills — set
 * <code>granularity: Math.PI / 8</code> as a workaround. Terrain tile
 * rendering and imagery reprojection are not supported. See the
 * {@link https://github.com/CesiumGS/cesium/tree/main/Documentation/CustomProjectionsGuide|Custom Projections Guide}
 * for details and workarounds.
 * </p>
 *
 * @implements MapProjection
 *
 * @see {@link https://github.com/CesiumGS/cesium/tree/main/Documentation/CustomProjectionsGuide|Custom Projections Guide}
 */
class Matrix4Projection {
  /**
   * @param {object} options Object with the following properties:
   * @param {Matrix4} options.matrix The 4x4 projection matrix.
   * @param {boolean} [options.degrees=true] Whether input coordinates are in degrees (true) or radians (false).
   * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.default] The ellipsoid.
   */
  constructor(options) {
    //>>includeStart('debug', pragmas.debug);
    if (!defined(options) || !defined(options.matrix)) {
      throw new DeveloperError("options.matrix is required.");
    }
    //>>includeEnd('debug');

    this._ellipsoid = options.ellipsoid ?? Ellipsoid.default;
    this._matrix = Matrix4.clone(options.matrix);
    this._inverseMatrix = Matrix4.inverse(this._matrix, new Matrix4());
    this._degrees = options.degrees ?? true;
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
   * Always returns <code>false</code> for Matrix4Projection.
   *
   * @type {boolean}
   * @readonly
   */
  get isNormalCylindrical() {
    return false;
  }

  /**
   * Projects {@link Cartographic} coordinates, in radians, to map coordinates.
   *
   * @param {Cartographic} cartographic The coordinates to project.
   * @param {Cartesian3} [result] An instance into which to copy the result.
   * @returns {Cartesian3} The projected coordinates.
   */
  project(cartographic, result) {
    let lon = cartographic.longitude;
    let lat = cartographic.latitude;

    if (this._degrees) {
      lon = CesiumMath.toDegrees(lon);
      lat = CesiumMath.toDegrees(lat);
    }

    scratchCartesian4.x = lon;
    scratchCartesian4.y = lat;
    scratchCartesian4.z = cartographic.height;
    scratchCartesian4.w = 1.0;

    Matrix4.multiplyByVector(
      this._matrix,
      scratchCartesian4,
      scratchCartesian4,
    );

    const w = scratchCartesian4.w;
    const x = scratchCartesian4.x / w;
    const y = scratchCartesian4.y / w;
    const z = scratchCartesian4.z / w;

    if (!defined(result)) {
      return new Cartesian3(x, y, z);
    }

    result.x = x;
    result.y = y;
    result.z = z;
    return result;
  }

  /**
   * Unprojects map coordinates to {@link Cartographic} coordinates, in radians.
   *
   * @param {Cartesian3} cartesian The Cartesian position to unproject.
   * @param {Cartographic} [result] An instance into which to copy the result.
   * @returns {Cartographic} The unprojected coordinates.
   */
  unproject(cartesian, result) {
    //>>includeStart('debug', pragmas.debug);
    if (!defined(cartesian)) {
      throw new DeveloperError("cartesian is required");
    }
    //>>includeEnd('debug');

    scratchCartesian4.x = cartesian.x;
    scratchCartesian4.y = cartesian.y;
    scratchCartesian4.z = cartesian.z;
    scratchCartesian4.w = 1.0;

    Matrix4.multiplyByVector(
      this._inverseMatrix,
      scratchCartesian4,
      scratchCartesian4,
    );

    const w = scratchCartesian4.w;
    let lon = scratchCartesian4.x / w;
    let lat = scratchCartesian4.y / w;
    const height = scratchCartesian4.z / w;

    if (this._degrees) {
      lon = CesiumMath.toRadians(lon);
      lat = CesiumMath.toRadians(lat);
    }

    if (!defined(result)) {
      return new Cartographic(lon, lat, height);
    }

    result.longitude = lon;
    result.latitude = lat;
    result.height = height;
    return result;
  }

  /**
   * Serializes this projection to a JSON object for transfer to a web worker.
   *
   * @returns {SerializedMapProjection} The serialized projection.
   */
  serialize() {
    return createSerializedMapProjection(MapProjectionType.MATRIX4, {
      matrix: Matrix4.pack(this._matrix, []),
      degrees: this._degrees,
      ellipsoid: Ellipsoid.pack(this._ellipsoid, []),
    });
  }

  /**
   * Reconstructs a Matrix4Projection from a serialized form.
   *
   * @param {any} json The serialized data.
   * @returns {Matrix4Projection} The deserialized projection.
   */
  static deserialize(json) {
    return new Matrix4Projection({
      matrix: Matrix4.unpack(json.matrix),
      degrees: json.degrees,
      ellipsoid: Ellipsoid.unpack(json.ellipsoid),
    });
  }
}

export default Matrix4Projection;
