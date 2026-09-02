import DeveloperError from "./DeveloperError.js";

/**
 * The result of a successful {@link SnapService#snap}.
 *
 * Implementations may return additional properties beyond those listed here.
 *
 * @typedef {object} SnapService.Result
 * @property {Cartesian3} [snapPoint] The snapped point. This is the point to consume.
 * @property {Cartesian3} [hitPoint] The point where the cursor hit the geometry: the nearest edge point when within the snap aperture, otherwise the surface point under the cursor.
 */

/**
 * Provides snap-to-geometry through an external service, which snaps against
 * source geometry hosted remotely rather than geometry loaded in the scene.
 * This type describes an interface and is not intended to be used.
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 *
 * @see IonSnapService
 */
class SnapService {
  constructor() {
    DeveloperError.throwInstantiationError();
  }

  /**
   * Requests a snap against geometry known to the service.
   *
   * The camera and canvas dimensions describe the current view so the
   * implementation can perform view-dependent snapping (nearest ordering,
   * pixel apertures, surface tracking) correctly.
   *
   * Implementations may accept additional options beyond those listed here.
   *
   * @param {object} options Object with the following properties:
   * @param {string} options.elementId An implementation-defined identifier of the geometry to snap to.
   * @param {Cartesian3} options.testPoint The point to snap from, typically the picked cursor position.
   * @param {Camera} options.camera The camera defining the current view.
   * @param {number} options.canvasWidth The canvas width in CSS pixels.
   * @param {number} options.canvasHeight The canvas height in CSS pixels.
   * @param {Cartesian3} [options.closePoint=options.testPoint] A reference point near the target geometry that seeds the snap search.
   * @param {number} [options.snapAperture=SnapService.DEFAULT_SNAP_APERTURE] The snap tolerance in CSS pixels.
   * @returns {Promise<SnapService.Result|undefined>} The snap result, or <code>undefined</code> if no snap was possible.
   */
  async snap(options) {
    DeveloperError.throwInstantiationError();
  }
}

/**
 * The default snap tolerance used by {@link SnapService#snap} when
 * <code>options.snapAperture</code> is not provided, in CSS pixels.
 * The value is implementation-defined.
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 *
 * @type {number}
 * @constant
 */
SnapService.DEFAULT_SNAP_APERTURE = undefined;

export default SnapService;
