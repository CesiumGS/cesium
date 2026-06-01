// @ts-check

import Cartesian3 from "./Cartesian3.js";
import Cartographic from "./Cartographic.js";
import CesiumMath from "./Math.js";
import createSerializedMapProjection from "./SerializedMapProjection.js";
import defined from "./defined.js";
import DeveloperError from "./DeveloperError.js";
import Ellipsoid from "./Ellipsoid.js";
import MapProjectionType from "./MapProjectionType.js";
import Rectangle from "./Rectangle.js";
import proj4 from "proj4";

/** @import MapProjection from "./MapProjection.js"; */
/** @import {SerializedMapProjection} from "./SerializedMapProjection.js"; */

/**
 * A map projection defined by a proj4 source string. The source string can
 * be a proj4 definition (e.g. <code>+proj=laea +lat_0=52 ...</code>), an
 * OGC Well-Known Text (WKT) definition, or anything else
 * {@link https://github.com/proj4js/proj4js|proj4js} accepts as a projection
 * source.
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
 * // Lambert Azimuthal Equal-Area, Europe (EPSG:3035)
 * const projection = new Cesium.Proj4Projection({
 *   sourceProjection: "+proj=laea +lat_0=52 +lon_0=10 +x_0=4321000 +y_0=3210000 +ellps=GRS80 +units=m +no_defs",
 * });
 */
