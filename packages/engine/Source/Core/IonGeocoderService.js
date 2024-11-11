import Check from "./Check.js";
import Credit from "./Credit.js";
import defaultValue from "./defaultValue.js";
import defined from "./defined.js";
import DeveloperError from "./DeveloperError.js";
import Ion from "./Ion.js";
import IonGeocodeProvider from "./IonGeocodeProvider.js";
import PeliasGeocoderService from "./PeliasGeocoderService.js";
import Resource from "./Resource.js";

/**
 * @param {*} geocodeProvider
 * @throws {DeveloperError}
 * @private
 */
function validateIonGeocodeProvider(geocodeProvider) {
  if (
    !Object.values(IonGeocodeProvider).some(
      (value) => value === geocodeProvider,
    )
  ) {
    throw new DeveloperError(`Invalid geocodeProvider: "${geocodeProvider}"`);
  }
}

const providerToParameterMap = Object.freeze({
  [IonGeocodeProvider.GOOGLE]: "google",
  [IonGeocodeProvider.BING]: "bing",
  [IonGeocodeProvider.DEFAULT]: undefined,
});

function providerToQueryParameter(provider) {
  return providerToParameterMap[provider];
}

function queryParameterToProvider(parameter) {
  return Object.entries(providerToParameterMap).find(
    (entry) => entry[1] === parameter,
  )[0];
}

/**
 * Provides geocoding through Cesium ion.
 * @alias IonGeocoderService
 * @constructor
 *
 * @param {object} options Object with the following properties:
 * @param {Scene} options.scene The scene
 * @param {string} [options.accessToken=Ion.defaultAccessToken] The access token to use.
 * @param {string|Resource} [options.server=Ion.defaultServer] The resource to the Cesium ion API server.
 * @param {IonGeocodeProvider} [options.geocodeProvider=IonGeocodeProvider.DEFAULT] The geocoder the Cesium ion API server should use to fulfill this request.
 *
 * @see Ion
 */
function IonGeocoderService(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.scene", options.scene);
  //>>includeEnd('debug');

  const geocodeProvider = defaultValue(
    options.geocodeProvider,
    IonGeocodeProvider.DEFAULT,
  );
  validateIonGeocodeProvider(geocodeProvider);

  const accessToken = defaultValue(options.accessToken, Ion.defaultAccessToken);
  const server = Resource.createIfNeeded(
    defaultValue(options.server, Ion.defaultServer),
  );
  server.appendForwardSlash();

  const defaultTokenCredit = Ion.getDefaultTokenCredit(accessToken);
  if (defined(defaultTokenCredit)) {
    options.scene.frameState.creditDisplay.addStaticCredit(
      Credit.clone(defaultTokenCredit),
    );
  }

  const searchEndpoint = server.getDerivedResource({
    url: "v1/geocode",
    queryParameters: {
      geocoder: providerToQueryParameter(geocodeProvider),
    },
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
  /**
   * @memberof IonGeocoderService.prototype
   * @type {IonGeocodeProvider}
   */
  geocodeProvider: {
    get: function () {
      return queryParameterToProvider(
        this._pelias.url.queryParameters["geocoder"],
      );
    },
    set: function (geocodeProvider) {
      validateIonGeocodeProvider(geocodeProvider);
      const query = {
        ...this._pelias.url.queryParameters,
        geocoder: providerToQueryParameter(geocodeProvider),
      };
      this._pelias.url.setQueryParameters(query);
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
