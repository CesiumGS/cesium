import Cesium3DTileset from "./Cesium3DTileset.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import IonResource from "../Core/IonResource.js";
import GoogleMaps from "../Core/GoogleMaps.js";
import Resource from "../Core/Resource.js";

/**
 * Creates a {@link Cesium3DTileset} instance for the Google Photorealistic 3D Tiles tileset.
 *
 * @function
 *
 * @param {string} [key=GoogleMaps.defaultApiKey] Your API key to access Google Photorealistic 3D Tiles. See {@link https://developers.google.com/maps/documentation/javascript/get-api-key} for instructions on how to create your own key.
 * @param {Cesium3DTileset.ConstructorOptions} [options] An object describing initialization options.
 * @returns {Promise<Cesium3DTileset>}
 *
 * @see GoogleMaps
 *
 * @example
 * const viewer = new Cesium.Viewer("cesiumContainer");
 *
 * try {
 *   const tileset = await Cesium.createGooglePhotorealistic3DTileset();
 *   viewer.scene.primitives.add(tileset));
 * } catch (error) {
 *   console.log(`Error creating tileset: ${error}`);
 * }
 *
 * @example
 * // Use your own Google Maps API key
 * Cesium.GoogleMaps.defaultApiKey = "your-api-key";
 *
 * const viewer = new Cesium.Viewer("cesiumContainer");
 *
 * try {
 *   const tileset = await Cesium.createGooglePhotorealistic3DTileset();
 *   viewer.scene.primitives.add(tileset));
 * } catch (error) {
 *   console.log(`Error creating tileset: ${error}`);
 * }
 */
async function createGooglePhotorealistic3DTileset(key, options) {
  options = defaultValue(options, {});
  options.cacheBytes = defaultValue(options.cacheBytes, 1536 * 1024 * 1024);
  options.maximumCacheOverflowBytes = defaultValue(
    options.maximumCacheOverflowBytes,
    1024 * 1024 * 1024
  );

  key = defaultValue(key, GoogleMaps.defaultApiKey);
  if (!defined(key)) {
    return requestCachedIonTileset(options);
  }

  let credits;
  const credit = GoogleMaps.getDefaultCredit();
  if (defined(credit)) {
    credits = [credit];
  }

  const resource = new Resource({
    url: `${GoogleMaps.mapTilesApiEndpoint}3dtiles/root.json`,
    queryParameters: {
      key: key,
    },
    credits: credits,
  });

  return Cesium3DTileset.fromUrl(resource, options);
}

const metadataCache = {};
async function requestCachedIonTileset(options) {
  const ionAssetId = 2275207;
  const cacheKey = ionAssetId;

  let promise = metadataCache[cacheKey];
  if (!defined(promise)) {
    promise = IonResource.fromAssetId(ionAssetId);
    metadataCache[cacheKey] = promise;
  }

  const resource = await promise;
  return Cesium3DTileset.fromUrl(resource, options);
}

export default createGooglePhotorealistic3DTileset;
