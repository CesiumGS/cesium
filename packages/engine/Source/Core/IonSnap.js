import Cartesian3 from "./Cartesian3.js";
import Cartesian4 from "./Cartesian4.js";
import Cartographic from "./Cartographic.js";
import Check from "./Check.js";
import Frozen from "./Frozen.js";
import CesiumMath from "./Math.js";
import defined from "./defined.js";
import Ion from "./Ion.js";
import Matrix4 from "./Matrix4.js";
import Resource from "./Resource.js";
import RuntimeError from "./RuntimeError.js";

/**
 * Convert a WGS84 degrees point object returned by the ion REST API to a
 * Cartesian3, or undefined when absent.
 * @private
 */
function cartesianFromApiPoint(point) {
  if (
    !defined(point) ||
    !defined(point.longitude) ||
    !defined(point.latitude)
  ) {
    return undefined;
  }
  return Cartesian3.fromDegrees(
    point.longitude,
    point.latitude,
    point.height ?? 0.0,
  );
}

/**
 * Convert a Cartesian3 (ECEF) to the WGS84 degrees object shape the ion REST
 * API expects.
 * @private
 */
function apiPointFromCartesian(cartesian) {
  const carto = Cartographic.fromCartesian(cartesian);
  return {
    longitude: CesiumMath.toDegrees(carto.longitude),
    latitude: CesiumMath.toDegrees(carto.latitude),
    height: carto.height,
  };
}

/**
 * Convert a Matrix4 to the row-major array-of-rows shape the ion REST API
 * expects for <code>worldToView</code>.
 * @private
 */
function rowsFromMatrix4(matrix) {
  const rows = [];
  const row = new Cartesian4();
  for (let i = 0; i < 4; i++) {
    Matrix4.getRow(matrix, i, row);
    rows.push([row.x, row.y, row.z, row.w]);
  }
  return rows;
}

/**
 * Build the clip-space -> pixel-space (projective) viewport matrix:
 * <pre>
 *   px = (ndcX * 0.5 + 0.5) * width
 *   py = (1 - (ndcY * 0.5 + 0.5)) * height   (y-down, top-left origin)
 *   pz = ndcZ * 0.5 + 0.5                    ([-1,1] -> [0,1] depth)
 * </pre>
 * @private
 */
function viewportMatrix(width, height, result) {
  return Matrix4.fromRowMajorArray(
    // prettier-ignore
    [
      width / 2, 0, 0, width / 2,
      0, -height / 2, 0, height / 2,
      0, 0, 0.5, 0.5,
      0, 0, 0, 1,
    ],
    result,
  );
}

const scratchViewport = new Matrix4();
const scratchWorldToView = new Matrix4();

/**
 * Adds CesiumJS client headers, matching the ion requests made by {@link IonResource}.
 * @private
 */
function addClientHeaders(headers = {}) {
  headers["X-Cesium-Client"] = "CesiumJS";
  /* global CESIUM_VERSION */
  if (typeof CESIUM_VERSION !== "undefined") {
    headers["X-Cesium-Client-Version"] = CESIUM_VERSION;
  }
  return headers;
}

/**
 * The result of a successful {@link IonSnap#snap}.
 *
 * @typedef {object} IonSnap.SnapResult
 * @property {IonSnap.SnapMode} [snapMode] The snap mode that produced the snap.
 * @property {IonSnap.SnapHeat} [heat] How close the snap point is to the close point in view space.
 * @property {IonSnap.GeometryType} [geomType] The type of geometry snapped to.
 * @property {IonSnap.ParentGeometryType} [parentGeomType] The type of the parent geometry snapped to.
 * @property {Cartesian3} [snapPoint] The snapped point. This is the point to consume.
 * @property {Cartesian3} [hitPoint] The point where the cursor hit the geometry: the nearest edge point when within the snap aperture, otherwise the surface point under the cursor.
 * @property {object} [normal] The surface normal at the snap point, in the iModel's local cartesian frame.
 * @property {object} [curve] The curve geometry near the snap point, with points as WGS84 degrees objects.
 */

