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
     * @exception {DeveloperError} url is required.
     * @example
     * getJson('http://someUrl.com/someJson.txt').then(function(jsonData){
     *     //Do something with the JSON object
     * });
     */
    function getJson(url) {
        if (typeof url === 'undefined') {
            throw new DeveloperError('url is required.');
        }
        var headers = {'Accept':'application/json','Cache-Control':'no-cache'};
        return xhrGet(url, headers).then(function(value) {
            return JSON.parse(value);
        });
    }

    return getJson;
});