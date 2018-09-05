define([
    './Cartesian3',
    './Check',
    './defined',
    './defineProperties',
    './GeocodeType',
    './Rectangle',
    './Resource'
], function (
    Cartesian3,
    Check,
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
     * @returns {Promise<GeocoderService~Result[]>}
     */
    OpenCageGeocoderService.prototype.geocode = function(query) {
        //>>includeStart('debug', pragmas.debug);
        Check.typeOf.string('query', query);
        //>>includeEnd('debug');

        var resource = this._url.getDerivedResource({
            url: 'json',
            queryParameters: {
                q: query
            }
        });
        return resource.fetchJson()
            .then(function (response) {
                return response.results.map(function (resultObject) {
                  var lon = resultObject.geometry.lat;
                  var lat = resultObject.geometry.lng;
                  var destination = Cartesian3.fromDegrees(lon, lat);

                  return {
                      displayName: resultObject.formatted,
                      destination: destination
                  };
                });
            });
    };

    return OpenCageGeocoderService;
});
