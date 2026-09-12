import Cartesian3 from "./Cartesian3.js";
import Cartesian4 from "./Cartesian4.js";
import Cartographic from "./Cartographic.js";
import Check from "./Check.js";
import Frozen from "./Frozen.js";
import CesiumMath from "./Math.js";
import defined from "./defined.js";
import Ion from "./Ion.js";
import IonResource from "./IonResource.js";
import IonSnapMode from "./IonSnapMode.js";
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
 * The result of a successful {@link IonSnapService#snap}. Extends
 * {@link SnapService.Result} with ion-specific fields.
 *
 * @typedef {object} IonSnapService.Result
 * @property {Cartesian3} [snapPoint] The snapped point. This is the point to consume.
 * @property {Cartesian3} [hitPoint] The point where the cursor hit the geometry: the nearest edge point when within the snap aperture, otherwise the surface point under the cursor.
 * @property {IonSnapHeat} [heat] How close the snap point is to the close point in view space.
 * @property {IonSnapGeometryType} [geometryType] The type of geometry snapped to.
 * @property {IonSnapParentGeometryType} [parentGeometryType] The type of the parent geometry snapped to.
 * @property {object} [normal] The surface normal at the snap point, in the model's local cartesian frame.
 * @property {object} [curve] The curve geometry near the snap point, with points as WGS84 degrees objects.
 */

/**
 * Provides interactive snap-to-geometry against a Cesium ion 3D Tiles asset
 * backed by a BIM/CAD Database model, using the ion REST API's element snap
 * endpoint.
 *
 * This class handles conversions between the reference frame of a
 * source BIM/CAD Database and the view-dependent screen space pixel
 * coordinates. Each snap, it transforms using the ion asset's source
 * reference frame, the camera's transform, and the canvas
 * dimensions so that view-dependent features— such as the pixel aperture,
 * nearest position, or surface tracking— behave correctly.
 *
 * This object is normally not instantiated directly, use {@link IonSnapService.fromAssetId}.
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 *
 * @see Ion
 * @see SnapService
 *
 * @example
 * const snapper = await Cesium.IonSnapService.fromAssetId(123456);
 * const canvas = viewer.scene.canvas;
 * const result = await snapper.snap({
 *   elementId: "0x30000000df2",
 *   testPoint: pickedPosition,
 *   camera: viewer.camera,
 *   canvasWidth: canvas.clientWidth,
 *   canvasHeight: canvas.clientHeight,
 * });
 * if (Cesium.defined(result)) {
 *   console.log("snapped to", result.snapPoint);
 * }
 */
class IonSnapService {
  /**
   * @param {object} options Object with the following properties:
   * @param {number} options.assetId The ion asset id.
   * @param {Resource} options.resource The asset's ion API resource.
   * @param {Matrix4} options.ecefTransform A 4x4 transformation matrix from the source BIM/CAD Database reference frame local to the world's fixed reference frame.
   */
  constructor(options) {
    this._assetId = options.assetId;
    this._resource = options.resource;

    /**
     * A 4x4 transformation matrix from the source BIM/CAD Database reference frame local to the world's fixed reference frame.
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
   * Creates an {@link IonSnapService} for the given ion asset, fetching
   * the asset's ECEF transform from the ion REST API.
   *
   * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
   *
   * @param {number} assetId The ion ID of a 3D Tiles asset backed by a BIM/CAD Database model.
   * @param {object} [options] Object with the following properties:
   * @param {string} [options.accessToken=Ion.defaultAccessToken] The ion access token to use.
   * @param {string|Resource} [options.server=Ion.defaultServer] The ion API server to use.
   * @returns {Promise<IonSnapService>} A snapper bound to the asset.
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
      headers: IonResource._addClientHeaders(),
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
        `Cesium ion asset ${assetId} is not geolocated; snapping requires geolocation`,
      );
    }

    const ecefTransform = Matrix4.fromRowMajorArray(
      ecefResponse.ecefTransform.flat(),
    );

    return new IonSnapService({
      assetId: assetId,
      resource: resource,
      ecefTransform: ecefTransform,
    });
  }

  /**
   * Computes the world-to-view matrix the native snapper needs: a projective
   * transform from model-world coordinates to view (CSS pixel) coordinates,
   * composed as <code>V * P * Vm * E</code> where
   * <ul>
   *   <li><code>E</code>: model -> ECEF (this asset's {@link IonSnapService#ecefTransform})</li>
   *   <li><code>Vm</code>: ECEF -> eye (<code>camera.viewMatrix</code>)</li>
   *   <li><code>P</code>: eye -> clip (<code>camera.frustum.projectionMatrix</code>)</li>
   *   <li><code>V</code>: clip -> pixels (y-down viewport matrix)</li>
   * </ul>
   * The viewport term uses CSS pixel dimensions so pixel-valued snap apertures
   * mean CSS pixels regardless of the display's device pixel ratio.
   *
   * @param {Camera} camera The camera defining the view.
   * @param {number} canvasWidth The canvas width in CSS pixels.
   * @param {number} canvasHeight The canvas height in CSS pixels.
   * @param {Matrix4} [result] The object onto which to store the result.
   * @returns {Matrix4} The model-world to view (pixels) matrix.
   *
   * @private
   */
  _computeWorldToView(camera, canvasWidth, canvasHeight, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.defined("camera", camera);
    Check.typeOf.number("canvasWidth", canvasWidth);
    Check.typeOf.number("canvasHeight", canvasHeight);
    //>>includeEnd('debug');

    result = result ?? new Matrix4();

    const V = viewportMatrix(canvasWidth, canvasHeight, scratchViewport);

    // result = V * P * Vm * E, built up right-to-left
    Matrix4.multiply(camera.viewMatrix, this.ecefTransform, result);
    Matrix4.multiply(camera.frustum.projectionMatrix, result, result);
    return Matrix4.multiply(V, result, result);
  }

  /**
   * Requests a snap against an element of this asset.
   *
   * A view-correct world-to-view matrix is composed from
   * <code>options.camera</code>, <code>options.canvasWidth</code>, and
   * <code>options.canvasHeight</code> so view-dependent snapping (nearest
   * ordering, pixel apertures, surface tracking) matches the current view.
   *
   * Only 3D views are supported: the camera must be viewing in
   * {@link SceneMode.SCENE3D}.
   *
   * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
   *
   * @param {object} options Object with the following properties:
   * @param {string} options.elementId The element id to snap to, as a hex string, e.g. <code>"0x30000000df2"</code>.
   * @param {Cartesian3} options.testPoint The point to snap from, typically the picked cursor position.
   * @param {Camera} options.camera The camera defining the current view. Must be viewing in {@link SceneMode.SCENE3D}.
   * @param {number} options.canvasWidth The canvas width in CSS pixels.
   * @param {number} options.canvasHeight The canvas height in CSS pixels.
   * @param {Cartesian3} [options.closePoint=options.testPoint] A reference point near the target geometry that seeds the snap search.
   * @param {number} [options.snapAperture=IonSnapService.DEFAULT_SNAP_APERTURE] The snap tolerance in CSS pixels of the world-to-view output space.
   * @param {IonSnapMode} [options.snapMode=IonSnapMode.NEAREST] The type of snap to perform.
   * @returns {Promise<IonSnapService.Result|undefined>} The snap result, or <code>undefined</code> if the element was not found or no snap was possible for it.
   */
  async snap(options) {
    //>>includeStart('debug', pragmas.debug);
    Check.defined("options", options);
    Check.typeOf.string("options.elementId", options.elementId);
    Check.defined("options.testPoint", options.testPoint);
    Check.defined("options.camera", options.camera);
    Check.typeOf.number("options.canvasWidth", options.canvasWidth);
    Check.typeOf.number("options.canvasHeight", options.canvasHeight);
    //>>includeEnd('debug');

    const worldToView = this._computeWorldToView(
      options.camera,
      options.canvasWidth,
      options.canvasHeight,
      scratchWorldToView,
    );

    const body = {
      testPoint: apiPointFromCartesian(options.testPoint),
      closePoint: apiPointFromCartesian(
        options.closePoint ?? options.testPoint,
      ),
      snapAperture:
        options.snapAperture ?? IonSnapService.DEFAULT_SNAP_APERTURE,
      snapMode: options.snapMode ?? IonSnapMode.NEAREST,
      worldToView: rowsFromMatrix4(worldToView),
    };

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
      heat: response.heat,
      geometryType: response.geomType,
      parentGeometryType: response.parentGeomType,
      normal: response.normal,
      curve: response.curve,
    };
    result.snapPoint = cartesianFromApiPoint(response.snapPoint);
    result.hitPoint = cartesianFromApiPoint(response.hitPoint);
    return result;
  }
}

/**
 * The default snap tolerance used by {@link IonSnapService#snap} when
 * <code>options.snapAperture</code> is not provided, in CSS pixels of the
 * world-to-view output space. This is {@link SnapService}'s
 * <code>DEFAULT_SNAP_APERTURE</code> for this implementation.
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 *
 * @type {number}
 * @constant
 */
IonSnapService.DEFAULT_SNAP_APERTURE = 12;

export default IonSnapService;
