import DeveloperError from "../Core/DeveloperError.js";

/**
 * Displays panorama imagery in a scene. This type describes an interface and is not intended to be instantiated directly.
 *
 * @alias Panorama
 * @constructor
 * @abstract
 *
 * @see EquirectangularPanorama
 * @see CubeMapPanorama
 *
 * @demo {@link https://sandcastle.cesium.com/Apps/Sandcastle2/index.html?id=google-streetview-panorama-2|Cesium Sandcastle Google Streetview Panorama}
 */
function Panorama() {
  DeveloperError.throwInstantiationError();
}

Object.defineProperties(Panorama.prototype, {
  /**
   * Determines if the panorama will be shown.
   * @memberof Panorama.prototype
   * @type {boolean}
   * @readonly
   */
  show: {
    get: DeveloperError.throwInstantiationError,
  },

  /**
   * The alpha blending value of this layer, with 0.0 representing fully transparent and
   * 1.0 representing fully opaque.
   * @memberof Panorama.prototype
   * @type {number}
   * @readonly
   */
  alpha: {
    get: DeveloperError.throwInstantiationError,
  },

  /**
   * Gets the transform of the panorama.
   * @memberof Panorama.prototype
   * @type {Matrix4}
   * @readonly
   */
  transform: {
    get: DeveloperError.throwInstantiationError,
  },

  /**
   * Gets the credits of the panorama.
   * @memberof Panorama.prototype
   * @type {Credit}
   * @readonly
   */
  credit: {
    get: DeveloperError.throwInstantiationError,
  },

  /**
   * Gets the source imagery of the panorama.
   * @memberof Panorama.prototype
   * @type {object|string}
   * @readonly
   */
  source: {
    get: DeveloperError.throwInstantiationError,
  },
});

export default Panorama;
