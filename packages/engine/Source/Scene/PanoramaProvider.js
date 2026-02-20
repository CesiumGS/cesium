import DeveloperError from "../Core/DeveloperError.js";

/**
 * Provides imagery to be displayed on the surface of an ellipsoid.  This type describes an
 * interface and is not intended to be instantiated directly.
 *
 * @alias PanoramaProvider
 * @constructor
 * @abstract
 *
 * @see GoogleStreetViewCubeMapPanoramaProvider
 * @see EquirectangularPanorama
 * @see CubeMapPanorama
 *
 * @demo {@link https://sandcastle.cesium.com/index.html?id=panorama|Cesium Sandcastle Panorama}
 */
function PanoramaProvider() {
  DeveloperError.throwInstantiationError();
}

Object.defineProperties(PanoramaProvider.prototype, {});

/**
 * Returns a panorama provider.
 *
 * @param {object} options Input options to create the panorama provider.
 * @returns {PanoramaProvider} The panorama provider for loading panoramas into a scene.
 */
PanoramaProvider.fromUrl = function (options) {
  DeveloperError.throwInstantiationError();
};

/**
 * Returns a panorama primitive.
 *
 * @param {object} options Input options to create the panorama primitive.
 * @returns {Panorama} The panorama primitive for displaying panoramas in a scene.
 */
PanoramaProvider.loadPanorama = function (options) {
  DeveloperError.throwInstantiationError();
};

export default PanoramaProvider;