/**
 * Provides interactive snap-to-geometry against an iModel-backed Cesium ion
 * asset using the ion REST API's element snap endpoint.
 *
 * The native iTwin snapper works in iModel-local coordinates and screen
 * pixels; this class bridges both gaps. It fetches the asset's iModel-to-ECEF
 * transform once, and per snap composes the required world-to-view matrix
 * from a {@link Scene}'s camera so that view-dependent snapping (nearest,
 * pixel apertures, surface tracking) behaves correctly.
 *
 * This object is normally not instantiated directly, use {@link IonSnap.fromAssetId}.
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 *
 * @see Ion
 *
 * @example
 * const snapper = await Cesium.IonSnap.fromAssetId(123456);
 * const result = await snapper.snap({
 *   elementId: "0x30000000df2",
 *   testPoint: pickedPosition,
 *   scene: viewer.scene,
 * });
 * if (defined(result)) {
 *   console.log("snapped to", result.snapPoint);
 * }
 */
class IonSnap {
  /**
   * @param {object} options Object with the following properties:
   * @param {number} options.assetId The ion asset id.
   * @param {Resource} options.resource The asset's ion API resource.
   * @param {Matrix4} options.ecefTransform The iModel-spatial to ECEF transform.
   */
  constructor(options) {
    this._assetId = options.assetId;
    this._resource = options.resource;

    /**
     * The iModel-spatial to ECEF transform for this asset, from the iModel's
     * geolocation. Constant for a given asset.
     * @type {Matrix4}
     * @readonly
     */
    this.ecefTransform = options.ecefTransform;
  }

  /**
   * The ion asset id this snapper operates on.
   * @type {number}
   * @readonly
   */
  get assetId() {
    return this._assetId;
  }

  /**
   * Creates an {@link IonSnap} for the given iModel-backed ion asset, fetching
   * the asset's ECEF transform from the ion REST API.
   *
   * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
   *
   * @param {number} assetId The ion asset id of an iModel-backed asset.
   * @param {object} [options] Object with the following properties:
   * @param {string} [options.accessToken=Ion.defaultAccessToken] The ion access token to use.
   * @param {string|Resource} [options.server=Ion.defaultServer] The ion API server to use.
   * @returns {Promise<IonSnap>} A snapper bound to the asset.
   *
   * @exception {RuntimeError} The asset is not geolocated, so view-correct snapping is not possible.
   */
  static async fromAssetId(assetId, options) {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.number("assetId", assetId);
    //>>includeEnd('debug');

    options = options ?? Frozen.EMPTY_OBJECT;
    const accessToken = options.accessToken ?? Ion.defaultAccessToken;
    const server = Resource.createIfNeeded(options.server ?? Ion.defaultServer);
    server.appendForwardSlash();

    const resourceOptions = {
      // Trailing slash so derived resource urls resolve under the asset id.
      url: `assets/${assetId}/`,
      headers: addClientHeaders(),
    };
    if (defined(accessToken)) {
      resourceOptions.queryParameters = { access_token: accessToken };
    }
    const resource = server.getDerivedResource(resourceOptions);

    const ecefResponse = await resource
      .getDerivedResource({ url: "ecef" })
      .fetchJson();

    if (!defined(ecefResponse?.ecefTransform)) {
      throw new RuntimeError(
        `Ion asset ${assetId} is not geolocated; snapping requires a geolocated iModel`,
      );
    }

    const ecefTransform = Matrix4.fromRowMajorArray(
      ecefResponse.ecefTransform.flat(),
    );

    return new IonSnap({
      assetId: assetId,
      resource: resource,
      ecefTransform: ecefTransform,
    });
  }

  /**
   * Computes the world-to-view matrix the native snapper needs: a projective
   * transform from iModel-world coordinates to view (CSS pixel) coordinates,
   * composed as <code>V * P * Vm * E</code> where
   * <ul>
   *   <li><code>E</code>: iModel -> ECEF (this asset's {@link IonSnap#ecefTransform})</li>
   *   <li><code>Vm</code>: ECEF -> eye (<code>camera.viewMatrix</code>)</li>
   *   <li><code>P</code>: eye -> clip (<code>camera.frustum.projectionMatrix</code>)</li>
   *   <li><code>V</code>: clip -> pixels (y-down viewport matrix)</li>
   * </ul>
   * The viewport term uses CSS pixel dimensions so pixel-valued snap apertures
   * mean CSS pixels regardless of the display's device pixel ratio.
   *
   * @param {Scene} scene The scene whose camera and canvas define the view.
   * @param {Matrix4} [result] The object onto which to store the result.
   * @returns {Matrix4} The iModel-world to view (pixels) matrix.
   *
   * @private
   */
  _computeWorldToView(scene, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.defined("scene", scene);
    //>>includeEnd('debug');

    result = result ?? new Matrix4();

    const camera = scene.camera;
    const canvas = scene.canvas;
    const V = viewportMatrix(
      canvas.clientWidth,
      canvas.clientHeight,
      scratchViewport,
    );

    // result = V * P * Vm * E, built up right-to-left
    Matrix4.multiply(camera.viewMatrix, this.ecefTransform, result);
    Matrix4.multiply(camera.frustum.projectionMatrix, result, result);
    return Matrix4.multiply(V, result, result);
  }