class Proj4Projection {
  /**
   * @param {object} options Object with the following properties:
   * @param {string} options.sourceProjection A proj4 definition string or OGC
   *   Well-Known Text describing the projection. Anything proj4js accepts as
   *   a projection source is valid here.
   * @param {number} [options.heightScale=1.0] A scale factor applied to projected heights.
   * @param {Rectangle} [options.wgs84Bounds] The valid geographic bounds for this projection, in radians.
   *   Coordinates outside these bounds will be clamped before projecting.
   * @param {Rectangle} [options.projectedBounds] The projected bounds in meters.
   * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.default] The ellipsoid.
   */
  constructor(options) {
    //>>includeStart('debug', pragmas.debug);
    if (!defined(options) || !defined(options.sourceProjection)) {
      throw new DeveloperError("options.sourceProjection is required.");
    }
    if (
      defined(options.heightScale) &&
      (!Number.isFinite(options.heightScale) || options.heightScale === 0)
    ) {
      // heightScale is the divisor in unproject — zero produces NaN heights
      // that propagate silently into the camera and terrain pipeline. Reject
      // non-finite and zero values up front rather than at first use.
      throw new DeveloperError(
        "options.heightScale must be a non-zero finite number.",
      );
    }
    //>>includeEnd('debug');

    this._ellipsoid = options.ellipsoid ?? Ellipsoid.default;
    this._sourceProjection = options.sourceProjection;
    this._heightScale = options.heightScale ?? 1.0;

    this._wgs84Bounds = defined(options.wgs84Bounds)
      ? Rectangle.clone(options.wgs84Bounds)
      : undefined;
    this._projectedBounds = defined(options.projectedBounds)
      ? Rectangle.clone(options.projectedBounds)
      : undefined;

    try {
      this._projFunction = proj4(this._sourceProjection);
    } catch (e) {
      throw new DeveloperError(
        `Failed to create proj4 projection from source: ${e.message}`,
      );
    }

    this._shaderUniforms = computeShaderUniforms(
      this._projFunction,
      this._ellipsoid,
    );
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
   * Always returns <code>false</code> for Proj4Projection.
   *
   * @type {boolean}
   * @readonly
   */
  get isNormalCylindrical() {
    return false;
  }

  /**
   * Gets the proj4 source string that defines this projection.
   *
   * @type {string}
   * @readonly
   */
  get sourceProjection() {
    return this._sourceProjection;
  }

  /**
   * Gets the projection parameters consumed by the GLSL automatic uniforms
   * (czm_projectionParams, czm_projectionOffsets, czm_projectionEllipsoidParams,
   * czm_projectionEllipsoidParams2). Read directly from proj4's parsed
   * representation so CPU and GPU agree on every WKT variant.
   *
   * Returned object shape:
   * <ul>
   *   <li><code>lon0</code>, <code>lat0</code> — projection center, radians.</li>
   *   <li><code>sinLat0</code>, <code>cosLat0</code> — precomputed for the GPU.</li>
   *   <li><code>falseEasting</code>, <code>falseNorthing</code> — meters.</li>
   *   <li><code>semiMajorAxis</code> — meters.</li>
   *   <li><code>sinBeta0</code>, <code>cosBeta0</code>, <code>Rq</code>,
   *       <code>D</code> — ellipsoidal LAEA helpers.</li>
   *   <li><code>e2</code>, <code>e</code>, <code>qp</code> — eccentricity and
   *       authalic-latitude reference value.</li>
   * </ul>
   *
   * @type {object}
   * @readonly
   * @private
   */
  get shaderUniforms() {
    return this._shaderUniforms;
  }

  /**
   * Projects {@link Cartographic} coordinates, in radians, to map coordinates.
   *
   * @param {Cartographic} cartographic The coordinates to project.
   * @param {Cartesian3} [result] An instance into which to copy the result.
   * @returns {Cartesian3} The projected coordinates.
   */
  project(cartographic, result) {
    // proj4 throws TypeError on non-finite inputs. Cesium chains often re-
    // project a cartographic that was recovered from a prior unproject (e.g.
    // ScreenSpaceCameraController.adjustHeightForTerrain), and that
    // cartographic can carry NaN when the camera was outside the projection's
    // valid area. Match the behavior of GeographicProjection (where Math.cos
    // simply propagates NaN) and of Proj4Projection.unproject (where proj4
    // returns null/non-finite without throwing): propagate NaN rather than
    // throw, and let downstream finite-checks filter the sentinel.
    if (!isFinite(cartographic.longitude) || !isFinite(cartographic.latitude)) {
      if (!defined(result)) {
        return new Cartesian3(NaN, NaN, cartographic.height);
      }
      result.x = NaN;
      result.y = NaN;
      result.z = cartographic.height;
      return result;
    }

    let longitude = CesiumMath.toDegrees(cartographic.longitude);
    let latitude = CesiumMath.toDegrees(cartographic.latitude);

    // Clamp to valid bounds if specified
    if (defined(this._wgs84Bounds)) {
      const bounds = this._wgs84Bounds;
      const westDeg = CesiumMath.toDegrees(bounds.west);
      const eastDeg = CesiumMath.toDegrees(bounds.east);
      const southDeg = CesiumMath.toDegrees(bounds.south);
      const northDeg = CesiumMath.toDegrees(bounds.north);

      longitude = CesiumMath.clamp(longitude, westDeg, eastDeg);
      latitude = CesiumMath.clamp(latitude, southDeg, northDeg);
    }

    const projected = this._projFunction.forward([longitude, latitude]);
    const x = projected[0];
    const y = projected[1];
    const z = cartographic.height * this._heightScale;

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

    // Mirror of project()'s NaN-safe path: proj4.inverse also throws on
    // non-finite inputs. Camera-update chains can call us with a position
    // that already contains NaN (e.g. after a prior degenerate unproject
    // fed back into updateMembers); propagate NaN rather than throwing so
    // downstream finite-checks can recover.
    if (!isFinite(cartesian.x) || !isFinite(cartesian.y)) {
      const height = cartesian.z / this._heightScale;
      if (!defined(result)) {
        return new Cartographic(NaN, NaN, height);
      }
      result.longitude = NaN;
      result.latitude = NaN;
      result.height = height;
      return result;
    }

    const unprojected = this._projFunction.inverse([cartesian.x, cartesian.y]);
    const longitude = CesiumMath.toRadians(unprojected[0]);
    const latitude = CesiumMath.toRadians(unprojected[1]);
    const height = cartesian.z / this._heightScale;

    if (!defined(result)) {
      return new Cartographic(longitude, latitude, height);
    }

    result.longitude = longitude;
    result.latitude = latitude;
    result.height = height;
    return result;
  }

  /**
   * Serializes this projection to a JSON object for transfer to a web worker.
   *
   * @returns {SerializedMapProjection} The serialized projection.
   */
  serialize() {
    /** @type {any} */
    const json = {
      sourceProjection: this._sourceProjection,
      heightScale: this._heightScale,
      ellipsoid: Ellipsoid.pack(this._ellipsoid, []),
    };

    if (defined(this._wgs84Bounds)) {
      json.wgs84Bounds = Rectangle.pack(this._wgs84Bounds, []);
    }
    if (defined(this._projectedBounds)) {
      json.projectedBounds = Rectangle.pack(this._projectedBounds, []);
    }

    return createSerializedMapProjection(MapProjectionType.PROJ4, json);
  }

  /**
   * Reconstructs a Proj4Projection from a serialized form.
   *
   * @param {any} json The serialized data.
   * @returns {Proj4Projection} The deserialized projection.
   */
  static deserialize(json) {
    /** @type {any} */
    const options = {
      sourceProjection: json.sourceProjection,
      heightScale: json.heightScale,
      ellipsoid: Ellipsoid.unpack(json.ellipsoid),
    };

    if (defined(json.wgs84Bounds)) {
      options.wgs84Bounds = Rectangle.unpack(json.wgs84Bounds);
    }
    if (defined(json.projectedBounds)) {
      options.projectedBounds = Rectangle.unpack(json.projectedBounds);
    }

    return new Proj4Projection(options);
  }
}

/**
 * Computes the authalic latitude parameter q for a given sin(latitude).
 * Used by the ellipsoidal Lambert Azimuthal Equal-Area projection.
 *
 * @param {number} sinlat
 * @param {number} e
 * @param {number} e2
 * @returns {number}
 * @private
 */
function qFunc(sinlat, e, e2) {
  if (e === 0.0) {
    // Spherical case — qFunc reduces to 2 * sinlat in the limit.
    return 2.0 * sinlat;
  }
  const esinlat = e * sinlat;
  return (
    (1 - e2) *
    (sinlat / (1 - esinlat * esinlat) -
      (1 / (2 * e)) * Math.log((1 - esinlat) / (1 + esinlat)))
  );
}

/**
 * Reads the parsed projection parameters from a proj4 instance and
 * pre-computes the values consumed by the GLSL projection uniforms.
 * Reading from <code>projFunction.oProj</code> avoids the CPU/GPU
 * divergence that a regex over the source WKT introduces (alternate
 * datums, alias parameter names, EPSG references, WKT2 form).
 *
 * @param {any} projFunction
 * @param {Ellipsoid} ellipsoid
 * @returns {object}
 * @private
 */
function computeShaderUniforms(projFunction, ellipsoid) {
  const oProj = projFunction.oProj ?? {};

  // proj4 stores long0/lat0 in radians; missing params (e.g. global
  // projections like Robinson) come back as undefined.
  const lon0 = Number.isFinite(oProj.long0) ? oProj.long0 : 0.0;
  const lat0 = Number.isFinite(oProj.lat0) ? oProj.lat0 : 0.0;
  const x0 = Number.isFinite(oProj.x0) ? oProj.x0 : 0.0;
  const y0 = Number.isFinite(oProj.y0) ? oProj.y0 : 0.0;

  // Fall back to the configured ellipsoid only when proj4 didn't resolve
  // a/b — proj4's value is the ground truth for the projection itself.
  const a = Number.isFinite(oProj.a) ? oProj.a : ellipsoid.maximumRadius;
  const b = Number.isFinite(oProj.b) ? oProj.b : ellipsoid.minimumRadius;

  // proj4 exposes es (= e²); recompute e from a/b for resilience if it's
  // not available.
  let e2;
  if (Number.isFinite(oProj.es)) {
    e2 = oProj.es;
  } else {
    e2 = a > 0 ? 1.0 - (b * b) / (a * a) : 0.0;
  }
  const e = Math.sqrt(Math.max(0.0, e2));

  const qp = qFunc(1.0, e, e2);
  const q0 = qFunc(Math.sin(lat0), e, e2);
  const sinBeta0 = qp !== 0.0 ? q0 / qp : 0.0;
  const cosBeta0 = Math.sqrt(Math.max(0.0, 1.0 - sinBeta0 * sinBeta0));
  const Rq = a * Math.sqrt(Math.max(0.0, qp / 2.0));
  const denom =
    Math.sqrt(1.0 - e2 * Math.sin(lat0) * Math.sin(lat0)) * Rq * cosBeta0;
  const D = denom !== 0.0 ? (a * Math.cos(lat0)) / denom : 1.0;

  return {
    lon0: lon0,
    lat0: lat0,
    sinLat0: Math.sin(lat0),
    cosLat0: Math.cos(lat0),
    falseEasting: x0,
    falseNorthing: y0,
    semiMajorAxis: a,
    sinBeta0: sinBeta0,
    cosBeta0: cosBeta0,
    Rq: Rq,
    D: D,
    e2: e2,
    e: e,
    qp: qp,
  };
}

export default Proj4Projection;
