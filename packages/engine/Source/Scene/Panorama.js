import DeveloperError from "../Core/DeveloperError.js";

/**
 *
 * See the documentation for each Panorama class for more information about how they return images.
 */

/**
 * Provides imagery to be displayed on the surface of an ellipsoid.  This type describes an
 * interface and is not intended to be instantiated directly.
 *
 * @alias Panorama
 * @constructor
 * @abstract
 *
 * @see EquirectangularPanorama
 * @see SkyBoxPanorama
 *
 * @demo {@link https://sandcastle.cesium.com/index.html?src=Imagery%20Layers.html|Cesium Sandcastle Imagery Layers Demo}
 * @demo {@link https://sandcastle.cesium.com/index.html?src=Imagery%20Layers%20Manipulation.html|Cesium Sandcastle Imagery Manipulation Demo}
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
   * Gets the height of each tile, in pixels.
   * @memberof Panorama.prototype
   * @type {boolean}
   * @readonly
   */
  debugShowExtents: {
    get: DeveloperError.throwInstantiationError,
  },
});

// /**
//  * Gets the sources for the panorama
//  *
//  * @returns {Image[]} The source images for the panorama.
//  */
// Panorama.prototype.getSources = function () {
//   DeveloperError.throwInstantiationError();
// };

/**
 * Gets the transform for the panorama
 *
 * @returns {Matrix4} The transform for the panorama.
 */
Panorama.prototype.getTransform = function () {
  DeveloperError.throwInstantiationError();
};

/**
 * Gets the credits for the panorama
 *
 * @returns {Credit[]} The credits for the panorama.
 */
Panorama.prototype.getCredits = function () {
  DeveloperError.throwInstantiationError();
};

export default Panorama;