  /**
   * Requests a snap against an element of this asset.
   *
   * Provide either <code>options.scene</code>, in which case a view-correct
   * world-to-view matrix is composed automatically from the current camera, or
   * an explicit <code>options.worldToView</code> (iModel-world to view pixels).
   * Without either, the server defaults to an identity matrix and
   * view-dependent snapping (nearest ordering, pixel apertures, surface
   * tracking) will not behave correctly.
   *
   * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
   *
   * @param {object} options Object with the following properties:
   * @param {string} options.elementId The element id to snap to, as a hex string, e.g. <code>"0x30000000df2"</code>.
   * @param {Cartesian3} options.testPoint The point to snap from, typically the picked cursor position.
   * @param {Scene} [options.scene] The scene used to compose the world-to-view matrix.
   * @param {Matrix4} [options.worldToView] An explicit iModel-world to view (pixels) matrix. Takes precedence over <code>options.scene</code>.
   * @param {Cartesian3} [options.closePoint] A reference point near the target geometry that seeds the snap search. When omitted, the server uses <code>options.testPoint</code>.
   * @param {number} [options.snapAperture] The snap tolerance in pixels of the world-to-view output space. When omitted, the server's default aperture is used.
   * @param {IonSnap.SnapMode} [options.snapMode] The type of snap to perform. When omitted, the server's default snap mode is used.
   * @returns {Promise<IonSnap.SnapResult|undefined>} The snap result, or <code>undefined</code> if the element was not found or no snap was possible for it.
   */
  async snap(options) {
    //>>includeStart('debug', pragmas.debug);
    Check.defined("options", options);
    Check.typeOf.string("options.elementId", options.elementId);
    Check.defined("options.testPoint", options.testPoint);
    //>>includeEnd('debug');

    let worldToView = options.worldToView;
    if (!defined(worldToView) && defined(options.scene)) {
      worldToView = this._computeWorldToView(options.scene, scratchWorldToView);
    }

    const body = {
      testPoint: apiPointFromCartesian(options.testPoint),
    };
    if (defined(options.closePoint)) {
      body.closePoint = apiPointFromCartesian(options.closePoint);
    }
    if (defined(worldToView)) {
      body.worldToView = rowsFromMatrix4(worldToView);
    }
    if (defined(options.snapAperture)) {
      body.snapAperture = options.snapAperture;
    }
    if (defined(options.snapMode)) {
      body.snapMode = options.snapMode;
    }

    let response;
    try {
      response = await this._resource
        .getDerivedResource({
          url: `elements/${options.elementId}/snap`,
        })
        .post(JSON.stringify(body), {
          headers: {
            "Content-Type": "application/json",
          },
          responseType: "json",
        });
    } catch (error) {
      // The snap endpoint responds 404 when the element does not exist, and
      // 400 with a "No snap possible" message when the element has no
      // snappable geometry or the test point is too far from it. Treat both
      // as "no snap".
      if (error?.statusCode === 404) {
        return undefined;
      }
      if (
        error?.statusCode === 400 &&
        typeof error.response?.message === "string" &&
        error.response.message.includes("No snap possible")
      ) {
        return undefined;
      }
      throw error;
    }

    if (!defined(response)) {
      return undefined;
    }

    const result = {
      snapMode: response.snapMode,
      heat: response.heat,
      geomType: response.geomType,
      parentGeomType: response.parentGeomType,
      normal: response.normal,
      curve: response.curve,
    };
    result.snapPoint = cartesianFromApiPoint(response.snapPoint);
    result.hitPoint = cartesianFromApiPoint(response.hitPoint);
    return result;
  }
}

/**
 * The snap modes supported by {@link IonSnap#snap}. These follow the
 * MicroStation snap mode semantics; see the
 * {@link https://docs.bentley.com/LiveContent/web/MicroStation%20Help-v27/en/GUID-77D54C0B-D6FF-13DA-5EC8-3196330F5244.html|MicroStation documentation}
 * for reference.
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 *
 * @enum {number}
 */
