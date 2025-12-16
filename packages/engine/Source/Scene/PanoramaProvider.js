import DeveloperError from "../Core/DeveloperError.js";

/**
 *
 * See the documentation for each PanoramaProvider Provider class for more information about how they return PanoramaProvider.
 */

/**
 * Provides imagery to be displayed on the surface of an ellipsoid.  This type describes an
 * interface and is not intended to be instantiated directly.
 *
 * @alias PanoramaProvider
 * @constructor
 * @abstract
 *
 * @see EquirectangularPanorama
 * @see SkyBoxPanorama
 *
 * @demo {@link https://sandcastle.cesium.com/index.html?src=Imagery%20Layers.html|Cesium Sandcastle Imagery Layers Demo}
 * @demo {@link https://sandcastle.cesium.com/index.html?src=Imagery%20Layers%20Manipulation.html|Cesium Sandcastle Imagery Manipulation Demo}
 */
function PanoramaProvider() {
  DeveloperError.throwInstantiationError();
}

Object.defineProperties(PanoramaProvider.prototype, {});

export default PanoramaProvider;
