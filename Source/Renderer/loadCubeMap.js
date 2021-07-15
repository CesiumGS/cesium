import Check from "../Core/Check.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import Resource from "../Core/Resource.js";
import when from "../ThirdPartyNpm/when.js";
import CubeMap from "./CubeMap.js";

/**
 * Asynchronously loads six images and creates a cube map.  Returns a promise that
 * will resolve to a {@link CubeMap} once loaded, or reject if any image fails to load.
 *
 * @function loadCubeMap
 *
 * @param {Context} context The context to use to create the cube map.
 * @param {Object} urls The source URL of each image.  See the example below.
 * @param {Boolean} [skipColorSpaceConversion=false] If true, any custom gamma or color profiles in the images will be ignored.
 * @returns {Promise.<CubeMap>} a promise that will resolve to the requested {@link CubeMap} when loaded.
 *
 * @exception {DeveloperError} context is required.
 * @exception {DeveloperError} urls is required and must have positiveX, negativeX, positiveY, negativeY, positiveZ, and negativeZ properties.
 *
 *
 * @example
 * Cesium.loadCubeMap(context, {
 *     positiveX : 'skybox_px.png',
 *     negativeX : 'skybox_nx.png',
 *     positiveY : 'skybox_py.png',
 *     negativeY : 'skybox_ny.png',
 *     positiveZ : 'skybox_pz.png',
 *     negativeZ : 'skybox_nz.png'
 * }).then(function(cubeMap) {
 *     // use the cubemap
 * }).otherwise(function(error) {
 *     // an error occurred
 * });
 *
 * @see {@link http://www.w3.org/TR/cors/|Cross-Origin Resource Sharing}
 * @see {@link http://wiki.commonjs.org/wiki/Promises/A|CommonJS Promises/A}
 *
 * @private
 */
function loadCubeMap(context, urls, skipColorSpaceConversion) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("context", context);
  if (
    !defined(urls) ||
    !defined(urls.positiveX) ||
    !defined(urls.negativeX) ||
    !defined(urls.positiveY) ||
    !defined(urls.negativeY) ||
    !defined(urls.positiveZ) ||
    !defined(urls.negativeZ)
  ) {
    throw new DeveloperError(
      "urls is required and must have positiveX, negativeX, positiveY, negativeY, positiveZ, and negativeZ properties."
    );
  }
  //>>includeEnd('debug');

  // PERFORMANCE_IDEA: Given the size of some cube maps, we should consider tiling them, which
  // would prevent hiccups when uploading, for example, six 4096x4096 textures to the GPU.
  //
  // Also, it is perhaps acceptable to use the context here in the callbacks, but
  // ideally, we would do it in the primitive's update function.
  var flipOptions = {
    flipY: true,
    skipColorSpaceConversion: skipColorSpaceConversion,
    preferImageBitmap: true,
  };

  var facePromises = [
    Resource.createIfNeeded(urls.positiveX).fetchImage(flipOptions),
    Resource.createIfNeeded(urls.negativeX).fetchImage(flipOptions),
    Resource.createIfNeeded(urls.positiveY).fetchImage(flipOptions),
    Resource.createIfNeeded(urls.negativeY).fetchImage(flipOptions),
    Resource.createIfNeeded(urls.positiveZ).fetchImage(flipOptions),
    Resource.createIfNeeded(urls.negativeZ).fetchImage(flipOptions),
  ];

  return when.all(facePromises, function (images) {
    return new CubeMap({
      context: context,
      source: {
        positiveX: images[0],
        negativeX: images[1],
        positiveY: images[2],
        negativeY: images[3],
        positiveZ: images[4],
        negativeZ: images[5],
      },
    });
  });
}
export default loadCubeMap;
