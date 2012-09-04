/*global define*/
define([
        './DeveloperError',
        '../ThirdParty/when'
    ], function(
        DeveloperError,
        when) {
    "use strict";

    /**
     * Creates a deferred which fetches and parses the provided URL as JSON.
     *
     * @returns A deferred object which fetches and parses the provided URL as JSON.
     *
     * @example
     * xhrGet('http://someUrl.com/someJson.txt').then(function(jsonData){
     *     //Do something with the JSON object
     * });
     */
    var xhrGet = function(url, headers) {
        if (typeof url === 'undefined') {
            throw new DeveloperError('url is required.');
        }
        return when(url, function(url) {
            var xmlHttp = new XMLHttpRequest();
            xmlHttp.open("GET", url, true);
            for(var obj in headers){
                if(headers.hasOwnProperty(obj)){
                    xmlHttp.setRequestHeader(obj, headers[obj]);
                }
            }
            xmlHttp.responseType='text';
            var deferred = when.defer();

            xmlHttp.onload = function(e) {
                deferred.resolve(xmlHttp.response);
            };

            xmlHttp.onerror = function(e) {
                deferred.reject(e);
            };

            xmlHttp.send();

            return deferred.promise;
        });
    };

    return xhrGet;
});