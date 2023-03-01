import Credit from "../Core/Credit.js";
import defined from "../Core/defined.js";
import Resource from "../Core/Resource.js";

let defaultTokenCredit;
const defaultAccessToken =
  "AAPK2f7a9a89c6dc40ad926c3499141fecffWllt95jAiepZyFUkh3j3qU-pKQzn9odSccP_HhOnzggTIrQ90vijnlPCzvS4NJ3t";
/**
 * Default settings for accessing the ArcGIS Tiled Map Services.
 *
 * An ArcGIS access token is required to access the deafult ArcGIS Tiled Map Services.
 * A default access token is provided for evaluation purposes only.
 * You can sign up for a free ArcGIS Developer account at
 * To access secure ArcGIS resources, you need to create an ArcGIS developer account at {@link https://developers.arcgis.com}
 * then implement an authentication method to obtain an access token. More info can be found at at {@link https://developers.arcgis.com/documentation/mapping-apis-and-services/security/#authentication-methods}
 *
 * @see ArcGisMapServerImageryProvider
 * @namespace ArcGISMapServiceWorldOcean
 */
const ArcGISMapServiceWorldOcean = {};
/**
 * Gets or sets the default ArcGIS  ion access token.
 *
 * @type {string}
 */
ArcGISMapServiceWorldOcean.defaultAccessToken = defaultAccessToken;
/**
 * Gets or sets the default ArcGIS Tiled Map server.
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
      '<b> This application is using An ArcGIS default access token. Please assign <i>Cesium.ArcGISMapServiceWorldOcean.defaultAccessToken</i> \
            with an access token from your ArcGIS account before using the ArcGIS World Ocean Tiled Map Service. \
            You can sign up for a free ArcGIS Developer account at <a href="https://developers.arcgis.com/">https://developers.arcgis.com/</a>.</b>';

    defaultTokenCredit = new Credit(defaultTokenMessage, true);
  }

  return defaultTokenCredit;
};
export default ArcGISMapServiceWorldOcean;
