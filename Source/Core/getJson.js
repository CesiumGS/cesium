/*global define*/
define([
        './xhrGet',
        './DeveloperError'
    ], function(
        xhrGet,
        DeveloperError) {
    "use strict";

    var headers = {
            'Accept' : 'application/json',
            'Cache-Control' : 'no-cache'
        };

    /**
     * Creates a promise which fetches and parses the provided URL as JSON.
     *
     * @exports getJson
     *
     * @param {String} url The url to retrieve the JSON data.
     * @returns {promise} A promise which fetches and parses the provided URL as JSON.
     *
     * @exception {DeveloperError} url is required.
     *
     * @example
     * getJson('http://someUrl.com/someJson.txt').then(function(jsonData){
     *     //Do something with the JSON object
     * });
     *
     * @see xhrGet
     * @see when
     */
    var getJson = function getJson(url) {
        if (typeof url === 'undefined') {
            throw new DeveloperError('url is required.');
        }
        return xhrGet(url, headers).then(function(value) {
            return JSON.parse(value);
        });
    };

    return getJson;
});