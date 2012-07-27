/*global define*/
define([
        'dojo/_base/xhr',
        '../Core/DeveloperError'
    ], function(
        xhr,
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

        return xhr.get({
            url : url,
            headers : {
                'Accept' : 'application/json'
            },
            handleAs : 'text'
        }).then(function(value) {
            return JSON.parse(value);
        });
    }

    return getJson;
});