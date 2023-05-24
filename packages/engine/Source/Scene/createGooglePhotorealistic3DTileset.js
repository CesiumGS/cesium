import Cesium3DTileset from "./Cesium3DTileset.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
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
  key = defaultValue(key, GoogleMaps.defaultApiKey);

  let credits;
  const credit = GoogleMaps.getDefaultApiKeyCredit(key);
  if (defined(credit)) {
    credits = [credit];
  }

  options = defaultValue(options, {});
  options.showCreditsOnScreen = true;

  const resource = new Resource({
    url: `${GoogleMaps.mapTilesApiEndpoint}3dtiles/root.json`,
    queryParameters: {
      key: key,
    },
    credits: credits,
  });

  return Cesium3DTileset.fromUrl(resource, options);
}

export default createGooglePhotorealistic3DTileset;
