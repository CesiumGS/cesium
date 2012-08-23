/*global define*/
define([
        './xhrGet',
        './DeveloperError'
    ], function(
        xhrGet,
        DeveloperError) {
    "use strict";

    /**
     * Creates a dojo.Deferred which fetches and parses the provided URL as JSON.
     *
     * @returns A dojo.Deferred which fetches and parses the provided URL as JSON.
     *
     * @example
     * getJson('http://someUrl.com/someJson.txt').then(function(jsonData){
     *     //Do something with the JSON object
     * });
     */
    function getJson(url) {
        if (typeof url === 'undefined') {
            throw new DeveloperError('url is required.');
        }

        return xhrGet(url).then(function(value) {
            return JSON.parse(value);
        });
    }

    return getJson;
});