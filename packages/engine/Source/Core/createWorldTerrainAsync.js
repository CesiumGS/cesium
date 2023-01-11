import CesiumTerrainProvider from "./CesiumTerrainProvider.js";
import defaultValue from "./defaultValue.js";
import IonResource from "./IonResource.js";

/**
 * Creates a {@link CesiumTerrainProvider} instance for the {@link https://cesium.com/content/#cesium-world-terrain|Cesium World Terrain}.
 *
 * @function
 *
 * @param {Object} [options] Object with the following properties:
 * @param {Boolean} [options.requestVertexNormals=false] Flag that indicates if the client should request additional lighting information from the server if available.
 * @param {Boolean} [options.requestWaterMask=false] Flag that indicates if the client should request per tile water masks from the server if available.
 * @returns {Promise<CesiumTerrainProvider>} A promise that resolves to the created CesiumTerrainProvider
 *
 * @see Ion
 *
 * @example
 * // Create Cesium World Terrain with default settings
 * const viewer = new Cesium.Viewer('cesiumContainer', {
 *     terrainProvider : Cesium.createWorldTerrainAsync();
 * });
 *
 * @example
 * // Create Cesium World Terrain with water and normals.
 * const viewer1 = new Cesium.Viewer('cesiumContainer', {
 *     terrainProvider : Cesium.createWorldTerrainAsync({
 *         requestWaterMask : true,
 *         requestVertexNormals : true
 *     });
 * });
 *
 */
function createWorldTerrainAsync(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  return CesiumTerrainProvider.fromUrl(IonResource.fromAssetId(1), {
    requestVertexNormals: defaultValue(options.requestVertexNormals, false),
    requestWaterMask: defaultValue(options.requestWaterMask, false),
  });
}
export default createWorldTerrainAsync;
