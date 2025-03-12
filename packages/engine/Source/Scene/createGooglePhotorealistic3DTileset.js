import Cesium3DTileset from "./Cesium3DTileset.js";
import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import IonResource from "../Core/IonResource.js";
import GoogleMaps from "../Core/GoogleMaps.js";
import Resource from "../Core/Resource.js";
import oneTimeWarning from "../Core/oneTimeWarning.js";

/**
 * Creates a {@link Cesium3DTileset} instance for the Google Photorealistic 3D
 * Tiles tileset.
 *
 * Google Photorealistic 3D Tiles can only be used with the Google geocoder.  To
 * confirm that you are aware of this restriction pass
 * `usingOnlyWithGoogleGeocoder: true` to the apiOptions.  Otherwise a one time
 * warning will be displayed when this function is called.
 *
 * @function
 *
 * @param {object} [apiOptions]
 * @param {string} [apiOptions.key=GoogleMaps.defaultApiKey] Your API key to access Google Photorealistic 3D Tiles. See {@link https://developers.google.com/maps/documentation/javascript/get-api-key} for instructions on how to create your own key.
 * @param {true} [apiOptions.onlyUsingWithGoogleGeocoder] Confirmation that this tileset will only be used with the Google geocoder.
 * @param {Cesium3DTileset.ConstructorOptions} [tilesetOptions] An object describing initialization options.
 * @returns {Promise<Cesium3DTileset>}
 *
 * @see GoogleMaps
 *
 * @example
 * const viewer = new Cesium.Viewer("cesiumContainer", {
 *   geocoder: Cesium.IonGeocodeProviderType.GOOGLE
 * });
 *
 * try {
 *   const tileset = await Cesium.createGooglePhotorealistic3DTileset({
 *      onlyUsingWithGoogleGeocoder: true,
 *   });
 *   viewer.scene.primitives.add(tileset));
 * } catch (error) {
 *   console.log(`Error creating tileset: ${error}`);
 * }
 *
 * @example
 * // Use your own Google Maps API key
 * Cesium.GoogleMaps.defaultApiKey = "your-api-key";
 *
 * const viewer = new Cesium.Viewer("cesiumContainer". {
 *   geocoder: Cesium.IonGeocodeProviderType.GOOGLE
 * });
 *
 * try {
 *   const tileset = await Cesium.createGooglePhotorealistic3DTileset({
 *      onlyUsingWithGoogleGeocoder: true,
 *   });
 *   viewer.scene.primitives.add(tileset));
 * } catch (error) {
 *   console.log(`Error creating tileset: ${error}`);
 * }
 */
async function createGooglePhotorealistic3DTileset(apiOptions, tilesetOptions) {
  tilesetOptions = defaultValue(tilesetOptions, {});
  tilesetOptions.cacheBytes = defaultValue(
    tilesetOptions.cacheBytes,
    1536 * 1024 * 1024,
  );
  tilesetOptions.maximumCacheOverflowBytes = defaultValue(
    tilesetOptions.maximumCacheOverflowBytes,
    1024 * 1024 * 1024,
  );
  tilesetOptions.enableCollision = defaultValue(
    tilesetOptions.enableCollision,
    true,
  );

  apiOptions = defaultValue(apiOptions, defaultValue.EMPTY_OBJECT);
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("apiOptions", apiOptions);
  //>>includeEnd('debug');

  if (!apiOptions.onlyUsingWithGoogleGeocoder) {
    oneTimeWarning(
      "google-tiles-with-google-geocoder",
      "Only the Google geocoder can be used with Google Photorealistic 3D Tiles.  Set the `geocode` property of Viewer constructor options.  You can set additionalOptions.onlyUsingWithGoogleGeocoder to hide this warning once you have configured the geocoder.",
    );
  }

  const key = defaultValue(apiOptions.key, GoogleMaps.defaultApiKey);
  if (!defined(key)) {
    return requestCachedIonTileset(tilesetOptions);
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

  return Cesium3DTileset.fromUrl(resource, tilesetOptions);
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
