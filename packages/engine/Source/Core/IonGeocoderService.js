import Check from "./Check.js";
import Credit from "./Credit.js";
import defaultValue from "./defaultValue.js";
import defined from "./defined.js";
import Ion from "./Ion.js";
import PeliasGeocoderService from "./PeliasGeocoderService.js";
import Resource from "./Resource.js";

/**
 * Provides geocoding through Cesium ion.
 * @alias IonGeocoderService
 * @constructor
 *
 * @param {object} options Object with the following properties:
 * @param {Scene} options.scene The scene
 * @param {string} [options.accessToken=Ion.defaultAccessToken] The access token to use.
 * @param {string|Resource} [options.server=Ion.defaultServer] The resource to the Cesium ion API server.
 *
 * @see Ion
 */
function IonGeocoderService(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.scene", options.scene);
  //>>includeEnd('debug');

  const accessToken = defaultValue(options.accessToken, Ion.defaultAccessToken);
  const server = Resource.createIfNeeded(
    defaultValue(options.server, Ion.defaultServer)
  );
  server.appendForwardSlash();

  const defaultTokenCredit = Ion.getDefaultTokenCredit(accessToken);
  if (defined(defaultTokenCredit)) {
    options.scene.frameState.creditDisplay.addStaticCredit(
      Credit.clone(defaultTokenCredit)
    );
  }

  const searchEndpoint = server.getDerivedResource({
    url: "v1/geocode",
  });

  if (defined(accessToken)) {
    searchEndpoint.appendQueryParameters({ access_token: accessToken });
  }

  this._accessToken = accessToken;
  this._server = server;
  this._pelias = new PeliasGeocoderService(searchEndpoint);
}

Object.defineProperties(IonGeocoderService.prototype, {
  /**
   * Gets the credit to display after a geocode is performed. Typically this is used to credit
   * the geocoder service.
   * @memberof IonGeocoderService.prototype
   * @type {Credit|undefined}
   * @readonly
   */
  credit: {
    get: function () {
      return undefined;
    },
  },
});

/**
 * @function
 *
 * @param {string} query The query to be sent to the geocoder service
 * @param {GeocodeType} [type=GeocodeType.SEARCH] The type of geocode to perform.
 * @returns {Promise<GeocoderService.Result[]>}
 */
IonGeocoderService.prototype.geocode = async function (query, geocodeType) {
  return this._pelias.geocode(query, geocodeType);
};
export default IonGeocoderService;
