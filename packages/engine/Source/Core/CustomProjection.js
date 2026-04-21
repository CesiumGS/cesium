// @ts-check

import createSerializedMapProjection from "./SerializedMapProjection.js";
import defined from "./defined.js";
import DeveloperError from "./DeveloperError.js";
import Ellipsoid from "./Ellipsoid.js";
import MapProjectionType from "./MapProjectionType.js";

/** @import Cartesian3 from "./Cartesian3.js"; */
/** @import Cartographic from "./Cartographic.js"; */
/** @import MapProjection from "./MapProjection.js"; */
/** @import {SerializedMapProjection} from "./SerializedMapProjection.js"; */

/**
 * A map projection with user-defined project and unproject functions.
 *
 * <p>
 * The project and unproject functions must be <strong>self-contained</strong> —
 * they must not reference external variables, imports, or closures. This is
 * required because the functions are serialized as source code for transfer
 * to web workers via {@link CustomProjection#serialize}.
 * </p>
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
 *
 * @example
 * // Functions must be self-contained (no external references)
 * const projection = new Cesium.CustomProjection({
 *   project: function (cartographic, result) {
 *     result = result || { x: 0, y: 0, z: 0 };
 *     result.x = cartographic.longitude * 6378137;
 *     result.y = cartographic.latitude * 6378137;
 *     result.z = cartographic.height;
 *     return result;
 *   },
 *   unproject: function (cartesian, result) {
 *     result = result || { longitude: 0, latitude: 0, height: 0 };
 *     result.longitude = cartesian.x / 6378137;
 *     result.latitude = cartesian.y / 6378137;
 *     result.height = cartesian.z;
 *     return result;
 *   },
 * });
 */
class CustomProjection {
  /**
   * @param {object} options Object with the following properties:
   * @param {function(Cartographic, Cartesian3=): Cartesian3} options.project The projection function. Must be self-contained.
   * @param {function(Cartesian3, Cartographic=): Cartographic} options.unproject The unprojection function. Must be self-contained.
   * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.default] The ellipsoid.
   */
  constructor(options) {
    //>>includeStart('debug', pragmas.debug);
    if (!defined(options)) {
      throw new DeveloperError("options is required.");
    }
    if (!defined(options.project)) {
      throw new DeveloperError("options.project is required.");
    }
    if (!defined(options.unproject)) {
      throw new DeveloperError("options.unproject is required.");
    }
    //>>includeEnd('debug');

    this._ellipsoid = options.ellipsoid ?? Ellipsoid.default;
    this._projectFunction = options.project;
    this._unprojectFunction = options.unproject;

    // Store the function source for serialization to web workers
    this._projectSource = options.project.toString();
    this._unprojectSource = options.unproject.toString();
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
   * Always returns <code>false</code> for CustomProjection.
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
    return this._projectFunction(cartographic, result);
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

    return this._unprojectFunction(cartesian, result);
  }

  /**
   * Serializes this projection to a JSON object for transfer to a web worker.
   * The project and unproject functions are serialized as source code strings.
   *
   * @returns {SerializedMapProjection} The serialized projection.
   */
  serialize() {
    return createSerializedMapProjection(MapProjectionType.CUSTOM, {
      projectSource: this._projectSource,
      unprojectSource: this._unprojectSource,
      ellipsoid: Ellipsoid.pack(this._ellipsoid, []),
    });
  }

  /**
   * Reconstructs a CustomProjection from a serialized form.
   *
   * @param {any} json The serialized data.
   * @returns {CustomProjection} The deserialized projection.
   */
  static deserialize(json) {
    const projectFunction = new Function(`return ${json.projectSource}`)();
    const unprojectFunction = new Function(`return ${json.unprojectSource}`)();

    return new CustomProjection({
      project: projectFunction,
      unproject: unprojectFunction,
      ellipsoid: Ellipsoid.unpack(json.ellipsoid),
    });
  }
}

export default CustomProjection;
