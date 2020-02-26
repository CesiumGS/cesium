import defined from './defined.js';

    /**
     * Object for setting and retrieving the default Bing Maps API key.
     *
     * A Bing API key is only required if you are using {@link BingMapsImageryProvider}
     * or {@link BingMapsGeocoderService}. You can create your own key at
     * {@link https://www.bingmapsportal.com/}.
     *
     * @exports BingMapsApi
     */
    var BingMapsApi = {};

    /**
     * The default Bing Maps API key to use if one is not provided to the
     * constructor of an object that uses the Bing Maps API.
     *
     * @type {String}
     */
    BingMapsApi.defaultKey = undefined;

    BingMapsApi.getKey = function(providedKey) {
        if (defined(providedKey)) {
            return providedKey;
        }

        return BingMapsApi.defaultKey;
    };
export default BingMapsApi;
