import Credit from "../Core/Credit.js";
import defined from "../Core/defined.js";
import Resource from "../Core/Resource.js";

let defaultTokenCredit;
const defaultAccessToken =
  "AAPTxy8BH1VEsoebNVZXo8HurEOF051kAEKlhkOhBEc9BmQHrJmkly5GMmeyeds7qlqGckHbEMszNoB_aHL967jpcpMFlqzgl75smE9bSxUFgvbMH9RZ-1bNm94gP0mBkZCj49YnVLAsh3PgcdtfgQwNxkZdUV2dz75e_dsw_O0bYHnpqlqyefjc7B5QgSv6ClYuonoi55ZvXmrydipr6sBClFcIjCyO89XNoxG1N4yuLS0.AT1_EEoMffUB";
/**
 * Default options for accessing the ArcGIS image tile service.
 *
 * An ArcGIS access token is required to access ArcGIS image tile layers.
 * A default token is provided for evaluation purposes only.
 * To obtain an access token, go to {@link https://developers.arcgis.com} and create a free account.
 * More info can be found in the {@link https://developers.arcgis.com/documentation/mapping-apis-and-services/security/ | ArcGIS developer guide}.
 *
 * @see ArcGisMapServerImageryProvider
 * @namespace ArcGisMapService
 */

const ArcGisMapService = {};
/**
 * Gets or sets the default ArcGIS access token.
 *
 * @type {string}
 */
ArcGisMapService.defaultAccessToken = defaultAccessToken;

/**
 * Gets or sets the URL of the ArcGIS World Imagery tile service.
 *
 * @type {string|Resource}
 * @default https://ibasemaps-api.arcgis.com/arcgis/rest/services/World_Imagery/MapServer
 */
ArcGisMapService.defaultWorldImageryServer = new Resource({
  url: "https://ibasemaps-api.arcgis.com/arcgis/rest/services/World_Imagery/MapServer",
});

/**
 * Gets or sets the URL of the ArcGIS World Hillshade tile service.
 *
 * @type {string|Resource}
 * @default https://ibasemaps-api.arcgis.com/arcgis/rest/services/Elevation/World_Hillshade/MapServer
 */
ArcGisMapService.defaultWorldHillshadeServer = new Resource({
  url: "https://ibasemaps-api.arcgis.com/arcgis/rest/services/Elevation/World_Hillshade/MapServer",
});

/**
 * Gets or sets the URL of the ArcGIS World Oceans tile service.
 *
 * @type {string|Resource}
 * @default https://ibasemaps-api.arcgis.com/arcgis/rest/services/Ocean/World_Ocean_Base/MapServer
 */
ArcGisMapService.defaultWorldOceanServer = new Resource({
  url: "https://ibasemaps-api.arcgis.com/arcgis/rest/services/Ocean/World_Ocean_Base/MapServer",
});

/**
 *
 * @param {string} providedKey
 * @return {string|undefined}
 */
ArcGisMapService.getDefaultTokenCredit = function (providedKey) {
  if (providedKey !== defaultAccessToken) {
    return undefined;
  }

  if (!defined(defaultTokenCredit)) {
    const defaultTokenMessage =
      '<b> \
            This application is using a default ArcGIS access token. Please assign <i>Cesium.ArcGisMapService.defaultAccessToken</i> \
            with an API key from your ArcGIS Developer account before using the ArcGIS tile services. \
            You can sign up for a free ArcGIS Developer account at <a href="https://developers.arcgis.com/">https://developers.arcgis.com/</a>.</b>';

    defaultTokenCredit = new Credit(defaultTokenMessage, true);
  }

  return defaultTokenCredit;
};
export default ArcGisMapService;
