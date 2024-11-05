import Resource from "./Resource.js";

/**
 * Default settings for accessing the iTwin platform.
 *
 * Keys can be created using the iModels share routes {@link https://developer.bentley.com/apis/imodels-v2/operations/create-imodel-share/}
 *
 * An ion access token is only required if you are using any ion related APIs.
 * A default access token is provided for evaluation purposes only.
 * Sign up for a free ion account and get your own access token at {@link https://cesium.com}
 *
 * @see IonResource
 * @see IonImageryProvider
 * @see IonGeocoderService
 * @see createWorldImagery
 * @see createWorldTerrain
 * @namespace ITwin
 */
const ITwin = {};

/**
 * Gets or sets the default iTwin access token.
 *
 * TODO: I'm not sure we can even do this kind of access token. Each route seems to need it's own scopes
 * and we may not be able to guarantee this "top level token" has them all
 * So far we use
 * `mesh-export:read` for loading meshes GET /mesh-export(s)
 * `mesh-export:modify` if we want to include a function to create an export
 * `itwin-platform` if we want to use the iModel shares ourselves  GET /imodels/{id}/shares
 *
 *
 * @type {string|undefined}
 */
ITwin.defaultAccessToken = undefined;

/**
 * Gets or sets the default Google Map Tiles API endpoint.
 *
 * @type {string|Resource}
 * @default https://api.bentley.com
 */
ITwin.apiEndpoint = new Resource({
  url: "https://api.bentley.com",
});

// TODO: this should only be needed if we have a way to generate really long term access tokens
// to sample data that is accessible to everyone
// ITwin.getDefaultTokenCredit = function (providedKey) {
//   if (providedKey !== defaultAccessToken) {
//     return undefined;
//   }

//   if (!defined(defaultTokenCredit)) {
//     const defaultTokenMessage =
//       '<b> \
//             This application is using Cesium\'s default ion access token. Please assign <i>Cesium.Ion.defaultAccessToken</i> \
//             with an access token from your ion account before making any Cesium API calls. \
//             You can sign up for a free ion account at <a href="https://cesium.com">https://cesium.com</a>.</b>';

//     defaultTokenCredit = new Credit(defaultTokenMessage, true);
//   }

//   return defaultTokenCredit;
// };

export default ITwin;
