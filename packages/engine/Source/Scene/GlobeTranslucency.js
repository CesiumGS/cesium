import Check from "../Core/Check.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import NearFarScalar from "../Core/NearFarScalar.js";
import Rectangle from "../Core/Rectangle.js";

/**
 * Properties for controlling globe translucency.
 *
 * @alias GlobeTranslucency
 * @constructor
 */
function GlobeTranslucency() {
  this._enabled = false;
  this._frontFaceAlpha = 1.0;
  this._frontFaceAlphaByDistance = undefined;
  this._backFaceAlpha = 1.0;
  this._backFaceAlphaByDistance = undefined;
  this._rectangle = Rectangle.clone(Rectangle.MAX_VALUE);
}

Object.defineProperties(GlobeTranslucency.prototype, {
  /**
   * When true, the globe is rendered as a translucent surface.
   * <br /><br />
   * The alpha is computed by blending {@link Globe#material}, {@link Globe#imageryLayers},
   * and {@link Globe#baseColor}, all of which may contain translucency, and then multiplying by
   * {@link GlobeTranslucency#frontFaceAlpha} and {@link GlobeTranslucency#frontFaceAlphaByDistance} for front faces and
   * {@link GlobeTranslucency#backFaceAlpha} and {@link GlobeTranslucency#backFaceAlphaByDistance} for back faces.
   * When the camera is underground back faces and front faces are swapped, i.e. back-facing geometry
   * is considered front facing.
   * <br /><br />
   * Translucency is disabled by default.
   *
   * @memberof GlobeTranslucency.prototype
   *
   * @type {Boolean}
   * @default false
   *
   * @see GlobeTranslucency#frontFaceAlpha
   * @see GlobeTranslucency#frontFaceAlphaByDistance
   * @see GlobeTranslucency#backFaceAlpha
   * @see GlobeTranslucency#backFaceAlphaByDistance
   */
  enabled: {
    get: function () {
      return this._enabled;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      Check.typeOf.bool("enabled", value);
      //>>includeEnd('debug');
      this._enabled = value;
    },
  },

  /**
   * A constant translucency to apply to front faces of the globe.
   * <br /><br />
   * {@link GlobeTranslucency#enabled} must be set to true for this option to take effect.
   *
   * @memberof GlobeTranslucency.prototype
   *
   * @type {Number}
   * @default 1.0
   *
   * @see GlobeTranslucency#enabled
   * @see GlobeTranslucency#frontFaceAlphaByDistance
   *
   * @example
   * // Set front face translucency to 0.5.
   * globe.translucency.frontFaceAlpha = 0.5;
   * globe.translucency.enabled = true;
   */
  frontFaceAlpha: {
    get: function () {
      return this._frontFaceAlpha;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      Check.typeOf.number.greaterThanOrEquals("frontFaceAlpha", value, 0.0);
      Check.typeOf.number.lessThanOrEquals("frontFaceAlpha", value, 1.0);
      //>>includeEnd('debug');
      this._frontFaceAlpha = value;
    },
  },
  /**
   * Gets or sets near and far translucency properties of front faces of the globe based on the distance to the camera.
   * The translucency will interpolate between the {@link NearFarScalar#nearValue} and
   * {@link NearFarScalar#farValue} while the camera distance falls within the lower and upper bounds
   * of the specified {@link NearFarScalar#near} and {@link NearFarScalar#far}.
   * Outside of these ranges the translucency remains clamped to the nearest bound.  If undefined,
   * frontFaceAlphaByDistance will be disabled.
   * <br /><br />
   * {@link GlobeTranslucency#enabled} must be set to true for this option to take effect.
   *
   * @memberof GlobeTranslucency.prototype
   *
   * @type {NearFarScalar}
   * @default undefined
   *
   * @see GlobeTranslucency#enabled
   * @see GlobeTranslucency#frontFaceAlpha
   *
   * @example
   * // Example 1.
   * // Set front face translucency to 0.5 when the
   * // camera is 1500 meters from the surface and 1.0
   * // as the camera distance approaches 8.0e6 meters.
   * globe.translucency.frontFaceAlphaByDistance = new Cesium.NearFarScalar(1.5e2, 0.5, 8.0e6, 1.0);
   * globe.translucency.enabled = true;
   *
   * @example
   * // Example 2.
   * // Disable front face translucency by distance
   * globe.translucency.frontFaceAlphaByDistance = undefined;
   */
  frontFaceAlphaByDistance: {
    get: function () {
      return this._frontFaceAlphaByDistance;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      if (defined(value) && value.far < value.near) {
        throw new DeveloperError(
          "far distance must be greater than near distance."
        );
      }
      //>>includeEnd('debug');
      this._frontFaceAlphaByDistance = NearFarScalar.clone(
        value,
        this._frontFaceAlphaByDistance
      );
    },
  },

  /**
   * A constant translucency to apply to back faces of the globe.
   * <br /><br />
   * {@link GlobeTranslucency#enabled} must be set to true for this option to take effect.
   *
   * @memberof GlobeTranslucency.prototype
   *
   * @type {Number}
   * @default 1.0
   *
   * @see GlobeTranslucency#enabled
   * @see GlobeTranslucency#backFaceAlphaByDistance
   *
   * @example
   * // Set back face translucency to 0.5.
   * globe.translucency.backFaceAlpha = 0.5;
   * globe.translucency.enabled = true;
   */
  backFaceAlpha: {
    get: function () {
      return this._backFaceAlpha;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      Check.typeOf.number.greaterThanOrEquals("backFaceAlpha", value, 0.0);
      Check.typeOf.number.lessThanOrEquals("backFaceAlpha", value, 1.0);
      //>>includeEnd('debug');
      this._backFaceAlpha = value;
    },
  },
  /**
   * Gets or sets near and far translucency properties of back faces of the globe based on the distance to the camera.
   * The translucency will interpolate between the {@link NearFarScalar#nearValue} and
   * {@link NearFarScalar#farValue} while the camera distance falls within the lower and upper bounds
   * of the specified {@link NearFarScalar#near} and {@link NearFarScalar#far}.
   * Outside of these ranges the translucency remains clamped to the nearest bound.  If undefined,
   * backFaceAlphaByDistance will be disabled.
   * <br /><br />
   * {@link GlobeTranslucency#enabled} must be set to true for this option to take effect.
   *
   * @memberof GlobeTranslucency.prototype
   *
   * @type {NearFarScalar}
   * @default undefined
   *
   * @see GlobeTranslucency#enabled
   * @see GlobeTranslucency#backFaceAlpha
   *
   * @example
   * // Example 1.
   * // Set back face translucency to 0.5 when the
   * // camera is 1500 meters from the surface and 1.0
   * // as the camera distance approaches 8.0e6 meters.
   * globe.translucency.backFaceAlphaByDistance = new Cesium.NearFarScalar(1.5e2, 0.5, 8.0e6, 1.0);
   * globe.translucency.enabled = true;
   *
   * @example
   * // Example 2.
   * // Disable back face translucency by distance
   * globe.translucency.backFaceAlphaByDistance = undefined;
   */
  backFaceAlphaByDistance: {
    get: function () {
      return this._backFaceAlphaByDistance;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      if (defined(value) && value.far < value.near) {
        throw new DeveloperError(
          "far distance must be greater than near distance."
        );
      }
      //>>includeEnd('debug');
      this._backFaceAlphaByDistance = NearFarScalar.clone(
        value,
        this._backFaceAlphaByDistance
      );
    },
  },

  /**
   * A property specifying a {@link Rectangle} used to limit translucency to a cartographic area.
   * Defaults to the maximum extent of cartographic coordinates.
   *
   * @memberof GlobeTranslucency.prototype
   *
   * @type {Rectangle}
   * @default {@link Rectangle.MAX_VALUE}
   */
  rectangle: {
    get: function () {
      return this._rectangle;
    },
    set: function (value) {
      if (!defined(value)) {
        value = Rectangle.clone(Rectangle.MAX_VALUE);
      }
      Rectangle.clone(value, this._rectangle);
    },
  },
});

export default GlobeTranslucency;
