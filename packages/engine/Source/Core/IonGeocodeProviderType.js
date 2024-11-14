/**
 * Underlying geocoding services that can be used via Cesium ion.
 *
 * @enum {string}
 */
const IonGeocodeProviderType = {
  /**
   * Google geocoder, for use with Google data.
   *
   * @type {string}
   * @constant
   */
  GOOGLE: "GOOGLE",

  /**
   * Bing geocoder, for use with Bing data.
   *
   * @type {string}
   * @constant
   */
  BING: "BING",

  /**
   * Use the default geocoder as set on the server.  Used when neither Bing or
   * Google data is used.
   *
   * @type {string}
   * @constant
   */
  DEFAULT: "DEFAULT",
};

export default Object.freeze(IonGeocodeProviderType);
