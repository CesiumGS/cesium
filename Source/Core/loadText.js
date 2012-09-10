/*global define*/
define([
        './DeveloperError',
        '../ThirdParty/when'
    ], function(
        DeveloperError,
        when) {
    "use strict";

    /**
     * Asynchronously loads the given URL as text.  Returns a promise that will resolve to
     * a String once loaded, or reject if the URL failed to load.  The data is loaded
     * using XMLHttpRequest, which means that the server must have CORS enabled.
     *
     * @exports loadText
     *
     * @param {String|Promise} url The URL of the binary data, or a promise for the URL.
     * @param {Array} headers An associative array of value pairs to add to the XMLHttpRequest header.
     * @returns {Object} a promise that will resolve to the requested data when loaded.
     *
     * @exception {DeveloperError} url is required.
     *
     * @example
     * var headers = {'Accept':'application/json'};
     * loadText('http://someUrl.com/someJson.txt', headers).then(function(jsonData){
     *     //Do something with the JSON object
     * });
     *
     * @see <a href="http://en.wikipedia.org/wiki/XMLHttpRequest">XMLHttpRequest</a>
     * @see <a href='http://www.w3.org/TR/cors/'>Cross-Origin Resource Sharing</a>
     * @see <a href='http://wiki.commonjs.org/wiki/Promises/A'>CommonJS Promises/A</a>
     */
    var loadText = function(url, headers) {
        if (typeof url === 'undefined') {
            throw new DeveloperError('url is required.');
        }
        return when(url, function(url) {
            var xmlHttp = new XMLHttpRequest();
            xmlHttp.open("GET", url, true);
            for(var key in headers){
                if(headers.hasOwnProperty(key)){
                    xmlHttp.setRequestHeader(key, headers[key]);
                }
            }
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

    return loadText;
});