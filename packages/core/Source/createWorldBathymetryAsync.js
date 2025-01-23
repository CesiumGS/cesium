import CesiumTerrainProvider from "./CesiumTerrainProvider.js";
import defaultValue from "./defaultValue.js";

/**
 * Creates a {@link CesiumTerrainProvider} instance for the {@link https://cesium.com/content/#cesium-world-bathymetry|Cesium World Bathymetry}.
 *
 * @function
 *
 * @param {Object} [options] Object with the following properties:
 * @param {Boolean} [options.requestVertexNormals=false] Flag that indicates if the client should request additional lighting information from the server if available.
 * @returns {Promise<CesiumTerrainProvider>} A promise that resolves to the created CesiumTerrainProvider
 *
 * @see Ion
 *
 * @example
 * // Create Cesium World Bathymetry with default settings
 * try {
 *   const viewer = new Cesium.Viewer("cesiumContainer", {
 *     terrainProvider: await Cesium.createWorldBathymetryAsync();
 *   });
 * } catch (error) {
 *   console.log(error);
 * }
 *
 * @example
 * // Create Cesium World Bathymetry with normals.
 * try {
 *   const viewer1 = new Cesium.Viewer("cesiumContainer", {
 *     terrainProvider: await Cesium.createWorldBathymetryAsync({
 *       requestVertexNormals: true
 *     });
 *   });
 * } catch (error) {
 *   console.log(error);
 * }
 *
 */
function createWorldBathymetryAsync(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  return CesiumTerrainProvider.fromIonAssetId(2426648, {
    requestVertexNormals: defaultValue(options.requestVertexNormals, false),
  });
}
export default createWorldBathymetryAsync;
