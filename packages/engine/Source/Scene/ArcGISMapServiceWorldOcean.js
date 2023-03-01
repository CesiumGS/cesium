import Credit from "../Core/Credit.js";
import defined from "../Core/defined.js";
import Resource from "../Core/Resource.js";

let defaultTokenCredit;
const defaultAccessToken =
  "AAPK2f7a9a89c6dc40ad926c3499141fecffWllt95jAiepZyFUkh3j3qU-pKQzn9odSccP_HhOnzggTIrQ90vijnlPCzvS4NJ3t";
/**
 * Default options for accessing the ArcGIS World Oceans image tile service.
 *
 * An ArcGIS access token is required to access ArcGIS image tile layers.
 * A default token is provided for evaluation purposes only.
 * To obtain an access token, go to {@link https://developers.arcgis.com} and create a free account.
 * More info can be found in the {@link https://developers.arcgis.com/documentation/mapping-apis-and-services/security/ | ArcGIS developer guide}.
 *
 * @see ArcGisMapServerImageryProvider
 * @namespace ArcGISMapServiceWorldOcean
 */
const ArcGISMapServiceWorldOcean = {};
/**
 * Gets or sets the default ArcGIS access token.
 *
 * @type {string}
 */
ArcGISMapServiceWorldOcean.defaultAccessToken = defaultAccessToken;
/**
 * Gets or sets the URL of the ArcGIS World Oceans tile service.
 *
 * @type {string|Resource}
 * @default https://ibasemaps-api.arcgis.com/arcgis/rest/services/Ocean/World_Ocean_Base/MapServer
 */
ArcGISMapServiceWorldOcean.defaultServer = new Resource({
  url:
    "https://ibasemaps-api.arcgis.com/arcgis/rest/services/Ocean/World_Ocean_Base/MapServer",
});

/**
 *
 * @param {string} providedKey
 * @return {string|undefined}
 */
ArcGISMapServiceWorldOcean.getDefaultTokenCredit = function (providedKey) {
  if (providedKey !== defaultAccessToken) {
    return undefined;
  }

  if (!defined(defaultTokenCredit)) {
    const defaultTokenMessage =
      '<b> This application is using a default ArcGIS access token. Please assign <i>Cesium.ArcGISMapServiceWorldOcean.defaultAccessToken</i> \
            with an access token from your ArcGIS account before using the ArcGIS World Oceans tile service. \
            You can sign up for a free ArcGIS Developer account at <a href="https://developers.arcgis.com/">https://developers.arcgis.com/</a>.</b>';

    defaultTokenCredit = new Credit(defaultTokenMessage, true);
  }

  return defaultTokenCredit;
};
export default ArcGISMapServiceWorldOcean;
