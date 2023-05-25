import CesiumTerrainProvider from "./CesiumTerrainProvider.js";
import defaultValue from "./defaultValue.js";
import deprecationWarning from "./deprecationWarning.js";
import IonResource from "./IonResource.js";

/**
 * Creates a {@link CesiumTerrainProvider} instance for the {@link https://cesium.com/content/#cesium-world-terrain|Cesium World Terrain}.
 *
 * @function
 * @deprecated
 *
 * @param {object} [options] Object with the following properties:
 * @param {boolean} [options.requestVertexNormals=false] Flag that indicates if the client should request additional lighting information from the server if available.
 * @param {boolean} [options.requestWaterMask=false] Flag that indicates if the client should request per tile water masks from the server if available.
 * @returns {CesiumTerrainProvider}
 *
 * @see Ion
 *
 * @example
 * // Create Cesium World Terrain with default settings
 * const viewer = new Cesium.Viewer('cesiumContainer', {
 *     terrainProvider : Cesium.createWorldTerrain();
 * });
 *
 * @example
 * // Create Cesium World Terrain with water and normals.
 * const viewer1 = new Cesium.Viewer('cesiumContainer', {
 *     terrainProvider : Cesium.createWorldTerrain({
 *         requestWaterMask : true,
 *         requestVertexNormals : true
 *     });
 * });
 *
 */
function createWorldTerrain(options) {
  deprecationWarning(
    "createWorldTerrain",
    "createWorldTerrain was deprecated in CesiumJS 1.104.  It will be removed in CesiumJS 1.107.  Use createWorldTerrainAsync instead."
  );

  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  const provider = new CesiumTerrainProvider({
    requestVertexNormals: defaultValue(options.requestVertexNormals, false),
    requestWaterMask: defaultValue(options.requestWaterMask, false),
  });

  // This is here in order to avoid throwing a second deprecation error
  // by using the deprecated url parameter in the constructor above
  provider._readyPromise = CesiumTerrainProvider._initializeReadyPromise(
    {
      url: IonResource.fromAssetId(1),
      requestVertexNormals: defaultValue(options.requestVertexNormals, false),
      requestWaterMask: defaultValue(options.requestWaterMask, false),
    },
    provider
  );

  return provider;
}
export default createWorldTerrain;