IonSnap.SnapMode = {
  /**
   * Snaps to the point on the element nearest to the cursor. When the cursor
   * is farther than the snap aperture from an edge, tracks the surface under
   * the cursor instead.
   * @type {number}
   * @constant
   */
  NEAREST: 1,
  /**
   * Snaps to the nearest of the element's keypoints. Keypoints are defined by
   * the element's geometry type and the snap divisor.
   * <p>
   * On linear elements, keypoints are regularly spaced along each segment:
   * the number of keypoints on a segment is one greater than the snap
   * divisor, and a segment's midpoint is a keypoint only when the divisor is
   * even. The ion API does not currently accept a snap divisor, so the
   * server's default divisor applies.
   * </p>
   * @type {number}
   * @constant
   */
  NEAREST_KEYPOINT: 2,
  /**
   * Snaps to the center of elements that have centers (such as circles and
   * arcs). For other elements, may snap to the centroid.
   * @type {number}
   * @constant
   */
  CENTER: 8,
};
Object.freeze(IonSnap.SnapMode);

/**
 * How close a snap result is to the cursor, reported by {@link IonSnap#snap}
 * as {@link IonSnap.SnapResult} <code>heat</code>. Values match the iTwin.js
 * {@link https://www.itwinjs.org/reference/core-frontend/locatingelements/snapheat/|SnapHeat} enum.
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 *
 * @enum {number}
 */
IonSnap.SnapHeat = {
  /**
   * The snap is not close to the cursor.
   * @type {number}
   * @constant
   */
  NONE: 0,
  /**
   * The snap is of interest, but outside the snap aperture.
   * @type {number}
   * @constant
   */
  NOT_IN_RANGE: 1,
  /**
   * The snap point is within the snap aperture of the close point in view space.
   * @type {number}
   * @constant
   */
  IN_RANGE: 2,
};
Object.freeze(IonSnap.SnapHeat);

/**
 * The type of geometry a snap resolved to, reported by {@link IonSnap#snap}
 * as {@link IonSnap.SnapResult} <code>geomType</code>. Values match the iTwin.js
 * {@link https://www.itwinjs.org/reference/core-frontend/locatingelements/hitgeomtype/|HitGeomType} enum.
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 *
 * @enum {number}
 */
IonSnap.GeometryType = {
  /**
   * No geometry type.
   * @type {number}
   * @constant
   */
  NONE: 0,
  /**
   * A point.
   * @type {number}
   * @constant
   */
  POINT: 1,
  /**
   * A line segment.
   * @type {number}
   * @constant
   */
  SEGMENT: 2,
  /**
   * A curve.
   * @type {number}
   * @constant
   */
  CURVE: 3,
  /**
   * An arc.
   * @type {number}
   * @constant
   */
  ARC: 4,
  /**
   * A surface.
   * <p>
   * With {@link IonSnap.SnapMode} <code>NEAREST</code>, this value indicates
   * the snap tracked the surface under the cursor because no edge was within
   * the snap aperture. This means the snap point was not pulled to an edge.
   * Edge snaps report one of the other types along with the edge geometry in
   * {@link IonSnap.SnapResult} <code>curve</code>, which is absent when
   * tracking a surface.
   * </p>
   * @type {number}
   * @constant
   */
  SURFACE: 5,
};
Object.freeze(IonSnap.GeometryType);

/**
 * The type of the parent geometry a snap resolved to, reported by
 * {@link IonSnap#snap} as {@link IonSnap.SnapResult} <code>parentGeomType</code>.
 * Values match the iTwin.js
 * {@link https://www.itwinjs.org/reference/core-frontend/locatingelements/hitparentgeomtype/|HitParentGeomType} enum.
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 *
 * @enum {number}
 */
IonSnap.ParentGeometryType = {
  /**
   * No parent geometry type.
   * @type {number}
   * @constant
   */
  NONE: 0,
  /**
   * A wire body.
   * @type {number}
   * @constant
   */
  WIRE: 1,
  /**
   * A sheet body.
   * @type {number}
   * @constant
   */
  SHEET: 2,
  /**
   * A solid body.
   * @type {number}
   * @constant
   */
  SOLID: 3,
  /**
   * A mesh.
   * @type {number}
   * @constant
   */
  MESH: 4,
  /**
   * Text.
   * @type {number}
   * @constant
   */
  TEXT: 5,
};
Object.freeze(IonSnap.ParentGeometryType);

export default IonSnap;
