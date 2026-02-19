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
 * 
 * @demo {@link https://sandcastle.cesium.com/index.html?id=panorama|Cesium Sandcastle Panorama}
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
});

export default Panorama;
