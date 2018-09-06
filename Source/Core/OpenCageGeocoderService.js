define([
    './Cartesian3',
    './Check',
    './defaultValue',
    './defined',
    './defineProperties',
    './GeocodeType',
    './Rectangle',
    './Resource'
], function (
    Cartesian3,
    Check,
    defaultValue,
    defined,
    defineProperties,
    GeocodeType,
    Rectangle,
    Resource) {
    'use strict';

    /**
     * Provides geocoding via a {@link https://opencagedata.com/|OpenCage} server.
     * @alias OpenCageGeocoderService
     * @constructor
     *
     * @param {Resource|String} url The endpoint to the OpenCage server.
     * @param {String} apiKey The OpenCage API Key.
     *
     * @example
     * // Configure a Viewer to use the OpenCage server hosted by https://geocode.earth/
     * var viewer = new Cesium.Viewer('cesiumContainer', {
     *   geocoder: new Cesium.OpenCageGeocoderService(new Cesium.Resource({
     *     url: 'https://api.opencagedata.com/geocode/v1/',
     *       queryParameters: {
     *         key: '<Your OpenCage API key>'
     *     }
     *   }))
     * });
     */
    function OpenCageGeocoderService(url, apiKey) {
        //>>includeStart('debug', pragmas.debug);
        Check.defined('url', url);
        Check.defined('apiKey', apiKey);
        //>>includeEnd('debug');

        this._url = Resource.createIfNeeded(url);
        this._url.appendForwardSlash();
        this._url.setQueryParameters({key: apiKey});
    }

    defineProperties(OpenCageGeocoderService.prototype, {
        /**
         * The Resource used to access the OpenCage endpoint.
         * @type {Resource}
         * @memberof {OpenCageGeocoderService.prototype}
         * @readonly
         */
        url: {
            get: function () {
                return this._url;
            }
        }
    });

    /**
     * @function
     *
     * @param {String} query The query to be sent to the geocoder service
     * @param {Object} [params] An object with the following properties (See https://opencagedata.com/api#forward-opt):
     * @param {Number} [params.abbrv] When set to 1 we attempt to abbreviate and shorten the formatted string we return.
     * @param {Number} [options.add_request] When set to 1 the various request parameters are added to the response for ease of debugging.
     * @param {String} [options.bounds] Provides the geocoder with a hint to the region that the query resides in.
     * @param {String} [options.countrycode] Restricts the results to the specified country or countries (as defined by the ISO 3166-1 Alpha 2 standard).
     * @param {String} [options.jsonp] Wraps the returned JSON with a function name.
     * @param {String} [options.language] An IETF format language code.
     * @param {Number} [options.limit] The maximum number of results we should return.
     * @param {Number} [options.min_confidence] An integer from 1-10. Only results with at least this confidence will be returned.
     * @param {Number} [options.no_annotations] When set to 1 results will not contain annotations.
     * @param {Number} [options.no_dedupe] When set to 1 results will not be deduplicated.
     * @param {Number} [options.no_record] When set to 1 the query contents are not logged.
     * @param {Number} [options.pretty] When set to 1 results are 'pretty' printed for easier reading. Useful for debugging.
     * @param {String} [options.proximity] Provides the geocoder with a hint to bias results in favour of those closer to the specified location (For example: 41.40139,2.12870).
     * @returns {Promise<GeocoderService~Result[]>}
     */
    OpenCageGeocoderService.prototype.geocode = function(query, params) {
        //>>includeStart('debug', pragmas.debug);
        Check.typeOf.string('query', query);
        if (defined(params)) {
          Check.typeOf.object('value', params);
        }
        //>>includeEnd('debug');

        var resource = this._url.getDerivedResource({
            url: 'json',
            queryParameters: Object.assign(defaultValue(params, {}), {q: query})
        });
        return resource.fetchJson()
            .then(function (response) {
                return response.results.map(function (resultObject) {
                  var destination;
                  var bounds = resultObject.bounds;

                  if (defined(bounds)) {
                      destination = Rectangle.fromDegrees(bounds.southwest.lng, bounds.southwest.lat, bounds.northeast.lng, bounds.northeast.lat);
                  } else {
                      var lon = resultObject.geometry.lat;
                      var lat = resultObject.geometry.lng;
                      destination = Cartesian3.fromDegrees(lon, lat);
                  }

                  return {
                      displayName: resultObject.formatted,
                      destination: destination
                  };
                });
            });
    };

    return OpenCageGeocoderService;
});
